import express from 'express';
import { 
    addMemberToOrganization, 
    removeMemberFromOrganization,
    followUnfollowOrganization, 
    getOrganizationById, 
    getOrganizationProfile, 
    getAllOrganizationsPublic, 
    searchOrganizations, 
    getOrganizationMembers, 
    getOrganizationFollowers, 
    getMyFollowedOrganizations, 
    getMyMemberOrganizations,
    leaveOrganization,
    bulkAddMembers,
    bulkRemoveMembers,
    addOrganizationAdmin,
    getOrganizationAdmins,
 } from '../controllers/organization_controller.js';

import {createPost, getOrganizationPosts, getOrganizationPendingPosts} from '../controllers/post_controller.js';
import { protectRouteUser, requireSuperAdmin, requireOrganizationAdmin, requireOrganizationOwner, requireOrganizationMember } from '../middleware/protectRoute.js';

const router = express.Router();

//adding removing members
router.post("/add-member/:id", protectRouteUser, requireOrganizationAdmin, addMemberToOrganization);
router.delete("/remove-member/:id", protectRouteUser, requireOrganizationAdmin, removeMemberFromOrganization);
router.post("/add-multiple-members/:id", protectRouteUser, requireOrganizationAdmin, bulkAddMembers);
router.post("/remove-multiple-members/:id", protectRouteUser, requireOrganizationAdmin, bulkRemoveMembers);

//getters
router.get("/organizations-by-id/:id", protectRouteUser, getOrganizationById);
router.get("/all-organizations", protectRouteUser, getAllOrganizationsPublic);
router.get("/profile/:id", protectRouteUser, getOrganizationProfile);
router.get("/:id/members", protectRouteUser, getOrganizationMembers);
router.get("/:id/admins", protectRouteUser, getOrganizationAdmins);
// router.get("/:id/posts", protectRouteUser, getOrganizationPosts);
// router.get("/:id/pending-posts", protectRouteUser, getOrganizationPendingPosts);
router.get("/:id/followers", protectRouteUser, getOrganizationFollowers);
router.get("/my/followed-organizations", protectRouteUser, getMyFollowedOrganizations);
router.get("/my/member-organizations", protectRouteUser, getMyMemberOrganizations);

router.post("/:id/admins", protectRouteUser, requireOrganizationOwner, addOrganizationAdmin);
router.delete("/:orgId/admins/:id", protectRouteUser, requireOrganizationOwner, addOrganizationAdmin);
router.post("/follow/:id", protectRouteUser, followUnfollowOrganization);
router.get("/search-organizations", protectRouteUser, searchOrganizations);
router.delete("/leave/:id", protectRouteUser, leaveOrganization);

//posts
router.post("/:id/create-post", protectRouteUser, requireOrganizationMember, createPost);
router.get("/:id/posts", protectRouteUser, getOrganizationPosts);
router.get("/:id/pending-posts", protectRouteUser, requireOrganizationAdmin,getOrganizationPendingPosts);

export default router;