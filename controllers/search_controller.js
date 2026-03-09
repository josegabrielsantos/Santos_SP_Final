import esClient from '../elastic/elastic_client.js';

const KMS_POSTS_INDEX = 'kms_posts';
const KMS_PAPERS_INDEX = 'kms_papers';

/**
 * GET /api/search?q=...&type=posts|papers|all&page=1&limit=20
 * Unified search across posts and/or papers.
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
    } = req.query;

    const hasGeneralQuery = q.trim().length > 0;
    const hasPaperCriteria =
      hasGeneralQuery ||
      !!title?.trim() ||
      !!author?.trim() ||
      !!tags?.trim() ||
      yearFrom !== undefined ||
      yearTo !== undefined;

    if ((type === 'posts' || type === 'all') && !hasGeneralQuery) {
      return res.status(400).json({ error: 'Query parameter "q" is required for posts search.' });
    }

    if (type === 'papers' && !hasPaperCriteria) {
      return res.status(400).json({ error: 'At least one papers search criterion is required.' });
    }

    const from = (parseInt(page) - 1) * parseInt(limit);
    const size = parseInt(limit);
    const results = {};

    if (type === 'posts' || type === 'all') {
      const postResults = await esClient.search({
        index: KMS_POSTS_INDEX,
        body: {
          from,
          size,
          query: {
            multi_match: {
              query: q,
              fields: ['title^3', 'bodyText^2', 'tags'],
              fuzziness: 'AUTO',
            },
          },
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

    const index = type === 'papers' ? KMS_PAPERS_INDEX : KMS_POSTS_INDEX;
    const field = type === 'papers' ? 'title' : 'title';

    const result = await esClient.search({
      index,
      body: {
        size: 5,
        query: {
          match_phrase_prefix: {
            [field]: {
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
    }));

    res.status(200).json(suggestions);
  } catch (error) {
    console.log('Error in suggest:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export { search, suggest };
