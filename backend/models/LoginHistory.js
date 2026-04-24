import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  device: {
    type: String
  },
  browser: {
    type: String
  },
  os: {
    type: String
  },
  location: {
    country: String,
    city: String
  },
  success: {
    type: Boolean,
    default: true
  },
  failureReason: {
    type: String
  },
  loginAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
loginHistorySchema.index({ userId: 1, loginAt: -1 });

// Auto-delete old login history after 90 days
loginHistorySchema.index({ loginAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

const LoginHistory = mongoose.model('LoginHistory', loginHistorySchema);

export default LoginHistory;
