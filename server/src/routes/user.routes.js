const express = require('express');
const { z } = require('zod');
const userController = require('../controllers/user.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { uploadSingle } = require('../utils/upload.util');
const { uploadLimiter } = require('../middleware/rateLimit.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();

const profileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  bio: z.string().max(500).optional(),
  goal: z.enum(['WEIGHT_LOSS', 'MUSCLE_GAIN', 'ENDURANCE', 'FLEXIBILITY', 'GENERAL_FITNESS', 'ATHLETIC_PERFORMANCE']).optional(),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ATHLETE']).optional(),
  preferredTypes: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  injuries: z.array(z.string()).optional(),
  units: z.enum(['METRIC', 'IMPERIAL']).optional(),
  language: z.string().max(10).optional(),
});

const settingsSchema = z.object({
  notificationPrefs: z.record(z.boolean()).optional(),
  privacy: z.object({
    profileVisibility: z.enum(['PRIVATE', 'PUBLIC', 'CLIENTS_ONLY']).optional(),
    workoutVisibility: z.enum(['PRIVATE', 'PUBLIC', 'CLIENTS_ONLY']).optional(),
    statsVisibility: z.enum(['PRIVATE', 'PUBLIC', 'CLIENTS_ONLY']).optional(),
  }).optional(),
  account: z.object({
    units: z.enum(['METRIC', 'IMPERIAL']).optional(),
    language: z.string().max(10).optional(),
  }).optional(),
});

// Public routes (optional auth)
router.get('/search', optionalAuth, asyncHandler(userController.search));
router.get('/u/:username', optionalAuth, asyncHandler(userController.publicProfile));

router.use(requireAuth);

router.get('/dashboard', asyncHandler(userController.dashboard));
router.patch('/profile', validate({ body: profileSchema }), asyncHandler(userController.updateProfile));
router.post('/avatar', uploadLimiter, uploadSingle('avatars', 'photo'), asyncHandler(userController.uploadAvatar));
router.patch('/settings', validate({ body: settingsSchema }), asyncHandler(userController.updateSettings));
router.delete('/account', asyncHandler(userController.deleteAccount));

module.exports = router;
