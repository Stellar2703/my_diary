import mongoose from 'mongoose';
import { Department, Event, Post } from '../models/index.js';

// Add moderator to department
export const addModerator = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { userId, permissions } = req.body;
    const currentUserId = req.user.id;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(departmentId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid department or user ID' });
    }

    // Verify current user is admin
    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (dept.createdBy.toString() !== currentUserId) {
      return res.status(403).json({ error: 'Only department admin can add moderators' });
    }

    // Verify user is a member
    const isMember = dept.members.some(m => m.userId.toString() === userId);
    if (!isMember) {
      return res.status(400).json({ error: 'User must be a member to become moderator' });
    }

    // Check if already moderator
    const isModerator = dept.moderators.some(m => m.userId.toString() === userId);
    if (isModerator) {
      return res.status(400).json({ error: 'User is already a moderator' });
    }

    const defaultPermissions = {
      canApprovePost: true,
      canDeletePost: true,
      canDeleteComment: true,
      canBanUser: false,
      canCreateEvent: true,
      canEditRules: false
    };

    await Department.findByIdAndUpdate(departmentId, {
      $push: {
        moderators: {
          userId,
          permissions: permissions || defaultPermissions,
          assignedBy: currentUserId,
          assignedAt: new Date()
        }
      }
    });

    res.json({ success: true, message: 'Moderator added successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to add moderator' });
  }
};

// Remove moderator
export const removeModerator = async (req, res) => {
  try {
    const { departmentId, moderatorId } = req.params;
    const currentUserId = req.user.id;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(departmentId) || !mongoose.Types.ObjectId.isValid(moderatorId)) {
      return res.status(400).json({ error: 'Invalid department or moderator ID' });
    }

    // Verify current user is admin
    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (dept.createdBy.toString() !== currentUserId) {
      return res.status(403).json({ error: 'Only department admin can remove moderators' });
    }

    await Department.findByIdAndUpdate(departmentId, {
      $pull: { moderators: { userId: moderatorId } }
    });

    res.json({ success: true, message: 'Moderator removed successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to remove moderator' });
  }
};

// Get department moderators
export const getModerators = async (req, res) => {
  try {
    const { departmentId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ error: 'Invalid department ID' });
    }

    const dept = await Department.findById(departmentId)
      .populate('moderators.userId', 'username name avatar')
      .populate('moderators.assignedBy', 'username name')
      .lean();

    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Format the response
    const moderators = dept.moderators.map(mod => ({
      ...mod,
      user_id: mod.userId._id,
      username: mod.userId.username,
      name: mod.userId.name,
      avatar: mod.userId.avatar,
      assigned_by_username: mod.assignedBy?.username,
      assigned_by_name: mod.assignedBy?.name,
      assigned_at: mod.assignedAt
    }));

    res.json({ success: true, data: moderators });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get moderators' });
  }
};

// Update moderator permissions
export const updateModeratorPermissions = async (req, res) => {
  try {
    const { departmentId, moderatorId } = req.params;
    const { permissions } = req.body;
    const currentUserId = req.user.id;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(departmentId) || !mongoose.Types.ObjectId.isValid(moderatorId)) {
      return res.status(400).json({ error: 'Invalid department or moderator ID' });
    }

    // Verify current user is admin
    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (dept.createdBy.toString() !== currentUserId) {
      return res.status(403).json({ error: 'Only department admin can update permissions' });
    }

    // Update the specific moderator's permissions
    await Department.updateOne(
      { _id: departmentId, 'moderators.userId': moderatorId },
      { $set: { 'moderators.$.permissions': permissions } }
    );

    res.json({ success: true, message: 'Permissions updated successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to update permissions' });
  }
};

// Create event
export const createEvent = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const {
      title,
      description,
      eventType,
      location,
      startTime,
      endTime,
      maxAttendees
    } = req.body;
    const userId = req.user.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ error: 'Invalid department ID' });
    }

    // Verify user is admin or moderator with permission
    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const isAdmin = dept.createdBy.toString() === userId;

    if (!isAdmin) {
      const moderator = dept.moderators.find(m => m.userId.toString() === userId);
      if (!moderator) {
        return res.status(403).json({ error: 'Only admins and moderators can create events' });
      }

      if (!moderator.permissions.canCreateEvent) {
        return res.status(403).json({ error: 'You do not have permission to create events' });
      }
    }

    const event = await Event.create({
      departmentId,
      createdBy: userId,
      title,
      description,
      eventType,
      location,
      startTime,
      endTime,
      maxAttendees: maxAttendees || null
    });

    res.json({ success: true, message: 'Event created successfully', data: { eventId: event._id } });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to create event' });
  }
};

// Get department events
export const getEvents = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { upcoming = 'true' } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ error: 'Invalid department ID' });
    }

    const query = { departmentId };

    if (upcoming === 'true') {
      query.startTime = { $gt: new Date() };
      query.isActive = true;
    }

    const events = await Event.find(query)
      .populate('createdBy', 'username name avatar')
      .sort({ startTime: 1 })
      .lean();

    // Format events with counts
    const formattedEvents = events.map(event => ({
      ...event,
      creator_username: event.createdBy.username,
      creator_name: event.createdBy.name,
      creator_avatar: event.createdBy.avatar,
      going_count: event.attendees?.filter(a => a.status === 'going').length || 0,
      maybe_count: event.attendees?.filter(a => a.status === 'maybe').length || 0
    }));

    res.json({ success: true, data: formattedEvents });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get events' });
  }
};

// RSVP to event
export const rsvpEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body; // going, maybe, not_going
    const userId = req.user.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const validStatuses = ['going', 'maybe', 'not_going'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid RSVP status' });
    }

    // Check if event exists and is active
    const event = await Event.findById(eventId);
    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event not found or inactive' });
    }

    // Check max attendees
    if (status === 'going' && event.maxAttendees) {
      const goingCount = event.attendees.filter(a => a.status === 'going').length;
      if (goingCount >= event.maxAttendees) {
        return res.status(400).json({ error: 'Event is full' });
      }
    }

    // Check if already RSVP'd
    const existingIndex = event.attendees.findIndex(a => a.userId.toString() === userId);

    if (existingIndex !== -1) {
      if (status === 'not_going') {
        // Remove RSVP
        await Event.findByIdAndUpdate(eventId, {
          $pull: { attendees: { userId } }
        });
      } else {
        // Update RSVP
        await Event.updateOne(
          { _id: eventId, 'attendees.userId': userId },
          { $set: { 'attendees.$.status': status } }
        );
      }
    } else {
      if (status !== 'not_going') {
        // Create RSVP
        await Event.findByIdAndUpdate(eventId, {
          $push: { attendees: { userId, status, registeredAt: new Date() } }
        });
      }
    }

    res.json({ success: true, message: 'RSVP updated successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to update RSVP' });
  }
};

// Get event attendees
export const getEventAttendees = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const event = await Event.findById(eventId)
      .populate('attendees.userId', 'username name avatar')
      .lean();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Format attendees
    const attendees = event.attendees.map(att => ({
      ...att,
      user_id: att.userId._id,
      username: att.userId.username,
      name: att.userId.name,
      avatar: att.userId.avatar,
      registered_at: att.registeredAt
    })).sort((a, b) => new Date(b.registered_at) - new Date(a.registered_at));

    res.json({ success: true, data: attendees });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get attendees' });
  }
};

// Submit post for approval (if department requires approval)
export const submitPostForApproval = async (req, res) => {
  try {
    const { postId, departmentId } = req.body;
    const userId = req.user.id;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ error: 'Invalid post or department ID' });
    }

    // Verify post exists and belongs to user
    const post = await Post.findOne({ _id: postId, userId, departmentId });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already submitted
    const dept = await Department.findById(departmentId);
    const existing = dept.pendingPosts.find(p => p.postId.toString() === postId);
    if (existing) {
      return res.status(400).json({ error: 'Post already submitted for approval' });
    }

    await Department.findByIdAndUpdate(departmentId, {
      $push: {
        pendingPosts: {
          postId,
          submittedBy: userId,
          status: 'pending',
          createdAt: new Date()
        }
      }
    });

    res.json({ success: true, message: 'Post submitted for approval' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to submit post' });
  }
};

// Get pending posts (for moderators/admins)
export const getPendingPosts = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const userId = req.user.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ error: 'Invalid department ID' });
    }

    // Verify user is admin or moderator
    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const isAdmin = dept.createdBy.toString() === userId;

    if (!isAdmin) {
      const moderator = dept.moderators.find(m => m.userId.toString() === userId);
      if (!moderator) {
        return res.status(403).json({ error: 'Only admins and moderators can view pending posts' });
      }

      if (!moderator.permissions.canApprovePost) {
        return res.status(403).json({ error: 'You do not have permission to approve posts' });
      }
    }

    // Get pending posts
    const deptWithPosts = await Department.findById(departmentId)
      .populate({
        path: 'pendingPosts.postId',
        select: 'content mediaUrl createdAt'
      })
      .populate('pendingPosts.submittedBy', 'username name avatar')
      .lean();

    const pending = deptWithPosts.pendingPosts
      .filter(p => p.status === 'pending')
      .map(p => ({
        ...p,
        content: p.postId?.content,
        media_url: p.postId?.mediaUrl,
        post_created_at: p.postId?.createdAt,
        username: p.submittedBy?.username,
        name: p.submittedBy?.name,
        avatar: p.submittedBy?.avatar
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: pending });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get pending posts' });
  }
};

// Review pending post
export const reviewPendingPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { action, rejectionReason } = req.body; // approve or reject
    const userId = req.user.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Find department with this pending post
    const dept = await Department.findOne({ 'pendingPosts.postId': postId });
    if (!dept) {
      return res.status(404).json({ error: 'Pending post not found' });
    }

    const pendingPost = dept.pendingPosts.find(p => p.postId.toString() === postId && p.status === 'pending');
    if (!pendingPost) {
      return res.status(404).json({ error: 'Pending post not found or already reviewed' });
    }

    // Verify user is admin or moderator with permission
    const isAdmin = dept.createdBy.toString() === userId;

    if (!isAdmin) {
      const moderator = dept.moderators.find(m => m.userId.toString() === userId);
      if (!moderator) {
        return res.status(403).json({ error: 'Only admins and moderators can review posts' });
      }

      if (!moderator.permissions.canApprovePost) {
        return res.status(403).json({ error: 'You do not have permission to approve posts' });
      }
    }

    if (action === 'approve') {
      // Update pending post status
      await Department.updateOne(
        { _id: dept._id, 'pendingPosts.postId': postId },
        {
          $set: {
            'pendingPosts.$.status': 'approved',
            'pendingPosts.$.reviewedBy': userId,
            'pendingPosts.$.reviewedAt': new Date()
          }
        }
      );

      // Make post visible
      await Post.findByIdAndUpdate(postId, { isActive: true });
    } else {
      // Update pending post status
      await Department.updateOne(
        { _id: dept._id, 'pendingPosts.postId': postId },
        {
          $set: {
            'pendingPosts.$.status': 'rejected',
            'pendingPosts.$.reviewedBy': userId,
            'pendingPosts.$.reviewedAt': new Date(),
            'pendingPosts.$.rejectionReason': rejectionReason || 'No reason provided'
          }
        }
      );

      // Make post inactive
      await Post.findByIdAndUpdate(postId, { isActive: false });
    }

    res.json({ success: true, message: `Post ${action}d successfully` });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to review post' });
  }
};

// Update department settings
export const updateDepartmentSettings = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { coverImage, rules, requireApproval } = req.body;
    const userId = req.user.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ error: 'Invalid department ID' });
    }

    // Verify user is admin
    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (dept.createdBy.toString() !== userId) {
      return res.status(403).json({ error: 'Only department admin can update settings' });
    }

    const updates = {};

    if (coverImage !== undefined) {
      updates.coverImage = coverImage;
    }

    if (rules !== undefined) {
      updates.rules = rules;
    }

    if (requireApproval !== undefined) {
      updates['settings.requireApproval'] = requireApproval;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    await Department.findByIdAndUpdate(departmentId, { $set: updates });

    res.json({ success: true, message: 'Department settings updated successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
