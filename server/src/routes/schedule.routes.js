const express = require('express');
const { z } = require('zod');
const scheduleController = require('../controllers/schedule.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate, dateStr } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();
router.use(requireAuth);

const activityEnum = z.enum(['WORKOUT', 'CARDIO', 'REST', 'LIVE_CLASS', 'TRAINER_SESSION']);

router.get('/today', asyncHandler(scheduleController.today));
router.get('/upcoming', validate({ query: z.object({ days: z.coerce.number().int().min(1).max(60).default(7) }) }), asyncHandler(scheduleController.upcoming));
router.get('/week', validate({ query: z.object({ startDate: dateStr.optional() }) }), asyncHandler(scheduleController.week));
router.get('/range', validate({ query: z.object({ from: dateStr, to: dateStr }) }), asyncHandler(scheduleController.range));

router.post('/', validate({ body: z.object({
  date: dateStr,
  activityType: activityEnum,
  workoutId: z.string().uuid().optional(),
  programId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  challengeId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  isDeload: z.boolean().optional(),
  note: z.string().max(280).optional(),
}) }), asyncHandler(scheduleController.add));
router.post('/bulk', validate({ body: z.object({ items: z.array(z.object({ date: dateStr, activityType: activityEnum, workoutId: z.string().uuid().optional(), programId: z.string().uuid().optional(), isDeload: z.boolean().optional(), note: z.string().max(280).optional() })).min(1) }) }), asyncHandler(scheduleController.bulkPlan));
router.post('/rest-day', validate({ body: z.object({ date: dateStr }) }), asyncHandler(scheduleController.setRestDay));
router.post('/roll-over', validate({ body: z.object({ fromId: z.string().uuid(), toDate: dateStr }) }), asyncHandler(scheduleController.rollOver));

router.patch('/:id', validate({ body: z.object({ note: z.string().max(280).optional(), isDeload: z.boolean().optional(), status: z.string().optional(), date: dateStr.optional() }) }), asyncHandler(scheduleController.update));
router.post('/:id/status', validate({ body: z.object({ status: z.enum(['PLANNED', 'COMPLETED', 'MISSED', 'RESCHEDULED', 'SKIPPED', 'REST_DAY']) }) }), asyncHandler(scheduleController.setStatus));
router.post('/:id/reschedule', validate({ body: z.object({ date: dateStr }) }), asyncHandler(scheduleController.reschedule));
router.delete('/:id', asyncHandler(scheduleController.remove));

module.exports = router;
