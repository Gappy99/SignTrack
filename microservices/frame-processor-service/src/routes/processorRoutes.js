import express from 'express';
import {
  processFrame,
  processBatch,
  getProcessingStatus,
  getFrame,
  getBatch,
  getBatchProgressEndpoint
} from '../controllers/processorController.js';
import { validateTokenHTTP } from '../../shared/auth.js';
import { asyncHandler } from '../../shared/errors.js';

const router = express.Router();

// Middleware: Validar JWT para rutas que lo requieran
router.post('/frame', asyncHandler(validateTokenHTTP), asyncHandler(processFrame));
router.post('/batch', asyncHandler(validateTokenHTTP), asyncHandler(processBatch));

/**
 * @route POST /process/frame
 * @desc Procesar un frame de video
 * @body { frame: "base64string", callId: "string" }
 * @access Private (requires JWT)
 */
// Ya definida arriba

/**
 * @route POST /process/batch
 * @desc Procesar múltiples frames
 * @body { frames: [{ frame: "base64", ... }], callId: "string" }
 * @access Private (requires JWT)
 */
// Ya definida arriba

/**
 * @route GET /process/status/:frameId
 * @desc Obtener estado de procesamiento de un frame
 * @access Public
 */
router.get('/status/:frameId', asyncHandler(getProcessingStatus));

/**
 * @route GET /process/frame/:frameId
 * @desc Obtener resultado de un frame procesado
 * @access Public
 */
router.get('/frame/:frameId', asyncHandler(getFrame));

/**
 * @route GET /process/batch/:batchId
 * @desc Obtener resultado de un batch
 * @access Public
 */
router.get('/batch/:batchId', asyncHandler(getBatch));

/**
 * @route GET /process/batch/:batchId/progress
 * @desc Obtener progreso de procesamiento de batch
 * @access Public
 */
router.get('/batch/:batchId/progress', asyncHandler(getBatchProgressEndpoint));

export default router;
