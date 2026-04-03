import express from 'express';
import rateLimit from 'express-rate-limit';
import { optionalAuth } from '../middleware/protectRoute.js';
import { getRelatedPosts, getTopicSummary, getInsightSummary } from '../controllers/insight_controller.js';

const router = express.Router();

const insightLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// Topic-level aggregations (used by UI + Gemini prompt)
router.get('/topic-summary', optionalAuth, getTopicSummary);

// Related posts for a given post (ES-powered)
router.get('/posts/:id/related', optionalAuth, getRelatedPosts);

// AI-generated insight summary for a post (cached, Gemini-powered)
router.get('/:postId/summary', insightLimiter, optionalAuth, getInsightSummary);

export default router;
