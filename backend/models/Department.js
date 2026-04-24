import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['college', 'government', 'corporate', 'community'],
    required: true
  },
  description: {
    type: String,
    maxlength: 1000
  },
  avatar: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: String,
  city: String,
  state: String,
  country: String,
  isActive: {
    type: Boolean,
    default: true
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  moderators: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    permissions: {
      canApprovePost: { type: Boolean, default: true },
      canDeletePost: { type: Boolean, default: true },
      canDeleteComment: { type: Boolean, default: true },
      canBanUser: { type: Boolean, default: false },
      canCreateEvent: { type: Boolean, default: true },
      canEditRules: { type: Boolean, default: false }
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  pendingPosts: [{
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    rejectionReason: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  coverImage: String,
  rules: String,
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    allowMemberPosts: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
departmentSchema.index({ name: 1 });
departmentSchema.index({ type: 1 });
departmentSchema.index({ isActive: 1 });
departmentSchema.index({ 'members.userId': 1 });
departmentSchema.index({ city: 1, state: 1, country: 1 });

// Text index for search
departmentSchema.index({ name: 'text', description: 'text' });

// Virtuals
departmentSchema.virtual('memberCount').get(function() {
  return this.members ? this.members.length : 0;
});

departmentSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'departmentId'
});

const Department = mongoose.model('Department', departmentSchema);

export default Department;
