/**
 * Progress service — progress photos (timeline + before/after), chart
 * aggregations (weight / volume / cardio / calories), PR pages, exports.
 */
const prisma = require('../lib/prisma');
const { notFound, badRequest } = require('../utils/response.util');
const { publicUrl } = require('../utils/upload.util');

function dayBucket(date) {
  const d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) throw badRequest('Invalid date');
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/* ---------- Progress photos ---------- */

async function addPhoto(userId, file, meta = {}) {
  if (!file) throw badRequest('Photo file required');
  return prisma.progressPhoto.create({
    data: {
      userId,
      imageUrl: publicUrl('progressPhotos', file.filename),
      sessionId: meta.sessionId || null,
      date: dayBucket(meta.date),
      pose: meta.pose || null,
      weightKg: meta.weightKg != null ? String(meta.weightKg) : null,
      bodyFatPct: meta.bodyFatPct != null ? String(meta.bodyFatPct) : null,
      notes: meta.notes || null,
    },
  });
}

async function updatePhoto(userId, id, data) {
  const photo = await prisma.progressPhoto.findFirst({ where: { id, userId } });
  if (!photo) throw notFound('Photo not found');
  return prisma.progressPhoto.update({
    where: { id },
    data: {
      ...(data.date ? { date: dayBucket(data.date) } : {}),
      ...(data.pose !== undefined ? { pose: data.pose } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.isBeforeAfter !== undefined ? { isBeforeAfter: data.isBeforeAfter } : {}),
      ...(data.weightKg != null ? { weightKg: String(data.weightKg) } : {}),
      ...(data.bodyFatPct != null ? { bodyFatPct: String(data.bodyFatPct) } : {}),
    },
  });
}

async function deletePhoto(userId, id) {
  const photo = await prisma.progressPhoto.findFirst({ where: { id, userId } });
  if (!photo) throw notFound('Photo not found');
  await prisma.progressPhoto.delete({ where: { id } });
  return true;
}

/** Timeline grouped by month for the gallery grid. */
async function photoTimeline(userId) {
  const photos = await prisma.progressPhoto.findMany({ where: { userId }, orderBy: { date: 'desc' } });
  const months = new Map();
  for (const p of photos) {
    const key = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, '0')}`;
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(p);
  }
  return [...months.entries()].map(([month, items]) => ({ month, photos: items }));
}

/** Earliest vs latest (or per-pose before/after pairs). */
async function beforeAfter(userId, pose) {
  const where = { userId, ...(pose ? { pose } : {}) };
  const [first, last] = await Promise.all([
    prisma.progressPhoto.findFirst({ where, orderBy: { date: 'asc' } }),
    prisma.progressPhoto.findFirst({ where, orderBy: { date: 'desc' } }),
  ]);
  if (!first || !last || first.id === last.id) throw notFound('Need at least two photos');
  const weightDelta = first.weightKg && last.weightKg ? +(Number(last.weightKg) - Number(first.weightKg)).toFixed(1) : null;
  const bfDelta = first.bodyFatPct && last.bodyFatPct ? +(Number(last.bodyFatPct) - Number(first.bodyFatPct)).toFixed(1) : null;
  const daysElapsed = Math.round((last.date - first.date) / 864e5);
  return { before: first, after: last, weightDelta, bodyFatDelta: bfDelta, daysElapsed };
}

/* ---------- Charts ---------- */

/** Weight / body-fat series with 7-day moving average. */
async function weightChart(userId, { days = 90 } = {}) {
  const start = new Date(Date.now() - days * 864e5);
  const stats = await prisma.bodyStat.findMany({
    where: { userId, date: { gte: start }, weightKg: { not: null } },
    orderBy: { date: 'asc' },
  });
  const points = stats.map((s) => ({ date: s.date.toISOString().slice(0, 10), weight: Number(s.weightKg), bodyFat: s.bodyFatPct != null ? Number(s.bodyFatPct) : null }));
  const ma7 = points.map((p, i) => {
    const window = points.slice(Math.max(0, i - 6), i + 1);
    return +(window.reduce((a, x) => a + x.weight, 0) / window.length).toFixed(1);
  });
  return { points, movingAvg: ma7 };
}

/** Weekly workout volume + sessions + calories burned. */
async function workoutChart(userId, { weeks = 12 } = {}) {
  const start = new Date(Date.now() - weeks * 7 * 864e5);
  const sessions = await prisma.workoutSession.findMany({
    where: { userId, status: 'COMPLETED', completedAt: { gte: start } },
    select: { completedAt: true, totalVolume: true, caloriesBurned: true, durationSec: true },
  });
  const cardio = await prisma.cardioSession.findMany({ where: { userId, date: { gte: start } }, select: { date: true, calories: true, durationSec: true } });
  const byWeek = new Map();
  const weekKey = (d) => {
    const day = new Date(d);
    const monday = new Date(day.setDate(day.getDate() - ((day.getDay() + 6) % 7)) );
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().slice(0, 10);
  };
  const slot = (d) => {
    const key = weekKey(d);
    if (!byWeek.has(key)) byWeek.set(key, { week: key, volume: 0, sessions: 0, calories: 0, cardioMinutes: 0 });
    return byWeek.get(key);
  };
  for (const s of sessions) {
    const w = slot(s.completedAt);
    w.volume += Number(s.totalVolume || 0);
    w.calories += s.caloriesBurned || 0;
    w.sessions += 1;
  }
  for (const c of cardio) {
    const w = slot(c.date);
    w.calories += c.calories || 0;
    w.cardioMinutes += Math.round((c.durationSec || 0) / 60);
  }
  return [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week));
}

/** Per-exercise progression — top sets by date for one exercise. */
async function exerciseProgress(userId, exerciseId, { limit = 40 } = {}) {
  const sets = await prisma.sessionLoggedSet.findMany({
    where: { exerciseId, session: { userId, status: 'COMPLETED' }, skipped: false },
    orderBy: { loggedAt: 'desc' },
    take: limit * 10,
    select: { sessionId: true, reps: true, weight: true, loggedAt: true },
  });
  // best estimated 1RM per session (Epley)
  const fitness = require('../utils/fitness.util');
  const perSession = new Map();
  for (const s of sets) {
    const w = Number(s.weight || 0);
    const rm = s.reps ? fitness.oneRepMaxEpley(w, s.reps) : w;
    const key = s.sessionId;
    if (!perSession.has(key) || perSession.get(key).est1RM < rm) {
      perSession.set(key, { sessionId: key, date: s.loggedAt, bestWeight: w, reps: s.reps, est1RM: +rm.toFixed(1) });
    }
  }
  return [...perSession.values()].sort((a, b) => a.date - b.date).slice(-limit);
}

/** Cardio trends — distance & pace by week per activity type. */
async function cardioChart(userId, { weeks = 12, activityType } = {}) {
  const start = new Date(Date.now() - weeks * 7 * 864e5);
  const where = { userId, date: { gte: start }, ...(activityType ? { activityType } : {}) };
  const sessions = await prisma.cardioSession.findMany({ where, orderBy: { date: 'asc' } });
  const byWeek = new Map();
  for (const c of sessions) {
    const d = new Date(c.date);
    const monday = new Date(d.setDate(d.getDate() - ((d.getDay() + 6) % 7)));
    const key = monday.toISOString().slice(0, 10);
    if (!byWeek.has(key)) byWeek.set(key, { week: key, distanceKm: 0, minutes: 0, count: 0, fastestPaceSecKm: null });
    const w = byWeek.get(key);
    w.distanceKm += (c.distanceM || 0) / 1000;
    w.minutes += Math.round((c.durationSec || 0) / 60);
    w.count += 1;
    if (c.avgPaceSecKm && (w.fastestPaceSecKm == null || c.avgPaceSecKm < w.fastestPaceSecKm)) w.fastestPaceSecKm = c.avgPaceSecKm;
  }
  return [...byWeek.values()].map((w) => ({ ...w, distanceKm: +w.distanceKm.toFixed(2) })).sort((a, b) => a.week.localeCompare(b.week));
}

/** Daily calorie intake vs burn (already-aggregated helpers). */
async function caloriesChart(userId, { days = 30 } = {}) {
  const start = new Date(Date.now() - days * 864e5);
  const [intake, workouts, cardio, goal] = await Promise.all([
    prisma.mealLogEntry.groupBy({ by: ['date'], where: { userId, date: { gte: start } }, _sum: { calories: true } }),
    prisma.workoutSession.findMany({ where: { userId, startedAt: { gte: start }, status: 'COMPLETED' }, select: { startedAt: true, caloriesBurned: true } }),
    prisma.cardioSession.groupBy({ by: ['date'], where: { userId, date: { gte: start } }, _sum: { calories: true } }),
    prisma.nutritionGoal.findUnique({ where: { userId } }),
  ]);
  const byDay = new Map();
  const slot = (d) => {
    const key = new Date(d).toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, { date: key, intake: 0, burned: 0 });
    return byDay.get(key);
  };
  for (const i of intake) slot(i.date).intake = i._sum.calories || 0;
  for (const w of workouts) if (w.caloriesBurned) slot(w.startedAt).burned += w.caloriesBurned;
  for (const c of cardio) slot(c.date).burned += c._sum.calories || 0;
  return { target: goal?.calorieTarget ?? null, days: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}

/* ---------- PR page ---------- */

async function personalRecords(userId, { page = 1, limit = 20 }) {
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.personalRecord.findMany({
      where,
      include: { exercise: { select: { id: true, name: true, primaryMuscles: true } } },
      orderBy: { achievedAt: 'desc' },
      skip: (page - 1) * limit,
      take: +limit,
    }),
    prisma.personalRecord.count({ where }),
  ]);
  return { items, page: +page, limit: +limit, total };
}

async function prHistory(userId, exerciseId) {
  return prisma.pRHistory.findMany({ where: { userId, exerciseId }, orderBy: { achievedAt: 'asc' } });
}

/* ---------- Exports ---------- */

/** Full JSON data dump (GDPR-style "export my data"). */
async function exportAll(userId) {
  const [user, sessions, cardio, meals, stats, photos, prs, plans] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { fitnessProfile: true } }),
    prisma.workoutSession.findMany({ where: { userId }, include: { loggedSets: true } }),
    prisma.cardioSession.findMany({ where: { userId } }),
    prisma.mealLogEntry.findMany({ where: { userId } }),
    prisma.bodyStat.findMany({ where: { userId } }),
    prisma.progressPhoto.findMany({ where: { userId } }),
    prisma.personalRecord.findMany({ where: { userId } }),
    prisma.programEnrollment.findMany({ where: { userId } }),
  ]);
  delete user?.passwordHash;
  return { exportedAt: new Date().toISOString(), user, sessions, cardio, meals, bodyStats: stats, progressPhotos: photos, personalRecords: prs, programEnrollments: plans };
}

/** Workout-history CSV. */
async function exportWorkoutsCsv(userId) {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId, status: 'COMPLETED' }, orderBy: { completedAt: 'desc' },
  });
  const header = 'date,name,duration_min,volume_kg,sets,calories,avg_rpe';
  const lines = sessions.map((s) => [
    (s.completedAt || s.startedAt).toISOString().slice(0, 10),
    `"${(s.name || '').replace(/"/g, '""')}"`,
    Math.round((s.durationSec || 0) / 60),
    (Number(s.totalVolume || 0) / 1000).toFixed(1),
    s.totalSets,
    s.caloriesBurned ?? '',
    s.avgRpe ?? '',
  ].join(','));
  return [header, ...lines].join('\n');
}

module.exports = { addPhoto, updatePhoto, deletePhoto, photoTimeline, beforeAfter, weightChart, workoutChart, exerciseProgress, cardioChart, caloriesChart, personalRecords, prHistory, exportAll, exportWorkoutsCsv };
