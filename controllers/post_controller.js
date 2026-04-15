import Post from '../models/post_model.js';
import Paper from '../models/paper_model.js';
import Comment from '../models/comment_model.js';
import Notification from '../models/notification_model.js';
import FeaturedPost from '../models/featured_post_model.js';
import Organization from '../models/organization_model.js';
import UserActivity from '../models/user_activity_model.js';
import InsightCache from '../models/insight_cache_model.js';
import User from '../models/user_model.js';
import { emitNotification, emitNotificationBulk, emitToPost, emitToHome } from '../socket.js';
import { deleteFromSpaces, keyFromUrl } from '../lib/spaces.js';
import { deletePost as esDeletePost } from '../elastic/esSync.js';
import { classifyTopicsWithGemini } from '../lib/util/gemini_topic_classifier.js';
import { findDuplicates } from './paper_controller.js';

/**
 * Helper: check org-level access for a post interaction.
 * Returns { role, allowed, canComment } or throws HTTP-friendly object.
 *   role: 'member' | 'follower' | 'none'
 *   allowed    – can like / dislike
 *   canComment – can comment / reply
 */
async function checkOrgAccess(post, userId) {
  if (!post.organizationId) return { role: 'member', allowed: true, canComment: true };

  const orgId = typeof post.organizationId === 'object' ? (post.organizationId._id || post.organizationId) : post.organizationId;
  const org = await Organization.findById(orgId);
  if (!org) return { role: 'member', allowed: true, canComment: true }; // org deleted → fallback open

  const uid = userId.toString();
  const isMemberOrAdmin =
    org.ownerId.toString() === uid ||
    org.adminIds.map(String).includes(uid) ||
    org.memberIds.map(String).includes(uid);

  if (isMemberOrAdmin) return { role: 'member', allowed: true, canComment: true };

  const isFollower = org.followerIds.map(String).includes(uid);
  if (isFollower) return { role: 'follower', allowed: true, canComment: false };

  return { role: 'none', allowed: false, canComment: false };
}

/*  POST CRUD  */

/**
 * POST /api/posts
 */
const createPost = async (req, res) => {
  try {
    const { title, body, bodyText, tags, organizationId, type, status, mediaUrls, paperIds, poll, paperMetadata, topics: clientTopics } = req.body;
    const normalizedType = type === 'paper_share' ? 'research_paper' : (type || 'post');

    if (!title) return res.status(400).json({ error: 'Title is required.' });

    // ── Announcements: admin-only, force fields ──
    if (normalizedType === 'announcement') {
      if (req.user.role !== 'website_admin') {
        return res.status(403).json({ error: 'Only website admins can create announcements.' });
      }
    }

    if (normalizedType === 'research_paper') {
      if (!organizationId) {
        return res.status(400).json({ error: 'Research paper posts must belong to an organization.' });
      }

      const researchTitle = paperMetadata?.researchTitle?.trim();
      const authors = (paperMetadata?.authors || []).map((a) => a?.trim()).filter(Boolean);
      const abstract = paperMetadata?.abstract?.trim();
      const datePublished = paperMetadata?.datePublished;
      const journal = paperMetadata?.journal?.trim();

      if (!researchTitle || !abstract || !authors.length || !datePublished || !journal) {
        return res.status(400).json({
          error: 'Research paper posts require research title, abstract, at least one author, publication date, and journal.',
        });
      }

      // Check for duplicate papers unless explicitly skipped
      if (!req.body.skipDuplicateCheck) {
        const pubYear = datePublished ? new Date(datePublished).getFullYear() : null;
        const duplicates = await findDuplicates({
          title: researchTitle,
          doi: paperMetadata?.doi,
          year: Number.isNaN(pubYear) ? null : pubYear,
          organizationId,
        });
        if (duplicates.length > 0) {
          return res.status(409).json({
            error: 'Potential duplicate paper detected.',
            duplicates: duplicates.map((d) => ({
              _id: d._id,
              title: d.title,
              authors: d.authors,
              year: d.year,
              doi: d.doi,
              journal: d.journal,
              organizationId: d.organizationId,
              uploadedBy: d.uploadedBy,
              createdAt: d.createdAt,
            })),
          });
        }
      }
    }

    // If posting to an org, verify membership
    if (organizationId) {
      const org = await Organization.findById(organizationId);
      if (!org) return res.status(404).json({ error: 'Organization not found.' });
      const uid = req.user._id.toString();
      const isMember = org.adminIds.map(String).includes(uid) || org.memberIds.map(String).includes(uid);
      if (!isMember && req.user.role !== 'website_admin') {
        return res.status(403).json({ error: 'You are not a member of this organization.' });
      }
    }

    // Announcements always publish immediately, no org, no tags, no poll, no paper metadata.
    const isAnnouncement = normalizedType === 'announcement';

    // Org-scoped posts always enter the approval pipeline regardless of client-supplied status.
    // Personal posts (no org) use client status, defaulting to 'published'.
    // Announcements always publish immediately.
    const resolvedStatus = isAnnouncement ? 'published' : organizationId ? 'pending' : (status || 'published');

    // Use Gemini-classified topics if provided (from PDF extraction), otherwise let pre-save hook handle it.
    const resolvedTopics = Array.isArray(clientTopics) && clientTopics.length > 0 ? clientTopics : [];

    const post = new Post({
      title,
      body: body || null,
      bodyText: bodyText || '',
      tags: isAnnouncement ? [] : (tags || []),
      topics: resolvedTopics,
      authorId: req.user._id,
      organizationId: isAnnouncement ? null : (organizationId || null),
      type: normalizedType,
      status: resolvedStatus,
      mediaUrls: mediaUrls || [],
      paperIds: isAnnouncement ? [] : (paperIds || []),
      poll: isAnnouncement ? undefined : (poll || undefined),
      paperMetadata: (normalizedType === 'research_paper' && paperMetadata)
        ? {
            researchTitle: paperMetadata.researchTitle || null,
            datePublished: paperMetadata.datePublished || null,
            journal: paperMetadata.journal || null,
            doi: paperMetadata.doi || null,
            isbn: paperMetadata.isbn || null,
            authors: (paperMetadata.authors || []).map((a) => a.trim()).filter(Boolean),
            abstract: paperMetadata.abstract || null,
          }
        : null,
      publishedAt: (resolvedStatus === 'published') ? new Date() : null,
    });

    await post.save();

    if (normalizedType === 'research_paper' && post.paperMetadata) {
      const firstPdfUrl = (mediaUrls || []).find((url) => /\.pdf/i.test(url)) || null;
      const publicationDate = new Date(post.paperMetadata.datePublished);
      const paper = new Paper({
        title: post.paperMetadata.researchTitle || post.title,
        authors: post.paperMetadata.authors,
        abstract: post.paperMetadata.abstract,
        keywords: tags || [],
        topics: resolvedTopics,
        doi: post.paperMetadata.doi || null,
        isbn: post.paperMetadata.isbn || null,
        publicationDate: Number.isNaN(publicationDate.getTime()) ? null : publicationDate,
        year: Number.isNaN(publicationDate.getTime()) ? null : publicationDate.getFullYear(),
        journal: post.paperMetadata.journal,
        fileUrl: firstPdfUrl,
        fileSize: null,
        uploadedBy: req.user._id,
        organizationId: organizationId || null,
        sourcePostId: post._id,
      });

      await paper.save();
      post.paperIds = [paper._id];
      await post.save();
    }

    // Increment org postCount
    if (organizationId && post.status === 'published') {
      await Organization.findByIdAndUpdate(organizationId, { $inc: { postCount: 1 } });
    }

    // ── Bulk notify all users for announcements (fire-and-forget) ──
    if (isAnnouncement && post.status === 'published') {
      (async () => {
        try {
          const activeUsers = await User.find(
            { isActive: true, _id: { $ne: req.user._id } },
            { _id: 1 }
          ).lean();

          const notifications = activeUsers.map((u) => ({
            recipientId: u._id,
            senderId: req.user._id,
            type: 'announcement',
            postId: post._id,
            message: `New announcement: ${post.title}`,
            isRead: false,
          }));

          if (notifications.length > 0) {
            await Notification.insertMany(notifications, { ordered: false });
          }
          console.log(`[Announcement] Notified ${notifications.length} users for post ${post._id}`);
          emitNotificationBulk(activeUsers.map((u) => u._id));
        } catch (err) {
          console.error('[Announcement] Failed to send bulk notifications:', err.message);
        }
      })();
    }

    // Emit real-time event for home feed
    if (post.status === 'published') {
      emitToHome('post:new', { postId: post._id.toString() });
    }

    // ── Async Gemini topic classification for non-research posts (fire-and-forget) ──
    // Research papers already have Gemini topics from PDF extraction.
    // For all other post types, run a lightweight Gemini call in the background.
    if (normalizedType !== 'research_paper' && normalizedType !== 'announcement' && resolvedTopics.length === 0) {
      (async () => {
        try {
          const geminiTopics = await classifyTopicsWithGemini(title, bodyText, tags || []);
          if (geminiTopics.length > 0) {
            await Post.findByIdAndUpdate(post._id, { topics: geminiTopics });
            console.log(`[Gemini][post-classify] Post ${post._id} classified: [${geminiTopics.join(', ')}]`);
          }
        } catch (err) {
          console.error(`[Gemini][post-classify] Failed for post ${post._id}:`, err.message);
          // Keyword classifier fallback already ran in pre-save hook, so post still has topics.
        }
      })();
    }

    res.status(201).json(post);
  } catch (error) {
    console.log('Error in createPost:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/posts
 * Public feed of published posts
 */
const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const tag = req.query.tag;
    const type = req.query.type;
    const sort = req.query.sort || 'hot'; // 'hot' | 'new' | 'top'

    const topic = req.query.topic;

    const filter = { status: 'published' };
    if (tag) filter.tags = tag;
    if (type) filter.type = type;
    if (topic) filter.topics = topic;

    // Determine sort order
    let sortOrder;
    switch (sort) {
      case 'new':
        sortOrder = { publishedAt: -1 };
        break;
      case 'top':
        sortOrder = { likeCount: -1, publishedAt: -1 };
        break;
      case 'hot':
      default:
        sortOrder = { hotScore: -1, publishedAt: -1 };
        break;
    }

    const posts = await Post.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'displayName avatar')
      .populate('organizationId', 'name slug avatar');

    const total = await Post.countDocuments(filter);

    res.status(200).json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.log('Error in getPosts:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/posts/:id
 */
const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('authorId', 'displayName avatar')
      .populate('organizationId', 'name slug avatar');

    if (!post) return res.status(404).json({ error: 'Post not found.' });

    // Hide non-published from non-owners
    if (post.status !== 'published') {
      const isOwner = req.user && post.authorId._id.toString() === req.user._id.toString();
      const isAdmin = req.user && req.user.role === 'website_admin';
      if (!isOwner && !isAdmin) {
        return res.status(404).json({ error: 'Post not found.' });
      }
    }

    res.status(200).json(post);
  } catch (error) {
    console.log('Error in getPost:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * PUT /api/posts/:id
 */
const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const isOwner = post.authorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'website_admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    const { title, body, bodyText, tags, status, mediaUrls, paperIds, poll } = req.body;
    const wasDraft = post.status !== 'published';

    if (title !== undefined) post.title = title;
    if (body !== undefined) post.body = body;
    if (bodyText !== undefined) post.bodyText = bodyText;
    if (tags !== undefined) post.tags = tags;
    if (mediaUrls !== undefined) post.mediaUrls = mediaUrls;
    if (paperIds !== undefined) post.paperIds = paperIds;
    if (poll !== undefined) post.poll = poll;
    if (status !== undefined && status !== post.status) {
      // Block org post authors from self-publishing pending posts.
      // Only org admins or website admins may change status on org-scoped posts.
      if (post.organizationId) {
        const org = await Organization.findById(post.organizationId).select('ownerId adminIds');
        const isOrgAdmin = org && (
          org.ownerId.toString() === req.user._id.toString() ||
          (org.adminIds || []).some((id) => id.toString() === req.user._id.toString())
        );
        if (!isOrgAdmin && !isAdmin) {
          return res.status(403).json({ error: 'Only organization admins can change post status.' });
        }
      }
      post.status = status;
      if (status === 'published' && !post.publishedAt) {
        post.publishedAt = new Date();
      }
    }

    await post.save();

    // Update org postCount if just published
    if (wasDraft && post.status === 'published' && post.organizationId) {
      await Organization.findByIdAndUpdate(post.organizationId, { $inc: { postCount: 1 } });
    }

    // Notify viewers of content change
    emitToPost(req.params.id, 'post:updated', {
      postId: req.params.id,
      authorId: req.user._id.toString(),
    });

    // If just published (draft → published), notify home feed
    if (wasDraft && post.status === 'published') {
      emitToHome('post:new', { postId: post._id.toString() });
    }

    res.status(200).json(post);
  } catch (error) {
    console.log('Error in updatePost:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * DELETE /api/posts/:id
 */
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const isOwner = post.authorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'website_admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    // Decrement org postCount if was published (guard against negative values)
    if (post.status === 'published' && post.organizationId) {
      await Organization.findOneAndUpdate(
        { _id: post.organizationId, postCount: { $gt: 0 } },
        { $inc: { postCount: -1 } },
      );
    }

    // Remove associated comments
    await Comment.deleteMany({ postId: post._id });

    // Remove from featured
    await FeaturedPost.deleteOne({ postId: post._id });

    // Remove notifications, user activities, insight caches
    await Notification.deleteMany({ postId: post._id });
    await UserActivity.deleteMany({ targetId: post._id });
    await InsightCache.deleteMany({ postId: post._id });

    // Delete S3 files (media URLs) — best-effort
    const s3Keys = (post.mediaUrls || []).map(keyFromUrl).filter(Boolean);
    await Promise.allSettled(s3Keys.map((key) => deleteFromSpaces(key)));

    // Remove from Elasticsearch
    await esDeletePost(post._id.toString());

    await Post.findByIdAndDelete(post._id);

    emitToHome('post:deleted', { postId: post._id.toString() });

    res.status(200).json({ message: 'Post deleted.' });
  } catch (error) {
    console.log('Error in deletePost:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/*  LIKES  */

/**
 * POST /api/posts/:id/like
 * Toggle like. If already disliked, removes dislike first.
 * likeCount = likedBy.length - dislikedBy.length
 */
const toggleLike = async (req, res) => {
  try {
    const userId = req.user._id;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    // Org restriction: non-members/non-followers cannot like
    const access = await checkOrgAccess(post, userId);
    if (!access.allowed) {
      return res.status(403).json({ error: 'You must be a member or follower of this organization to like posts.' });
    }

    const userIdStr = userId.toString();
    const alreadyLiked = post.likedBy.map(String).includes(userIdStr);

    // Atomically toggle membership. $addToSet / $pull are idempotent, so concurrent
    // requests from the same user converge rather than double-applying.
    if (alreadyLiked) {
      await Post.updateOne({ _id: post._id }, { $pull: { likedBy: userId } });
    } else {
      await Post.updateOne(
        { _id: post._id },
        { $addToSet: { likedBy: userId }, $pull: { dislikedBy: userId } }
      );
    }

    // Recompute likeCount from actual array sizes in a single atomic pipeline
    // update — prevents drift regardless of concurrent likers.
    const updated = await Post.findOneAndUpdate(
      { _id: post._id },
      [{ $set: { likeCount: { $subtract: [{ $size: '$likedBy' }, { $size: '$dislikedBy' }] } } }],
      { new: true, projection: { likeCount: 1 } }
    );

    emitToPost(req.params.id, 'post:updated', { postId: req.params.id, authorId: req.user._id.toString() });

    res.status(200).json({
      liked: !alreadyLiked,
      disliked: false,
      likeCount: updated?.likeCount ?? 0,
    });
  } catch (error) {
    console.log('Error in toggleLike:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/posts/:id/dislike
 * Toggle dislike. If already liked, removes like first.
 * likeCount = likedBy.length - dislikedBy.length
 */
const togglePostDislike = async (req, res) => {
  try {
    const userId = req.user._id;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    // Org restriction: non-members/non-followers cannot dislike
    const access = await checkOrgAccess(post, userId);
    if (!access.allowed) {
      return res.status(403).json({ error: 'You must be a member or follower of this organization to dislike posts.' });
    }

    const userIdStr = userId.toString();
    const alreadyDisliked = post.dislikedBy.map(String).includes(userIdStr);

    if (alreadyDisliked) {
      await Post.updateOne({ _id: post._id }, { $pull: { dislikedBy: userId } });
    } else {
      await Post.updateOne(
        { _id: post._id },
        { $addToSet: { dislikedBy: userId }, $pull: { likedBy: userId } }
      );
    }

    const updated = await Post.findOneAndUpdate(
      { _id: post._id },
      [{ $set: { likeCount: { $subtract: [{ $size: '$likedBy' }, { $size: '$dislikedBy' }] } } }],
      { new: true, projection: { likeCount: 1 } }
    );

    emitToPost(req.params.id, 'post:updated', { postId: req.params.id, authorId: req.user._id.toString() });

    res.status(200).json({
      liked: false,
      disliked: !alreadyDisliked,
      likeCount: updated?.likeCount ?? 0,
    });
  } catch (error) {
    console.log('Error in togglePostDislike:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/*  COMMENTS  */

/**
 * GET /api/posts/:id/comments
 * Offset-based pagination for top-level comments (parentId == null).
 * Sorted by likeCount DESC, then createdAt ASC (oldest tiebreaker).
 * Query params: page (default 1), limit (default 20)
 */
const COMMENT_SORT_OPTIONS = {
  top:     { likeCount: -1, createdAt: 1 },
  new:     { createdAt: -1 },
  old:     { createdAt: 1 },
};

const getComments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;
    const sortKey = COMMENT_SORT_OPTIONS[req.query.sort] ? req.query.sort : 'top';
    const sortOrder = COMMENT_SORT_OPTIONS[sortKey];

    const filter = { postId: req.params.id, parentId: null, isDeleted: false };

    // Hide hidden comments from non-admins
    const isAdmin = req.user?.role === 'website_admin';
    let isOrgAdmin = false;
    if (!isAdmin && req.user) {
      const post = await Post.findById(req.params.id).select('organizationId');
      if (post?.organizationId) {
        const org = await Organization.findById(post.organizationId).select('adminIds');
        isOrgAdmin = org?.adminIds.some((aid) => aid.toString() === req.user._id.toString()) ?? false;
      }
    }
    if (!isAdmin && !isOrgAdmin) {
      filter.isHidden = false;
    }

    const comments = await Comment.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'displayName avatar');

    const total = await Comment.countDocuments(filter);

    res.status(200).json({
      comments,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: skip + comments.length < total,
    });
  } catch (error) {
    console.log('Error in getComments:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/posts/:id/comments/:commentId/replies
 * Offset-based pagination for replies. Sorted by likeCount DESC, createdAt ASC.
 * Query params: page (default 1), limit (default 20)
 */
const getReplies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;
    const sortKey = COMMENT_SORT_OPTIONS[req.query.sort] ? req.query.sort : 'top';
    const sortOrder = COMMENT_SORT_OPTIONS[sortKey];

    const filter = { parentId: req.params.commentId, isDeleted: false };

    // Hide hidden comments from non-admins
    const isAdmin = req.user?.role === 'website_admin';
    let isOrgAdmin = false;
    if (!isAdmin && req.user) {
      const parentComment = await Comment.findById(req.params.commentId).select('postId');
      if (parentComment) {
        const post = await Post.findById(parentComment.postId).select('organizationId');
        if (post?.organizationId) {
          const org = await Organization.findById(post.organizationId).select('adminIds');
          isOrgAdmin = org?.adminIds.some((aid) => aid.toString() === req.user._id.toString()) ?? false;
        }
      }
    }
    if (!isAdmin && !isOrgAdmin) {
      filter.isHidden = false;
    }

    const replies = await Comment.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'displayName avatar');

    const total = await Comment.countDocuments(filter);

    res.status(200).json({
      replies,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: skip + replies.length < total,
    });
  } catch (error) {
    console.log('Error in getReplies:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/posts/:id/comments
 * Create a comment (or reply if parentId is provided).
 * Sends a notification to the parent comment's author when replying.
 */
const createComment = async (req, res) => {
  try {
    const { body, parentCommentId, parentId: legacyParentId, replyToUser } = req.body;
    const resolvedParentId = parentCommentId || legacyParentId || null;
    if (!body) return res.status(400).json({ error: 'Body is required.' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    // Org restriction: only members can comment (followers cannot)
    const access = await checkOrgAccess(post, req.user._id);
    if (!access.canComment) {
      return res.status(403).json({
        error: access.role === 'follower'
          ? 'Followers cannot comment on organization posts. Join the organization to comment.'
          : 'You must be a member of this organization to comment.',
      });
    }

    let parentComment = null;
    // If replying, verify parent comment exists
    if (resolvedParentId) {
      parentComment = await Comment.findById(resolvedParentId).populate('authorId', 'displayName avatar');
      if (!parentComment || parentComment.isDeleted) {
        return res.status(404).json({ error: 'Parent comment not found.' });
      }
    }

    const comment = new Comment({
      postId: post._id,
      authorId: req.user._id,
      parentId: resolvedParentId,
      body,
      replyToUser: replyToUser || null,
    });
    await comment.save();

    // Atomic increment avoids read-modify-write drift under concurrent comments.
    await Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } });

    // Create notification for parent comment author (if replying and not self-reply)
    if (parentComment && parentComment.authorId._id.toString() !== req.user._id.toString()) {
      try {
        const senderName = req.user.displayName || 'Someone';
        await Notification.create({
          recipientId: parentComment.authorId._id,
          senderId: req.user._id,
          type: 'reply',
          postId: post._id,
          commentId: comment._id,
          message: `${senderName} replied to your comment`,
        });
        await emitNotification(parentComment.authorId._id.toString());
      } catch (notifErr) {
        console.log('Error creating notification:', notifErr.message);
      }
    }

    // Also notify the post author if this is a top-level comment (not a reply) and commenter isn't the author
    if (!resolvedParentId && post.authorId.toString() !== req.user._id.toString()) {
      try {
        const senderName = req.user.displayName || 'Someone';
        await Notification.create({
          recipientId: post.authorId,
          senderId: req.user._id,
          type: 'comment',
          postId: post._id,
          commentId: comment._id,
          message: `${senderName} commented on your post`,
        });
        await emitNotification(post.authorId.toString());
      } catch (notifErr) {
        console.log('Error creating notification:', notifErr.message);
      }
    }

    // Detect @mentions in the comment body and notify mentioned users
    try {
      const mentionRegex = /@([\w\s]+?)(?=\s@|\s*$|[.,!?;])/g;
      let match;
      const mentionedNames = [];
      while ((match = mentionRegex.exec(body)) !== null) {
        mentionedNames.push(match[1].trim());
      }
      if (mentionedNames.length > 0) {
        const mentionedUsers = await User.find({
          displayName: { $in: mentionedNames },
          _id: { $ne: req.user._id },
        });
        const senderName = req.user.displayName || 'Someone';
        const mentionNotifs = mentionedUsers.map((mu) =>
          Notification.create({
            recipientId: mu._id,
            senderId: req.user._id,
            type: 'mention',
            postId: post._id,
            commentId: comment._id,
            message: `${senderName} mentioned you in a comment`,
          })
        );
        await Promise.allSettled(mentionNotifs);
        emitNotificationBulk(mentionedUsers.map((mu) => mu._id));
      }
    } catch (mentionErr) {
      console.log('Error creating mention notifications:', mentionErr.message);
    }

    // Broadcast comment creation to post room
    emitToPost(post._id.toString(), 'comment:new', {
      postId: post._id.toString(),
      commentId: comment._id.toString(),
      parentId: resolvedParentId?.toString() || null,
      authorId: req.user._id.toString(),
    });

    const populated = await comment.populate('authorId', 'displayName avatar');
    res.status(201).json(populated);
  } catch (error) {
    console.log('Error in createComment:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * DELETE /api/posts/:id/comments/:commentId
 * Soft-delete a comment (author or admin)
 */
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });

    const isOwner = comment.authorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'website_admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    comment.isDeleted = true;
    await comment.save();

    // Guarded decrement: no-op if count is already 0 so we never go negative.
    await Post.findOneAndUpdate(
      { _id: comment.postId, commentCount: { $gt: 0 } },
      { $inc: { commentCount: -1 } }
    );

    emitToPost(comment.postId.toString(), 'comment:deleted', {
      postId: comment.postId.toString(),
      commentId: req.params.commentId,
    });

    res.status(200).json({ message: 'Comment deleted.' });
  } catch (error) {
    console.log('Error in deleteComment:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/*  REPORT  */

/**
 * POST /api/posts/:id/report
 */
const reportPost = async (req, res) => {
  try {
    const userId = req.user._id;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    if (post.reportedBy.map(String).includes(userId.toString())) {
      return res.status(400).json({ error: 'Already reported.' });
    }

    post.reportedBy.push(userId);
    post.isReported = true;
    await post.save();

    res.status(200).json({ message: 'Post reported.' });
  } catch (error) {
    console.log('Error in reportPost:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/*  FEATURED POSTS  */

/**
 * GET /api/posts/featured
 */
const getFeaturedPosts = async (req, res) => {
  try {
    const featured = await FeaturedPost.find()
      .sort({ order: 1 })
      .populate({
        path: 'postId',
        populate: [
          { path: 'authorId', select: 'displayName avatar' },
          { path: 'organizationId', select: 'name slug avatar' },
        ],
      });

    const posts = featured.map((f) => f.postId).filter(Boolean);
    res.status(200).json(posts);
  } catch (error) {
    console.log('Error in getFeaturedPosts:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/posts/featured   { postId, order }
 * Add a post to featured (website_admin)
 */
const addFeaturedPost = async (req, res) => {
  try {
    const { postId, order } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const featured = new FeaturedPost({
      postId,
      order: order || 0,
      addedBy: req.user._id,
    });
    await featured.save();
    res.status(201).json(featured);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Post is already featured.' });
    }
    console.log('Error in addFeaturedPost:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * DELETE /api/posts/featured/:postId
 */
const removeFeaturedPost = async (req, res) => {
  try {
    const result = await FeaturedPost.findOneAndDelete({ postId: req.params.postId });
    if (!result) return res.status(404).json({ error: 'Not featured.' });
    res.status(200).json({ message: 'Removed from featured.' });
  } catch (error) {
    console.log('Error in removeFeaturedPost:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/*  POLL VOTING  */

/**
 * POST /api/posts/:id/vote   { optionIds: [String] }
 * Vote on a poll. For single-choice polls, optionIds must have exactly 1 element.
 * Only org members/admins can vote on org-scoped polls.
 */
const votePoll = async (req, res) => {
  try {
    const { optionIds } = req.body;
    if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
      return res.status(400).json({ error: 'optionIds array is required.' });
    }

    const post = await Post.findById(req.params.id);
    if (!post || !post.poll) return res.status(404).json({ error: 'Poll not found.' });

    // Check if poll is closed
    if (post.poll.isClosed || (post.poll.closesAt && new Date() > post.poll.closesAt)) {
      return res.status(400).json({ error: 'This poll has closed.' });
    }

    // If org post, only members/admins can vote
    if (post.organizationId) {
      const org = await Organization.findById(post.organizationId);
      if (org) {
        const uid = req.user._id.toString();
        const isMember = org.adminIds.map(String).includes(uid) || org.memberIds.map(String).includes(uid);
        if (!isMember && req.user.role !== 'website_admin') {
          return res.status(403).json({ error: 'Only organization members can vote on this poll.' });
        }
      }
    }

    // Validate single vs multi choice
    if (!post.poll.isMultiple && optionIds.length > 1) {
      return res.status(400).json({ error: 'This poll allows only one choice.' });
    }

    const userId = req.user._id;
    const userIdStr = userId.toString();

    // Pre-checks (validation only — the real guard against double-voting is the
    // atomic filter below, which rejects the write if the user appears in any
    // option's voterIds at update time).
    for (const opt of post.poll.options) {
      if (opt.voterIds.map(String).includes(userIdStr)) {
        return res.status(400).json({ error: 'You have already voted.' });
      }
    }
    const validOptionIds = post.poll.options.map((o) => o.optionId);
    for (const oid of optionIds) {
      if (!validOptionIds.includes(oid)) {
        return res.status(400).json({ error: `Invalid option: ${oid}` });
      }
    }

    // Atomic cast: only applies if the user is not already in ANY option's
    // voterIds and the poll is not closed. arrayFilters targets only the
    // selected options for the $addToSet / $inc.
    const updated = await Post.findOneAndUpdate(
      {
        _id: post._id,
        'poll.options.voterIds': { $ne: userId },
        'poll.isClosed': { $ne: true },
      },
      {
        $addToSet: { 'poll.options.$[sel].voterIds': userId },
        $inc: {
          'poll.options.$[sel].voteCount': 1,
          'poll.totalVotes': 1,
        },
      },
      {
        arrayFilters: [{ 'sel.optionId': { $in: optionIds } }],
        new: true,
      }
    );

    if (!updated) {
      return res.status(409).json({ error: 'Unable to vote — you may have already voted, or the poll was just closed.' });
    }

    emitToPost(req.params.id, 'post:updated', {
      postId: req.params.id,
      authorId: req.user._id.toString(),
    });

    res.status(200).json({ poll: updated.poll });
  } catch (error) {
    console.log('Error in votePoll:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/*  COMMENT LIKES  */

/**
 * POST /api/posts/:id/close-poll
 * Close a poll. Only the post author or admin can close it.
 */
const closePoll = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || !post.poll) return res.status(404).json({ error: 'Poll not found.' });

    const isOwner = post.authorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'website_admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only the poll creator can close this poll.' });
    }

    post.poll.isClosed = true;
    post.markModified('poll');
    await post.save();

    // Notify poll viewers that poll is now closed
    emitToPost(req.params.id, 'post:updated', {
      postId: req.params.id,
      authorId: req.user._id.toString(),
    });

    res.status(200).json({ poll: post.poll });
  } catch (error) {
    console.log('Error in closePoll:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/posts/:id/comments/:commentId/like
 * Toggle like on a comment. If already disliked, removes dislike first.
 * likeCount = likedBy.length - dislikedBy.length (can be negative)
 */
const toggleCommentLike = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    // Org restriction: check via the parent post
    const post = await Post.findById(comment.postId);
    if (post) {
      const access = await checkOrgAccess(post, req.user._id);
      if (!access.allowed) {
        return res.status(403).json({ error: 'You must be a member or follower of this organization to like comments.' });
      }
    }

    const userId = req.user._id;
    const userIdStr = userId.toString();
    const alreadyLiked = comment.likedBy.map(String).includes(userIdStr);

    if (alreadyLiked) {
      await Comment.updateOne({ _id: comment._id }, { $pull: { likedBy: userId } });
    } else {
      await Comment.updateOne(
        { _id: comment._id },
        { $addToSet: { likedBy: userId }, $pull: { dislikedBy: userId } }
      );
    }

    const updated = await Comment.findOneAndUpdate(
      { _id: comment._id },
      [{ $set: { likeCount: { $subtract: [{ $size: '$likedBy' }, { $size: '$dislikedBy' }] } } }],
      { new: true, projection: { likeCount: 1 } }
    );

    emitToPost(req.params.id, 'comment:updated', {
      postId: req.params.id,
      commentId: req.params.commentId,
      authorId: req.user._id.toString(),
    });

    res.status(200).json({
      liked: !alreadyLiked,
      disliked: false,
      likeCount: updated?.likeCount ?? 0,
    });
  } catch (error) {
    console.log('Error in toggleCommentLike:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/posts/:id/comments/:commentId/dislike
 * Toggle dislike on a comment. If already liked, removes like first.
 * likeCount = likedBy.length - dislikedBy.length (can be negative)
 */
const toggleCommentDislike = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    // Org restriction: check via the parent post
    const post = await Post.findById(comment.postId);
    if (post) {
      const access = await checkOrgAccess(post, req.user._id);
      if (!access.allowed) {
        return res.status(403).json({ error: 'You must be a member or follower of this organization to dislike comments.' });
      }
    }

    const userId = req.user._id;
    const userIdStr = userId.toString();
    const alreadyDisliked = comment.dislikedBy.map(String).includes(userIdStr);

    if (alreadyDisliked) {
      await Comment.updateOne({ _id: comment._id }, { $pull: { dislikedBy: userId } });
    } else {
      await Comment.updateOne(
        { _id: comment._id },
        { $addToSet: { dislikedBy: userId }, $pull: { likedBy: userId } }
      );
    }

    const updated = await Comment.findOneAndUpdate(
      { _id: comment._id },
      [{ $set: { likeCount: { $subtract: [{ $size: '$likedBy' }, { $size: '$dislikedBy' }] } } }],
      { new: true, projection: { likeCount: 1 } }
    );

    emitToPost(req.params.id, 'comment:updated', {
      postId: req.params.id,
      commentId: req.params.commentId,
      authorId: req.user._id.toString(),
    });

    res.status(200).json({
      liked: false,
      disliked: !alreadyDisliked,
      likeCount: updated?.likeCount ?? 0,
    });
  } catch (error) {
    console.log('Error in toggleCommentDislike:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  togglePostDislike,
  getComments,
  getReplies,
  createComment,
  deleteComment,
  reportPost,
  getFeaturedPosts,
  addFeaturedPost,
  removeFeaturedPost,
  votePoll,
  closePoll,
  toggleCommentLike,
  toggleCommentDislike,
};
