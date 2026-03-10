import Post from '../models/post_model.js';
import Paper from '../models/paper_model.js';
import Comment from '../models/comment_model.js';
import Notification from '../models/notification_model.js';
import FeaturedPost from '../models/featured_post_model.js';
import Organization from '../models/organization_model.js';
import User from '../models/user_model.js';

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
    const { title, body, bodyText, tags, organizationId, type, status, mediaUrls, paperIds, poll, paperMetadata } = req.body;
    const normalizedType = type === 'paper_share' ? 'research_paper' : (type || 'post');

    if (!title) return res.status(400).json({ error: 'Title is required.' });

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

    const post = new Post({
      title,
      body: body || null,
      bodyText: bodyText || '',
      tags: tags || [],
      authorId: req.user._id,
      organizationId: organizationId || null,
      type: normalizedType,
      status: status || 'draft',
      mediaUrls: mediaUrls || [],
      paperIds: paperIds || [],
      poll: poll || undefined,
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
      publishedAt: (status === 'published') ? new Date() : null,
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

    const filter = { status: 'published' };
    if (tag) filter.tags = tag;
    if (type) filter.type = type;

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
    if (status !== undefined) {
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

    // Decrement org postCount if was published
    if (post.status === 'published' && post.organizationId) {
      await Organization.findByIdAndUpdate(post.organizationId, { $inc: { postCount: -1 } });
    }

    // Remove associated comments
    await Comment.deleteMany({ postId: post._id });

    // Remove from featured
    await FeaturedPost.deleteOne({ postId: post._id });

    await Post.findByIdAndDelete(post._id);

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
    const alreadyDisliked = post.dislikedBy.map(String).includes(userIdStr);

    if (alreadyLiked) {
      post.likedBy.pull(userId);
    } else {
      // Remove dislike if present, then add like
      if (alreadyDisliked) {
        post.dislikedBy.pull(userId);
      }
      post.likedBy.push(userId);
    }

    post.likeCount = post.likedBy.length - post.dislikedBy.length;
    await post.save();
    res.status(200).json({
      liked: !alreadyLiked,
      disliked: false,
      likeCount: post.likeCount,
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
    const alreadyLiked = post.likedBy.map(String).includes(userIdStr);
    const alreadyDisliked = post.dislikedBy.map(String).includes(userIdStr);

    if (alreadyDisliked) {
      // Un-dislike
      post.dislikedBy.pull(userId);
    } else {
      // Remove like if present, then add dislike
      if (alreadyLiked) {
        post.likedBy.pull(userId);
      }
      post.dislikedBy.push(userId);
    }

    post.likeCount = post.likedBy.length - post.dislikedBy.length;
    await post.save();
    res.status(200).json({
      liked: false,
      disliked: !alreadyDisliked,
      likeCount: post.likeCount,
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

    // Increment post commentCount
    post.commentCount += 1;
    await post.save();

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
      }
    } catch (mentionErr) {
      console.log('Error creating mention notifications:', mentionErr.message);
    }

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

    // Decrement post commentCount
    await Post.findByIdAndUpdate(comment.postId, { $inc: { commentCount: -1 } });

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

    // Check if user already voted on any option
    for (const opt of post.poll.options) {
      if (opt.voterIds.map(String).includes(userIdStr)) {
        return res.status(400).json({ error: 'You have already voted.' });
      }
    }

    // Validate all optionIds exist
    const validOptionIds = post.poll.options.map((o) => o.optionId);
    for (const oid of optionIds) {
      if (!validOptionIds.includes(oid)) {
        return res.status(400).json({ error: `Invalid option: ${oid}` });
      }
    }

    // Cast votes
    for (const opt of post.poll.options) {
      if (optionIds.includes(opt.optionId)) {
        opt.voterIds.push(userId);
        opt.voteCount += 1;
      }
    }
    post.poll.totalVotes += 1;

    post.markModified('poll');
    await post.save();

    res.status(200).json({ poll: post.poll });
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
    const alreadyDisliked = comment.dislikedBy.map(String).includes(userIdStr);

    if (alreadyLiked) {
      // Un-like
      comment.likedBy.pull(userId);
    } else {
      // Remove dislike if present, then add like
      if (alreadyDisliked) {
        comment.dislikedBy.pull(userId);
      }
      comment.likedBy.push(userId);
    }

    // Recalculate: likes - dislikes
    comment.likeCount = comment.likedBy.length - comment.dislikedBy.length;

    await comment.save();
    res.status(200).json({
      liked: !alreadyLiked,
      disliked: false,
      likeCount: comment.likeCount,
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
    const alreadyLiked = comment.likedBy.map(String).includes(userIdStr);
    const alreadyDisliked = comment.dislikedBy.map(String).includes(userIdStr);

    if (alreadyDisliked) {
      // Un-dislike
      comment.dislikedBy.pull(userId);
    } else {
      // Remove like if present, then add dislike
      if (alreadyLiked) {
        comment.likedBy.pull(userId);
      }
      comment.dislikedBy.push(userId);
    }

    // Recalculate: likes - dislikes
    comment.likeCount = comment.likedBy.length - comment.dislikedBy.length;

    await comment.save();
    res.status(200).json({
      liked: false,
      disliked: !alreadyDisliked,
      likeCount: comment.likeCount,
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
