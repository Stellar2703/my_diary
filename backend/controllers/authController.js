import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Generate JWT Token
export const generateToken = (user, impersonatedBy = null) => {
  const payload = { 
    id: user._id.toString(), 
    username: user.username,
    email: user.email,
    role: user.role || 'user'
  };
  
  if (impersonatedBy) {
    payload.impersonatedBy = impersonatedBy;
  }
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

// Register new user
export const register = async (req, res) => {
  try {
    const { name, username, email, mobileNumber, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() },
        { mobileNumber }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this username, email, or mobile number already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate avatar initials
    const avatar = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

    const existingAdminCount = await User.countDocuments({ role: 'admin', isActive: true });

    // Create new user
    const user = await User.create({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      mobileNumber,
      passwordHash,
      profileAvatar: avatar,
      role: existingAdminCount === 0 ? 'admin' : 'user',
      isActive: true
    });

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          mobile: user.mobileNumber,
          avatar: user.profileAvatar,
          role: user.role || 'user'
        },
        token
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() }
      ]
    }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is disabled'
      });
    }

    // Legacy data compatibility and bootstrap first admin if needed
    if (!user.role) {
      user.role = 'user';
    }
    const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
    if (activeAdminCount === 0) {
      user.role = 'admin';
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          mobile: user.mobileNumber,
          avatar: user.profileAvatar,
          role: user.role || 'user'
        },
        token
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-passwordHash -twoFactorSecret')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...user,
        mobile: user.mobileNumber,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email, mobileNumber, bio, dateOfBirth, gender } = req.body;
    const userId = req.user.id;

    const updates = {};

    if (name) updates.name = name;
    if (email) updates.email = email.toLowerCase();
    if (mobileNumber) updates.mobileNumber = mobileNumber;
    if (bio !== undefined) updates.bio = bio;
    if (dateOfBirth) updates.dateOfBirth = dateOfBirth;
    if (gender) updates.gender = gender;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-passwordHash -twoFactorSecret');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Upload/update user avatar
export const uploadUserAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Update user's profileAvatar with the file path
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { profileAvatar: avatarPath },
      { new: true }
    ).select('-passwordHash -twoFactorSecret');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        profileAvatar: user.profileAvatar
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar',
      error: error.message
    });
  }
};

// Logout (client-side token removal, server can implement token blacklist)
export const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
};
