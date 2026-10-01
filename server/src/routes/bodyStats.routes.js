const express = require('express');
const { z } = require('zod');
const bodyStatsController = require('../controllers/bodyStats.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate, dateStr } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();
router.use(requireAuth);

router.post('/estimate-body-fat', validate({ body: z.object({
  sex: z.enum(['M', 'F']),
  waist: z.number().min(20).max(300),
  neck: z.number().min(20).max(100),
  height: z.number().min(80).max(260),
  hips: z.number().min(50).max(250).optional(),
}) }), asyncHandler(bodyStatsController.estimateBodyFat));

router.get('/current', asyncHandler(bodyStatsController.current));
router.get('/history', validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(400).default(60) }) }), asyncHandler(bodyStatsController.history));
router.get('/', validate({ query: z.object({ from: dateStr.optional(), to: dateStr.optional() }) }), asyncHandler(bodyStatsController.list));
router.post('/', validate({ body: z.object({
  date: dateStr.optional(),
  weightKg: z.number().min(20).max(400).optional(),
  bodyFatPct: z.number().min(2).max(70).optional(),
  muscleMassKg: z.number().min(5).max(200).optional(),
  measurements: z.record(z.number()).optional(),
  notes: z.string().max(500).optional(),
}) }), asyncHandler(bodyStatsController.log));
router.delete('/:id', asyncHandler(bodyStatsController.remove));

router.get('/goals', asyncHandler(bodyStatsController.listGoals));
router.post('/goals', validate({ body: z.object({
  type: z.enum(['TARGET_WEIGHT', 'TARGET_BODY_FAT', 'TARGET_MEASUREMENT']),
  metricKey: z.string().min(1).max(40),
  startValue: z.number().optional(),
  targetValue: z.number(),
  targetDate: dateStr.optional(),
}) }), asyncHandler(bodyStatsController.setGoal));
router.delete('/goals/:id', asyncHandler(bodyStatsController.removeGoal));

module.exports = router;
