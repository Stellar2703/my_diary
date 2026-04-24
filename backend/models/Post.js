import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  mediaUrl: String,
  mediaType: {
    type: String,
    enum: ['none', 'photo', 'video', 'audio'],
    default: 'none'
  },
  latitude: Number,
  longitude: Number,
  country: String,
  state: String,
  city: String,
  area: String,
  street: String,
  postDate: {
    type: Date,
    default: Date.now
  },
  visibility: {
    type: String,
    enum: ['public', 'followers', 'department', 'private'],
    default: 'public'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isAlert: {
    type: Boolean,
    default: false
  },
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reactedAt: {
      type: Date,
      default: Date.now
    }
  }],
  shares: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reactionType: {
      type: String,
      enum: ['like', 'love', 'wow', 'sad', 'angry', 'celebrate'],
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  savedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    collectionName: String,
    savedAt: {
      type: Date,
      default: Date.now
    }
  }],
  hashtags: [{
    type: String,
    lowercase: true
  }],
  mentions: [{
    type: String,
    lowercase: true
  }],
  editHistory: [{
    content: String,
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    editedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ departmentId: 1, createdAt: -1 });
postSchema.index({ isActive: 1, postDate: -1 });
postSchema.index({ city: 1, state: 1, country: 1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ 'likes.userId': 1 });
postSchema.index({ 'reactions.userId': 1 });
postSchema.index({ visibility: 1 });

// Text index for content search
postSchema.index({ content: 'text' });

// Virtuals
postSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

postSchema.virtual('shareCount').get(function() {
  return this.shares ? this.shares.length : 0;
});

postSchema.virtual('reactionCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'postId'
});

const Post = mongoose.model('Post', postSchema);

export default Post;
