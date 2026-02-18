import express from 'express';
import { protectRouteUser } from '../middleware/protectRoute.js';
import {getMe,
        getUserProfile, 
        updateUserProfile, 
        getUserFollowedOrganizations,
        getUserMemberships,
        getUserLikedPosts,
        getUserPosts,
        getMyMemberships,
        getMyPosts,
        getMyLikedPosts,
        getMyFollowedOrganizations,
        getMyPendingPosts
} from '../controllers/user_controller.js';

const router = express.Router();

router.get("/me", protectRouteUser, getMe);
router.get("/my-posts", protectRouteUser, getMyPosts);
router.get("/my-memberships", protectRouteUser, getMyMemberships);
router.get("/my-liked-posts", protectRouteUser, getMyLikedPosts);
router.get("/my-followed-organizations", protectRouteUser, getMyFollowedOrganizations);
router.post("/update", protectRouteUser, updateUserProfile);
router.get("/my-pending-posts", protectRouteUser, getMyPendingPosts);

router.get("/:id/profile/", protectRouteUser, getUserProfile);
router.get("/:id/followed-organizations", protectRouteUser, getUserFollowedOrganizations);
router.get("/:id/memberships", protectRouteUser, getUserMemberships);
router.get("/:id/liked-posts", protectRouteUser, getUserLikedPosts);
router.get("/:id/posts", protectRouteUser, getUserPosts);

export default router;