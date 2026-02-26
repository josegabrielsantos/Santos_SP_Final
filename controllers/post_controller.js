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
 * Returns top-level comments (parentId == null) with nested replies if desired.
 */
const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.id, parentId: null, isDeleted: false })
      .sort({ createdAt: -1 })
      .populate('authorId', 'displayName avatar');

    res.status(200).json(comments);
  } catch (error) {
    console.log('Error in getComments:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/posts/:id/comments/:commentId/replies
 */
const getReplies = async (req, res) => {
  try {
    const replies = await Comment.find({ parentId: req.params.commentId, isDeleted: false })
      .sort({ createdAt: 1 })
      .populate('authorId', 'displayName avatar');

    res.status(200).json(replies);
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
 * POST /api/posts/:id/vote   { optionIndex }
 */
const votePoll = async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post || !post.poll) return res.status(404).json({ error: 'Poll not found.' });

    if (optionIndex < 0 || optionIndex >= post.poll.options.length) {
      return res.status(400).json({ error: 'Invalid option index.' });
    }

    const userId = req.user._id.toString();
    // Check if already voted
    for (const opt of post.poll.options) {
      if (opt.votes.map(String).includes(userId)) {
        return res.status(400).json({ error: 'Already voted.' });
      }
    }

    post.poll.options[optionIndex].votes.push(req.user._id);
    post.markModified('poll');
    await post.save();

    res.status(200).json({ poll: post.poll });
  } catch (error) {
    console.log('Error in votePoll:', error.message);
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
};
