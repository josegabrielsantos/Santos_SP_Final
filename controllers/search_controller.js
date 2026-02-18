// controllers/search_controllers.js

import esClient from '../elastic/elastic_client.js';

// Global search across all content types
const globalSearch = async (req, res) => {
    try {
        const {
            query,
            page = 1,
            limit = 20,
            type, // 'users', 'organizations', 'papers', 'posts', or 'all'
            sortBy = 'relevance',
            filters = {}
        } = req.query;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({ error: "Search query must be at least 2 characters long." });
        }

        const from = (page - 1) * limit;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        // Build search query
        const searchQuery = {
            query: {
                bool: {
                    must: [
                        {
                            multi_match: {
                                query: query,
                                fields: [
                                    'title^3',
                                    'organizationName^3',
                                    'firstName^2',
                                    'lastName^2',
                                    'fullName^2',
                                    'content^2',
                                    'abstract^2',
                                    'description',
                                    'keywords',
                                    'tags',
                                    'authors.name',
                                    'journal'
                                ],
                                type: 'best_fields',
                                fuzziness: 'AUTO'
                            }
                        }
                    ],
                    filter: []
                }
            },
            sort: getSortOptions(sortBy),
            from: from,
            size: parseInt(limit),
            highlight: {
                fields: {
                    'title': {},
                    'content': {},
                    'abstract': {},
                    'description': {},
                    'organizationName': {},
                    'fullName': {}
                },
                pre_tags: ['<mark>'],
                post_tags: ['</mark>']
            }
        };

        // Add privacy filters
        if (!userId || userRole !== 'superAdmin') {
            searchQuery.query.bool.filter.push({
                term: { isPublic: true }
            });
        }

        // Add type filter
        const searchIndexes = getSearchIndexes(type);
        
        // Execute searches
        const searchPromises = searchIndexes.map(index => 
            esClient.search({
                index: index,
                body: searchQuery
            }).catch(error => {
                console.error(`Search error for ${index}:`, error);
                return { body: { hits: { hits: [], total: { value: 0 } } } };
            })
        );

        const searchResults = await Promise.all(searchPromises);
        
        // Process and combine results
        const combinedResults = {
            users: [],
            organizations: [],
            papers: [],
            posts: [],
            total: 0
        };

        searchIndexes.forEach((index, i) => {
            const result = searchResults[i];
            const hits = result.body?.hits?.hits || [];
            const total = result.body?.hits?.total?.value || 0;
            
            const processedHits = hits.map(hit => ({
                ...hit._source,
                id: hit._id,
                score: hit._score,
                highlights: hit.highlight || {},
                type: index.replace('s', '') // Remove 's' from index name
            }));

            if (index === 'users') {
                combinedResults.users = processedHits;
            } else if (index === 'organizations') {
                combinedResults.organizations = processedHits;
            } else if (index === 'papers') {
                combinedResults.papers = processedHits;
            } else if (index === 'posts') {
                combinedResults.posts = processedHits;
            }

            combinedResults.total += total;
        });

        // If searching all types, create a unified result set
        if (type === 'all' || !type) {
            const allResults = [
                ...combinedResults.users,
                ...combinedResults.organizations,
                ...combinedResults.papers,
                ...combinedResults.posts
            ].sort((a, b) => b.score - a.score).slice(0, parseInt(limit));

            res.status(200).json({
                query,
                results: allResults,
                breakdown: {
                    users: combinedResults.users.length,
                    organizations: combinedResults.organizations.length,
                    papers: combinedResults.papers.length,
                    posts: combinedResults.posts.length
                },
                total: combinedResults.total,
                pagination: {
                    current: parseInt(page),
                    limit: parseInt(limit),
                    hasNext: combinedResults.total > from + parseInt(limit)
                }
            });
        } else {
            // Return type-specific results
            const typeResults = combinedResults[type] || [];
            res.status(200).json({
                query,
                type,
                results: typeResults,
                total: typeResults.length,
                pagination: {
                    current: parseInt(page),
                    limit: parseInt(limit),
                    hasNext: typeResults.length === parseInt(limit)
                }
            });
        }

    } catch (error) {
        console.error('Global search error:', error);
        res.status(500).json({ error: "Search failed. Please try again." });
    }
};

// Advanced search with filters
const advancedSearch = async (req, res) => {
    try {
        const {
            query,
            type = 'all',
            page = 1,
            limit = 20,
            // Filters
            organizationId,
            category,
            paperType,
            status,
            dateFrom,
            dateTo,
            author,
            tags,
            fields,
            role,
            sortBy = 'relevance'
        } = req.query;

        const from = (page - 1) * limit;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        // Build advanced search query
        const searchQuery = {
            query: {
                bool: {
                    must: [],
                    filter: [],
                    should: []
                }
            },
            sort: getSortOptions(sortBy),
            from: from,
            size: parseInt(limit),
            aggs: buildAggregations(type)
        };

        // Add text query if provided
        if (query && query.trim().length > 0) {
            searchQuery.query.bool.must.push({
                multi_match: {
                    query: query,
                    fields: [
                        'title^3',
                        'organizationName^3',
                        'fullName^2',
                        'content^2',
                        'abstract^2',
                        'description',
                        'keywords',
                        'tags'
                    ],
                    type: 'best_fields',
                    fuzziness: 'AUTO'
                }
            });
        } else {
            searchQuery.query.bool.must.push({
                match_all: {}
            });
        }

        // Add filters
        addFilters(searchQuery.query.bool.filter, {
            organizationId,
            category,
            paperType,
            status,
            dateFrom,
            dateTo,
            author,
            tags,
            fields,
            role,
            userId,
            userRole
        });

        // Execute search
        const searchIndexes = getSearchIndexes(type);
        const searchResults = await Promise.all(
            searchIndexes.map(index => 
                esClient.search({
                    index: index,
                    body: searchQuery
                }).catch(error => {
                    console.error(`Advanced search error for ${index}:`, error);
                    return { body: { hits: { hits: [], total: { value: 0 } }, aggregations: {} } };
                })
            )
        );

        // Process results
        const results = processAdvancedSearchResults(searchResults, searchIndexes, type);

        res.status(200).json({
            query: query || '*',
            type,
            results: results.hits,
            aggregations: results.aggregations,
            total: results.total,
            pagination: {
                current: parseInt(page),
                limit: parseInt(limit),
                hasNext: results.total > from + parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Advanced search error:', error);
        res.status(500).json({ error: "Advanced search failed. Please try again." });
    }
};

// Get search suggestions/autocomplete
const getSearchSuggestions = async (req, res) => {
    try {
        const { query, type = 'all', limit = 10 } = req.query;

        if (!query || query.trim().length < 1) {
            return res.status(400).json({ error: "Query required for suggestions." });
        }

        const suggestionQuery = {
            suggest: {
                title_suggest: {
                    prefix: query,
                    completion: {
                        field: 'title.suggest',
                        size: parseInt(limit)
                    }
                },
                name_suggest: {
                    prefix: query,
                    completion: {
                        field: 'organizationName.suggest',
                        size: parseInt(limit)
                    }
                }
            }
        };

        const searchIndexes = getSearchIndexes(type);
        const suggestionResults = await Promise.all(
            searchIndexes.map(index => 
                esClient.search({
                    index: index,
                    body: suggestionQuery
                }).catch(() => ({ body: { suggest: {} } }))
            )
        );

        // Combine suggestions
        const suggestions = new Set();
        suggestionResults.forEach(result => {
            const suggests = result.body?.suggest || {};
            Object.values(suggests).forEach(suggestArray => {
                suggestArray.forEach(suggest => {
                    suggest.options?.forEach(option => {
                        suggestions.add(option.text);
                    });
                });
            });
        });

        res.status(200).json({
            query,
            suggestions: Array.from(suggestions).slice(0, parseInt(limit))
        });

    } catch (error) {
        console.error('Suggestions error:', error);
        res.status(500).json({ error: "Failed to get suggestions." });
    }
};

// Get search analytics
const getSearchAnalytics = async (req, res) => {
    try {
        const { timeframe = '30d', organizationId } = req.query;
        const userRole = req.user?.role;

        if (userRole !== 'superAdmin' && !organizationId) {
            return res.status(403).json({ error: "Access denied." });
        }

        // Build analytics query
        const analyticsQuery = {
            size: 0,
            query: {
                bool: {
                    filter: [
                        {
                            range: {
                                createdAt: {
                                    gte: getDateFromTimeframe(timeframe)
                                }
                            }
                        }
                    ]
                }
            },
            aggs: {
                content_types: {
                    terms: {
                        field: '_index',
                        size: 10
                    }
                },
                popular_terms: {
                    significant_text: {
                        field: 'content',
                        size: 20
                    }
                },
                activity_over_time: {
                    date_histogram: {
                        field: 'createdAt',
                        calendar_interval: timeframe.includes('d') ? 'day' : 'month'
                    }
                }
            }
        };

        if (organizationId) {
            analyticsQuery.query.bool.filter.push({
                term: { organizationId: organizationId }
            });
        }

        const analyticsResult = await esClient.search({
            index: 'users,organizations,papers,posts',
            body: analyticsQuery
        });

        res.status(200).json({
            timeframe,
            analytics: analyticsResult.body.aggregations
        });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: "Failed to get analytics." });
    }
};

// Helper functions
const getSearchIndexes = (type) => {
    const indexMap = {
        'users': ['users'],
        'organizations': ['organizations'],
        'papers': ['papers'],
        'posts': ['posts'],
        'all': ['users', 'organizations', 'papers', 'posts']
    };
    return indexMap[type] || indexMap['all'];
};

const getSortOptions = (sortBy) => {
    const sortMap = {
        'relevance': [{ '_score': { 'order': 'desc' } }],
        'date': [{ 'createdAt': { 'order': 'desc' } }],
        'name': [{ 'organizationName.keyword': { 'order': 'asc' } }, { 'fullName.keyword': { 'order': 'asc' } }],
        'engagement': [{ 'likeCount': { 'order': 'desc' } }, { 'citationCount': { 'order': 'desc' } }]
    };
    return sortMap[sortBy] || sortMap['relevance'];
};

const addFilters = (filters, params) => {
    const { organizationId, category, paperType, status, dateFrom, dateTo, author, tags, fields, role, userId, userRole } = params;

    // Privacy filter
    if (!userId || userRole !== 'superAdmin') {
        filters.push({ term: { isPublic: true } });
    }

    // Organization filter
    if (organizationId) {
        filters.push({ term: { organizationId: organizationId } });
    }

    // Category filter
    if (category) {
        filters.push({ term: { category: category } });
    }

    // Paper type filter
    if (paperType) {
        filters.push({ term: { paperType: paperType } });
    }

    // Status filter
    if (status) {
        filters.push({ term: { status: status } });
    }

    // Date range filter
    if (dateFrom || dateTo) {
        const dateFilter = { range: { createdAt: {} } };
        if (dateFrom) dateFilter.range.createdAt.gte = dateFrom;
        if (dateTo) dateFilter.range.createdAt.lte = dateTo;
        filters.push(dateFilter);
    }

    // Author filter
    if (author) {
        filters.push({
            nested: {
                path: 'authors',
                query: {
                    match: { 'authors.name': author }
                }
            }
        });
    }

    // Tags filter
    if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        filters.push({ terms: { tags: tagArray } });
    }

    // Fields filter
    if (fields) {
        const fieldArray = Array.isArray(fields) ? fields : [fields];
        filters.push({ terms: { fields: fieldArray } });
    }

    // Role filter
    if (role) {
        filters.push({ term: { role: role } });
    }
};

const buildAggregations = (type) => {
    const baseAggs = {
        content_types: {
            terms: { field: '_index' }
        }
    };

    if (type === 'all' || type === 'papers') {
        baseAggs.paper_types = {
            terms: { field: 'paperType' }
        };
        baseAggs.fields = {
            terms: { field: 'fields.keyword', size: 20 }
        };
    }

    if (type === 'all' || type === 'posts') {
        baseAggs.categories = {
            terms: { field: 'category' }
        };
        baseAggs.tags = {
            terms: { field: 'tags.keyword', size: 20 }
        };
    }

    if (type === 'all' || type === 'users') {
        baseAggs.roles = {
            terms: { field: 'role' }
        };
    }

    return baseAggs;
};

const processAdvancedSearchResults = (searchResults, searchIndexes, type) => {
    let allHits = [];
    let allAggregations = {};
    let totalResults = 0;

    searchResults.forEach((result, i) => {
        const hits = result.body?.hits?.hits || [];
        const total = result.body?.hits?.total?.value || 0;
        const aggregations = result.body?.aggregations || {};

        totalResults += total;

        // Process hits
        const processedHits = hits.map(hit => ({
            ...hit._source,
            id: hit._id,
            score: hit._score,
            type: searchIndexes[i].replace('s', '')
        }));

        allHits = allHits.concat(processedHits);

        // Merge aggregations
        Object.keys(aggregations).forEach(key => {
            if (!allAggregations[key]) {
                allAggregations[key] = aggregations[key];
            } else {
                // Merge bucket aggregations
                if (aggregations[key].buckets && allAggregations[key].buckets) {
                    allAggregations[key].buckets = allAggregations[key].buckets.concat(aggregations[key].buckets);
                }
            }
        });
    });

    // Sort combined results by score
    allHits.sort((a, b) => b.score - a.score);

    return {
        hits: allHits,
        aggregations: allAggregations,
        total: totalResults
    };
};

const getDateFromTimeframe = (timeframe) => {
    const now = new Date();
    const value = parseInt(timeframe);
    const unit = timeframe.replace(value.toString(), '');

    switch (unit) {
        case 'd':
            return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
        case 'm':
            return new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000);
        case 'y':
            return new Date(now.getTime() - value * 365 * 24 * 60 * 60 * 1000);
        default:
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    }
};

export {
    globalSearch,
    advancedSearch,
    getSearchSuggestions,
    getSearchAnalytics
};