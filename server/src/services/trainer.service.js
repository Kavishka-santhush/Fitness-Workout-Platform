/**
 * Trainer service — applications/verification, availability, client-facing
 * booking flow, in-booking messaging, homework, reviews, earnings.
 *
 * NOTE: TrainerAvailability.trainerId references TrainerProfile.id, while
 * TrainerSessionBooking.trainerId references the trainer's User.id.
 */
const prisma = require('../lib/prisma');
const { notFound, badRequest, conflict, forbidden } = require('../utils/response.util');

async function profileOf(userId) {
  const profile = await prisma.trainerProfile.findUnique({ where: { userId } });
  return profile;
}

async function requireProfile(userId) {
  const p = await profileOf(userId);
  if (!p) throw notFound('No trainer profile — apply first');
  return p;
}

/* ---------- Application ---------- */

async function apply(userId, data) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User not found');
  if (!data.specializations?.length) throw badRequest('At least one specialization required');
  const existing = await profileOf(userId);
  if (existing && existing.verificationStatus === 'APPROVED') throw forbidden('Already an approved trainer');
  const payload = {
    bio: data.bio || null,
    specializations: data.specializations,
    certifications: data.certifications || [],
    yearsExperience: data.yearsExperience || null,
    languages: data.languages || [],
    hourlyRateCents: data.hourlyRateCents || 5000,
    currency: data.currency || 'usd',
    verificationStatus: 'PENDING',
  };
  if (existing) return prisma.trainerProfile.update({ where: { id: existing.id }, data: payload });
  return prisma.trainerProfile.create({ data: { userId, ...payload } });
}

/** Called by admin.service to approve/reject. */
async function setVerification(profileId, status, verifiedById) {
  return prisma.trainerProfile.update({ where: { id: profileId }, data: { verificationStatus: status, verifiedById: verifiedById || null, ...(status === 'APPROVED' ? {} : {}) } });
}

async function getMyProfile(userId) {
  const profile = await requireProfile(userId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, avatarUrl: true, email: true } });
  const upcoming = await prisma.trainerSessionBooking.count({ where: { trainerId: userId, status: 'CONFIRMED', scheduledAt: { gte: new Date() } } });
  return { ...profile, user, upcoming };
}

async function updateMyProfile(userId, data) {
  const profile = await requireProfile(userId);
  const patch = {};
  for (const k of ['bio', 'specializations', 'certifications', 'yearsExperience', 'languages', 'hourlyRateCents', 'currency']) {
    if (data[k] !== undefined) patch[k] = data[k];
  }
  return prisma.trainerProfile.update({ where: { id: profile.id }, data: patch });
}

/* ---------- Directory ---------- */

async function browse({ q, specialization, minRate, maxRate, sort = 'rating', page = 1, limit = 20 }) {
  const where = { verificationStatus: 'APPROVED' };
  if (specialization) where.specializations = { has: specialization };
  if (minRate != null || maxRate != null) {
    where.hourlyRateCents = {};
    if (minRate != null) where.hourlyRateCents.gte = minRate;
    if (maxRate != null) where.hourlyRateCents.lte = maxRate;
  }
  if (q) where.OR = [{ bio: { contains: q, mode: 'insensitive' } }, { user: { displayName: { contains: q, mode: 'insensitive' } } }];
  const orderBy = sort === 'price_low' ? { hourlyRateCents: 'asc' } : sort === 'price_high' ? { hourlyRateCents: 'desc' } : { ratingAvg: 'desc' };
  const [items, total] = await Promise.all([
    prisma.trainerProfile.findMany({ where, include: { user: { select: { id: true, displayName: true, avatarUrl: true } } }, orderBy, skip: (page - 1) * limit, take: +limit }),
    prisma.trainerProfile.count({ where }),
  ]);
  return { items, page: +page, limit: +limit, total };
}

async function publicProfile(trainerUserId) {
  const profile = await prisma.trainerProfile.findUnique({
    where: { userId: trainerUserId },
    include: { user: { select: { id: true, displayName: true, avatarUrl: true, bio: true } } },
  });
  if (!profile) throw notFound('Trainer not found');
  const reviews = await prisma.trainerSessionBooking.findMany({
    where: { trainerId: trainerUserId, rating: { not: null } },
    orderBy: { updatedAt: 'desc' }, take: 20,
    include: { client: { select: { id: true, displayName: true, avatarUrl: true } } },
  });
  return { ...profile, reviews: reviews.map((r) => ({ rating: r.rating, review: r.review, client: r.client, at: r.updatedAt })) };
}

/* ---------- Availability ---------- */

async function setAvailability(userId, { date, slots = [] }) {
  const profile = await requireProfile(userId);
  const day = new Date(date); day.setHours(0, 0, 0, 0);
  await prisma.trainerAvailability.deleteMany({ where: { trainerId: profile.id, date: day, booked: false } });
  if (!slots.length) return { created: 0 };
  const created = await prisma.trainerAvailability.createMany({
    data: slots.map((s) => ({
      trainerId: profile.id,
      date: day,
      startTime: new Date(`${day.toISOString().slice(0, 10)}T${s.startTime}`),
      endTime: new Date(`${day.toISOString().slice(0, 10)}T${s.endTime}`),
      sessionTypes: s.sessionTypes || ['VIDEO_CALL'],
    })),
  });
  return { created: created.count };
}

async function listAvailability(userId, { from, to }) {
  const profile = await requireProfile(userId);
  const where = { trainerId: profile.id };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }
  return prisma.trainerAvailability.findMany({ where, orderBy: { startTime: 'asc' } });
}

async function publicAvailability(trainerUserId, { from, to }) {
  const profile = await profileOf(trainerUserId);
  if (!profile) throw notFound('Trainer not found');
  const where = { trainerId: profile.id, booked: false };
  if (from) where.date = { gte: new Date(from), ...(to ? { lte: new Date(to) } : {}) };
  return prisma.trainerAvailability.findMany({ where, orderBy: { startTime: 'asc' } });
}

async function deleteAvailability(userId, id) {
  const profile = await requireProfile(userId);
  const slot = await prisma.trainerAvailability.findFirst({ where: { id, trainerId: profile.id } });
  if (!slot) throw notFound('Slot not found');
  if (slot.booked) throw badRequest('Slot already booked');
  await prisma.trainerAvailability.delete({ where: { id } });
  return true;
}

/* ---------- Bookings ---------- */

async function createBooking(clientId, data) {
  const trainerUser = await prisma.user.findUnique({ where: { id: data.trainerUserId } });
  if (!trainerUser) throw notFound('Trainer not found');
  const profile = await profileOf(data.trainerUserId);
  if (!profile || profile.verificationStatus !== 'APPROVED') throw badRequest('Trainer not available');
  let priceCents = data.priceCents;
  if (!priceCents) {
    const hours = (data.durationMin || 60) / 60;
    priceCents = Math.round(profile.hourlyRateCents * hours);
  }
  const booking = await prisma.trainerSessionBooking.create({
    data: {
      trainerId: data.trainerUserId,
      clientId,
      availabilityId: data.availabilityId || null,
      sessionType: data.sessionType || 'VIDEO_CALL',
      scheduledAt: new Date(data.scheduledAt),
      durationMin: data.durationMin || 60,
      priceCents,
      currency: profile.currency,
      preSessionNotes: data.preSessionNotes || null,
      status: 'PENDING',
    },
  });
  if (data.availabilityId) await prisma.trainerAvailability.update({ where: { id: data.availabilityId }, data: { booked: true } });
  const notificationService = require('./notification.service');
  notificationService.notify(data.trainerUserId, 'TRAINER_MESSAGE', 'New booking request', `${clientId} requested a ${booking.sessionType} session`, { bookingId: booking.id }).catch(() => {});
  return booking;
}

async function myBookingsAsClient(userId, { status, page = 1, limit = 20 }) {
  const where = { clientId: userId, ...(status ? { status } : {}) };
  const [items, total] = await Promise.all([
    prisma.trainerSessionBooking.findMany({ where, include: { trainer: { select: { id: true, displayName: true, avatarUrl: true } } }, orderBy: { scheduledAt: 'desc' }, skip: (page - 1) * limit, take: +limit }),
    prisma.trainerSessionBooking.count({ where }),
  ]);
  return { items, page: +page, limit: +limit, total };
}

async function myBookingsAsTrainer(userId, { status, upcoming, page = 1, limit = 20 }) {
  const where = { trainerId: userId, ...(status ? { status } : {}) };
  if (upcoming) where.scheduledAt = { gte: new Date() };
  const [items, total] = await Promise.all([
    prisma.trainerSessionBooking.findMany({ where, include: { client: { select: { id: true, displayName: true, avatarUrl: true } } }, orderBy: { scheduledAt: upcoming ? 'asc' : 'desc' }, skip: (page - 1) * limit, take: +limit }),
    prisma.trainerSessionBooking.count({ where }),
  ]);
  return { items, page: +page, limit: +limit, total };
}

async function getBooking(userId, id) {
  const booking = await prisma.trainerSessionBooking.findUnique({
    where: { id },
    include: { trainer: { select: { id: true, displayName: true, avatarUrl: true } }, client: { select: { id: true, displayName: true, avatarUrl: true } }, messages: { include: { sender: { select: { id: true, displayName: true } } }, orderBy: { createdAt: 'asc' } } },
  });
  if (!booking) throw notFound('Booking not found');
  if (booking.trainerId !== userId && booking.clientId !== userId) throw forbidden('Not your booking');
  return booking;
}

async function setBookingStatus(userId, id, status) {
  const booking = await prisma.trainerSessionBooking.findUnique({ where: { id } });
  if (!booking) throw notFound('Booking not found');
  if (booking.trainerId !== userId && booking.clientId !== userId) throw forbidden('Not your booking');
  const data = { status };
  if (status === 'COMPLETED' && booking.trainerId === userId) {
    // auto-payout accounting handled by payment/payout job; just bump counters
    await prisma.trainerProfile.update({ where: { userId }, data: { sessionsDone: { increment: 1 } } }).catch(() => {});
    data.videoRoomId = booking.videoRoomId;
    data.postSessionNotes = booking.postSessionNotes;
  }
  if (status === 'CANCELLED' && booking.availabilityId) await prisma.trainerAvailability.update({ where: { id: booking.availabilityId }, data: { booked: false } }).catch(() => {});
  const updated = await prisma.trainerSessionBooking.update({ where: { id }, data });
  const notificationService = require('./notification.service');
  const other = booking.trainerId === userId ? booking.clientId : booking.trainerId;
  notificationService.notify(other, 'BOOKING_CONFIRMED', `Booking ${status.toLowerCase()}`, null, { bookingId: id }).catch(() => {});
  return updated;
}

async function assignHomework(userId, id, homework) {
  const booking = await prisma.trainerSessionBooking.findUnique({ where: { id } });
  if (!booking) throw notFound('Booking not found');
  if (booking.trainerId !== userId) throw forbidden('Only the trainer can assign homework');
  return prisma.trainerSessionBooking.update({ where: { id }, data: { homework } });
}

async function postSessionNotes(userId, id, notes) {
  const booking = await prisma.trainerSessionBooking.findUnique({ where: { id } });
  if (!booking) throw notFound('Booking not found');
  if (booking.trainerId !== userId) throw forbidden('Only the trainer can write notes');
  return prisma.trainerSessionBooking.update({ where: { id }, data: { postSessionNotes: notes } });
}

async function rateBooking(userId, id, { rating, review }) {
  const booking = await prisma.trainerSessionBooking.findUnique({ where: { id } });
  if (!booking) throw notFound('Booking not found');
  if (booking.clientId !== userId) throw forbidden('Only the client can rate');
  if (booking.rating != null) throw conflict('Already rated');
  if (booking.status !== 'COMPLETED') throw badRequest('Session must be completed first');
  await prisma.trainerSessionBooking.update({ where: { id }, data: { rating, review: review || null } });
  // recompute avg
  const agg = await prisma.trainerSessionBooking.aggregate({ where: { trainerId: booking.trainerId, rating: { not: null } }, _avg: { rating: true }, _count: true });
  await prisma.trainerProfile.update({ where: { userId: booking.trainerId }, data: { ratingAvg: agg._avg.rating || 0, ratingCount: agg._count } });
  return { rating, review };
}

/* ---------- Messaging ---------- */

async function sendMessage(userId, bookingId, { body, attachments }) {
  const booking = await prisma.trainerSessionBooking.findUnique({ where: { id: bookingId } });
  if (!booking) throw notFound('Booking not found');
  if (userId !== booking.trainerId && userId !== booking.clientId) throw forbidden('Not a participant');
  const receiverId = userId === booking.trainerId ? booking.clientId : booking.trainerId;
  const msg = await prisma.trainerMessage.create({ data: { bookingId, senderId: userId, receiverId, body, attachments: attachments || [] } });
  const notificationService = require('./notification.service');
  notificationService.notify(receiverId, 'TRAINER_MESSAGE', 'New message', body.slice(0, 120), { bookingId }).catch(() => {});
  return msg;
}

async function unreadCount(userId) {
  return prisma.trainerMessage.count({ where: { receiverId: userId, readAt: null } });
}

async function markRead(userId, bookingId) {
  await prisma.trainerMessage.updateMany({ where: { receiverId: userId, bookingId, readAt: null }, data: { readAt: new Date() } });
  return { read: true };
}

/* ---------- Clients (trainer roster) ---------- */

async function listClients(userId) {
  const profile = await requireProfile(userId);
  return prisma.trainerClient.findMany({ where: { trainerId: profile.id }, include: { client: { select: { id: true, displayName: true, avatarUrl: true } } }, orderBy: { grantedAt: 'desc' } });
}

async function upsertClientShare(userId, { clientUserId, shareWorkouts, shareNutrition, shareBodyStats }) {
  const profile = await requireProfile(userId);
  const existing = await prisma.trainerClient.findFirst({ where: { trainerId: profile.id, clientUserId } });
  if (existing) {
    return prisma.trainerClient.update({ where: { id: existing.id }, data: { shareWorkouts, shareNutrition, shareBodyStats } });
  }
  const created = await prisma.trainerClient.create({ data: { trainerId: profile.id, clientUserId, shareWorkouts, shareNutrition, shareBodyStats } });
  await prisma.trainerProfile.update({ where: { id: profile.id }, data: { clientCount: { increment: 1 } } });
  return created;
}

/* ---------- Dashboard ---------- */

async function dashboard(userId) {
  const profile = await requireProfile(userId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [bookings, monthBookings, earnings, unread] = await Promise.all([
    prisma.trainerSessionBooking.count({ where: { trainerId: userId } }),
    prisma.trainerSessionBooking.findMany({ where: { trainerId: userId, scheduledAt: { gte: monthStart } }, select: { priceCents: true, status: true } }),
    prisma.payment.aggregate({ where: { recipientUserId: userId, status: 'SUCCEEDED', type: { in: ['SESSION_BOOKING', 'LIVE_CLASS'] }, createdAt: { gte: monthStart } }, _sum: { amountCents: true } }),
    prisma.trainerMessage.count({ where: { receiverId: userId, readAt: null } }),
  ]);
  return {
    trainer: profile,
    stats: {
      totalBookings: bookings,
      monthBookings: monthBookings.length,
      monthRevenueCents: earnings._sum.amountCents || 0,
      ratingAvg: profile.ratingAvg,
      ratingCount: profile.ratingCount,
      clientCount: profile.clientCount,
      unread,
    },
  };
}

module.exports = {
  apply, setVerification, getMyProfile, updateMyProfile, browse, publicProfile,
  setAvailability, listAvailability, publicAvailability, deleteAvailability,
  createBooking, myBookingsAsClient, myBookingsAsTrainer, getBooking, setBookingStatus,
  assignHomework, postSessionNotes, rateBooking, sendMessage, unreadCount, markRead,
  listClients, upsertClientShare, dashboard,
};
