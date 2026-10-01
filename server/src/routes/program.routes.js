const express = require('express');
const { z } = require('zod');
const programController = require('../controllers/program.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const { requireRole, requireStaff, requireVerifiedTrainer } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { uploadFields } = require('../utils/upload.util');
const { coerceMultipart } = require('../utils/multipart.util');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();

const programSchema = z.object({
  name: z.string().min(2).max(140),
  description: z.string().max(6000).optional(),
  goal: z.enum(['WEIGHT_LOSS', 'MUSCLE_GAIN', 'ENDURANCE', 'FLEXIBILITY', 'GENERAL_FITNESS', 'ATHLETIC_PERFORMANCE']).default('GENERAL_FITNESS'),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('BEGINNER'),
  programType: z.string().max(60).optional(),
  durationWeeks: z.number().int().min(2).max(16),
  daysPerWeek: z.number().int().min(1).max(7),
  equipment: z.array(z.string()).default([]),
  priceCents: z.number().int().min(0).default(0),
  assignedClientIds: z.array(z.string()).default([]),
  weeks: z.array(z.object({
    week: z.number().int().min(1).max(16),
    days: z.array(z.object({
      workoutId: z.string(),
      dayOfWeek: z.number().int().min(1).max(7),
      isRestDay: z.boolean().default(false),
      progressionNote: z.string().max(500).optional(),
      position: z.number().int().min(0).optional(),
    })),
  })).default([]),
});

const mediaUpload = uploadFields([
  { name: 'cover', bucket: 'programCovers', max: 1 },
  { name: 'trailer', bucket: 'programTrailers', max: 1 },
]);

router.get('/', optionalAuth, asyncHandler(programController.list));
router.get('/featured', asyncHandler(programController.featured));
router.get('/mine', requireAuth, asyncHandler(programController.myEnrollments));
router.get('/moderation/pending', requireAuth, requireStaff, asyncHandler(programController.reviewQueue));
router.get('/:id', optionalAuth, asyncHandler(programController.get));
router.get('/:id/leaderboard', asyncHandler(programController.leaderboard));

router.post('/:id/enroll', requireAuth, asyncHandler(programController.enroll));
router.delete('/:id/enroll', requireAuth, asyncHandler(programController.unenroll));
router.post('/:id/review', requireAuth, validate({ body: z.object({ rating: z.number().int().min(1).max(5), title: z.string().max(120).optional(), comment: z.string().max(2000).optional() }) }), asyncHandler(programController.review));

// Trainer/admin creation
router.post('/', requireAuth, requireRole('TRAINER', 'NUTRITIONIST', 'SUPER_ADMIN', 'ADMIN'), mediaUpload, coerceMultipart, validate({ body: programSchema }), asyncHandler(programController.create));
router.patch('/:id', requireAuth, asyncHandler(programController.update));
router.post('/:id/publish', requireAuth, asyncHandler(programController.publish));
router.delete('/:id', requireAuth, asyncHandler(programController.remove));
router.post('/:id/feature', requireAuth, requireStaff, validate({ body: z.object({ featured: z.boolean() }) }), asyncHandler(programController.setFeatured));
router.post('/:id/moderate', requireAuth, requireStaff, validate({ body: z.object({ decision: z.enum(['APPROVE', 'REJECT']) }) }), asyncHandler(programController.moderate));

module.exports = router;
