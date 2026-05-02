import mongoose from 'mongoose';

const translationHistorySchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    frameId: {
      type: String,
      unique: true,
      sparse: true
    },
    detectionId: {
      type: String,
      index: true
    },
    detectedSigns: [
      {
        sign: String,
        confidence: {
          type: Number,
          min: 0,
          max: 1
        },
        timestamp: Date
      }
    ],
    translatedText: {
      type: String
    },
    translationConfidence: {
      type: Number,
      min: 0,
      max: 1
    },
    rawData: {
      features: mongoose.Schema.Types.Mixed,
      inference: mongoose.Schema.Types.Mixed,
      translation: mongoose.Schema.Types.Mixed
    },
    processingTime: {
      type: Number, // en milisegundos
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed'],
      default: 'pending'
    },
    error: String
  },
  {
    timestamps: true,
    collection: 'translation_history'
  }
);

// Índices
translationHistorySchema.index({ callId: 1, userId: 1, createdAt: -1 });
translationHistorySchema.index({ callId: 1, status: 1 });
translationHistorySchema.index({ createdAt: -1 });

// TTL Index para limpiar registros antiguos (30 días)
translationHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

// Métodos
translationHistorySchema.methods.markAsProcessing = function () {
  this.status = 'processing';
};

translationHistorySchema.methods.markAsSuccess = function (translation, confidence = 1) {
  this.status = 'success';
  this.translatedText = translation;
  this.translationConfidence = confidence;
};

translationHistorySchema.methods.markAsFailed = function (errorMessage) {
  this.status = 'failed';
  this.error = errorMessage;
};

// Métodos estáticos
translationHistorySchema.statics.findByCallId = function (callId, limit = 100) {
  return this.find({ callId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

translationHistorySchema.statics.findSuccessfulByCallId = function (callId) {
  return this.find({
    callId,
    status: 'success'
  }).sort({ createdAt: -1 });
};

translationHistorySchema.statics.getCallStatistics = function (callId) {
  return this.aggregate([
    { $match: { callId } },
    {
      $group: {
        _id: '$callId',
        totalFrames: { $sum: 1 },
        successfulTranslations: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        failedTranslations: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        averageConfidence: { $avg: '$translationConfidence' },
        averageProcessingTime: { $avg: '$processingTime' }
      }
    }
  ]);
};

const TranslationHistory = mongoose.model('TranslationHistory', translationHistorySchema);

export default TranslationHistory;
