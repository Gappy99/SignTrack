import { v4 as uuidv4 } from 'uuid';
import {
  processFrameService,
  processBatchService,
  getProcessingStatusService,
  getFrameResult,
  getBatchResult,
  getBatchProgress
} from '../services/frameService.js';
import {
  ValidationError,
  asyncHandler
} from '../../shared/errors.js';

/**
 * Procesar un frame individual
 * POST /process/frame
 */
export async function processFrame(req, res, next) {
  try {
    const { frame, callId } = req.body;

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

    // Procesar frame
    const result = await processFrameService(frame);

    res.status(200).json({
      success: true,
      message: 'Frame processing initiated',
      data: {
        frameId: result.frameId,
        status: 'completed',
        features: result.features,
        inference: result.inference,
        timestamp: result.timestamp
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Procesar lote de frames
 * POST /process/batch
 */
export async function processBatch(req, res, next) {
  try {
    const { frames, callId } = req.body;

    // Validar entrada
    if (!frames || !Array.isArray(frames)) {
      throw new ValidationError('frames must be an array', 'frames');
    }

    if (frames.length === 0) {
      throw new ValidationError('frames array cannot be empty', 'frames');
    }

    if (frames.length > 100) {
      throw new ValidationError('Batch size cannot exceed 100 frames', 'frames');
    }

    if (!callId) {
      throw new ValidationError('callId is required', 'callId');
    }

    // Generar batchId
    const batchId = `batch_${uuidv4()}`;

    // Procesar batch de manera asíncrona
    // Nota: en producción, esto se enviaría a una cola (RabbitMQ, Bull, etc.)
    processBatchService(frames, batchId)
      .catch(error => {
        console.error(`[Batch ${batchId}] Error:`, error);
      });

    // Retornar inmediatamente con batchId
    res.status(202).json({
      success: true,
      message: 'Batch processing initiated',
      data: {
        batchId,
        frameCount: frames.length,
        statusUrl: `/process/batch/${batchId}/status`
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener estado de procesamiento de un frame
 * GET /process/status/:frameId
 */
export async function getProcessingStatus(req, res, next) {
  try {
    const { frameId } = req.params;

    if (!frameId) {
      throw new ValidationError('frameId is required', 'frameId');
    }

    const status = await getProcessingStatusService(frameId);

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener resultado de un frame procesado
 * GET /process/frame/:frameId
 */
export async function getFrame(req, res, next) {
  try {
    const { frameId } = req.params;

    if (!frameId) {
      throw new ValidationError('frameId is required', 'frameId');
    }

    const result = await getFrameResult(frameId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener resultado de un batch
 * GET /process/batch/:batchId
 */
export async function getBatch(req, res, next) {
  try {
    const { batchId } = req.params;

    if (!batchId) {
      throw new ValidationError('batchId is required', 'batchId');
    }

    const result = await getBatchResult(batchId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener progreso de procesamiento de batch
 * GET /process/batch/:batchId/progress
 */
export async function getBatchProgressEndpoint(req, res, next) {
  try {
    const { batchId } = req.params;

    if (!batchId) {
      throw new ValidationError('batchId is required', 'batchId');
    }

    const progress = await getBatchProgress(batchId);

    res.status(200).json({
      success: true,
      data: {
        batchId,
        progress
      }
    });
  } catch (error) {
    next(error);
  }
}
