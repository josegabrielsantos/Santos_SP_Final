import mongoose from 'mongoose';
import Post from '../models/post_model.js';
import Paper from '../models/paper_model.js';
import User from '../models/user_model.js';
import Organization from '../models/organization_model.js';

// Simple in-memory cache helper
const cache = new Map();
function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < 5 * 60 * 1000) return entry.data;
  return null;
}
function setCached(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

/**
 * GET /api/admin/analytics
 * Returns all admin chart data in one call.
 */
const getAdminCharts = async (req, res) => {
  try {
    const cached = getCached('admin_charts');
    if (cached) return res.status(200).json(cached);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const [
      postsOverTime,
      papersOverTime,
      registrationsOverTime,
      postTypeDistribution,
      topTags,
      orgsByActivity,
    ] = await Promise.all([
      // Monthly post counts (last 12 months)
      Post.aggregate([
        { $match: { createdAt: { $gte: twelveMonthsAgo }, status: 'published' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { month: '$_id', count: 1, _id: 0 } },
      ]),

      // Monthly paper uploads (last 12 months)
      Paper.aggregate([
        { $match: { createdAt: { $gte: twelveMonthsAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { month: '$_id', count: 1, _id: 0 } },
      ]),

      // Monthly user registrations (last 12 months)
      User.aggregate([
        { $match: { createdAt: { $gte: twelveMonthsAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { month: '$_id', count: 1, _id: 0 } },
      ]),

      // Post type distribution
      Post.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { type: '$_id', count: 1, _id: 0 } },
      ]),

      // Top 10 tags across published posts
      Post.aggregate([
        { $match: { status: 'published', tags: { $exists: true, $ne: [] } } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { tag: '$_id', count: 1, _id: 0 } },
      ]),

      // Top 8 orgs by post count
      Post.aggregate([
        { $match: { organizationId: { $ne: null }, status: 'published' } },
        { $group: { _id: '$organizationId', postCount: { $sum: 1 } } },
        { $sort: { postCount: -1 } },
        { $limit: 8 },
        { $lookup: { from: 'organizations', localField: '_id', foreignField: '_id', as: 'org' } },
        { $unwind: '$org' },
        { $project: { name: '$org.name', postCount: 1, _id: 0 } },
      ]),
    ]);

    const result = {
      postsOverTime,
      papersOverTime,
      registrationsOverTime,
      postTypeDistribution,
      topTags,
      orgsByActivity,
    };

    setCached('admin_charts', result);
    res.status(200).json(result);
  } catch (error) {
    console.log('Error in getAdminCharts:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/analytics/orgs/:id
 * Returns org-specific analytics. Public endpoint.
 */
const getOrgAnalytics = async (req, res) => {
  try {
    const orgId = req.params.id;
    const cacheKey = 'org_analytics_' + orgId;
    const cached = getCached(cacheKey);
    if (cached) return res.status(200).json(cached);

    const oid = new mongoose.Types.ObjectId(orgId);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [postsOverTime, topPosts, typeBreakdown, topTags] = await Promise.all([
      // Monthly post counts (last 6 months)
      Post.aggregate([
        { $match: { organizationId: oid, createdAt: { $gte: sixMonthsAgo }, status: 'published' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { month: '$_id', count: 1, _id: 0 } },
      ]),

      // Top 5 posts by engagement
      Post.aggregate([
        { $match: { organizationId: oid, status: 'published' } },
        { $addFields: { engagement: { $add: ['$likeCount', '$commentCount'] } } },
        { $sort: { engagement: -1 } },
        { $limit: 5 },
        { $project: { title: 1, likeCount: 1, commentCount: 1 } },
      ]),

      // Post type breakdown for this org
      Post.aggregate([
        { $match: { organizationId: oid, status: 'published' } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { type: '$_id', count: 1, _id: 0 } },
      ]),

      // Top 8 tags for this org
      Post.aggregate([
        { $match: { organizationId: oid, status: 'published', tags: { $exists: true, $ne: [] } } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
        { $project: { tag: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    const result = {
      postsOverTime,
      memberGrowthData: postsOverTime, // proxy — monthly post activity as activity indicator
      topPosts,
      typeBreakdown,
      topTags,
    };

    setCached(cacheKey, result);
    res.status(200).json(result);
  } catch (error) {
    console.log('Error in getOrgAnalytics:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/analytics/trends
 * Returns public research trend data.
 */
const getPublicTrends = async (req, res) => {
  try {
    const cached = getCached('public_trends');
    if (cached) return res.status(200).json(cached);

    const [papersByYear, topKeywords, papersByOrg] = await Promise.all([
      // Papers by year (all years)
      Paper.aggregate([
        { $match: { year: { $ne: null } } },
        { $group: { _id: '$year', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { year: { $toString: '$_id' }, count: 1, _id: 0 } },
      ]),

      // Top 15 paper keywords
      Paper.aggregate([
        { $match: { keywords: { $exists: true, $ne: [] } } },
        { $unwind: '$keywords' },
        { $group: { _id: '$keywords', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
        { $project: { keyword: '$_id', count: 1, _id: 0 } },
      ]),

      // Top 8 orgs by paper count
      Paper.aggregate([
        { $match: { organizationId: { $ne: null } } },
        { $group: { _id: '$organizationId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
        { $lookup: { from: 'organizations', localField: '_id', foreignField: '_id', as: 'org' } },
        { $unwind: '$org' },
        { $project: { name: '$org.name', count: 1, _id: 0 } },
      ]),
    ]);

    const result = { papersByYear, topKeywords, papersByOrg };
    setCached('public_trends', result);
    res.status(200).json(result);
  } catch (error) {
    console.log('Error in getPublicTrends:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/analytics/topics
 * Returns topic distribution across posts and papers.
 */
const getTopicCounts = async (req, res) => {
  try {
    const cached = getCached('topic_counts');
    if (cached) return res.status(200).json(cached);

    const [postTopics, paperTopics] = await Promise.all([
      Post.aggregate([
        { $match: { status: 'published', topics: { $exists: true, $ne: [] } } },
        { $unwind: '$topics' },
        { $group: { _id: '$topics', count: { $sum: 1 } } },
        { $project: { topic: '$_id', count: 1, _id: 0 } },
      ]),
      Paper.aggregate([
        { $match: { topics: { $exists: true, $ne: [] } } },
        { $unwind: '$topics' },
        { $group: { _id: '$topics', count: { $sum: 1 } } },
        { $project: { topic: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    // Merge counts
    const merged = {};
    for (const { topic, count } of postTopics) {
      merged[topic] = (merged[topic] || 0) + count;
    }
    for (const { topic, count } of paperTopics) {
      merged[topic] = (merged[topic] || 0) + count;
    }

    const result = Object.entries(merged)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);

    setCached('topic_counts', result);
    res.status(200).json(result);
  } catch (error) {
    console.log('Error in getTopicCounts:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export { getAdminCharts, getOrgAnalytics, getPublicTrends, getTopicCounts };
