import express from 'express';
import { body } from 'express-validator';
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  toggleShare,
  sharePostToUser
} from '../controllers/postController.js';
import {
  editPost,
  toggleSavePost,
  getSavedPosts,
  togglePinPost,
  getPostsByHashtag,
  getTrendingHashtags,
  getPostEditHistory
} from '../controllers/postEnhancementsController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { uploadMedia } from '../middleware/upload.js';

const router = express.Router();

// Validation rules
const createPostValidation = [
  body('content').optional().trim(),
  body('mediaType').optional().isIn(['photo', 'video', 'audio', 'none']),
  body('country').optional().trim(),
  body('state').optional().trim(),
  body('city').optional().trim()
];

// Routes
router.post('/', authenticate, uploadMedia.single('media'), createPostValidation, validate, createPost);
router.get('/', optionalAuth, getPosts);
router.get('/saved', authenticate, getSavedPosts);
router.get('/hashtag/:tag', optionalAuth, getPostsByHashtag);
router.get('/trending/hashtags', getTrendingHashtags);
router.get('/:id', optionalAuth, getPostById);
router.put('/:id', authenticate, updatePost);
router.patch('/:id/edit', authenticate, editPost);
router.delete('/:id', authenticate, deletePost);
router.post('/:id/like', authenticate, toggleLike);
router.post('/:id/share', authenticate, toggleShare);
router.post('/:id/share-user', authenticate, sharePostToUser);
router.post('/:id/save', authenticate, toggleSavePost);
router.post('/:id/pin', authenticate, togglePinPost);
router.get('/:id/history', getPostEditHistory);

export default router;
