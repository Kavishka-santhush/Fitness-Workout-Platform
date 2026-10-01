const express = require('express');
const { z } = require('zod');
const analyticsController = require('../controllers/analytics.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireStaff } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();
router.use(requireAuth);

router.get('/me', asyncHandler(analyticsController.myDashboard));
router.get('/weekly', asyncHandler(analyticsController.weekly));
router.get('/wrap', validate({ query: z.object({ year: z.coerce.number().int().min(2000).max(2100).optional() }) }), asyncHandler(analyticsController.wrap));
router.get('/admin', requireStaff, asyncHandler(analyticsController.adminDashboard));

module.exports = router;
