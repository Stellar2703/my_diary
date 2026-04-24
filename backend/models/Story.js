import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mediaUrl: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    enum: ['photo', 'video'],
    required: true
  },
  caption: {
    type: String,
    maxlength: 500
  },
  latitude: Number,
  longitude: Number,
  country: String,
  state: String,
  city: String,
  visibility: {
    type: String,
    enum: ['public', 'followers', 'close_friends', 'private'],
    default: 'followers'
  },
  views: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes (userId already in compound index below)
storySchema.index({ userId: 1, createdAt: -1 });
storySchema.index({ isActive: 1 });

// Virtual for view count
storySchema.virtual('viewCount').get(function() {
  return this.views ? this.views.length : 0;
});

// Auto-delete expired stories
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Story = mongoose.model('Story', storySchema);

export default Story;
