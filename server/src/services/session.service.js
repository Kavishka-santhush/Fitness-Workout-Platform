/**
 * Session service — the active workout engine:
 * start / auto-save / set logging with PR detection / rest & superset
 * auto-advance / pause / complete with summary + XP + streaks,
 * plus cardio sessions and GPS routes.
 */
const prisma = require('../lib/prisma');
const { notFound, badRequest, forbidden } = require('../utils/response.util');
const { calcVolume, detectPR, oneRepMaxEpley, XP_RULES } = require('../utils/fitness.util');
const { calcCardioCalories, CARDIO_METS, estimateWorkoutCalories } = require('../utils/calories.util');
const { publicUrl } = require('../utils/upload.util');
const notificationService = require('./notification.service');
const achievementService = require('./achievement.service');
const programService = require('./program.service');

/** Latest performance per exercise for "previous numbers" display. */
async function previousPerformance(userId, exerciseIds) {
  const rows = await prisma.sessionLoggedSet.findMany({
    where: { exerciseId: { in: exerciseIds }, session: { userId, status: 'COMPLETED' } },
    orderBy: { loggedAt: 'desc' },
  });
  const byExercise = {};
  for (const r of rows) {
    if (!byExercise[r.exerciseId]) byExercise[r.exerciseId] = [];
    if (byExercise[r.exerciseId].length < 5) byExercise[r.exerciseId].push(r);
  }
  return byExercise;
}

async function start(userId, { workoutId, programId, name }) {
  // Resume an abandoned ACTIVE session if one exists (single active session rule).
  const open = await prisma.workoutSession.findFirst({ where: { userId, status: { in: ['ACTIVE', 'PAUSED'] } } });
  if (open) return open;

  let workout = null;
  if (workoutId) workout = await prisma.workout.findUnique({ where: { id: workoutId }, include: { exercises: true } });
  const session = await prisma.workoutSession.create({
    data: {
      userId,
      workoutId: workoutId || null,
      programId: programId || null,
      name: name || workout?.name || 'Freestyle workout',
      status: 'ACTIVE',
    },
  });
  return { ...session, workout };
}

/** Auto-save heartbeat (every 30s from the client) — persists elapsed time. */
async function autoSave(userId, sessionId, { pausedTotalMs, summary } = {}) {
  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw notFound('Session not found');
  return prisma.workoutSession.update({
    where: { id: sessionId },
    data: { autoSavedAt: new Date(), ...(pausedTotalMs != null ? { pausedTotalMs: BigInt(pausedTotalMs) } : {}), ...(summary ? { summary } : {}) },
  });
}

async function pause(userId, sessionId) {
  return prisma.workoutSession.update({ where: { id: sessionId, userId }, data: { status: 'PAUSED', pausedAt: new Date() } });
}

async function resume(userId, sessionId) {
  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw notFound('Session not found');
  const pauseDelta = session.pausedAt ? Date.now() - session.pausedAt.getTime() : 0;
  return prisma.workoutSession.update({
    where: { id: sessionId },
    data: { status: 'ACTIVE', pausedAt: null, pausedTotalMs: session.pausedTotalMs + BigInt(pauseDelta) },
  });
}

/**
 * Log one set. Detects PRs against PersonalRecord, writes PRHistory,
 * bumps exercise usage counter, returns PR flags for celebration UI.
 */
async function logSet(userId, sessionId, set) {
  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!session || !['ACTIVE', 'PAUSED'].includes(session.status)) throw badRequest('Session is not active');

  const { exerciseId, setNumber, reps, weight, durationSec, distanceM, rpe, hrAvg, restSec, notes, loggedData } = set;

  const row = await prisma.sessionLoggedSet.create({
    data: { sessionId, exerciseId, setNumber, reps, weight, durationSec, distanceM, rpe, hrAvg, restSec, notes, loggedData: loggedData || {} },
  });

  await prisma.exercise.update({ where: { id: exerciseId }, data: { usageCount: { increment: 1 } } });

  // ---- PR detection ----
  let record = await prisma.personalRecord.findUnique({ where: { userId_exerciseId: { userId, exerciseId } } });
  const bests = record ? { maxWeight: Number(record.maxWeight || 0), maxReps: record.maxReps || 0, maxVolume: Number(record.maxVolume || 0) } : {};
  const prs = detectPR({ reps, weight }, bests);

  if (prs.length) {
    const volume = (weight || 0) * (reps || 0);
    record = await prisma.personalRecord.upsert({
      where: { userId_exerciseId: { userId, exerciseId } },
      create: {
        userId, exerciseId,
        maxWeight: prs.some((p) => p.type === 'MAX_WEIGHT') ? weight : bests.maxWeight || null,
        maxReps: prs.some((p) => p.type === 'MAX_REPS') ? reps : bests.maxReps || null,
        maxVolume: BigInt(prs.some((p) => p.type === 'MAX_VOLUME') ? volume : bests.maxVolume || 0),
        est1RM: oneRepMaxEpley(weight || 0, reps || 1),
      },
      update: {
        ...(prs.some((p) => p.type === 'MAX_WEIGHT') ? { maxWeight: weight, achievedAt: new Date() } : {}),
        ...(prs.some((p) => p.type === 'MAX_REPS') ? { maxReps: reps } : {}),
        ...(prs.some((p) => p.type === 'MAX_VOLUME') ? { maxVolume: BigInt(volume) } : {}),
        est1RM: Math.max(Number(record?.est1RM || 0), oneRepMaxEpley(weight || 0, reps || 1)),
      },
    });
    await prisma.pRHistory.createMany({
      data: prs.map((p) => ({ userId, exerciseId, recordId: record.id, type: p.type, value: p.value, reps, sessionId })),
    });
    await prisma.sessionLoggedSet.update({ where: { id: row.id }, data: { isPr: true } });
    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId }, select: { name: true } });
    await notificationService.notify(userId, 'PR_BROKEN', 'New PR! 🎉', `${exercise.name}: ${prs.map((p) => `${p.type.replace('_', ' ')} ${p.value}`).join(', ')}`, { exerciseId, sessionId });
    achievementService.onPR(userId).catch(() => {});
  }

  return { set: row, prs };
}

/** Skip planned exercise — client marks the planned row as skipped in autosave summary. */
async function skipExercise(userId, sessionId, { exerciseId, reason }) {
  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  const summary = session.summary || {};
  summary.skipped = [...(summary.skipped || []), { exerciseId, reason: reason || null, at: new Date().toISOString() }];
  return prisma.workoutSession.update({ where: { id: sessionId }, data: { summary } });
}

/** Swap an exercise mid-workout (replace id inside autosave summary). */
async function swapExercise(userId, sessionId, { fromExerciseId, toExerciseId }) {
  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  const summary = session.summary || {};
  summary.swaps = [...(summary.swaps || []), { from: fromExerciseId, to: toExerciseId, at: new Date().toISOString() }];
  await prisma.sessionLoggedSet.updateMany({ where: { sessionId, exerciseId: fromExerciseId }, data: { notes: `swapped→${toExerciseId}` } });
  return prisma.workoutSession.update({ where: { id: sessionId }, data: { summary } });
}

/**
 * Complete session: recompute volume/calories/PRs, update streak + XP,
 * advance program, fire achievements, produce summary payload.
 */
async function complete(userId, sessionId, { rating, feltEnergy, feltSoreness, notes, caloriesBurned, hrAvg, hrMax, shareToFeed } = {}) {
  const session = await prisma.workoutSession.findUnique({ where: { id: sessionId }, include: { loggedSets: true, workout: true } });
  if (!session || session.userId !== userId) throw notFound('Session not found');
  if (session.status === 'COMPLETED') return session;

  const endedAt = new Date();
  const pausedMs = Number(session.pausedTotalMs) + (session.pausedAt ? endedAt - session.pausedAt : 0);
  const durationSec = Math.max(1, Math.round((endedAt - session.startedAt - pausedMs) / 1000));
  const sets = session.loggedSets.filter((s) => !s.skipped);
  const totalVolume = sets.reduce((sum, s) => sum + (Number(s.weight || 0) * (s.reps || 0)), 0);
  const avgRpe = sets.filter((s) => s.rpe).length ? sets.reduce((a, s) => a + (s.rpe || 0), 0) / sets.filter((s) => s.rpe).length : null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const calories = caloriesBurned ?? estimateWorkoutCalories({
    durationMinutes: Math.round(durationSec / 60),
    weight: Number(user.weightKg || 70),
    difficulty: session.workout?.difficulty || 'INTERMEDIATE',
  });

  // Streak update (calendar-day granularity)
  const today = new Date(endedAt.getFullYear(), endedAt.getMonth(), endedAt.getDate());
  const last = user.lastWorkoutAt ? new Date(user.lastWorkoutAt.getFullYear(), user.lastWorkoutAt.getMonth(), user.lastWorkoutAt.getDate()) : null;
  let streakCurrent = user.streakCurrent;
  let streakLongest = user.streakLongest;
  if (!last || today - last > 864e5) streakCurrent = 1;
  else if (today - last === 864e5) streakCurrent += 1;
  streakLongest = Math.max(streakLongest, streakCurrent);

  const summary = {
    ...(session.summary || {}),
    exerciseTotals: sets.reduce((acc, s) => {
      acc[s.exerciseId] = acc[s.exerciseId] || { sets: 0, volume: 0, bestWeight: 0 };
      acc[s.exerciseId].sets += 1;
      acc[s.exerciseId].volume += Number(s.weight || 0) * (s.reps || 0);
      acc[s.exerciseId].bestWeight = Math.max(acc[s.exerciseId].bestWeight, Number(s.weight || 0));
      return acc;
    }, {}),
    prs: sets.filter((s) => s.isPr).map((s) => ({ exerciseId: s.exerciseId, setNumber: s.setNumber })),
  };

  const completed = await prisma.workoutSession.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED', completedAt: endedAt, durationSec, totalVolume: BigInt(totalVolume),
      totalSets: sets.length, caloriesBurned: calories, avgRpe, rating, feltEnergy, feltSoreness,
      notes, hrAvg, hrMax, summary,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastWorkoutAt: endedAt, streakCurrent, streakLongest,
      xpPoints: { increment: XP_RULES.WORKOUT_COMPLETED + sets.length * XP_RULES.SET_LOGGED + session.prCount * XP_RULES.PR_ACHIEVED },
    },
  });

  if (session.programId) await programService.advanceProgress(userId, session.programId).catch(() => {});
  if (session.workoutId) await prisma.workout.update({ where: { id: session.workoutId }, data: { useCount: { increment: 1 } } }).catch(() => {});

  // Mark scheduled item complete if matched today
  await prisma.scheduledItem.updateMany({
    where: { userId, workoutId: session.workoutId, status: 'PLANNED', date: { gte: new Date(today.getTime() - 864e5) } },
    data: { status: 'COMPLETED' },
  });

  achievementService.onWorkoutCompleted(userId, { sets: sets.length, volume: totalVolume, streak: streakCurrent }).catch(() => {});
  notificationService.notify(userId, 'PROGRAM_DAY_COMPLETE', 'Workout complete 💪', `${sets.length} sets · ${totalVolume.toLocaleString()} kg volume · ${calories} kcal`, { sessionId });

  if (shareToFeed) {
    await prisma.post.create({
      data: {
        userId, type: 'WORKOUT', sessionId,
        content: session.name || 'Workout',
        stats: { durationSec, totalVolume, calories, sets: sets.length },
      },
    });
  }
  return { ...completed, totalVolume, calories, streakCurrent };
}

/** Partial completion — save what was done, mark PARTIAL. */
async function savePartial(userId, sessionId, data) {
  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw notFound('Session not found');
  return prisma.workoutSession.update({ where: { id: sessionId }, data: { status: 'PARTIAL', ...data } });
}

async function abandon(userId, sessionId) {
  return prisma.workoutSession.update({ where: { id: sessionId, userId }, data: { status: 'ABANDONED', completedAt: new Date() } });
}

/** Attach a post-workout progress photo (Multer local). */
async function attachPhoto(userId, sessionId, file) {
  if (!file) throw badRequest('No photo received');
  return prisma.progressPhoto.create({
    data: { userId, sessionId, imageUrl: publicUrl('progressPhotos', file.filename), date: new Date() },
  });
}

async function getSession(userId, sessionId) {
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: { loggedSets: { orderBy: { loggedAt: 'asc' } }, workout: { include: { exercises: { include: { exercise: true } } } } },
  });
  if (!session) throw notFound('Session not found');
  const exerciseIds = (session.workout?.exercises || []).map((e) => e.exerciseId);
  const previous = await previousPerformance(userId, exerciseIds);
  return { ...session, previous };
}

async function history(userId, { from, to, page = 1, limit = 20 }) {
  const where = { userId, status: 'COMPLETED' };
  if (from || to) where.startedAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };
  const [items, total] = await Promise.all([
    prisma.workoutSession.findMany({ where, orderBy: { startedAt: 'desc' }, skip: (page - 1) * limit, take: +limit, include: { _count: { select: { loggedSets: true } } } }),
    prisma.workoutSession.count({ where }),
  ]);
  return { items, page: +page, limit: +limit, total };
}

/* ---------- Cardio & GPS ---------- */

async function logCardio(userId, data) {
  const { activityType, durationSec, distanceM, calories, avgHr, maxHr, elevationM, laps, hrZones, routeId, title, notes, source = 'MANUAL', date } = data;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { weightKg: true } });
  const met = CARDIO_METS[activityType] || 6;
  const estCalories = calories ?? calcCardioCalories({ met, durationMinutes: durationSec / 60, weight: Number(user?.weightKg || 70) });
  const avgPace = distanceM && durationSec ? Math.round(durationSec / (distanceM / 1000)) : null;
  return prisma.cardioSession.create({
    data: {
      userId, activityType, title, durationSec, distanceM, calories: estCalories, avgHr, maxHr,
      elevationM, laps: laps || [], hrZones: hrZones || {}, routeId, avgPaceSecKm: avgPace, source, notes,
      date: date ? new Date(date) : undefined,
      fastestKmSec: laps?.length ? Math.min(...laps.map((l) => l.paceSec).filter(Boolean)) : null,
    },
  });
}

/** Persist a GPS trace as a Route (Expo Location point stream). */
async function saveRoute(userId, { name, activityType, points, elevationM }) {
  const distanceM = points.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const [lat1, lon1] = points[i - 1];
    const [lat2, lon2] = p;
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, 0);
  return prisma.route.create({
    data: { userId, name, activityType, points, elevationM, distanceM: Math.round(distanceM) },
  });
}

async function listRoutes(userId) {
  return prisma.route.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

async function shareRoute(userId, routeId, isShared) {
  const route = await prisma.route.findFirst({ where: { id: routeId, userId } });
  if (!route) throw notFound('Route not found');
  return prisma.route.update({ where: { id: routeId }, data: { isShared } });
}

module.exports = {
  start, autoSave, pause, resume, logSet, skipExercise, swapExercise, complete,
  savePartial, abandon, attachPhoto, getSession, history, previousPerformance,
  logCardio, saveRoute, listRoutes, shareRoute,
};
