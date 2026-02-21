import jwt from 'jsonwebtoken';
import User from '../models/user_model.js';
import Organization from '../models/organization_model.js';

/**
 * Authenticate the request via JWT cookie.
 * Attaches req.user (full User document minus sensitive fields).
 */
export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No Token Provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Token.' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log('Error in protectRoute:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * Require the user to be a website_admin.
 */
export const requireWebsiteAdmin = (req, res, next) => {
  if (req.user.role !== 'website_admin') {
    return res.status(403).json({ error: 'Access denied. Website admin required.' });
  }
  next();
};

/**
 * Require the user to be one of the organization admins.
 * Expects :id param to contain the organization ID.
 * Website admins bypass the check.
 */
export const requireOrgAdmin = async (req, res, next) => {
  try {
    const orgId = req.params.id || req.params.orgId;
    const userId = req.user._id;

    // Website admin bypasses
    if (req.user.role === 'website_admin') {
      const organization = await Organization.findById(orgId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found.' });
      }
      req.organization = organization;
      return next();
    }

    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    const isAdmin = organization.adminIds.some(
      (aid) => aid.toString() === userId.toString()
    );

    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied. Organization admin required.' });
    }

    req.organization = organization;
    next();
  } catch (error) {
    console.log('Error in requireOrgAdmin:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * Require the user to be a member of the organization.
 * Expects :id param to contain the organization ID.
 * Admins and website admins also pass.
 */
export const requireOrgMember = async (req, res, next) => {
  try {
    const orgId = req.params.id || req.params.orgId;
    const userId = req.user._id;

    // Website admin bypasses
    if (req.user.role === 'website_admin') {
      const organization = await Organization.findById(orgId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found.' });
      }
      req.organization = organization;
      return next();
    }

    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    const isAdmin = organization.adminIds.some(
      (aid) => aid.toString() === userId.toString()
    );
    const isMember = organization.memberIds.some(
      (mid) => mid.toString() === userId.toString()
    );

    if (!isAdmin && !isMember) {
      return res.status(403).json({ error: 'Access denied. Organization membership required.' });
    }

    req.organization = organization;
    next();
  } catch (error) {
    console.log('Error in requireOrgMember:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};
