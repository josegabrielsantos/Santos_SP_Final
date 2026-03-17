import express from 'express';
import { protectRoute, requireWebsiteAdmin } from '../middleware/protectRoute.js';
import { getAllUsers, updateUserRole, toggleUserActive, getAdminStats } from '../controllers/user_controller.js';
import { deleteOrganization } from '../controllers/organization_controller.js';
import { getAdminCharts } from '../controllers/analytics_controller.js';
import { syncExistingData, ensureIndexes } from '../elastic/elastic_client.js';

const router = express.Router();

// Admin endpoints (all require website_admin role)
router.get('/stats', protectRoute, requireWebsiteAdmin, getAdminStats);
router.get('/analytics', protectRoute, requireWebsiteAdmin, getAdminCharts);
router.get('/users', protectRoute, requireWebsiteAdmin, getAllUsers);
router.patch('/users/:id/role', protectRoute, requireWebsiteAdmin, updateUserRole);
router.patch('/users/:id/deactivate', protectRoute, requireWebsiteAdmin, toggleUserActive);
router.delete('/organizations/:id', protectRoute, requireWebsiteAdmin, deleteOrganization);

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
