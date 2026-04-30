import mongoose from 'mongoose';
import { User, Post, Comment, Department, Report, Ban, ModerationLog } from '../models/index.js';
import { generateToken } from './authController.js';

export const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalPosts,
      activePosts,
      totalComments,
      activeDepartments,
      pendingReports,
      activeBans,
      latestLogs,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      Post.countDocuments({}),
      Post.countDocuments({ isActive: true }),
      Comment.countDocuments({ isActive: true }),
      Department.countDocuments({ isActive: true }),
      Report.countDocuments({ status: 'pending' }),
      Ban.countDocuments({ isActive: true }),
      ModerationLog.find()
        .populate('moderatorId', 'name username')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          total_users: totalUsers,
          active_users: activeUsers,
          total_posts: totalPosts,
          active_posts: activePosts,
          total_comments: totalComments,
          active_departments: activeDepartments,
          pending_reports: pendingReports,
          active_bans: activeBans,
        },
        recent_logs: latestLogs.map((log) => ({
          ...log,
          id: log._id.toString(),
          moderator_name: log.moderatorId?.name,
          moderator_username: log.moderatorId?.username,
          created_at: log.createdAt,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin dashboard',
      error: error.message,
    });
  }
};

export const getAdminUsers = async (req, res) => {
  try {
    const { query = '', role = 'all', status = 'all', page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      ...(query
        ? {
            $or: [
              { name: new RegExp(query, 'i') },
              { username: new RegExp(query, 'i') },
              { email: new RegExp(query, 'i') },
            ],
          }
        : {}),
      ...(role !== 'all' ? { role } : {}),
      ...(status === 'active' ? { isActive: true } : {}),
      ...(status === 'disabled' ? { isActive: false } : {}),
    };

    const [users, total, activeBans] = await Promise.all([
      User.find(filter)
        .select('name username email mobileNumber profileAvatar role isActive createdAt lastLoginAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
      Ban.find({ isActive: true }).select('userId reason expiresAt createdAt').lean(),
    ]);

    const banMap = new Map(activeBans.map((ban) => [ban.userId.toString(), ban]));

    res.json({
      success: true,
      data: {
        users: users.map((u) => {
          const ban = banMap.get(u._id.toString());
          return {
            id: u._id.toString(),
            name: u.name,
            username: u.username,
            email: u.email,
            mobile_number: u.mobileNumber,
            avatar: u.profileAvatar,
            role: u.role || 'user',
            is_active: !!u.isActive,
            created_at: u.createdAt,
            last_login_at: u.lastLoginAt,
            is_banned: !!ban,
            ban_reason: ban?.reason || null,
            ban_expires_at: ban?.expiresAt || null,
          };
        }),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const target = await User.findById(userId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (target._id.toString() === req.user.id.toString() && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove your own admin role',
      });
    }

    if (target.role === 'admin' && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'At least one active admin is required',
        });
      }
    }

    target.role = role;
    await target.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        id: target._id.toString(),
        role: target.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message,
    });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const target = await User.findById(userId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (target._id.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot disable your own account',
      });
    }

    if (target.role === 'admin' && target.isActive) {
      const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot disable the last active admin',
        });
      }
    }

    target.isActive = !target.isActive;
    await target.save();

    res.json({
      success: true,
      message: `User ${target.isActive ? 'enabled' : 'disabled'} successfully`,
      data: {
        id: target._id.toString(),
        is_active: target.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message,
    });
  }
};

export const getAdminPosts = async (req, res) => {
  try {
    const { query = '', status = 'all', page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const postFilter = {
      ...(status === 'active' ? { isActive: true } : {}),
      ...(status === 'inactive' ? { isActive: false } : {}),
      ...(query ? { content: new RegExp(query, 'i') } : {}),
    };

    const [posts, total] = await Promise.all([
      Post.find(postFilter)
        .populate('userId', 'name username')
        .populate('departmentId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Post.countDocuments(postFilter),
    ]);

    res.json({
      success: true,
      data: {
        posts: posts.map((post) => ({
          id: post._id.toString(),
          content: post.content,
          media_type: post.mediaType,
          media_url: post.mediaUrl,
          author_name: post.userId?.name,
          author_username: post.userId?.username,
          department_name: post.departmentId?.name,
          likes_count: post.likes?.length || 0,
          comments_count: 0,
          shares_count: post.shares?.length || 0,
          is_active: !!post.isActive,
          created_at: post.createdAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: error.message,
    });
  }
};

export const togglePostStatus = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    post.isActive = !post.isActive;
    await post.save();

    await ModerationLog.create({
      moderatorId: req.user.id,
      action: post.isActive ? 'restore_post' : 'remove_content',
      targetType: 'post',
      targetId: post._id,
      reason: post.isActive ? 'Post restored by admin' : 'Post removed by admin',
    });

    res.json({
      success: true,
      message: `Post ${post.isActive ? 'restored' : 'removed'} successfully`,
      data: {
        id: post._id.toString(),
        is_active: post.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update post status',
      error: error.message,
    });
  }
};

export const getAdminDepartments = async (req, res) => {
  try {
    const { query = '', status = 'all', page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      ...(query ? { name: new RegExp(query, 'i') } : {}),
      ...(status === 'active' ? { isActive: true } : {}),
      ...(status === 'inactive' ? { isActive: false } : {}),
    };

    const [departments, total] = await Promise.all([
      Department.find(filter)
        .populate('createdBy', 'name username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Department.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        departments: departments.map((d) => ({
          id: d._id.toString(),
          name: d.name,
          type: d.type,
          description: d.description,
          avatar: d.avatar,
          location: d.location,
          created_by_name: d.createdBy?.name,
          created_by_username: d.createdBy?.username,
          member_count: d.members?.length || 0,
          is_active: !!d.isActive,
          created_at: d.createdAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: error.message,
    });
  }
};

export const toggleDepartmentStatus = async (req, res) => {
  try {
    const { departmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid department ID' });
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    department.isActive = !department.isActive;
    await department.save();

    res.json({
      success: true,
      message: `Department ${department.isActive ? 'enabled' : 'disabled'} successfully`,
      data: {
        id: department._id.toString(),
        is_active: department.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update department status',
      error: error.message,
    });
  }
};

export const impersonateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!targetUser.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot impersonate disabled user' });
    }

    // Generate token for the target user with impersonation info
    const token = generateToken(targetUser, req.user.id);

    res.json({
      success: true,
      message: 'Impersonation token generated successfully',
      data: {
        user: {
          id: targetUser._id,
          name: targetUser.name,
          username: targetUser.username,
          email: targetUser.email,
          mobile: targetUser.mobileNumber,
          avatar: targetUser.profileAvatar,
          role: targetUser.role || 'user'
        },
        token,
        impersonatedBy: req.user.id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to impersonate user',
      error: error.message,
    });
  }
};
