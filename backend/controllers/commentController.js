import { Comment, Post, User } from '../models/index.js';
import mongoose from 'mongoose';

// Add comment to post
export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, isBold = false, isItalic = false } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    // Check if post exists
    const post = await Post.findOne({ _id: postId, isActive: true });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Insert comment
    const comment = await Comment.create({
      postId,
      userId,
      content,
      isBold,
      isItalic,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        commentId: comment._id
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
};

// Get comments for a post
export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    const comments = await Comment.find({ postId, isActive: true })
      .populate('userId', 'name username profileAvatar')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Comment.countDocuments({ postId, isActive: true });

    const enrichedComments = comments.map(c => ({
      ...c,
      id: c._id.toString(),
      author_name: c.userId?.name,
      author_username: c.userId?.username,
      author_avatar: c.userId?.profileAvatar,
      created_at: c.createdAt,
      updated_at: c.updatedAt
    }));

    res.json({
      success: true,
      data: {
        comments: enrichedComments,
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
      message: 'Failed to fetch comments',
      error: error.message
    });
  }
};

// Update comment
export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid comment ID'
      });
    }

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    // Update comment
    await Comment.findByIdAndUpdate(id, { content });

    res.json({
      success: true,
      message: 'Comment updated successfully'
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to update comment',
      error: error.message
    });
  }
};

// Delete comment
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid comment ID'
      });
    }

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    // Soft delete
    await Comment.findByIdAndUpdate(id, { isActive: false });

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message
    });
  }
};
