/**
 * Wearable service — ingest health/wearable data points (Expo Health,
 * Apple Health, Google Fit, Garmin/Polar/Fitbit CSV), daily rollups.
 */
const prisma = require('../lib/prisma');
const fitness = require('../utils/fitness.util');
const { badRequest } = require('../utils/response.util');

function dayBucket(date) {
  const d = date ? new Date(date) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Upsert-style append of a single data point. */
async function record(userId, { source = 'MANUAL', type, date, value, unit, details = {} }) {
  if (!type || value == null) throw badRequest('type and value required');
  return prisma.wearableDataPoint.create({
    data: { userId, source, type, date: dayBucket(date), value: String(value), unit: unit || defaultUnit(type), details },
  });
}

function defaultUnit(type) {
  return { STEPS: 'steps', HEART_RATE: 'bpm', SLEEP: 'minutes', ACTIVE_CALORIES: 'kcal', WORKOUT: 'minutes' }[type] || 'count';
}

/** Batch ingest (mobile Health Kit sync). */
async function syncBatch(userId, { source, points = [] }) {
  if (!points.length) throw badRequest('No points');
  const data = points.map((p) => ({
    userId,
    source: p.source || source || 'MANUAL',
    type: p.type,
    date: dayBucket(p.date),
    value: String(p.value),
    unit: p.unit || defaultUnit(p.type),
    details: p.details || {},
  }));
  const created = await prisma.wearableDataPoint.createMany({ data });
  // convert today's steps to an ACTIVE_CALORIES proxy if none present
  return { ingested: created.count };
}

/** Parse a CSV export (Garmin/Polar/Fitbit style): date,type,value,unit */
async function importCsv(userId, { source, csv }) {
  if (!csv) throw badRequest('csv required');
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const header = lines[0].toLowerCase();
  const start = header.includes('date') ? 1 : 0;
  const points = [];
  for (const line of lines.slice(start)) {
    const cols = line.split(',');
    if (cols.length < 3) continue;
    const [date, type, rawValue, unit] = cols;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) continue;
    points.push({ source, date, type: type.toUpperCase(), value, unit });
  }
  if (!points.length) throw badRequest('No valid rows found');
  return syncBatch(userId, { source, points });
}

/** Daily rollup across types for one date. */
async function dailySummary(userId, date) {
  const d = dayBucket(date);
  const end = new Date(d.getTime() + 864e5);
  const rows = await prisma.wearableDataPoint.findMany({ where: { userId, date: { gte: d, lt: end } } });
  const byType = {};
  for (const r of rows) {
    if (!byType[r.type]) byType[r.type] = { type: r.type, values: [], unit: r.unit };
    byType[r.type].values.push(Number(r.value));
  }
  const out = {};
  for (const [type, { values, unit }] of Object.entries(byType)) {
    const sum = values.reduce((a, b) => a + b, 0);
    out[type] = { unit, sum, avg: +(sum / values.length).toFixed(1), max: Math.max(...values), min: Math.min(...values) };
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { weightKg: true } });
  const steps = out.STEPS?.sum || 0;
  const stepCalories = fitness.caloriesFromSteps(steps, Number(user?.weightKg || 70));
  return { date: d, metrics: out, steps, stepCalories };
}

/** Range series for charts (steps, resting HR, sleep hours per day). */
async function series(userId, { type = 'STEPS', from, to, agg = 'sum' }) {
  const start = dayBucket(from);
  const end = dayBucket(to || new Date());
  const rows = await prisma.wearableDataPoint.findMany({
    where: { userId, type, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });
  const byDay = new Map();
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(Number(r.value));
  }
  return [...byDay.entries()].map(([date, values]) => {
    const sum = values.reduce((a, b) => a + b, 0);
    const value = agg === 'avg' ? +(sum / values.length).toFixed(1) : agg === 'max' ? Math.max(...values) : sum;
    return { date, value };
  });
}

async function sources(userId) {
  const rows = await prisma.wearableDataPoint.groupBy({ by: ['source'], where: { userId }, _count: true, _max: { date: true } });
  return rows.map((r) => ({ source: r.source, points: r._count, lastSync: r._max.date }));
}

async function recent(userId, { type, limit = 50 }) {
  return prisma.wearableDataPoint.findMany({ where: { userId, ...(type ? { type } : {}) }, orderBy: { date: 'desc' }, take: limit });
}

async function clearSource(userId, source) {
  const r = await prisma.wearableDataPoint.deleteMany({ where: { userId, source } });
  return { deleted: r.count };
}

module.exports = { record, syncBatch, importCsv, dailySummary, series, sources, recent, clearSource };
