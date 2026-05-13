import express from 'express';
import { getOrgAnalytics, getPublicTrends, getTopicCounts } from '../controllers/analytics_controller.js';

const router = express.Router();

router.get('/trends', getPublicTrends);
router.get('/topics', getTopicCounts);
router.get('/orgs/:id', getOrgAnalytics);

export default router;
