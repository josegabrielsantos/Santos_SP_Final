import express from 'express';
import {
  createOrgRequest,
  getMyOrgRequests,
  getMyOrgRequest,
  updateMyOrgRequest,
  addRequesterMessage,
  getPendingCount,
  getAllOrgRequests,
  getOrgRequestAdmin,
  approveOrgRequest,
  rejectOrgRequest,
  addAdminMessage,
} from '../controllers/org_request_controller.js';
import { protectRoute, requireWebsiteAdmin } from '../middleware/protectRoute.js';

const router = express.Router();

// ─── User routes (authenticated) ────────────────────────────────
router.post('/', protectRoute, createOrgRequest);
router.get('/mine', protectRoute, getMyOrgRequests);
router.get('/mine/:id', protectRoute, getMyOrgRequest);
router.put('/mine/:id', protectRoute, updateMyOrgRequest);
router.post('/mine/:id/messages', protectRoute, addRequesterMessage);

// ─── Admin routes ───────────────────────────────────────────────
router.get('/pending-count', protectRoute, requireWebsiteAdmin, getPendingCount);
router.get('/all', protectRoute, requireWebsiteAdmin, getAllOrgRequests);
router.get('/:id', protectRoute, requireWebsiteAdmin, getOrgRequestAdmin);
router.post('/:id/approve', protectRoute, requireWebsiteAdmin, approveOrgRequest);
router.post('/:id/reject', protectRoute, requireWebsiteAdmin, rejectOrgRequest);
router.post('/:id/messages', protectRoute, requireWebsiteAdmin, addAdminMessage);

export default router;
