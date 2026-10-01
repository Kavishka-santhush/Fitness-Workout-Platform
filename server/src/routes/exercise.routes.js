const express = require('express');
const { z } = require('zod');
const exerciseController = require('../controllers/exercise.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const { requireStaff } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { uploadFields } = require('../utils/upload.util');
const { coerceMultipart } = require('../utils/multipart.util');
const { uploadLimiter } = require('../middleware/rateLimit.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();

const exerciseSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(4000).optional(),
  exerciseType: z.enum(['STRENGTH', 'CARDIO', 'FLEXIBILITY', 'BALANCE', 'HIIT', 'PLYOMETRIC', 'SPORT']).default('STRENGTH'),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('BEGINNER'),
  primaryMuscles: z.array(z.string()).min(1),
  secondaryMuscles: z.array(z.string()).default([]),
  equipment: z.array(z.string()).default([]),
  category: z.string().max(60).optional(),
  instructions: z.array(z.object({ step: z.number(), text: z.string() })).default([]),
  tips: z.array(z.string()).default([]),
  commonMistakes: z.array(z.string()).default([]),
  variations: z.object({ beginner: z.array(z.string()).default([]), advanced: z.array(z.string()).default([]), equipment: z.array(z.string()).default([]) }).default({}),
  metValue: z.coerce.number().min(1).max(25).optional(),
});

const mediaUpload = uploadFields([
  { name: 'video', bucket: 'exerciseVideos', max: 1 },
  { name: 'images', bucket: 'exerciseImages', max: 8 },
]);

// ---- public browsing (optional auth enriches with favorites/history) ----
router.get('/', optionalAuth, asyncHandler(exerciseController.list));
router.get('/favorites', requireAuth, asyncHandler(exerciseController.favorites));
router.get('/history', requireAuth, asyncHandler(exerciseController.history));
router.get('/:id', optionalAuth, asyncHandler(exerciseController.get));

// ---- authenticated member actions ----
router.post('/:id/favorite', requireAuth, asyncHandler(exerciseController.toggleFavorite));
router.post('/:id/rate', requireAuth, validate({ body: z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().max(500).optional() }) }), asyncHandler(exerciseController.rate));

// ---- community submission (goes to moderation queue) ----
router.post('/submit', requireAuth, uploadLimiter, mediaUpload, coerceMultipart, asyncHandler(exerciseController.create));

// ---- admin CRUD ----
router.post('/', requireAuth, requireStaff, uploadLimiter, mediaUpload, coerceMultipart, validate({ body: exerciseSchema }), asyncHandler(exerciseController.create));
router.patch('/:id', requireAuth, requireStaff, asyncHandler(exerciseController.update));
router.post('/:id/media', requireAuth, requireStaff, uploadLimiter, mediaUpload, asyncHandler(exerciseController.uploadMedia));
router.delete('/:id', requireAuth, requireStaff, asyncHandler(exerciseController.remove));
router.get('/moderation/pending', requireAuth, requireStaff, asyncHandler(exerciseController.pending));
router.post('/:id/review', requireAuth, requireStaff, validate({ body: z.object({ decision: z.enum(['APPROVED', 'REJECTED']) }) }), asyncHandler(exerciseController.review));

module.exports = router;
