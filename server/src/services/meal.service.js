/**
 * Meal service — daily food diary: log foods/recipes with serving math,
 * copy days, templates, water tracking, summaries, CSV export.
 */
const prisma = require('../lib/prisma');
const foodService = require('./food.service');
const { notFound, badRequest, forbidden } = require('../utils/response.util');

const SLOTS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT'];
const FREE_LOGGING_DAYS = 5; // per calendar month (subscription plan limit)

/** Free plan may only log food on 5 distinct days per month. */
async function assertLoggingAllowed(userId, day) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionType: true } });
  if (user && user.subscriptionType !== 'FREE') return;
  const monthStart = new Date(day.getFullYear(), day.getMonth(), 1);
  const monthEnd = new Date(day.getFullYear(), day.getMonth() + 1, 1);
  const days = await prisma.mealLogEntry.groupBy({ by: ['date'], where: { userId, date: { gte: monthStart, lt: monthEnd } } });
  const distinct = new Set(days.map((d) => d.date.toISOString().slice(0, 10)));
  if (distinct.has(day.toISOString().slice(0, 10)) || distinct.size < FREE_LOGGING_DAYS) return;
  throw forbidden(`Free plan allows food logging on ${FREE_LOGGING_DAYS} days per month — upgrade for unlimited tracking`);
}

/** Normalise an arbitrary date input to the day bucket (midnight local). */
function dayBucket(date) {
  const d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) throw badRequest('Invalid date');
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Nutrition for N servings of a food row. */
function scaleFood(food, servings) {
  const factor = (Number(servings) || 1) * (Number(food.servingSizeG || 100) / 100);
  return {
    calories: Math.round(Number(food.calories) * (Number(servings) || 1)),
    proteinG: (Number(food.proteinG) * (Number(servings) || 1)).toFixed(2),
    carbsG: (Number(food.carbsG) * (Number(servings) || 1)).toFixed(2),
    fatG: (Number(food.fatG) * (Number(servings) || 1)).toFixed(2),
    _factor: factor,
  };
}

function scaleRecipe(recipe, servings) {
  const factor = (Number(servings) || 1) / (Number(recipe.servings) || 1);
  return {
    calories: Math.round(Number(recipe.calories) * factor),
    proteinG: (Number(recipe.proteinG) * factor).toFixed(2),
    carbsG: (Number(recipe.carbsG) * factor).toFixed(2),
    fatG: (Number(recipe.fatG) * factor).toFixed(2),
  };
}

/** Add a food or recipe to the diary. */
async function addEntry(userId, { date, slot = 'SNACK', foodId, recipeId, servings = 1, mealName, photoUrl, aiEstimated }) {
  if (!foodId && !recipeId) throw badRequest('foodId or recipeId required');
  if (!SLOTS.includes(slot)) throw badRequest(`Unknown slot. Choose: ${SLOTS.join(', ')}`);
  await assertLoggingAllowed(userId, dayBucket(date));
  let nutrition;
  let name;
  if (foodId) {
    const food = await prisma.food.findUnique({ where: { id: foodId } });
    if (!food) throw notFound('Food not found');
    nutrition = scaleFood(food, servings);
    name = food.name;
    await foodService.bumpUse(foodId);
  } else {
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) throw notFound('Recipe not found');
    nutrition = scaleRecipe(recipe, servings);
    name = recipe.name;
  }
  return prisma.mealLogEntry.create({
    data: {
      userId,
      date: dayBucket(date),
      slot,
      foodId: foodId || null,
      recipeId: recipeId || null,
      servings: String(servings),
      calories: nutrition.calories,
      proteinG: nutrition.proteinG,
      carbsG: nutrition.carbsG,
      fatG: nutrition.fatG,
      mealName: mealName || name,
      photoUrl: photoUrl || null,
      aiEstimated: !!aiEstimated,
    },
    include: { food: true, recipe: true },
  });
}

async function updateEntry(userId, id, data) {
  const entry = await prisma.mealLogEntry.findFirst({ where: { id, userId } });
  if (!entry) throw notFound('Entry not found');
  let recalced = {};
  if (data.servings && entry.foodId) {
    const food = await prisma.food.findUnique({ where: { id: entry.foodId } });
    if (food) recalced = scaleFood(food, data.servings);
  } else if (data.servings && entry.recipeId) {
    const recipe = await prisma.recipe.findUnique({ where: { id: entry.recipeId } });
    if (recipe) recalced = scaleRecipe(recipe, data.servings);
  }
  return prisma.mealLogEntry.update({
    where: { id },
    data: {
      ...(data.slot ? { slot: data.slot } : {}),
      ...(data.mealName !== undefined ? { mealName: data.mealName } : {}),
      ...(data.servings ? { servings: String(data.servings) } : {}),
      ...(recalced.calories ? { calories: recalced.calories, proteinG: recalced.proteinG, carbsG: recalced.carbsG, fatG: recalced.fatG } : {}),
    },
    include: { food: true, recipe: true },
  });
}

async function deleteEntry(userId, id) {
  const entry = await prisma.mealLogEntry.findFirst({ where: { id, userId } });
  if (!entry) throw notFound('Entry not found');
  await prisma.mealLogEntry.delete({ where: { id } });
  return true;
}

/** Whole-day diary grouped by slot. */
async function getDay(userId, date) {
  const day = dayBucket(date);
  const dayEnd = new Date(day.getTime() + 864e5);
  const entries = await prisma.mealLogEntry.findMany({
    where: { userId, date: { gte: day, lt: dayEnd } },
    include: { food: true, recipe: true },
    orderBy: { createdAt: 'asc' },
  });
  const bySlot = Object.fromEntries(SLOTS.map((s) => [s, []]));
  const totals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const e of entries) {
    bySlot[e.slot].push(e);
    totals.calories += e.calories;
    totals.proteinG += Number(e.proteinG);
    totals.carbsG += Number(e.carbsG);
    totals.fatG += Number(e.fatG);
  }
  const goal = await prisma.nutritionGoal.findUnique({ where: { userId } });
  const water = await prisma.waterLog.aggregate({ where: { userId, date: { gte: day, lt: dayEnd } }, _sum: { amountMl: true } });
  return {
    date: day,
    entries: bySlot,
    totals: {
      calories: totals.calories,
      proteinG: +totals.proteinG.toFixed(1),
      carbsG: +totals.carbsG.toFixed(1),
      fatG: +totals.fatG.toFixed(1),
    },
    targets: goal ? {
      calories: goal.calorieTarget,
      proteinG: goal.proteinG,
      carbsG: goal.carbsG,
      fatG: goal.fatG,
      waterMl: goal.waterTargetMl,
      remaining: goal.calorieTarget - totals.calories,
    } : null,
    waterLoggedMl: water._sum.amountMl || 0,
  };
}

/** Copy all entries from a previous day (usually yesterday) into a target day. */
async function copyDay(userId, { fromDate, toDate }) {
  const src = dayBucket(fromDate);
  const dst = dayBucket(toDate || new Date());
  const srcEnd = new Date(src.getTime() + 864e5);
  const entries = await prisma.mealLogEntry.findMany({ where: { userId, date: { gte: src, lt: srcEnd } } });
  if (!entries.length) throw notFound('Nothing to copy for that day');
  await prisma.mealLogEntry.deleteMany({ where: { userId, date: dst } });
  const created = await prisma.mealLogEntry.createMany({
    data: entries.map(({ id, createdAt, food, recipe, ...rest }) => ({ ...rest, date: dst })),
  });
  return { copied: created.count, date: dst };
}

/** Frequently logged items — quick-add "templates". */
async function templates(userId, limit = 20) {
  const entries = await prisma.mealLogEntry.findMany({
    where: { userId, foodId: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: { food: true },
  });
  const count = new Map();
  for (const e of entries) {
    const key = `${e.foodId}|${e.slot}`;
    if (!count.has(key)) count.set(key, { entry: e, n: 0 });
    count.get(key).n += 1;
  }
  return [...count.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map(({ entry, n }) => ({ food: entry.food, slot: entry.slot, servings: Number(entry.servings), timesLogged: n }));
}

/* ---------- Water ---------- */

async function logWater(userId, { date, amountMl }) {
  if (!amountMl || amountMl <= 0) throw badRequest('amountMl must be positive');
  return prisma.waterLog.create({ data: { userId, date: dayBucket(date), amountMl } });
}

async function deleteWater(userId, id) {
  const w = await prisma.waterLog.findFirst({ where: { id, userId } });
  if (!w) throw notFound('Water log not found');
  await prisma.waterLog.delete({ where: { id } });
  return true;
}

/* ---------- Summaries ---------- */

/** Daily totals over a range — for charts. */
async function dailySummary(userId, { from, to }) {
  const start = dayBucket(from);
  const end = dayBucket(to || new Date());
  const entries = await prisma.mealLogEntry.findMany({
    where: { userId, date: { gte: start, lt: new Date(end.getTime() + 864e5) } },
    select: { date: true, calories: true, proteinG: true, carbsG: true, fatG: true },
  });
  const byDay = new Map();
  for (const e of entries) {
    const key = e.date.toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, { date: key, calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
    const d = byDay.get(key);
    d.calories += e.calories;
    d.proteinG += Number(e.proteinG);
    d.carbsG += Number(e.carbsG);
    d.fatG += Number(e.fatG);
  }
  for (const d of byDay.values()) {
    d.proteinG = +d.proteinG.toFixed(1); d.carbsG = +d.carbsG.toFixed(1); d.fatG = +d.fatG.toFixed(1);
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Weekly averages + consistency score. */
async function weeklySummary(userId, { from } = {}) {
  const start = dayBucket(from || new Date(Date.now() - 6 * 864e5));
  const range = [start, new Date(start.getTime() + 7 * 864e5)];
  const [agg, loggedDays, goal] = await Promise.all([
    prisma.mealLogEntry.aggregate({ where: { userId, date: { gte: range[0], lt: range[1] } }, _sum: { calories: true, proteinG: true, carbsG: true, fatG: true }, _count: true }),
    prisma.mealLogEntry.groupBy({ by: ['date'], where: { userId, date: { gte: range[0], lt: range[1] } } }),
    prisma.nutritionGoal.findUnique({ where: { userId } }),
  ]);
  const days = loggedDays.length || 1;
  return {
    from: start,
    daysLogged: loggedDays.length,
    entries: agg._count,
    avgCalories: Math.round((agg._sum.calories || 0) / days),
    avgProteinG: +(Number(agg._sum.proteinG || 0) / days).toFixed(1),
    avgCarbsG: +(Number(agg._sum.carbsG || 0) / days).toFixed(1),
    avgFatG: +(Number(agg._sum.fatG || 0) / days).toFixed(1),
    targetCalories: goal?.calorieTarget ?? null,
  };
}

/** Adherence: % of logged days within ±10% of calorie target. */
async function adherence(userId, { days = 30 } = {}) {
  const start = new Date(Date.now() - days * 864e5);
  const summary = await dailySummary(userId, { from: start });
  const goal = await prisma.nutritionGoal.findUnique({ where: { userId } });
  if (!goal) return { daysLogged: summary.length, daysTarget: null, adherencePct: null };
  const hit = summary.filter((d) => Math.abs(d.calories - goal.calorieTarget) <= goal.calorieTarget * 0.1).length;
  return {
    daysLogged: summary.length,
    daysTarget: days,
    hitTarget: hit,
    adherencePct: summary.length ? Math.round((hit / summary.length) * 100) : 0,
  };
}

/** CSV export of the diary for a range. */
async function exportCsv(userId, { from, to }) {
  const start = dayBucket(from || new Date(Date.now() - 30 * 864e5));
  const end = dayBucket(to || new Date());
  const entries = await prisma.mealLogEntry.findMany({
    where: { userId, date: { gte: start, lt: new Date(end.getTime() + 864e5) } },
    include: { food: true, recipe: true },
    orderBy: { date: 'asc' },
  });
  const header = 'date,slot,item,servings,calories,protein_g,carbs_g,fat_g';
  const lines = entries.map((e) => [
    e.date.toISOString().slice(0, 10),
    e.slot,
    `"${(e.food?.name || e.recipe?.name || e.mealName || '').replace(/"/g, '""')}"`,
    Number(e.servings),
    e.calories,
    e.proteinG,
    e.carbsG,
    e.fatG,
  ].join(','));
  return [header, ...lines].join('\n');
}

module.exports = { addEntry, updateEntry, deleteEntry, getDay, copyDay, templates, logWater, deleteWater, dailySummary, weeklySummary, adherence, exportCsv, SLOTS };
