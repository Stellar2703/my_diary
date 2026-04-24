import { Notification, User } from '../models/index.js';
import mongoose from 'mongoose';

// Create notification
const createNotification = async (userId, type, content, relatedId = null, actorId = null) => {
  try {
    await Notification.create({
      userId,
      type,
      content,
      message: content,
      fromUserId: actorId,
      relatedId,
      isRead: false,
      isActive: true
    });
  } catch (error) {
    
  }
};

// Get user notifications
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { type, unreadOnly = 'false', page = 1, limit = 20 } = req.query;

    const query = { userId };

    if (type) {
      query.type = type;
    }

    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('fromUserId', 'username name profileAvatar')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    // Enrich data
    const enriched = notifications.map(n => ({
      ...n,
      id: n._id,
      actor_username: n.fromUserId?.username,
      actor_name: n.fromUserId?.name,
      actor_avatar: n.fromUserId?.profileAvatar,
      is_read: n.isRead,
      created_at: n.createdAt
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id || req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true }
    );

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id || req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    await Notification.findOneAndDelete({
      _id: notificationId,
      userId
    });

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const count = await Notification.countDocuments({
      userId,
      isRead: false
    });

    res.json({ success: true, data: { count } });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

// Get notification settings
export const getNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const user = await User.findById(userId).select('notificationSettings').lean();

    if (!user || !user.notificationSettings) {
      // Return default settings
      const defaults = {
        email_on_follow: true,
        email_on_comment: true,
        email_on_mention: true,
        email_on_post_reaction: false,
        email_on_comment_reaction: false,
        email_on_message: true,
        email_on_event_reminder: true,
        push_on_follow: true,
        push_on_comment: true,
        push_on_mention: true,
        push_on_post_reaction: true,
        push_on_comment_reaction: true,
        push_on_message: true,
        push_on_event_reminder: true,
      };

      // Update user with default settings
      await User.findByIdAndUpdate(userId, {
        notificationSettings: defaults
      });

      return res.json({ success: true, data: defaults });
    }

    res.json({ success: true, data: user.notificationSettings });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get settings' });
  }
};

// Update notification settings
export const updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const settings = req.body;

    const updates = {};

    Object.keys(settings).forEach((key) => {
      if (key.startsWith('email_') || key.startsWith('push_')) {
        updates[`notificationSettings.${key}`] = settings[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid settings provided' });
    }

    await User.findByIdAndUpdate(userId, { $set: updates });

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (
error) {
    
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// Helper function to create notification for follow
export const notifyFollow = async (followerId, followingId) => {
  try {
    const follower = await User.findById(followerId).select('username').lean();
    
    await createNotification(
      followingId,
      'follow',
      `@${follower.username} started following you`,
      followerId,
      followerId
    );
  } catch (error) {
    
  }
};

// Helper function to create notification for comment
export const notifyComment = async (postId, commenterId, postOwnerId) => {
  if (commenterId === postOwnerId) return; // Don't notify yourself

  try {
    const commenter = await User.findById(commenterId).select('username').lean();
    
    await createNotification(
      postOwnerId,
      'comment',
      `@${commenter.username} commented on your post`,
      postId,
      commenterId
    );
  } catch (error) {
    
  }
};

// Helper function to create notification for mention
export const notifyMention = async (mentionerId, mentionedId, postId) => {
  try {
    const mentioner = await User.findById(mentionerId).select('username').lean();
    
    await createNotification(
      mentionedId,
      'mention',
      `@${mentioner.username} mentioned you in a post`,
      postId,
      mentionerId
    );
  } catch (error) {
    
  }
};

// Helper function to create notification for reaction
export const notifyReaction = async (reactorId, postOwnerId, postId, reactionType) => {
  if (reactorId === postOwnerId) return; // Don't notify yourself

  try {
    const reactor = await User.findById(reactorId).select('username').lean();
    
    await createNotification(
      postOwnerId,
      'post_reaction',
      `@${reactor.username} reacted ${reactionType} to your post`,
      postId,
      reactorId
    );
  } catch (error) {
    
  }
};

export { createNotification };
