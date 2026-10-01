const express = require('express');
const { z } = require('zod');
const mealController = require('../controllers/meal.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate, dateStr } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();
router.use(requireAuth);

const slotEnum = z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT']);

router.get('/day', validate({ query: z.object({ date: dateStr.optional() }) }), asyncHandler(mealController.getDay));
router.post('/entries', validate({ body: z.object({
  date: dateStr.optional(),
  slot: slotEnum.optional(),
  foodId: z.string().uuid().optional(),
  recipeId: z.string().uuid().optional(),
  servings: z.number().min(0.25).max(20).default(1),
  mealName: z.string().max(160).optional(),
}) }), asyncHandler(mealController.addEntry));
router.patch('/entries/:id', validate({ body: z.object({
  slot: slotEnum.optional(),
  servings: z.number().min(0.25).max(20).optional(),
  mealName: z.string().max(160).optional(),
}) }), asyncHandler(mealController.updateEntry));
router.delete('/entries/:id', asyncHandler(mealController.deleteEntry));
router.post('/copy', validate({ body: z.object({ fromDate: dateStr, toDate: dateStr.optional() }) }), asyncHandler(mealController.copyDay));
router.get('/templates', asyncHandler(mealController.templates));

router.post('/water', validate({ body: z.object({ date: dateStr.optional(), amountMl: z.number().int().min(1).max(5000) }) }), asyncHandler(mealController.logWater));
router.delete('/water/:id', asyncHandler(mealController.deleteWater));

router.get('/summaries/daily', validate({ query: z.object({ from: dateStr, to: dateStr.optional() }) }), asyncHandler(mealController.dailySummary));
router.get('/summaries/weekly', validate({ query: z.object({ from: dateStr.optional() }) }), asyncHandler(mealController.weeklySummary));
router.get('/adherence', validate({ query: z.object({ days: z.coerce.number().int().min(7).max(365).default(30) }) }), asyncHandler(mealController.adherence));
router.get('/export', validate({ query: z.object({ from: dateStr.optional(), to: dateStr.optional() }) }), asyncHandler(mealController.exportCsv));

module.exports = router;
