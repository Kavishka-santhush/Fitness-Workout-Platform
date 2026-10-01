const express = require('express');
const { z } = require('zod');
const wearableController = require('../controllers/wearable.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate, dateStr } = require('../middleware/validate.middleware');
const { uploadSingle } = require('../utils/upload.util');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();
router.use(requireAuth);

const dataType = z.enum(['STEPS', 'HEART_RATE', 'SLEEP', 'ACTIVE_CALORIES', 'WORKOUT']);
const dataSrc = z.enum(['APPLE_HEALTH', 'GOOGLE_FIT', 'GARMIN_CSV', 'POLAR_CSV', 'FITBIT_CSV', 'MANUAL']);

router.post('/record', validate({ body: z.object({
  source: dataSrc.optional(), type: dataType, date: dateStr.optional(),
  value: z.number(), unit: z.string().max(20).optional(), details: z.record(z.any()).optional(),
}) }), asyncHandler(wearableController.record));

router.post('/sync', validate({ body: z.object({
  source: dataSrc.optional(),
  points: z.array(z.object({ type: dataType, date: dateStr.optional(), value: z.number(), unit: z.string().max(20).optional(), source: dataSrc.optional(), details: z.record(z.any()).optional() })).min(1),
}) }), asyncHandler(wearableController.sync));

router.post('/import-csv', uploadSingle('wearableCsv', 'file'), asyncHandler(wearableController.importCsv));

router.get('/daily', validate({ query: z.object({ date: dateStr.optional() }) }), asyncHandler(wearableController.daily));
router.get('/series', validate({ query: z.object({ type: dataType.default('STEPS'), from: dateStr, to: dateStr.optional(), agg: z.enum(['sum', 'avg', 'max']).default('sum') }) }), asyncHandler(wearableController.series));
router.get('/recent', validate({ query: z.object({ type: dataType.optional(), limit: z.coerce.number().int().min(1).max(200).default(50) }) }), asyncHandler(wearableController.recent));
router.get('/sources', asyncHandler(wearableController.sources));
router.delete('/sources/:source', asyncHandler(wearableController.clear));

module.exports = router;
