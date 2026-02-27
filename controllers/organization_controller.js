import Organization from '../models/organization_model.js';
import Post from '../models/post_model.js';
import User from '../models/user_model.js';

/*  CRUD  */

/**
 * POST /api/organizations
 * Create a new organization. Only website_admin can create.
 * The requesting admin becomes the owner and first admin.
 */
const createOrganization = async (req, res) => {
  try {
    const { name, description, ownerId } = req.body;
    let { bannerImage, avatar } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Organization name is required.' });
    }

    // Determine the owner: if ownerId is provided (super admin assigning someone), use it;
    // otherwise the requesting website_admin becomes the owner.
    const resolvedOwnerId = ownerId || req.user._id;

    // Verify the owner user exists
    if (ownerId) {
      const ownerUser = await User.findById(ownerId);
      if (!ownerUser) {
        return res.status(404).json({ error: 'Specified owner user not found.' });
      }
    }

    const org = new Organization({
      name,
      description: description || '',
      bannerImage: bannerImage || null,
      avatar: avatar || null,
      ownerId: resolvedOwnerId,
      adminIds: [resolvedOwnerId],
      memberIds: [],
      pendingMemberIds: [],
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
      .populate('ownerId', 'displayName avatar')
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

    // bannerImage and avatar are expected to be URLs (uploaded via /api/upload)

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
 * Demote an admin back to member.
 * Only the organization owner (or website_admin) can remove admins.
 * The owner cannot be demoted.
 */
const demoteAdmin = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const requesterId = req.user._id.toString();
    const targetId = req.params.userId;

    // Only the owner or website_admin can remove admins
    const isOwner = org.ownerId.toString() === requesterId;
    const isWebAdmin = req.user.role === 'website_admin';
    if (!isOwner && !isWebAdmin) {
      return res.status(403).json({ error: 'Only the organization owner can remove admins.' });
    }

    // Cannot demote the owner
    if (org.ownerId.toString() === targetId) {
      return res.status(400).json({ error: 'Cannot demote the organization owner.' });
    }

    const idx = org.adminIds.findIndex((aid) => aid.toString() === targetId);
    if (idx === -1) {
      return res.status(400).json({ error: 'User is not an admin.' });
    }

    if (org.adminIds.length <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last admin.' });
    }

    org.adminIds.splice(idx, 1);
    org.memberIds.push(targetId);
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
 * List owner, admins, members (and pending if requester is admin) for an organization
 */
const getOrganizationMembers = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id)
      .populate('ownerId', 'displayName avatar email')
      .populate('adminIds', 'displayName avatar email')
      .populate('memberIds', 'displayName avatar email')
      .populate('pendingMemberIds', 'displayName avatar email');

    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const result = {
      owner: org.ownerId,
      admins: org.adminIds,
      members: org.memberIds,
      followerCount: org.followerIds.length,
    };

    // Only show pending members to org admins / website admins
    if (req.user) {
      const uid = req.user._id.toString();
      const isAdmin = org.adminIds.some((a) => (a._id || a).toString() === uid);
      const isWebAdmin = req.user.role === 'website_admin';
      if (isAdmin || isWebAdmin) {
        result.pendingMembers = org.pendingMemberIds;
      }
    }

    res.status(200).json(result);
  } catch (error) {
    console.log('Error in getOrganizationMembers:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/*  JOIN REQUEST FLOW  */

/**
 * POST /api/organizations/:id/join
 * Authenticated user requests to join an organization.
 */
const requestJoin = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    // Already a member or admin
    if (org.adminIds.map(String).includes(userId) || org.memberIds.map(String).includes(userId)) {
      return res.status(400).json({ error: 'You are already in this organization.' });
    }

    // Already pending
    if (org.pendingMemberIds.map(String).includes(userId)) {
      return res.status(400).json({ error: 'You have already requested to join.' });
    }

    org.pendingMemberIds.push(req.user._id);
    await org.save();
    res.status(200).json({ message: 'Join request submitted.' });
  } catch (error) {
    console.log('Error in requestJoin:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/organizations/:id/join/:userId/approve
 * Org admin approves a pending join request.
 */
const approveJoin = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const targetId = req.params.userId;
    const pendingIdx = org.pendingMemberIds.findIndex((id) => id.toString() === targetId);
    if (pendingIdx === -1) {
      return res.status(400).json({ error: 'No pending request from this user.' });
    }

    // Move from pending to members
    org.pendingMemberIds.splice(pendingIdx, 1);
    org.memberIds.push(targetId);
    await org.save();

    res.status(200).json({ message: 'Member approved.', memberCount: org.memberCount });
  } catch (error) {
    console.log('Error in approveJoin:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/organizations/:id/join/:userId/reject
 * Org admin rejects a pending join request.
 */
const rejectJoin = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const targetId = req.params.userId;
    const pendingIdx = org.pendingMemberIds.findIndex((id) => id.toString() === targetId);
    if (pendingIdx === -1) {
      return res.status(400).json({ error: 'No pending request from this user.' });
    }

    org.pendingMemberIds.splice(pendingIdx, 1);
    await org.save();

    res.status(200).json({ message: 'Join request rejected.' });
  } catch (error) {
    console.log('Error in rejectJoin:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/organizations/:id/leave
 * Authenticated user leaves an organization they are a member of.
 * Admins must be demoted first; the owner cannot leave.
 */
const leaveOrganization = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    // Owner cannot leave
    if (org.ownerId.toString() === userId) {
      return res.status(400).json({ error: 'The organization owner cannot leave. Transfer ownership first.' });
    }

    // If admin, remove from adminIds
    const adminIdx = org.adminIds.findIndex((id) => id.toString() === userId);
    if (adminIdx !== -1) {
      if (org.adminIds.length <= 1) {
        return res.status(400).json({ error: 'Cannot leave as the last admin.' });
      }
      org.adminIds.splice(adminIdx, 1);
      await org.save();
      return res.status(200).json({ message: 'Left the organization (was admin).' });
    }

    // If member, remove from memberIds
    const memberIdx = org.memberIds.findIndex((id) => id.toString() === userId);
    if (memberIdx !== -1) {
      org.memberIds.splice(memberIdx, 1);
      await org.save();
      return res.status(200).json({ message: 'Left the organization.', memberCount: org.memberCount });
    }

    // If pending, withdraw request
    const pendingIdx = org.pendingMemberIds.findIndex((id) => id.toString() === userId);
    if (pendingIdx !== -1) {
      org.pendingMemberIds.splice(pendingIdx, 1);
      await org.save();
      return res.status(200).json({ message: 'Join request withdrawn.' });
    }

    return res.status(400).json({ error: 'You are not in this organization.' });
  } catch (error) {
    console.log('Error in leaveOrganization:', error.message);
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
  requestJoin,
  approveJoin,
  rejectJoin,
  leaveOrganization,
};
