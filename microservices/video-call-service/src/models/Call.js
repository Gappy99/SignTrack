import mongoose from 'mongoose';

const callSchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    initiatorId: {
      type: String,
      required: true,
      index: true
    },
    participantIds: [
      {
        type: String,
        ref: 'User'
      }
    ],
    status: {
      type: String,
      enum: ['pending', 'active', 'ended', 'failed'],
      default: 'pending',
      index: true
    },
    startTime: {
      type: Date,
      default: null
    },
    endTime: {
      type: Date,
      default: null
    },
    duration: {
      type: Number, // en segundos
      default: 0
    },
    metadata: {
      topic: String,
      notes: String,
      tags: [String]
    },
    recording: {
      enabled: Boolean,
      url: String,
      size: Number
    }
  },
  {
    timestamps: true,
    collection: 'calls'
  }
);

// Índices
callSchema.index({ initiatorId: 1, createdAt: -1 });
callSchema.index({ participantIds: 1 });
callSchema.index({ status: 1 });
callSchema.index({ createdAt: -1 });

// Métodos virtuales
callSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

callSchema.virtual('formattedDuration').get(function () {
  if (!this.duration) return '0s';
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  
  let result = [];
  if (hours > 0) result.push(`${hours}h`);
  if (minutes > 0) result.push(`${minutes}m`);
  if (seconds > 0) result.push(`${seconds}s`);
  
  return result.join(' ');
});

// Métodos de instancia
callSchema.methods.addParticipant = function (userId) {
  if (!this.participantIds.includes(userId)) {
    this.participantIds.push(userId);
    this.status = 'active';
    this.startTime = this.startTime || new Date();
  }
};

callSchema.methods.removeParticipant = function (userId) {
  this.participantIds = this.participantIds.filter(id => id !== userId);
  
  // Si no hay más participantes, terminar la llamada
  if (this.participantIds.length === 0) {
    this.status = 'ended';
    this.endTime = new Date();
    this.duration = Math.round((this.endTime - this.startTime) / 1000);
  }
};

callSchema.methods.calculateDuration = function () {
  if (this.startTime && this.endTime) {
    this.duration = Math.round((this.endTime - this.startTime) / 1000);
  }
};

// Métodos estáticos
callSchema.statics.findActiveByUser = function (userId) {
  return this.findOne({
    $or: [
      { initiatorId: userId },
      { participantIds: userId }
    ],
    status: 'active'
  });
};

callSchema.statics.findUserCallHistory = function (userId, limit = 50) {
  return this.find({
    $or: [
      { initiatorId: userId },
      { participantIds: userId }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

const Call = mongoose.model('Call', callSchema);

export default Call;
