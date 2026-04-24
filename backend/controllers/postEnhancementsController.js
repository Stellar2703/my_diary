import { Post, User, Notification } from '../models/index.js';

// Helper function to extract hashtags from content
function extractHashtags(content) {
  const hashtagRegex = /#(\w+)/g;
  const hashtags = [];
  let match;
  
  while ((match = hashtagRegex.exec(content)) !== null) {
    hashtags.push(match[1].toLowerCase());
  }
  
  return [...new Set(hashtags)]; // Remove duplicates
}

// Helper function to extract mentions from content
function extractMentions(content) {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1].toLowerCase());
  }
  
  return [...new Set(mentions)]; // Remove duplicates
}

// Create notifications for mentions
async function notifyMentions(postId, mentions, mentionedByUserId) {
  if (mentions.length === 0) return;

  for (const username of mentions) {
    // Find user by username
    const user = await User.findOne({ username: username.toLowerCase() }).lean();

    if (user) {
      // Create notification
      await Notification.create({
        userId: user._id,
        postId,
        fromUserId: mentionedByUserId,
        type: 'mention',
        content: 'mentioned you in a post',
        data: { action: 'mention' }
      });
    }
  }
}

// Edit a post
export const editPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Check ownership
    const post = await Post.findOne({ _id: id, userId });

    if (!post) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }

    // Save edit history
    post.editHistory.push({
      content: post.content,
      editedBy: userId,
      editedAt: new Date()
    });

    // Update post content
    post.content = content;

    // Extract and save new hashtags and mentions
    post.hashtags = extractHashtags(content);
    post.mentions = extractMentions(content);

    await post.save();

    // Notify mentioned users
    await notifyMentions(post._id, post.mentions, userId);

    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to edit post' });
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check ownership and delete
    const result = await Post.findOneAndDelete({ _id: id, userId });

    if (!result) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

// Save/bookmark a post
export const toggleSavePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { collectionName = 'Saved' } = req.body;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already saved
    const savedIndex = post.savedBy.findIndex(
      (save) => save.userId.toString() === userId
    );

    if (savedIndex !== -1) {
      // Unsave
      post.savedBy.splice(savedIndex, 1);
      await post.save();

      return res.json({ message: 'Post unsaved', saved: false });
    } else {
      // Save
      post.savedBy.push({
        userId,
        collectionName,
        savedAt: new Date()
      });
      await post.save();

      return res.json({ message: 'Post saved', saved: true });
    }
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to save post' });
  }
};

// Get saved posts
export const getSavedPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collection } = req.query;

    // Build query
    const query = { 'savedBy.userId': userId };
    
    if (collection) {
      query['savedBy.collectionName'] = collection;
    }

    const posts = await Post.find(query)
      .populate('userId', 'username name avatar')
      .sort({ 'savedBy.savedAt': -1 })
      .lean();

    // Add computed fields
    const enrichedPosts = posts.map(post => ({
      ...post,
      likes_count: post.likes?.length || 0,
      reactions_count: post.reactions?.length || 0,
      shares_count: post.shares?.length || 0,
      is_liked: post.likes?.some(like => like.userId.toString() === userId) || false,
      is_saved: true,
      saved_at: post.savedBy.find(s => s.userId.toString() === userId)?.savedAt,
      collection_name: post.savedBy.find(s => s.userId.toString() === userId)?.collectionName
    }));

    res.json({ posts: enrichedPosts });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get saved posts' });
  }
};

// Pin/unpin a post (for profile)
export const togglePinPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check ownership
    const post = await Post.findOne({ _id: id, userId });

    if (!post) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }

    const newPinStatus = !post.isPinned;

    // If pinning, unpin other posts
    if (newPinStatus) {
      await Post.updateMany(
        { userId, isPinned: true },
        { isPinned: false }
      );
    }

    post.isPinned = newPinStatus;
    await post.save();

    res.json({ 
      message: newPinStatus ? 'Post pinned' : 'Post unpinned', 
      pinned: newPinStatus 
    });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to pin post' });
  }
};

// Get posts by hashtag
export const getPostsByHashtag = async (req, res) => {
  try {
    const { tag } = req.params;
    const userId = req.user?.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ hashtags: tag.toLowerCase() })
      .populate('userId', 'username name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Add computed fields
    const enrichedPosts = posts.map(post => ({
      ...post,
      likes_count: post.likes?.length || 0,
      reactions_count: post.reactions?.length || 0,
      shares_count: post.shares?.length || 0,
      is_liked: userId ? post.likes?.some(like => like.userId.toString() === userId) : false,
      is_saved: userId ? post.savedBy?.some(save => save.userId.toString() === userId) : false
    }));

    res.json({ posts: enrichedPosts });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get posts' });
  }
};

// Get trending hashtags
export const getTrendingHashtags = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Use aggregation to count hashtag usage
    const hashtags = await Post.aggregate([
      { $unwind: '$hashtags' },
      {
        $group: {
          _id: '$hashtags',
          usage_count: { $sum: 1 }
        }
      },
      { $sort: { usage_count: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          name: '$_id',
          usage_count: 1
        }
      }
    ]);

    res.json({ hashtags });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get trending hashtags' });
  }
};

// Get post edit history
export const getPostEditHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id)
      .select('editHistory')
      .populate('editHistory.editedBy', 'username name avatar')
      .lean();

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ edits: post.editHistory || [] });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get edit history' });
  }
};

export {
  extractHashtags,
  extractMentions,
  notifyMentions
};
