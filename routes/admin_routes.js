import express from 'express';
import { requireSuperAdmin, requireOrganizationOwner, protectRouteUser } from '../middleware/protectRoute.js';
import { createOrganization,
    updateOrganization,
    deleteOrganization,
    getAllOrganizations,
    getOrganizationById } from '../controllers/organization_controller.js';

const router = express.Router();

router.post("/organizations", protectRouteUser, requireSuperAdmin, createOrganization);
router.put("//organizations/:id", protectRouteUser, requireOrganizationOwner, updateOrganization);
router.delete("/organizations/:id", protectRouteUser, requireOrganizationOwner, deleteOrganization);
router.get("/organizations", protectRouteUser, requireSuperAdmin, getAllOrganizations);

export default router;