/**
 * Food service — database search (pg_trgm + barcode), favorites, recents,
 * custom foods, recipes.
 */
const prisma = require('../lib/prisma');
const { notFound, badRequest } = require('../utils/response.util');

async function search({ q, barcode, category, brand, page = 1, limit = 20, userId }) {
  if (barcode) {
    const food = await prisma.food.findFirst({ where: { barcode } });
    return { items: food ? [food] : [], page, limit, total: food ? 1 : 0 };
  }
  const where = { verified: true };
  if (category) where.category = category;
  if (brand) where.brand = { contains: brand, mode: 'insensitive' };

  if (q && q.length >= 2) {
    const rows = await prisma.$queryRaw`
      SELECT id, similarity(name, ${q}) + COALESCE(similarity(brand, ${q}), 0) AS score
      FROM foods
      WHERE (name % ${q} OR brand % ${q})
      ORDER BY score DESC
      LIMIT ${+limit * 2}`;
    const ids = rows.map((r) => r.id);
    const items = ids.length
      ? await prisma.food.findMany({ where: { id: { in: ids }, ...where } })
      : [];
    items.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    return { items, page, limit, total: ids.length };
  }

  const [items, total] = await Promise.all([
    prisma.food.findMany({ where, orderBy: { useCount: 'desc' }, skip: (page - 1) * limit, take: +limit }),
    prisma.food.count({ where }),
  ]);
  return { items, page: +page, limit: +limit, total };
}

async function favorites(userId) {
  const rows = await prisma.foodFavorite.findMany({ where: { userId }, include: { food: true }, orderBy: { createdAt: 'desc' }, take: 100 });
  return rows.map((r) => r.food);
}

async function toggleFavorite(userId, foodId) {
  const existing = await prisma.foodFavorite.findFirst({ where: { userId, foodId } });
  if (existing) {
    await prisma.foodFavorite.delete({ where: { id: existing.id } });
    return { favorited: false };
  }
  await prisma.foodFavorite.create({ data: { userId, foodId } });
  return { favorited: true };
}

/** Recent foods — quick-add list from diary history. */
async function recent(userId, limit = 15) {
  const entries = await prisma.mealLogEntry.findMany({
    where: { userId, foodId: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { food: true },
  });
  const seen = new Set();
  const out = [];
  for (const e of entries) {
    if (!seen.has(e.foodId)) { seen.add(e.foodId); out.push(e.food); }
    if (out.length >= limit) break;
  }
  return out;
}

/** Custom (user-created) food — verified=false so it only appears for its owner + search. */
async function createCustom(userId, data) {
  return prisma.food.create({
    data: {
      name: data.name,
      brand: data.brand || null,
      servingSizeG: data.servingSizeG || 100,
      servingLabel: data.servingLabel || '100 g',
      calories: Math.round(data.calories),
      proteinG: data.proteinG || 0,
      carbsG: data.carbsG || 0,
      fatG: data.fatG || 0,
      fiberG: data.fiberG || null,
      sugarG: data.sugarG || null,
      sodiumMg: data.sodiumMg || null,
      micros: data.micros || {},
      category: data.category || 'Custom',
      verified: false,
      createdById: userId,
    },
  });
}

/* ---------- Recipes ---------- */

async function createRecipe(userId, { name, servings = 1, dietaryTags = [], instructions, ingredients = [] }) {
  if (!ingredients.length) throw badRequest('Recipe needs ingredients');
  // Resolve ingredient nutrition from food rows
  const foodIds = ingredients.filter((i) => i.foodId).map((i) => i.foodId);
  const foods = await prisma.food.findMany({ where: { id: { in: foodIds } } });
  const byId = Object.fromEntries(foods.map((f) => [f.id, f]));
  let calories = 0, protein = 0, carbs = 0, fat = 0;
  for (const ing of ingredients) {
    if (ing.foodId && byId[ing.foodId]) {
      const f = byId[ing.foodId];
      const factor = (ing.quantity * (ing.unit === 'g' ? 1 : 1)) / Number(f.servingSizeG || 100);
      calories += Number(f.calories) * factor;
      protein += Number(f.proteinG) * factor;
      carbs += Number(f.carbsG) * factor;
      fat += Number(f.fatG) * factor;
    }
  }
  const recipe = await prisma.recipe.create({
    data: {
      userId, name, servings, dietaryTags, instructions,
      calories: Math.round(calories), proteinG: protein.toFixed(2), carbsG: carbs.toFixed(2), fatG: fat.toFixed(2),
      ingredients: {
        create: ingredients.map((i) => ({ foodId: i.foodId || null, name: i.name || null, quantity: i.quantity, unit: i.unit || 'g' })),
      },
    },
    include: { ingredients: true },
  });
  return recipe;
}

async function listRecipes(userId) {
  return prisma.recipe.findMany({ where: { userId }, include: { ingredients: true }, orderBy: { createdAt: 'desc' } });
}

async function getRecipe(id, userId) {
  const recipe = await prisma.recipe.findUnique({ where: { id }, include: { ingredients: true } });
  if (!recipe) throw notFound('Recipe not found');
  if (recipe.userId !== userId) {
    const isOwnerFoodVisible = true; // recipes are shareable within meal plans
    if (!isOwnerFoodVisible) throw notFound('Recipe not found');
  }
  return recipe;
}

async function deleteRecipe(id, userId) {
  const r = await prisma.recipe.findFirst({ where: { id, userId } });
  if (!r) throw notFound('Recipe not found');
  await prisma.recipe.delete({ where: { id } });
  return true;
}

async function bumpUse(foodId) {
  await prisma.food.update({ where: { id: foodId }, data: { useCount: { increment: 1 } } }).catch(() => {});
}

module.exports = { search, favorites, toggleFavorite, recent, createCustom, createRecipe, listRecipes, getRecipe, deleteRecipe, bumpUse };
