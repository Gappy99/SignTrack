/**
 * Translation-related WebSocket events
 * Maneja: detección de señas, traducción en tiempo real
 */

export function registerTranslationHandlers(io, socket) {
  
  /**
   * translation:detected - Seña detectada
   * @event
   * @param {Object} data - { sign: string, confidence: number, callId: string }
   */
  socket.on('translation:detected', (data) => {
    console.log(`[Translation] ${socket.id} detected sign: ${data.sign} (${data.confidence}%)`);
    
    if (!data.callId) return;

    // Broadcast to other users in call
    socket.to(data.callId).emit('translation:sign-detected', {
      from: socket.userId,
      sign: data.sign,
      confidence: data.confidence,
      timestamp: Date.now()
    });

    // Emit to translation service for processing
    socket.emit('translation:queued', {
      sign: data.sign,
      id: `detect_${Date.now()}`
    });
  });

  /**
   * translation:get-result - Obtener resultado de traducción
   * @event
   * @param {Object} data - { detectionId: string, callId: string }
   */
  socket.on('translation:get-result', (data) => {
    console.log(`[Translation] ${socket.id} requesting result for ${data.detectionId}`);
    
    socket.emit('translation:result', {
      detectionId: data.detectionId,
      text: 'Hola',
      signs: ['HOLA'],
      confidence: 0.95,
      timestamp: Date.now()
    });
  });

  /**
   * translation:history - Obtener historial de traducción
   * @event
   * @param {Object} data - { callId: string, limit: number }
   */
  socket.on('translation:history', (data) => {
    console.log(`[Translation] ${socket.id} requesting history for ${data.callId}`);
    
    socket.emit('translation:history-response', {
      callId: data.callId,
      translations: [],
      totalCount: 0
    });
  });

  /**
   * translation:subscribe - Suscribirse a actualizaciones de traducción
   * @event
   * @param {Object} data - { callId: string }
   */
  socket.on('translation:subscribe', (data) => {
    console.log(`[Translation] ${socket.id} subscribing to updates for ${data.callId}`);
    
    socket.translationSubscriptions = socket.translationSubscriptions || [];
    socket.translationSubscriptions.push(data.callId);
    
    socket.emit('translation:subscribed', {
      callId: data.callId
    });
  });

  /**
   * translation:unsubscribe - Desuscribirse de actualizaciones
   * @event
   * @param {Object} data - { callId: string }
   */
  socket.on('translation:unsubscribe', (data) => {
    console.log(`[Translation] ${socket.id} unsubscribing from ${data.callId}`);
    
    if (socket.translationSubscriptions) {
      socket.translationSubscriptions = socket.translationSubscriptions.filter(
        id => id !== data.callId
      );
    }
  });

  /**
   * translation:batch - Procesar lote de detecciones
   * @event
   * @param {Object} data - { detections: Array, callId: string }
   */
  socket.on('translation:batch', (data) => {
    console.log(`[Translation] ${socket.id} processing batch of ${data.detections.length} detections`);
    
    socket.emit('translation:batch-queued', {
      batchId: `batch_${Date.now()}`,
      count: data.detections.length
    });
  });
}
