import express from 'express';
import multer from 'multer';
import { protectRoute } from '../middleware/protectRoute.js';
import { uploadFile } from '../controllers/upload_controller.js';

const router = express.Router();

// Store files in memory (buffer) — they go straight to Spaces
// Allow all file types for maximum flexibility
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

// POST /api/upload  — requires authentication
router.post('/', protectRoute, upload.single('file'), uploadFile);

export default router;
