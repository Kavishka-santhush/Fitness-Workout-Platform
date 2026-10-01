/**
 * User service — profile, settings, privacy, public views, search.
 */
const prisma = require('../lib/prisma');
const { notFound, badRequest } = require('../utils/response.util');
const { publicUrl } = require('../utils/upload.util');
const { levelForXp } = require('../utils/fitness.util');

const PUBLIC_SELECT = {
  id: true, username: true, displayName: true, avatarUrl: true, bio: true,
  role: true, goal: true, experienceLevel: true, streakLongest: true, xpPoints: true,
  level: true, createdAt: true, profileVisibility: true,
};

async function updateProfile(userId, data) {
  const allowed = ['displayName', 'bio', 'goal', 'experienceLevel', 'preferredTypes', 'equipment', 'injuries', 'units', 'language'];
  const payload = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  if (data.username) {
    const clash = await prisma.user.findFirst({ where: { username: data.username, NOT: { id: userId } } });
    if (clash) throw badRequest('Username already taken');
    payload.username = data.username.toLowerCase();
  }
  return prisma.user.update({ where: { id: userId }, data: payload });
}

async function setAvatar(userId, file) {
  if (!file) throw badRequest('No image received');
  const avatarUrl = publicUrl('avatars', file.filename);
  return prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
}

async function updateSettings(userId, { notificationPrefs, privacy, account }) {
  const data = {};
  if (notificationPrefs) data.notificationPrefs = notificationPrefs;
  if (privacy) {
    if (privacy.profileVisibility) data.profileVisibility = privacy.profileVisibility;
    if (privacy.workoutVisibility) data.workoutVisibility = privacy.workoutVisibility;
    if (privacy.statsVisibility) data.statsVisibility = privacy.statsVisibility;
  }
  if (account) {
    if (account.units) data.units = account.units;
    if (account.language) data.language = account.language;
  }
  if (!Object.keys(data).length) throw badRequest('Nothing to update');
  return prisma.user.update({ where: { id: userId }, data });
}

/** Public profile — respects visibility settings; includes level + badge count. */
async function getPublicProfile(username) {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      ...PUBLIC_SELECT,
      achievements: { where: { unlockedAt: { not: null } }, select: { achievement: true }, take: 12 },
      followers: { _count: true },
      trainerProfile: { select: { specializations: true, ratingAvg: true, verificationStatus: true } },
    },
  });
  if (!user) throw notFound('User not found');
  if (user.profileVisibility === 'PRIVATE') throw notFound('Profile is private');
  const followerCount = await prisma.follow.count({ where: { followingId: user.id } });
  const followingCount = await prisma.follow.count({ where: { followerId: user.id } });
  return {
    ...user,
    achievements: user.achievements.map((a) => a.achievement),
    stats: { followers: followerCount, following: followingCount },
    levelInfo: levelForXp(user.xpPoints),
  };
}

/** pg_trgm powered user search (username / displayName). */
async function searchUsers(term, limit = 20) {
  if (!term || term.length < 2) return [];
  return prisma.$queryRaw`
    SELECT id, username, "displayName", "avatarUrl", role,
           similarity(username, ${term}) + similarity("displayName", ${term}) AS score
    FROM users
    WHERE "profileVisibility" <> 'PRIVATE'
      AND (username % ${term} OR "displayName" % ${term})
    ORDER BY score DESC
    LIMIT ${limit}`;
}

/** Dashboard aggregate for the member home screen. */
async function getDashboard(userId) {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [user, todaySessions, weekSessions, goal, todayMeals, todayWater, nextScheduled, streak] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, avatarUrl: true, subscriptionType: true, xpPoints: true, level: true, units: true } }),
    prisma.workoutSession.findMany({ where: { userId, startedAt: { gte: dayStart }, status: { in: ['ACTIVE', 'PAUSED'] } } }),
    prisma.workoutSession.count({ where: { userId, startedAt: { gte: new Date(dayStart.getTime() - 6 * 864e5) }, status: 'COMPLETED' } }),
    prisma.nutritionGoal.findUnique({ where: { userId } }),
    prisma.mealLogEntry.aggregate({
      where: { userId, date: { gte: dayStart } },
      _sum: { calories: true, proteinG: true, carbsG: true, fatG: true },
    }),
    prisma.waterLog.aggregate({ where: { userId, date: { gte: dayStart } }, _sum: { amountMl: true } }),
    prisma.scheduledItem.findFirst({
      where: { userId, date: { gte: now }, status: 'PLANNED' },
      orderBy: { date: 'asc' },
      include: { workout: { select: { id: true, name: true, estimatedDuration: true } } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { streakCurrent: true, streakLongest: true } }),
  ]);

  const consumed = todayMeals._sum.calories || 0;
  return {
    user,
    streak,
    activeSessions: todaySessions,
    weekWorkouts: weekSessions,
    nutrition: {
      target: goal?.calorieTarget ?? null,
      consumed,
      remaining: goal ? goal.calorieTarget - consumed : null,
      macros: { protein: todayMeals._sum.proteinG || 0, carbs: todayMeals._sum.carbsG || 0, fat: todayMeals._sum.fatG || 0 },
      waterMl: todayWater._sum.amountMl || 0,
      waterTargetMl: goal?.waterTargetMl || 3000,
    },
    nextScheduled,
  };
}

/** GDPR / account deletion — hard delete, cascades domain rows. */
async function deleteAccount(userId) {
  await prisma.user.delete({ where: { id: userId } });
  return true;
}

module.exports = { updateProfile, setAvatar, updateSettings, getPublicProfile, searchUsers, getDashboard, deleteAccount, PUBLIC_SELECT };
