import mongoose from 'mongoose';
import { Comment, Post, Notification } from '../models/index.js';

// Create a reply to a comment (nested comment)
export const createCommentReply = async (req, res) => {
  try {
    const { postId, parentCommentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(parentCommentId)) {
      return res.status(400).json({ error: 'Invalid post or comment ID' });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Verify parent comment exists and get its depth
    const parentComment = await Comment.findById(parentCommentId);
    if (!parentComment) {
      return res.status(404).json({ error: 'Parent comment not found' });
    }

    const newDepth = (parentComment.depth || 0) + 1;

    // Limit nesting depth to 5 levels
    if (newDepth > 5) {
      return res.status(400).json({ error: 'Maximum nesting depth reached' });
    }

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Create the reply
    const newComment = await Comment.create({
      postId,
      userId,
      content,
      parentId: parentCommentId,
      depth: newDepth
    });

    // Create notification for parent comment author (if not self-reply)
    if (parentComment.userId.toString() !== userId) {
      await Notification.create({
        userId: parentComment.userId,
        type: 'comment',
        notificationType: 'comment',
        content: 'replied to your comment',
        postId,
        commentId: newComment._id,
        fromUserId: userId,
        data: {
          action: 'reply'
        }
      });
    }

    // Fetch the created reply with user info
    const reply = await Comment.findById(newComment._id)
      .populate('userId', 'username name avatar')
      .lean();

    const enrichedReply = {
      ...reply,
      id: reply._id.toString(),
      author_name: reply.userId?.name,
      author_username: reply.userId?.username,
      author_avatar: reply.userId?.avatar,
      created_at: reply.createdAt,
      updated_at: reply.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Reply created successfully',
      data: enrichedReply
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to create reply',
      error: error.message
    });
  }
};

// Get replies for a comment
export const getCommentReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }

    const replies = await Comment.find({ parentId: commentId, isActive: true })
      .populate('userId', 'username name avatar')
      .sort({ createdAt: 1 })
      .lean();

    // Add computed fields
    const repliesWithStats = replies.map(reply => {
      const reactionsCount = reply.reactions?.length || 0;
      const hasReacted = userId ? reply.reactions?.some(r => r.userId.toString() === userId) : false;
      const userReaction = userId ? reply.reactions?.find(r => r.userId.toString() === userId)?.reactionType : null;
      
      return {
        ...reply,
        id: reply._id.toString(),
        author_name: reply.userId?.name,
        author_username: reply.userId?.username,
        author_avatar: reply.userId?.avatar,
        created_at: reply.createdAt,
        updated_at: reply.updatedAt,
        reactions_count: reactionsCount,
        has_reacted: hasReacted,
        user_reaction: userReaction,
        replies_count: 0 // We'll need to query this separately if needed
      };
    });

    // Get replies count for each comment
    for (let reply of repliesWithStats) {
      reply.replies_count = await Comment.countDocuments({ parentId: reply._id, isActive: true });
    }

    res.json({
      success: true,
      data: repliesWithStats
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to get replies',
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

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Verify ownership
    const comment = await Comment.findOne({ _id: id, userId });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found or unauthorized' });
    }

    // Add to edit history
    comment.editHistory.push({
      content: comment.content,
      editedAt: new Date()
    });

    // Update comment
    comment.content = content;
    await comment.save();

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

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }

    // Verify ownership
    const comment = await Comment.findOne({ _id: id, userId });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found or unauthorized' });
    }

    // Delete comment and all its nested replies
    await deleteCommentAndReplies(id);

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

// Helper function to recursively delete comments
async function deleteCommentAndReplies(commentId) {
  // Find all replies
  const replies = await Comment.find({ parentId: commentId });
  
  // Recursively delete all replies
  for (const reply of replies) {
    await deleteCommentAndReplies(reply._id);
  }
  
  // Delete the comment itself
  await Comment.findByIdAndDelete(commentId);
}

// Get comment thread (comment with all nested replies)
export const getCommentThread = async (req, res) => {
  try {
    const { commentId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }

    // Get the root comment
    const rootComment = await Comment.findById(commentId)
      .populate('userId', 'username name avatar')
      .lean();

    if (!rootComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Build the thread recursively
    const thread = await buildThread(rootComment, 0);

    res.json({
      success: true,
      data: thread
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to get comment thread',
      error: error.message
    });
  }
};

// Helper function to build comment thread
async function buildThread(comment, level) {
  const thread = [{
    ...comment,
    level,
    path: comment._id.toString()
  }];

  if (level < 5) {
    // Get all direct replies
    const replies = await Comment.find({ parentId: comment._id, isActive: true })
      .populate('userId', 'username name avatar')
      .sort({ createdAt: 1 })
      .lean();

    // Recursively get nested replies
    for (const reply of replies) {
      const nestedThread = await buildThread(reply, level + 1);
      thread.push(...nestedThread.map(item => ({
        ...item,
        path: `${comment._id}-${item.path}`
      })));
    }
  }

  return thread;
}
