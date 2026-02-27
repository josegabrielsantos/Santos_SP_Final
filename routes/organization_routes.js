import express from 'express';
import {
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
} from '../controllers/organization_controller.js';
import { protectRoute, requireWebsiteAdmin, requireOrgAdmin, optionalAuth } from '../middleware/protectRoute.js';

const router = express.Router();

// CRUD (only website_admin can create)
router.post('/', protectRoute, requireWebsiteAdmin, createOrganization);
router.get('/', getOrganizations);
router.get('/:id', getOrganization);
router.put('/:id', protectRoute, requireOrgAdmin, updateOrganization);
router.delete('/:id', protectRoute, requireWebsiteAdmin, deleteOrganization);

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

// Org posts
router.get('/:id/posts', getOrganizationPosts);

export default router;
