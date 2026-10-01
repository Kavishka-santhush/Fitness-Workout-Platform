/**
 * Nutrition service — goal calculator wiring, meal plans, plan follows,
 * grocery list generation + PDF.
 */
const prisma = require('../lib/prisma');
const calorieCalc = require('./calorieCalculator.service');
const macroCalc = require('./macroCalculator.service');
const { notFound, badRequest, conflict, forbidden } = require('../utils/response.util');

/* ---------- Goals / calculator ---------- */

const getGoal = (userId) => macroCalc.getGoal(userId);
const effectiveTargetToday = (userId) => macroCalc.effectiveTargetToday(userId);

/** Pure calculator (no auth persistence) — powers the interactive UI widget. */
function calculate(params) {
  return calorieCalc.calculate(params);
}

/** Recalculate + persist from the user's current profile. */
const recalculate = (userId, opts) => calorieCalc.ensureNutritionGoal(userId, opts);

const applyPreset = (userId, preset) => macroCalc.applyPreset(userId, preset);
const setCustomMacros = (userId, data) => macroCalc.setCustom(userId, data);
const setCalorieCycling = (userId, data) => macroCalc.setCalorieCycling(userId, data);

async function setWaterTarget(userId, waterTargetMl) {
  const goal = await macroCalc.getGoal(userId);
  return prisma.nutritionGoal.update({ where: { userId }, data: { waterTargetMl } });
}

/* ---------- Meal plans ---------- */

async function createPlan(userId, data) {
  if ((data.meals || []).length === 0) throw badRequest('Plan needs at least one meal');
  const plan = await prisma.mealPlan.create({
    data: {
      creatorId: userId,
      name: data.name,
      goal: data.goal || 'GENERAL_FITNESS',
      dietary: data.dietary || 'STANDARD',
      frequency: data.frequency || 'WEEKLY',
      caloriesPerDay: data.caloriesPerDay || null,
      proteinG: data.proteinG || null,
      carbsG: data.carbsG || null,
      fatG: data.fatG || null,
      allergies: data.allergies || [],
      cuisine: data.cuisine || null,
      isAiGenerated: !!data.isAiGenerated,
      dayConfig: data.dayConfig || {},
      priceCents: data.priceCents || 0,
      meals: {
        create: (data.meals || []).map((m) => ({
          slot: m.slot,
          dayIndex: m.dayIndex || 1,
          foodId: m.foodId || null,
          recipeId: m.recipeId || null,
          label: m.label || null,
          servings: String(m.servings || 1),
          calories: m.calories || 0,
          proteinG: m.proteinG || 0,
          carbsG: m.carbsG || 0,
          fatG: m.fatG || 0,
        })),
      },
    },
    include: { meals: true },
  });
  return plan;
}

async function updatePlan(userId, id, data) {
  const plan = await prisma.mealPlan.findFirst({ where: { id, creatorId: userId } });
  if (!plan) throw notFound('Plan not found');
  if (data.meals) {
    await prisma.planMeal.deleteMany({ where: { planId: id } });
    await prisma.planMeal.createMany({
      data: data.meals.map((m) => ({
        planId: id, slot: m.slot, dayIndex: m.dayIndex || 1,
        foodId: m.foodId || null, recipeId: m.recipeId || null, label: m.label || null,
        servings: String(m.servings || 1), calories: m.calories || 0,
        proteinG: m.proteinG || 0, carbsG: m.carbsG || 0, fatG: m.fatG || 0,
      })),
    });
  }
  const scalarKeys = ['name', 'goal', 'dietary', 'frequency', 'caloriesPerDay', 'proteinG', 'carbsG', 'fatG', 'allergies', 'cuisine', 'dayConfig', 'published', 'priceCents'];
  const patch = Object.fromEntries(Object.entries(data).filter(([k]) => scalarKeys.includes(k)));
  return prisma.mealPlan.update({ where: { id }, data: patch, include: { meals: true } });
}

async function deletePlan(userId, id) {
  const plan = await prisma.mealPlan.findFirst({ where: { id, creatorId: userId } });
  if (!plan) throw notFound('Plan not found');
  await prisma.mealPlan.delete({ where: { id } });
  return true;
}

async function listMyPlans(userId) {
  return prisma.mealPlan.findMany({
    where: { creatorId: userId },
    include: { meals: true, _count: { select: { followers: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

/** Published plans marketplace (own drafts excluded). */
async function browsePlans(userId, { q, dietary, goal, page = 1, limit = 20 }) {
  const where = { published: true };
  if (dietary) where.dietary = dietary;
  if (goal) where.goal = goal;
  if (q) where.name = { contains: q, mode: 'insensitive' };
  const [items, total] = await Promise.all([
    prisma.mealPlan.findMany({
      where,
      include: { creator: { select: { id: true, displayName: true, avatarUrl: true } }, _count: { select: { followers: true } } },
      orderBy: [{ followers: { _count: 'desc' } }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: +limit,
    }),
    prisma.mealPlan.count({ where }),
  ]);
  const follows = await prisma.mealPlanFollow.findMany({ where: { userId, planId: { in: items.map((p) => p.id) } }, select: { planId: true } });
  const following = new Set(follows.map((f) => f.planId));
  return { items: items.map((p) => ({ ...p, isFollowed: following.has(p.id) })), page: +page, limit: +limit, total };
}

async function getPlan(userId, id) {
  const plan = await prisma.mealPlan.findUnique({
    where: { id },
    include: { meals: true, creator: { select: { id: true, displayName: true, avatarUrl: true } }, _count: { select: { followers: true } } },
  });
  if (!plan) throw notFound('Plan not found');
  const follow = await prisma.mealPlanFollow.findFirst({ where: { userId, planId: id } });
  return { ...plan, isFollowed: !!follow };
}

/** Start following a plan (free) — power-users can auto-log its meals. */
async function followPlan(userId, planId) {
  const plan = await prisma.mealPlan.findUnique({ where: { id: planId } });
  if (!plan) throw notFound('Plan not found');
  if (!plan.published && plan.creatorId !== userId) throw forbidden('Plan not available');
  const existing = await prisma.mealPlanFollow.findFirst({ where: { userId, planId } });
  if (existing) throw conflict('Already following this plan');
  await prisma.mealPlanFollow.create({ data: { userId, planId } });
  return { following: true };
}

async function unfollowPlan(userId, planId) {
  const existing = await prisma.mealPlanFollow.findFirst({ where: { userId, planId } });
  if (!existing) throw notFound('Not following this plan');
  await prisma.mealPlanFollow.delete({ where: { id: existing.id } });
  return { following: false };
}

/** Today's meals for the followed plan (cycles by dayIndex over frequency). */
async function todaysPlan(userId, date) {
  const follow = await prisma.mealPlanFollow.findFirst({
    where: { userId },
    include: { plan: { include: { meals: true } } },
    orderBy: { createdAt: 'desc' },
  });
  if (!follow) throw notFound('Not following a meal plan');
  const d = date ? new Date(date) : new Date();
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysIn = Math.floor((dayStart - new Date(follow.startDate)) / 864e5) + 1;
  const cycle = follow.plan.frequency === 'WEEKLY' ? 7 : 1;
  const dayIndex = ((Math.max(daysIn, 1) - 1) % cycle) + 1;
  const meals = follow.plan.meals.filter((m) => m.dayIndex === dayIndex);
  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + m.calories,
    proteinG: acc.proteinG + Number(m.proteinG),
    carbsG: acc.carbsG + Number(m.carbsG),
    fatG: acc.fatG + Number(m.fatG),
  }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  return { plan: { id: follow.plan.id, name: follow.plan.name }, dayIndex, meals, totals };
}

/** Log one of today's plan meals into the diary. */
async function logPlanMeal(userId, planMealId) {
  const pm = await prisma.planMeal.findUnique({ where: { id: planMealId } });
  if (!pm) throw notFound('Plan meal not found');
  const mealService = require('./meal.service');
  return mealService.addEntry(userId, {
    slot: pm.slot,
    foodId: pm.foodId || undefined,
    recipeId: pm.recipeId || undefined,
    servings: Number(pm.servings) || 1,
    mealName: pm.label || undefined,
  });
}

/* ---------- Grocery lists ---------- */

/** Build a grocery list from a plan's ingredients (aggregated by name). */
async function generateGroceryList(userId, { planId, weeks = 1 }) {
  let meals;
  if (planId) {
    const plan = await prisma.mealPlan.findUnique({ where: { id: planId }, include: { meals: true } });
    if (!plan) throw notFound('Plan not found');
    meals = plan.meals;
  } else {
    const follow = await prisma.mealPlanFollow.findFirst({ where: { userId }, include: { plan: { include: { meals: true } } } });
    if (!follow) throw badRequest('Provide planId or follow a plan first');
    meals = follow.plan.meals;
  }
  const foodIds = meals.map((m) => m.foodId).filter(Boolean);
  const recipeIds = meals.map((m) => m.recipeId).filter(Boolean);
  const [foods, recipes] = await Promise.all([
    prisma.food.findMany({ where: { id: { in: foodIds } } }),
    prisma.recipe.findMany({ where: { id: { in: recipeIds } }, include: { ingredients: true } }),
  ]);
  const agg = new Map();
  const add = (name, qty, unit, category) => {
    const key = name.toLowerCase();
    if (!agg.has(key)) agg.set(key, { name, quantity: 0, unit, category: category || 'Other' });
    agg.get(key).quantity += qty;
  };
  for (let w = 0; w < weeks; w += 1) {
    for (const m of meals) {
      if (m.foodId) {
        const f = foods.find((x) => x.id === m.foodId);
        if (f) add(f.name, Number(m.servings) * Number(f.servingSizeG || 100), 'g', f.category);
      }
      if (m.recipeId) {
        const r = recipes.find((x) => x.id === m.recipeId);
        for (const ing of r?.ingredients || []) {
          const factor = (Number(m.servings) || 1) / (Number(r.servings) || 1);
          if (ing.name) add(ing.name, Number(ing.quantity) * factor, ing.unit, null);
          else if (ing.foodId) {
            const f = foods.find((x) => x.id === ing.foodId) || recipes.flatMap((rr) => rr.ingredients).find((x) => x.foodId === ing.foodId);
            if (f) add(f.name, Number(ing.quantity) * factor, ing.unit, f.category);
          }
        }
      }
    }
  }
  const items = [...agg.values()].map((i) => ({ ...i, quantity: +i.quantity.toFixed(2) }));
  return prisma.groceryList.create({ data: { userId, planId: planId || null, items } });
}

async function listGroceryLists(userId) {
  return prisma.groceryList.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
}

async function getGroceryList(userId, id) {
  const list = await prisma.groceryList.findFirst({ where: { id, userId } });
  if (!list) throw notFound('Grocery list not found');
  return list;
}

async function updateGroceryList(userId, id, items) {
  const list = await prisma.groceryList.findFirst({ where: { id, userId } });
  if (!list) throw notFound('Grocery list not found');
  return prisma.groceryList.update({ where: { id }, data: { items } });
}

/** Render grocery list to PDF (stored under uploads via pdf util). */
async function groceryListPdf(userId, id) {
  const list = await getGroceryList(userId, id);
  const { generatePdf } = require('../utils/pdf.util');
  const rows = (list.items || []).map((i) =>
    `<tr><td>${i.name}</td><td>${i.quantity} ${i.unit || ''}</td><td>${i.category || ''}</td></tr>`).join('');
  const html = `<h1>Grocery List</h1><p>Generated ${new Date().toDateString()}</p>
    <table><thead><tr><th>Item</th><th>Quantity</th><th>Category</th></tr></thead><tbody>${rows}</tbody></table>`;
  return generatePdf(html, { filename: `grocery-${id}.pdf` });
}

module.exports = {
  getGoal, effectiveTargetToday, calculate, recalculate, applyPreset, setCustomMacros, setCalorieCycling, setWaterTarget,
  createPlan, updatePlan, deletePlan, listMyPlans, browsePlans, getPlan, followPlan, unfollowPlan, todaysPlan, logPlanMeal,
  generateGroceryList, listGroceryLists, getGroceryList, updateGroceryList, groceryListPdf,
};
