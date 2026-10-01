/**
 * Payment service — Stripe subscriptions, one-off purchases (programs, trainer
 * sessions, live classes) with Connect splits, webhooks, receipts and payouts.
 *
 * Flow: we create a local Payment row (PROCESSING) → open a Stripe Checkout
 * session carrying `metadata.paymentId` → the webhook flips it to SUCCEEDED and
 * unlocks the entitlement (enrollment / booking / paid class seat).
 */
const prisma = require('../lib/prisma');
const { stripe, PLAN_CATALOGUE, COMMISSION_PCT } = require('../lib/stripe');
const { notFound, badRequest, forbidden, conflict } = require('../utils/response.util');
const { generatePdf } = require('../utils/pdf.util');
const logger = require('../utils/logger.util');

const notify = (userId, type, title, body, data) =>
  require('./notification.service').notify(userId, type, title, body, data).catch(() => {});

/* ---------- Stripe customer ---------- */

async function ensureCustomer(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User not found');
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe().customers.create({
    email: user.email,
    name: user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
    metadata: { userId: user.id },
  });
  await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

/* ---------- Subscription checkout ---------- */

async function createSubscriptionCheckout(userId, { plan }) {
  const cfg = PLAN_CATALOGUE[plan];
  if (!cfg) throw badRequest(`Unknown plan: ${plan}`);
  const customerId = await ensureCustomer(userId);
  const existing = await prisma.subscription.findFirst({ where: { userId, status: { in: ['ACTIVE', 'TRIALING'] } } });
  if (existing && existing.plan === plan) throw conflict(`Already subscribed to ${cfg.name}`);

  const line_item = cfg.stripePriceIdMonthly
    ? { price: cfg.stripePriceIdMonthly, quantity: 1 }
    : { // fallback: inline recurring price so checkout works without pre-created Prices
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: cfg.priceCents,
          recurring: { interval: 'month' },
          product_data: { name: `${cfg.name} membership` },
        },
      };

  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [line_item],
    success_url: `${process.env.CLIENT_URL}/settings/billing?status=success`,
    cancel_url: `${process.env.CLIENT_URL}/pricing?status=cancelled`,
    subscription_data: { metadata: { userId, plan } },
    metadata: { userId, kind: 'SUBSCRIPTION', plan },
  });
  return { checkoutUrl: session.url, sessionId: session.id, plan: cfg.name, priceCents: cfg.priceCents };
}

/* ---------- One-off purchase: program ---------- */

async function createProgramPurchase(userId, { programId }) {
  const program = await prisma.program.findUnique({ where: { id: programId }, include: { creator: { select: { id: true, trainerProfile: { select: { stripeConnectAccountId: true, verificationStatus: true } } } } } });
  if (!program) throw notFound('Program not found');
  if (program.status !== 'PUBLISHED') throw forbidden('This program is not available for purchase');
  if (program.creatorId === userId) throw badRequest('You cannot purchase your own program');
  const owned = await prisma.programEnrollment.findUnique({ where: { userId_programId: { userId, programId } } });
  if (owned) throw conflict('You already own this program');
  if (program.priceCents === 0) {
    await prisma.programEnrollment.create({ data: { userId, programId, totalWorkouts: program.workouts?.length || 0 } });
    return { free: true, enrolled: true };
  }
  const customerId = await ensureCustomer(userId);
  const fee = Math.round((program.priceCents * Number(program.commissionPct)) / 100);
  const connectId = program.creator.trainerProfile?.stripeConnectAccountId;

  const payment = await prisma.payment.create({
    data: { userId, type: 'PROGRAM_PURCHASE', status: 'PROCESSING', amountCents: program.priceCents, currency: program.currency, platformFeeCents: fee, recipientUserId: program.creatorId, programId, metadata: { name: program.name } },
  });

  const base = {
    mode: 'payment',
    customer: customerId,
    line_items: [{ quantity: 1, price_data: { currency: program.currency, unit_amount: program.priceCents, product_data: { name: program.name, description: `by ${program.creator.displayName || 'Trainer'}` } } }],
    success_url: `${process.env.CLIENT_URL}/programs/${programId}?status=success`,
    cancel_url: `${process.env.CLIENT_URL}/programs/${programId}?status=cancelled`,
    metadata: { userId, kind: 'PROGRAM', paymentId: payment.id, programId },
  };
  if (connectId) {
    base.transfer_data = { destination: connectId, amount_reduced_by_application_fee: true };
    base.application_fee_amount = fee;
  }
  const session = await stripe().checkout.sessions.create(base);
  return { checkoutUrl: session.url, sessionId: session.id, paymentId: payment.id };
}

/* ---------- One-off purchase: trainer session booking ---------- */

async function createSessionBookingPayment(userId, { bookingId }) {
  const booking = await prisma.trainerSessionBooking.findUnique({ where: { id: bookingId }, include: { trainer: { select: { id: true, displayName: true, trainerProfile: { select: { stripeConnectAccountId: true } } } } } });
  if (!booking) throw notFound('Booking not found');
  if (booking.clientId !== userId) throw forbidden('Not your booking');
  if (booking.stripePaymentIntentId) throw conflict('Booking already paid');
  const customerId = await ensureCustomer(userId);
  const fee = Math.round((booking.priceCents * COMMISSION_PCT()) / 100);
  const connectId = booking.trainer.trainerProfile?.stripeConnectAccountId;

  const payment = await prisma.payment.create({
    data: { userId, type: 'SESSION_BOOKING', status: 'PROCESSING', amountCents: booking.priceCents, currency: booking.currency, platformFeeCents: fee, recipientUserId: booking.trainerId, bookingId, metadata: { trainer: booking.trainer.displayName, scheduledAt: booking.scheduledAt } },
  });

  const base = {
    mode: 'payment',
    customer: customerId,
    line_items: [{ quantity: 1, price_data: { currency: booking.currency, unit_amount: booking.priceCents, product_data: { name: `1:1 session with ${booking.trainer.displayName}` } } }],
    success_url: `${process.env.CLIENT_URL}/trainer/bookings/${bookingId}?status=success`,
    cancel_url: `${process.env.CLIENT_URL}/trainer/bookings/${bookingId}?status=cancelled`,
    metadata: { userId, kind: 'BOOKING', paymentId: payment.id, bookingId },
  };
  if (connectId) { base.transfer_data = { destination: connectId, amount_reduced_by_application_fee: true }; base.application_fee_amount = fee; }
  const session = await stripe().checkout.sessions.create(base);
  return { checkoutUrl: session.url, sessionId: session.id, paymentId: payment.id };
}

/* ---------- One-off purchase: live class seat ---------- */

async function createLiveClassPayment(userId, { classId }) {
  const klass = await prisma.liveClass.findUnique({ where: { id: classId }, include: { trainer: { select: { id: true, displayName: true, trainerProfile: { select: { stripeConnectAccountId: true } } } } } });
  if (!klass) throw notFound('Class not found');
  if (klass.priceCents === 0) throw badRequest('This class is free — just enrol');
  const customerId = await ensureCustomer(userId);
  const fee = Math.round((klass.priceCents * COMMISSION_PCT()) / 100);
  const connectId = klass.trainer.trainerProfile?.stripeConnectAccountId;

  const payment = await prisma.payment.create({
    data: { userId, type: 'LIVE_CLASS', status: 'PROCESSING', amountCents: klass.priceCents, currency: klass.currency, platformFeeCents: fee, recipientUserId: klass.trainerId, classId, metadata: { title: klass.title } },
  });

  const base = {
    mode: 'payment',
    customer: customerId,
    line_items: [{ quantity: 1, price_data: { currency: klass.currency, unit_amount: klass.priceCents, product_data: { name: `Live class: ${klass.title}` } } }],
    success_url: `${process.env.CLIENT_URL}/classes/${classId}?status=success`,
    cancel_url: `${process.env.CLIENT_URL}/classes/${classId}?status=cancelled`,
    metadata: { userId, kind: 'LIVE_CLASS', paymentId: payment.id, classId },
  };
  if (connectId) { base.transfer_data = { destination: connectId, amount_reduced_by_application_fee: true }; base.application_fee_amount = fee; }
  const session = await stripe().checkout.sessions.create(base);
  return { checkoutUrl: session.url, sessionId: session.id, paymentId: payment.id };
}

/* ---------- Subscription management ---------- */

async function getMySubscription(userId) {
  const sub = await prisma.subscription.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionType: true } });
  return { plan: user?.subscriptionType || 'FREE', subscription: sub };
}

async function cancelSubscription(userId, { atPeriodEnd = true } = {}) {
  const sub = await prisma.subscription.findFirst({ where: { userId, status: { in: ['ACTIVE', 'TRIALING'] } }, orderBy: { createdAt: 'desc' } });
  if (!sub) throw notFound('No active subscription');
  if (atPeriodEnd) {
    await stripe().subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
    return prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true } });
  }
  await stripe().subscriptions.cancel(sub.stripeSubscriptionId);
  const updated = await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELED', cancelAtPeriodEnd: false } });
  await prisma.user.update({ where: { id: userId }, data: { subscriptionType: 'FREE' } });
  return updated;
}

async function reactivateSubscription(userId) {
  const sub = await prisma.subscription.findFirst({ where: { userId, cancelAtPeriodEnd: true }, orderBy: { createdAt: 'desc' } });
  if (!sub) throw notFound('No subscription scheduled for cancellation');
  await stripe().subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: false });
  return prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: false } });
}

/* ---------- History + receipts ---------- */

async function listMyPayments(userId, { page = 1, limit = 20, type } = {}) {
  const where = { userId };
  if (type) where.type = type;
  const [items, total] = await Promise.all([
    prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { recipient: { select: { id: true, displayName: true } } } }),
    prisma.payment.count({ where }),
  ]);
  return { items, total, page, limit };
}

async function getReceipt(userId, paymentId) {
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, userId }, include: { recipient: { select: { displayName: true } } } });
  if (!payment) throw notFound('Payment not found');
  return payment;
}

async function receiptPdf(userId, paymentId) {
  const p = await getReceipt(userId, paymentId);
  const usd = (c) => `$${(c / 100).toFixed(2)}`;
  const html = `
    <h1>Receipt</h1>
    <p class="muted">${p.id} · ${p.createdAt.toISOString().slice(0, 10)}</p>
    <div class="card">
      <h2>${(p.metadata && p.metadata.name) || (p.metadata && p.metadata.title) || p.type}</h2>
      <table>
        <tr><th>Type</th><td>${p.type}</td></tr>
        ${p.recipient ? `<tr><th>Seller</th><td>${p.recipient.displayName}</td></tr>` : ''}
        <tr><th>Status</th><td>${p.status}</td></tr>
        <tr><th>Amount</th><td>${usd(p.amountCents)} ${p.currency.toUpperCase()}</td></tr>
        ${p.platformFeeCents ? `<tr><th>Platform fee</th><td>${usd(p.platformFeeCents)}</td></tr>` : ''}
      </table>
      <p class="badge">Total paid: ${usd(p.amountCents)}</p>
    </div>`;
  return generatePdf(html, { footer: 'Fitness & Workout Platform — Receipt' });
}

/* ---------- Trainer Connect onboarding ---------- */

async function getOrCreateConnectAccount(userId) {
  const profile = await prisma.trainerProfile.findUnique({ where: { userId } });
  if (!profile) throw forbidden('Trainer profile required');
  if (profile.stripeConnectAccountId) {
    const account = await stripe().accounts.retrieve(profile.stripeConnectAccountId);
    const link = await stripe().accountLinks.create({
      account: account.id, refresh_url: `${process.env.CLIENT_URL}/trainer/earnings?refresh=1`,
      return_url: `${process.env.CLIENT_URL}/trainer/earnings`, type: 'account_onboarding',
    });
    return { accountId: account.id, onboardingUrl: link.url, chargesEnabled: account.charges_enabled };
  }
  const account = await stripe().accounts.create({ type: 'express', country: 'US', email: (await prisma.user.findUnique({ where: { id: userId } })).email, capabilities: { transfers: { requested: true } } });
  await prisma.trainerProfile.update({ where: { userId }, data: { stripeConnectAccountId: account.id } });
  const link = await stripe().accountLinks.create({ account: account.id, refresh_url: `${process.env.CLIENT_URL}/trainer/earnings`, return_url: `${process.env.CLIENT_URL}/trainer/earnings`, type: 'account_onboarding' });
  return { accountId: account.id, onboardingUrl: link.url, chargesEnabled: false };
}

/** Admin/trainer: pay out a trainer's accrued net earnings for a period. */
async function createPayout(trainerUserId, { periodStart, periodEnd } = {}) {
  const start = periodStart ? new Date(periodStart) : new Date(Date.now() - 30 * 864e5);
  const end = periodEnd ? new Date(periodEnd) : new Date();
  const payments = await prisma.payment.findMany({
    where: { recipientUserId: trainerUserId, status: 'SUCCEEDED', type: { in: ['PROGRAM_PURCHASE', 'SESSION_BOOKING', 'LIVE_CLASS'] }, createdAt: { gte: start, lte: end } },
  });
  const net = payments.reduce((a, p) => a + (p.amountCents - p.platformFeeCents), 0);
  if (net <= 0) throw badRequest('No earnings to pay out for this period');
  const profile = await prisma.trainerProfile.findUnique({ where: { userId: trainerUserId } });
  if (!profile?.stripeConnectAccountId) throw forbidden('Trainer has not completed Stripe Connect onboarding');

  const payout = await prisma.payout.create({ data: { trainerId: trainerUserId, amountCents: net, currency: 'usd', status: 'PROCESSING', periodStart: start, periodEnd: end, paymentIds: payments.map((p) => p.id) } });
  try {
    const transfer = await stripe().transfers.create({ amount: net, currency: 'usd', destination: profile.stripeConnectAccountId, transfer_group: payout.id });
    await prisma.payout.update({ where: { id: payout.id }, data: { stripeTransferId: transfer.id, status: 'SUCCEEDED' } });
    await prisma.trainerProfile.update({ where: { userId: trainerUserId }, data: { totalEarningsCents: { increment: net } } });
    notify(trainerUserId, 'SYSTEM', 'Payout sent', `Your payout of $${(net / 100).toFixed(2)} has been sent to your linked bank account.`, { payoutId: payout.id });
    return { ...payout, stripeTransferId: transfer.id, status: 'SUCCEEDED', amountCents: net };
  } catch (err) {
    logger.error(`Payout failed for ${trainerUserId}: ${err.message}`);
    await prisma.payout.update({ where: { id: payout.id }, data: { status: 'FAILED' } });
    throw err;
  }
}

async function listPayouts(trainerUserId) {
  return prisma.payout.findMany({ where: { trainerId: trainerUserId }, orderBy: { createdAt: 'desc' } });
}

/* ---------- Webhook ---------- */

/** Verify + handle a raw Stripe webhook payload (body must be the raw Buffer). */
async function handleWebhook(rawBody, signature) {
  let event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    throw badRequest(`Webhook signature verification failed: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      await onCheckoutCompleted(event.data.object);
      break;
    }
    case 'customer.subscription.updated': {
      await onSubscriptionUpdated(event.data.object);
      break;
    }
    case 'customer.subscription.deleted': {
      await onSubscriptionDeleted(event.data.object);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const sub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: invoice.subscription } });
      if (sub) { await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'PAST_DUE' } }); notify(sub.userId, 'SUBSCRIPTION', 'Payment failed', 'Your last membership payment failed. Update your card to keep Premium.', { upgradeUrl: '/settings/billing' }); }
      break;
    }
    case 'charge.refunded': {
      const charge = event.data.object;
      const payment = await prisma.payment.findFirst({ where: { stripePaymentIntentId: charge.payment_intent } });
      if (payment) await prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
      break;
    }
    default:
      logger.debug(`Unhandled Stripe event ${event.type}`);
  }
  return { received: true, type: event.type };
}

async function onCheckoutCompleted(session) {
  const meta = session.metadata || {};
  const userId = meta.userId;
  if (!userId) return;

  if (meta.kind === 'SUBSCRIPTION') {
    const subData = await stripe().subscriptions.retrieve(session.subscription);
    const plan = meta.plan;
    const statusMap = { active: 'ACTIVE', trialing: 'TRIALING', past_due: 'PAST_DUE', canceled: 'CANCELED', unpaid: 'PAST_DUE', incomplete: 'INCOMPLETE', 'incomplete_expired': 'CANCELED' };
    const status = statusMap[subData.status] || 'ACTIVE';
    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: session.subscription },
      create: { userId, plan, stripeSubscriptionId: session.subscription, stripePriceId: (subData.items?.data?.[0]?.price)?.id, status, currentPeriodEnd: new Date(subData.current_period_end * 1000) },
      update: { status, plan, currentPeriodEnd: new Date(subData.current_period_end * 1000), cancelAtPeriodEnd: subData.cancel_at_period_end },
    });
    await prisma.user.update({ where: { id: userId }, data: { subscriptionType: plan } });
    await prisma.payment.create({ data: { userId, type: 'SUBSCRIPTION', status: 'SUCCEEDED', amountCents: session.amount_total || 0, currency: session.currency || 'usd', stripePaymentIntentId: session.payment_intent, metadata: { plan } } });
    notify(userId, 'SUBSCRIPTION', `Welcome to ${plan}!`, 'Your membership is now active. Enjoy unlimited access.', {});
    return;
  }

  // One-off payment types
  const payment = meta.paymentId ? await prisma.payment.findUnique({ where: { id: meta.paymentId } }) : null;
  if (payment) await prisma.payment.update({ where: { id: payment.id }, data: { status: 'SUCCEEDED', stripePaymentIntentId: session.payment_intent } });

  if (meta.kind === 'PROGRAM' && meta.programId) {
    const program = await prisma.program.findUnique({ where: { id: meta.programId } });
    await prisma.programEnrollment.upsert({
      where: { userId_programId: { userId, programId: meta.programId } },
      create: { userId, programId: meta.programId, status: 'ACTIVE', totalWorkouts: program?._count?.workouts || 0 },
      update: { status: 'ACTIVE' },
    });
    if (program) await prisma.program.update({ where: { id: program.id }, data: { salesCount: { increment: 1 } } }).catch(() => {});
    notify(userId, 'SYSTEM', 'Program unlocked', `You now own "${program?.name || 'the program'}".`, { programId: meta.programId });
    if (program) notify(program.creatorId, 'SYSTEM', 'Program sold', `Someone purchased "${program.name}".`, { programId: program.id });
  } else if (meta.kind === 'BOOKING' && meta.bookingId) {
    await prisma.trainerSessionBooking.update({ where: { id: meta.bookingId }, data: { status: 'CONFIRMED', stripePaymentIntentId: session.payment_intent } });
    const booking = await prisma.trainerSessionBooking.findUnique({ where: { id: meta.bookingId } });
    if (booking) notify(booking.trainerId, 'BOOKING_CONFIRMED', 'Session booked & paid', 'A client confirmed and paid for a session.', { bookingId: meta.bookingId });
  } else if (meta.kind === 'LIVE_CLASS' && meta.classId) {
    await prisma.classEnrollment.upsert({
      where: { classId_userId: { classId: meta.classId, userId } },
      create: { classId: meta.classId, userId, status: 'ENROLLED', paidCents: session.amount_total || 0, isWaitlist: false },
      update: { status: 'ENROLLED', paidCents: session.amount_total || 0, isWaitlist: false },
    });
    notify(userId, 'SYSTEM', 'Class seat confirmed', 'Your live class seat is paid and reserved.', { classId: meta.classId });
  }
}

async function onSubscriptionUpdated(stripeSub) {
  const local = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
  if (!local) return;
  const statusMap = { active: 'ACTIVE', trialing: 'TRIALING', past_due: 'PAST_DUE', canceled: 'CANCELED', unpaid: 'PAST_DUE' };
  const status = statusMap[stripeSub.status] || local.status;
  await prisma.subscription.update({ where: { id: local.id }, data: { status, cancelAtPeriodEnd: stripeSub.cancel_at_period_end, currentPeriodEnd: new Date(stripeSub.current_period_end * 1000) } });
}

async function onSubscriptionDeleted(stripeSub) {
  const local = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
  if (!local) return;
  await prisma.subscription.update({ where: { id: local.id }, data: { status: 'CANCELED' } });
  await prisma.user.update({ where: { id: local.userId }, data: { subscriptionType: 'FREE' } });
  notify(local.userId, 'SUBSCRIPTION', 'Subscription ended', 'Your membership has been cancelled. You are back on the Free plan.', {});
}

module.exports = {
  ensureCustomer, createSubscriptionCheckout, createProgramPurchase, createSessionBookingPayment, createLiveClassPayment,
  getMySubscription, cancelSubscription, reactivateSubscription, listMyPayments, getReceipt, receiptPdf,
  getOrCreateConnectAccount, createPayout, listPayouts, handleWebhook, PLAN_CATALOGUE,
};
