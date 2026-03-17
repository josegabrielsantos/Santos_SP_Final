import UserActivity from '../models/user_activity_model.js';
import Post from '../models/post_model.js';
import Paper from '../models/paper_model.js';
import { recCache } from './recommendation_controller.js';

/**
 * POST /api/activity
 * Body: { targetId, targetType: 'post'|'paper', action: 'view'|'like'|'comment'|'save' }
 */
const recordActivity = async (req, res) => {
  try {
    const { targetId, targetType, action } = req.body;
    if (!targetId || !targetType || !action) {
      return res.status(400).json({ error: 'targetId, targetType, and action are required.' });
    }

    // Fetch tags/keywords from the target document
    let tags = [];
    if (targetType === 'post') {
      const post = await Post.findById(targetId).select('tags').lean();
      tags = post?.tags ?? [];
    } else if (targetType === 'paper') {
      const paper = await Paper.findById(targetId).select('keywords').lean();
      tags = paper?.keywords ?? [];
    }

    // Upsert: update createdAt if same (user, target, action) already exists
    await UserActivity.findOneAndUpdate(
      { userId: req.user._id, targetId, action },
      { userId: req.user._id, targetId, targetType, action, tags, createdAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Invalidate per-user recommendation cache so next fetch recomputes
    const uid = req.user._id.toString();
    recCache.delete(`posts_${uid}`);
    recCache.delete(`papers_${uid}`);

    res.status(200).json({ ok: true });
  } catch (error) {
    // Duplicate key errors are fine (unique index prevents double-recording)
    if (error.code === 11000) return res.status(200).json({ ok: true });
    console.log('Error in recordActivity:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/activity/seen
 * Returns array of targetIds the user has interacted with
 */
const getSeenIds = async (req, res) => {
  try {
    const activities = await UserActivity.find({ userId: req.user._id })
      .select('targetId')
      .lean();
    const ids = [...new Set(activities.map((a) => a.targetId.toString()))];
    res.status(200).json({ seenIds: ids });
  } catch (error) {
    console.log('Error in getSeenIds:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export { recordActivity, getSeenIds };
