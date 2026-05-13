import express from 'express';
import { search, suggest } from '../controllers/search_controller.js';

const router = express.Router();

router.get('/', search);
router.get('/suggest', suggest);

export default router;
