import express from 'express';
import { getOrgAnalytics, getPublicTrends } from '../controllers/analytics_controller.js';

const router = express.Router();

router.get('/trends', getPublicTrends);
router.get('/orgs/:id', getOrgAnalytics);

export default router;
