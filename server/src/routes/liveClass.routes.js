const express = require('express');
const { z } = require('zod');
const liveClassController = require('../controllers/liveClass.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const { requireVerifiedTrainer } = require('../middleware/role.middleware');
const { validate, pagination } = require('../middleware/validate.middleware');
const { uploadSingle } = require('../utils/upload.util');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();

router.get('/', validate({ query: pagination.extend({ type: z.string().optional(), trainerId: z.string().uuid().optional(), upcoming: z.union([z.coerce.boolean(), z.string()]).optional() }) }), asyncHandler(liveClassController.browse));
router.get('/replays', requireAuth, asyncHandler(liveClassController.replays));
router.get('/mine', requireAuth, validate({ query: pagination.extend({ role: z.enum(['attendee', 'host']).optional(), status: z.string().optional() }) }), asyncHandler(liveClassController.mine));
router.get('/:id', optionalAuth, asyncHandler(liveClassController.getOne));

router.use(requireAuth);

router.post('/', requireVerifiedTrainer, validate({ body: z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  classType: z.string().max(40).default('HIIT'),
  durationMin: z.number().int().min(5).max(240).default(45),
  scheduledAt: z.string(),
  maxParticipants: z.number().int().min(1).max(5000).default(50),
  priceCents: z.number().int().min(0).default(0),
  currency: z.string().length(3).default('usd'),
  coverImageUrl: z.string().max(500).optional(),
}) }), asyncHandler(liveClassController.create));
router.patch('/:id', requireVerifiedTrainer, asyncHandler(liveClassController.update));
router.post('/:id/cancel', requireVerifiedTrainer, asyncHandler(liveClassController.cancel));
router.post('/:id/status', requireVerifiedTrainer, validate({ body: z.object({ status: z.enum(['SCHEDULED', 'LIVE', 'COMPLETED']) }) }), asyncHandler(liveClassController.setStatus));
router.post('/:id/recording', requireVerifiedTrainer, uploadSingle('classRecordings', 'recording'), asyncHandler(liveClassController.attachRecording));

router.post('/:id/enroll', asyncHandler(liveClassController.enroll));
router.post('/:id/cancel-enrollment', asyncHandler(liveClassController.cancelEnrollment));
router.post('/:id/attend', asyncHandler(liveClassController.markAttendance));
router.post('/:id/rate', validate({ body: z.object({ rating: z.number().int().min(1).max(5), review: z.string().max(2000).optional() }) }), asyncHandler(liveClassController.rate));
router.post('/:id/replay-progress', validate({ body: z.object({ watchedSec: z.number().int().min(0) }) }), asyncHandler(liveClassController.saveReplayProgress));

router.get('/:id/chat', validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(500).default(100) }) }), asyncHandler(liveClassController.chatHistory));
router.post('/:id/chat', validate({ body: z.object({ body: z.string().max(1000).optional(), reaction: z.string().max(8).optional() }) }), asyncHandler(liveClassController.postChat));

module.exports = router;
