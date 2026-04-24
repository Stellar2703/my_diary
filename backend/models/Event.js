import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 2000
  },
  eventType: {
    type: String,
    enum: ['meetup', 'online', 'conference', 'workshop', 'social', 'other'],
    default: 'meetup'
  },
  location: String,
  startTime: {
    type: Date,
    required: true
  },
  endTime: Date,
  maxAttendees: Number,
  isActive: {
    type: Boolean,
    default: true
  },
  attendees: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['going', 'maybe', 'not_going'],
      required: true
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
eventSchema.index({ departmentId: 1, startTime: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ isActive: 1, startTime: 1 });
eventSchema.index({ 'attendees.userId': 1 });

// Virtuals
eventSchema.virtual('goingCount').get(function() {
  return this.attendees?.filter(a => a.status === 'going').length || 0;
});

eventSchema.virtual('maybeCount').get(function() {
  return this.attendees?.filter(a => a.status === 'maybe').length || 0;
});

const Event = mongoose.model('Event', eventSchema);

export default Event;
