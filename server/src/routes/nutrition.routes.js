const express = require('express');
const { z } = require('zod');
const nutritionController = require('../controllers/nutrition.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate, dateStr } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();

/* Public: calculator (no persistence) */
const calcBody = z.object({
  weight: z.number().min(20).max(400),
  height: z.number().min(100).max(260),
  age: z.number().int().min(10).max(110),
  sex: z.enum(['M', 'F']),
  activityLevel: z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']).default('MODERATE'),
  goal: z.enum(['WEIGHT_LOSS', 'MUSCLE_GAIN', 'ENDURANCE', 'FLEXIBILITY', 'GENERAL_FITNESS', 'ATHLETIC_PERFORMANCE', 'MAINTENANCE']).default('GENERAL_FITNESS'),
  goalPreset: z.string().optional(),
});
router.post('/calculate', validate({ body: calcBody }), asyncHandler(nutritionController.calculate));

/* Everything below needs auth */
router.use(requireAuth);

router.get('/goal', asyncHandler(nutritionController.getGoal));
router.get('/target-today', asyncHandler(nutritionController.targetToday));
router.post('/recalculate', validate({ body: z.object({ preset: z.string().optional() }) }), asyncHandler(nutritionController.recalculate));
router.post('/preset', validate({ body: z.object({ preset: z.string() }) }), asyncHandler(nutritionController.applyPreset));
router.patch('/macros', validate({ body: z.object({
  proteinPct: z.number().min(0).max(100).optional(),
  carbPct: z.number().min(0).max(100).optional(),
  fatPct: z.number().min(0).max(100).optional(),
  proteinG: z.number().min(0).optional(),
  carbsG: z.number().min(0).optional(),
  fatG: z.number().min(0).optional(),
}) }), asyncHandler(nutritionController.setCustom));
router.patch('/calorie-cycling', validate({ body: z.object({
  enabled: z.boolean(),
  workoutDay: z.object({ calories: z.number().int().min(0), protein: z.number().optional(), carbs: z.number().optional(), fat: z.number().optional() }).optional(),
  restDay: z.object({ calories: z.number().int().min(0), protein: z.number().optional(), carbs: z.number().optional(), fat: z.number().optional() }).optional(),
}) }), asyncHandler(nutritionController.setCycling));
router.patch('/water-target', validate({ body: z.object({ waterTargetMl: z.number().int().min(0).max(20000) }) }), asyncHandler(nutritionController.setWater));
router.get('/net-calories', validate({ query: z.object({ date: z.string().optional() }) }), asyncHandler(nutritionController.netCalories));

/* Meal plans */
const mealSchema = z.object({
  slot: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT']),
  dayIndex: z.number().int().min(1).max(7).default(1),
  foodId: z.string().uuid().optional(),
  recipeId: z.string().uuid().optional(),
  label: z.string().max(160).optional(),
  servings: z.number().min(0.25).max(20).default(1),
  calories: z.number().int().min(0).default(0),
  proteinG: z.number().min(0).default(0),
  carbsG: z.number().min(0).default(0),
  fatG: z.number().min(0).default(0),
});
const planBody = z.object({
  name: z.string().min(1).max(160),
  goal: z.enum(['WEIGHT_LOSS', 'MUSCLE_GAIN', 'ENDURANCE', 'FLEXIBILITY', 'GENERAL_FITNESS', 'ATHLETIC_PERFORMANCE', 'MAINTENANCE']).optional(),
  dietary: z.string().max(30).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY']).optional(),
  caloriesPerDay: z.number().int().min(0).optional(),
  proteinG: z.number().int().min(0).optional(),
  carbsG: z.number().int().min(0).optional(),
  fatG: z.number().int().min(0).optional(),
  allergies: z.array(z.string().max(40)).optional(),
  cuisine: z.string().max(60).optional(),
  isAiGenerated: z.boolean().optional(),
  dayConfig: z.record(z.any()).optional(),
  priceCents: z.number().int().min(0).optional(),
  meals: z.array(mealSchema).optional(),
});

router.get('/plans', asyncHandler(nutritionController.myPlans));
router.post('/plans', validate({ body: planBody }), asyncHandler(nutritionController.createPlan));
router.get('/plans/browse', validate({ query: z.object({
  q: z.string().max(120).optional(), dietary: z.string().optional(), goal: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20),
}) }), asyncHandler(nutritionController.browsePlans));
router.get('/plans/today', validate({ query: z.object({ date: dateStr.optional() }) }), asyncHandler(nutritionController.todaysPlan));
router.get('/plans/:id', asyncHandler(nutritionController.getPlan));
router.patch('/plans/:id', validate({ body: planBody.partial() }), asyncHandler(nutritionController.updatePlan));
router.delete('/plans/:id', asyncHandler(nutritionController.deletePlan));
router.post('/plans/:id/follow', asyncHandler(nutritionController.followPlan));
router.post('/plans/:id/unfollow', asyncHandler(nutritionController.unfollowPlan));
router.post('/plan-meals/:planMealId/log', asyncHandler(nutritionController.logPlanMeal));

/* Grocery lists */
router.get('/grocery', asyncHandler(nutritionController.listGrocery));
router.post('/grocery', validate({ body: z.object({ planId: z.string().uuid().optional(), weeks: z.number().int().min(1).max(8).default(1) }) }), asyncHandler(nutritionController.generateGrocery));
router.get('/grocery/:id', asyncHandler(nutritionController.getGrocery));
router.patch('/grocery/:id', validate({ body: z.object({ items: z.array(z.object({
  name: z.string().max(160), quantity: z.number(), unit: z.string().max(20).optional(), category: z.string().max(60).optional(),
})) }) }), asyncHandler(nutritionController.updateGrocery));
router.get('/grocery/:id/pdf', asyncHandler(nutritionController.groceryPdf));

module.exports = router;
