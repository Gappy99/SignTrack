/**
 * Call-related WebSocket events
 * Maneja: crear llamadas, unirse, salir, terminar
 */

export function registerCallHandlers(io, socket) {
  
  /**
   * call:initiate - Iniciar nueva videollamada
   * @event
   * @param {Object} data - { recipientId: string, metadata: object }
   */
  socket.on('call:initiate', (data) => {
    console.log(`[Call] ${socket.id} initiating call to ${data.recipientId}`);
    
    // Crear room para la llamada
    const callId = `call_${Date.now()}`;
    socket.callId = callId;
    socket.join(callId);
    
    // Notificar al destinatario
    io.to(data.recipientId).emit('call:incoming', {
      callerId: socket.userId,
      callerSocketId: socket.id,
      callId: callId,
      metadata: data.metadata
    });
    
    // Confirmar al iniciador
    socket.emit('call:initiated', {
      callId: callId,
      status: 'ringing'
    });
  });

  /**
   * call:accept - Aceptar llamada entrante
   * @event
   * @param {Object} data - { callId: string }
   */
  socket.on('call:accept', (data) => {
    console.log(`[Call] ${socket.id} accepting call ${data.callId}`);
    
    socket.callId = data.callId;
    socket.join(data.callId);
    
    // Notificar a todos en la llamada
    io.to(data.callId).emit('call:accepted', {
      userId: socket.userId,
      socketId: socket.id
    });
  });

  /**
   * call:reject - Rechazar llamada entrante
   * @event
   * @param {Object} data - { callId: string, reason: string }
   */
  socket.on('call:reject', (data) => {
    console.log(`[Call] ${socket.id} rejecting call ${data.callId}`);
    
    io.to(data.callId).emit('call:rejected', {
      userId: socket.userId,
      reason: data.reason
    });
  });

  /**
   * call:leave - Salir de la llamada
   * @event
   * @param {Object} data - { callId: string }
   */
  socket.on('call:leave', (data) => {
    console.log(`[Call] ${socket.id} leaving call ${data.callId}`);
    
    if (socket.callId) {
      io.to(socket.callId).emit('call:user-left', {
        userId: socket.userId,
        socketId: socket.id
      });
      socket.leave(socket.callId);
      socket.callId = null;
    }
  });

  /**
   * call:end - Terminar llamada
   * @event
   * @param {Object} data - { callId: string }
   */
  socket.on('call:end', (data) => {
    console.log(`[Call] ${socket.id} ending call ${data.callId}`);
    
    io.to(data.callId).emit('call:ended', {
      endedBy: socket.userId,
      timestamp: new Date().toISOString()
    });
    
    // Limpiar la sala
    io.in(data.callId).socketsLeave(data.callId);
  });

  /**
   * call:get-status - Obtener estado de la llamada
   * @event
   * @param {Object} data - { callId: string }
   */
  socket.on('call:get-status', (data) => {
    console.log(`[Call] ${socket.id} requesting status of ${data.callId}`);
    
    const room = io.sockets.adapter.rooms.get(data.callId);
    const participants = room ? Array.from(room).length : 0;
    
    socket.emit('call:status', {
      callId: data.callId,
      participants: participants,
      active: participants > 0
    });
  });
}
