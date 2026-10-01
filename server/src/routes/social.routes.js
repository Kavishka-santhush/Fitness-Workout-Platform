const express = require('express');
const { z } = require('zod');
const socialController = require('../controllers/social.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const { validate, pagination } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();

// Public: single post view (optional auth personalises kudos state)
router.get('/posts/:id', optionalAuth, asyncHandler(socialController.getPost));

router.use(requireAuth);

/* Feed + posts */
router.get('/feed', validate({ query: pagination.extend({ groupId: z.string().uuid().optional(), hashtag: z.string().max(60).optional() }) }), asyncHandler(socialController.feed));
router.get('/users/:userId/posts', validate({ query: pagination }), asyncHandler(socialController.userPosts));
router.post('/posts', validate({ body: z.object({
  type: z.enum(['WORKOUT', 'PROGRESS_PHOTO', 'ACHIEVEMENT', 'TIPS', 'ROUTE', 'CARDIO']).default('TIPS'),
  sessionId: z.string().uuid().optional(), cardioId: z.string().uuid().optional(),
  routeId: z.string().uuid().optional(), photoId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(), content: z.string().max(4000).optional(),
  mediaUrls: z.array(z.string().max(500)).optional(), stats: z.record(z.any()).optional(),
  isPublic: z.boolean().optional(),
}) }), asyncHandler(socialController.createPost));
router.delete('/posts/:id', asyncHandler(socialController.deletePost));

/* Kudos + comments */
router.post('/posts/:id/kudos', asyncHandler(socialController.toggleKudos));
router.get('/posts/:id/comments', validate({ query: pagination }), asyncHandler(socialController.listComments));
router.post('/posts/:id/comments', validate({ body: z.object({ content: z.string().min(1).max(2000), parentId: z.string().uuid().optional() }) }), asyncHandler(socialController.addComment));
router.delete('/comments/:id', asyncHandler(socialController.deleteComment));

/* Follows */
router.post('/users/:userId/follow', asyncHandler(socialController.follow));
router.post('/users/:userId/unfollow', asyncHandler(socialController.unfollow));
router.get('/users/:userId/followers', asyncHandler(socialController.followers));
router.get('/users/:userId/following', asyncHandler(socialController.following));
router.get('/suggestions', asyncHandler(socialController.suggestions));

/* Groups */
router.get('/groups', validate({ query: pagination.extend({ q: z.string().max(120).optional(), category: z.string().max(60).optional() }) }), asyncHandler(socialController.listGroups));
router.post('/groups', validate({ body: z.object({
  name: z.string().min(1).max(120), slug: z.string().max(120).optional(), description: z.string().max(2000).optional(),
  coverUrl: z.string().max(500).optional(), visibility: z.enum(['OPEN', 'CLOSED', 'PRIVATE']).optional(), category: z.string().max(60).optional(),
}) }), asyncHandler(socialController.createGroup));
router.get('/groups/:slug', asyncHandler(socialController.getGroup));
router.post('/groups/:id/join', asyncHandler(socialController.joinGroup));
router.post('/groups/:id/leave', asyncHandler(socialController.leaveGroup));

/* Discussions */
router.get('/groups/:id/discussions', validate({ query: pagination }), asyncHandler(socialController.listDiscussions));
router.post('/discussions', validate({ body: z.object({ groupId: z.string().uuid(), title: z.string().min(1).max(200), content: z.string().max(4000).optional() }) }), asyncHandler(socialController.createDiscussion));
router.get('/discussions/:id/replies', validate({ query: pagination }), asyncHandler(socialController.discussionReplies));
router.post('/discussions/:id/replies', validate({ body: z.object({ content: z.string().min(1).max(2000), parentId: z.string().uuid().optional() }) }), asyncHandler(socialController.addDiscussionReply));

/* Blocks + reports */
router.post('/users/:userId/block', asyncHandler(socialController.block));
router.post('/users/:userId/unblock', asyncHandler(socialController.unblock));
router.get('/blocks', asyncHandler(socialController.listBlocks));
router.post('/report', validate({ body: z.object({ targetType: z.enum(['POST', 'COMMENT', 'USER', 'GROUP']), targetId: z.string().uuid(), reason: z.string().min(3).max(500) }) }), asyncHandler(socialController.report));

module.exports = router;
