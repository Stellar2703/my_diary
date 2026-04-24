import mongoose from 'mongoose';
import { User, Post, Comment, Department } from '../models/index.js';

// Get user analytics
export const getUserAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query;

    // Calculate date threshold
    let dateThreshold = new Date();
    if (period === '7d') {
      dateThreshold.setDate(dateThreshold.getDate() - 7);
    } else if (period === '30d') {
      dateThreshold.setDate(dateThreshold.getDate() - 30);
    } else if (period === '90d') {
      dateThreshold.setDate(dateThreshold.getDate() - 90);
    }

    // Get user with followers/following
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Total stats
    const totalPosts = await Post.countDocuments({ userId, isActive: true });
    const followerCount = user.followers ? user.followers.length : 0;
    const followingCount = user.following ? user.following.length : 0;

    // Get all user's posts for reaction count
    const userPosts = await Post.find({ userId }, '_id reactions');
    const totalReactions = userPosts.reduce((sum, post) => sum + (post.reactions?.length || 0), 0);

    // Get comments on user's posts
    const totalComments = await Comment.countDocuments({
      postId: { $in: userPosts.map(p => p._id) }
    });

    const stats = {
      total_posts: totalPosts,
      follower_count: followerCount,
      following_count: followingCount,
      total_reactions: totalReactions,
      total_comments: totalComments
    };

    // Follower growth over time (followers added since dateThreshold)
    const followerGrowth = user.followers
      .filter(f => new Date(f.followedAt) >= dateThreshold)
      .reduce((acc, f) => {
        const date = new Date(f.followedAt).toISOString().split('T')[0];
        if (!acc[date]) acc[date] = { date, count: 0 };
        acc[date].count++;
        return acc;
      }, {});

    const followerGrowthArray = Object.values(followerGrowth).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // Post engagement over time
    const posts = await Post.find(
      { userId, createdAt: { $gte: dateThreshold } },
      'createdAt reactions'
    );

    const postEngagement = await Promise.all(
      posts.map(async post => {
        const commentCount = await Comment.countDocuments({ postId: post._id });
        return {
          date: new Date(post.createdAt).toISOString().split('T')[0],
          reactions: post.reactions?.length || 0,
          comments: commentCount
        };
      })
    );

    // Group by date
    const engagementByDate = postEngagement.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = { date: item.date, reactions: 0, comments: 0 };
      }
      acc[item.date].reactions += item.reactions;
      acc[item.date].comments += item.comments;
      return acc;
    }, {});

    const postEngagementArray = Object.values(engagementByDate).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // Top posts by engagement
    const topPostsData = await Post.find(
      { userId, isActive: true, createdAt: { $gte: dateThreshold } }
    ).lean();

    const topPostsWithEngagement = await Promise.all(
      topPostsData.map(async post => {
        const commentCount = await Comment.countDocuments({ postId: post._id });
        const reactionCount = post.reactions?.length || 0;
        return {
          ...post,
          reaction_count: reactionCount,
          comment_count: commentCount,
          total_engagement: reactionCount + commentCount
        };
      })
    );

    const topPosts = topPostsWithEngagement
      .sort((a, b) => b.total_engagement - a.total_engagement)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        stats,
        followerGrowth: followerGrowthArray,
        postEngagement: postEngagementArray,
        topPosts,
      },
    });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get analytics' });
  }
};

// Get post analytics
export const getPostAnalytics = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    // Verify post ownership
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId.toString() !== userId) {
      return res.status(403).json({ error: 'You can only view analytics for your own posts' });
    }

    // Reaction breakdown
    const reactionCounts = post.reactions.reduce((acc, reaction) => {
      const type = reaction.reactionType;
      if (!acc[type]) {
        acc[type] = { reaction_type: type, count: 0 };
      }
      acc[type].count++;
      return acc;
    }, {});

    const reactions = Object.values(reactionCounts);

    // Comments count
    const commentCount = await Comment.countDocuments({ postId });

    // Shares count
    const shareCount = post.shares?.length || 0;

    // Likes count (for backward compatibility)
    const likeCount = post.likes?.length || 0;

    res.json({
      success: true,
      data: {
        post_id: postId,
        views: 0, // We can implement view tracking later
        clicks: 0, // We can implement click tracking later
        reactions,
        comment_count: commentCount,
        share_count: shareCount,
        like_count: likeCount,
        total_engagement: reactions.reduce((sum, r) => sum + r.count, 0) + commentCount + shareCount
      },
    });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get post analytics' });
  }
};

// Get department analytics (admin/moderator only)
export const getDepartmentAnalytics = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { period = '30d' } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ error: 'Invalid department ID' });
    }

    // Calculate date threshold
    let dateThreshold = new Date();
    if (period === '7d') {
      dateThreshold.setDate(dateThreshold.getDate() - 7);
    } else if (period === '30d') {
      dateThreshold.setDate(dateThreshold.getDate() - 30);
    } else if (period === '90d') {
      dateThreshold.setDate(dateThreshold.getDate() - 90);
    }

    // Get department
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Total stats
    const memberCount = department.members?.length || 0;
    const totalPosts = await Post.countDocuments({ departmentId, isActive: true });
    
    // Get all department posts for reaction count
    const deptPosts = await Post.find({ departmentId }, '_id reactions');
    const totalReactions = deptPosts.reduce((sum, post) => sum + (post.reactions?.length || 0), 0);

    // Get comments on department posts
    const totalComments = await Comment.countDocuments({
      postId: { $in: deptPosts.map(p => p._id) }
    });

    const stats = {
      member_count: memberCount,
      total_posts: totalPosts,
      total_reactions: totalReactions,
      total_comments: totalComments
    };

    // Member growth over time
    const memberGrowth = department.members
      .filter(m => new Date(m.joinedAt) >= dateThreshold)
      .reduce((acc, m) => {
        const date = new Date(m.joinedAt).toISOString().split('T')[0];
        if (!acc[date]) acc[date] = { date, count: 0 };
        acc[date].count++;
        return acc;
      }, {});

    const memberGrowthArray = Object.values(memberGrowth).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // Post activity over time
    const posts = await Post.find(
      { departmentId, isActive: true, createdAt: { $gte: dateThreshold } },
      'createdAt'
    );

    const postActivity = posts.reduce((acc, post) => {
      const date = new Date(post.createdAt).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = { date, count: 0 };
      acc[date].count++;
      return acc;
    }, {});

    const postActivityArray = Object.values(postActivity).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // Top contributors
    const postsWithUsers = await Post.find(
      { departmentId, isActive: true, createdAt: { $gte: dateThreshold } }
    ).populate('userId', 'id username name avatar').lean();

    const contributorStats = postsWithUsers.reduce((acc, post) => {
      const userId = post.userId._id.toString();
      if (!acc[userId]) {
        acc[userId] = {
          id: post.userId._id,
          username: post.userId.username,
          name: post.userId.name,
          avatar: post.userId.avatar,
          post_count: 0,
          reactions_received: 0
        };
      }
      acc[userId].post_count++;
      acc[userId].reactions_received += post.reactions?.length || 0;
      return acc;
    }, {});

    const topContributors = Object.values(contributorStats)
      .sort((a, b) => b.post_count - a.post_count || b.reactions_received - a.reactions_received)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        stats,
        memberGrowth: memberGrowthArray,
        postActivity: postActivityArray,
        topContributors,
      },
    });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get department analytics' });
  }
};

// Track analytics event
export const trackEvent = async (req, res) => {
  try {
    const { eventType, targetType, targetId } = req.body;
    const userId = req.user?.id;

    // Validate ObjectId if provided
    if (targetId && !mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ error: 'Invalid target ID' });
    }

    // Note: For now, we're not persisting view/click analytics
    // In a production system, you might want to create a separate Analytics collection
    // or add view/click counters to the Post model
    
    // Future implementation could include:
    // - Creating an Analytics model with events log
    // - Adding view/click counters to Post schema
    // - Using a time-series collection for analytics events

    res.json({ success: true, message: 'Event tracked' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to track event' });
  }
};
