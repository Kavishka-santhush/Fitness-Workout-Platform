/**
 * Achievement service — rule evaluation over milestones, XP awarding,
 * level-ups, gallery + leaderboard.
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger.util');
const { levelForXp, XP_RULES } = require('../utils/fitness.util');
const notificationService = require('./notification.service');

/** Add XP and handle level-ups (celebration notification on level change). */
async function addXp(userId, amount, reason = '') {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { xpPoints: true, level: true } });
  const newXp = user.xpPoints + amount;
  const newLevel = levelForXp(newXp).level;
  const updated = await prisma.user.update({ where: { id: userId }, data: { xpPoints: newXp, level: newLevel } });
  if (newLevel > user.level) {
    const info = levelForXp(newXp);
    await notificationService.notify(userId, 'ACHIEVEMENT_UNLOCKED', `Level up! 🚀`, `You reached ${info.title} (level ${newLevel}). ${reason}`, { levelUp: true, level: newLevel });
    if (notificationService.getIoRef?.()) notificationService.getIoRef().to(`user:${userId}`).emit('level-up', { level: newLevel, title: info.title });
  }
  return updated;
}

/** Unlock an achievement by key if criteria met and not already owned. */
async function unlock(userId, key, progressValue = null) {
  const achievement = await prisma.achievement.findUnique({ where: { key } });
  if (!achievement) return null;
  const existing = await prisma.userAchievement.findUnique({ where: { userId_achievementId: { userId, achievementId: achievement.id } } });
  if (existing) return null;

  const row = await prisma.userAchievement.create({ data: { userId, achievementId: achievement.id, progressValue } });
  await addXp(userId, achievement.xpReward, achievement.name);
  await notificationService.notify(userId, 'ACHIEVEMENT_UNLOCKED', `Badge unlocked: ${achievement.name} 🏅`, achievement.description, { achievementKey: key });
  logger.info(`Achievement ${key} unlocked for ${userId}`);
  return row;
}

/** Generic evaluator: fetch metric and compare against stored criteria. */
async function evaluate(userId, achievement) {
  const c = achievement.criteria || {};
  let value = 0;
  switch (c.metric) {
    case 'WORKOUTS_TOTAL':
      value = await prisma.workoutSession.count({ where: { userId, status: 'COMPLETED' } });
      break;
    case 'STREAK_CURRENT':
      value = (await prisma.user.findUnique({ where: { id: userId }, select: { streakCurrent: true } })).streakCurrent;
      break;
    case 'STREAK_LONGEST':
      value = (await prisma.user.findUnique({ where: { id: userId }, select: { streakLongest: true } })).streakLongest;
      break;
    case 'PR_COUNT':
      value = await prisma.pRHistory.count({ where: { userId } });
      break;
    case 'TOTAL_VOLUME_KG': {
      const agg = await prisma.workoutSession.aggregate({ where: { userId }, _sum: { totalVolume: true } });
      value = Number(agg._sum.totalVolume || 0) / 1000;
      break;
    }
    case 'LONGEST_RUN_KM': {
      const max = await prisma.cardioSession.aggregate({ where: { userId, activityType: 'RUNNING' }, _max: { distanceM: true } });
      value = (max._max.distanceM || 0) / 1000;
      break;
    }
    case 'LIVE_CLASSES':
      value = await prisma.classEnrollment.count({ where: { userId, status: 'ATTENDED' } });
      break;
    case 'NUTRITION_STREAK_DAYS': {
      const logs = await prisma.mealLogEntry.findMany({ where: { userId }, distinct: ['date'], select: { date: true }, orderBy: { date: 'desc' }, take: 120 });
      let streak = 0;
      for (let i = 0; i < logs.length; i++) {
        const day = new Date(logs[i].date); day.setHours(0, 0, 0, 0);
        const expected = new Date(Date.now() - i * 864e5); expected.setHours(0, 0, 0, 0);
        if (day.getTime() === expected.getTime()) streak += 1; else break;
      }
      value = streak;
      break;
    }
    case 'PROGRAMS_COMPLETED':
      value = await prisma.programEnrollment.count({ where: { userId, status: 'COMPLETED' } });
      break;
    case 'CHALLENGES_COMPLETED':
      value = await prisma.challengeEnrollment.count({ where: { userId, completedAt: { not: null } } });
      break;
    case 'FOLLOWERS':
      value = await prisma.follow.count({ where: { followingId: userId } });
      break;
    case 'KUDOS_RECEIVED': {
      const posts = await prisma.post.findMany({ where: { userId }, select: { id: true } });
      value = await prisma.kudos.count({ where: { postId: { in: posts.map((p) => p.id) } } });
      break;
    }
    default:
      return null;
  }
  const ok = { gte: (v) => v >= c.value, lte: (v) => v <= c.value, eq: (v) => v === c.value }[c.op || 'gte'](value);
  return ok ? value : null;
}

/** Re-evaluate all achievements for a user (called after significant events). */
async function evaluateAll(userId) {
  const achievements = await prisma.achievement.findMany();
  const owned = new Set((await prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } })).map((a) => a.achievementId));
  const unlockedNow = [];
  for (const a of achievements) {
    if (owned.has(a.id)) continue;
    const met = await evaluate(userId, a);
    if (met !== null) {
      await unlock(userId, a.key, met);
      unlockedNow.push(a.key);
    }
  }
  return unlockedNow;
}

/* ---- event hooks used by other services ---- */
async function onWorkoutCompleted(userId) { await evaluateAll(userId).catch((e) => logger.warn(e.message)); }
async function onPR(userId) { await evaluateAll(userId).catch((e) => logger.warn(e.message)); }
async function onMealLogged(userId) { await addXp(userId, XP_RULES.MEAL_LOGGED).catch(() => {}); await evaluateAll(userId).catch(() => {}); }

async function gallery(userId) {
  const [all, owned] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { category: 'asc' } }),
    prisma.userAchievement.findMany({ where: { userId }, include: { achievement: true } }),
  ]);
  const ownedKeys = new Set(owned.map((o) => o.achievement.key));
  return {
    earned: owned.map((o) => ({ ...o.achievement, unlockedAt: o.unlockedAt })),
    locked: all.filter((a) => !ownedKeys.has(a.key)),
    progress: { earned: owned.length, total: all.length },
  };
}

async function leaderboard({ period = 'ALL_TIME', limit = 50 }) {
  const since = period === 'WEEKLY' ? new Date(Date.now() - 7 * 864e5) : period === 'MONTHLY' ? new Date(Date.now() - 30 * 864e5) : null;
  const groupWhere = since ? { unlockedAt: { gte: since } } : {};
  const rows = await prisma.userAchievement.groupBy({ by: ['userId'], where: groupWhere, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: limit });
  const users = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: { id: true, displayName: true, avatarUrl: true, username: true } });
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  return rows.map((r, i) => ({ rank: i + 1, user: byId[r.userId], badges: r._count.id }));
}

module.exports = { addXp, unlock, evaluate, evaluateAll, onWorkoutCompleted, onPR, onMealLogged, gallery, leaderboard };
