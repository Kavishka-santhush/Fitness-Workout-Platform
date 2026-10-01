const express = require('express');
const { z } = require('zod');
const paymentController = require('../controllers/payment.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireVerifiedTrainer } = require('../middleware/role.middleware');
const { validate, pagination, uuid, idParam } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();

// NOTE: the Stripe webhook (POST /api/payments/webhook) is mounted in app.js
// with express.raw BEFORE the global JSON parser, so it bypasses requireAuth and
// this router. Signature verification happens in payment.service.handleWebhook.

router.use(requireAuth);

const planEnum = z.enum(['PREMIUM', 'TRAINER_PRO', 'NUTRITION_PRO', 'ENTERPRISE']);

router.get('/plans', asyncHandler(paymentController.plans));

router.post('/subscribe', validate({ body: z.object({ plan: planEnum }) }), asyncHandler(paymentController.subscribe));
router.post('/program/:programId/purchase', validate({ params: idParam }), asyncHandler(paymentController.buyProgram));
router.post('/booking/:bookingId/pay', validate({ params: idParam }), asyncHandler(paymentController.payBooking));
router.post('/class/:classId/pay', validate({ params: z.object({ classId: uuid }) }), asyncHandler(paymentController.payClass));

router.get('/subscription', asyncHandler(paymentController.mySubscription));
router.post('/subscription/cancel', validate({ body: z.object({ atPeriodEnd: z.boolean().optional().default(true) }) }), asyncHandler(paymentController.cancel));
router.post('/subscription/reactivate', asyncHandler(paymentController.reactivate));

router.get('/payments', validate({ query: pagination.extend({ type: z.enum(['SUBSCRIPTION', 'PROGRAM_PURCHASE', 'SESSION_BOOKING', 'LIVE_CLASS', 'PAYOUT', 'REFUND']).optional() }) }), asyncHandler(paymentController.listPayments));
router.get('/payments/:paymentId', validate({ params: idParam }), asyncHandler(paymentController.receipt));
router.get('/payments/:paymentId/receipt.pdf', validate({ params: idParam }), asyncHandler(paymentController.receiptDownload));

/* Trainer earnings / Stripe Connect (self-service) */
router.post('/connect/account', requireVerifiedTrainer, asyncHandler(paymentController.connectAccount));
router.get('/payouts', requireVerifiedTrainer, asyncHandler(paymentController.payouts));
router.post('/payouts', requireVerifiedTrainer, validate({ body: z.object({ periodStart: z.string().optional(), periodEnd: z.string().optional() }) }), asyncHandler(paymentController.payout));

module.exports = router;
