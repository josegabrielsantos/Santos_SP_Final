import esClient from '../elastic/elastic_client.js';

const KMS_POSTS_INDEX = 'kms_posts';
const KMS_PAPERS_INDEX = 'kms_papers';

/**
 * GET /api/search?q=...&type=posts|papers|all&page=1&limit=20
 * Unified search across posts and/or papers.
 *
 * Post-specific filters: postType, postTags, dateFrom, dateTo
 * Paper-specific filters: title, author, tags, tagMode, yearFrom, yearTo
 * Shared: q (general query), sort, page, limit
 */
const search = async (req, res) => {
  try {
    const {
      q = '',
      type = 'all',
      page = 1,
      limit = 20,
      title,
      author,
      tags,
      tagMode = 'any',
      yearFrom,
      yearTo,
      sort = 'relevance',
      // Post-specific filters
      postType,
      postTags,
      dateFrom,
      dateTo,
      topic,
    } = req.query;

    const hasGeneralQuery = q.trim().length > 0;
    const hasPostCriteria =
      hasGeneralQuery ||
      !!postType?.trim() ||
      !!postTags?.trim() ||
      !!dateFrom?.trim() ||
      !!dateTo?.trim();
    const hasPaperCriteria =
      hasGeneralQuery ||
      !!title?.trim() ||
      !!author?.trim() ||
      !!tags?.trim() ||
      yearFrom !== undefined ||
      yearTo !== undefined;

    if ((type === 'posts') && !hasPostCriteria) {
      return res.status(400).json({ error: 'At least one search criterion is required.' });
    }

    if (type === 'papers' && !hasPaperCriteria) {
      return res.status(400).json({ error: 'At least one papers search criterion is required.' });
    }

    if (type === 'all' && !hasGeneralQuery && !hasPostCriteria && !hasPaperCriteria) {
      return res.status(400).json({ error: 'At least one search criterion is required.' });
    }

    const from = (parseInt(page) - 1) * parseInt(limit);
    const size = parseInt(limit);
    const results = {};

    if (type === 'posts' || type === 'all') {
      // Build bool query for posts with filters
      const postMust = [];
      const postFilter = [];

      if (hasGeneralQuery) {
        postMust.push({
          multi_match: {
            query: q,
            fields: ['title^3', 'bodyText^2', 'tags'],
            fuzziness: 'AUTO',
          },
        });
      }

      if (postType?.trim()) {
        postFilter.push({ term: { type: postType.trim() } });
      }

      if (postTags?.trim()) {
        const tagList = postTags.split(',').map((t) => t.trim()).filter(Boolean);
        if (tagList.length > 0) {
          postFilter.push({ terms: { tags: tagList } });
        }
      }

      if (topic?.trim()) {
        postFilter.push({ term: { topics: topic.trim() } });
      }

      if (dateFrom?.trim() || dateTo?.trim()) {
        const dateRange = {};
        if (dateFrom?.trim()) dateRange.gte = dateFrom.trim();
        if (dateTo?.trim()) dateRange.lte = dateTo.trim();
        postFilter.push({ range: { publishedAt: dateRange } });
      }

      const postQuery = {
        bool: {
          must: postMust.length > 0 ? postMust : [{ match_all: {} }],
          ...(postFilter.length > 0 ? { filter: postFilter } : {}),
        },
      };

      const postSortOrder =
        sort === 'newest'
          ? [{ publishedAt: 'desc' }]
          : sort === 'oldest'
            ? [{ publishedAt: 'asc' }]
            : sort === 'most_liked'
              ? [{ likeCount: 'desc' }]
              : sort === 'most_discussed'
                ? [{ commentCount: 'desc' }]
                : undefined;

      const postResults = await esClient.search({
        index: KMS_POSTS_INDEX,
        body: {
          from,
          size,
          query: postQuery,
          ...(postSortOrder ? { sort: postSortOrder } : {}),
          highlight: {
            fields: {
              title: {},
              bodyText: { fragment_size: 200, number_of_fragments: 2 },
              tags: {},
            },
          },
        },
      });

      results.posts = {
        total: postResults.hits.total.value,
        hits: postResults.hits.hits.map((hit) => ({
          _id: hit._id,
          score: hit._score,
          ...hit._source,
          highlight: hit.highlight || {},
        })),
      };
    }

    if (type === 'papers' || type === 'all') {
      const must = [];
      const filter = [];

      if (hasGeneralQuery) {
        must.push({
          multi_match: {
            query: q,
            fields: ['title^3', 'abstract^2', 'authors^2', 'keywords', 'journal', 'doi'],
            fuzziness: 'AUTO',
          },
        });
      }

      if (title?.trim()) {
        must.push({
          match: {
            title: {
              query: title,
              operator: 'and',
            },
          },
        });
      }

      if (author?.trim()) {
        must.push({
          match: {
            authors: {
              query: author,
              operator: 'and',
            },
          },
        });
      }

      if (tags?.trim()) {
        const tagList = tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);

        if (tagList.length > 0) {
          if (tagMode === 'all') {
            tagList.forEach((tag) => filter.push({ term: { keywords: tag } }));
          } else {
            filter.push({ terms: { keywords: tagList } });
          }
        }
      }

      if (topic?.trim()) {
        filter.push({ term: { topics: topic.trim() } });
      }

      if (yearFrom !== undefined || yearTo !== undefined) {
        const yearRange = {};
        if (yearFrom !== undefined) {
          const parsedFrom = parseInt(yearFrom);
          if (!Number.isNaN(parsedFrom)) yearRange.gte = parsedFrom;
        }
        if (yearTo !== undefined) {
          const parsedTo = parseInt(yearTo);
          if (!Number.isNaN(parsedTo)) yearRange.lte = parsedTo;
        }
        if (Object.keys(yearRange).length > 0) {
          filter.push({ range: { year: yearRange } });
        }
      }

      const paperQuery = {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          ...(filter.length > 0 ? { filter } : {}),
        },
      };

      const paperSort =
        sort === 'newest'
          ? [{ createdAt: 'desc' }]
          : sort === 'oldest'
            ? [{ createdAt: 'asc' }]
            : sort === 'downloads'
              ? [{ downloadCount: 'desc' }]
              : undefined;

      const paperResults = await esClient.search({
        index: KMS_PAPERS_INDEX,
        body: {
          from,
          size,
          query: paperQuery,
          ...(paperSort ? { sort: paperSort } : {}),
          highlight: {
            fields: {
              title: {},
              abstract: { fragment_size: 200, number_of_fragments: 2 },
              authors: {},
              keywords: {},
            },
          },
        },
      });

      results.papers = {
        total: paperResults.hits.total.value,
        hits: paperResults.hits.hits.map((hit) => ({
          _id: hit._id,
          score: hit._score,
          ...hit._source,
          highlight: hit.highlight || {},
        })),
      };
    }

    res.status(200).json(results);
  } catch (error) {
    console.log('Error in search:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/search/suggest?q=...&type=posts|papers
 * Autocomplete / prefix suggestions
 */
const suggest = async (req, res) => {
  try {
    const { q, type = 'posts' } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Query parameter "q" is required.' });
    }

    if (type === 'all') {
      const [postsResult, papersResult] = await Promise.all([
        esClient.search({
          index: KMS_POSTS_INDEX,
          body: {
            size: 5,
            query: {
              match_phrase_prefix: { title: { query: q, max_expansions: 10 } },
            },
            _source: ['title'],
          },
        }),
        esClient.search({
          index: KMS_PAPERS_INDEX,
          body: {
            size: 5,
            query: {
              match_phrase_prefix: { title: { query: q, max_expansions: 10 } },
            },
            _source: ['title'],
          },
        }),
      ]);

      const postHits = postsResult.hits.hits.map((hit) => ({
        _id: hit._id,
        title: hit._source.title,
        type: 'post',
        _score: hit._score,
      }));
      const paperHits = papersResult.hits.hits.map((hit) => ({
        _id: hit._id,
        title: hit._source.title,
        type: 'paper',
        _score: hit._score,
      }));

      const merged = [...postHits, ...paperHits]
        .sort((a, b) => b._score - a._score)
        .slice(0, 5)
        .map(({ _score, ...rest }) => rest);

      return res.status(200).json(merged);
    }

    const index = type === 'papers' ? KMS_PAPERS_INDEX : KMS_POSTS_INDEX;
    const resultType = type === 'papers' ? 'paper' : 'post';

    const result = await esClient.search({
      index,
      body: {
        size: 5,
        query: {
          match_phrase_prefix: {
            title: {
              query: q,
              max_expansions: 10,
            },
          },
        },
        _source: ['title'],
      },
    });

    const suggestions = result.hits.hits.map((hit) => ({
      _id: hit._id,
      title: hit._source.title,
      type: resultType,
    }));

    res.status(200).json(suggestions);
  } catch (error) {
    console.log('Error in suggest:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export { search, suggest };
