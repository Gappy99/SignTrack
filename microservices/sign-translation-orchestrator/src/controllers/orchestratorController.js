import { v4 as uuidv4 } from 'uuid';
import {
  orchestrateDetection,
  startTranslationStream,
  stopTranslationStream,
  getTranslationHistory,
  getTranslationStatistics,
  getTranslationResult,
  getStreamInfo,
  updateStreamMetrics
} from '../services/orchestratorService.js';
import { validateTokenHTTP } from '../../../shared/auth.js';
import {
  ValidationError,
  asyncHandler
} from '../../../shared/errors.js';

/**
 * Detectar seña desde frame y traducir
 * POST /orchestrate/detect
 */
export async function detectAndTranslate(req, res, next) {
  try {
    const { frame, callId } = req.body;
    const userId = req.user.id;

    // Validar entrada
    if (!frame) {
      throw new ValidationError('frame is required', 'frame');
    }

    if (!callId) {
      throw new ValidationError('callId is required', 'callId');
    }

    // Validar que sea base64
    if (!/^data:image/.test(frame) && !/^[A-Za-z0-9+/=]+$/.test(frame)) {
      throw new ValidationError('frame must be valid base64 or data URL', 'frame');
    }

    // Orquestar detección
    const result = await orchestrateDetection(frame, callId, userId);

    res.status(200).json({
      success: true,
      message: 'Detection and translation completed',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Iniciar stream continuo de traducción
 * POST /orchestrate/stream
 */
export async function startStream(req, res, next) {
  try {
    const { callId } = req.body;
    const userId = req.user.id;

    // Validar entrada
    if (!callId) {
      throw new ValidationError('callId is required', 'callId');
    }

    // Iniciar stream
    const streamData = await startTranslationStream(callId, userId);

    res.status(201).json({
      success: true,
      message: 'Translation stream started',
      data: streamData
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Detener stream de traducción
 * POST /orchestrate/stream/:streamId/stop
 */
export async function stopStream(req, res, next) {
  try {
    const { streamId } = req.params;

    // Validar entrada
    if (!streamId) {
      throw new ValidationError('streamId is required', 'streamId');
    }

    // Detener stream
    const stoppedStream = await stopTranslationStream(streamId);

    res.status(200).json({
      success: true,
      message: 'Translation stream stopped',
      data: stoppedStream
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener historial de traducciones
 * GET /orchestrate/history/:callId
 */
export async function getHistory(req, res, next) {
  try {
    const { callId } = req.params;
    const { limit = 100, skip = 0 } = req.query;

    // Validar entrada
    if (!callId) {
      throw new ValidationError('callId is required', 'callId');
    }

    // Obtener historial
    const history = await getTranslationHistory(
      callId,
      Math.min(parseInt(limit) || 100, 500),
      Math.max(parseInt(skip) || 0, 0)
    );

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener estadísticas de traducción
 * GET /orchestrate/statistics/:callId
 */
export async function getStatistics(req, res, next) {
  try {
    const { callId } = req.params;

    // Validar entrada
    if (!callId) {
      throw new ValidationError('callId is required', 'callId');
    }

    // Obtener estadísticas
    const stats = await getTranslationStatistics(callId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener resultado de una detección
 * GET /orchestrate/result/:detectionId
 */
export async function getResult(req, res, next) {
  try {
    const { detectionId } = req.params;

    // Validar entrada
    if (!detectionId) {
      throw new ValidationError('detectionId is required', 'detectionId');
    }

    // Obtener resultado
    const result = await getTranslationResult(detectionId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener información de stream
 * GET /orchestrate/stream/:streamId
 */
export async function getStream(req, res, next) {
  try {
    const { streamId } = req.params;

    // Validar entrada
    if (!streamId) {
      throw new ValidationError('streamId is required', 'streamId');
    }

    // Obtener información
    const stream = await getStreamInfo(streamId);

    res.status(200).json({
      success: true,
      data: stream
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualizar métricas de stream
 * PATCH /orchestrate/stream/:streamId/metrics
 */
export async function updateMetrics(req, res, next) {
  try {
    const { streamId } = req.params;
    const { frames = 0, translations = 0 } = req.body;

    // Validar entrada
    if (!streamId) {
      throw new ValidationError('streamId is required', 'streamId');
    }

    // Actualizar métricas
    const updated = await updateStreamMetrics(streamId, { frames, translations });

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}
