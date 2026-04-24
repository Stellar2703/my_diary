import mongoose from 'mongoose';

const banSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  expiresAt: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
banSchema.index({ userId: 1, isActive: 1 });
banSchema.index({ expiresAt: 1 });

const Ban = mongoose.model('Ban', banSchema);

export default Ban;
