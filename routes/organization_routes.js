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
} from '../controllers/organization_controller.js';
import { protectRoute, requireWebsiteAdmin, requireOrgAdmin } from '../middleware/protectRoute.js';

const router = express.Router();

// CRUD
router.post('/', protectRoute, createOrganization);
router.get('/', getOrganizations);
router.get('/:id', getOrganization);
router.put('/:id', protectRoute, requireOrgAdmin, updateOrganization);
router.delete('/:id', protectRoute, requireWebsiteAdmin, deleteOrganization);

// Members
router.get('/:id/members', getOrganizationMembers);
router.post('/:id/members', protectRoute, requireOrgAdmin, addMember);
router.delete('/:id/members/:userId', protectRoute, requireOrgAdmin, removeMember);

// Admins
router.post('/:id/admins', protectRoute, requireOrgAdmin, promoteToAdmin);
router.delete('/:id/admins/:userId', protectRoute, requireOrgAdmin, demoteAdmin);

// Follow
router.post('/:id/follow', protectRoute, followOrganization);
router.post('/:id/unfollow', protectRoute, unfollowOrganization);

// Org posts
router.get('/:id/posts', getOrganizationPosts);

export default router;
