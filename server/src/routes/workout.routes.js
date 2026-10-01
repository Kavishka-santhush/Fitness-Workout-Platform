const express = require('express');
const { z } = require('zod');
const workoutController = require('../controllers/workout.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { uploadSingle } = require('../utils/upload.util');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();

const exerciseRowSchema = z.object({
  exerciseId: z.string(),
  position: z.number().int().min(0).optional(),
  sets: z.number().int().min(1).max(20).default(3),
  reps: z.union([z.string(), z.number()]).optional(),
  weight: z.number().min(0).optional(),
  durationSec: z.number().int().min(0).optional(),
  restSec: z.number().int().min(0).max(600).default(90),
  rpeTarget: z.number().int().min(1).max(10).optional(),
  section: z.enum(['WARMUP', 'MAIN', 'COOLDOWN']).default('MAIN'),
  notes: z.string().max(2000).optional(),
  coachingCues: z.string().max(2000).optional(),
  configuration: z.object({
    repScheme: z.enum(['STRAIGHT', 'PYRAMID', 'DROP_SETS', 'AMRAP', 'EMOM', 'TABATA', 'CUSTOM']).optional(),
    supersetWith: z.string().optional(),
    circuit: z.object({ groupId: z.string(), name: z.string(), laps: z.number().int().min(1).max(20) }).optional(),
  }).default({}),
});

const workoutSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(4000).optional(),
  exerciseType: z.enum(['STRENGTH', 'CARDIO', 'FLEXIBILITY', 'BALANCE', 'HIIT', 'PLYOMETRIC', 'SPORT']).optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('INTERMEDIATE'),
  estimatedDuration: z.number().int().min(5).max(300).optional(),
  equipment: z.array(z.string()).default([]),
  targetMuscles: z.array(z.string()).default([]),
  visibility: z.enum(['PRIVATE', 'PUBLIC', 'CLIENTS_ONLY']).default('PRIVATE'),
  tags: z.array(z.string()).default([]),
  isTemplate: z.boolean().default(false),
  exercises: z.array(exerciseRowSchema).default([]),
});

router.use(optionalAuth);

router.get('/', asyncHandler(workoutController.list));
router.post('/', requireAuth, validate({ body: workoutSchema }), uploadSingle('workoutThumbnails', 'thumbnail'), asyncHandler(workoutController.create));
router.get('/:id', asyncHandler(workoutController.get));
router.patch('/:id', requireAuth, validate({ body: workoutSchema.partial() }), asyncHandler(workoutController.update));
router.post('/:id/reorder', requireAuth, validate({ body: z.object({ order: z.array(z.object({ id: z.string(), position: z.number().int() })) }) }), asyncHandler(workoutController.reorder));
router.post('/:id/superset', requireAuth, validate({ body: z.object({ exerciseRowId: z.string(), withRowId: z.string() }) }), asyncHandler(workoutController.superset));
router.post('/:id/circuit', requireAuth, validate({ body: z.object({ name: z.string().min(1), exerciseRowIds: z.array(z.string()).min(2), laps: z.number().int().min(1).max(20) }) }), asyncHandler(workoutController.circuit));
router.post('/:id/duplicate', requireAuth, asyncHandler(workoutController.duplicate));
router.post('/:id/template', requireAuth, validate({ body: z.object({ isTemplate: z.boolean() }) }), asyncHandler(workoutController.template));
router.delete('/:id', requireAuth, asyncHandler(workoutController.remove));

module.exports = router;
