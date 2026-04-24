import mongoose from 'mongoose';

const twoFactorAuthSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  secret: {
    type: String,
    required: true
  },
  isEnabled: {
    type: Boolean,
    default: false
  },
  backupCodes: [{
    code: String,
    used: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Indexes (userId already indexed via unique: true)

const TwoFactorAuth = mongoose.model('TwoFactorAuth', twoFactorAuthSchema);

export default TwoFactorAuth;
