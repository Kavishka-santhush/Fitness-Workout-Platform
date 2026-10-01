// Training programs (10+) composed from workout templates that reference
// exercise names resolved to ids by the seeder.
// Template exercise tuple: [name, sets, reps, restSec]
const TEMPLATES = {
  PUSH_DAY: {
    name: 'Push Day',
    exercises: [['Barbell Bench Press', 4, '6-8', 150], ['Incline Dumbbell Press', 3, '8-12', 90], ['Overhead Press', 4, '6-10', 120], ['Lateral Raise', 3, '12-15', 60], ['Tricep Pushdown', 3, '10-12', 60], ['Diamond Push-Up', 3, 'AMRAP', 60]],
  },
  PULL_DAY: {
    name: 'Pull Day',
    exercises: [['Deadlift', 4, '5', 180], ['Conventional Pull-Up', 4, '6-10', 120], ['Bent Over Barbell Row', 4, '8-10', 120], ['Face Pull', 3, '15', 60], ['Barbell Curl', 3, '10', 60], ['Hammer Curl', 3, '12', 60]],
  },
  LEG_DAY: {
    name: 'Leg Day',
    exercises: [['Back Squat', 5, '5', 180], ['Romanian Deadlift', 3, '8-10', 120], ['Leg Press', 3, '10-12', 90], ['Walking Lunge', 3, '12/leg', 90], ['Lying Leg Curl', 3, '12', 60], ['Standing Calf Raise', 4, '15', 45]],
  },
  FULL_BODY: {
    name: 'Full Body',
    exercises: [['Goblet Squat', 3, '10', 90], ['Dumbbell Bench Press', 3, '10', 90], ['Seated Cable Row', 3, '12', 60], ['Dumbbell Shoulder Press', 3, '10', 60], ['Plank', 3, '45s', 45]],
  },
  HIIT_METCON: {
    name: 'HIIT Metcon',
    exercises: [['Burpee', 5, '20s', 20], ['Mountain Climber', 5, '30s', 20], ['Jump Rope', 5, '40s', 30], ['Kettlebell Swing', 5, '15', 30]],
  },
  UPPER_POWER: {
    name: 'Upper Power',
    exercises: [['Barbell Bench Press', 5, '3-5', 180], ['Conventional Pull-Up', 5, '3-5', 180], ['Overhead Press', 4, '5', 150], ['Bent Over Barbell Row', 4, '6', 150]],
  },
  LOWER_POWER: {
    name: 'Lower Power',
    exercises: [['Back Squat', 5, '3-5', 210], ['Deadlift', 4, '3-5', 210], ['Front Squat', 3, '6', 150], ['Hip Thrust', 4, '8', 120]],
  },
  CORE_CRUSHER: {
    name: 'Core Crusher',
    exercises: [['Hanging Leg Raise', 3, '12', 60], ['Russian Twist', 3, '20', 45], ['Plank', 3, '60s', 45], ['Cable Crunch', 3, '15', 45], ['Dead Bug', 3, '12', 45]],
  },
  CARDIO_INTERVALS: {
    name: 'Cardio Intervals',
    exercises: [['Treadmill Run', 8, '2min hard / 1min easy', 0]],
  },
  ACTIVE_RECOVERY: {
    name: 'Active Recovery',
    exercises: [['Downward Dog', 1, '60s', 0], ['Cat Cow', 2, '12', 0], ['Pigeon Pose', 2, '45s/side', 0], ['Brisk Walking', 1, '20min', 0]],
  },
};

// Program blueprint: exercises assigned to weekday slots (1=Mon .. 7=Sun).
const PROGRAMS = [
  { name: 'PPL 12-Week Size Surge', programType: 'Muscle Gain', goal: 'MUSCLE_GAIN', difficulty: 'INTERMEDIATE', durationWeeks: 12, daysPerWeek: 6, priceCents: 4999, featured: true, weekly: { 1: 'PUSH_DAY', 2: 'PULL_DAY', 3: 'LEG_DAY', 4: 'UPPER_POWER', 5: 'LOWER_POWER', 6: 'FULL_BODY', 7: null } },
  { name: 'Beginner Total Body 8', programType: 'Beginner', goal: 'GENERAL_FITNESS', difficulty: 'BEGINNER', durationWeeks: 8, daysPerWeek: 3, priceCents: 0, featured: true, weekly: { 1: 'FULL_BODY', 3: 'FULL_BODY', 5: 'FULL_BODY' } },
  { name: 'Fat Shredder HIIT 6', programType: 'Fat Loss', goal: 'WEIGHT_LOSS', difficulty: 'INTERMEDIATE', durationWeeks: 6, daysPerWeek: 5, priceCents: 2999, weekly: { 1: 'HIIT_METCON', 2: 'PUSH_DAY', 3: 'CARDIO_INTERVALS', 4: 'LEG_DAY', 5: 'HIIT_METCON' } },
  { name: 'Strength Base 5/3/1', programType: 'Strength Building', goal: 'ATHLETIC_PERFORMANCE', difficulty: 'ADVANCED', durationWeeks: 4, daysPerWeek: 4, priceCents: 5999, featured: true, weekly: { 1: 'UPPER_POWER', 2: 'LOWER_POWER', 3: 'PUSH_DAY', 4: 'PULL_DAY' } },
  { name: 'Marathon Build 16', programType: 'Endurance', goal: 'ENDURANCE', difficulty: 'ADVANCED', durationWeeks: 16, daysPerWeek: 5, priceCents: 3999, weekly: { 1: 'CARDIO_INTERVALS', 2: 'ACTIVE_RECOVERY', 3: 'CARDIO_INTERVALS', 5: 'CORE_CRUSHER', 6: 'CARDIO_INTERVALS' } },
  { name: 'Home No-Equipment 4', programType: 'Beginner', goal: 'GENERAL_FITNESS', difficulty: 'BEGINNER', durationWeeks: 4, daysPerWeek: 4, priceCents: 0, weekly: { 1: 'FULL_BODY', 2: 'HIIT_METCON', 3: 'CORE_CRUSHER', 4: 'FULL_BODY' } },
  { name: 'Athletic Performance Pro', programType: 'Athletic', goal: 'ATHLETIC_PERFORMANCE', difficulty: 'EXPERT', durationWeeks: 10, daysPerWeek: 5, priceCents: 7999, featured: true, weekly: { 1: 'LOWER_POWER', 2: 'UPPER_POWER', 3: 'HIIT_METCON', 4: 'LEG_DAY', 5: 'PUSH_DAY' } },
  { name: 'Yoga Mobility Flow', programType: 'Yoga', goal: 'FLEXIBILITY', difficulty: 'BEGINNER', durationWeeks: 6, daysPerWeek: 6, priceCents: 1999, weekly: { 1: 'ACTIVE_RECOVERY', 2: 'ACTIVE_RECOVERY', 3: 'ACTIVE_RECOVERY', 4: 'ACTIVE_RECOVERY', 5: 'ACTIVE_RECOVERY', 6: 'CORE_CRUSHER' } },
  { name: 'Bikini Body Sculpt 12', programType: 'Body Transformation', goal: 'WEIGHT_LOSS', difficulty: 'INTERMEDIATE', durationWeeks: 12, daysPerWeek: 5, priceCents: 4499, weekly: { 1: 'LEG_DAY', 2: 'HIIT_METCON', 3: 'FULL_BODY', 4: 'CORE_CRUSHER', 5: 'PULL_DAY' } },
  { name: 'Powerlifting Meet Prep', programType: 'Strength Building', goal: 'ATHLETIC_PERFORMANCE', difficulty: 'EXPERT', durationWeeks: 12, daysPerWeek: 4, priceCents: 8999, weekly: { 1: 'LOWER_POWER', 2: 'UPPER_POWER', 3: 'LEG_DAY', 4: 'PUSH_DAY' } },
  { name: 'Busy Professional 20min', programType: 'Custom', goal: 'GENERAL_FITNESS', difficulty: 'BEGINNER', durationWeeks: 8, daysPerWeek: 3, priceCents: 999, weekly: { 1: 'HIIT_METCON', 3: 'FULL_BODY', 5: 'CORE_CRUSHER' } },
  { name: 'Glute & Legs Focus', programType: 'Muscle Gain', goal: 'MUSCLE_GAIN', difficulty: 'INTERMEDIATE', durationWeeks: 8, daysPerWeek: 4, priceCents: 3499, weekly: { 1: 'LEG_DAY', 2: 'CORE_CRUSHER', 4: 'LOWER_POWER', 5: 'ACTIVE_RECOVERY' } },
];

module.exports = { TEMPLATES, PROGRAMS };
