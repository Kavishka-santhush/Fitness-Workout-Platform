/**
 * Calorie calculator service — TDEE/target persistence and live re-computation.
 */
const prisma = require('../lib/prisma');
const calories = require('../utils/calories.util');
const macrosUtil = require('../utils/macros.util');
const { notFound } = require('../utils/response.util');

function userToParams(user) {
  const age = user.birthDate ? Math.floor((Date.now() - new Date(user.birthDate).getTime()) / 365.25 / 864e5) : 30;
  return {
    weight: Number(user.weightKg || 70),
    height: Number(user.heightCm || 175),
    age,
    sex: user.sex === 'FEMALE' ? 'F' : 'M',
    activityLevel: user.activityLevel || 'MODERATE',
    goal: user.goal || 'GENERAL_FITNESS',
  };
}

/** Pure calculation endpoint (no persistence). */
function calculate(params) {
  const { tdee, target, adjustment } = calories.calcCalorieTarget(params);
  const preset = macrosUtil.presetFor(params.goalPreset || params.goal);
  const macros = macrosUtil.macrosFromPercent(target, preset);
  return { bmr: calories.calcBMR(params), tdee, target, adjustment, ...macros };
}

/** (Re)compute and persist the user's NutritionGoal from current body stats. */
async function ensureNutritionGoal(userId, { preset } = {}) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User not found');
  const params = userToParams(user);
  const { tdee, target } = calories.calcCalorieTarget(params);
  const macroPreset = macrosUtil.presetFor(preset || user.goal);
  const macros = macrosUtil.macrosFromPercent(target, macroPreset);
  return prisma.nutritionGoal.upsert({
    where: { userId },
    create: { userId, calorieTarget: target, tdee, proteinG: macros.protein, carbsG: macros.carbs, fatG: macros.fat, preset: preset || user.goal || 'BALANCED' },
    update: { calorieTarget: target, tdee, proteinG: macros.protein, carbsG: macros.carbs, fatG: macros.fat, ...(preset ? { preset } : {}) },
  });
}

/** Net calories for the day: consumed - (food burned by sessions + cardio + wearable active). */
async function netCalories(userId, date = new Date()) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart.getTime() + 864e5);
  const [consumed, workouts, cardio, wearable] = await Promise.all([
    prisma.mealLogEntry.aggregate({ where: { userId, date: { gte: dayStart, lt: dayEnd } }, _sum: { calories: true } }),
    prisma.workoutSession.aggregate({ where: { userId, startedAt: { gte: dayStart, lt: dayEnd } }, _sum: { caloriesBurned: true } }),
    prisma.cardioSession.aggregate({ where: { userId, date: { gte: dayStart, lt: dayEnd } }, _sum: { calories: true } }),
    prisma.wearableDataPoint.aggregate({ where: { userId, type: 'ACTIVE_CALORIES', date: { gte: dayStart, lt: dayEnd } }, _sum: { value: true } }),
  ]);
  const burned = (workouts._sum.caloriesBurned || 0) + (cardio._sum.calories || 0) + Number(wearable._sum.value || 0);
  const intake = consumed._sum.calories || 0;
  const goal = await prisma.nutritionGoal.findUnique({ where: { userId } });
  return {
    intake,
    burned,
    net: intake - burned,
    target: goal?.calorieTarget ?? null,
    remaining: goal ? goal.calorieTarget - intake : null,
    deficitOrSurplus: goal ? intake - goal.calorieTarget : null,
  };
}

module.exports = { calculate, ensureNutritionGoal, netCalories, userToParams };
