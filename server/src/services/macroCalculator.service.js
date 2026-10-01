/**
 * Macro calculator service — preset management, custom splits, cycling.
 */
const prisma = require('../lib/prisma');
const macrosUtil = require('../utils/macros.util');
const { notFound, badRequest } = require('../utils/response.util');

const PRESETS = Object.keys(macrosUtil.MACRO_PRESETS);

async function getGoal(userId) {
  const goal = await prisma.nutritionGoal.findUnique({ where: { userId } });
  if (!goal) throw notFound('No nutrition goal yet — run the calculator first');
  return goal;
}

/** Apply a named preset (WEIGHT_LOSS, KETO...) to the current calorie target. */
async function applyPreset(userId, preset) {
  if (!PRESETS.includes(preset)) throw badRequest(`Unknown preset. Choose: ${PRESETS.join(', ')}`);
  const goal = await getGoal(userId);
  const macros = macrosUtil.macrosFromPercent(goal.calorieTarget, macrosUtil.presetFor(preset));
  return prisma.nutritionGoal.update({
    where: { userId },
    data: { preset, proteinG: macros.protein, carbsG: macros.carbs, fatG: macros.fat },
  });
}

/** Custom percentages or absolute grams. */
async function setCustom(userId, { proteinPct, carbPct, fatPct, proteinG, carbsG, fatG }) {
  const goal = await getGoal(userId);
  let macros;
  if (proteinG || carbsG || fatG) {
    macros = { protein: proteinG || goal.proteinG, carbs: carbsG || goal.carbsG, fat: fatG || goal.fatG };
  } else {
    if (proteinPct + carbPct + fatPct !== 100) throw badRequest('Percentages must sum to 100');
    macros = macrosUtil.macrosFromPercent(goal.calorieTarget, { proteinPct, carbPct, fatPct });
  }
  return prisma.nutritionGoal.update({ where: { userId }, data: { preset: 'CUSTOM', ...macros } });
}

/** Calorie cycling: different targets for workout vs rest days. */
async function setCalorieCycling(userId, { enabled, workoutDay, restDay }) {
  const goal = await getGoal(userId);
  if (!enabled) return prisma.nutritionGoal.update({ where: { userId }, data: { calorieCycling: {} } });
  if (!workoutDay?.calories || !restDay?.calories) throw badRequest('workoutDay.calories and restDay.calories required');
  return prisma.nutritionGoal.update({
    where: { userId },
    data: { calorieCycling: { enabled: true, workoutDay, restDay } },
  });
}

/** Today's effective target, honoring cycling + scheduled workout status. */
async function effectiveTargetToday(userId) {
  const goal = await getGoal(userId);
  const cycling = goal.calorieCycling || {};
  if (!cycling.enabled) return { calories: goal.calorieTarget, protein: goal.proteinG, carbs: goal.carbsG, fat: goal.fatG, mode: 'FLAT' };
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const hasWorkout = await prisma.scheduledItem.findFirst({ where: { userId, date: { gte: dayStart }, activityType: 'WORKOUT', status: { in: ['PLANNED', 'COMPLETED'] } } });
  const pick = hasWorkout ? cycling.workoutDay : cycling.restDay;
  return { ...pick, mode: hasWorkout ? 'WORKOUT_DAY' : 'REST_DAY' };
}

module.exports = { getGoal, applyPreset, setCustom, setCalorieCycling, effectiveTargetToday, PRESETS };
