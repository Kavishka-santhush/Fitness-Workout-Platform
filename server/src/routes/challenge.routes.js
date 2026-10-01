const express = require('express');
const { z } = require('zod');
const challengeController = require('../controllers/challenge.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireStaff } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();
router.use(requireAuth);

router.get('/', validate({ query: z.object({
  scope: z.string().optional(), type: z.string().optional(),
  active: z.union([z.coerce.boolean(), z.string()]).optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20),
}) }), asyncHandler(challengeController.browse));
router.get('/mine', asyncHandler(challengeController.mine));

router.post('/', requireStaff, validate({ body: z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  type: z.enum(['STREAK', 'VOLUME', 'DISTANCE', 'STEPS', 'CALORIES', 'CUSTOM']).default('STREAK'),
  scope: z.enum(['PLATFORM', 'TRAINER', 'COMMUNITY', 'TEAM', 'CORPORATE']).default('PLATFORM'),
  groupId: z.string().uuid().optional(),
  corporateOrgId: z.string().uuid().optional(),
  rulesConfig: z.record(z.any()).optional(),
  goalValue: z.number().positive(),
  goalUnit: z.string().max(20).default('reps'),
  startDate: z.string(),
  endDate: z.string(),
  prize: z.string().max(200).optional(),
  isTeamBased: z.boolean().optional(),
  maxTeams: z.number().int().min(1).max(1000).optional(),
  milestones: z.array(z.object({ at: z.number().min(0).max(1), label: z.string().max(60) })).optional(),
}) }), asyncHandler(challengeController.create));

router.get('/:id', asyncHandler(challengeController.getOne));
router.post('/:id/enroll', asyncHandler(challengeController.enroll));
router.post('/:id/team', validate({ body: z.object({ teamName: z.string().max(60).optional(), teamId: z.string().uuid().optional() }) }), asyncHandler(challengeController.joinTeam));
router.get('/:id/leaderboard', validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }) }), asyncHandler(challengeController.leaderboard));
router.post('/:id/refresh', requireStaff, asyncHandler(challengeController.refresh));

module.exports = router;
