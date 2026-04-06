import Post from '../models/post_model.js';
import Comment from '../models/comment_model.js';
import User from '../models/user_model.js';
import Organization from '../models/organization_model.js';
import FeaturedPost from '../models/featured_post_model.js';
import Notification from '../models/notification_model.js';
import UserActivity from '../models/user_activity_model.js';
import InsightCache from '../models/insight_cache_model.js';
import ModerationLog from '../models/moderation_log_model.js';
import { emitToHome, emitToPost, disconnectUser } from '../socket.js';
import { deleteFromSpaces, keyFromUrl } from '../lib/spaces.js';
import { deletePost as esDeletePost } from '../elastic/esSync.js';

// ─── Helper: create a moderation log entry ───────────────────────

async function logAction(performedBy, action, targetType, targetId, details = null, metadata = null) {
  try {
    await ModerationLog.create({ performedBy, action, targetType, targetId, details, metadata });
  } catch (err) {
    console.log('Error creating moderation log:', err.message);
  }
}

// ─── POST MODERATION ─────────────────────────────────────────────

/**
 * PATCH /api/admin/posts/:id/hide
 * Toggle post hidden status (website_admin or org admin of the post's org)
 */
const toggleHidePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    // Org admin authorization: verify the post belongs to their org
    if (req.user.role !== 'website_admin') {
      if (!post.organizationId) return res.status(403).json({ error: 'Access denied.' });
      const org = await Organization.findById(post.organizationId).select('adminIds');
      const isOrgAdmin = org?.adminIds.some((aid) => aid.toString() === req.user._id.toString());
      if (!isOrgAdmin) return res.status(403).json({ error: 'Access denied. Organization admin required.' });
    }

    const wasPublished = post.status === 'published';
    const wasHidden = post.status === 'hidden';

    if (wasPublished) {
      post.status = 'hidden';
      await post.save();

      // Decrement org postCount
      if (post.organizationId) {
        await Organization.findByIdAndUpdate(post.organizationId, { $inc: { postCount: -1 } });
      }

      await logAction(req.user._id, 'post_hidden', 'post', post._id, req.body.reason || null, {
        title: post.title,
        authorId: post.authorId.toString(),
      });

      emitToHome('post:deleted', { postId: post._id.toString() });
      res.status(200).json({ message: 'Post hidden.', status: 'hidden' });
    } else if (wasHidden) {
      post.status = 'published';
      if (!post.publishedAt) post.publishedAt = new Date();
      await post.save();

      // Increment org postCount
      if (post.organizationId) {
        await Organization.findByIdAndUpdate(post.organizationId, { $inc: { postCount: 1 } });
      }

      await logAction(req.user._id, 'post_unhidden', 'post', post._id, null, {
        title: post.title,
        authorId: post.authorId.toString(),
      });

      emitToHome('post:new', { postId: post._id.toString() });
      res.status(200).json({ message: 'Post unhidden.', status: 'published' });
    } else {
      return res.status(400).json({ error: `Cannot toggle hide on a post with status "${post.status}".` });
    }
  } catch (error) {
    console.log('Error in toggleHidePost:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * DELETE /api/admin/posts/:id
 * Hard delete any post (website_admin or org admin of the post's org). Logs the action.
 */
const adminDeletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('authorId', 'displayName');
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    // Org admin authorization: verify the post belongs to their org
    if (req.user.role !== 'website_admin') {
      if (!post.organizationId) return res.status(403).json({ error: 'Access denied.' });
      const org = await Organization.findById(post.organizationId).select('adminIds');
      const isOrgAdmin = org?.adminIds.some((aid) => aid.toString() === req.user._id.toString());
      if (!isOrgAdmin) return res.status(403).json({ error: 'Access denied. Organization admin required.' });
    }

    const postTitle = post.title;
    const authorName = post.authorId?.displayName || 'Unknown';
    const authorId = post.authorId?._id?.toString() || post.authorId?.toString();

    // Decrement org postCount if was published
    if (post.status === 'published' && post.organizationId) {
      await Organization.findByIdAndUpdate(post.organizationId, { $inc: { postCount: -1 } });
    }

    // Remove associated comments
    await Comment.deleteMany({ postId: post._id });

    // Remove from featured
    await FeaturedPost.deleteOne({ postId: post._id });

    // Remove notifications referencing this post
    await Notification.deleteMany({ postId: post._id });

    // Remove user activities for this post
    await UserActivity.deleteMany({ targetId: post._id });

    // Remove insight caches for this post
    await InsightCache.deleteMany({ postId: post._id });

    // Delete S3 files (media URLs) — best-effort
    const s3Keys = (post.mediaUrls || []).map(keyFromUrl).filter(Boolean);
    await Promise.allSettled(s3Keys.map((key) => deleteFromSpaces(key)));

    // Remove from Elasticsearch
    await esDeletePost(post._id.toString());

    await Post.findByIdAndDelete(post._id);

    await logAction(req.user._id, 'post_deleted', 'post', post._id, req.body.reason || null, {
      title: postTitle,
      authorName,
      authorId,
    });

    emitToHome('post:deleted', { postId: post._id.toString() });

    res.status(200).json({ message: 'Post deleted.' });
  } catch (error) {
    console.log('Error in adminDeletePost:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

// ─── COMMENT MODERATION ─────────────────────────────────────────

/**
 * PATCH /api/admin/comments/:id/hide
 * Toggle comment isHidden (website_admin or org admin of the comment's post org)
 */
const toggleHideComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).populate('authorId', 'displayName');
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });

    // Org admin authorization: verify the comment belongs to a post in their org
    if (req.user.role !== 'website_admin') {
      const post = await Post.findById(comment.postId).select('organizationId');
      if (!post?.organizationId) return res.status(403).json({ error: 'Access denied.' });
      const org = await Organization.findById(post.organizationId).select('adminIds');
      const isOrgAdmin = org?.adminIds.some((aid) => aid.toString() === req.user._id.toString());
      if (!isOrgAdmin) return res.status(403).json({ error: 'Access denied. Organization admin required.' });
    }

    comment.isHidden = !comment.isHidden;
    await comment.save();

    const action = comment.isHidden ? 'comment_hidden' : 'comment_unhidden';
    await logAction(req.user._id, action, 'comment', comment._id, req.body.reason || null, {
      postId: comment.postId.toString(),
      authorName: comment.authorId?.displayName || 'Unknown',
      bodyPreview: comment.body.slice(0, 100),
    });

    emitToPost(comment.postId.toString(), 'comment:updated', {
      postId: comment.postId.toString(),
      commentId: comment._id.toString(),
    });

    res.status(200).json({ message: comment.isHidden ? 'Comment hidden.' : 'Comment unhidden.', isHidden: comment.isHidden });
  } catch (error) {
    console.log('Error in toggleHideComment:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * DELETE /api/admin/comments/:id
 * Soft-delete a comment (website_admin or org admin of the comment's post org). Logs the action.
 */
const adminDeleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).populate('authorId', 'displayName');
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });

    // Org admin authorization: verify the comment belongs to a post in their org
    if (req.user.role !== 'website_admin') {
      const post = await Post.findById(comment.postId).select('organizationId');
      if (!post?.organizationId) return res.status(403).json({ error: 'Access denied.' });
      const org = await Organization.findById(post.organizationId).select('adminIds');
      const isOrgAdmin = org?.adminIds.some((aid) => aid.toString() === req.user._id.toString());
      if (!isOrgAdmin) return res.status(403).json({ error: 'Access denied. Organization admin required.' });
    }

    const postId = comment.postId.toString();
    const authorName = comment.authorId?.displayName || 'Unknown';
    const bodyPreview = comment.body.slice(0, 100);

    // Soft-delete (keep thread structure)
    comment.isDeleted = true;
    comment.body = '[deleted by admin]';
    await comment.save();

    // Decrement post commentCount
    await Post.findByIdAndUpdate(comment.postId, { $inc: { commentCount: -1 } });

    await logAction(req.user._id, 'comment_deleted', 'comment', comment._id, req.body.reason || null, {
      postId,
      authorName,
      bodyPreview,
    });

    emitToPost(postId, 'comment:deleted', {
      postId,
      commentId: comment._id.toString(),
    });

    res.status(200).json({ message: 'Comment deleted.' });
  } catch (error) {
    console.log('Error in adminDeleteComment:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

// ─── USER BANNING ────────────────────────────────────────────────

/**
 * PATCH /api/admin/users/:id/ban
 * Ban or unban a user (website_admin only)
 */
const toggleBanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Prevent self-ban
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot ban yourself.' });
    }

    // Prevent banning other admins
    if (user.role === 'website_admin') {
      return res.status(400).json({ error: 'Cannot ban another website admin.' });
    }

    const wasBanned = user.isBanned;
    user.isBanned = !wasBanned;
    user.banReason = wasBanned ? null : (req.body.reason || 'No reason provided.');
    await user.save();

    // Force-disconnect banned user so they can't receive real-time updates
    if (user.isBanned) {
      disconnectUser(user._id.toString());
    }

    const action = user.isBanned ? 'user_banned' : 'user_unbanned';
    await logAction(req.user._id, action, 'user', user._id, user.banReason, {
      displayName: user.displayName,
      email: user.email,
    });

    res.status(200).json({
      _id: user._id,
      isBanned: user.isBanned,
      banReason: user.banReason,
    });
  } catch (error) {
    console.log('Error in toggleBanUser:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

// ─── MODERATION LOGS ─────────────────────────────────────────────

/**
 * GET /api/admin/moderation-logs
 * Get paginated moderation logs (website_admin only)
 */
const getModerationLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.action) filter.action = req.query.action;
    if (req.query.targetType) filter.targetType = req.query.targetType;

    const [logs, total] = await Promise.all([
      ModerationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('performedBy', 'displayName avatar'),
      ModerationLog.countDocuments(filter),
    ]);

    res.status(200).json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.log('Error in getModerationLogs:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export {
  toggleHidePost,
  adminDeletePost,
  toggleHideComment,
  adminDeleteComment,
  toggleBanUser,
  getModerationLogs,
  logAction,
};
