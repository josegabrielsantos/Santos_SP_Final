import express from 'express';
import { createReport, updateReport } from '../controllers/report_controller.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router();

// Submit a report
router.post('/', protectRoute, createReport);

// Update a report (auth checked in controller — org admin or super admin)
router.patch('/:reportId', protectRoute, updateReport);

export default router;
