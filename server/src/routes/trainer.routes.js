const express = require('express');
const { z } = require('zod');
const trainerController = require('../controllers/trainer.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const { requireVerifiedTrainer } = require('../middleware/role.middleware');
const { validate, pagination, dateStr } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();

// Public directory + trainer profile
router.get('/', validate({ query: pagination.extend({ q: z.string().max(120).optional(), specialization: z.string().optional(), minRate: z.coerce.number().optional(), maxRate: z.coerce.number().optional(), sort: z.string().optional() }) }), asyncHandler(trainerController.browse));
router.get('/:userId', optionalAuth, asyncHandler(trainerController.publicProfile));
router.get('/:userId/availability', validate({ query: z.object({ from: dateStr.optional(), to: dateStr.optional() }) }), asyncHandler(trainerController.publicAvailability));

router.use(requireAuth);

router.post('/apply', validate({ body: z.object({
  bio: z.string().max(4000).optional(),
  specializations: z.array(z.string().max(40)).min(1),
  certifications: z.array(z.object({ name: z.string().max(120), issuer: z.string().max(120).optional(), credentialUrl: z.string().max(500).optional() })).optional(),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  languages: z.array(z.string().max(30)).optional(),
  hourlyRateCents: z.number().int().min(0).max(1000000).optional(),
  currency: z.string().length(3).optional(),
}) }), asyncHandler(trainerController.apply));
router.get('/me/profile', asyncHandler(trainerController.myProfile));
router.patch('/me/profile', asyncHandler(trainerController.updateProfile));
router.get('/me/dashboard', requireVerifiedTrainer, asyncHandler(trainerController.dashboard));
router.get('/me/unread', asyncHandler(trainerController.unread));

/* Availability (trainer only) */
router.get('/me/availability', requireVerifiedTrainer, validate({ query: z.object({ from: dateStr.optional(), to: dateStr.optional() }) }), asyncHandler(trainerController.listAvailability));
router.post('/me/availability', requireVerifiedTrainer, validate({ body: z.object({
  date: dateStr,
  slots: z.array(z.object({ startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/), sessionTypes: z.array(z.string().max(30)).optional() })).default([]),
}) }), asyncHandler(trainerController.setAvailability));
router.delete('/me/availability/:id', requireVerifiedTrainer, asyncHandler(trainerController.deleteAvailability));

/* Bookings */
router.post('/bookings', validate({ body: z.object({
  trainerUserId: z.string().uuid(),
  availabilityId: z.string().uuid().optional(),
  sessionType: z.enum(['VIDEO_CALL', 'IN_PERSON', 'PROGRAM_REVIEW', 'NUTRITION_COACHING']).default('VIDEO_CALL'),
  scheduledAt: z.string(),
  durationMin: z.number().int().min(15).max(240).default(60),
  preSessionNotes: z.string().max(2000).optional(),
}) }), asyncHandler(trainerController.createBooking));
router.get('/bookings/mine', validate({ query: pagination.extend({ status: z.string().optional() }) }), asyncHandler(trainerController.bookingsAsClient));
router.get('/bookings/as-trainer', requireVerifiedTrainer, validate({ query: pagination.extend({ status: z.string().optional(), upcoming: z.union([z.coerce.boolean(), z.string()]).optional() }) }), asyncHandler(trainerController.bookingsAsTrainer));
router.get('/bookings/:id', asyncHandler(trainerController.getBooking));
router.post('/bookings/:id/status', validate({ body: z.object({ status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']) }) }), asyncHandler(trainerController.setBookingStatus));
router.post('/bookings/:id/homework', requireVerifiedTrainer, validate({ body: z.object({ homework: z.array(z.record(z.any())) }) }), asyncHandler(trainerController.assignHomework));
router.post('/bookings/:id/notes', requireVerifiedTrainer, validate({ body: z.object({ notes: z.string().max(4000) }) }), asyncHandler(trainerController.postNotes));
router.post('/bookings/:id/rate', validate({ body: z.object({ rating: z.number().int().min(1).max(5), review: z.string().max(2000).optional() }) }), asyncHandler(trainerController.rate));
router.post('/bookings/:id/messages', validate({ body: z.object({ body: z.string().min(1).max(4000), attachments: z.array(z.object({ url: z.string().max(500), name: z.string().max(160).optional() })).optional() }) }), asyncHandler(trainerController.sendMessage));
router.post('/bookings/:id/read', asyncHandler(trainerController.markRead));

/* Clients */
router.get('/me/clients', requireVerifiedTrainer, asyncHandler(trainerController.listClients));
router.post('/me/clients', requireVerifiedTrainer, validate({ body: z.object({ clientUserId: z.string().uuid(), shareWorkouts: z.boolean().default(false), shareNutrition: z.boolean().default(false), shareBodyStats: z.boolean().default(false) }) }), asyncHandler(trainerController.upsertClient));

module.exports = router;
