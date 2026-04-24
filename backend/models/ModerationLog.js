import mongoose from 'mongoose';

const moderationLogSchema = new mongoose.Schema({
  moderatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  targetType: {
    type: String,
    enum: ['post', 'comment', 'user'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  reason: String
}, {
  timestamps: true
});

// Indexes
moderationLogSchema.index({ moderatorId: 1, createdAt: -1 });
moderationLogSchema.index({ targetType: 1, targetId: 1 });
moderationLogSchema.index({ createdAt: -1 });

const ModerationLog = mongoose.model('ModerationLog', moderationLogSchema);

export default ModerationLog;
