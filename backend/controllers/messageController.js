import { Conversation, Message, User } from '../models/index.js';
import mongoose from 'mongoose';

// Create or get a conversation between two users
export const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ error: 'Invalid recipient ID' });
    }

    if (recipientId === userId) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Check if blocked
    const currentUser = await User.findById(userId).select('blockedUsers').lean();
    const isBlocked = currentUser.blockedUsers.includes(recipientId) || 
                     recipient.blockedUsers.includes(userId);

    if (isBlocked) {
      return res.status(403).json({ error: 'Cannot message this user' });
    }

    // Check if conversation already exists (1-on-1)
    const existingConv = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [userId, recipientId], $size: 2 }
    });

    if (existingConv) {
      return res.json({ success: true, data: existingConv });
    }

    // Create new conversation
    const conversation = await Conversation.create({
      isGroup: false,
      participants: [userId, recipientId],
      createdBy: userId,
      isActive: true
    });

    res.json({ success: true, data: conversation });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to create conversation' });
  }
};

// Get all conversations for a user
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'username name profileAvatar')
      .sort({ updatedAt: -1 })
      .lean();

    // Enrich with last message and unread count
    const enriched = await Promise.all(conversations.map(async (conv) => {
      // Get last message
      const lastMessage = await Message.findOne({ conversationId: conv._id })
        .sort({ createdAt: -1 })
        .select('content createdAt senderId isRead')
        .lean();

      // Get unread count
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        senderId: { $ne: userId },
        isRead: false
      });

      // Get other user info for 1-on-1 chats
      const otherUser = conv.isGroup ? null : conv.participants.find(p => !p._id.equals(userId));

      return {
        ...conv,
        id: conv._id,
        other_user: otherUser ? {
          id: otherUser._id,
          username: otherUser.username,
          name: otherUser.name,
          avatar: otherUser.profileAvatar
        } : null,
        last_message: lastMessage ? {
          content: lastMessage.content,
          created_at: lastMessage.createdAt,
          sender_id: lastMessage.senderId,
          is_read: lastMessage.isRead
        } : null,
        unread_count: unreadCount
      };
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get conversations' });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { conversationId } = req.params;
    const { content, messageType = 'text' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    if (!content && messageType === 'text') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(p => p.equals(userId));
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    const mediaUrl = req.file ? `/uploads/media/${req.file.filename}` : null;

    // Create message
    const message = await Message.create({
      conversationId,
      senderId: userId,
      content,
      messageType,
      mediaUrl,
      isRead: false,
      isActive: true
    });

    // Update conversation timestamp and last message
    await Conversation.findByIdAndUpdate(conversationId, {
      updatedAt: new Date(),
      lastMessage: {
        content,
        senderId: userId,
        createdAt: message.createdAt
      }
    });

    // Populate sender info
    await message.populate('senderId', 'username name profileAvatar');

    const enriched = {
      ...message.toObject(),
      id: message._id,
      username: message.senderId.username,
      name: message.senderId.name,
      avatar: message.senderId.profileAvatar
    };

    res.json({ success: true, data: enriched });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get messages in a conversation
export const getMessages = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    // Verify user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(p => p.equals(userId));
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    const messages = await Message.find({ conversationId })
      .populate('senderId', 'username name profileAvatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Enrich and reverse (oldest first)
    const enriched = messages.map(m => ({
      ...m,
      id: m._id,
      username: m.senderId.username,
      name: m.senderId.name,
      avatar: m.senderId.profileAvatar
    })).reverse();

    res.json({ success: true, data: enriched });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    // Verify user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(p => p.equals(userId));
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    // Mark all messages from other users as read
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: userId },
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

// Create group conversation
export const createGroupConversation = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { name, participantIds } = req.body;

    if (!name || !participantIds || participantIds.length === 0) {
      return res.status(400).json({ error: 'Group name and participants are required' });
    }

    // Validate all participant IDs
    const invalidIds = participantIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: 'Invalid participant IDs' });
    }

    // Create conversation with creator + participants
    const allParticipants = [userId, ...participantIds.filter(id => id !== userId)];

    const conversation = await Conversation.create({
      isGroup: true,
      groupName: name,
      participants: allParticipants,
      createdBy: userId,
      isActive: true
    });

    res.json({ success: true, data: conversation });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to create group conversation' });
  }
};

// Delete conversation
export const deleteConversation = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    // Verify user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(p => p.equals(userId));
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    if (conversation.isGroup && !conversation.createdBy.equals(userId)) {
      // Just remove participant from group
      await Conversation.findByIdAndUpdate(conversationId, {
        $pull: { participants: userId }
      });
    } else {
      // Delete entire conversation and messages
      await Conversation.findByIdAndUpdate(conversationId, { isActive: false });
      await Message.updateMany({ conversationId }, { isActive: false });
    }

    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
};
