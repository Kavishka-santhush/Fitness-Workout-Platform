/**
 * General fitness calculations: 1RM estimates, pace, XP/levels, PR detection, BMI.
 */

/** Epley 1RM estimate: weight × (1 + reps/30). Capped at reps<=12 for accuracy. */
const oneRepMaxEpley = (weight, reps) => {
  if (!weight || !reps) return 0;
  if (reps === 1) return Math.round(weight * 10) / 10;
  return Math.round(weight * (1 + Math.min(reps, 12) / 30) * 10) / 10;
};

/** Brzycki 1RM estimate. */
const oneRepMaxBrzycki = (weight, reps) => {
  if (!weight || !reps || reps >= 12) return oneRepMaxEpley(weight, reps);
  return Math.round((weight * 36) / (37 - reps) * 10) / 10;
};

/** Total session volume = Σ(weight × reps) across sets. */
const calcVolume = (sets = []) =>
  Math.round(sets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0));

/** BMI with category. */
const calcBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const bmi = Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10;
  let category = 'NORMAL';
  if (bmi < 18.5) category = 'UNDERWEIGHT';
  else if (bmi >= 30) category = 'OBESE';
  else if (bmi >= 25) category = 'OVERWEIGHT';
  return { bmi, category };
};

/** Pace per km from distance (m) and duration (s). Returns {paceSecPerKm, label}. */
const calcPace = (distanceMeters, durationSeconds) => {
  if (!distanceMeters || !durationSeconds) return null;
  const paceSecPerKm = durationSeconds / (distanceMeters / 1000);
  const min = Math.floor(paceSecPerKm / 60);
  const sec = Math.round(paceSecPerKm % 60);
  return { paceSecPerKm: Math.round(paceSecPerKm), label: `${min}:${String(sec).padStart(2, '0')} /km` };
};

/** Heart rate zones (5-zone) from max HR. */
const hrZones = (maxHr) => {
  const zones = [];
  const bounds = [0.5, 0.6, 0.7, 0.8, 0.9];
  const names = ['Zone 1 — Recovery', 'Zone 2 — Aerobic', 'Zone 3 — Tempo', 'Zone 4 — Threshold', 'Zone 5 — Max'];
  bounds.forEach((lo, i) => {
    const hi = i < 4 ? bounds[i + 1] : 1.0;
    zones.push({ name: names[i], min: Math.round(maxHr * lo), max: Math.round(maxHr * hi) });
  });
  return zones;
};

/* ---------- Gamification: XP & levels ---------- */

const XP_RULES = {
  WORKOUT_COMPLETED: 50,
  SET_LOGGED: 2,
  MEAL_LOGGED: 10,
  PR_ACHIEVED: 100,
  CHALLENGE_COMPLETED: 250,
  PROGRAM_COMPLETED: 500,
  LIVE_CLASS_ATTENDED: 75,
  ACHIEVEMENT_UNLOCKED: 150,
  WEIGHT_LOGGED: 5,
};

const LEVELS = [
  { level: 1, title: 'Beginner', minXp: 0 },
  { level: 2, title: 'Amateur', minXp: 500 },
  { level: 3, title: 'Intermediate', minXp: 1500 },
  { level: 4, title: 'Advanced', minXp: 4000 },
  { level: 5, title: 'Elite', minXp: 9000 },
  { level: 6, title: 'Champion', minXp: 20000 },
];

const levelForXp = (xp = 0) => [...LEVELS].reverse().find((l) => xp >= l.minXp) || LEVELS[0];

/* ---------- Personal records ---------- */

/**
 * Detect PRs for a logged set against previous bests.
 * bests: { maxWeight, maxReps, maxVolume } for the exercise.
 */
const detectPR = (set, bests = {}) => {
  const prs = [];
  const weight = set.weight || 0;
  const reps = set.reps || 0;
  const volume = weight * reps;
  if (weight > (bests.maxWeight || 0)) prs.push({ type: 'MAX_WEIGHT', value: weight });
  if (reps > (bests.maxReps || 0) && weight >= (bests.maxWeight || 0) * 0.85) prs.push({ type: 'MAX_REPS', value: reps });
  if (volume > (bests.maxVolume || 0)) prs.push({ type: 'MAX_VOLUME', value: volume });
  return prs;
};

/** Estimated weekly calories from steps (~0.04 kcal/step/kg scaled). */
const caloriesFromSteps = (steps, weightKg = 70) => Math.round(steps * 0.0004 * weightKg * 10) / 10;

module.exports = {
  oneRepMaxEpley,
  oneRepMaxBrzycki,
  calcVolume,
  calcBMI,
  calcPace,
  hrZones,
  XP_RULES,
  LEVELS,
  levelForXp,
  detectPR,
  caloriesFromSteps,
};
