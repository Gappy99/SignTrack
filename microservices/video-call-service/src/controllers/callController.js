import Call from '../models/Call.js';
import { v4 as uuidv4 } from 'uuid';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  ConflictError
} from '../../../shared/errors.js';

/**
 * Iniciar una nueva videollamada
 * POST /calls/initiate
 */
export async function initiateCall(req, res, next) {
  try {
    const { recipientId, metadata } = req.body;
    const initiatorId = req.user.id;

    // Validar entrada
    if (!recipientId) {
      throw new ValidationError('recipientId is required', 'recipientId');
    }

    if (initiatorId === recipientId) {
      throw new ValidationError('Cannot call yourself', 'recipientId');
    }

    // Generar callId único
    const callId = `call_${uuidv4()}`;

    // Crear documento de llamada
    const call = new Call({
      callId,
      initiatorId,
      participantIds: [initiatorId],
      status: 'pending',
      metadata: {
        topic: metadata?.topic || 'Video Call',
        notes: metadata?.notes || '',
        tags: metadata?.tags || []
      }
    });

    // Guardar en BD
    await call.save();

    res.status(201).json({
      success: true,
      message: 'Call initiated successfully',
      data: {
        callId: call.callId,
        initiatorId: call.initiatorId,
        status: call.status,
        createdAt: call.createdAt,
        recipientId
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Unirse a una videollamada existente
 * POST /calls/:callId/join
 */
export async function joinCall(req, res, next) {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    if (!callId) {
      throw new ValidationError('callId is required', 'callId');
    }

    // Buscar llamada
    const call = await Call.findOne({ callId });
    if (!call) {
      throw new NotFoundError(`Call ${callId} not found`, 'Call');
    }

    // Validar estado
    if (call.status === 'ended') {
      throw new ConflictError('Cannot join an ended call');
    }

    // Validar que el usuario no esté ya en la llamada
    if (call.participantIds.includes(userId)) {
      throw new ConflictError('User already in this call');
    }

    // Agregar participante
    call.addParticipant(userId);
    await call.save();

    res.status(200).json({
      success: true,
      message: 'Joined call successfully',
      data: {
        callId: call.callId,
        status: call.status,
        participants: call.participantIds,
        startTime: call.startTime,
        participantCount: call.participantIds.length
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Salir de una videollamada
 * POST /calls/:callId/leave
 */
export async function leaveCall(req, res, next) {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    if (!callId) {
      throw new ValidationError('callId is required', 'callId');
    }

    // Buscar llamada
    const call = await Call.findOne({ callId });
    if (!call) {
      throw new NotFoundError(`Call ${callId} not found`, 'Call');
    }

    // Validar que el usuario esté en la llamada
    if (!call.participantIds.includes(userId)) {
      throw new AuthorizationError('User not in this call');
    }

    // Remover participante
    call.removeParticipant(userId);
    await call.save();

    res.status(200).json({
      success: true,
      message: 'Left call successfully',
      data: {
        callId: call.callId,
        status: call.status,
        participantCount: call.participantIds.length,
        endTime: call.endTime || null
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener estado de una videollamada
 * GET /calls/:callId/status
 */
export async function getCallStatus(req, res, next) {
  try {
    const { callId } = req.params;

    if (!callId) {
      throw new ValidationError('callId is required', 'callId');
    }

    // Buscar llamada
    const call = await Call.findOne({ callId });
    if (!call) {
      throw new NotFoundError(`Call ${callId} not found`, 'Call');
    }

    // Calcular duración si está activa
    if (call.status === 'active') {
      call.calculateDuration();
    }

    res.status(200).json({
      success: true,
      data: {
        callId: call.callId,
        status: call.status,
        initiatorId: call.initiatorId,
        participants: call.participantIds,
        participantCount: call.participantIds.length,
        startTime: call.startTime,
        endTime: call.endTime,
        duration: call.duration,
        formattedDuration: call.formattedDuration,
        isActive: call.isActive,
        metadata: call.metadata,
        createdAt: call.createdAt,
        updatedAt: call.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Terminar una videollamada
 * POST /calls/:callId/end
 */
export async function endCall(req, res, next) {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    if (!callId) {
      throw new ValidationError('callId is required', 'callId');
    }

    // Buscar llamada
    const call = await Call.findOne({ callId });
    if (!call) {
      throw new NotFoundError(`Call ${callId} not found`, 'Call');
    }

    // Validar que sea iniciador o participante
    if (!call.participantIds.includes(userId) && call.initiatorId !== userId) {
      throw new AuthorizationError('Only participants can end this call');
    }

    // Validar estado
    if (call.status === 'ended') {
      throw new ConflictError('Call already ended');
    }

    // Terminar llamada
    call.status = 'ended';
    call.endTime = new Date();
    call.calculateDuration();
    await call.save();

    res.status(200).json({
      success: true,
      message: 'Call ended successfully',
      data: {
        callId: call.callId,
        status: call.status,
        participants: call.participantIds,
        startTime: call.startTime,
        endTime: call.endTime,
        duration: call.duration,
        formattedDuration: call.formattedDuration,
        sessionSummary: {
          totalParticipants: call.participantIds.length,
          durationSeconds: call.duration,
          initiator: call.initiatorId,
          endedBy: userId
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener historial de llamadas de un usuario
 * GET /calls/user/history
 */
export async function getUserCallHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const { limit = 50, skip = 0 } = req.query;

    // Validar parámetros
    const limitNum = Math.min(parseInt(limit) || 50, 100);
    const skipNum = Math.max(parseInt(skip) || 0, 0);

    // Obtener historial
    const calls = await Call.findUserCallHistory(userId, limitNum * 2)
      .skip(skipNum)
      .limit(limitNum);

    // Contar total
    const total = await Call.countDocuments({
      $or: [
        { initiatorId: userId },
        { participantIds: userId }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        calls: calls.map(call => ({
          callId: call.callId,
          status: call.status,
          initiatorId: call.initiatorId,
          participants: call.participantIds,
          participantCount: call.participantIds.length,
          startTime: call.startTime,
          endTime: call.endTime,
          duration: call.duration,
          formattedDuration: call.formattedDuration,
          createdAt: call.createdAt
        })),
        pagination: {
          total,
          limit: limitNum,
          skip: skipNum,
          hasMore: skipNum + limitNum < total
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener llamadas activas de un usuario
 * GET /calls/user/active
 */
export async function getUserActiveCalls(req, res, next) {
  try {
    const userId = req.user.id;

    // Buscar llamadas activas
    const activeCall = await Call.findActiveByUser(userId);

    if (!activeCall) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No active calls'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        callId: activeCall.callId,
        status: activeCall.status,
        initiatorId: activeCall.initiatorId,
        participants: activeCall.participantIds,
        participantCount: activeCall.participantIds.length,
        startTime: activeCall.startTime,
        metadata: activeCall.metadata
      }
    });
  } catch (error) {
    next(error);
  }
}
