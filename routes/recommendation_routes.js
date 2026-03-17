import express from 'express';
import { getRecommendedPosts, getRecommendedPapers } from '../controllers/recommendation_controller.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router();

router.get('/posts', protectRoute, getRecommendedPosts);
router.get('/papers', protectRoute, getRecommendedPapers);

export default router;
