import { User, TwoFactorAuth, LoginHistory, Session } from '../models/index.js';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Enable 2FA
export const enable2FA = async (req, res) => {
  try {
    const userId = req.user.id;

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `PeekHour (${req.user.username})`,
      length: 32,
    });

    // Store secret temporarily (will be verified before fully enabling)
    await TwoFactorAuth.findOneAndUpdate(
      { userId },
      {
        userId,
        secret: secret.base32,
        isEnabled: false
      },
      { upsert: true, new: true }
    );

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode,
      },
    });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
};

// Verify and activate 2FA
export const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    const auth = await TwoFactorAuth.findOne({ userId });

    if (!auth) {
      return res.status(404).json({ error: '2FA not initialized' });
    }

    const verified = speakeasy.totp.verify({
      secret: auth.secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Enable 2FA
    auth.isEnabled = true;
    await auth.save();

    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
};

// Disable 2FA
export const disable2FA = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    // Verify password
    const user = await User.findById(userId).select('passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    await TwoFactorAuth.findOneAndDelete({ userId });

    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};

// Get login history
export const getLoginHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    const history = await LoginHistory.find({ userId })
      .sort({ loginAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, data: history });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get login history' });
  }
};

// Get active sessions
export const getActiveSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await Session.find({
      userId,
      isValid: true
    })
      .sort({ lastActivity: -1 })
      .lean();

    res.json({ success: true, data: sessions });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get sessions' });
  }
};

// Terminate session
export const terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    await Session.findOneAndUpdate(
      { _id: sessionId, userId },
      { isValid: false }
    );

    res.json({ success: true, message: 'Session terminated' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to terminate session' });
  }
};

// Get privacy settings
export const getPrivacySettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .select('privacySettings')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return default settings if not set
    const settings = user.privacySettings || {
      profileVisibility: 'public',
      showEmail: false,
      allowMessagesFrom: 'everyone',
      allowTags: true,
      showActivityStatus: true,
    };

    res.json({ success: true, data: settings });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to get settings' });
  }
};

// Update privacy settings
export const updatePrivacySettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;

    const allowedFields = [
      'profileVisibility',
      'showEmail',
      'allowMessagesFrom',
      'allowTags',
      'showActivityStatus',
    ];

    const updates = {};
    Object.keys(settings).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates[`privacySettings.${key}`] = settings[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid settings provided' });
    }

    await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
