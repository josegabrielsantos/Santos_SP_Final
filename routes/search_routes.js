// routes/searchRoutes.js

import express from 'express';
import {
    globalSearch,
    advancedSearch,
    getSearchSuggestions,
    getSearchAnalytics
} from '../controllers/search_controller.js';

import {
    protectRouteUser,
    requireOrganizationAdmin,
    requireSuperAdmin
} from '../middleware/protectRoute.js';

const  router = express.Router();

// PUBLIC SEARCH ROUTES (no authentication required)
router.get('/global', globalSearch);                    // Global search across all content
router.get('/suggestions', getSearchSuggestions);       // Autocomplete suggestions

// AUTHENTICATED SEARCH ROUTES
router.get('/advanced', protectRouteUser, advancedSearch);  // Advanced search with filters

// ADMIN SEARCH ROUTES (super admin or organization admin)
router.get('/analytics', protectRouteUser, requireOrganizationAdmin, getSearchAnalytics);

// Middleware for search analytics permission
const requireSearchAnalyticsPermission = async (req, res, next) => {
    try {
        const userRole = req.user.role;
        const { organizationId } = req.query;

        // Super admin can access all analytics
        if (userRole === 'superAdmin') {
            return next();
        }

        // For organization-specific analytics, check if user is admin of that org
        if (organizationId) {
            const Organization = (await import('../models/organization_model.js')).default;
            const organization = await Organization.findById(organizationId);
            
            if (!organization) {
                return res.status(404).json({ error: "Organization not found." });
            }

            const userId = req.user._id;
            const isOwner = organization.owner.toString() === userId.toString();
            const isAdmin = organization.admins.includes(userId);

            if (!isOwner && !isAdmin) {
                return res.status(403).json({ 
                    error: "Access denied. Organization admin required for analytics." 
                });
            }

            return next();
        }

        // Without organizationId, only super admin can access global analytics
        return res.status(403).json({ 
            error: "Access denied. Super admin required for global analytics." 
        });

    } catch (error) {
        console.log("Error in requireSearchAnalyticsPermission", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

export default router;

/*
COMPLETE SEARCH ENDPOINT LIST:

PUBLIC ROUTES:
GET /search/global
- Global search across users, organizations, papers, posts
- Query params: query, page, limit, type, sortBy, filters
- Returns: combined results with relevance scoring

GET /search/suggestions  
- Autocomplete suggestions for search queries
- Query params: query, type, limit
- Returns: suggested search terms

AUTHENTICATED ROUTES:
GET /search/advanced
- Advanced search with detailed filtering
- Query params: query, type, page, limit, organizationId, category, paperType, status, dateFrom, dateTo, author, tags, fields, role, sortBy
- Returns: filtered results with aggregations

ADMIN ROUTES:
GET /search/analytics
- Search analytics and insights
- Query params: timeframe, organizationId
- Returns: search metrics, popular terms, activity trends
- Permissions: Super admin (global) or organization admin (org-specific)

SEARCH FEATURES:
✅ Full-text search across all content types
✅ Fuzzy matching for typos
✅ Relevance scoring and ranking  
✅ Advanced filtering by multiple criteria
✅ Autocomplete suggestions
✅ Search analytics and insights
✅ Permission-based result filtering
✅ Highlighting of matching terms
✅ Pagination and sorting options
✅ Cross-index search capabilities

USAGE EXAMPLES:

Global Search:
GET /search/global?query=machine learning&type=papers&limit=10

Advanced Search:
GET /search/advanced?query=nutrition&organizationId=123&paperType=research&dateFrom=2024-01-01

Suggestions:
GET /search/suggestions?query=mach&limit=5

Analytics:
GET /search/analytics?timeframe=30d&organizationId=123
*/