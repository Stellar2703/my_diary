import { User, Post, Notification, Department, Comment } from '../models/index.js';
import mongoose from 'mongoose';

// Get user's saved locations
export const getUserLocations = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('locations').lean();

    const locations = (user?.locations || [])
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, 10);

    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user locations',
      error: error.message
    });
  }
};

// Get notifications
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = { userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('fromUserId', 'name username profileAvatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Notification.countDocuments(query);

    const enrichedNotifications = notifications.map(n => ({
      ...n,
      id: n._id.toString(),
      is_read: n.isRead,
      created_at: n.createdAt,
      from_user_name: n.fromUserId?.name,
      from_user_username: n.fromUserId?.username,
      from_user_avatar: n.fromUserId?.profileAvatar
    }));

    res.json({
      success: true,
      data: {
        notifications: enrichedNotifications,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

// Mark notification as read
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }

    await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true }
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

// Mark all notifications as read
export const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

// Get user feed (posts from joined departments and own posts)
export const getUserFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get departments user is a member of
    const departments = await Department.find({
      $or: [
        { 'members.userId': userId },
        { createdBy: userId }
      ]
    }).select('_id');

    const departmentIds = departments.map(d => d._id);

    // Get posts from those departments or user's own posts
    let posts = await Post.find({
      isActive: true,
      $or: [
        { departmentId: { $in: departmentIds } },
        { userId }
      ]
    })
    .populate('userId', 'name username profileAvatar')
    .populate('departmentId', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

    // Get comment counts
    const postIds = posts.map(p => p._id);
    const commentCounts = await Comment.aggregate([
      { $match: { postId: { $in: postIds }, isActive: true } },
      { $group: { _id: '$postId', count: { $sum: 1 } } }
    ]);

    const commentCountMap = {};
    commentCounts.forEach(cc => {
      commentCountMap[cc._id.toString()] = cc.count;
    });

    // Enrich posts
    posts = posts.map(post => ({
      ...post,
      id: post._id.toString(),
      author_name: post.userId?.name,
      author_username: post.userId?.username,
      author_avatar: post.userId?.profileAvatar,
      department_name: post.departmentId?.name,
      post_date: post.createdAt,
      media_url: post.mediaUrl,
      media_type: post.mediaType,
      likes_count: post.likes?.length || 0,
      comments_count: commentCountMap[post._id.toString()] || 0,
      shares_count: post.shares?.length || 0,
      isLikedByUser: post.likes?.some(l => l.userId.toString() === userId) || false,
      isSharedByUser: post.shares?.some(s => s.userId.toString() === userId) || false
    }));

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: pageNum,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user feed',
      error: error.message
    });
  }
};
