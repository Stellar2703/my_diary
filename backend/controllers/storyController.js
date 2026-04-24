import { Story, User } from '../models/index.js';
import mongoose from 'mongoose';

// Create story
export const createStory = async (req, res) => {
  try {
    const { content, mediaUrl, mediaType, backgroundColor } = req.body;
    const userId = req.user.id || req.user.userId;

    // Stories require either content or media
    if (!content && !mediaUrl) {
      return res.status(400).json({ error: 'Story must have content or media' });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration

    const story = await Story.create({
      userId,
      content: content || null,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || 'text',
      backgroundColor: backgroundColor || '#000000',
      expiresAt,
      views: [],
      isActive: true
    });

    res.json({
      success: true,
      message: 'Story created successfully',
      data: { storyId: story._id, expiresAt },
    });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to create story' });
  }
};

// Get stories (following users + own stories)
export const getStories = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    // Get current user's following list
    const currentUser = await User.findById(userId).select('following').lean();
    const viewableUserIds = [userId, ...currentUser.following];

    // Get active stories from users you follow + your own
    const stories = await Story.find({
      userId: { $in: viewableUserIds },
      expiresAt: { $gt: new Date() },
      isActive: true
    })
      .populate('userId', 'username name profileAvatar')
      .sort({ createdAt: -1 })
      .lean();

    // Group stories by user
    const groupedStories = {};
    stories.forEach((story) => {
      const uid = story.userId._id.toString();
      if (!groupedStories[uid]) {
        groupedStories[uid] = {
          userId: story.userId._id,
          username: story.userId.username,
          name: story.userId.name,
          avatar: story.userId.profileAvatar,
          stories: [],
        };
      }
      const userViewed = story.views.some(v => v.userId.equals(userId));
      groupedStories[uid].stories.push({
        id: story._id,
        content: story.content,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        backgroundColor: story.backgroundColor,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        viewCount: story.views.length,
        userViewed,
      });
    });

    res.json({
      success: true,
      data: Object.values(groupedStories),
    });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get stories' });
  }
};

// Get user's stories
export const getUserStories = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id || req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const stories = await Story.find({
      userId,
      expiresAt: { $gt: new Date() },
      isActive: true
    })
      .sort({ createdAt: 1 })
      .lean();

    const enriched = stories.map(s => ({
      ...s,
      id: s._id,
      viewCount: s.views.length,
      userViewed: s.views.some(v => v.userId.equals(currentUserId))
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get user stories' });
  }
};

// View story (track view)
export const viewStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.id || req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({ error: 'Invalid story ID' });
    }

    // Check if story exists and is active
    const story = await Story.findOne({
      _id: storyId,
      expiresAt: { $gt: new Date() },
      isActive: true
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found or expired' });
    }

    // Don't track view if it's the owner's story
    if (!story.userId.equals(userId)) {
      // Check if already viewed
      const alreadyViewed = story.views.some(v => v.userId.equals(userId));

      if (!alreadyViewed) {
        // Record view
        await Story.findByIdAndUpdate(storyId, {
          $push: { views: { userId, viewedAt: new Date() } }
        });
      }
    }

    res.json({ success: true, message: 'Story viewed' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to view story' });
  }
};

// Get story viewers
export const getStoryViewers = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.id || req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({ error: 'Invalid story ID' });
    }

    // Verify story belongs to user
    const story = await Story.findById(storyId).select('userId views');

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (!story.userId.equals(userId)) {
      return res.status(403).json({ error: 'You can only view viewers of your own stories' });
    }

    // Get viewer details
    const viewerIds = story.views.map(v => v.userId);
    const viewers = await User.find({ _id: { $in: viewerIds } })
      .select('username name profileAvatar')
      .lean();

    // Enrich with view time
    const enriched = viewers.map(user => {
      const view = story.views.find(v => v.userId.equals(user._id));
      return {
        id: user._id,
        username: user.username,
        name: user.name,
        avatar: user.profileAvatar,
        viewed_at: view.viewedAt
      };
    });

    // Sort by viewed_at DESC
    enriched.sort((a, b) => new Date(b.viewed_at) - new Date(a.viewed_at));

    res.json({ success: true, data: enriched });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get viewers' });
  }
};

// Delete story
export const deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.id || req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({ error: 'Invalid story ID' });
    }

    // Verify story belongs to user
    const story = await Story.findById(storyId).select('userId');

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (!story.userId.equals(userId)) {
      return res.status(403).json({ error: 'You can only delete your own stories' });
    }

    await Story.findByIdAndUpdate(storyId, { isActive: false });

    res.json({ success: true, message: 'Story deleted successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to delete story' });
  }
};

// Delete expired stories (called by cron job or scheduled task)
// Note: MongoDB TTL index handles this automatically, but keeping for manual trigger
export const deleteExpiredStories = async (req, res) => {
  try {
    const result = await Story.updateMany(
      {
        expiresAt: { $lte: new Date() },
        isActive: true
      },
      { isActive: false }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} expired stories removed`,
    });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to delete expired stories' });
  }
};
