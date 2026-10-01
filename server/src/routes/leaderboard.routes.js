const express = require('express');
const { z } = require('zod');
const leaderboardController = require('../controllers/leaderboard.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();

const query = z.object({
  metric: z.enum(['XP', 'WORKOUTS', 'VOLUME', 'DISTANCE', 'STEPS', 'STREAK', 'CLASS_ATTENDANCE', 'KUDOS']).default('XP'),
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME']).default('WEEKLY'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

router.get('/metrics', asyncHandler(leaderboardController.metrics));
router.use(requireAuth);
router.get('/', validate({ query }), asyncHandler(leaderboardController.get));
router.get('/me', validate({ query: query.partial() }), asyncHandler(leaderboardController.mine));

module.exports = router;
