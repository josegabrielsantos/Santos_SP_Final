import express from 'express';
import { protectRoute, requireWebsiteAdmin } from '../middleware/protectRoute.js';
import { getAllUsers, updateUserRole, toggleUserActive, getAdminStats } from '../controllers/user_controller.js';
import { deleteOrganization } from '../controllers/organization_controller.js';
import { getAdminCharts } from '../controllers/analytics_controller.js';
import { syncExistingData, ensureIndexes } from '../elastic/elastic_client.js';
import {
  toggleHidePost,
  adminDeletePost,
  toggleHideComment,
  adminDeleteComment,
  toggleBanUser,
  getModerationLogs,
} from '../controllers/moderation_controller.js';

const router = express.Router();

// Admin endpoints (all require website_admin role)
router.get('/stats', protectRoute, requireWebsiteAdmin, getAdminStats);
router.get('/analytics', protectRoute, requireWebsiteAdmin, getAdminCharts);
router.get('/users', protectRoute, requireWebsiteAdmin, getAllUsers);
router.patch('/users/:id/role', protectRoute, requireWebsiteAdmin, updateUserRole);
router.patch('/users/:id/deactivate', protectRoute, requireWebsiteAdmin, toggleUserActive);
router.patch('/users/:id/ban', protectRoute, requireWebsiteAdmin, toggleBanUser);
router.delete('/organizations/:id', protectRoute, requireWebsiteAdmin, deleteOrganization);

// Post moderation
router.patch('/posts/:id/hide', protectRoute, requireWebsiteAdmin, toggleHidePost);
router.delete('/posts/:id', protectRoute, requireWebsiteAdmin, adminDeletePost);

// Comment moderation
router.patch('/comments/:id/hide', protectRoute, requireWebsiteAdmin, toggleHideComment);
router.delete('/comments/:id', protectRoute, requireWebsiteAdmin, adminDeleteComment);

// Moderation logs
router.get('/moderation-logs', protectRoute, requireWebsiteAdmin, getModerationLogs);

router.post('/reindex', protectRoute, requireWebsiteAdmin, async (req, res) => {
  try {
    await ensureIndexes();
    await syncExistingData();
    res.status(200).json({ message: 'Reindex complete.' });
  } catch (err) {
    console.log('Error in reindex:', err.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
});

export default router;
