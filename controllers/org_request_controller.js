import OrgRequest from '../models/org_request_model.js';
import Organization from '../models/organization_model.js';
import User from '../models/user_model.js';
import Notification from '../models/notification_model.js';

/* ─── Helpers ───────────────────────────────────────────────────── */

async function notifyAdmins(senderId, type, message, orgRequestId) {
  const admins = await User.find({ role: 'website_admin', isActive: true }).select('_id');
  const notifications = admins
    .filter((a) => a._id.toString() !== senderId.toString())
    .map((a) => ({
      recipientId: a._id,
      senderId,
      type,
      message,
      orgRequestId,
    }));
  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }
}

/* ─── User: create request ──────────────────────────────────────── */

const createOrgRequest = async (req, res) => {
  try {
    const { orgName, orgDescription, orgAvatar, orgBannerImage } = req.body;

    if (!orgName || !orgName.trim()) {
      return res.status(400).json({ error: 'Organization name is required.' });
    }

    const request = new OrgRequest({
      requesterId: req.user._id,
      orgName: orgName.trim(),
      orgDescription: orgDescription?.trim() || '',
      orgAvatar: orgAvatar || null,
      orgBannerImage: orgBannerImage || null,
    });

    await request.save();

    const populated = await OrgRequest.findById(request._id)
      .populate('requesterId', 'displayName avatar');

    // Notify all admins
    await notifyAdmins(
      req.user._id,
      'org_request_submitted',
      `${req.user.displayName} submitted a request to create "${orgName.trim()}"`,
      request._id,
    );

    res.status(201).json(populated);
  } catch (error) {
    console.log('Error in createOrgRequest:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/* ─── User: list own requests ───────────────────────────────────── */

const getMyOrgRequests = async (req, res) => {
  try {
    const requests = await OrgRequest.find({ requesterId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('requesterId', 'displayName avatar')
      .populate('reviewedBy', 'displayName avatar')
      .populate('organizationId', 'name slug avatar')
      .populate('messages.senderId', 'displayName avatar');

    res.json({ requests });
  } catch (error) {
    console.log('Error in getMyOrgRequests:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/* ─── User: get single request ──────────────────────────────────── */

const getMyOrgRequest = async (req, res) => {
  try {
    const request = await OrgRequest.findOne({
      _id: req.params.id,
      requesterId: req.user._id,
    })
      .populate('requesterId', 'displayName avatar email')
      .populate('reviewedBy', 'displayName avatar')
      .populate('organizationId', 'name slug avatar')
      .populate('messages.senderId', 'displayName avatar');

    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    res.json(request);
  } catch (error) {
    console.log('Error in getMyOrgRequest:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/* ─── User: update request ──────────────────────────────────────── */

const updateMyOrgRequest = async (req, res) => {
  try {
    const request = await OrgRequest.findOne({
      _id: req.params.id,
      requesterId: req.user._id,
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    if (!['pending', 'needs_revision'].includes(request.status)) {
      return res.status(400).json({ error: 'This request can no longer be edited.' });
    }

    const { orgName, orgDescription, orgAvatar, orgBannerImage } = req.body;

    if (orgName !== undefined) request.orgName = orgName.trim();
    if (orgDescription !== undefined) request.orgDescription = orgDescription.trim();
    if (orgAvatar !== undefined) request.orgAvatar = orgAvatar || null;
    if (orgBannerImage !== undefined) request.orgBannerImage = orgBannerImage || null;

    // Reset status to pending after edits
    request.status = 'pending';

    await request.save();

    const populated = await OrgRequest.findById(request._id)
      .populate('requesterId', 'displayName avatar email')
      .populate('reviewedBy', 'displayName avatar')
      .populate('organizationId', 'name slug avatar')
      .populate('messages.senderId', 'displayName avatar');

    res.json(populated);
  } catch (error) {
    console.log('Error in updateMyOrgRequest:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/* ─── User: add message ─────────────────────────────────────────── */

const addRequesterMessage = async (req, res) => {
  try {
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Message body is required.' });
    }

    const request = await OrgRequest.findOne({
      _id: req.params.id,
      requesterId: req.user._id,
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    if (['approved', 'rejected'].includes(request.status)) {
      return res.status(400).json({ error: 'This request is already closed.' });
    }

    request.messages.push({
      senderId: req.user._id,
      senderRole: 'requester',
      body: body.trim(),
    });

    await request.save();

    // Notify admins
    await notifyAdmins(
      req.user._id,
      'org_request_reply',
      `${req.user.displayName} replied to their org request "${request.orgName}"`,
      request._id,
    );

    const populated = await OrgRequest.findById(request._id)
      .populate('requesterId', 'displayName avatar email')
      .populate('reviewedBy', 'displayName avatar')
      .populate('organizationId', 'name slug avatar')
      .populate('messages.senderId', 'displayName avatar');

    res.json(populated);
  } catch (error) {
    console.log('Error in addRequesterMessage:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/* ─── Admin: pending count ──────────────────────────────────────── */

const getPendingCount = async (req, res) => {
  try {
    const count = await OrgRequest.countDocuments({
      status: { $in: ['pending', 'needs_revision'] },
    });
    res.json({ count });
  } catch (error) {
    console.log('Error in getPendingCount:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/* ─── Admin: list all requests ──────────────────────────────────── */

const getAllOrgRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const filter = {};
    if (status && ['pending', 'needs_revision', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const [requests, total] = await Promise.all([
      OrgRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('requesterId', 'displayName avatar email')
        .populate('reviewedBy', 'displayName avatar')
        .populate('organizationId', 'name slug avatar'),
      OrgRequest.countDocuments(filter),
    ]);

    res.json({
      requests,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.log('Error in getAllOrgRequests:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/* ─── Admin: get single request ─────────────────────────────────── */

const getOrgRequestAdmin = async (req, res) => {
  try {
    const request = await OrgRequest.findById(req.params.id)
      .populate('requesterId', 'displayName avatar email')
      .populate('reviewedBy', 'displayName avatar')
      .populate('organizationId', 'name slug avatar')
      .populate('messages.senderId', 'displayName avatar');

    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    res.json(request);
  } catch (error) {
    console.log('Error in getOrgRequestAdmin:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/* ─── Admin: approve request ────────────────────────────────────── */

const approveOrgRequest = async (req, res) => {
  try {
    const request = await OrgRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    if (!['pending', 'needs_revision'].includes(request.status)) {
      return res.status(400).json({ error: 'This request has already been processed.' });
    }

    // Create the organization (same pattern as organization_controller createOrganization)
    const org = new Organization({
      name: request.orgName,
      description: request.orgDescription || '',
      bannerImage: request.orgBannerImage || null,
      avatar: request.orgAvatar || null,
      ownerId: request.requesterId,
      adminIds: [request.requesterId],
      memberIds: [],
      pendingMemberIds: [],
      followerIds: [],
    });

    await org.save();

    // Update request
    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.organizationId = org._id;
    await request.save();

    // Notify requester
    await Notification.create({
      recipientId: request.requesterId,
      senderId: req.user._id,
      type: 'org_request_approved',
      message: `Your request to create "${request.orgName}" has been approved`,
      orgRequestId: request._id,
      organizationId: org._id,
    });

    const populated = await OrgRequest.findById(request._id)
      .populate('requesterId', 'displayName avatar email')
      .populate('reviewedBy', 'displayName avatar')
      .populate('organizationId', 'name slug avatar')
      .populate('messages.senderId', 'displayName avatar');

    res.json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An organization with that name already exists.' });
    }
    console.log('Error in approveOrgRequest:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/* ─── Admin: reject request ─────────────────────────────────────── */

const rejectOrgRequest = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'A rejection reason is required.' });
    }

    const request = await OrgRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    if (!['pending', 'needs_revision'].includes(request.status)) {
      return res.status(400).json({ error: 'This request has already been processed.' });
    }

    request.status = 'rejected';
    request.reviewedBy = req.user._id;
    request.rejectionReason = reason.trim();
    await request.save();

    // Notify requester
    await Notification.create({
      recipientId: request.requesterId,
      senderId: req.user._id,
      type: 'org_request_rejected',
      message: `Your request to create "${request.orgName}" has been declined`,
      orgRequestId: request._id,
    });

    const populated = await OrgRequest.findById(request._id)
      .populate('requesterId', 'displayName avatar email')
      .populate('reviewedBy', 'displayName avatar')
      .populate('organizationId', 'name slug avatar')
      .populate('messages.senderId', 'displayName avatar');

    res.json(populated);
  } catch (error) {
    console.log('Error in rejectOrgRequest:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/* ─── Admin: send follow-up message ─────────────────────────────── */

const addAdminMessage = async (req, res) => {
  try {
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Message body is required.' });
    }

    const request = await OrgRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    if (['approved', 'rejected'].includes(request.status)) {
      return res.status(400).json({ error: 'This request is already closed.' });
    }

    request.messages.push({
      senderId: req.user._id,
      senderRole: 'admin',
      body: body.trim(),
    });

    // Set status to needs_revision
    if (request.status === 'pending') {
      request.status = 'needs_revision';
    }

    await request.save();

    // Notify requester
    await Notification.create({
      recipientId: request.requesterId,
      senderId: req.user._id,
      type: 'org_request_followup',
      message: `An admin sent a message about your org request "${request.orgName}"`,
      orgRequestId: request._id,
    });

    const populated = await OrgRequest.findById(request._id)
      .populate('requesterId', 'displayName avatar email')
      .populate('reviewedBy', 'displayName avatar')
      .populate('organizationId', 'name slug avatar')
      .populate('messages.senderId', 'displayName avatar');

    res.json(populated);
  } catch (error) {
    console.log('Error in addAdminMessage:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export {
  createOrgRequest,
  getMyOrgRequests,
  getMyOrgRequest,
  updateMyOrgRequest,
  addRequesterMessage,
  getPendingCount,
  getAllOrgRequests,
  getOrgRequestAdmin,
  approveOrgRequest,
  rejectOrgRequest,
  addAdminMessage,
};
