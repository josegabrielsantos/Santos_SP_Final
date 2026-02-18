import express from 'express';
import { 
    createPaper, 
    getPaperById, 
    updatePaper, 
    deletePaper, 
    searchPapers, 
    getPapersByAuthor, 
    getOrganizationPapers,
    bulkUploadPapers
} from '../controllers/paper_controller.js';
import { protectRouteUser, requireOrganizationAdmin, requireOrganizationOwner, requireOrganizationMember } from '../middleware/protectRoute.js';

const router = express.Router();

router.post('/create/:id', protectRouteUser, requireOrganizationAdmin, createPaper);
router.post('update/:id', protectRouteUser, requireOrganizationAdmin, updatePaper);
router.delete('delete/:id', protectRouteUser, requireOrganizationAdmin,deletePaper);

router.get('/search', protectRouteUser, requireOrganizationMember, searchPapers);
// router.get('/search-author', protectRouteUser, getPaperByAuthor);
// router.get('/search-keyword', protectRouteUser, getPaperByKeyword);
router.get('/get-organization-papers/:id', protectRouteUser, requireOrganizationMember, getOrganizationPapers);
router.get('/get-paper/:id', protectRouteUser, requireOrganizationMember, getPaperById);
router.get('/get-by-author/id', protectRouteUser, requireOrganizationMember, getPapersByAuthor);
router.post('/bulk-upload/:id', protectRouteUser, requireOrganizationAdmin, bulkUploadPapers);


export default router;