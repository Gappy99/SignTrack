import express from 'express';
import {
  detectAndTranslate,
  startStream,
  stopStream,
  getHistory,
  getStatistics,
  getResult,
  getStream,
  updateMetrics
} from '../controllers/orchestratorController.js';
import { validateTokenHTTP } from '../../../shared/auth.js';
import { asyncHandler } from '../../../shared/errors.js';

const router = express.Router();

// Middleware: Validar JWT para rutas que lo requieran
router.post('/detect', asyncHandler(validateTokenHTTP), asyncHandler(detectAndTranslate));
router.post('/stream', asyncHandler(validateTokenHTTP), asyncHandler(startStream));
router.post('/stream/:streamId/stop', asyncHandler(validateTokenHTTP), asyncHandler(stopStream));

/**
 * @route POST /orchestrate/detect
 * @desc Detectar seña desde frame y traducir
 * @body { frame: "base64string", callId: "string" }
 * @access Private (requires JWT)
 */
// Ya definida arriba

/**
 * @route POST /orchestrate/stream
 * @desc Iniciar stream continuo de traducción
 * @body { callId: "string" }
 * @access Private (requires JWT)
 */
// Ya definida arriba

/**
 * @route POST /orchestrate/stream/:streamId/stop
 * @desc Detener stream de traducción
 * @access Private (requires JWT)
 */
// Ya definida arriba

/**
 * @route GET /orchestrate/history/:callId
 * @desc Obtener historial de traducciones
 * @query { limit?: number, skip?: number }
 * @access Public
 */
router.get('/history/:callId', asyncHandler(getHistory));

/**
 * @route GET /orchestrate/statistics/:callId
 * @desc Obtener estadísticas de traducción
 * @access Public
 */
router.get('/statistics/:callId', asyncHandler(getStatistics));

/**
 * @route GET /orchestrate/result/:detectionId
 * @desc Obtener resultado de una detección
 * @access Public
 */
router.get('/result/:detectionId', asyncHandler(getResult));

/**
 * @route GET /orchestrate/stream/:streamId
 * @desc Obtener información de stream
 * @access Public
 */
router.get('/stream/:streamId', asyncHandler(getStream));

/**
 * @route PATCH /orchestrate/stream/:streamId/metrics
 * @desc Actualizar métricas de stream
 * @body { frames?: number, translations?: number }
 * @access Private (requires JWT)
 */
router.patch('/stream/:streamId/metrics', asyncHandler(validateTokenHTTP), asyncHandler(updateMetrics));

export default router;
