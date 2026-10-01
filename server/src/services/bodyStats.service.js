/**
 * Body stats service — weight / body-fat / measurement logging, trends,
 * goal tracking, and derived metrics (BMI, lean mass).
 */
const prisma = require('../lib/prisma');
const fitness = require('../utils/fitness.util');
const caloriesUtil = require('../utils/calories.util');
const { notFound, badRequest } = require('../utils/response.util');

function dayBucket(date) {
  const d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) throw badRequest('Invalid date');
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

async function log(userId, data) {
  const date = dayBucket(data.date);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  let bmi = data.bmi ?? null;
  if (data.weightKg && user?.heightCm) {
    bmi = fitness.calcBMI(Number(data.weightKg), Number(user.heightCm));
  }
  const measurements = data.measurements || {};
  // Update the denormalised weight/goal columns on the user profile
  const userPatch = {};
  if (data.weightKg) userPatch.weightKg = String(data.weightKg);
  if (data.bodyFatPct) userPatch.bodyFatPct = String(data.bodyFatPct);
  if (Object.keys(userPatch).length) await prisma.user.update({ where: { id: userId }, data: userPatch });
  // Re-derive nutrition goal if weight materially changed
  if (data.weightKg) {
    require('./calorieCalculator.service').ensureNutritionGoal(userId).catch(() => {});
  }
  const payload = {
    weightKg: data.weightKg != null ? String(data.weightKg) : null,
    bodyFatPct: data.bodyFatPct != null ? String(data.bodyFatPct) : null,
    muscleMassKg: data.muscleMassKg != null ? String(data.muscleMassKg) : null,
    bmi: bmi != null ? String(bmi) : null,
    measurements,
    notes: data.notes || null,
  };
  const existing = await prisma.bodyStat.findFirst({ where: { userId, date } });
  if (existing) {
    const patch = { ...payload };
    for (const k of Object.keys(patch)) if (patch[k] == null) delete patch[k];
    return prisma.bodyStat.update({ where: { id: existing.id }, data: patch });
  }
  return prisma.bodyStat.create({ data: { userId, date, ...payload } });
}

async function list(userId, { from, to, limit = 365 }) {
  const where = { userId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = dayBucket(from);
    if (to) where.date.lt = new Date(dayBucket(to).getTime() + 864e5);
  }
  return prisma.bodyStat.findMany({ where, orderBy: { date: 'asc' }, take: limit });
}

async function history(userId, { limit = 60 }) {
  return prisma.bodyStat.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: limit });
}

async function deleteStat(userId, id) {
  const s = await prisma.bodyStat.findFirst({ where: { id, userId } });
  if (!s) throw notFound('Body stat not found');
  await prisma.bodyStat.delete({ where: { id } });
  return true;
}

/** Latest stat + deltas vs 7/30/90 days ago. */
async function current(userId) {
  const stats = await prisma.bodyStat.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 400 });
  if (!stats.length) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return { latest: null, deltas: {}, weightKg: user?.weightKg ? Number(user.weightKg) : null, bodyFatPct: user?.bodyFatPct ? Number(user.bodyFatPct) : null };
  }
  const latest = stats[0];
  const findPrev = (days) => {
    const cutoff = new Date(latest.date.getTime() - days * 864e5);
    return stats.find((s) => s.date <= cutoff) || null;
  };
  const delta = (days, field) => {
    const prev = findPrev(days);
    if (!prev || prev[field] == null || latest[field] == null) return null;
    return +(Number(latest[field]) - Number(prev[field])).toFixed(1);
  };
  let leanMassKg = null;
  if (latest.weightKg && latest.bodyFatPct) {
    leanMassKg = +(Number(latest.weightKg) * (1 - Number(latest.bodyFatPct) / 100)).toFixed(1);
  }
  return {
    latest,
    leanMassKg,
    deltas: {
      weight: { d7: delta(7, 'weightKg'), d30: delta(30, 'weightKg'), d90: delta(90, 'weightKg') },
      bodyFat: { d7: delta(7, 'bodyFatPct'), d30: delta(30, 'bodyFatPct'), d90: delta(90, 'bodyFatPct') },
    },
  };
}

/* ---------- Goals ---------- */

async function setGoal(userId, data) {
  if (!data.type || !data.metricKey || data.targetValue == null) throw badRequest('type, metricKey and targetValue required');
  let startValue = data.startValue;
  if (startValue == null) {
    const cur = await current(userId);
    const map = { weight: cur.latest?.weightKg, bodyFat: cur.latest?.bodyFatPct, waist: cur.latest?.measurements?.waist };
    startValue = map[data.metricKey] ?? 0;
  }
  return prisma.bodyStatGoal.create({
    data: {
      userId,
      type: data.type,
      metricKey: data.metricKey,
      startValue: String(startValue),
      targetValue: String(data.targetValue),
      currentVale: String(startValue),
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
    },
  });
}

async function listGoals(userId) {
  const goals = await prisma.bodyStatGoal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  const cur = await current(userId);
  return goals.map((g) => {
    const metricMap = { weight: cur.latest?.weightKg, bodyFat: cur.latest?.bodyFatPct, waist: cur.latest?.measurements?.waist };
    const currentValue = metricMap[g.metricKey] != null ? Number(metricMap[g.metricKey]) : Number(g.currentVale);
    const start = Number(g.startValue);
    const target = Number(g.targetValue);
    const span = target - start;
    const moved = currentValue - start;
    const progressPct = span === 0 ? 100 : Math.max(0, Math.min(100, Math.round((moved / span) * 100)));
    return { ...g, currentValue, progressPct, achieved: progressPct >= 100 };
  });
}

async function deleteGoal(userId, id) {
  const g = await prisma.bodyStatGoal.findFirst({ where: { id, userId } });
  if (!g) throw notFound('Goal not found');
  await prisma.bodyStatGoal.delete({ where: { id } });
  return true;
}

/** Navy body-fat estimate from circumference measurements (cm). */
function estimateBodyFat({ sex, waist, neck, height, hips }) {
  const pct = caloriesUtil.calcNavyBodyFat({ sex, waist, neck, height, hips });
  if (pct == null) throw badRequest('Missing measurements for body-fat estimate');
  return { bodyFatPct: pct };
}

module.exports = { log, list, history, current, deleteStat, setGoal, listGoals, deleteGoal, estimateBodyFat };
