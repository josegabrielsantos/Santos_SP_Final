import express from 'express';
import {
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
  toggleCommentLike,
} from '../controllers/post_controller.js';
import { protectRoute, requireWebsiteAdmin } from '../middleware/protectRoute.js';

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

// Comments
router.get('/:id/comments', getComments);
router.post('/:id/comments', protectRoute, createComment);
router.get('/:id/comments/:commentId/replies', getReplies);
router.delete('/:id/comments/:commentId', protectRoute, deleteComment);
router.post('/:id/comments/:commentId/like', protectRoute, toggleCommentLike);

// Report
router.post('/:id/report', protectRoute, reportPost);

// Poll vote
router.post('/:id/vote', protectRoute, votePoll);

export default router;
