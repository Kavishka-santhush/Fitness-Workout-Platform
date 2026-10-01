const express = require('express');
const achievementController = require('../controllers/achievement.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();

router.get('/leaderboard', optionalAuth, asyncHandler(achievementController.leaderboard));
router.get('/mine', requireAuth, asyncHandler(achievementController.gallery));
router.post('/evaluate', requireAuth, asyncHandler(achievementController.evaluate));

module.exports = router;
