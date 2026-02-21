import User from '../models/user_model.js';
import Organization from '../models/organization_model.js';
import Post from '../models/post_model.js';
import { v2 as cloudinary } from 'cloudinary';

/**
 * GET /api/users/:id
 * Public profile
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.log('Error in getUserById:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * PUT /api/users/profile
 * Update own profile (displayName, avatar, bio, dateOfBirth, expertise, certifications)
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { displayName, bio, dateOfBirth, expertise, certifications } = req.body;
    let { avatar } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Handle avatar upload
    if (avatar) {
      // Delete old avatar from Cloudinary if it existed
      if (user.avatar) {
        const publicId = user.avatar.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }
      const uploadResponse = await cloudinary.uploader.upload(avatar, {
        folder: 'kms/avatars',
      });
      avatar = uploadResponse.secure_url;
    }

    if (displayName !== undefined) user.displayName = displayName;
    if (avatar !== undefined) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (expertise !== undefined) user.expertise = expertise;
    if (certifications !== undefined) user.certifications = certifications;

    await user.save();
    res.status(200).json(user);
  } catch (error) {
    console.log('Error in updateProfile:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/users/:id/organizations
 * Return organizations where user is admin or member
 */
const getUserOrganizations = async (req, res) => {
  try {
    const userId = req.params.id;
    const orgs = await Organization.find({
      $or: [{ adminIds: userId }, { memberIds: userId }],
      isActive: true,
    }).select('name slug avatar memberCount postCount');

    res.status(200).json(orgs);
  } catch (error) {
    console.log('Error in getUserOrganizations:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/users/:id/posts
 * Return published posts by the user
 */
const getUserPosts = async (req, res) => {
  try {
    const userId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ authorId: userId, status: 'published' })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'displayName avatar')
      .populate('organizationId', 'name slug avatar');

    const total = await Post.countDocuments({ authorId: userId, status: 'published' });

    res.status(200).json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.log('Error in getUserPosts:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/users
 * List all users (admin only via route middleware)
 */
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await User.countDocuments();

    res.status(200).json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.log('Error in getAllUsers:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * PATCH /api/users/:id/role
 * Change a user's role (website_admin only)
 */
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'website_admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.log('Error in updateUserRole:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * PATCH /api/users/:id/deactivate
 * Toggle isActive (website_admin only)
 */
const toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({ _id: user._id, isActive: user.isActive });
  } catch (error) {
    console.log('Error in toggleUserActive:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export {
  getUserById,
  updateProfile,
  getUserOrganizations,
  getUserPosts,
  getAllUsers,
  updateUserRole,
  toggleUserActive,
};
