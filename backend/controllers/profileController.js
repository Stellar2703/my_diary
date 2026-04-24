import { User, Post, Department, Comment } from '../models/index.js';
import mongoose from 'mongoose';

// Get user profile by username
export const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;

    // Get user info
    const user = await User.findOne({ username })
      .select('name username email mobile bio location profileAvatar createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user statistics
    const [postsCount, likesReceived, departmentsCount, commentsCount] = await Promise.all([
      Post.countDocuments({ userId: user._id, isActive: true }),
      Post.aggregate([
        { $match: { userId: user._id, isActive: true } },
        { $project: { likesCount: { $size: '$likes' } } },
        { $group: { _id: null, total: { $sum: '$likesCount' } } }
      ]),
      Department.countDocuments({ 
        'members.userId': user._id, 
        isActive: true 
      }),
      Comment.countDocuments({ userId: user._id, isActive: true })
    ]);

    // Get user's departments
    const departments = await Department.find({
      'members.userId': user._id,
      isActive: true
    })
      .select('name type avatar members')
      .sort({ 'members.joinedAt': -1 })
      .limit(5)
      .lean();

    const enrichedDepartments = departments.map(d => {
      const member = d.members.find(m => m.userId.equals(user._id));
      return {
        id: d._id,
        name: d.name,
        type: d.type,
        avatar: d.avatar,
        role: member?.role
      };
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          mobile: user.mobile,
          bio: user.bio,
          location: user.location,
          profile_avatar: user.profileAvatar,
          created_at: user.createdAt,
          posts_count: postsCount,
          likes_received: likesReceived[0]?.total || 0,
          departments_count: departmentsCount,
          comments_count: commentsCount
        },
        departments: enrichedDepartments
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
};

// Get user's posts
export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get user ID
    const user = await User.findOne({ username }).select('_id').lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userId = user._id;
    const currentUserId = req.user?.id || req.user?.userId;

    // Build query - only show posts user can access
    const query = { userId, isActive: true };

    if (currentUserId) {
      // Show public posts OR department posts user is member of
      const userDepartments = await Department.find({
        'members.userId': currentUserId
      }).select('_id').lean();

      const departmentIds = userDepartments.map(d => d._id);
      query.$or = [
        { departmentId: null },
        { departmentId: { $in: departmentIds } }
      ];
    } else {
      // Only public posts
      query.departmentId = null;
    }

    // Get posts with author and department info
    const posts = await Post.find(query)
      .populate('userId', 'name username profileAvatar')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await Post.countDocuments(query);

    // Enrich posts
    const enriched = posts.map(p => ({
      ...p,
      id: p._id.toString(),
      author_name: p.userId.name,
      author_username: p.userId.username,
      author_avatar: p.userId.profileAvatar,
      department_name: p.departmentId?.name,
      post_date: p.createdAt,
      media_url: p.mediaUrl,
      media_type: p.mediaType,
      likes_count: p.likes.length,
      comments_count: 0, // Will be calculated if needed
      shares_count: p.shares.length,
      isLikedByUser: currentUserId ? p.likes.some(l => l.userId.equals(currentUserId)) : false,
      isSharedByUser: currentUserId ? p.shares.some(s => s.userId.equals(currentUserId)) : false
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user posts',
      error: error.message
    });
  }
};

// Get user's activity (likes, comments, shares)
export const getUserActivity = async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Get user ID
    const user = await User.findOne({ username }).select('_id').lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userId = user._id;

    // Get likes from embedded arrays
    const likedPosts = await Post.find({
      'likes.userId': userId,
      isActive: true
    })
      .populate('userId', 'name username')
      .select('content userId likes createdAt')
      .sort({ 'likes.createdAt': -1 })
      .lean();

    const likes = likedPosts.map(p => {
      const like = p.likes.find(l => l.userId.equals(userId));
      return {
        type: 'like',
        created_at: like.createdAt,
        post_id: p._id,
        post_content: p.content,
        post_author: p.userId.name,
        post_author_username: p.userId.username
      };
    });

    // Get comments
    const comments = await Comment.find({
      userId,
      isActive: true
    })
      .populate('postId', 'content userId')
      .populate('postId.userId', 'name username')
      .sort({ createdAt: -1 })
      .lean();

    const commentActivities = await Promise.all(comments.map(async (c) => {
      const post = await Post.findById(c.postId)
        .populate('userId', 'name username')
        .select('content userId')
        .lean();
      
      if (!post) return null;
      
      return {
        type: 'comment',
        created_at: c.createdAt,
        post_id: post._id,
        post_content: post.content,
        post_author: post.userId.name,
        post_author_username: post.userId.username
      };
    }));

    // Get shares from embedded arrays
    const sharedPosts = await Post.find({
      'shares.userId': userId,
      isActive: true
    })
      .populate('userId', 'name username')
      .select('content userId shares createdAt')
      .sort({ 'shares.createdAt': -1 })
      .lean();

    const shares = sharedPosts.map(p => {
      const share = p.shares.find(s => s.userId.equals(userId));
      return {
        type: 'share',
        created_at: share.createdAt,
        post_id: p._id,
        post_content: p.content,
        post_author: p.userId.name,
        post_author_username: p.userId.username
      };
    });

    // Combine and sort all activities
    const allActivities = [
      ...likes,
      ...commentActivities.filter(a => a !== null),
      ...shares
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Paginate
    const paginated = allActivities.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity',
      error: error.message
    });
  }
};
