import express from 'express';
import {
  createPaper,
  getPapers,
  getPaper,
  updatePaper,
  deletePaper,
  downloadPaper,
  uploadPaperFile,
} from '../controllers/paper_controller.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router();

router.post('/upload', protectRoute, uploadPaperFile);
router.post('/', protectRoute, createPaper);
router.get('/', getPapers);
router.get('/:id', getPaper);
router.put('/:id', protectRoute, updatePaper);
router.delete('/:id', protectRoute, deletePaper);
router.post('/:id/download', downloadPaper);

export default router;
