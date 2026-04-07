import User from '../models/user_model.js';
import Organization from '../models/organization_model.js';
import Post from '../models/post_model.js';
import Paper from '../models/paper_model.js';
import { logAction } from './moderation_controller.js';
import { disconnectUser } from '../socket.js';

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

    // Avatar is expected to be a URL (uploaded via /api/upload)
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
    const search = req.query.search;

    const filter = {};
    if (search) {
      filter.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await User.countDocuments(filter);

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

    await logAction(req.user._id, 'user_role_changed', 'user', user._id, `Role changed to ${role}`, {
      displayName: user.displayName,
      email: user.email,
      newRole: role,
    });

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

    // Force-disconnect deactivated user so they can't receive real-time updates
    if (!user.isActive) {
      disconnectUser(user._id.toString());
    }

    const action = user.isActive ? 'user_reactivated' : 'user_deactivated';
    await logAction(req.user._id, action, 'user', user._id, null, {
      displayName: user.displayName,
      email: user.email,
    });

    res.status(200).json({ _id: user._id, isActive: user.isActive });
  } catch (error) {
    console.log('Error in toggleUserActive:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/admin/stats
 * Dashboard statistics (website_admin only)
 */
const getAdminStats = async (req, res) => {
  try {
    const [totalUsers, totalPosts, totalOrgs, activeUsers, totalAdmins, totalPapers] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Organization.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'website_admin' }),
      Paper.countDocuments(),
    ]);

    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSignups = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    // Posts this month
    const postsThisMonth = await Post.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    res.status(200).json({
      totalUsers,
      totalPosts,
      totalPapers,
      totalOrgs,
      activeUsers,
      totalAdmins,
      recentSignups,
      postsThisMonth,
    });
  } catch (error) {
    console.log('Error in getAdminStats:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/users/:id/followed-organizations
 * Return organizations where user is a follower (but not a member)
 */
const getUserFollowedOrganizations = async (req, res) => {
  try {
    const userId = req.params.id;
    const orgs = await Organization.find({
      followerIds: userId,
      isActive: true,
    }).select('name slug avatar memberCount postCount');

    res.status(200).json(orgs);
  } catch (error) {
    console.log('Error in getUserFollowedOrganizations:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/users/saved-papers/:paperId
 * Toggle save/unsave a paper for the authenticated user.
 */
const toggleSavePaper = async (req, res) => {
  try {
    const userId = req.user._id;
    const { paperId } = req.params;

    const paper = await Paper.findById(paperId);
    if (!paper) return res.status(404).json({ error: 'Paper not found.' });

    const user = await User.findById(userId);
    const isSaved = user.savedPapers.map(String).includes(paperId);

    if (isSaved) {
      user.savedPapers = user.savedPapers.filter((id) => id.toString() !== paperId);
    } else {
      user.savedPapers.push(paperId);
    }

    await user.save();
    res.status(200).json({ saved: !isSaved, savedPapers: user.savedPapers });
  } catch (error) {
    console.log('Error in toggleSavePaper:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/users/saved-papers
 * Get the authenticated user's saved papers.
 */
const getSavedPapers = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate({
      path: 'savedPapers',
      populate: [
        { path: 'uploadedBy', select: 'displayName avatar' },
        { path: 'organizationId', select: 'name slug avatar' },
      ],
    });

    res.status(200).json(user.savedPapers || []);
  } catch (error) {
    console.log('Error in getSavedPapers:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export {
  getUserById,
  updateProfile,
  getUserOrganizations,
  getUserFollowedOrganizations,
  getUserPosts,
  getAllUsers,
  updateUserRole,
  toggleUserActive,
  getAdminStats,
  toggleSavePaper,
  getSavedPapers,
};
