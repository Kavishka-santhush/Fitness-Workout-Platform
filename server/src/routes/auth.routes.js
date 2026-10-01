const express = require('express');
const { z } = require('zod');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();

const onboardingSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  goal: z.enum(['WEIGHT_LOSS', 'MUSCLE_GAIN', 'ENDURANCE', 'FLEXIBILITY', 'GENERAL_FITNESS', 'ATHLETIC_PERFORMANCE']).optional(),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ATHLETE']).optional(),
  activityLevel: z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']).optional(),
  sex: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  birthDate: z.string().optional(),
  heightCm: z.coerce.number().min(50).max(270).optional(),
  weightKg: z.coerce.number().min(20).max(500).optional(),
  preferredTypes: z.array(z.string()).default([]),
  equipment: z.array(z.string()).default([]),
  injuries: z.array(z.string()).default([]),
  workoutDaysWeek: z.coerce.number().int().min(1).max(7).optional(),
  preferredDuration: z.coerce.number().int().min(5).max(240).optional(),
  units: z.enum(['METRIC', 'IMPERIAL']).optional(),
  language: z.string().max(10).optional(),
});

// NOTE: the Clerk webhook (POST /api/auth/clerk-webhook) is mounted in app.js
// with express.raw BEFORE the global JSON parser (svix needs the raw body), so it
// is intentionally not registered on this router.

router.get('/me', requireAuth, asyncHandler(authController.me));
router.post('/onboarding', requireAuth, validate({ body: onboardingSchema }), asyncHandler(authController.onboarding));

module.exports = router;
