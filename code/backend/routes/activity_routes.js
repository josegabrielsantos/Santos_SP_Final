import express from 'express';
import { recordActivity, getSeenIds } from '../controllers/activity_controller.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router();

router.post('/', protectRoute, recordActivity);
router.get('/seen', protectRoute, getSeenIds);

export default router;
