/**
 * Analytics service — member dashboard, admin platform metrics, annual
 * wrap-up, and weekly report payloads. Uses AnalyticsCache for heavy reads.
 */
const prisma = require('../lib/prisma');
const fitness = require('../utils/fitness.util');

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function weekStart() { const d = startOfDay(new Date()); return addDays(d, -((d.getDay() + 6) % 7)); }

/* ---------- Member dashboard ---------- */

async function userDashboard(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, avatarUrl: true, subscriptionType: true, level: true, xpPoints: true, streakCurrent: true, streakLongest: true, goal: true },
  });
  const now = new Date();
  const ws = weekStart();
  const [weekSessions, totalSessions, recentPrs, nextUp, caloriesThisWeek, goal] = await Promise.all([
    prisma.workoutSession.findMany({ where: { userId, status: 'COMPLETED', completedAt: { gte: ws } }, select: { id: true, totalVolume: true, caloriesBurned: true, durationSec: true, completedAt: true, name: true } }),
    prisma.workoutSession.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.personalRecord.findMany({ where: { userId }, orderBy: { achievedAt: 'desc' }, take: 5, include: { exercise: { select: { name: true } } } }),
    prisma.scheduledItem.findFirst({ where: { userId, date: { gte: startOfDay(now) }, status: 'PLANNED' }, orderBy: { date: 'asc' }, include: { workout: { select: { id: true, name: true } } } }),
    prisma.workoutSession.aggregate({ where: { userId, status: 'COMPLETED', completedAt: { gte: ws } }, _sum: { caloriesBurned: true, totalVolume: true } }),
    prisma.nutritionGoal.findUnique({ where: { userId } }),
  ]);
  const weeklyVolumeKg = Math.round(Number(weekSessions.reduce((a, s) => a + Number(s.totalVolume || 0), 0)) / 1000);
  const levelInfo = fitness.levelForXp(user.xpPoints);
  return {
    user: { ...user, levelInfo },
    thisWeek: {
      sessions: weekSessions.length,
      volumeKg: weeklyVolumeKg,
      calories: caloriesThisWeek._sum.caloriesBurned || 0,
      minutes: Math.round(weekSessions.reduce((a, s) => a + (s.durationSec || 0), 0) / 60),
    },
    lifetime: { sessions: totalSessions, prs: recentPrs.length },
    streak: { current: user.streakCurrent, longest: user.streakLongest },
    recentPrs: recentPrs.map((p) => ({ exercise: p.exercise.name, maxWeight: p.maxWeight ? Number(p.maxWeight) : null, est1RM: p.est1RM ? Number(p.est1RM) : null, at: p.achievedAt })),
    nutritionTargets: goal ? { calories: goal.calorieTarget, protein: goal.proteinG, carbs: goal.carbsG, fat: goal.fatG } : null,
    nextUp: nextUp ? { date: nextUp.date, name: nextUp.workout?.name || nextUp.note, activityType: nextUp.activityType } : null,
  };
}

/** Streak-at-risk check used by the notification cron. */
async function streaksAtRisk() {
  const threshold = new Date(Date.now() - 86400e3); // last workout > 1 day old
  const users = await prisma.user.findMany({
    where: { streakCurrent: { gte: 3 }, lastWorkoutAt: { lt: threshold }, isBanned: false },
    select: { id: true, displayName: true, streakCurrent: true, lastWorkoutAt: true },
  });
  return users;
}

/* ---------- Admin platform dashboard ---------- */

async function adminDashboard() {
  const now = new Date();
  const today = startOfDay(now);
  const weekAgo = addDays(now, -7);
  const monthAgo = addDays(now, -30);
  const [
    totalUsers, newUsersWeek, banned, byRole,
    sessionsToday, sessionsWeek, activeSessions,
    postsToday, reportsPending, trainerPending, programsPending,
    revenueMonth, activeSubs, aiCallsWeek, liveClassesUpcoming,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.workoutSession.count({ where: { startedAt: { gte: today } } }),
    prisma.workoutSession.count({ where: { startedAt: { gte: weekAgo } } }),
    prisma.workoutSession.count({ where: { status: 'ACTIVE' } }),
    prisma.post.count({ where: { createdAt: { gte: today } } }),
    prisma.contentReport.count({ where: { status: 'PENDING' } }),
    prisma.trainerProfile.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.program.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.payment.aggregate({ where: { status: 'SUCCEEDED', createdAt: { gte: monthAgo } }, _sum: { amountCents: true, platformFeeCents: true } }),
    prisma.subscription.count({ where: { status: { in: ['ACTIVE', 'TRIALING'] } } }),
    prisma.aiUsageLog.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.liveClass.count({ where: { status: 'SCHEDULED', scheduledAt: { gte: now } } }),
  ]);
  const roleCounts = Object.fromEntries(byRole.map((r) => [r.role, r._count]));
  const topCountries = await prisma.user.groupBy({ by: ['country'], _count: true, orderBy: { _count: { country: 'desc' } }, take: 8 }).catch(() => []);
  return {
    users: { total: totalUsers, newThisWeek: newUsersWeek, banned, byRole: roleCounts },
    engagement: { sessionsToday, sessionsThisWeek: sessionsWeek, activeRightNow: activeSessions, postsToday, liveClassesUpcoming },
    moderation: { reportsPending, trainersPending: trainerPending, programsPending },
    revenue: { monthCents: revenueMonth._sum.amountCents || 0, platformFeesCents: revenueMonth._sum.platformFeeCents || 0, activeSubscriptions: activeSubs },
    ai: { callsThisWeek: aiCallsWeek },
    topCountries,
  };
}

/* ---------- Annual wrap-up ---------- */

async function annualWrap(userId, year = new Date().getFullYear()) {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59);
  const [sessions, cardio, prs, achievements, meals, bodyStats, monthly] = await Promise.all([
    prisma.workoutSession.findMany({ where: { userId, status: 'COMPLETED', completedAt: { gte: start, lte: end } } }),
    prisma.cardioSession.findMany({ where: { userId, date: { gte: start, lte: end } } }),
    prisma.personalRecord.count({ where: { userId, achievedAt: { gte: start, lte: end } } }),
    prisma.userAchievement.count({ where: { userId, unlockedAt: { gte: start, lte: end } } }),
    prisma.mealLogEntry.count({ where: { userId, date: { gte: start, lte: end } } }),
    prisma.bodyStat.findMany({ where: { userId, date: { gte: start, lte: end } }, orderBy: { date: 'asc' } }),
    prisma.workoutSession.groupBy({ by: ['userId'], where: { userId, status: 'COMPLETED', completedAt: { gte: start, lte: end } } }),
  ]);
  const totalVolumeKg = Math.round(sessions.reduce((a, s) => a + Number(s.totalVolume || 0), 0) / 1000);
  const totalCalories = sessions.reduce((a, s) => a + (s.caloriesBurned || 0), 0) + cardio.reduce((a, c) => a + (c.calories || 0), 0);
  const totalMinutes = Math.round((sessions.reduce((a, s) => a + (s.durationSec || 0), 0) + cardio.reduce((a, c) => a + (c.durationSec || 0), 0)) / 60);
  const totalDistanceKm = +(cardio.reduce((a, c) => a + (c.distanceM || 0), 0) / 1000).toFixed(1);
  // favorite muscle group by exercise frequency
  const setCounts = await prisma.sessionLoggedSet.groupBy({ by: ['exerciseId'], where: { session: { userId, completedAt: { gte: start, lte: end } } }, _count: true, orderBy: { _count: true }, take: 5 });
  const exIds = setCounts.map((s) => s.exerciseId);
  const exs = await prisma.exercise.findMany({ where: { id: { in: exIds } }, select: { id: true, name: true, primaryMuscles: true } });
  const byId = Object.fromEntries(exs.map((e) => [e.id, e]));
  const topExercises = setCounts.map((s) => byId[s.exerciseId]).filter(Boolean);
  // busiest month
  const monthTally = {};
  for (const s of sessions) { const m = s.completedAt.getMonth(); monthTally[m] = (monthTally[m] || 0) + 1; }
  const busiest = Object.entries(monthTally).sort((a, b) => b[1] - a[1])[0];
  const weightStart = bodyStats[0]?.weightKg ? Number(bodyStats[0].weightKg) : null;
  const weightEnd = bodyStats[bodyStats.length - 1]?.weightKg ? Number(bodyStats[bodyStats.length - 1].weightKg) : null;
  return {
    year,
    totalWorkouts: sessions.length,
    activeDays: new Set(sessions.map((s) => s.completedAt.toISOString().slice(0, 10))).size,
    totalVolumeKg,
    totalCalories,
    totalMinutes,
    totalDistanceKm,
    prs,
    achievements,
    mealsLogged: meals,
    topExercises: topExercises.map((e) => ({ name: e.name, muscles: e.primaryMuscles })),
    busiestMonth: busiest ? { month: Number(busiest[0]) + 1, workouts: busiest[1] } : null,
    weightChange: weightStart && weightEnd ? +(weightEnd - weightStart).toFixed(1) : null,
    longestStreak: (await prisma.user.findUnique({ where: { id: userId }, select: { streakLongest: true } })).streakLongest,
  };
}

/* ---------- Weekly report payload ---------- */

async function weeklyReport(userId) {
  const ws = weekStart();
  const sessions = await prisma.workoutSession.findMany({ where: { userId, status: 'COMPLETED', completedAt: { gte: ws } } });
  const prevWeek = await prisma.workoutSession.aggregate({ where: { userId, status: 'COMPLETED', completedAt: { gte: addDays(ws, -7), lt: ws } }, _count: true, _sum: { totalVolume: true } });
  const meals = await prisma.mealLogEntry.aggregate({ where: { userId, date: { gte: ws } }, _sum: { calories: true }, _count: true });
  const goal = await prisma.nutritionGoal.findUnique({ where: { userId } });
  const loggedDays = await prisma.mealLogEntry.groupBy({ by: ['date'], where: { userId, date: { gte: ws } } });
  return {
    workouts: sessions.length,
    prevWeekWorkouts: prevWeek._count,
    volumeKg: Math.round(sessions.reduce((a, s) => a + Number(s.totalVolume || 0), 0) / 1000),
    prevVolumeKg: Math.round(Number(prevWeek._sum.totalVolume || 0) / 1000),
    caloriesBurned: sessions.reduce((a, s) => a + (s.caloriesBurned || 0), 0),
    avgDailyIntake: loggedDays.length ? Math.round((meals._sum.calories || 0) / loggedDays.length) : 0,
    targetCalories: goal?.calorieTarget ?? null,
    daysLoggedFood: loggedDays.length,
    streak: (await prisma.user.findUnique({ where: { id: userId }, select: { streakCurrent: true } })).streakCurrent,
  };
}

module.exports = { userDashboard, adminDashboard, annualWrap, weeklyReport, streaksAtRisk };
