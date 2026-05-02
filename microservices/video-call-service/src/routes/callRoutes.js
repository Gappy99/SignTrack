import express from 'express';
import {
  initiateCall,
  joinCall,
  leaveCall,
  getCallStatus,
  endCall,
  getUserCallHistory,
  getUserActiveCalls
} from '../controllers/callController.js';
import { validateTokenHTTP } from '../../../shared/auth.js';
import { asyncHandler } from '../../../shared/errors.js';

const router = express.Router();

// Middleware: Validar JWT para todas las rutas
router.use(asyncHandler(validateTokenHTTP));

/**
 * @route POST /calls/initiate
 * @desc Iniciar una nueva videollamada
 * @access Private (requires JWT)
 */
router.post('/initiate', asyncHandler(initiateCall));

/**
 * @route POST /calls/:callId/join
 * @desc Unirse a una videollamada existente
 * @access Private (requires JWT)
 */
router.post('/:callId/join', asyncHandler(joinCall));

/**
 * @route POST /calls/:callId/leave
 * @desc Salir de una videollamada
 * @access Private (requires JWT)
 */
router.post('/:callId/leave', asyncHandler(leaveCall));

/**
 * @route GET /calls/:callId/status
 * @desc Obtener estado de una videollamada
 * @access Private (requires JWT)
 */
router.get('/:callId/status', asyncHandler(getCallStatus));

/**
 * @route POST /calls/:callId/end
 * @desc Terminar una videollamada
 * @access Private (requires JWT)
 */
router.post('/:callId/end', asyncHandler(endCall));

/**
 * @route GET /calls/user/history
 * @desc Obtener historial de llamadas del usuario
 * @access Private (requires JWT)
 */
router.get('/user/history', asyncHandler(getUserCallHistory));

/**
 * @route GET /calls/user/active
 * @desc Obtener llamada activa actual del usuario
 * @access Private (requires JWT)
 */
router.get('/user/active', asyncHandler(getUserActiveCalls));

export default router;
