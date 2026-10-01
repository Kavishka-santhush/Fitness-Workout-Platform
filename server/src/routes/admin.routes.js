const express = require('express');
const { z } = require('zod');
const admin = require('../controllers/admin.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireStaff, requireRole } = require('../middleware/role.middleware');
const { validate, pagination, idParam } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();
router.use(requireAuth, requireStaff);

const decision = z.object({ decision: z.enum(['APPROVE', 'REJECT']), note: z.string().max(1000).optional() });
const reportDecision = z.object({ decision: z.enum(['UPHELD', 'DISMISS']), note: z.string().max(1000).optional() });

router.get('/dashboard', asyncHandler(admin.dashboard));

/* Users */
router.get('/users', validate({ query: pagination.extend({ q: z.string().optional(), role: z.enum(['SUPER_ADMIN', 'ADMIN', 'TRAINER', 'NUTRITIONIST', 'MEMBER']).optional(), subscriptionType: z.enum(['FREE', 'PREMIUM', 'TRAINER_PRO', 'NUTRITION_PRO', 'ENTERPRISE']).optional(), banned: z.enum(['true', 'false']).transform((v) => v === 'true').optional() }) }), asyncHandler(admin.listUsers));
router.get('/users/:id', validate({ params: idParam }), asyncHandler(admin.getUser));
router.post('/users/:id/ban', validate({ params: idParam, body: z.object({ reason: z.string().max(500).optional() }) }), asyncHandler(admin.ban));
router.post('/users/:id/unban', validate({ params: idParam }), asyncHandler(admin.unban));
router.patch('/users/:id/role', requireRole('SUPER_ADMIN'), validate({ params: idParam, body: z.object({ role: z.enum(['SUPER_ADMIN', 'ADMIN', 'TRAINER', 'NUTRITIONIST', 'MEMBER']) }) }), asyncHandler(admin.setRole));
router.patch('/users/:id/subscription', validate({ params: idParam, body: z.object({ subscriptionType: z.enum(['FREE', 'PREMIUM', 'TRAINER_PRO', 'NUTRITION_PRO', 'ENTERPRISE']) }) }), asyncHandler(admin.setSubscription));

/* Moderation queues */
router.get('/trainers/pending', validate({ query: pagination }), asyncHandler(admin.pendingTrainers));
router.post('/trainers/:id/review', validate({ params: idParam, body: decision }), asyncHandler(admin.reviewTrainer));

router.get('/exercises/pending', validate({ query: pagination }), asyncHandler(admin.pendingExercises));
router.post('/exercises/:id/review', validate({ params: idParam, body: decision }), asyncHandler(admin.reviewExercise));

router.get('/programs/pending', validate({ query: pagination }), asyncHandler(admin.pendingPrograms));
router.post('/programs/:id/review', validate({ params: idParam, body: decision }), asyncHandler(admin.reviewProgram));
router.post('/programs/:id/feature', validate({ params: idParam, body: z.object({ featured: z.boolean() }) }), asyncHandler(admin.featureProgram));

router.get('/reports', validate({ query: pagination.extend({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional() }) }), asyncHandler(admin.listReports));
router.post('/reports/:id/resolve', validate({ params: idParam, body: reportDecision }), asyncHandler(admin.resolveReport));

/* Settings + audit */
router.get('/settings', asyncHandler(admin.getSettings));
router.put('/settings', validate({ body: z.object({ key: z.string().min(1), value: z.any() }) }), asyncHandler(admin.setSetting));
router.get('/audit', validate({ query: pagination.extend({ action: z.string().optional(), entityType: z.string().optional() }) }), asyncHandler(admin.listAuditLogs));

module.exports = router;
