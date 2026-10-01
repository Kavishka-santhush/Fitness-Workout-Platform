/**
 * Challenge service — create/browse/enroll, team-based challenges,
 * progress evaluation against rulesConfig, milestones, completion.
 */
const prisma = require('../lib/prisma');
const { notFound, badRequest, conflict, forbidden } = require('../utils/response.util');

/* ---------- Metric evaluation ---------- */

/** Compute a user's aggregate for a metric over a window. */
async function computeMetric(userId, metric, start, end) {
  const range = { gte: start, lte: end };
  switch (metric) {
    case 'WORKOUTS_COUNT':
      return prisma.workoutSession.count({ where: { userId, status: 'COMPLETED', completedAt: range } });
    case 'VOLUME_KG': {
      const agg = await prisma.workoutSession.aggregate({ where: { userId, status: 'COMPLETED', completedAt: range }, _sum: { totalVolume: true } });
      return Number(agg._sum.totalVolume || 0) / 1000;
    }
    case 'SET_COUNT': {
      const agg = await prisma.workoutSession.aggregate({ where: { userId, status: 'COMPLETED', completedAt: range }, _sum: { totalSets: true } });
      return agg._sum.totalSets || 0;
    }
    case 'DISTANCE_KM': {
      const agg = await prisma.cardioSession.aggregate({ where: { userId, date: range }, _sum: { distanceM: true } });
      return Number(agg._sum.distanceM || 0) / 1000;
    }
    case 'CARDIO_MINUTES': {
      const agg = await prisma.cardioSession.aggregate({ where: { userId, date: range }, _sum: { durationSec: true } });
      return Math.round((agg._sum.durationSec || 0) / 60);
    }
    case 'STEPS': {
      const agg = await prisma.wearableDataPoint.aggregate({ where: { userId, type: 'STEPS', date: range }, _sum: { value: true } });
      return Number(agg._sum.value || 0);
    }
    case 'ACTIVE_CALORIES': {
      const w = await prisma.wearableDataPoint.aggregate({ where: { userId, type: 'ACTIVE_CALORIES', date: range }, _sum: { value: true } });
      const s = await prisma.workoutSession.aggregate({ where: { userId, status: 'COMPLETED', completedAt: range }, _sum: { caloriesBurned: true } });
      return Number(w._sum.value || 0) + (s._sum.caloriesBurned || 0);
    }
    case 'CLASS_ATTENDANCE':
      return prisma.classEnrollment.count({ where: { userId, status: 'ATTENDED', klass: { scheduledAt: range } } });
    case 'WEIGHT_LOGGED':
      return prisma.bodyStat.count({ where: { userId, date: range } });
    case 'STREAK_DAYS': {
      const sessions = await prisma.workoutSession.findMany({ where: { userId, status: 'COMPLETED', completedAt: range }, select: { completedAt: true } });
      const days = new Set(sessions.map((s) => s.completedAt.toISOString().slice(0, 10)));
      let best = 0;
      let run = 0;
      let prev = null;
      for (const d of [...days].sort()) {
        if (prev && (new Date(d) - new Date(prev)) === 864e5) run += 1;
        else run = 1;
        best = Math.max(best, run);
        prev = d;
      }
      return best;
    }
    default:
      return 0;
  }
}

/** Recompute progress for one enrollment and handle milestones/completion. */
async function refreshEnrollment(enrollment, challenge) {
  const metric = (challenge.rulesConfig && challenge.rulesConfig.metric) || challenge.type;
  const now = new Date();
  const value = await computeMetric(enrollment.userId, metric, challenge.startDate, now < challenge.endDate ? now : challenge.endDate);
  const goal = Number(challenge.goalValue) || 1;
  const pct = Math.min(100, Math.round((value / goal) * 100));
  const data = { progressValue: String(value) };
  // milestones
  const milestones = Array.isArray(challenge.milestones) ? challenge.milestones : [];
  const hit = [...enrollment.milestonesHit];
  let changed = false;
  for (const m of milestones) {
    const thresholdPct = Math.round((m.at || 0) * 100);
    if (pct >= thresholdPct && !hit.includes(String(thresholdPct))) {
      hit.push(String(thresholdPct));
      changed = true;
      await prisma.challengeMilestone.create({ data: { challengeId: challenge.id, userId: enrollment.userId, label: m.label || `${thresholdPct}%` } });
      const notificationService = require('./notification.service');
      notificationService.notify(enrollment.userId, 'CHALLENGE_UPDATE', 'Milestone reached', `${challenge.title}: ${m.label || thresholdPct + '%'} complete`, { challengeId: challenge.id }).catch(() => {});
    }
  }
  if (changed) data.milestonesHit = hit;
  if (value >= goal && !enrollment.completedAt) {
    data.completedAt = now;
    await prisma.challenge.update({ where: { id: challenge.id }, data: { completionCount: { increment: 1 } } });
    const notificationService = require('./notification.service');
    notificationService.notify(enrollment.userId, 'CHALLENGE_UPDATE', 'Challenge complete! 🏆', `You finished "${challenge.title}"`, { challengeId: challenge.id }).catch(() => {});
  }
  await prisma.challengeEnrollment.update({ where: { id: enrollment.id }, data });
  return { value, pct, completed: !!data.completedAt || !!enrollment.completedAt };
}

/** Refresh every enrollment in a challenge (leaderboard + teams). */
async function refreshChallenge(challengeId) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId }, include: { entries: true, teams: { include: { members: true } } } });
  if (!challenge) throw notFound('Challenge not found');
  for (const e of challenge.entries) await refreshEnrollment(e, challenge);
  // recompute ranks
  const entries = await prisma.challengeEnrollment.findMany({ where: { challengeId }, orderBy: { progressValue: 'desc' } });
  await prisma.$transaction(entries.map((e, i) => prisma.challengeEnrollment.update({ where: { id: e.id }, data: { rank: i + 1 } })));
  if (challenge.isTeamBased) {
    const teams = await prisma.challengeTeam.findMany({ where: { challengeId }, include: { members: true } });
    const scores = await Promise.all(teams.map(async (t) => {
      const ids = t.members.map((m) => m.userId);
      const agg = await prisma.challengeEnrollment.aggregate({ where: { challengeId, userId: { in: ids } }, _sum: { progressValue: true } });
      return { id: t.id, total: Number(agg._sum.progressValue || 0) };
    }));
    scores.sort((a, b) => b.total - a.total);
    await prisma.$transaction(scores.map((s, i) => prisma.challengeTeam.update({ where: { id: s.id }, data: { totalScore: String(s.total), rank: i + 1 } })));
  }
  return challenge;
}

/* ---------- CRUD ---------- */

async function create(creatorId, data) {
  if (!data.title || !data.goalValue) throw badRequest('title and goalValue required');
  if (!data.startDate || !data.endDate) throw badRequest('startDate and endDate required');
  const challenge = await prisma.challenge.create({
    data: {
      creatorId,
      title: data.title,
      description: data.description || null,
      type: data.type || 'STREAK',
      scope: data.scope || 'PLATFORM',
      groupId: data.groupId || null,
      corporateOrgId: data.corporateOrgId || null,
      rulesConfig: data.rulesConfig || { metric: data.type || 'STREAK' },
      goalValue: String(data.goalValue),
      goalUnit: data.goalUnit || 'reps',
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      prize: data.prize || null,
      isTeamBased: !!data.isTeamBased,
      maxTeams: data.maxTeams || null,
      milestones: data.milestones || [],
    },
  });
  return challenge;
}

async function browse(userId, { scope, active, type, page = 1, limit = 20 }) {
  const where = {};
  if (scope) where.scope = scope;
  if (type) where.type = type;
  if (active !== undefined) where.active = active === true || active === 'true';
  const [items, total] = await Promise.all([
    prisma.challenge.findMany({ where, include: { _count: { select: { entries: true } } }, orderBy: { startDate: 'desc' }, skip: (page - 1) * limit, take: +limit }),
    prisma.challenge.count({ where }),
  ]);
  const mine = await prisma.challengeEnrollment.findMany({ where: { userId, challengeId: { in: items.map((c) => c.id) } }, select: { challengeId: true, progressValue: true, rank: true } });
  const joined = Object.fromEntries(mine.map((m) => [m.challengeId, m]));
  return {
    items: items.map((c) => ({ ...c, isJoined: !!joined[c.id], myProgress: joined[c.id]?.progressValue ? Number(joined[c.id].progressValue) : null, myRank: joined[c.id]?.rank ?? null })),
    page: +page, limit: +limit, total,
  };
}

async function getOne(userId, id) {
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: { entries: { orderBy: { progressValue: 'desc' }, take: 50, include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } }, teams: { include: { members: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } } } } },
  });
  if (!challenge) throw notFound('Challenge not found');
  const mine = await prisma.challengeEnrollment.findFirst({ where: { userId, challengeId: id } });
  return { ...challenge, isJoined: !!mine, myProgress: mine ? Number(mine.progressValue) : null, myRank: mine?.rank ?? null };
}

async function enroll(userId, id) {
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) throw notFound('Challenge not found');
  if (challenge.endDate < new Date()) throw badRequest('Challenge has ended');
  const existing = await prisma.challengeEnrollment.findFirst({ where: { userId, challengeId: id } });
  if (existing) throw conflict('Already enrolled');
  const enrollment = await prisma.challengeEnrollment.create({ data: { userId, challengeId: id } });
  await prisma.challenge.update({ where: { id }, data: { participantCount: { increment: 1 } } });
  // add to calendar schedule
  await prisma.scheduledItem.create({ data: { userId, date: challenge.startDate, activityType: 'WORKOUT', challengeId: id, status: 'PLANNED', note: challenge.title } }).catch(() => {});
  return enrollment;
}

async function joinTeam(userId, id, { teamName, teamId }) {
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) throw notFound('Challenge not found');
  if (!challenge.isTeamBased) throw badRequest('Not a team challenge');
  const enrollment = await prisma.challengeEnrollment.findFirst({ where: { userId, challengeId: id } });
  if (!enrollment) throw badRequest('Enroll before joining a team');
  let team;
  if (teamId) {
    team = await prisma.challengeTeam.findFirst({ where: { id: teamId, challengeId: id } });
    if (!team) throw notFound('Team not found');
  } else {
    if (!teamName) throw badRequest('teamName or teamId required');
    team = await prisma.challengeTeam.findFirst({ where: { challengeId: id, name: teamName } });
    if (!team) {
      const count = await prisma.challengeTeam.count({ where: { challengeId: id } });
      if (challenge.maxTeams && count >= challenge.maxTeams) throw badRequest('Team slots full');
      team = await prisma.challengeTeam.create({ data: { challengeId: id, name: teamName } });
    }
  }
  const already = await prisma.challengeTeamMember.findFirst({ where: { teamId: team.id, userId } });
  if (already) throw conflict('Already on a team');
  await prisma.challengeTeamMember.create({ data: { teamId: team.id, userId } });
  await prisma.challengeEnrollment.update({ where: { id: enrollment.id }, data: { teamId: team.id } });
  return { teamId: team.id, teamName: team.name };
}

async function leaderboard(challengeId, { limit = 50 } = {}) {
  const entries = await prisma.challengeEnrollment.findMany({
    where: { challengeId },
    orderBy: { progressValue: 'desc' },
    take: limit,
    include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
  });
  return entries.map((e, i) => ({ rank: e.rank ?? i + 1, userId: e.user.id, name: e.user.displayName, avatarUrl: e.user.avatarUrl, progress: Number(e.progressValue), completed: !!e.completedAt }));
}

async function myChallenges(userId) {
  const mine = await prisma.challengeEnrollment.findMany({
    where: { userId },
    include: { challenge: true },
    orderBy: { joinedAt: 'desc' },
  });
  return Promise.all(mine.map(async (m) => ({
    ...m,
    pct: Number(m.challenge.goalValue) ? Math.min(100, Math.round((Number(m.progressValue) / Number(m.challenge.goalValue)) * 100)) : 0,
  })));
}

/** Evaluate all active challenges (called by cron). */
async function evaluateActive() {
  const active = await prisma.challenge.findMany({ where: { active: true, startDate: { lte: new Date() }, endDate: { gte: new Date() } }, select: { id: true } });
  for (const c of active) {
    await refreshChallenge(c.id).catch(() => {});
  }
  return { evaluated: active.length };
}

module.exports = { create, browse, getOne, enroll, joinTeam, leaderboard, myChallenges, refreshChallenge, refreshEnrollment, evaluateActive, computeMetric };
