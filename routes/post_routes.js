import express from 'express';
import {
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
} from '../controllers/post_controller.js';
import { protectRoute, requireWebsiteAdmin, optionalAuth } from '../middleware/protectRoute.js';

const router = express.Router();

// Featured (place before /:id to avoid conflict)
router.get('/featured', getFeaturedPosts);
router.post('/featured', protectRoute, requireWebsiteAdmin, addFeaturedPost);
router.delete('/featured/:postId', protectRoute, requireWebsiteAdmin, removeFeaturedPost);

// CRUD
router.post('/', protectRoute, createPost);
router.get('/', getPosts);
router.get('/:id', getPost);
router.put('/:id', protectRoute, updatePost);
router.delete('/:id', protectRoute, deletePost);

// Likes
router.post('/:id/like', protectRoute, toggleLike);
router.post('/:id/dislike', protectRoute, togglePostDislike);

// Comments
router.get('/:id/comments', optionalAuth, getComments);
router.post('/:id/comments', protectRoute, createComment);
router.get('/:id/comments/:commentId/replies', optionalAuth, getReplies);
router.delete('/:id/comments/:commentId', protectRoute, deleteComment);
router.post('/:id/comments/:commentId/like', protectRoute, toggleCommentLike);
router.post('/:id/comments/:commentId/dislike', protectRoute, toggleCommentDislike);

// Report
router.post('/:id/report', protectRoute, reportPost);

// Poll vote & close
router.post('/:id/vote', protectRoute, votePoll);
router.post('/:id/close-poll', protectRoute, closePoll);

export default router;
