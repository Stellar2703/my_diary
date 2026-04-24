import mongoose from 'mongoose';
import { Report, Ban, ModerationLog, Post, Comment, User } from '../models/index.js';

// Create report
export const createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason, description } = req.body;
    const userId = req.user.id;

    const validTypes = ['post', 'comment', 'user'];
    if (!validTypes.includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ error: 'Invalid target ID' });
    }

    // Check if already reported
    const existing = await Report.findOne({
      reporterId: userId,
      targetType,
      targetId,
      status: 'pending'
    });

    if (existing) {
      return res.status(400).json({ error: 'You have already reported this content' });
    }

    await Report.create({
      reporterId: userId,
      targetType,
      targetId,
      reason,
      description
    });

    res.json({ success: true, message: 'Report submitted successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to create report' });
  }
};

// Get reports (admin only)
export const getReports = async (req, res) => {
  try {
    const { status = 'pending', targetType, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};

    if (status !== 'all') {
      query.status = status;
    }

    if (targetType) {
      query.targetType = targetType;
    }

    const reports = await Report.find(query)
      .populate('reporterId', 'username name')
      .populate('reviewedBy', 'username name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Format the response to match expected structure
    const formattedReports = reports.map(r => ({
      ...r,
      reporter_username: r.reporterId?.username,
      reporter_name: r.reporterId?.name,
      reviewer_username: r.reviewedBy?.username,
      reviewer_name: r.reviewedBy?.name
    }));

    res.json({ success: true, data: formattedReports });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get reports' });
  }
};

// Review report (admin only)
export const reviewReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action, notes } = req.body; // dismiss, remove_content, ban_user
    const userId = req.user.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    const validActions = ['dismiss', 'remove_content', 'ban_user'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Update report status
    report.status = action === 'dismiss' ? 'dismissed' : 'resolved';
    report.reviewedBy = userId;
    report.reviewedAt = new Date();
    report.actionTaken = action;
    report.notes = notes || null;
    await report.save();

    // Take action based on report type
    if (action === 'remove_content') {
      if (report.targetType === 'post') {
        await Post.findByIdAndUpdate(report.targetId, { isActive: false });
      } else if (report.targetType === 'comment') {
        await Comment.findByIdAndUpdate(report.targetId, { isActive: false });
      }
    } else if (action === 'ban_user') {
      let targetUserId;
      if (report.targetType === 'user') {
        targetUserId = report.targetId;
      } else if (report.targetType === 'post') {
        const post = await Post.findById(report.targetId, 'userId');
        targetUserId = post?.userId;
      } else if (report.targetType === 'comment') {
        const comment = await Comment.findById(report.targetId, 'userId');
        targetUserId = comment?.userId;
      }

      if (targetUserId) {
        await Ban.create({
          userId: targetUserId,
          bannedBy: userId,
          reason: notes || 'Violated community guidelines'
        });
      }
    }

    // Log moderation action
    await ModerationLog.create({
      moderatorId: userId,
      action,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: notes || 'Report review'
    });

    res.json({ success: true, message: 'Report reviewed successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to review report' });
  }
};

// Ban user (admin only)
export const banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, duration } = req.body; // duration in days, null for permanent
    const bannedBy = req.user.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if already banned
    const existing = await Ban.findOne({ userId, isActive: true });
    if (existing) {
      return res.status(400).json({ error: 'User is already banned' });
    }

    let expiresAt = null;
    if (duration) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(duration));
    }

    await Ban.create({
      userId,
      bannedBy,
      reason,
      expiresAt
    });

    // Log action
    await ModerationLog.create({
      moderatorId: bannedBy,
      action: 'ban_user',
      targetType: 'user',
      targetId: userId,
      reason
    });

    res.json({ success: true, message: 'User banned successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to ban user' });
  }
};

// Unban user (admin only)
export const unbanUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const unbannedBy = req.user.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    await Ban.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );

    // Log action
    await ModerationLog.create({
      moderatorId: unbannedBy,
      action: 'unban_user',
      targetType: 'user',
      targetId: userId,
      reason: 'User unbanned'
    });

    res.json({ success: true, message: 'User unbanned successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to unban user' });
  }
};

// Get moderation logs (admin only)
export const getModerationLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await ModerationLog.find()
      .populate('moderatorId', 'username name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Format the response to match expected structure
    const formattedLogs = logs.map(log => ({
      ...log,
      moderator_username: log.moderatorId?.username,
      moderator_name: log.moderatorId?.name
    }));

    res.json({ success: true, data: formattedLogs });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get logs' });
  }
};
