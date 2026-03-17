import express from 'express';
import { submitSus, getSusResponses } from '../controllers/feedback_controller.js';
import { protectRoute, requireWebsiteAdmin } from '../middleware/protectRoute.js';

const router = express.Router();

router.post('/sus', protectRoute, submitSus);
router.get('/sus', protectRoute, requireWebsiteAdmin, getSusResponses);

export default router;
