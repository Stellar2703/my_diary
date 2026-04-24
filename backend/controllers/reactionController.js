import mongoose from 'mongoose';
import { Post, Comment, Notification } from '../models/index.js';

// Toggle reaction on a post
export const togglePostReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reactionType = 'like' } = req.body;
    const userId = req.user.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    // Validate reaction type
    const validReactions = ['like', 'love', 'wow', 'sad', 'angry', 'celebrate'];
    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    // Check if post exists
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Prevent self-reactions
    if (post.userId.toString() === userId) {
      return res.status(400).json({ error: 'Cannot react to your own post' });
    }

    // Check if user already reacted
    const existingReactionIndex = post.reactions.findIndex(
      r => r.userId.toString() === userId
    );

    if (existingReactionIndex !== -1) {
      const existingReaction = post.reactions[existingReactionIndex];
      
      if (existingReaction.reactionType === reactionType) {
        // Remove reaction if same type
        await Post.findByIdAndUpdate(id, {
          $pull: { reactions: { userId } }
        });

        return res.json({
          success: true,
          message: 'Reaction removed',
          data: { reacted: false, reactionType: null }
        });
      } else {
        // Update to new reaction type
        await Post.findByIdAndUpdate(id, {
          $pull: { reactions: { userId } }
        });
        await Post.findByIdAndUpdate(id, {
          $push: { reactions: { userId, reactionType, createdAt: new Date() } }
        });

        // Create notification for new reaction
        await Notification.create({
          userId: post.userId,
          type: 'reaction',
          notificationType: 'like',
          content: 'reacted to your post',
          postId: id,
          fromUserId: userId,
          data: {
            action: 'reaction',
            reactionType
          }
        });

        return res.json({
          success: true,
          message: 'Reaction updated',
          data: { reacted: true, reactionType }
        });
      }
    } else {
      // Add new reaction
      await Post.findByIdAndUpdate(id, {
        $push: { reactions: { userId, reactionType, createdAt: new Date() } }
      });

      // Create notification
      await Notification.create({
        userId: post.userId,
        type: 'reaction',
        notificationType: 'like',
        content: 'reacted to your post',
        postId: id,
        fromUserId: userId,
        data: {
          action: 'reaction',
          reactionType
        }
      });

      return res.json({
        success: true,
        message: 'Reaction added',
        data: { reacted: true, reactionType }
      });
    }
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to toggle reaction',
      error: error.message
    });
  }
};

// Get reactions for a post
export const getPostReactions = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const post = await Post.findById(id).populate('reactions.userId', 'id username name avatar');
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Get reaction counts by type
    const reactionCounts = post.reactions.reduce((acc, reaction) => {
      const type = reaction.reactionType;
      if (!acc[type]) {
        acc[type] = { reaction_type: type, count: 0 };
      }
      acc[type].count++;
      return acc;
    }, {});

    const reactions = Object.values(reactionCounts);

    // Format recent reactions (limit to 20 most recent)
    const recentReactions = post.reactions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20)
      .map(r => ({
        reaction_type: r.reactionType,
        id: r.userId._id,
        username: r.userId.username,
        name: r.userId.name,
        avatar: r.userId.avatar,
        created_at: r.createdAt
      }));

    const totalCount = post.reactions.length;

    res.json({
      success: true,
      data: {
        reactions,
        recentReactions,
        totalCount
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to get reactions',
      error: error.message
    });
  }
};

// Toggle reaction on a comment
export const toggleCommentReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reactionType = 'like' } = req.body;
    const userId = req.user.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }

    // Validate reaction type
    const validReactions = ['like', 'love', 'wow', 'sad', 'angry'];
    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    // Check if comment exists
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Prevent self-reactions
    if (comment.userId.toString() === userId) {
      return res.status(400).json({ error: 'Cannot react to your own comment' });
    }

    // Check if user already reacted
    const existingReactionIndex = comment.reactions.findIndex(
      r => r.userId.toString() === userId
    );

    if (existingReactionIndex !== -1) {
      const existingReaction = comment.reactions[existingReactionIndex];
      
      if (existingReaction.reactionType === reactionType) {
        // Remove reaction
        await Comment.findByIdAndUpdate(id, {
          $pull: { reactions: { userId } }
        });

        return res.json({
          success: true,
          message: 'Reaction removed',
          data: { reacted: false, reactionType: null }
        });
      } else {
        // Update reaction
        await Comment.findByIdAndUpdate(id, {
          $pull: { reactions: { userId } }
        });
        await Comment.findByIdAndUpdate(id, {
          $push: { reactions: { userId, reactionType, createdAt: new Date() } }
        });

        return res.json({
          success: true,
          message: 'Reaction updated',
          data: { reacted: true, reactionType }
        });
      }
    } else {
      // Add new reaction
      await Comment.findByIdAndUpdate(id, {
        $push: { reactions: { userId, reactionType, createdAt: new Date() } }
      });

      return res.json({
        success: true,
        message: 'Reaction added',
        data: { reacted: true, reactionType }
      });
    }
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to toggle reaction',
      error: error.message
    });
  }
};

// Get reactions for a comment
export const getCommentReactions = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Get reaction counts by type
    const reactionCounts = comment.reactions.reduce((acc, reaction) => {
      const type = reaction.reactionType;
      if (!acc[type]) {
        acc[type] = { reaction_type: type, count: 0 };
      }
      acc[type].count++;
      return acc;
    }, {});

    const reactions = Object.values(reactionCounts);
    const totalCount = comment.reactions.length;

    res.json({
      success: true,
      data: {
        reactions,
        totalCount
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to get reactions',
      error: error.message
    });
  }
};
