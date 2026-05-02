import { v4 as uuidv4 } from 'uuid';
import TranslationHistory from '../models/TranslationHistory.js';
import { cacheGet, cacheSet, cacheDel, publishEvent } from '../../../shared/redisClient.js';
import { iaClients } from '../../../shared/serviceClient.js';
import {
  ValidationError,
  ServiceUnavailableError,
  NotFoundError
} from '../../../shared/errors.js';

/**
 * Orquestar el flujo completo de traducción
 * Flujo: Frame → Feature Extraction → Inference → Translation → Storage
 */
export async function orchestrateDetection(frameData, callId, userId) {
  const detectionId = `detect_${uuidv4()}`;
  
  try {
    // 1. Crear registro de historial
    const history = new TranslationHistory({
      callId,
      userId,
      detectionId,
      status: 'processing'
    });
    await history.save();

    // 2. Llamar Frame Processor para extraer features + inference
    const startTime = Date.now();
    
    const frameProcessorResponse = await iaClients.frameProcessor.post(
      '/process/frame',
      {
        frame: frameData,
        callId
      },
      { timeout: 20000 }
    );

    if (!frameProcessorResponse.success) {
      throw new ServiceUnavailableError('Frame Processor');
    }

    const frameResult = frameProcessorResponse.data;

    // 3. Obtener signos detectados de la inferencia
    const detectedSigns = frameResult.inference?.signs || [];
    const inferenceConfidence = frameResult.inference?.confidence || 0;

    // 4. Llamar Translation Service para obtener texto coherente
    const translationResponse = await iaClients.translation.post(
      '/translate',
      {
        signs: detectedSigns,
        confidence: inferenceConfidence
      },
      { timeout: 10000 }
    );

    if (!translationResponse.success) {
      // Si falla translation, al menos guardamos la detección
      history.status = 'failed';
      history.error = 'Translation service failed';
      await history.save();
      throw new ServiceUnavailableError('Translation');
    }

    const translatedText = translationResponse.data?.text || '';
    const translationConfidence = translationResponse.data?.confidence || 0;

    // 5. Actualizar registro de historial
    const processingTime = Date.now() - startTime;
    
    history.detectedSigns = detectedSigns.map(sign => ({
      sign: typeof sign === 'string' ? sign : sign.name,
      confidence: typeof sign === 'string' ? 1 : sign.confidence,
      timestamp: new Date()
    }));
    history.translatedText = translatedText;
    history.translationConfidence = translationConfidence;
    history.rawData = {
      features: frameResult.features,
      inference: frameResult.inference,
      translation: translationResponse.data
    };
    history.processingTime = processingTime;
    history.status = 'success';

    await history.save();

    // 6. Cachear resultado
    const result = {
      detectionId,
      callId,
      userId,
      signs: detectedSigns,
      text: translatedText,
      confidence: translationConfidence,
      processingTime,
      timestamp: new Date().toISOString()
    };

    await cacheSet(
      `translation:${detectionId}`,
      result,
      parseInt(process.env.CACHE_TTL || 3600)
    );

    // 7. Publicar evento para WebSocket
    await publishEvent('translation:completed', {
      callId,
      userId,
      detectionId,
      text: translatedText,
      signs: detectedSigns,
      confidence: translationConfidence
    });

    return result;
  } catch (error) {
    // Actualizar historia como fallida
    const history = await TranslationHistory.findOne({ detectionId });
    if (history) {
      history.status = 'failed';
      history.error = error.message;
      await history.save();
    }

    throw error;
  }
}

/**
 * Iniciar stream continuo de traducción
 * Crea una sesión para traducción en tiempo real
 */
export async function startTranslationStream(callId, userId) {
  const streamId = `stream_${uuidv4()}`;

  try {
    // Crear registro de stream
    const streamData = {
      streamId,
      callId,
      userId,
      startedAt: new Date().toISOString(),
      status: 'active',
      framesProcessed: 0,
      translationsCompleted: 0
    };

    await cacheSet(
      `stream:${streamId}`,
      streamData,
      86400 // 24 horas
    );

    return streamData;
  } catch (error) {
    throw error;
  }
}

/**
 * Detener stream de traducción
 */
export async function stopTranslationStream(streamId) {
  try {
    const streamData = await cacheGet(`stream:${streamId}`);
    if (!streamData) {
      throw new NotFoundError(`Stream ${streamId} not found`, 'Stream');
    }

    const endedStream = {
      ...streamData,
      status: 'stopped',
      stoppedAt: new Date().toISOString()
    };

    await cacheSet(`stream:${streamId}`, endedStream, 3600);

    return endedStream;
  } catch (error) {
    throw error;
  }
}

/**
 * Obtener historial de traducciones de una llamada
 */
export async function getTranslationHistory(callId, limit = 100, skip = 0) {
  try {
    const history = await TranslationHistory.find({ callId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await TranslationHistory.countDocuments({ callId });

    return {
      callId,
      translations: history,
      total,
      limit,
      skip,
      hasMore: skip + limit < total
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Obtener estadísticas de traducción de una llamada
 */
export async function getTranslationStatistics(callId) {
  try {
    const stats = await TranslationHistory.getCallStatistics(callId);
    
    if (stats.length === 0) {
      return {
        callId,
        totalFrames: 0,
        successfulTranslations: 0,
        failedTranslations: 0,
        averageConfidence: 0,
        averageProcessingTime: 0
      };
    }

    return {
      callId,
      ...stats[0]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Obtener resultado en cache
 */
export async function getTranslationResult(detectionId) {
  try {
    const result = await cacheGet(`translation:${detectionId}`);
    if (!result) {
      // Intentar obtener de BD
      const history = await TranslationHistory.findOne({ detectionId });
      if (!history) {
        throw new NotFoundError(`Detection result not found: ${detectionId}`, 'Detection');
      }
      return {
        detectionId,
        text: history.translatedText,
        signs: history.detectedSigns,
        confidence: history.translationConfidence
      };
    }
    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Obtener información de stream
 */
export async function getStreamInfo(streamId) {
  try {
    const stream = await cacheGet(`stream:${streamId}`);
    if (!stream) {
      throw new NotFoundError(`Stream ${streamId} not found`, 'Stream');
    }
    return stream;
  } catch (error) {
    throw error;
  }
}

/**
 * Actualizar métricas de stream
 */
export async function updateStreamMetrics(streamId, metrics) {
  try {
    const stream = await cacheGet(`stream:${streamId}`);
    if (!stream) {
      throw new NotFoundError(`Stream ${streamId} not found`, 'Stream');
    }

    const updated = {
      ...stream,
      framesProcessed: (stream.framesProcessed || 0) + (metrics.frames || 0),
      translationsCompleted: (stream.translationsCompleted || 0) + (metrics.translations || 0)
    };

    await cacheSet(`stream:${streamId}`, updated, 86400);
    return updated;
  } catch (error) {
    throw error;
  }
}
