/**
 * Program service — multi-week training programs, enrollment, progress,
 * marketplace (paid programs with platform commission), reviews, featured.
 */
const prisma = require('../lib/prisma');
const { notFound, forbidden, badRequest } = require('../utils/response.util');
const { publicUrl } = require('../utils/upload.util');
const notificationService = require('./notification.service');

const FULL_INCLUDE = {
  creator: { select: { id: true, displayName: true, avatarUrl: true, username: true, trainerProfile: { select: { verificationStatus: true, ratingAvg: true } } } },
  workouts: { include: { workout: { include: { exercises: { include: { exercise: { select: { name: true } } } } } } }, orderBy: [{ week: 'asc' }, { dayOfWeek: 'asc' }] },
};

async function list({ q, goal, difficulty, price, featured, creatorId, page = 1, limit = 12 }) {
  const where = { status: 'PUBLISHED' };
  if (q) where.name = { contains: q, mode: 'insensitive' };
  if (goal) where.goal = goal;
  if (difficulty) where.difficulty = difficulty;
  if (featured === 'true') where.featured = true;
  if (creatorId) where.creatorId = creatorId;
  if (price === 'free') where.priceCents = 0;
  if (price === 'paid') where.priceCents = { gt: 0 };
  const [items, total] = await Promise.all([
    prisma.program.findMany({ where, include: { _count: { select: { enrollments: true, workouts: true } }, creator: { select: { displayName: true, avatarUrl: true } } }, orderBy: [{ featured: 'desc' }, { enrollmentCount: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: +limit }),
    prisma.program.count({ where }),
  ]);
  return { items, page: +page, limit: +limit, total };
}

async function get(id, requester) {
  const program = await prisma.program.findUnique({ where: { id }, include: FULL_INCLUDE });
  if (!program) throw notFound('Program not found');
  const isOwner = requester && program.creatorId === requester.id;
  const isStaff = requester && ['SUPER_ADMIN', 'ADMIN'].includes(requester.role);
  if (program.status !== 'PUBLISHED' && !isOwner && !isStaff) throw forbidden('Program not published');
  let enrollment = null;
  if (requester) {
    enrollment = await prisma.programEnrollment.findUnique({ where: { userId_programId: { userId: requester.id, programId: id } } });
  }
  return { ...program, enrollment, previewOnly: !enrollment && program.priceCents > 0 && !isOwner };
}

async function create(userId, data, { cover, trailer } = {}) {
  const { weeks = [], ...rest } = data; // weeks: [{week, days:[{dayOfWeek, workoutId, isRestDay, progressionNote}]}]
  const program = await prisma.program.create({
    data: {
      ...rest,
      creatorId: userId,
      coverImageUrl: cover ? publicUrl('programCovers', cover.filename) : data.coverImageUrl || null,
      trailerVideoUrl: trailer ? publicUrl('programTrailers', trailer.filename) : data.trailerVideoUrl || null,
    },
  });
  const rows = [];
  for (const w of weeks) {
    for (const d of w.days) {
      rows.push({ programId: program.id, workoutId: d.workoutId, week: w.week, dayOfWeek: d.dayOfWeek, isRestDay: !!d.isRestDay, progressionNote: d.progressionNote || null, position: d.position ?? 0 });
    }
  }
  if (rows.length) await prisma.programWorkout.createMany({ data: rows });
  return prisma.program.findUnique({ where: { id: program.id }, include: FULL_INCLUDE });
}

async function update(id, userId, data) {
  const program = await prisma.program.findUnique({ where: { id } });
  if (!program) throw notFound('Program not found');
  if (program.creatorId !== userId) throw forbidden('Not your program');
  const { weeks, ...rest } = data;
  if (weeks) {
    await prisma.programWorkout.deleteMany({ where: { programId: id } });
    const rows = [];
    for (const w of weeks) for (const d of w.days) rows.push({ programId: id, workoutId: d.workoutId, week: w.week, dayOfWeek: d.dayOfWeek, isRestDay: !!d.isRestDay, progressionNote: d.progressionNote || null, position: d.position ?? 0 });
    if (rows.length) await prisma.programWorkout.createMany({ data: rows });
  }
  await prisma.program.update({ where: { id }, data: rest });
  return prisma.program.findUnique({ where: { id }, include: FULL_INCLUDE });
}

/** Publish flow: staff review for paid programs; trainers publish free directly. */
async function publish(id, userId, role) {
  const program = await prisma.program.findUnique({ where: { id } });
  if (!program) throw notFound('Program not found');
  if (program.creatorId !== userId && !['SUPER_ADMIN', 'ADMIN'].includes(role)) throw forbidden('Not your program');
  const status = program.priceCents > 0 && role !== 'SUPER_ADMIN' && role !== 'ADMIN' ? 'PENDING_REVIEW' : 'PUBLISHED';
  return prisma.program.update({ where: { id }, data: { status } });
}

async function remove(id, userId, role) {
  const program = await prisma.program.findUnique({ where: { id } });
  if (!program) throw notFound('Program not found');
  if (program.creatorId !== userId && !['SUPER_ADMIN', 'ADMIN'].includes(role)) throw forbidden('Not your program');
  await prisma.program.update({ where: { id }, data: { status: 'ARCHIVED' } });
  return true;
}

/** Free enrollment + auto-scheduling into the user calendar. */
async function enroll(userId, programId) {
  const program = await prisma.program.findUnique({ where: { id: programId }, include: { workouts: true } });
  if (!program || program.status !== 'PUBLISHED') throw notFound('Program not available');
  if (program.priceCents > 0) {
    const paid = await prisma.payment.findFirst({ where: { userId, programId, type: 'PROGRAM_PURCHASE', status: 'SUCCEEDED' } });
    if (!paid) throw forbidden('Purchase required', { checkoutUrl: `/api/payments/program/${programId}/checkout` });
  }
  const existing = await prisma.programEnrollment.findUnique({ where: { userId_programId: { userId, programId } } });
  if (existing) throw badRequest('Already enrolled');

  const enrollment = await prisma.programEnrollment.create({
    data: { userId, programId, totalWorkouts: program.workouts.filter((w) => !w.isRestDay).length },
  });
  await prisma.program.update({ where: { id: programId }, data: { enrollmentCount: { increment: 1 } } });

  // Auto-schedule first two weeks into calendar
  const start = new Date();
  const scheduleRows = program.workouts
    .filter((w) => w.week <= 2)
    .map((w) => {
      const date = new Date(start);
      date.setDate(start.getDate() + (w.week - 1) * 7 + (w.dayOfWeek - 1));
      return { userId, programId, workoutId: w.workoutId, date, activityType: w.isRestDay ? 'REST' : 'WORKOUT', status: w.isRestDay ? 'REST_DAY' : 'PLANNED' };
    });
  if (scheduleRows.length) await prisma.scheduledItem.createMany({ data: scheduleRows });
  return enrollment;
}

async function unenroll(userId, programId) {
  await prisma.programEnrollment.deleteMany({ where: { userId, programId, status: { in: ['ACTIVE', 'PAUSED'] } } });
  await prisma.scheduledItem.deleteMany({ where: { userId, programId, status: 'PLANNED' } });
  return true;
}

/** Called by session service after completing a program workout. */
async function advanceProgress(userId, programId) {
  const enrollment = await prisma.programEnrollment.findUnique({ where: { userId_programId: { userId, programId } } });
  if (!enrollment) return null;
  const done = enrollment.workoutsDone + 1;
  const pct = enrollment.totalWorkouts ? Math.min(100, Math.round((done / enrollment.totalWorkouts) * 100)) : 0;
  const completed = pct >= 100;
  const updated = await prisma.programEnrollment.update({
    where: { id: enrollment.id },
    data: { workoutsDone: done, progressPct: pct, status: completed ? 'COMPLETED' : 'ACTIVE', completedAt: completed ? new Date() : null },
  });
  if (completed) {
    await prisma.program.update({ where: { id: programId }, data: { completionCount: { increment: 1 } } });
    const program = await prisma.program.findUnique({ where: { id: programId } });
    await prisma.certificate.create({ data: { userId, programId, type: 'PROGRAM_COMPLETION', title: `Certificate — ${program.name}` } });
    await notificationService.notify(userId, 'PROGRAM_COMPLETED', 'Program completed 🏆', `${program.name} — your certificate is ready.`, { programId });
  }
  return updated;
}

async function review(userId, programId, { rating, title, comment }) {
  const enrolled = await prisma.programEnrollment.findUnique({ where: { userId_programId: { userId, programId } } });
  if (!enrolled) throw forbidden('Enroll in the program to review it');
  const row = await prisma.programReview.upsert({
    where: { userId_programId: { userId, programId } },
    create: { userId, programId, enrollmentId: enrolled.id, rating, title, comment },
    update: { rating, title, comment },
  });
  const agg = await prisma.programReview.aggregate({ where: { programId }, _avg: { rating: true }, _count: true });
  await prisma.program.update({ where: { id: programId }, data: { ratingAvg: agg._avg.rating || 0, ratingCount: agg._count } });
  return row;
}

async function leaderboard(programId, { period = 'ALL_TIME', limit = 25 }) {
  const since = period === 'WEEKLY' ? new Date(Date.now() - 7 * 864e5) : period === 'MONTHLY' ? new Date(Date.now() - 30 * 864e5) : null;
  const where = { programId, status: 'ACTIVE' };
  if (since) where.updatedAt = { gte: since };
  const rows = await prisma.programEnrollment.findMany({ where, orderBy: { workoutsDone: 'desc' }, take: limit, include: { user: { select: { displayName: true, avatarUrl: true, username: true } } } });
  return rows.map((r, i) => ({ rank: i + 1, user: r.user, workoutsDone: r.workoutsDone, progressPct: r.progressPct }));
}

module.exports = { list, get, create, update, publish, remove, enroll, unenroll, advanceProgress, review, leaderboard, FULL_INCLUDE };
