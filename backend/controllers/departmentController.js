import { Department, Post, User } from '../models/index.js';
import mongoose from 'mongoose';

// Create a new department
export const createDepartment = async (req, res) => {
  try {
    const { name, type, description, location, country, state, city } = req.body;
    const userId = req.user.id;

    // Create department with creator as admin
    const department = await Department.create({
      name,
      type,
      description,
      location,
      country,
      state,
      city,
      createdBy: userId,
      isActive: true,
      members: [{
        userId,
        role: 'admin',
        joinedAt: new Date()
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: {
        departmentId: department._id
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to create department',
      error: error.message
    });
  }
};

// Get all departments with filters
export const getDepartments = async (req, res) => {
  try {
    const { type, search, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = { isActive: true };

    if (type) {
      query.type = type;
    }

    if (search) {
      query.name = new RegExp(search, 'i');
    }

    // Get departments with creator info
    let departments = await Department.find(query)
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Add statistics and membership info
    departments = await Promise.all(departments.map(async (dept) => {
      const memberCount = dept.members?.length || 0;
      const postCount = await Post.countDocuments({ departmentId: dept._id, isActive: true });
      
      let isMember = false;
      if (req.user) {
        isMember = dept.members?.some(m => m.userId.toString() === req.user.id) || false;
      }

      return {
        ...dept,
        id: dept._id.toString(),
        creator_name: dept.createdBy?.name,
        creator_username: dept.createdBy?.username,
        member_count: memberCount,
        post_count: postCount,
        is_member: isMember
      };
    }));

    // Get total count
    const total = await Department.countDocuments(query);

    res.json({
      success: true,
      data: {
        departments,
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
      message: 'Failed to fetch departments',
      error: error.message
    });
  }
};

// Get single department
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
    }

    const department = await Department.findOne({ _id: id, isActive: true })
      .populate('createdBy', 'name username')
      .lean();

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Add statistics
    const memberCount = department.members?.length || 0;
    const postCount = await Post.countDocuments({ departmentId: department._id, isActive: true });

    // Check if current user is a member
    let isJoined = false;
    let userRole = null;
    if (req.user) {
      const member = department.members?.find(m => m.userId.toString() === req.user.id);
      isJoined = !!member;
      userRole = member?.role || null;
    }

    res.json({
      success: true,
      data: {
        ...department,
        id: department._id.toString(),
        creator_name: department.createdBy?.name,
        creator_username: department.createdBy?.username,
        members_count: memberCount,
        posts_count: postCount,
        isJoined,
        userRole
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department',
      error: error.message
    });
  }
};

// Join department
export const joinDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
    }

    const department = await Department.findOne({ _id: id, isActive: true });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Prevent joining own department (creator is auto-member as admin)
    if (department.createdBy.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'You are the creator of this department'
      });
    }

    // Check if already a member
    const isMember = department.members.some(m => m.userId.toString() === userId);
    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'Already a member of this department'
      });
    }

    // Join department
    await Department.findByIdAndUpdate(id, {
      $push: {
        members: {
          userId,
          role: 'member',
          joinedAt: new Date()
        }
      }
    });

    res.json({
      success: true,
      message: 'Joined department successfully'
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to join department',
      error: error.message
    });
  }
};

// Leave department
export const leaveDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
    }

    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const member = department.members.find(m => m.userId.toString() === userId);
    if (!member) {
      return res.status(400).json({
        success: false,
        message: 'Not a member of this department'
      });
    }

    // Don't allow admin to leave if they're the only admin
    if (member.role === 'admin') {
      const adminCount = department.members.filter(m => m.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot leave - you are the only admin. Transfer ownership first.'
        });
      }
    }

    // Leave department
    await Department.findByIdAndUpdate(id, {
      $pull: {
        members: { userId }
      }
    });

    res.json({
      success: true,
      message: 'Left department successfully'
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to leave department',
      error: error.message
    });
  }
};

// Get department members
export const getDepartmentMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
    }

    const department = await Department.findById(id).lean();

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Get paginated members with user info
    const totalMembers = department.members.length;
    const paginatedMemberIds = department.members
      .slice(skip, skip + limitNum)
      .map(m => m.userId);

    const users = await User.find({ _id: { $in: paginatedMemberIds } })
      .select('name username profileAvatar')
      .lean();

    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u;
    });

    const members = department.members
      .slice(skip, skip + limitNum)
      .map(m => ({
        id: m.userId.toString(),
        role: m.role,
        joined_at: m.joinedAt,
        user_id: m.userId,
        name: userMap[m.userId.toString()]?.name,
        username: userMap[m.userId.toString()]?.username,
        profile_avatar: userMap[m.userId.toString()]?.profileAvatar
      }));

    res.json({
      success: true,
      data: {
        members,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalMembers,
          totalPages: Math.ceil(totalMembers / limitNum)
        }
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department members',
      error: error.message
    });
  }
};

// Get department posts
export const getDepartmentPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
    }

    // Check if user is member or creator (for access control)
    let hasAccess = false;
    if (req.user) {
      const department = await Department.findById(id);
      if (department) {
        hasAccess = department.members.some(m => m.userId.toString() === req.user.id) ||
                   department.createdBy.toString() === req.user.id;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member of this department to view posts'
      });
    }

    // Get posts from this department
    const posts = await Post.find({ departmentId: id, isActive: true })
      .populate('userId', 'name username profileAvatar')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count
    const total = await Post.countDocuments({ departmentId: id, isActive: true });

    // Enrich posts with statistics
    const enrichedPosts = posts.map(post => ({
      ...post,
      id: post._id.toString(),
      author_name: post.userId?.name,
      author_username: post.userId?.username,
      author_avatar: post.userId?.profileAvatar,
      department_name: post.departmentId?.name,
      post_date: post.createdAt,
      media_url: post.mediaUrl,
      media_type: post.mediaType,
      likes_count: post.likes?.length || 0,
      shares_count: post.shares?.length || 0,
      isLikedByUser: req.user ? post.likes?.some(l => l.userId.toString() === req.user.id) : false,
      isSharedByUser: req.user ? post.shares?.some(s => s.userId.toString() === req.user.id) : false
    }));

    res.json({
      success: true,
      data: {
        posts: enrichedPosts,
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
      message: 'Failed to fetch department posts',
      error: error.message
    });
  }
};

// Update department
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, location } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
    }

    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Check if user is admin of department
    const member = department.members.find(m => m.userId.toString() === userId);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized - admin access required'
      });
    }

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (location !== undefined) updates.location = location;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    await Department.findByIdAndUpdate(id, updates);

    res.json({
      success: true,
      message: 'Department updated successfully'
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to update department',
      error: error.message
    });
  }
};

// Delete department
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
    }

    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Check if user is admin of department
    const member = department.members.find(m => m.userId.toString() === userId);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized - admin access required'
      });
    }

    // Soft delete
    await Department.findByIdAndUpdate(id, { isActive: false });

    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete department',
      error: error.message
    });
  }
};

// Upload/update department avatar
export const uploadDepartmentAvatar = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Check if user is admin of the department
    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const member = department.members.find(m => m.userId.toString() === userId);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized - admin access required'
      });
    }

    // Update department avatar
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    department.avatar = avatarPath;
    await department.save();

    res.json({
      success: true,
      message: 'Department avatar uploaded successfully',
      data: {
        avatar: department.avatar
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload department avatar',
      error: error.message
    });
  }
};
