import express from 'express';
import multer from 'multer';
import { protectRoute } from '../middleware/protectRoute.js';
import { uploadFile } from '../controllers/upload_controller.js';

const router = express.Router();

// Allowed MIME types
const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'application/pdf',
];

// Store files in memory (buffer) — they go straight to Spaces
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed.`));
    }
  },
});

// POST /api/upload  — requires authentication
router.post('/', protectRoute, upload.single('file'), uploadFile);

export default router;
