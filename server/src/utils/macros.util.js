/**
 * Macronutrient split presets and calculations.
 */

const MACRO_PRESETS = {
  WEIGHT_LOSS: { proteinPct: 40, carbPct: 30, fatPct: 30 },
  MUSCLE_GAIN: { proteinPct: 30, carbPct: 40, fatPct: 30 },
  BALANCED: { proteinPct: 30, carbPct: 40, fatPct: 30 },
  KETO: { proteinPct: 25, carbPct: 5, fatPct: 70 },
  PALEO: { proteinPct: 35, carbPct: 30, fatPct: 35 },
  VEGAN: { proteinPct: 25, carbPct: 50, fatPct: 25 },
  CUSTOM: { proteinPct: 30, carbPct: 40, fatPct: 30 },
};

/** Convert calorie target + percentage split into grams (protein 4, carbs 4, fat 9 kcal/g). */
const macrosFromPercent = (calories, { proteinPct, carbPct, fatPct }) => ({
  protein: Math.round((calories * proteinPct) / 100 / 4),
  carbs: Math.round((calories * carbPct) / 100 / 4),
  fat: Math.round((calories * fatPct) / 100 / 9),
  proteinPct,
  carbPct,
  fatPct,
});

/** Grams-per-kg bodyweight based targets (alternative approach). */
const macrosFromBodyweight = (weightKg, goal) => {
  const proteinPerKg = goal === 'MUSCLE_GAIN' ? 2.0 : goal === 'WEIGHT_LOSS' ? 2.2 : 1.6;
  const fatPerKg = 0.9;
  return { protein: Math.round(weightKg * proteinPerKg), fat: Math.round(weightKg * fatPerKg) };
};

const presetFor = (name) => MACRO_PRESETS[name] || MACRO_PRESETS.BALANCED;

module.exports = { MACRO_PRESETS, macrosFromPercent, macrosFromBodyweight, presetFor };
