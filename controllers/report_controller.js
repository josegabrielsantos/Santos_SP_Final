import Report from '../models/report_model.js';
import Post from '../models/post_model.js';
import User from '../models/user_model.js';
import Organization from '../models/organization_model.js';
import Notification from '../models/notification_model.js';
import { emitNotification, emitNotificationBulk } from '../socket.js';

/**
 * POST /api/reports
 * Submit a new report.
 */
export const createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body;
    const reporterId = req.user._id;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: 'targetType, targetId, and reason are required.' });
    }

    if (targetType !== 'post' && targetType !== 'user') {
      return res.status(400).json({ error: 'targetType must be "post" or "user".' });
    }

    // Duplicate check
    const existing = await Report.findOne({ reporterId, targetId });
    if (existing) {
      return res.status(409).json({ error: 'You have already reported this.' });
    }

    let organizationId = null;

    // Validate target exists and extract org
    if (targetType === 'post') {
      const post = await Post.findById(targetId);
      if (!post) return res.status(404).json({ error: 'Post not found.' });
      organizationId = post.organizationId || null;

      // Also update legacy reportedBy on the post
      if (!post.reportedBy.map(String).includes(reporterId.toString())) {
        post.reportedBy.push(reporterId);
        post.isReported = true;
        await post.save();
      }
    } else if (targetType === 'user') {
      const user = await User.findById(targetId);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      // User reports always go to super admin (organizationId stays null)
    }

    // Prevent self-reporting
    if (targetType === 'user' && targetId.toString() === reporterId.toString()) {
      return res.status(400).json({ error: 'You cannot report yourself.' });
    }

    const report = await Report.create({
      reporterId,
      targetType,
      targetId,
      organizationId,
      reason,
      details: details || null,
    });

    // Send notifications
    try {
      if (organizationId) {
        // Notify org admins + owner
        const org = await Organization.findById(organizationId).select('ownerId adminIds');
        if (org) {
          const adminIds = [org.ownerId, ...org.adminIds]
            .map((id) => id.toString())
            .filter((id) => id !== reporterId.toString());
          const uniqueAdminIds = [...new Set(adminIds)];

          for (const adminId of uniqueAdminIds) {
            await Notification.create({
              recipientId: adminId,
              senderId: reporterId,
              type: 'report_received',
              postId: targetType === 'post' ? targetId : null,
              organizationId,
              message: `A post in your organization has been reported for ${reason.replace('_', ' ')}.`,
            });
          }
          await emitNotificationBulk(uniqueAdminIds.map((id) => ({ toString: () => id })));
        }
      } else {
        // Notify super admins for org-less posts or user reports
        const superAdmins = await User.find({ role: 'website_admin' }).select('_id');
        const superAdminIds = superAdmins
          .map((u) => u._id.toString())
          .filter((id) => id !== reporterId.toString());

        for (const adminId of superAdminIds) {
          await Notification.create({
            recipientId: adminId,
            senderId: reporterId,
            type: 'report_received',
            message: targetType === 'post'
              ? `A post has been reported for ${reason.replace('_', ' ')}.`
              : `A user has been reported for ${reason.replace('_', ' ')}.`,
          });
        }
        await emitNotificationBulk(superAdminIds.map((id) => ({ toString: () => id })));
      }
    } catch (notifErr) {
      console.log('Error sending report notification:', notifErr.message);
    }

    res.status(201).json(report);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'You have already reported this.' });
    }
    console.log('Error in createReport:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/organizations/:id/reports
 * Get reports for an organization (org admin only).
 */
export const getOrgReports = async (req, res) => {
  try {
    const orgId = req.params.id;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { organizationId: orgId, targetType: 'post' };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('reporterId', 'displayName avatar')
        .populate('reviewedBy', 'displayName avatar')
        .populate({
          path: 'targetId',
          select: 'title bodyText authorId status',
          populate: { path: 'authorId', select: 'displayName avatar' },
        }),
      Report.countDocuments(filter),
    ]);

    const openCount = await Report.countDocuments({ organizationId: orgId, targetType: 'post', status: 'open' });

    res.status(200).json({ reports, total, openCount, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.log('Error in getOrgReports:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/admin/reports
 * Get all reports for super admin (user reports + org-less post reports).
 */
export const getAdminReports = async (req, res) => {
  try {
    const { status, targetType, page = 1, limit = 20 } = req.query;

    // Super admin sees: user reports (always) + post reports without an org
    const filter = {
      $or: [
        { targetType: 'user' },
        { targetType: 'post', organizationId: null },
      ],
    };

    if (targetType && targetType !== 'all') {
      // Override the $or if filtering by specific type
      delete filter.$or;
      if (targetType === 'user') {
        filter.targetType = 'user';
      } else if (targetType === 'post') {
        filter.targetType = 'post';
        filter.organizationId = null;
      }
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('reporterId', 'displayName avatar')
        .populate('reviewedBy', 'displayName avatar'),
      Report.countDocuments(filter),
    ]);

    // Manually populate targetId based on targetType
    const populatedReports = await Promise.all(
      reports.map(async (report) => {
        const obj = report.toObject();
        if (report.targetType === 'post') {
          obj.target = await Post.findById(report.targetId)
            .select('title bodyText authorId status')
            .populate('authorId', 'displayName avatar');
        } else if (report.targetType === 'user') {
          obj.target = await User.findById(report.targetId)
            .select('displayName avatar email bio');
        }
        return obj;
      })
    );

    const openCount = await Report.countDocuments({
      ...filter,
      status: 'open',
    });

    res.status(200).json({ reports: populatedReports, total, openCount, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.log('Error in getAdminReports:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * PATCH /api/reports/:reportId
 * Update report status (org admin for org reports, super admin for all).
 */
export const updateReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, reviewNote, actionTaken } = req.body;
    const userId = req.user._id;

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    // Authorization: org admin for org reports, super admin for org-less/user reports
    if (report.organizationId) {
      const org = await Organization.findById(report.organizationId).select('ownerId adminIds');
      if (!org) return res.status(404).json({ error: 'Organization not found.' });

      const isOrgAdmin =
        org.ownerId.toString() === userId.toString() ||
        org.adminIds.some((id) => id.toString() === userId.toString());
      const isWebAdmin = req.user.role === 'website_admin';

      if (!isOrgAdmin && !isWebAdmin) {
        return res.status(403).json({ error: 'Not authorized to update this report.' });
      }
    } else {
      if (req.user.role !== 'website_admin') {
        return res.status(403).json({ error: 'Only website admins can update this report.' });
      }
    }

    if (status) report.status = status;
    if (reviewNote !== undefined) report.reviewNote = reviewNote;
    if (actionTaken !== undefined) report.actionTaken = actionTaken;
    report.reviewedBy = userId;

    await report.save();

    res.status(200).json(report);
  } catch (error) {
    console.log('Error in updateReport:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};
