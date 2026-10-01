/**
 * Admin service — user management, trainer verification, exercise/program
 * moderation queues, content-report resolution, platform settings and the
 * immutable audit trail. Every mutating action writes an AuditLog row.
 */
const prisma = require('../lib/prisma');
const { notFound, badRequest } = require('../utils/response.util');

const notify = (userId, type, title, body, data) =>
  require('./notification.service').notify(userId, type, title, body, data).catch(() => {});

/** Append an audit entry (best-effort; never blocks the request). */
async function audit(actorId, action, entityType, entityId, before, after, ip) {
  try {
    return await prisma.auditLog.create({ data: { actorId, action, entityType, entityId: entityId || null, before: before || undefined, after: after || undefined, ip: ip || null } });
  } catch { return null; }
}

/* ---------- Users ---------- */

async function listUsers({ page = 1, limit = 20, q, role, subscriptionType, banned } = {}) {
  const where = {};
  if (role) where.role = role;
  if (subscriptionType) where.subscriptionType = subscriptionType;
  if (typeof banned === 'boolean') where.isBanned = banned;
  if (q) where.OR = [{ email: { contains: q, mode: 'insensitive' } }, { username: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }];
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, role: true, subscriptionType: true, isBanned: true, level: true, xpPoints: true, streakCurrent: true, createdAt: true, lastActiveAt: true } }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, limit };
}

async function getUserDetail(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      trainerProfile: { select: { verificationStatus: true, ratingAvg: true, clientCount: true } },
      _count: { select: { posts: true, sessions: true, payments: true, followsFollowers: true, followsFollowing: true, challengesCreated: true } },
    },
  });
  if (!user) throw notFound('User not found');
  const [recentPayments, notifications] = await Promise.all([
    prisma.payment.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.notification.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  return { ...user, recentPayments, recentNotifications: notifications };
}

async function setBanned(actor, id, { banned, reason }, ip) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, isBanned: true } });
  if (!user) throw notFound('User not found');
  const updated = await prisma.user.update({ where: { id }, data: { isBanned: banned } });
  await audit(actor.id, banned ? 'USER_BAN' : 'USER_UNBAN', 'USER', id, { isBanned: user.isBanned }, { isBanned: banned, reason }, ip);
  if (banned) notify(id, 'SYSTEM', 'Account suspended', reason || 'Your account has been suspended by an administrator.', {});
  return { id, isBanned: updated.isBanned };
}

async function setRole(actor, id, { role }, ip) {
  const before = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!before) throw notFound('User not found');
  const updated = await prisma.user.update({ where: { id }, data: { role } });
  await audit(actor.id, 'USER_ROLE_CHANGE', 'USER', id, before, { role }, ip);
  return updated;
}

async function setSubscription(actor, id, { subscriptionType }, ip) {
  const before = await prisma.user.findUnique({ where: { id }, select: { subscriptionType: true } });
  if (!before) throw notFound('User not found');
  const updated = await prisma.user.update({ where: { id }, data: { subscriptionType } });
  await audit(actor.id, 'USER_SUBSCRIPTION_CHANGE', 'USER', id, before, { subscriptionType }, ip);
  return updated;
}

/* ---------- Trainer verification ---------- */

async function pendingTrainers({ page = 1, limit = 20 } = {}) {
  const where = { verificationStatus: 'PENDING' };
  const [items, total] = await Promise.all([
    prisma.trainerProfile.findMany({ where, orderBy: { createdAt: 'asc' }, skip: (page - 1) * limit, take: limit, include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true } } } }),
    prisma.trainerProfile.count({ where }),
  ]);
  return { items, total, page, limit };
}

async function reviewTrainer(actor, id, { decision, note }, ip) {
  const profile = await prisma.trainerProfile.findUnique({ where: { id }, include: { user: { select: { id: true } } } });
  if (!profile) throw notFound('Trainer profile not found');
  const status = decision === 'APPROVE' ? 'APPROVED' : decision === 'REJECT' ? 'REJECTED' : null;
  if (!status) throw badRequest('decision must be APPROVE or REJECT');
  const updated = await prisma.trainerProfile.update({ where: { id }, data: { verificationStatus: status, verifiedById: actor.id } });
  await audit(actor.id, status === 'APPROVED' ? 'TRAINER_APPROVE' : 'TRAINER_REJECT', 'TRAINER_PROFILE', id, { status: profile.verificationStatus }, { status, note }, ip);
  notify(profile.userId, 'SYSTEM', status === 'APPROVED' ? 'You are verified!' : 'Verification outcome', status === 'APPROVED' ? 'Your trainer account has been approved. You can now sell programs and host classes.' : (note || 'Your trainer verification was not approved.'), {});
  return updated;
}

/* ---------- Exercise community submissions ---------- */

async function pendingExercises({ page = 1, limit = 20 } = {}) {
  const where = { status: 'PENDING', isCommunity: true };
  const [items, total] = await Promise.all([
    prisma.exercise.findMany({ where, orderBy: { createdAt: 'asc' }, skip: (page - 1) * limit, take: limit, include: { submittedBy: { select: { id: true, displayName: true } } } }),
    prisma.exercise.count({ where }),
  ]);
  return { items, total, page, limit };
}

async function reviewExercise(actor, id, { decision, note }, ip) {
  const ex = await prisma.exercise.findUnique({ where: { id }, select: { id: true, status: true, submittedById: true, name: true } });
  if (!ex) throw notFound('Exercise not found');
  const status = decision === 'APPROVE' ? 'APPROVED' : decision === 'REJECT' ? 'REJECTED' : null;
  if (!status) throw badRequest('decision must be APPROVE or REJECT');
  const updated = await prisma.exercise.update({ where: { id }, data: { status } });
  await audit(actor.id, 'EXERCISE_REVIEW', 'EXERCISE', id, { status: ex.status }, { status, note }, ip);
  if (ex.submittedById) notify(ex.submittedById, 'SYSTEM', 'Exercise submission reviewed', `Your exercise "${ex.name}" was ${status.toLowerCase()}.`, { exerciseId: id });
  return updated;
}

/* ---------- Program review + featuring ---------- */

async function pendingPrograms({ page = 1, limit = 20 } = {}) {
  const where = { status: 'PENDING_REVIEW' };
  const [items, total] = await Promise.all([
    prisma.program.findMany({ where, orderBy: { createdAt: 'asc' }, skip: (page - 1) * limit, take: limit, include: { creator: { select: { id: true, displayName: true } } } }),
    prisma.program.count({ where }),
  ]);
  return { items, total, page, limit };
}

async function reviewProgram(actor, id, { decision, note }, ip) {
  const program = await prisma.program.findUnique({ where: { id }, select: { id: true, status: true, creatorId: true, name: true } });
  if (!program) throw notFound('Program not found');
  const status = decision === 'APPROVE' ? 'PUBLISHED' : decision === 'REJECT' ? 'REJECTED' : null;
  if (!status) throw badRequest('decision must be APPROVE or REJECT');
  const updated = await prisma.program.update({ where: { id }, data: { status } });
  await audit(actor.id, 'PROGRAM_REVIEW', 'PROGRAM', id, { status: program.status }, { status, note }, ip);
  notify(program.creatorId, 'NEW_PROGRAM', `Program ${status === 'PUBLISHED' ? 'approved' : 'not approved'}`, `"${program.name}" is now ${status.replace('_', ' ').toLowerCase()}.`, { programId: id });
  return updated;
}

async function featureProgram(actor, id, { featured }, ip) {
  const updated = await prisma.program.update({ where: { id }, data: { featured } }).catch(() => { throw notFound('Program not found'); });
  await audit(actor.id, featured ? 'PROGRAM_FEATURE' : 'PROGRAM_UNFEATURE', 'PROGRAM', id, null, { featured }, ip);
  return updated;
}

/* ---------- Content reports ---------- */

async function listReports({ page = 1, limit = 20, status = 'PENDING' } = {}) {
  const where = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.contentReport.findMany({ where, orderBy: { createdAt: 'asc' }, skip: (page - 1) * limit, take: limit, include: { post: { select: { id: true, content: true, userId: true, mediaUrls: true } } } }),
    prisma.contentReport.count({ where }),
  ]);
  return { items, total, page, limit };
}

async function resolveReport(actor, id, { decision, note }, ip) {
  const report = await prisma.contentReport.findUnique({ where: { id } });
  if (!report) throw notFound('Report not found');
  const status = decision === 'UPHELD' ? 'APPROVED' : decision === 'DISMISS' ? 'REJECTED' : null;
  if (!status) throw badRequest('decision must be UPHELD or DISMISS');
  const updated = await prisma.contentReport.update({ where: { id }, data: { status, reviewedBy: actor.id } });
  if (status === 'APPROVED' && report.postId) {
    await prisma.post.update({ where: { id: report.postId }, data: { flagged: true } }).catch(() => {});
  }
  await audit(actor.id, 'REPORT_RESOLVE', 'CONTENT_REPORT', id, { status: report.status }, { status, note }, ip);
  return updated;
}

/* ---------- Platform settings ---------- */

async function getSettings() {
  const rows = await prisma.platformSetting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

async function setSetting(actor, { key, value }, ip) {
  if (!key) throw badRequest('key is required');
  const before = await prisma.platformSetting.findUnique({ where: { key }, select: { value: true } });
  const row = await prisma.platformSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  await audit(actor.id, 'SETTING_CHANGE', 'PLATFORM_SETTING', row.id, before ? { value: before.value } : null, { value }, ip);
  return row;
}

/* ---------- Audit log ---------- */

async function listAuditLogs({ page = 1, limit = 30, action, entityType } = {}) {
  const where = {};
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { actor: { select: { id: true, displayName: true, role: true } } } }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total, page, limit };
}

module.exports = {
  audit,
  listUsers, getUserDetail, setBanned, setRole, setSubscription,
  pendingTrainers, reviewTrainer,
  pendingExercises, reviewExercise,
  pendingPrograms, reviewProgram, featureProgram,
  listReports, resolveReport,
  getSettings, setSetting,
  listAuditLogs,
};
