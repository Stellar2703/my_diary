import { Post, User, Department, Comment, Notification } from '../models/index.js';
import mongoose from 'mongoose';

// Helper function to extract hashtags from content
const extractHashtags = (content) => {
  const hashtagRegex = /#[\w]+/g;
  const matches = content.match(hashtagRegex);
  return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
};

// Helper function to extract mentions from content
const extractMentions = (content) => {
  const mentionRegex = /@[\w]+/g;
  const matches = content.match(mentionRegex);
  return matches ? matches.map(mention => mention.slice(1).toLowerCase()) : [];
};

// Create a new post
export const createPost = async (req, res) => {
  try {
    const {
      content,
      mediaType = 'none',
      departmentId,
      isAlert = false,
      country = 'India',
      state = '',
      city = '',
      area,
      street,
      pinCode,
      latitude,
      longitude
    } = req.body;

    const userId = req.user.id;

    // Validate department membership if posting to department
    if (departmentId) {
      const department = await Department.findOne({
        _id: departmentId,
        $or: [
          { 'members.userId': userId },
          { createdBy: userId }
        ]
      });

      if (!department) {
        return res.status(403).json({
          success: false,
          message: 'You must be a member of this department to post'
        });
      }
    }

    // Get media URL if file uploaded
    const mediaUrl = req.file ? `/uploads/media/${req.file.filename}` : null;

    // Extract hashtags and mentions
    const hashtags = extractHashtags(content);
    const mentions = extractMentions(content);

    // Create post
    const post = await Post.create({
      userId,
      departmentId: departmentId || null,
      content,
      mediaType,
      mediaUrl,
      country,
      state,
      city,
      area,
      street,
      latitude: latitude || null,
      longitude: longitude || null,
      postDate: new Date(),
      visibility: departmentId ? 'department' : 'public',
      isActive: true,
      isAlert: isAlert && departmentId ? true : false, // Alert only works for department posts
      hashtags,
      likes: [],
      shares: [],
      savedBy: []
    });

    // Save location to user locations for future use
    if (country && state && city) {
      await User.findByIdAndUpdate(userId, {
        $push: {
          locations: {
            $each: [{
              country,
              state,
              city,
              area,
              street,
              lastUsedAt: new Date()
            }],
            $position: 0,
            $slice: 10 // Keep only last 10 locations
          }
        }
      });
    }

    // Create notifications for mentioned users
    if (mentions.length > 0) {
      const mentionedUsers = await User.find({
        username: { $in: mentions }
      }).select('_id');

      const notifications = mentionedUsers.map(user => ({
        userId: user._id,
        fromUserId: userId,
        type: 'mention',
        message: 'mentioned you in a post',
        content: content.substring(0, 100),
        postId: post._id,
        isRead: false,
        isActive: true
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    // Create notifications for all department members if this is an alert post
    if (isAlert && departmentId) {
      const department = await Department.findById(departmentId)
        .select('members name')
        .lean();

      if (department && department.members) {
        // Get all member IDs except the post creator
        const memberIds = department.members
          .map(member => member.userId)
          .filter(memberId => memberId.toString() !== userId.toString());

        if (memberIds.length > 0) {
          const alertNotifications = memberIds.map(memberId => ({
            userId: memberId,
            fromUserId: userId,
            type: 'department',
            message: `posted an alert in ${department.name}`,
            content: content.substring(0, 100),
            postId: post._id,
            departmentId: departmentId,
            isRead: false,
            isActive: true
          }));

          await Notification.insertMany(alertNotifications);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: {
        postId: post._id
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: error.message
    });
  }
};

// Get posts with filters
export const getPosts = async (req, res) => {
  try {
    const {
      departmentId,
      country,
      state,
      city,
      area,
      username,
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = { isActive: true };

    if (departmentId) {
      query.departmentId = departmentId;
    }
    if (country) {
      query.country = country;
    }
    if (state) {
      query.state = state;
    }
    if (city) {
      query.city = city;
    }
    if (area) {
      query.area = area;
    }

    // Filter by username if provided
    if (username) {
      const user = await User.findOne({ username }).select('_id');
      if (user) {
        query.userId = user._id;
      } else {
        return res.json({
          success: true,
          data: {
            posts: [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: 0,
              totalPages: 0
            }
          }
        });
      }
    }

    // Access control: show public posts OR department posts user is member of
    if (req.user) {
      // Get user's departments
      const userDepartments = await Department.find({
        $or: [
          { 'members.userId': req.user.id },
          { createdBy: req.user.id }
        ]
      }).select('_id');

      const userDeptIds = userDepartments.map(d => d._id);

      // Show posts where department is null OR user is a member
      query.$or = [
        { departmentId: null },
        { departmentId: { $in: userDeptIds } }
      ];
    } else {
      // Non-authenticated users only see public posts
      query.departmentId = null;
    }

    // Get posts with populated data
    const posts = await Post.find(query)
      .populate('userId', 'name username profileAvatar')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count
    const total = await Post.countDocuments(query);

    // Add computed fields and user interaction status
    const enrichedPosts = posts.map(post => {
      const enriched = {
        ...post,
        id: post._id.toString(),
        user_id: post.userId?._id,
        author_name: post.userId?.name,
        author_username: post.userId?.username,
        author_avatar: post.userId?.profileAvatar,
        department_name: post.departmentId?.name,
        post_date: post.createdAt,
        media_url: post.mediaUrl,
        media_type: post.mediaType,
        likes_count: post.likes ? post.likes.length : 0,
        shares_count: post.shares ? post.shares.length : 0,
        isLikedByUser: false,
        isSharedByUser: false
      };

      if (req.user) {
        enriched.isLikedByUser = post.likes?.some(like => 
          like.userId.toString() === req.user.id
        ) || false;
        enriched.isSharedByUser = post.shares?.some(share => 
          share.userId.toString() === req.user.id
        ) || false;
      }

      return enriched;
    });

    // Get comment counts for all posts
    const postIds = posts.map(p => p._id);
    const commentCounts = await Comment.aggregate([
      { $match: { postId: { $in: postIds }, isActive: true } },
      { $group: { _id: '$postId', count: { $sum: 1 } } }
    ]);

    const commentCountMap = {};
    commentCounts.forEach(cc => {
      commentCountMap[cc._id.toString()] = cc.count;
    });

    enrichedPosts.forEach(post => {
      post.comments_count = commentCountMap[post._id.toString()] || 0;
    });

    res.json({
      success: true,
      data: {
        posts: enrichedPosts,
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
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
};

// Get single post by ID
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    const post = await Post.findOne({ _id: id, isActive: true })
      .populate('userId', 'name username profileAvatar')
      .populate('departmentId', 'name')
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Get comment count
    const commentCount = await Comment.countDocuments({ 
      postId: post._id,
      isActive: true 
    });

    // Enrich post data
    const enrichedPost = {
      ...post,
      id: post._id.toString(),
      user_id: post.userId?._id,
      author_name: post.userId?.name,
      author_username: post.userId?.username,
      author_avatar: post.userId?.profileAvatar,
      department_name: post.departmentId?.name,
      post_date: post.createdAt,
      media_url: post.mediaUrl,
      media_type: post.mediaType,
      likes_count: post.likes ? post.likes.length : 0,
      comments_count: commentCount,
      shares_count: post.shares ? post.shares.length : 0,
      isLikedByUser: false,
      isSharedByUser: false
    };

    // Check user interaction status
    if (req.user) {
      enrichedPost.isLikedByUser = post.likes?.some(like => 
        like.userId.toString() === req.user.id
      ) || false;
      enrichedPost.isSharedByUser = post.shares?.some(share => 
        share.userId.toString() === req.user.id
      ) || false;
    }

    res.json({
      success: true,
      data: enrichedPost
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message
    });
  }
};

// Update post
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    // Save old content to edit history
    if (post.editHistory.length < 10) { // Keep last 10 edits
      post.editHistory.push({
        content: post.content,
        editedAt: new Date()
      });
    }

    // Update content and hashtags
    post.content = content;
    post.hashtags = extractHashtags(content);

    await post.save();

    res.json({
      success: true,
      message: 'Post updated successfully'
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to update post',
      error: error.message
    });
  }
};

// Delete post
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    // Soft delete
    post.isActive = false;
    await post.save();


    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: error.message
    });
  }
};

// Like/Unlike post
export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    const post = await Post.findOne({ _id: id, isActive: true });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user already liked
    const likeIndex = post.likes.findIndex(
      like => like.userId.toString() === userId
    );

    if (likeIndex > -1) {
      // Unlike: remove from array
      post.likes.splice(likeIndex, 1);
      await post.save();

      return res.json({
        success: true,
        message: 'Post unliked',
        data: { liked: false }
      });
    } else {
      // Like: add to array
      post.likes.push({
        userId,
        reactedAt: new Date()
      });
      await post.save();

      // Create notification for post author (if not own post)
      if (post.userId.toString() !== userId) {
        await Notification.create({
          userId: post.userId,
          fromUserId: userId,
          type: 'like',
          message: 'liked your post',
          content: 'liked your post',
          postId: post._id,
          isRead: false,
          isActive: true
        });
      }

      return res.json({
        success: true,
        message: 'Post liked',
        data: { liked: true }
      });
    }
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like',
      error: error.message
    });
  }
};

// Share/Unshare post
export const toggleShare = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    const post = await Post.findOne({ _id: id, isActive: true });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user already shared
    const shareIndex = post.shares.findIndex(
      share => share.userId.toString() === userId
    );

    if (shareIndex > -1) {
      // Unshare: remove from array
      post.shares.splice(shareIndex, 1);
      await post.save();

      return res.json({
        success: true,
        message: 'Post unshared',
        data: { shared: false }
      });
    } else {
      // Share: add to array
      post.shares.push({
        userId,
        sharedAt: new Date()
      });
      await post.save();

      // Create notification for post author (if not own post)
      if (post.userId.toString() !== userId) {
        await Notification.create({
          userId: post.userId,
          fromUserId: userId,
          type: 'share',
          message: 'shared your post',
          content: 'shared your post',
          postId: post._id,
          isRead: false,
          isActive: true
        });
      }

      return res.json({
        success: true,
        message: 'Post shared',
        data: { shared: true }
      });
    }
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to toggle share',
      error: error.message
    });
  }
};
