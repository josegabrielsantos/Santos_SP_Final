import Organization from '../models/organization_model.js';
import Post from '../models/post_model.js';
import User from '../models/user_model.js';
import { v2 as cloudinary } from 'cloudinary';

/*  CRUD  */

/**
 * POST /api/organizations
 * Create a new organization. The authenticated user becomes the first admin.
 */
const createOrganization = async (req, res) => {
  try {
    const { name, description } = req.body;
    let { bannerImage, avatar } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Organization name is required.' });
    }

    // Upload images to Cloudinary if provided
    if (bannerImage) {
      const r = await cloudinary.uploader.upload(bannerImage, { folder: 'kms/org_banners' });
      bannerImage = r.secure_url;
    }
    if (avatar) {
      const r = await cloudinary.uploader.upload(avatar, { folder: 'kms/org_avatars' });
      avatar = r.secure_url;
    }

    const org = new Organization({
      name,
      description: description || '',
      bannerImage: bannerImage || null,
      avatar: avatar || null,
      adminIds: [req.user._id],
      memberIds: [],
      followerIds: [],
    });

    await org.save();
    res.status(201).json(org);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An organization with that name/slug already exists.' });
    }
    console.log('Error in createOrganization:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/organizations
 * List active organizations with pagination
 */
const getOrganizations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const orgs = await Organization.find({ isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name slug avatar description memberCount postCount');

    const total = await Organization.countDocuments({ isActive: true });

    res.status(200).json({ organizations: orgs, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.log('Error in getOrganizations:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/organizations/:id
 * Get a single organization by id or slug
 */
const getOrganization = async (req, res) => {
  try {
    const identifier = req.params.id;
    const query = identifier.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: identifier }
      : { slug: identifier };

    const org = await Organization.findOne(query)
      .populate('adminIds', 'displayName avatar')
      .populate('memberIds', 'displayName avatar');

    if (!org) {
      return res.status(404).json({ error: 'Organization not found.' });
    }
    res.status(200).json(org);
  } catch (error) {
    console.log('Error in getOrganization:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * PUT /api/organizations/:id
 * Update organization details (org admin or website_admin)
 */
const updateOrganization = async (req, res) => {
  try {
    const { name, description } = req.body;
    let { bannerImage, avatar } = req.body;

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    if (bannerImage) {
      if (org.bannerImage) {
        const pid = org.bannerImage.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(pid);
      }
      const r = await cloudinary.uploader.upload(bannerImage, { folder: 'kms/org_banners' });
      bannerImage = r.secure_url;
    }
    if (avatar) {
      if (org.avatar) {
        const pid = org.avatar.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(pid);
      }
      const r = await cloudinary.uploader.upload(avatar, { folder: 'kms/org_avatars' });
      avatar = r.secure_url;
    }

    if (name !== undefined) org.name = name;
    if (description !== undefined) org.description = description;
    if (bannerImage !== undefined) org.bannerImage = bannerImage;
    if (avatar !== undefined) org.avatar = avatar;

    await org.save();
    res.status(200).json(org);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Slug conflict  try a different name.' });
    }
    console.log('Error in updateOrganization:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * DELETE /api/organizations/:id
 * Soft-delete (deactivate) an organization (website_admin only)
 */
const deleteOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found.' });
    }
    org.isActive = false;
    await org.save();
    res.status(200).json({ message: 'Organization deactivated.' });
  } catch (error) {
    console.log('Error in deleteOrganization:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/*  MEMBER MANAGEMENT  */

/**
 * POST /api/organizations/:id/members
 * Add a user as member  { userId }
 */
const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    if (org.adminIds.includes(userId) || org.memberIds.includes(userId)) {
      return res.status(400).json({ error: 'User is already in the organization.' });
    }

    org.memberIds.push(userId);
    await org.save();           // pre-save hook syncs memberCount
    res.status(200).json({ message: 'Member added.', memberCount: org.memberCount });
  } catch (error) {
    console.log('Error in addMember:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * DELETE /api/organizations/:id/members/:userId
 * Remove a member
 */
const removeMember = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const idx = org.memberIds.indexOf(req.params.userId);
    if (idx === -1) {
      return res.status(400).json({ error: 'User is not a member.' });
    }

    org.memberIds.splice(idx, 1);
    await org.save();
    res.status(200).json({ message: 'Member removed.', memberCount: org.memberCount });
  } catch (error) {
    console.log('Error in removeMember:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/organizations/:id/admins
 * Promote an existing member to admin  { userId }
 */
const promoteToAdmin = async (req, res) => {
  try {
    const { userId } = req.body;
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    if (org.adminIds.includes(userId)) {
      return res.status(400).json({ error: 'User is already an admin.' });
    }

    // Remove from memberIds if present
    const idx = org.memberIds.indexOf(userId);
    if (idx !== -1) org.memberIds.splice(idx, 1);

    org.adminIds.push(userId);
    await org.save();
    res.status(200).json({ message: 'User promoted to admin.' });
  } catch (error) {
    console.log('Error in promoteToAdmin:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * DELETE /api/organizations/:id/admins/:userId
 * Demote an admin back to member
 */
const demoteAdmin = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const idx = org.adminIds.indexOf(req.params.userId);
    if (idx === -1) {
      return res.status(400).json({ error: 'User is not an admin.' });
    }

    if (org.adminIds.length <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last admin.' });
    }

    org.adminIds.splice(idx, 1);
    org.memberIds.push(req.params.userId);
    await org.save();
    res.status(200).json({ message: 'Admin demoted to member.' });
  } catch (error) {
    console.log('Error in demoteAdmin:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/*  FOLLOW / UNFOLLOW  */

/**
 * POST /api/organizations/:id/follow
 */
const followOrganization = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    if (org.followerIds.map(String).includes(userId)) {
      return res.status(400).json({ error: 'Already following.' });
    }

    org.followerIds.push(req.user._id);
    await org.save();
    res.status(200).json({ message: 'Followed.', followerCount: org.followerIds.length });
  } catch (error) {
    console.log('Error in followOrganization:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/organizations/:id/unfollow
 */
const unfollowOrganization = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const idx = org.followerIds.findIndex((id) => id.toString() === userId);
    if (idx === -1) {
      return res.status(400).json({ error: 'Not following.' });
    }

    org.followerIds.splice(idx, 1);
    await org.save();
    res.status(200).json({ message: 'Unfollowed.', followerCount: org.followerIds.length });
  } catch (error) {
    console.log('Error in unfollowOrganization:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/*  ORG POSTS  */

/**
 * GET /api/organizations/:id/posts
 * Get published posts that belong to an organization
 */
const getOrganizationPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ organizationId: req.params.id, status: 'published' })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'displayName avatar');

    const total = await Post.countDocuments({ organizationId: req.params.id, status: 'published' });

    res.status(200).json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.log('Error in getOrganizationPosts:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/organizations/:id/members
 * List admins + members for an organization
 */
const getOrganizationMembers = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id)
      .populate('adminIds', 'displayName avatar email')
      .populate('memberIds', 'displayName avatar email');

    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    res.status(200).json({
      admins: org.adminIds,
      members: org.memberIds,
      followerCount: org.followerIds.length,
    });
  } catch (error) {
    console.log('Error in getOrganizationMembers:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export {
  createOrganization,
  getOrganizations,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  addMember,
  removeMember,
  promoteToAdmin,
  demoteAdmin,
  followOrganization,
  unfollowOrganization,
  getOrganizationPosts,
  getOrganizationMembers,
};
