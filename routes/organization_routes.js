import express from 'express';
import {
  createOrganization,
  getOrganizations,
  getOrganization,
  updateOrganization,
  hardDeleteOrganization,
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
  getPendingOrgPosts,
  approveOrgPost,
  rejectOrgPost,
  pinOrgPost,
  unpinOrgPost,
  getOrgPinnedPosts,
} from '../controllers/organization_controller.js';
import { getOrgReports } from '../controllers/report_controller.js';
import { protectRoute, requireWebsiteAdmin, requireOrgAdmin, optionalAuth } from '../middleware/protectRoute.js';

const router = express.Router();

// CRUD (only website_admin can create)
router.post('/', protectRoute, requireWebsiteAdmin, createOrganization);
router.get('/', getOrganizations);
router.get('/:id', getOrganization);
router.put('/:id', protectRoute, requireOrgAdmin, updateOrganization);
router.delete('/:id', protectRoute, requireWebsiteAdmin, hardDeleteOrganization);

// Members (optionalAuth on GET so admins see pending list)
router.get('/:id/members', optionalAuth, getOrganizationMembers);
router.post('/:id/members', protectRoute, requireOrgAdmin, addMember);
router.delete('/:id/members/:userId', protectRoute, requireOrgAdmin, removeMember);

// Join request flow
router.post('/:id/join', protectRoute, requestJoin);
router.post('/:id/join/:userId/approve', protectRoute, requireOrgAdmin, approveJoin);
router.post('/:id/join/:userId/reject', protectRoute, requireOrgAdmin, rejectJoin);
router.post('/:id/leave', protectRoute, leaveOrganization);

// Admins
router.post('/:id/admins', protectRoute, requireOrgAdmin, promoteToAdmin);
router.delete('/:id/admins/:userId', protectRoute, requireOrgAdmin, demoteAdmin);

// Follow
router.post('/:id/follow', protectRoute, followOrganization);
router.post('/:id/unfollow', protectRoute, unfollowOrganization);

// Post approval pipeline (org admin only) — must be before /:id/posts to avoid ambiguity
router.get('/:id/posts/pending', protectRoute, requireOrgAdmin, getPendingOrgPosts);
router.get('/:id/posts/pinned', getOrgPinnedPosts);
router.post('/:id/posts/pin', protectRoute, requireOrgAdmin, pinOrgPost);
router.post('/:id/posts/:postId/approve', protectRoute, requireOrgAdmin, approveOrgPost);
router.post('/:id/posts/:postId/reject', protectRoute, requireOrgAdmin, rejectOrgPost);
router.delete('/:id/posts/:postId/pin', protectRoute, requireOrgAdmin, unpinOrgPost);

// Reports (org admin only)
router.get('/:id/reports', protectRoute, requireOrgAdmin, getOrgReports);

// Org posts (public)
router.get('/:id/posts', getOrganizationPosts);

export default router;
