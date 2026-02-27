import Post from '../models/post_model.js';
import Comment from '../models/comment_model.js';
import FeaturedPost from '../models/featured_post_model.js';
import Organization from '../models/organization_model.js';

/*  POST CRUD  */

/**
 * POST /api/posts
 */
const createPost = async (req, res) => {
  try {
    const { title, body, bodyText, tags, organizationId, type, status, mediaUrls, paperIds, poll } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required.' });

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
      type: type || 'post',
      status: status || 'draft',
      mediaUrls: mediaUrls || [],
      paperIds: paperIds || [],
      poll: poll || undefined,
      publishedAt: (status === 'published') ? new Date() : null,
    });

    await post.save();

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

    const filter = { status: 'published' };
    if (tag) filter.tags = tag;
    if (type) filter.type = type;

    const posts = await Post.find(filter)
      .sort({ publishedAt: -1 })
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
 * Toggle like
 */
const toggleLike = async (req, res) => {
  try {
    const userId = req.user._id;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const alreadyLiked = post.likedBy.map(String).includes(userId.toString());

    if (alreadyLiked) {
      post.likedBy.pull(userId);
      post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
      post.likedBy.push(userId);
      post.likeCount += 1;
    }

    await post.save();
    res.status(200).json({ liked: !alreadyLiked, likeCount: post.likeCount });
  } catch (error) {
    console.log('Error in toggleLike:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/*  COMMENTS  */

/**
 * GET /api/posts/:id/comments
 * Cursor-based pagination for top-level comments (parentId == null).
 * Query params: cursor (ISO date string), limit (default 20)
 */
const getComments = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor; // ISO date string of last comment's createdAt

    const filter = { postId: req.params.id, parentId: null, isDeleted: false };
    if (cursor) {
      filter.createdAt = { $lt: new Date(cursor) };
    }

    const comments = await Comment.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1) // fetch one extra to know if there's a next page
      .populate('authorId', 'displayName avatar');

    const hasMore = comments.length > limit;
    if (hasMore) comments.pop(); // remove the extra

    const nextCursor = hasMore ? comments[comments.length - 1].createdAt.toISOString() : null;

    res.status(200).json({ comments, nextCursor });
  } catch (error) {
    console.log('Error in getComments:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/posts/:id/comments/:commentId/replies
 * Cursor-based pagination for replies.
 * Query params: cursor (ISO date string), limit (default 20)
 */
const getReplies = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;

    const filter = { parentId: req.params.commentId, isDeleted: false };
    if (cursor) {
      filter.createdAt = { $gt: new Date(cursor) }; // replies oldest-first
    }

    const replies = await Comment.find(filter)
      .sort({ createdAt: 1 })
      .limit(limit + 1)
      .populate('authorId', 'displayName avatar');

    const hasMore = replies.length > limit;
    if (hasMore) replies.pop();

    const nextCursor = hasMore ? replies[replies.length - 1].createdAt.toISOString() : null;

    res.status(200).json({ replies, nextCursor });
  } catch (error) {
    console.log('Error in getReplies:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/posts/:id/comments
 * Create a comment (or reply if parentId is provided)
 */
const createComment = async (req, res) => {
  try {
    const { body, parentId } = req.body;
    if (!body) return res.status(400).json({ error: 'Body is required.' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const comment = new Comment({
      postId: post._id,
      authorId: req.user._id,
      parentId: parentId || null,
      body,
    });
    await comment.save();

    // Increment post commentCount
    post.commentCount += 1;
    await post.save();

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
 * Toggle like on a comment.
 */
const toggleCommentLike = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    const userId = req.user._id;
    const alreadyLiked = comment.likedBy.map(String).includes(userId.toString());

    if (alreadyLiked) {
      comment.likedBy.pull(userId);
      comment.likeCount = Math.max(0, comment.likeCount - 1);
    } else {
      comment.likedBy.push(userId);
      comment.likeCount += 1;
    }

    await comment.save();
    res.status(200).json({ liked: !alreadyLiked, likeCount: comment.likeCount });
  } catch (error) {
    console.log('Error in toggleCommentLike:', error.message);
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
};
