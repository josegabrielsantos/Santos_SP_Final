import express from 'express';
import { protectRoute, requireWebsiteAdmin } from '../middleware/protectRoute.js';
import { getAllUsers, updateUserRole, toggleUserActive } from '../controllers/user_controller.js';
import { deleteOrganization } from '../controllers/organization_controller.js';

const router = express.Router();

// Admin endpoints (all require website_admin role)
router.get('/users', protectRoute, requireWebsiteAdmin, getAllUsers);
router.patch('/users/:id/role', protectRoute, requireWebsiteAdmin, updateUserRole);
router.patch('/users/:id/deactivate', protectRoute, requireWebsiteAdmin, toggleUserActive);
router.delete('/organizations/:id', protectRoute, requireWebsiteAdmin, deleteOrganization);

export default router;
