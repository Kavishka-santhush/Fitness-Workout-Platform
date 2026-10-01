const express = require('express');
const { z } = require('zod');
const foodController = require('../controllers/food.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();
router.use(requireAuth);

router.get('/', validate({ query: z.object({
  q: z.string().min(2).max(120).optional(),
  barcode: z.string().min(6).max(40).optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}) }), asyncHandler(foodController.search));

router.get('/favorites', asyncHandler(foodController.favorites));
router.post('/:id/favorite', asyncHandler(foodController.toggleFavorite));
router.get('/recent', asyncHandler(foodController.recent));

router.post('/custom', validate({ body: z.object({
  name: z.string().min(1).max(160),
  brand: z.string().max(120).optional(),
  servingSizeG: z.number().min(1).max(5000).optional(),
  servingLabel: z.string().max(60).optional(),
  calories: z.number().min(0).max(10000),
  proteinG: z.number().min(0).optional(),
  carbsG: z.number().min(0).optional(),
  fatG: z.number().min(0).optional(),
  fiberG: z.number().min(0).optional(),
  sugarG: z.number().min(0).optional(),
  sodiumMg: z.number().min(0).optional(),
  micros: z.record(z.number()).optional(),
  category: z.string().max(80).optional(),
}) }), asyncHandler(foodController.createCustom));

const ingredientSchema = z.object({
  foodId: z.string().optional(),
  name: z.string().max(160).optional(),
  quantity: z.number().min(0),
  unit: z.string().max(20).default('g'),
});

router.get('/recipes', asyncHandler(foodController.listRecipes));
router.post('/recipes', validate({ body: z.object({
  name: z.string().min(1).max(160),
  servings: z.number().int().min(1).max(50).default(1),
  dietaryTags: z.array(z.string().max(30)).default([]),
  instructions: z.string().max(5000).optional(),
  ingredients: z.array(ingredientSchema).min(1),
}) }), asyncHandler(foodController.createRecipe));
router.get('/recipes/:id', asyncHandler(foodController.getRecipe));
router.delete('/recipes/:id', asyncHandler(foodController.deleteRecipe));

module.exports = router;
