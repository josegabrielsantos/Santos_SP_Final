import express from 'express';
import multer from 'multer';
import {
  createPaper,
  getPapers,
  getPaper,
  updatePaper,
  deletePaper,
  downloadPaper,
  uploadPaperFile,
  parsePdf,
  enrichDoi,
  bulkImportCsv,
  getRelatedPapers,
} from '../controllers/paper_controller.js';
import { protectRoute, optionalAuth } from '../middleware/protectRoute.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/upload', protectRoute, upload.single('file'), uploadPaperFile);
router.post('/parse-pdf', protectRoute, parsePdf);
router.post('/enrich-doi', protectRoute, enrichDoi);
router.post('/bulk-csv', protectRoute, upload.single('file'), bulkImportCsv);
router.post('/', protectRoute, createPaper);
router.get('/related', optionalAuth, getRelatedPapers);
router.get('/', optionalAuth, getPapers);
router.get('/:id', getPaper);
router.put('/:id', protectRoute, updatePaper);
router.delete('/:id', protectRoute, deletePaper);
router.post('/:id/download', downloadPaper);
router.get('/:id/download', downloadPaper);

export default router;
