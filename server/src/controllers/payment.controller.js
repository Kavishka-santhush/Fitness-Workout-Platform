const paymentService = require('../services/payment.service');
const { ok, created } = require('../utils/response.util');

const plans = async (req, res) => ok(res, Object.entries(paymentService.PLAN_CATALOGUE).map(([key, v]) => ({ plan: key, ...v })));

const subscribe = async (req, res) => created(res, await paymentService.createSubscriptionCheckout(req.user.id, req.body), 'Checkout session created');
const buyProgram = async (req, res) => created(res, await paymentService.createProgramPurchase(req.user.id, { programId: req.params.programId }), 'Checkout session created');
const payBooking = async (req, res) => created(res, await paymentService.createSessionBookingPayment(req.user.id, { bookingId: req.params.bookingId }), 'Checkout session created');
const payClass = async (req, res) => created(res, await paymentService.createLiveClassPayment(req.user.id, { classId: req.params.classId }), 'Checkout session created');

const mySubscription = async (req, res) => ok(res, await paymentService.getMySubscription(req.user.id));
const cancel = async (req, res) => ok(res, await paymentService.cancelSubscription(req.user.id, req.body), 'Subscription cancellation applied');
const reactivate = async (req, res) => ok(res, await paymentService.reactivateSubscription(req.user.id), 'Subscription reactivated');

const listPayments = async (req, res) => {
  const { page, limit, type } = req.query;
  const { items, total } = await paymentService.listMyPayments(req.user.id, { page, limit, type });
  ok(res, items, undefined, { page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
};
const receipt = async (req, res) => ok(res, await paymentService.getReceipt(req.user.id, req.params.paymentId));
const receiptDownload = async (req, res) => {
  const pdf = await paymentService.receiptPdf(req.user.id, req.params.paymentId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="receipt-${req.params.paymentId}.pdf"`);
  res.send(pdf);
};

const connectAccount = async (req, res) => ok(res, await paymentService.getOrCreateConnectAccount(req.user.id));
const payout = async (req, res) => created(res, await paymentService.createPayout(req.user.id, req.body), 'Payout processed');
const payouts = async (req, res) => ok(res, await paymentService.listPayouts(req.user.id));

/** Stripe webhook — req.body is the raw Buffer (mounted with express.raw). */
const webhook = async (req, res) => {
  const result = await paymentService.handleWebhook(req.body, req.headers['stripe-signature']);
  ok(res, result, 'Webhook handled');
};

module.exports = { plans, subscribe, buyProgram, payBooking, payClass, mySubscription, cancel, reactivate, listPayments, receipt, receiptDownload, connectAccount, payout, payouts, webhook };
