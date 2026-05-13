import express from 'express';
import { googleAuth, getMe, logout } from '../controllers/auth_controller.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router();

router.post('/google', googleAuth);
router.get('/me', protectRoute, getMe);
router.post('/logout', logout);

export default router;
