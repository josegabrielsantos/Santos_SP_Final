import express from 'express';
import { protectRouteUser, requireOrganizationAdmin } from '../middleware/protectRoute.js';
import { createPost } from '../controllers/post_controller.js';

const router = express.Router();

router.post('/create', protectRouteUser, requireOrganizationAdmin, createPost);
