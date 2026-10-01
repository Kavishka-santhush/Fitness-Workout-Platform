/**
 * Calorie & energy expenditure calculations.
 * Pure functions — used by calorieCalculator.service and workout/nutrition services.
 */

const ACTIVITY_LEVEL_MULTIPLIER = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

const GOAL_CALORIE_ADJUSTMENT = {
  WEIGHT_LOSS: -500,
  MUSCLE_GAIN: 300,
  ENDURANCE: 100,
  FLEXIBILITY: 0,
  GENERAL_FITNESS: 0,
  ATHLETIC_PERFORMANCE: 250,
  MAINTENANCE: 0,
};

/** Mifflin-St Jeor BMR (kcal/day). weight kg, height cm, age years, sex M/F. */
const calcBMR = ({ weight, height, age, sex }) => {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(sex === 'F' ? base - 161 : base + 5);
};

/** TDEE from BMR + activity multiplier. */
const calcTDEE = ({ weight, height, age, sex, activityLevel = 'MODERATE' }) => {
  const bmr = calcBMR({ weight, height, age, sex });
  const multiplier = ACTIVITY_LEVEL_MULTIPLIER[activityLevel] || 1.55;
  return Math.round(bmr * multiplier);
};

/** Daily calorie target from TDEE + goal adjustment. */
const calcCalorieTarget = (params) => {
  const tdee = calcTDEE(params);
  const adjustment = GOAL_CALORIE_ADJUSTMENT[params.goal] ?? 0;
  return { tdee, target: Math.max(1200, tdee + adjustment), adjustment };
};

/**
 * Calories burned during resistance training:
 * kcal ≈ MET equivalent intensity × bodyweight(kg) × duration(hours)
 * Conservative MET by difficulty: BEGINNER 3.5, INTERMEDIATE 5.0, ADVANCED 6.5, ATHLETE 8.0
 */
const MET_BY_DIFFICULTY = { BEGINNER: 3.5, INTERMEDIATE: 5.0, ADVANCED: 6.5, ATHLETE: 8.0 };

const calcResistanceCalories = ({ durationMinutes, weight = 70, difficulty = 'INTERMEDIATE' }) => {
  const met = MET_BY_DIFFICULTY[difficulty] ?? 5.0;
  return Math.round((met * weight * durationMinutes) / 60);
};

/** MET-based cardio calorie burn. */
const calcCardioCalories = ({ met, durationMinutes, weight = 70 }) =>
  Math.max(0, Math.round((met * 3.5 * weight * durationMinutes) / 200));

/** Common activity MET table. */
const CARDIO_METS = {
  RUNNING: 9.8, CYCLING: 7.5, SWIMMING: 8.0, WALKING: 3.5, ROWING: 7.0,
  ELLIPTICAL: 5.0, JUMP_ROPE: 11.0, STAIR_CLIMB: 8.5, HIKING: 6.0, CUSTOM: 6.0,
};

/** Estimate workout calories from exercise configurations (sets/reps/duration) + user weight. */
const estimateWorkoutCalories = ({ exercises = [], durationMinutes, weight = 70, difficulty }) => {
  if (durationMinutes) return calcResistanceCalories({ durationMinutes, weight, difficulty });
  let totalSets = 0;
  for (const ex of exercises) {
    const sets = ex.sets || 3;
    totalSets += sets;
  }
  // ~2.2 kcal per set for average lifter scaled by weight
  return Math.round(totalSets * 2.2 * (weight / 70));
};

/** Navy body fat estimation (US Naval method), measurements in cm. */
const calcNavyBodyFat = ({ sex, waist, neck, height, hips }) => {
  if (sex === 'M') {
    if (!waist || !neck || !height) return null;
    const bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    return bf > 0 ? Math.round(bf * 10) / 10 : null;
  }
  if (!waist || !hips || !neck || !height) return null;
  const bf = 495 / (1.082 - 0.24977 * Math.log10(waist + hips - neck) + 0.13456 * Math.log10(height)) - 450;
  return bf > 0 ? Math.round(bf * 10) / 10 : null;
};

module.exports = {
  ACTIVITY_LEVEL_MULTIPLIER,
  GOAL_CALORIE_ADJUSTMENT,
  CARDIO_METS,
  calcBMR,
  calcTDEE,
  calcCalorieTarget,
  calcResistanceCalories,
  calcCardioCalories,
  estimateWorkoutCalories,
  calcNavyBodyFat,
};
