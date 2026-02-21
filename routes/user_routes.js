import express from 'express';
import {
  getUserById,
  updateProfile,
  getUserOrganizations,
  getUserPosts,
  getAllUsers,
  updateUserRole,
  toggleUserActive,
} from '../controllers/user_controller.js';
import { protectRoute, requireWebsiteAdmin } from '../middleware/protectRoute.js';

const router = express.Router();

// Authenticated user profile
router.put('/profile', protectRoute, updateProfile);

// Admin routes
router.get('/', protectRoute, requireWebsiteAdmin, getAllUsers);
router.patch('/:id/role', protectRoute, requireWebsiteAdmin, updateUserRole);
router.patch('/:id/deactivate', protectRoute, requireWebsiteAdmin, toggleUserActive);

// Public-ish lookups
router.get('/:id', getUserById);
router.get('/:id/organizations', getUserOrganizations);
router.get('/:id/posts', getUserPosts);

export default router;
