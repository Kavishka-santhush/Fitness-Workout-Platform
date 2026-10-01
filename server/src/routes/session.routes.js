const express = require('express');
const { z } = require('zod');
const sessionController = require('../controllers/session.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { uploadSingle } = require('../utils/upload.util');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();
router.use(requireAuth);

const setSchema = z.object({
  exerciseId: z.string(),
  setNumber: z.number().int().min(1).max(50),
  reps: z.number().int().min(0).max(1000).optional(),
  weight: z.number().min(0).max(1000).optional(),
  durationSec: z.number().int().min(0).optional(),
  distanceM: z.number().int().min(0).optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  hrAvg: z.number().int().min(0).max(250).optional(),
  restSec: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
  loggedData: z.record(z.any()).optional(),
});

router.post('/start', validate({ body: z.object({ workoutId: z.string().optional(), programId: z.string().optional(), name: z.string().max(120).optional() }) }), asyncHandler(sessionController.start));
router.get('/history', asyncHandler(sessionController.history));

// Cardio / GPS
router.post('/cardio', validate({ body: z.object({
  activityType: z.enum(['RUNNING', 'CYCLING', 'SWIMMING', 'WALKING', 'ROWING', 'ELLIPTICAL', 'JUMP_ROPE', 'STAIR_CLIMB', 'HIKING', 'CUSTOM']),
  title: z.string().max(120).optional(),
  durationSec: z.number().int().min(1).max(86400),
  distanceM: z.number().int().min(0).optional(),
  calories: z.number().int().min(0).optional(),
  avgHr: z.number().int().optional(), maxHr: z.number().int().optional(),
  elevationM: z.number().int().optional(),
  laps: z.array(z.object({ index: z.number(), distanceM: z.number().optional(), durationSec: z.number().optional(), paceSec: z.number().optional() })).optional(),
  hrZones: z.record(z.number()).optional(),
  routeId: z.string().optional(),
  source: z.enum(['MANUAL', 'GPS', 'WEARABLE']).default('MANUAL'),
  notes: z.string().max(1000).optional(),
  date: z.string().optional(),
}) }), asyncHandler(sessionController.logCardio));

router.post('/routes', validate({ body: z.object({
  name: z.string().min(1).max(120),
  activityType: z.enum(['RUNNING', 'CYCLING', 'WALKING', 'HIKING', 'CUSTOM']).default('RUNNING'),
  points: z.array(z.tuple([z.number(), z.number(), z.number().optional()])).min(2),
  elevationM: z.number().int().optional(),
}) }), asyncHandler(sessionController.saveRoute));
router.get('/routes', asyncHandler(sessionController.routes));
router.post('/routes/:id/share', validate({ body: z.object({ isShared: z.boolean() }) }), asyncHandler(sessionController.shareRoute));

router.get('/:id', asyncHandler(sessionController.get));
router.post('/:id/auto-save', asyncHandler(sessionController.autoSave));
router.post('/:id/pause', asyncHandler(sessionController.pause));
router.post('/:id/resume', asyncHandler(sessionController.resume));
router.post('/:id/sets', validate({ body: setSchema }), asyncHandler(sessionController.logSet));
router.post('/:id/add-set', validate({ body: setSchema }), asyncHandler(sessionController.logSet)); // "add extra set" = same flow
router.post('/:id/skip', validate({ body: z.object({ exerciseId: z.string(), reason: z.string().max(200).optional() }) }), asyncHandler(sessionController.skip));
router.post('/:id/swap', validate({ body: z.object({ fromExerciseId: z.string(), toExerciseId: z.string() }) }), asyncHandler(sessionController.swap));
router.post('/:id/complete', asyncHandler(sessionController.complete));
router.post('/:id/partial', asyncHandler(sessionController.savePartial));
router.post('/:id/abandon', asyncHandler(sessionController.abandon));
router.post('/:id/photo', uploadSingle('progressPhotos', 'photo'), asyncHandler(sessionController.attachPhoto));

module.exports = router;
