const express = require('express');
const { z } = require('zod');
const progressController = require('../controllers/progress.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate, dateStr } = require('../middleware/validate.middleware');
const { uploadSingle } = require('../utils/upload.util');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();
router.use(requireAuth);

/* Photos */
router.get('/photos', asyncHandler(progressController.photoTimeline));
router.post('/photos', uploadSingle('progressPhotos', 'photo'), asyncHandler(progressController.addPhoto));
router.patch('/photos/:id', validate({ body: z.object({
  date: dateStr.optional(), pose: z.string().max(30).nullable().optional(),
  notes: z.string().max(500).optional(), isBeforeAfter: z.boolean().optional(),
  weightKg: z.number().optional(), bodyFatPct: z.number().optional(),
}) }), asyncHandler(progressController.updatePhoto));
router.delete('/photos/:id', asyncHandler(progressController.deletePhoto));
router.get('/before-after', validate({ query: z.object({ pose: z.string().max(30).optional() }) }), asyncHandler(progressController.beforeAfter));

/* Charts */
const daysQuery = z.object({ days: z.coerce.number().int().min(7).max(730).default(90) });
const weeksQuery = z.object({ weeks: z.coerce.number().int().min(2).max(104).default(12) });
router.get('/charts/weight', validate({ query: daysQuery }), asyncHandler(progressController.weightChart));
router.get('/charts/workouts', validate({ query: weeksQuery }), asyncHandler(progressController.workoutChart));
router.get('/charts/cardio', validate({ query: weeksQuery.extend({ activityType: z.string().optional() }) }), asyncHandler(progressController.cardioChart));
router.get('/charts/calories', validate({ query: daysQuery }), asyncHandler(progressController.caloriesChart));
router.get('/charts/exercises/:exerciseId', validate({ query: z.object({ limit: z.coerce.number().int().min(5).max(200).default(40) }) }), asyncHandler(progressController.exerciseProgress));

/* PRs */
router.get('/prs', validate({ query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }) }), asyncHandler(progressController.personalRecords));
router.get('/prs/:exerciseId/history', asyncHandler(progressController.prHistory));

/* Exports */
router.get('/export/all', asyncHandler(progressController.exportAll));
router.get('/export/workouts', asyncHandler(progressController.exportWorkouts));

module.exports = router;
