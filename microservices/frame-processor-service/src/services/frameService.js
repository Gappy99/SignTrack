import axios from 'axios';
import { cacheGet, cacheSet, cacheDel } from '../../shared/redisClient.js';
import { iaClients } from '../../shared/serviceClient.js';
import {
  ValidationError,
  NotFoundError,
  ServiceUnavailableError,
  TimeoutError
} from '../../shared/errors.js';

/**
 * Procesar frame a través de servicios IA
 * Flujo: Feature Extraction → Inference → Cache
 */
export async function processFrameService(frameData) {
  const frameId = `frame_${Date.now()}`;
  
  try {
    // Validar frame
    if (!frameData || typeof frameData !== 'string') {
      throw new ValidationError('Frame must be a valid base64 string', 'frame');
    }

    if (frameData.length < 100) {
      throw new ValidationError('Frame data is too small', 'frame');
    }

    // Marcar como procesando
    await cacheSet(`frame:${frameId}:status`, 'processing', 300);

    // 1. Extraer características (Feature Extraction)
    const featureResponse = await iaClients.featureExtraction.post(
      '/extract',
      { frame: frameData },
      { timeout: 15000 }
    );

    if (!featureResponse.success) {
      throw new ServiceUnavailableError('Feature Extraction');
    }

    const features = featureResponse.data;

    // 2. Realizar inferencia (Inference)
    const inferenceResponse = await iaClients.inference.post(
      '/infer',
      { features },
      { timeout: 10000 }
    );

    if (!inferenceResponse.success) {
      throw new ServiceUnavailableError('Inference');
    }

    const inference = inferenceResponse.data;

    // 3. Preparar resultado
    const result = {
      frameId,
      features,
      inference,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    // 4. Cachear resultado
    await cacheSet(
      `frame:${frameId}:result`,
      result,
      parseInt(process.env.CACHE_TTL || 3600)
    );

    // Limpiar status
    await cacheDel(`frame:${frameId}:status`);

    return result;
  } catch (error) {
    // Guardar error en cache
    await cacheSet(
      `frame:${frameId}:error`,
      {
        message: error.message,
        code: error.code
      },
      300
    );

    throw error;
  }
}

/**
 * Procesar lote de frames
 * Los procesa secuencialmente y cachea cada uno
 */
export async function processBatchService(frames, batchId) {
  try {
    if (!Array.isArray(frames) || frames.length === 0) {
      throw new ValidationError('Frames must be a non-empty array', 'frames');
    }

    if (frames.length > 100) {
      throw new ValidationError('Batch size cannot exceed 100 frames', 'frames');
    }

    // Marcar batch como procesando
    await cacheSet(
      `batch:${batchId}:status`,
      'processing',
      600
    );

    const results = [];
    const errors = [];

    // Procesar frames secuencialmente
    for (let i = 0; i < frames.length; i++) {
      try {
        const frameData = frames[i];
        const result = await processFrameService(frameData);
        results.push(result);

        // Actualizar progreso
        await cacheSet(
          `batch:${batchId}:progress`,
          {
            processed: i + 1,
            total: frames.length,
            percentage: Math.round(((i + 1) / frames.length) * 100)
          },
          600
        );
      } catch (error) {
        errors.push({
          frameIndex: i,
          error: error.message
        });
      }
    }

    // Preparar resultado del batch
    const batchResult = {
      batchId,
      totalFrames: frames.length,
      processedFrames: results.length,
      failedFrames: errors.length,
      frames: results,
      errors: errors.length > 0 ? errors : null,
      timestamp: new Date().toISOString(),
      status: errors.length === 0 ? 'completed' : 'completed_with_errors'
    };

    // Cachear resultado del batch
    await cacheSet(
      `batch:${batchId}:result`,
      batchResult,
      parseInt(process.env.CACHE_TTL || 3600)
    );

    // Limpiar tracking
    await cacheDel(`batch:${batchId}:status`);
    await cacheDel(`batch:${batchId}:progress`);

    return batchResult;
  } catch (error) {
    await cacheSet(
      `batch:${batchId}:error`,
      {
        message: error.message,
        code: error.code
      },
      300
    );

    throw error;
  }
}

/**
 * Obtener estado de procesamiento
 */
export async function getProcessingStatusService(frameId) {
  try {
    // Intentar obtener resultado
    const result = await cacheGet(`frame:${frameId}:result`);
    if (result) {
      return {
        frameId,
        status: 'completed',
        data: result
      };
    }

    // Intentar obtener error
    const error = await cacheGet(`frame:${frameId}:error`);
    if (error) {
      return {
        frameId,
        status: 'failed',
        error
      };
    }

    // Verificar si aún está procesando
    const processingStatus = await cacheGet(`frame:${frameId}:status`);
    if (processingStatus) {
      return {
        frameId,
        status: 'processing'
      };
    }

    // No encontrado
    throw new NotFoundError(`Processing status not found for frame ${frameId}`, 'Frame');
  } catch (error) {
    throw error;
  }
}

/**
 * Obtener resultado en cache
 */
export async function getFrameResult(frameId) {
  const result = await cacheGet(`frame:${frameId}:result`);
  if (!result) {
    throw new NotFoundError(`Frame result not found: ${frameId}`, 'Frame');
  }
  return result;
}

/**
 * Obtener resultado de batch
 */
export async function getBatchResult(batchId) {
  const result = await cacheGet(`batch:${batchId}:result`);
  if (!result) {
    throw new NotFoundError(`Batch result not found: ${batchId}`, 'Batch');
  }
  return result;
}

/**
 * Obtener progreso de batch
 */
export async function getBatchProgress(batchId) {
  const progress = await cacheGet(`batch:${batchId}:progress`);
  if (!progress) {
    const result = await getBatchResult(batchId);
    return {
      processed: result.processedFrames,
      total: result.totalFrames,
      percentage: 100
    };
  }
  return progress;
}
