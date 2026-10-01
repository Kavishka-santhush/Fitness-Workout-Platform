/**
 * Live class service — scheduling, enrollment (+waitlist), attendance,
 * ratings/replay, host start/end lifecycle. WebRTC signalling + chat +
 * live leaderboard run through the socket layer.
 */
const prisma = require('../lib/prisma');
const { notFound, badRequest, conflict, forbidden } = require('../utils/response.util');
const { publicUrl } = require('../utils/upload.util');
const { nanoid } = require('nanoid');

function slugRoom(title) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}-${nanoid(6)}`;
}

async function create(trainerId, data) {
  if (!data.title || !data.scheduledAt) throw badRequest('title and scheduledAt required');
  const klass = await prisma.liveClass.create({
    data: {
      trainerId,
      title: data.title,
      description: data.description || null,
      classType: data.classType || 'HIIT',
      durationMin: data.durationMin || 45,
      scheduledAt: new Date(data.scheduledAt),
      maxParticipants: data.maxParticipants || 50,
      priceCents: data.priceCents || 0,
      currency: data.currency || 'usd',
      coverImageUrl: data.coverImageUrl || null,
      roomId: slugRoom(data.title),
    },
    include: { trainer: { select: { id: true, displayName: true, avatarUrl: true } } },
  });
  // host calendar entry
  await prisma.scheduledItem.create({ data: { userId: trainerId, date: klass.scheduledAt, activityType: 'LIVE_CLASS', classId: klass.id, status: 'PLANNED', note: klass.title } }).catch(() => {});
  return klass;
}

async function update(trainerId, id, data) {
  const klass = await prisma.liveClass.findFirst({ where: { id, trainerId } });
  if (!klass) throw notFound('Class not found');
  if (klass.status === 'LIVE') throw badRequest('Cannot edit a live class');
  const patch = {};
  for (const k of ['title', 'description', 'classType', 'durationMin', 'maxParticipants', 'priceCents', 'coverImageUrl']) {
    if (data[k] !== undefined) patch[k] = data[k];
  }
  if (data.scheduledAt) patch.scheduledAt = new Date(data.scheduledAt);
  return prisma.liveClass.update({ where: { id }, data: patch });
}

async function cancel(trainerId, id) {
  const klass = await prisma.liveClass.findFirst({ where: { id, trainerId } });
  if (!klass) throw notFound('Class not found');
  const updated = await prisma.liveClass.update({ where: { id }, data: { status: 'CANCELLED' } });
  const enrollees = await prisma.classEnrollment.findMany({ where: { classId: id, status: { not: 'CANCELLED' } }, select: { userId: true } });
  const notificationService = require('./notification.service');
  for (const e of enrollees) notificationService.notify(e.userId, 'CLASS_STARTING', 'Class cancelled', `${klass.title} has been cancelled`, { classId: id }).catch(() => {});
  await prisma.scheduledItem.updateMany({ where: { classId: id }, data: { status: 'MISSED' } });
  return updated;
}

async function browse({ type, upcoming, trainerId, page = 1, limit = 20 }) {
  const where = { status: { not: 'CANCELLED' } };
  if (type) where.classType = type;
  if (trainerId) where.trainerId = trainerId;
  if (upcoming === true || upcoming === 'true') { where.scheduledAt = { gte: new Date() }; where.status = 'SCHEDULED'; }
  const [items, total] = await Promise.all([
    prisma.liveClass.findMany({ where, include: { trainer: { select: { id: true, displayName: true, avatarUrl: true } }, _count: { select: { enrollments: true } } }, orderBy: { scheduledAt: 'asc' }, skip: (page - 1) * limit, take: +limit }),
    prisma.liveClass.count({ where }),
  ]);
  return { items, page: +page, limit: +limit, total };
}

async function getOne(userId, id) {
  const klass = await prisma.liveClass.findUnique({
    where: { id },
    include: { trainer: { select: { id: true, displayName: true, avatarUrl: true } }, _count: { select: { enrollments: true } } },
  });
  if (!klass) throw notFound('Class not found');
  const enrollment = userId ? await prisma.classEnrollment.findFirst({ where: { classId: id, userId } }) : null;
  return { ...klass, isEnrolled: !!enrollment, enrollmentStatus: enrollment?.status || null, spotsLeft: Math.max(0, klass.maxParticipants - klass.enrollments ? klass.maxParticipants - klass._count.enrollments : klass.maxParticipants) };
}

async function enroll(userId, id) {
  const klass = await prisma.liveClass.findUnique({ where: { id } });
  if (!klass) throw notFound('Class not found');
  if (klass.status !== 'SCHEDULED') throw badRequest('Enrollment closed');
  const existing = await prisma.classEnrollment.findFirst({ where: { classId: id, userId } });
  if (existing) throw conflict('Already enrolled');
  const taken = await prisma.classEnrollment.count({ where: { classId: id, status: { not: 'CANCELLED' } } });
  const isWaitlist = taken >= klass.maxParticipants;
  const enrollment = await prisma.classEnrollment.create({
    data: { classId: id, userId, status: isWaitlist ? 'WAITLIST' : 'ENROLLED', isWaitlist, paidCents: klass.priceCents },
  });
  if (!isWaitlist) await prisma.liveClass.update({ where: { id }, data: { attendeeCount: { increment: 1 } } });
  await prisma.scheduledItem.create({ data: { userId, date: klass.scheduledAt, activityType: 'LIVE_CLASS', classId: id, enrollmentId: enrollment.id, status: 'PLANNED', note: klass.title } }).catch(() => {});
  const notificationService = require('./notification.service');
  notificationService.notify(klass.trainerId, 'CLASS_STARTING', isWaitlist ? 'Waitlist signup' : 'New enrollment', `${userId} joined ${klass.title}`, { classId: id }).catch(() => {});
  return { enrollment, waitlisted: isWaitlist, checkoutRequired: klass.priceCents > 0 };
}

async function cancelEnrollment(userId, id) {
  const enrollment = await prisma.classEnrollment.findFirst({ where: { classId: id, userId } });
  if (!enrollment) throw notFound('Not enrolled');
  if (enrollment.status === 'ATTENDED') throw badRequest('Already attended');
  await prisma.classEnrollment.update({ where: { id: enrollment.id }, data: { status: 'CANCELLED' } });
  if (!enrollment.isWaitlist) await prisma.liveClass.update({ where: { id }, data: { attendeeCount: { decrement: 1 } } }).catch(() => {});
  // promote from waitlist
  const next = await prisma.classEnrollment.findFirst({ where: { classId: id, status: 'WAITLIST' }, orderBy: { enrolledAt: 'asc' } });
  if (next) await prisma.classEnrollment.update({ where: { id: next.id }, data: { status: 'ENROLLED', isWaitlist: false } });
  return { cancelled: true };
}

/* ---------- Host lifecycle ---------- */

async function setStatus(trainerId, id, status) {
  const klass = await prisma.liveClass.findFirst({ where: { id, trainerId } });
  if (!klass) throw notFound('Class not found');
  const updated = await prisma.liveClass.update({ where: { id }, data: { status } });
  if (status === 'LIVE') {
    const notificationService = require('./notification.service');
    const enrollees = await prisma.classEnrollment.findMany({ where: { classId: id, status: { in: ['ENROLLED', 'ATTENDED'] } }, select: { userId: true } });
    for (const e of enrollees) notificationService.notify(e.userId, 'CLASS_STARTING', 'Class is live now', `${klass.title} has started`, { classId: id, roomId: klass.roomId }).catch(() => {});
  }
  return updated;
}

async function attachRecording(trainerId, id, file) {
  const klass = await prisma.liveClass.findFirst({ where: { id, trainerId } });
  if (!klass) throw notFound('Class not found');
  return prisma.liveClass.update({ where: { id }, data: { recordingUrl: publicUrl('classRecordings', file.filename) } });
}

async function markAttendance(classId, userId) {
  const enrollment = await prisma.classEnrollment.findFirst({ where: { classId, userId } });
  if (!enrollment) throw notFound('Not enrolled');
  return prisma.classEnrollment.update({ where: { id: enrollment.id }, data: { status: 'ATTENDED' } });
}

async function rateClass(userId, id, { rating, review }) {
  const enrollment = await prisma.classEnrollment.findFirst({ where: { classId: id, userId } });
  if (!enrollment) throw notFound('Not enrolled');
  if (enrollment.rating != null) throw conflict('Already rated');
  await prisma.classEnrollment.update({ where: { id: enrollment.id }, data: { rating } });
  const klass = await prisma.liveClass.findUnique({ where: { id } });
  const newCount = klass.ratingCount + 1;
  const newAvg = (klass.ratingAvg * klass.ratingCount + rating) / newCount;
  const updated = await prisma.liveClass.update({ where: { id }, data: { ratingAvg: newAvg, ratingCount: newCount, ...(review ? { engagement: { ...(klass.engagement || {}), lastReview: review } } : {}) } });
  // completion achievement hook
  require('./achievement.service').onClassAttended?.(userId).catch?.(() => {});
  return updated;
}

async function myClasses(userId, { role = 'attendee', status, page = 1, limit = 20 }) {
  if (role === 'host') {
    const where = { trainerId: userId, ...(status ? { status } : {}) };
    const [items, total] = await Promise.all([
      prisma.liveClass.findMany({ where, orderBy: { scheduledAt: 'desc' }, skip: (page - 1) * limit, take: +limit }),
      prisma.liveClass.count({ where }),
    ]);
    return { items, page: +page, limit: +limit, total };
  }
  const where = { userId, ...(status ? { status } : {}) };
  const [items, total] = await Promise.all([
    prisma.classEnrollment.findMany({ where, include: { klass: true }, orderBy: { enrolledAt: 'desc' }, skip: (page - 1) * limit, take: +limit }),
    prisma.classEnrollment.count({ where }),
  ]);
  return { items: items.map((e) => ({ ...e.klass, enrollmentStatus: e.status, myRating: e.rating })), page: +page, limit: +limit, total };
}

/* ---------- Chat (persisted; socket broadcasts too) ---------- */

async function postChat(userId, classId, { body, reaction }) {
  if (!body && !reaction) throw badRequest('body or reaction required');
  const member = await prisma.classEnrollment.findFirst({ where: { classId, userId } });
  if (!member) throw forbidden('Not enrolled in this class');
  return prisma.classChatMessage.create({ data: { classId, userId, body: body || null, reaction: reaction || null }, include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } });
}

async function chatHistory(classId, { limit = 100 }) {
  return prisma.classChatMessage.findMany({ where: { classId }, include: { user: { select: { id: true, displayName: true, avatarUrl: true } } }, orderBy: { createdAt: 'asc' }, take: limit });
}

/* ---------- Replays ---------- */

async function replays(userId) {
  const attended = await prisma.classEnrollment.findMany({ where: { userId, status: 'ATTENDED' }, include: { klass: true }, orderBy: { enrolledAt: 'desc' } });
  return attended.filter((e) => e.klass.recordingUrl).map((e) => ({ classId: e.klass.id, title: e.klass.title, classType: e.klass.classType, durationMin: e.klass.durationMin, recordingUrl: e.klass.recordingUrl, scheduledAt: e.klass.scheduledAt, watchedFor: e.attendedFor }));
}

async function saveReplayProgress(userId, classId, watchedSec) {
  const enrollment = await prisma.classEnrollment.findFirst({ where: { classId, userId } });
  if (!enrollment) throw notFound('Not enrolled');
  return prisma.classEnrollment.update({ where: { id: enrollment.id }, data: { attendedFor: watchedSec } });
}

module.exports = { create, update, cancel, browse, getOne, enroll, cancelEnrollment, setStatus, attachRecording, markAttendance, rateClass, myClasses, postChat, chatHistory, replays, saveReplayProgress };
