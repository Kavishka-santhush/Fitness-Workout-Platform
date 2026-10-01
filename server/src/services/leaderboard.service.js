/**
 * Leaderboard service — platform-wide rankings by metric + period, with
 * snapshot caching and current-user rank lookups.
 */
const prisma = require('../lib/prisma');
const { badRequest } = require('../utils/response.util');

const METRICS = ['XP', 'WORKOUTS', 'VOLUME', 'DISTANCE', 'STEPS', 'STREAK', 'CLASS_ATTENDANCE', 'KUDOS'];

function periodRange(period) {
  const now = new Date();
  if (period === 'DAILY') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'WEEKLY') { const d = new Date(now); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0); return d; }
  if (period === 'MONTHLY') return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date('2000-01-01'); // ALL_TIME
}

/** Compute a live leaderboard (not cached). */
async function compute({ metric = 'XP', period = 'WEEKLY', limit = 50, groupId }) {
  if (!METRICS.includes(metric)) throw badRequest(`Unknown metric. Choose: ${METRICS.join(', ')}`);
  const start = periodRange(period);
  const memberSelect = { id: true, displayName: true, avatarUrl: true, level: true, xpPoints: true, streakCurrent: true };
  let ranked = [];

  if (metric === 'XP' || metric === 'STREAK') {
    const field = metric === 'XP' ? 'xpPoints' : 'streakCurrent';
    const users = await prisma.user.findMany({ where: { role: { notIn: ['SUPER_ADMIN', 'ADMIN'] } }, orderBy: [{ [field]: 'desc' }], take: limit, select: memberSelect });
    ranked = users.map((u, i) => ({ userId: u.id, name: u.displayName, avatarUrl: u.avatarUrl, level: u.level, score: u[field] }));
    return { metric, period, entries: ranked.map((r, i) => ({ ...r, rank: i + 1 })) };
  }

  if (metric === 'WORKOUTS') {
    const g = await prisma.workoutSession.groupBy({ by: ['userId'], where: { status: 'COMPLETED', completedAt: { gte: start } }, _count: true, orderBy: { _count: { userId: 'desc' } }, take: limit });
    const users = await prisma.user.findMany({ where: { id: { in: g.map((x) => x.userId) } }, select: memberSelect });
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    ranked = g.map((x) => ({ userId: x.userId, name: byId[x.userId]?.displayName, avatarUrl: byId[x.userId]?.avatarUrl, level: byId[x.userId]?.level, score: x._count }));
  } else if (metric === 'VOLUME') {
    const g = await prisma.workoutSession.groupBy({ by: ['userId'], where: { status: 'COMPLETED', completedAt: { gte: start } }, _sum: { totalVolume: true }, orderBy: { _sum: { totalVolume: 'desc' } }, take: limit });
    const users = await prisma.user.findMany({ where: { id: { in: g.map((x) => x.userId) } }, select: memberSelect });
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    ranked = g.map((x) => ({ userId: x.userId, name: byId[x.userId]?.displayName, avatarUrl: byId[x.userId]?.avatarUrl, level: byId[x.userId]?.level, score: Math.round(Number(x._sum.totalVolume || 0) / 1000) }));
  } else if (metric === 'DISTANCE') {
    const g = await prisma.cardioSession.groupBy({ by: ['userId'], where: { date: { gte: start } }, _sum: { distanceM: true }, orderBy: { _sum: { distanceM: 'desc' } }, take: limit });
    const users = await prisma.user.findMany({ where: { id: { in: g.map((x) => x.userId) } }, select: memberSelect });
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    ranked = g.map((x) => ({ userId: x.userId, name: byId[x.userId]?.displayName, avatarUrl: byId[x.userId]?.avatarUrl, level: byId[x.userId]?.level, score: +(Number(x._sum.distanceM || 0) / 1000).toFixed(1) }));
  } else if (metric === 'STEPS') {
    const g = await prisma.wearableDataPoint.groupBy({ by: ['userId'], where: { type: 'STEPS', date: { gte: start } }, _sum: { value: true }, orderBy: { _sum: { value: 'desc' } }, take: limit });
    const users = await prisma.user.findMany({ where: { id: { in: g.map((x) => x.userId) } }, select: memberSelect });
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    ranked = g.map((x) => ({ userId: x.userId, name: byId[x.userId]?.displayName, avatarUrl: byId[x.userId]?.avatarUrl, level: byId[x.userId]?.level, score: Math.round(Number(x._sum.value || 0)) }));
  } else if (metric === 'CLASS_ATTENDANCE') {
    const g = await prisma.classEnrollment.groupBy({ by: ['userId'], where: { status: 'ATTENDED', klass: { scheduledAt: { gte: start } } }, _count: true, orderBy: { _count: { userId: 'desc' } }, take: limit });
    const users = await prisma.user.findMany({ where: { id: { in: g.map((x) => x.userId) } }, select: memberSelect });
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    ranked = g.map((x) => ({ userId: x.userId, name: byId[x.userId]?.displayName, avatarUrl: byId[x.userId]?.avatarUrl, level: byId[x.userId]?.level, score: x._count }));
  } else if (metric === 'KUDOS') {
    const g = await prisma.kudos.groupBy({ by: ['postId'], where: { post: { user: { role: { notIn: ['SUPER_ADMIN', 'ADMIN'] } }, createdAt: { gte: start } } }, _count: true, take: 200 });
    const posts = await prisma.post.findMany({ where: { id: { in: g.map((x) => x.postId) } }, include: { user: { select: memberSelect } } });
    const countByPost = Object.fromEntries(g.map((x) => [x.postId, x._count]));
    const bestByUser = new Map();
    for (const p of posts) {
      const c = countByPost[p.id] || 0;
      if (!bestByUser.has(p.userId) || bestByUser.get(p.userId).score < c) {
        bestByUser.set(p.userId, { userId: p.user.id, name: p.user.displayName, avatarUrl: p.user.avatarUrl, level: p.user.level, score: c });
      }
    }
    ranked = [...bestByUser.values()].sort((a, b) => b.score - a.score).slice(0, limit);
  }

  ranked.forEach((r, i) => { r.rank = i + 1; });
  return { metric, period, entries: ranked };
}

/** Get leaderboard, preferring a recent snapshot when requested. */
async function get({ metric = 'XP', period = 'WEEKLY', limit = 50, useCache = false }) {
  if (useCache) {
    const snap = await prisma.leaderboardSnapshot.findFirst({
      where: { scope: 'PLATFORM', period },
      orderBy: { computedAt: 'desc' },
    });
    if (snap && Date.now() - snap.computedAt.getTime() < 3600e3) {
      return { metric, period, entries: snap.entries, cached: true };
    }
  }
  return compute({ metric, period, limit });
}

/** The caller's rank on a given board. */
async function myRank(userId, { metric = 'XP', period = 'WEEKLY' }) {
  const { entries } = await compute({ metric, period, limit: 500 });
  const idx = entries.findIndex((e) => e.userId === userId);
  return { rank: idx >= 0 ? idx + 1 : null, entry: idx >= 0 ? entries[idx] : null, total: entries.length };
}

/** Persist snapshots for the top boards (called by cron). */
async function snapshot() {
  const boards = [
    { metric: 'XP', period: 'WEEKLY' },
    { metric: 'XP', period: 'MONTHLY' },
    { metric: 'WORKOUTS', period: 'WEEKLY' },
    { metric: 'VOLUME', period: 'MONTHLY' },
  ];
  const results = [];
  for (const b of boards) {
    const { entries } = await compute({ ...b, limit: 100 });
    const slim = entries.map(({ userId, name, avatarUrl, score, rank }) => ({ userId, name, avatarUrl, score, rank }));
    const saved = await prisma.leaderboardSnapshot.create({ data: { scope: 'PLATFORM', period: b.period, entries: slim } });
    // keep only last 10 per scope+period
    const stale = await prisma.leaderboardSnapshot.findMany({ where: { scope: 'PLATFORM', period: b.period }, orderBy: { computedAt: 'desc' }, skip: 10, select: { id: true } });
    if (stale.length) await prisma.leaderboardSnapshot.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
    results.push({ ...b, count: slim.length, id: saved.id });
  }
  return { snapshotted: results };
}

module.exports = { get, compute, myRank, snapshot, METRICS };
