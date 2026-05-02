/**
 * Frame-related WebSocket events
 * Maneja: captura, streaming, y procesamiento de frames
 */

export function registerFrameHandlers(io, socket) {
  
  /**
   * frame:captured - Captura de frame de video
   * @event
   * @param {Object} data - { frame: base64string, callId: string, timestamp: number }
   */
  socket.on('frame:captured', (data) => {
    console.log(`[Frame] ${socket.id} captured frame for call ${data.callId}`);
    
    if (!socket.callId || socket.callId !== data.callId) {
      socket.emit('frame:error', {
        message: 'Invalid call context'
      });
      return;
    }

    // Broadcast frame a otros usuarios en la llamada
    socket.to(data.callId).emit('frame:received', {
      from: socket.userId,
      socketId: socket.id,
      frame: data.frame,
      timestamp: data.timestamp || Date.now()
    });

    // Emitir para procesamiento IA
    socket.emit('frame:queued-for-processing', {
      frameId: `frame_${Date.now()}`,
      callId: data.callId
    });
  });

  /**
   * frame:batch - Enviar múltiples frames
   * @event
   * @param {Object} data - { frames: Array, callId: string }
   */
  socket.on('frame:batch', (data) => {
    console.log(`[Frame] ${socket.id} sending batch of ${data.frames.length} frames`);
    
    // Procesar lote
    socket.to(data.callId).emit('frame:batch-received', {
      from: socket.userId,
      count: data.frames.length,
      timestamp: Date.now()
    });
  });

  /**
   * frame:stream-start - Iniciar streaming de frames
   * @event
   * @param {Object} data - { callId: string, options: object }
   */
  socket.on('frame:stream-start', (data) => {
    console.log(`[Frame] ${socket.id} starting frame stream for ${data.callId}`);
    
    socket.streamActive = true;
    socket.callId = data.callId;
    socket.join(data.callId);
    
    socket.emit('frame:stream-acknowledged', {
      callId: data.callId,
      status: 'streaming'
    });
  });

  /**
   * frame:stream-stop - Detener streaming de frames
   * @event
   * @param {Object} data - { callId: string }
   */
  socket.on('frame:stream-stop', (data) => {
    console.log(`[Frame] ${socket.id} stopping frame stream`);
    
    socket.streamActive = false;
    
    socket.emit('frame:stream-stopped', {
      message: 'Frame streaming stopped'
    });
  });

  /**
   * frame:quality - Ajustar calidad de frames
   * @event
   * @param {Object} data - { quality: 'low'|'medium'|'high', resolution: number }
   */
  socket.on('frame:quality', (data) => {
    console.log(`[Frame] ${socket.id} adjusting quality to ${data.quality}`);
    
    socket.frameQuality = data.quality;
    
    socket.emit('frame:quality-updated', {
      quality: data.quality,
      resolution: data.resolution
    });
    
    // Notificar a otros en la llamada
    if (socket.callId) {
      socket.to(socket.callId).emit('frame:quality-changed', {
        userId: socket.userId,
        quality: data.quality
      });
    }
  });
}
