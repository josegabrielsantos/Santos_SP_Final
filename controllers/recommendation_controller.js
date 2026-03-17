import Post from '../models/post_model.js';
import Paper from '../models/paper_model.js';
import UserActivity from '../models/user_activity_model.js';
import esClient from '../elastic/elastic_client.js';

const ACTION_WEIGHTS = { view: 1, like: 3, comment: 4, save: 5 };

// Per-user in-memory cache: { posts: { data, expiresAt }, papers: { data, expiresAt } }
const recCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes — matches frontend staleTime

async function buildInterestVector(userId) {
  const activities = await UserActivity.find({ userId })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const tagScores = new Map();
  const seenIds = new Set();

  for (const a of activities) {
    seenIds.add(a.targetId.toString());
    const weight = ACTION_WEIGHTS[a.action] ?? 1;
    for (const tag of (a.tags || [])) {
      tagScores.set(tag, (tagScores.get(tag) || 0) + weight);
    }
  }

  const topTags = [...tagScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag]) => tag);

  return { topTags, seenIds: [...seenIds], activityCount: activities.length };
}

/**
 * GET /api/recommendations/posts
 */
const getRecommendedPosts = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const cacheKey = `posts_${userId}`;
    const cached = recCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.status(200).json(cached.data);
    }

    const { topTags, seenIds, activityCount } = await buildInterestVector(req.user._id);

    // Cold start: fewer than 5 activity records → return hot feed
    if (activityCount < 5 || topTags.length === 0) {
      const posts = await Post.find({ status: 'published' })
        .sort({ hotScore: -1, publishedAt: -1 })
        .limit(20)
        .populate('authorId', 'displayName avatar')
        .populate('organizationId', 'name slug avatar')
        .lean();
      const result = { posts, isPersonalized: false };
      recCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL });
      return res.status(200).json(result);
    }

    // ES recommendation query
    let esHitIds = [];
    try {
      const esResult = await esClient.search({
        index: 'kms_posts',
        body: {
          query: {
            bool: {
              should: [
                { terms: { tags: topTags, boost: 2 } },
              ],
              must_not: seenIds.length > 0
                ? [{ ids: { values: seenIds } }]
                : [],
              filter: [{ term: { status: 'published' } }],
              minimum_should_match: 1,
            },
          },
          size: 20,
        },
      });
      esHitIds = esResult.hits?.hits?.map((h) => h._id) ?? [];
    } catch (esErr) {
      console.log('[recommendations] ES query failed, falling back to hot feed:', esErr.message);
    }

    let posts = [];
    if (esHitIds.length >= 5) {
      posts = await Post.find({ _id: { $in: esHitIds }, status: 'published' })
        .populate('authorId', 'displayName avatar')
        .populate('organizationId', 'name slug avatar')
        .lean();
      // Preserve ES score order
      const order = new Map(esHitIds.map((id, i) => [id, i]));
      posts.sort((a, b) => (order.get(a._id.toString()) ?? 99) - (order.get(b._id.toString()) ?? 99));
    } else {
      // Pad with hot feed
      const seenSet = new Set(seenIds);
      posts = await Post.find({ status: 'published' })
        .sort({ hotScore: -1, publishedAt: -1 })
        .limit(20)
        .populate('authorId', 'displayName avatar')
        .populate('organizationId', 'name slug avatar')
        .lean();
      posts = posts.filter((p) => !seenSet.has(p._id.toString())).slice(0, 20);
    }

    const result = { posts, isPersonalized: true };
    recCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL });
    return res.status(200).json(result);
  } catch (error) {
    console.log('Error in getRecommendedPosts:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/recommendations/papers
 */
const getRecommendedPapers = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const cacheKey = `papers_${userId}`;
    const cached = recCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.status(200).json(cached.data);
    }

    const { topTags, seenIds, activityCount } = await buildInterestVector(req.user._id);
    const paperSeenIds = seenIds; // activity records where targetType='paper' share same seenIds set

    if (activityCount < 5 || topTags.length === 0) {
      const papers = await Paper.find({ isPublished: true })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('uploadedBy', 'displayName avatar')
        .populate('organizationId', 'name slug avatar')
        .lean();
      const result = { papers, isPersonalized: false };
      recCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL });
      return res.status(200).json(result);
    }

    let esHitIds = [];
    try {
      const esResult = await esClient.search({
        index: 'kms_papers',
        body: {
          query: {
            bool: {
              should: [
                { terms: { keywords: topTags, boost: 2 } },
              ],
              must_not: paperSeenIds.length > 0
                ? [{ ids: { values: paperSeenIds } }]
                : [],
              filter: [{ term: { isPublished: true } }],
              minimum_should_match: 1,
            },
          },
          size: 20,
        },
      });
      esHitIds = esResult.hits?.hits?.map((h) => h._id) ?? [];
    } catch (esErr) {
      console.log('[recommendations] ES papers query failed, falling back:', esErr.message);
    }

    let papers = [];
    if (esHitIds.length >= 3) {
      papers = await Paper.find({ _id: { $in: esHitIds }, isPublished: true })
        .populate('uploadedBy', 'displayName avatar')
        .populate('organizationId', 'name slug avatar')
        .lean();
      const order = new Map(esHitIds.map((id, i) => [id, i]));
      papers.sort((a, b) => (order.get(a._id.toString()) ?? 99) - (order.get(b._id.toString()) ?? 99));
    } else {
      const seenSet = new Set(paperSeenIds);
      papers = await Paper.find({ isPublished: true })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('uploadedBy', 'displayName avatar')
        .populate('organizationId', 'name slug avatar')
        .lean();
      papers = papers.filter((p) => !seenSet.has(p._id.toString())).slice(0, 20);
    }

    const result = { papers, isPersonalized: true };
    recCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL });
    return res.status(200).json(result);
  } catch (error) {
    console.log('Error in getRecommendedPapers:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export { getRecommendedPosts, getRecommendedPapers, recCache };
