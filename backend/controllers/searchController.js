import { Post, User, Department, Comment } from '../models/index.js';
import mongoose from 'mongoose';

// Advanced search (posts, users, departments, hashtags)
export const advancedSearch = async (req, res) => {
  try {
    const {
      query,
      type = 'all', // all, posts, users, departments, hashtags
      sortBy = 'relevance', // relevance, recent, popular
      dateFrom,
      dateTo,
      hasMedia,
      mediaType,
      country,
      state,
      city,
      area,
      department,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const results = {};

    // Search posts
    if (type === 'all' || type === 'posts') {
      const postQuery = { isActive: true };

      // Add search term if provided
      if (query) {
        postQuery.$text = { $search: query };
      }

      // Add location filters
      if (country) postQuery.country = country;
      if (state) postQuery.state = state;
      if (city) postQuery.city = city;
      if (area) postQuery.area = area;

      // Add department filter
      if (department) {
        const dept = await Department.findOne({ name: department });
        if (dept) postQuery.departmentId = dept._id;
      }

      // Add date filters
      if (dateFrom || dateTo) {
        postQuery.postDate = {};
        if (dateFrom) postQuery.postDate.$gte = new Date(dateFrom);
        if (dateTo) postQuery.postDate.$lte = new Date(dateTo);
      }

      // Add media filters
      if (hasMedia === 'true' || hasMedia === true) {
        postQuery.mediaUrl = { $ne: null };
      }
      if (mediaType && mediaType !== 'all') {
        postQuery.mediaType = mediaType;
      }

      // Build sort
      let sort = {};
      if (sortBy === 'recent') {
        sort = { postDate: -1, createdAt: -1 };
      } else if (sortBy === 'popular') {
        // Will sort after fetching based on likes/comments count
        sort = { createdAt: -1 };
      } else {
        sort = { createdAt: -1 };
      }

      let posts = await Post.find(postQuery)
        .populate('userId', 'username name profileAvatar')
        .populate('departmentId', 'name')
        .sort(sort)
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

      posts = posts.map(post => ({
        ...post,
        id: post._id.toString(),
        username: post.userId?.username,
        name: post.userId?.name,
        avatar: post.userId?.profileAvatar,
        department_name: post.departmentId?.name,
        post_date: post.postDate || post.createdAt,
        reaction_count: post.likes?.length || 0,
        comment_count: commentCountMap[post._id.toString()] || 0
      }));

      // Sort by popularity if requested
      if (sortBy === 'popular') {
        posts.sort((a, b) => {
          const scoreA = a.reaction_count * 2 + a.comment_count;
          const scoreB = b.reaction_count * 2 + b.comment_count;
          return scoreB - scoreA;
        });
      }

      results.posts = posts;
    }

    // Search users
    if (type === 'all' || type === 'users') {
      if (query) {
        const searchRegex = new RegExp(query, 'i');
        let users = await User.find({
          $or: [
            { username: searchRegex },
            { name: searchRegex },
            { bio: searchRegex }
          ]
        })
        .select('-passwordHash')
        .skip(skip)
        .limit(limitNum)
        .lean();

        // Add counts
        users = await Promise.all(users.map(async (user) => {
          const followerCount = user.followers?.length || 0;
          const postCount = await Post.countDocuments({ userId: user._id, isActive: true });
          return {
            ...user,
            id: user._id.toString(),
            avatar: user.profileAvatar,
            follower_count: followerCount,
            post_count: postCount
          };
        }));

        results.users = users;
      } else {
        results.users = [];
      }
    }

    // Search departments
    if (type === 'all' || type === 'departments') {
      if (query) {
        const searchRegex = new RegExp(query, 'i');
        let departments = await Department.find({
          $or: [
            { name: searchRegex },
            { description: searchRegex }
          ]
        })
        .skip(skip)
        .limit(limitNum)
        .lean();

        // Add counts
        departments = await Promise.all(departments.map(async (dept) => {
          const memberCount = dept.members?.length || 0;
          const postCount = await Post.countDocuments({ departmentId: dept._id, isActive: true });
          return {
            ...dept,
            id: dept._id.toString(),
            member_count: memberCount,
            post_count: postCount
          };
        }));

        results.departments = departments;
      } else {
        results.departments = [];
      }
    }

    // Search hashtags
    if (type === 'all' || type === 'hashtags') {
      if (query) {
        const searchRegex = new RegExp(query.replace('#', ''), 'i');
        const hashtagAgg = await Post.aggregate([
          { $match: { hashtags: searchRegex, isActive: true } },
          { $unwind: '$hashtags' },
          { $match: { hashtags: searchRegex } },
          { $group: { _id: '$hashtags', post_count: { $sum: 1 } } },
          { $sort: { post_count: -1 } },
          { $limit: limitNum },
          { $skip: skip },
          { $project: { _id: 0, name: '$_id', post_count: 1 } }
        ]);

        results.hashtags = hashtagAgg;
      } else {
        results.hashtags = [];
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    
    res.status(500).json({ error: 'Search failed' });
  }
};

// Get trending content
export const getTrending = async (req, res) => {
  try {
    const { period = '24h', limit = 20 } = req.query;

    let timeCondition = new Date();
    if (period === '24h') {
      timeCondition.setHours(timeCondition.getHours() - 24);
    } else if (period === '7d') {
      timeCondition.setDate(timeCondition.getDate() - 7);
    } else if (period === '30d') {
      timeCondition.setDate(timeCondition.getDate() - 30);
    }

    // Trending posts with engagement score
    let posts = await Post.find({
      isActive: true,
      createdAt: { $gte: timeCondition }
    })
    .populate('userId', 'username name')
    .limit(parseInt(limit))
    .lean();

    // Get comment counts and calculate engagement
    const postIds = posts.map(p => p._id);
    const commentCounts = await Comment.aggregate([
      { $match: { postId: { $in: postIds }, isActive: true } },
      { $group: { _id: '$postId', count: { $sum: 1 } } }
    ]);

    const commentCountMap = {};
    commentCounts.forEach(cc => {
      commentCountMap[cc._id.toString()] = cc.count;
    });

    posts = posts.map(post => {
      const reactionCount = post.likes?.length || 0;
      const commentCount = commentCountMap[post._id.toString()] || 0;
      return {
        ...post,
        username: post.userId?.username,
        name: post.userId?.name,
        reaction_count: reactionCount,
        comment_count: commentCount,
        engagement_score: reactionCount * 2 + commentCount
      };
    });

    // Sort by engagement score
    posts.sort((a, b) => b.engagement_score - a.engagement_score);

    // Trending hashtags
    const hashtags = await Post.aggregate([
      { $match: { isActive: true, createdAt: { $gte: timeCondition }, hashtags: { $exists: true, $ne: [] } } },
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', post_count: { $sum: 1 } } },
      { $sort: { post_count: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, name: '$_id', post_count: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        posts,
        hashtags,
      },
    });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get trending content' });
  }
};

// Get explore/discover feed
export const getExplore = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { isActive: true };

    // Exclude posts from users you follow
    if (userId) {
      const user = await User.findById(userId).select('following');
      const followingIds = user?.following || [];
      query.userId = { $nin: [...followingIds, userId] };
    }

    let posts = await Post.find(query)
      .populate('userId', 'username name')
      .populate('departmentId', 'name')
      .skip(skip)
      .limit(parseInt(limit))
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

    posts = posts.map(post => ({
      ...post,
      username: post.userId?.username,
      name: post.userId?.name,
      department_name: post.departmentId?.name,
      reaction_count: post.likes?.length || 0,
      comment_count: commentCountMap[post._id.toString()] || 0
    }));

    // Sort by engagement
    posts.sort((a, b) => {
      const scoreA = a.reaction_count + a.comment_count;
      const scoreB = b.reaction_count + b.comment_count;
      return scoreB - scoreA;
    });

    res.json({ success: true, data: posts });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get explore feed' });
  }
};

// Get suggested users to follow
export const getSuggestedUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const currentUser = await User.findById(userId).select('following blockedUsers');
    const followingIds = currentUser?.following || [];
    const blockedIds = currentUser?.blockedUsers || [];

    // Find users not followed and not blocked
    let users = await User.find({
      _id: { 
        $nin: [...followingIds, ...blockedIds, userId]
      }
    })
    .select('-passwordHash')
    .limit(parseInt(limit) * 2) // Get more to calculate mutual connections
    .lean();

    // Calculate mutual connections and add counts
    const usersWithScores = await Promise.all(users.map(async (user) => {
      // Count mutual connections (people you both follow)
      const mutualCount = user.following?.filter(id => 
        followingIds.some(fid => fid.equals(id))
      ).length || 0;

      const followerCount = user.followers?.length || 0;
      const postCount = await Post.countDocuments({ userId: user._id, isActive: true });

      return {
        ...user,
        follower_count: followerCount,
        post_count: postCount,
        mutual_connections: mutualCount
      };
    }));

    // Sort by mutual connections, then by followers
    usersWithScores.sort((a, b) => {
      if (a.mutual_connections !== b.mutual_connections) {
        return b.mutual_connections - a.mutual_connections;
      }
      return b.follower_count - a.follower_count;
    });

    // Limit to requested amount
    const suggestedUsers = usersWithScores.slice(0, parseInt(limit));

    res.json({ success: true, data: suggestedUsers });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
};
