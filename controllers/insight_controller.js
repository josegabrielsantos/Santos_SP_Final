import esClient from '../elastic/elastic_client.js';
import Post from '../models/post_model.js';
import InsightCache from '../models/insight_cache_model.js';
import { generateInsight } from '../lib/util/gemini_insight_generator.js';
import crypto from 'crypto';

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeContextHash(topics, tags, title) {
  const input = [...(topics || []), ...(tags || []), title || ''].filter(Boolean).sort().join('|');
  return crypto.createHash('md5').update(input).digest('hex');
}

// ── Phase 1: Related Posts (ES-powered) ─────────────────────────────────────

/**
 * GET /api/insights/posts/:id/related?limit=5
 * Returns posts from Elasticsearch that share topics/tags/title with the given post.
 */
export const getRelatedPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 5, 10);

    const post = await Post.findById(id).select('topics tags title organizationId type').lean();
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const topics = post.topics || [];
    const tags = post.tags || [];

    if (topics.length === 0 && tags.length === 0 && !post.title) {
      return res.json([]);
    }

    const shouldClauses = [];

    if (topics.length > 0) {
      shouldClauses.push({ terms: { topics, boost: 3 } });
    }
    if (tags.length > 0) {
      shouldClauses.push({ terms: { tags, boost: 2 } });
    }
    if (post.title) {
      shouldClauses.push({ match: { title: { query: post.title, boost: 1.5, fuzziness: 'AUTO' } } });
    }

    // Small bonus for cross-org content (encourages discovery)
    if (post.organizationId) {
      shouldClauses.push({
        bool: {
          must_not: [{ term: { organizationId: post.organizationId.toString() } }],
          boost: 0.5,
        },
      });
    }

    if (shouldClauses.length === 0) return res.json([]);

    const esResult = await esClient.search({
      index: 'kms_posts',
      body: {
        query: {
          bool: {
            must: [{ term: { status: 'published' } }],
            must_not: [
              { ids: { values: [id] } },
              { term: { type: 'announcement' } },
            ],
            should: shouldClauses,
            minimum_should_match: 1,
          },
        },
        size: limit,
        _source: [
          'title', 'type', 'authorName', 'organizationName', 'organizationId',
          'topics', 'tags', 'likeCount', 'commentCount', 'publishedAt',
        ],
      },
    });

    const posts = (esResult.hits?.hits || []).map((hit) => ({
      _id: hit._id,
      ...hit._source,
      relevanceScore: hit._score,
    }));

    res.json(posts);
  } catch (error) {
    console.error('Error in getRelatedPosts:', error.message);
    res.json([]);
  }
};

// ── Phase 1: Topic Summary Aggregations ─────────────────────────────────────

/**
 * GET /api/insights/topic-summary?topics=food-security,nutrition-health
 * Returns aggregated stats about the given topics across the platform.
 */
export const getTopicSummary = async (req, res) => {
  try {
    const topics = (req.query.topics || '').split(',').filter(Boolean);
    if (topics.length === 0) return res.json(null);

    const [postAggs, paperAggs] = await Promise.all([
      esClient.search({
        index: 'kms_posts',
        body: {
          query: {
            bool: {
              must: [
                { terms: { topics } },
                { term: { status: 'published' } },
              ],
            },
          },
          size: 3,
          sort: [{ likeCount: 'desc' }, { commentCount: 'desc' }],
          _source: ['title', 'tags', 'likeCount', 'commentCount', 'organizationName'],
          aggs: {
            recent: {
              filter: { range: { publishedAt: { gte: 'now-30d' } } },
            },
            topOrgs: {
              terms: { field: 'organizationName', size: 3 },
            },
            topTags: {
              terms: { field: 'tags', size: 10 },
            },
            coTopics: {
              terms: { field: 'topics', size: 8 },
            },
          },
        },
      }),
      esClient.search({
        index: 'kms_papers',
        body: {
          query: { bool: { must: [{ terms: { topics } }] } },
          size: 3,
          sort: [{ downloadCount: 'desc' }],
          _source: ['title', 'keywords', 'authors', 'year', 'abstract'],
          aggs: {
            topKeywords: {
              terms: { field: 'keywords', size: 10 },
            },
            yearDistribution: {
              terms: { field: 'year', size: 10, order: { _key: 'desc' } },
            },
            topAuthors: {
              terms: { field: 'authors.keyword', size: 5 },
            },
          },
        },
      }),
    ]);

    const topicSet = new Set(topics);

    res.json({
      totalPosts: postAggs.hits?.total?.value || 0,
      recentPosts: postAggs.aggregations?.recent?.doc_count || 0,
      totalPapers: paperAggs.hits?.total?.value || 0,
      topOrganizations: (postAggs.aggregations?.topOrgs?.buckets || []).map((b) => ({
        name: b.key,
        count: b.doc_count,
      })),
      trendingTags: (postAggs.aggregations?.topTags?.buckets || []).map((b) => b.key),
      relatedTopics: (postAggs.aggregations?.coTopics?.buckets || [])
        .map((b) => b.key)
        .filter((t) => !topicSet.has(t)),
      topPosts: (postAggs.hits?.hits || []).map((h) => ({
        title: h._source.title,
        likeCount: h._source.likeCount,
        commentCount: h._source.commentCount,
        organizationName: h._source.organizationName,
        tags: h._source.tags,
      })),
      topPapers: (paperAggs.hits?.hits || []).map((h) => ({
        title: h._source.title,
        authors: h._source.authors,
        year: h._source.year,
        keywords: h._source.keywords,
        abstract: h._source.abstract,
      })),
      topKeywords: (paperAggs.aggregations?.topKeywords?.buckets || []).map((b) => b.key),
      yearDistribution: (paperAggs.aggregations?.yearDistribution?.buckets || []).map((b) => ({
        year: b.key,
        count: b.doc_count,
      })),
      topAuthors: (paperAggs.aggregations?.topAuthors?.buckets || []).map((b) => ({
        name: b.key,
        count: b.doc_count,
      })),
    });
  } catch (error) {
    console.error('Error in getTopicSummary:', error.message);
    res.json(null);
  }
};

// ── Phase 2: AI Insight Summary ─────────────────────────────────────────────

/**
 * Internal helper: fetch topic summary data (reuses the same logic as the endpoint).
 */
async function getTopicSummaryData(topics) {
  if (!topics?.length) return null;

  const [postAggs, paperAggs] = await Promise.all([
    esClient.search({
      index: 'kms_posts',
      body: {
        query: {
          bool: {
            must: [{ terms: { topics } }, { term: { status: 'published' } }],
          },
        },
        size: 5,
        sort: [{ likeCount: 'desc' }, { commentCount: 'desc' }],
        _source: ['title', 'tags', 'likeCount', 'commentCount', 'organizationName'],
        aggs: {
          recent: { filter: { range: { publishedAt: { gte: 'now-30d' } } } },
          topOrgs: { terms: { field: 'organizationName', size: 3 } },
          topTags: { terms: { field: 'tags', size: 10 } },
          coTopics: { terms: { field: 'topics', size: 8 } },
        },
      },
    }),
    esClient.search({
      index: 'kms_papers',
      body: {
        query: { bool: { must: [{ terms: { topics } }] } },
        size: 5,
        sort: [{ downloadCount: 'desc' }],
        _source: ['title', 'keywords', 'authors', 'year', 'abstract'],
        aggs: {
          topKeywords: { terms: { field: 'keywords', size: 10 } },
          yearDistribution: { terms: { field: 'year', size: 10, order: { _key: 'desc' } } },
          topAuthors: { terms: { field: 'authors.keyword', size: 5 } },
        },
      },
    }),
  ]);

  const topicSet = new Set(topics);

  return {
    totalPosts: postAggs.hits?.total?.value || 0,
    recentPosts: postAggs.aggregations?.recent?.doc_count || 0,
    totalPapers: paperAggs.hits?.total?.value || 0,
    topOrganizations: (postAggs.aggregations?.topOrgs?.buckets || []).map((b) => ({
      name: b.key, count: b.doc_count,
    })),
    trendingTags: (postAggs.aggregations?.topTags?.buckets || []).map((b) => b.key),
    relatedTopics: (postAggs.aggregations?.coTopics?.buckets || [])
      .map((b) => b.key).filter((t) => !topicSet.has(t)),
    topPosts: (postAggs.hits?.hits || []).map((h) => ({
      title: h._source.title,
      likeCount: h._source.likeCount,
      commentCount: h._source.commentCount,
      organizationName: h._source.organizationName,
      tags: h._source.tags,
    })),
    topPapers: (paperAggs.hits?.hits || []).map((h) => ({
      title: h._source.title,
      authors: h._source.authors,
      year: h._source.year,
      keywords: h._source.keywords,
      abstract: h._source.abstract,
    })),
    topKeywords: (paperAggs.aggregations?.topKeywords?.buckets || []).map((b) => b.key),
    yearDistribution: (paperAggs.aggregations?.yearDistribution?.buckets || []).map((b) => ({
      year: b.key, count: b.doc_count,
    })),
    topAuthors: (paperAggs.aggregations?.topAuthors?.buckets || []).map((b) => ({
      name: b.key, count: b.doc_count,
    })),
  };
}

/**
 * Internal helper: fetch related posts data for Gemini context.
 */
async function getRelatedPostsData(postId, post, limit = 5) {
  const topics = post.topics || [];
  const tags = post.tags || [];
  const shouldClauses = [];

  if (topics.length > 0) shouldClauses.push({ terms: { topics, boost: 3 } });
  if (tags.length > 0) shouldClauses.push({ terms: { tags, boost: 2 } });
  if (post.title) shouldClauses.push({ match: { title: { query: post.title, boost: 1.5, fuzziness: 'AUTO' } } });

  if (shouldClauses.length === 0) return [];

  const esResult = await esClient.search({
    index: 'kms_posts',
    body: {
      query: {
        bool: {
          must: [{ term: { status: 'published' } }],
          must_not: [{ ids: { values: [postId] } }, { term: { type: 'announcement' } }],
          should: shouldClauses,
          minimum_should_match: 1,
        },
      },
      size: limit,
      _source: [
        'title', 'type', 'authorName', 'organizationName',
        'topics', 'tags', 'likeCount', 'commentCount', 'publishedAt',
      ],
    },
  });

  return (esResult.hits?.hits || []).map((hit) => ({
    _id: hit._id,
    ...hit._source,
  }));
}

/**
 * Internal helper: fetch related papers data for Gemini context.
 */
async function getRelatedPapersData(postId, post, limit = 5) {
  const topics = post.topics || [];
  const tags = post.tags || [];
  const keywordText = [...tags, post.paperMetadata?.researchTitle].filter(Boolean).join(' ');

  if (topics.length === 0 && !keywordText.trim()) return [];

  const must = [];
  const should = [];
  const mustNot = [{ term: { sourcePostId: postId } }];

  if (topics.length > 0) must.push({ terms: { topics } });
  if (keywordText.trim()) {
    should.push({ match: { keywords: { query: keywordText, boost: 2 } } });
    should.push({ match: { title: { query: keywordText, boost: 1.5 } } });
  }
  if (post.title) {
    should.push({ match: { title: { query: post.title, boost: 1.5 } } });
    should.push({ match: { abstract: { query: post.title, boost: 0.5 } } });
  }
  if (post.paperIds?.length > 0) {
    mustNot.push({ ids: { values: post.paperIds.map((id) => id.toString()) } });
  }

  const query = { bool: { must_not: mustNot } };
  if (must.length > 0) query.bool.must = must;
  if (should.length > 0) {
    query.bool.should = should;
    if (must.length === 0) query.bool.minimum_should_match = 1;
  }

  const esResult = await esClient.search({
    index: 'kms_papers',
    body: {
      query,
      size: limit,
      _source: ['title', 'keywords', 'authors', 'year', 'abstract'],
    },
  });

  return (esResult.hits?.hits || []).map((hit) => ({
    _id: hit._id,
    ...hit._source,
  }));
}

/**
 * GET /api/insights/:postId/summary?refresh=true
 * Returns an AI-generated research landscape summary for the given post.
 * Caches results in MongoDB with 7-day TTL.
 */
export const getInsightSummary = async (req, res) => {
  try {
    const { postId } = req.params;
    const forceRefresh = req.query.refresh === 'true';

    const post = await Post.findById(postId)
      .select('title topics tags bodyText paperIds paperMetadata')
      .lean();
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const contextHash = computeContextHash(post.topics, post.tags, post.title);

    // Check cache (skip on force refresh)
    if (!forceRefresh) {
      const cached = await InsightCache.findOne({ postId }).lean();
      if (cached && cached.contextHash === contextHash) {
        return res.json({
          summary: cached.summary,
          keyThemes: cached.keyThemes,
          researchGaps: cached.researchGaps,
          stats: cached.stats,
          generatedAt: cached.generatedAt,
          cached: true,
        });
      }
    }

    // Insufficient metadata to generate insight
    if (!post.topics?.length && !post.tags?.length) {
      return res.json({ summary: null, reason: 'insufficient_context' });
    }

    // Gather ES context in parallel
    const [topicSummary, relatedPosts, relatedPapers] = await Promise.all([
      getTopicSummaryData(post.topics).catch(() => null),
      getRelatedPostsData(postId, post, 5).catch(() => []),
      getRelatedPapersData(postId, post, 5).catch(() => []),
    ]);

    const totalContent = (topicSummary?.totalPosts || 0) + (topicSummary?.totalPapers || 0);
    if (totalContent < 2) {
      return res.json({
        summary: null,
        reason: 'insufficient_platform_content',
        stats: {
          totalPosts: topicSummary?.totalPosts || 0,
          totalPapers: topicSummary?.totalPapers || 0,
          recentPosts: 0,
          topOrg: null,
        },
      });
    }

    // Generate AI insight via Gemini
    const postContext = {
      title: post.title,
      topics: post.topics || [],
      tags: post.tags || [],
    };

    const insight = await generateInsight(postContext, topicSummary, relatedPosts, relatedPapers);

    const stats = {
      totalPosts: topicSummary?.totalPosts || 0,
      totalPapers: topicSummary?.totalPapers || 0,
      recentPosts: topicSummary?.recentPosts || 0,
      topOrg: topicSummary?.topOrganizations?.[0]?.name || null,
    };

    if (!insight) {
      return res.json({
        summary: null,
        reason: 'generation_failed',
        stats,
      });
    }

    // Cache in MongoDB (upsert)
    const now = new Date();
    await InsightCache.findOneAndUpdate(
      { postId },
      {
        postId,
        summary: insight.summary,
        keyThemes: insight.keyThemes,
        researchGaps: insight.researchGaps,
        stats,
        contextHash,
        generatedAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true },
    ).catch((err) => console.error('Error caching insight:', err.message));

    res.json({
      summary: insight.summary,
      keyThemes: insight.keyThemes,
      researchGaps: insight.researchGaps,
      stats,
      generatedAt: now,
      cached: false,
    });
  } catch (error) {
    console.error('Error in getInsightSummary:', error.message);
    res.json({ summary: null, reason: 'error' });
  }
};
