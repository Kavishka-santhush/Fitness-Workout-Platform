/* eslint-disable no-console */
// ============================================================================
// Fitness & Workout Platform — database seeder
// Run with: npm run seed   (prisma db seed)
// Idempotent: resets seeded tables then repopulates deterministic sample data
// across every domain. 210 exercises, 1000+ foods, 12 programs, roles,
// super admin, trainers, nutritionists, members and realistic activity.
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { exercises } = require('./data/exercises');
const { foods } = require('./data/foods');
const { achievements } = require('./data/achievements');
const { PERMISSIONS, ROLE_GRANTS } = require('./data/permissions');
const { TEMPLATES, PROGRAMS } = require('./data/programs');

// ---- deterministic RNG -----------------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260930);
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const daysAgo = (d) => new Date(Date.now() - d * 86400000);
const daysAhead = (d) => new Date(Date.now() + d * 86400000);

// ---- reset -----------------------------------------------------------------
async function reset() {
  console.log('↺ clearing seeded data...');
  // Children first (most cascade from users, but list/food/analytics are not).
  const ordered = [
    'auditLog', 'analyticsCache', 'leaderboardSnapshot', 'notification', 'deviceToken', 'webPushSubscription',
    'payout', 'payment', 'subscription', 'aiUsageLog', 'aiConversation', 'aiGeneratedPlan', 'wearableDataPoint',
    'contentReport', 'comment', 'kudos', 'groupDiscussion', 'groupMember', 'post', 'block', 'follow',
    'scheduledItem', 'classChatMessage', 'classEnrollment', 'liveClass', 'trainerMessage', 'trainerClient',
    'trainerSessionBooking', 'trainerAvailability', 'trainerProfile', 'challengeTeamMember', 'challengeTeam',
    'challengeMilestone', 'challengeEnrollment', 'challenge', 'corporateOrg', 'userAchievement', 'achievement',
    'certificate', 'groceryList', 'mealPlanFollow', 'planMeal', 'mealPlan', 'nutritionGoal', 'waterLog',
    'mealLogEntry', 'recipeIngredient', 'recipe', 'foodFavorite', 'food', 'bodyStatGoal', 'progressPhoto',
    'bodyStat', 'prHistory', 'personalRecord', 'sessionLoggedSet', 'cardioSession', 'route', 'workoutSession',
    'programReview', 'programEnrollment', 'programWorkout', 'program', 'workoutExercise', 'workout',
    'exerciseRating', 'favoriteExercise', 'exercise', 'rolePermission', 'permission', 'fitnessProfile',
    'platformSetting', 'user',
  ];
  for (const m of ordered) {
    if (prisma[m]) await prisma[m].deleteMany();
  }
  // Reset any Postgres sequences/identities not needed (uuid, so nothing).
  console.log('✓ reset complete');
}

// ---- users -----------------------------------------------------------------
async function seedUsers() {
  console.log('👤 seeding users...');
  const mk = (n, role, sub, extra = {}) => ({
    clerkUserId: `user_seed_${n}`,
    email: `${n}@fitnessplatform.example`,
    username: n,
    displayName: extra.displayName || n,
    firstName: extra.firstName || n,
    lastName: extra.lastName || 'User',
    role, subscriptionType: sub, onboarded: true, units: 'METRIC', sex: extra.sex || 'MALE',
    birthDate: daysAgo(randInt(8000, 13000)), heightCm: randInt(160, 195), weightKg: randInt(58, 105).toFixed(1),
    goal: pick(['WEIGHT_LOSS', 'MUSCLE_GAIN', 'ENDURANCE', 'GENERAL_FITNESS', 'ATHLETIC_PERFORMANCE']),
    experienceLevel: pick(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ATHLETE']),
    activityLevel: pick(['LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']),
    preferredTypes: ['STRENGTH', 'CARDIO'], equipment: ['Dumbbells', 'Barbell'], injuries: [],
    workoutDaysWeek: randInt(2, 6), preferredDuration: randInt(30, 75),
    xpPoints: randInt(0, 12000), level: randInt(1, 24), streakCurrent: randInt(0, 60), streakLongest: randInt(0, 120),
    lastWorkoutAt: daysAgo(randInt(0, 5)),
    ...extra.rest,
  });

  const superAdmin = await prisma.user.create({ data: mk('superadmin', 'SUPER_ADMIN', 'ENTERPRISE', { displayName: 'Sam Owner', firstName: 'Sam', lastName: 'Owner' }) });
  const admin = await prisma.user.create({ data: mk('admin', 'ADMIN', 'PREMIUM', { displayName: 'Alex Admin', firstName: 'Alex' }) });

  const trainerDefs = [
    { n: 'coach_rick', displayName: 'Rick Santos', spec: ['Strength', 'Powerlifting'], rate: 8000 },
    { n: 'coach_mia', displayName: 'Mia Chen', spec: ['HIIT', 'Fat Loss'], rate: 6500 },
    { n: 'coach_lena', displayName: 'Lena Novak', spec: ['Yoga', 'Mobility'], rate: 5500 },
    { n: 'coach_dan', displayName: 'Dan Reeves', spec: ['Bodybuilding'], rate: 7000 },
    { n: 'coach_amara', displayName: 'Amara Okafor', spec: ['Endurance', 'Running'], rate: 6000 },
  ];
  const trainers = [];
  for (const t of trainerDefs) {
    const u = await prisma.user.create({ data: mk(t.n, 'TRAINER', 'TRAINER_PRO', { displayName: t.displayName, firstName: t.displayName.split(' ')[0], sex: pick(['MALE', 'FEMALE']) }) });
    const profile = await prisma.trainerProfile.create({
      data: {
        userId: u.id, bio: `Certified coach specialising in ${t.spec.join(' & ')}.`, specializations: t.spec,
        certifications: [{ name: 'NSCA-CSCS', issuer: 'NSCA' }, { name: 'Precision Nutrition L1', issuer: 'PN' }],
        yearsExperience: randInt(3, 15), languages: ['English', 'Spanish'], hourlyRateCents: t.rate,
        verificationStatus: 'APPROVED', verifiedById: admin.id, ratingAvg: (4 + rand()).toFixed(2) * 1, ratingCount: randInt(10, 200),
        clientCount: randInt(5, 40), sessionsDone: randInt(20, 500), totalEarningsCents: BigInt(randInt(50000, 900000)),
      },
    });
    trainers.push({ user: u, profile });
  }

  const nutritionistDefs = [{ n: 'nutrition_sara', displayName: 'Sara Patel' }, { n: 'nutrition_tom', displayName: 'Tom Alvarez' }];
  const nutritionists = [];
  for (const t of nutritionistDefs) {
    const u = await prisma.user.create({ data: mk(t.n, 'NUTRITIONIST', 'NUTRITION_PRO', { displayName: t.displayName, firstName: t.displayName.split(' ')[0], sex: 'FEMALE' }) });
    nutritionists.push(u);
  }

  const members = [];
  const stages = ['beginner', 'intermediate', 'advanced'];
  for (let i = 0; i < 30; i += 1) {
    const stage = stages[i % stages.length];
    const u = await prisma.user.create({
      data: mk(`member_${stage}_${i}`, 'MEMBER', chance(0.5) ? 'PREMIUM' : 'FREE', { displayName: `Member ${i}`, firstName: `Member${i}` }),
    });
    await prisma.fitnessProfile.create({
      data: { userId: u.id, goal: pick(['WEIGHT_LOSS', 'MUSCLE_GAIN', 'ENDURANCE', 'GENERAL_FITNESS']), experienceLevel: stage.toUpperCase(), workoutDays: randInt(2, 6), sessionDuration: randInt(30, 90), limitations: [] },
    });
    members.push(u);
  }
  console.log(`✓ ${trainers.length} trainers, ${nutritionists.length} nutritionists, ${members.length} members`);
  return { superAdmin, admin, trainers, nutritionists, members };
}

// ---- content: exercises + foods -------------------------------------------
async function seedLibrary() {
  console.log('📚 seeding exercise + food libraries...');
  await prisma.exercise.createMany({ data: exercises.map((e) => ({ ...e })) });
  const exRows = await prisma.exercise.findMany({ select: { id: true, name: true } });
  const exByName = Object.fromEntries(exRows.map((r) => [r.name, r.id]));

  await prisma.food.createMany({ data: foods.map((f) => ({ ...f })) });
  const foodRows = await prisma.food.findMany({ select: { id: true, name: true } });
  console.log(`✓ ${exRows.length} exercises, ${foodRows.length} foods`);
  return { exByName, foodRows, exRows };
}

// ---- roles/permissions + settings -----------------------------------------
async function seedConfig(admin) {
  console.log('🔐 seeding permissions, achievements, settings...');
  const permByName = {};
  for (const p of PERMISSIONS) {
    const row = await prisma.permission.create({ data: p });
    permByName[p.key] = row.id;
  }
  for (const [role, keys] of Object.entries(ROLE_GRANTS)) {
    for (const k of keys) {
      await prisma.rolePermission.create({ data: { role, permissionId: permByName[k] } });
    }
  }
  await prisma.achievement.createMany({ data: achievements });

  const settings = [
    { key: 'commission_pct', value: { value: 20 } },
    { key: 'free_ai_limit', value: { value: 3 } },
    { key: 'free_workout_limit', value: { value: 3 } },
    { key: 'free_storage_mb', value: { value: 500 } },
    { key: 'plans', value: { FREE: 0, PREMIUM: 999, TRAINER_PRO: 2999, NUTRITION_PRO: 1999, ENTERPRISE: 9999 } },
  ];
  await prisma.platformSetting.createMany({ data: settings });
  console.log('✓ config ready');
}

// ---- workouts + programs ---------------------------------------------------
async function seedWorkoutsAndPrograms({ exByName }, { trainers, admin }) {
  console.log('🏋️ seeding workouts + programs...');
  const workoutIdByTemplate = {};
  // Create the shared workout templates as PUBLIC workouts owned by first trainer.
  for (const [key, t] of Object.entries(TEMPLATES)) {
    const owner = pick(trainers).user;
    const w = await prisma.workout.create({
      data: {
        userId: owner.id, name: t.name, description: `${t.name} template`, difficulty: 'INTERMEDIATE',
        visibility: 'PUBLIC', isTemplate: true, estimatedDuration: randInt(35, 75), targetMuscles: [t.name],
        exercises: { create: t.exercises.map(([name, sets, reps, restSec], position) => ({
          exerciseId: exByName[name], position, sets, reps: String(reps), restSec, section: 'MAIN',
        })).filter((e) => e.exerciseId) },
      },
    });
    workoutIdByTemplate[key] = w.id;
  }

  const programs = [];
  for (const def of PROGRAMS) {
    const creator = pick(trainers).user;
    const program = await prisma.program.create({
      data: {
        creatorId: creator.id, name: def.name, description: `Structured ${def.durationWeeks}-week ${def.programType} block.`,
        goal: def.goal, difficulty: def.difficulty, programType: def.programType, durationWeeks: def.durationWeeks,
        daysPerWeek: def.daysPerWeek, priceCents: def.priceCents, status: 'PUBLISHED', featured: def.featured || false,
        enrollmentCount: randInt(3, 400), completionCount: randInt(0, 80), revenueCents: BigInt(def.priceCents * randInt(0, 60)),
        ratingAvg: (4 + rand()).toFixed(2) * 1, ratingCount: randInt(1, 120), salesCount: randInt(0, 60),
      },
    });
    // materialise each week/day
    for (let week = 1; week <= def.durationWeeks; week += 1) {
      for (const [dayKey, tpl] of Object.entries(def.weekly)) {
        if (!tpl) continue;
        await prisma.programWorkout.create({
          data: { programId: program.id, workoutId: workoutIdByTemplate[tpl], week, dayOfWeek: Number(dayKey), isRestDay: false, progressionNote: week === def.durationWeeks ? 'Deload / peak week' : `Week ${week} progression`, position: Number(dayKey) },
        });
      }
    }
    programs.push(program);
  }
  console.log(`✓ ${programs.length} programs published`);
  return programs;
}

// ---- enrollments, sessions, PRs, cardio -----------------------------------
async function seedTraining({ exByName, exRows }, { members, trainers }, programs) {
  console.log('🔥 seeding enrollments + sessions + PRs...');
  const exIds = exRows.map((e) => e.id);
  const strengthEx = exercises.filter((e) => e.exerciseType === 'STRENGTH').map((e) => e.name).filter((n) => exByName[n]);
  const programIds = programs.map((p) => p.id);

  for (const u of members) {
    // enroll in 1-3 programs
    for (const pid of new Set([pick(programIds), ...(chance(0.6) ? [pick(programIds)] : [])])) {
      await prisma.programEnrollment.create({ data: { userId: u.id, programId: pid, status: pick(['ACTIVE', 'ACTIVE', 'COMPLETED', 'PAUSED']), totalWorkouts: randInt(20, 60), workoutsDone: randInt(0, 40), progressPct: randInt(0, 100) } });
    }
    // custom workout (for count toward free/premium)
    const cw = await prisma.workout.create({ data: { userId: u.id, name: `${u.displayName} Quick Routine`, difficulty: 'BEGINNER', visibility: 'PUBLIC', exercises: { create: [0, 1, 2].map((i) => ({ exerciseId: pick(exIds), position: i, sets: 3, reps: '10', restSec: 60 })) } } });

    // 3-14 sessions
    const nSessions = randInt(3, 14);
    for (let s = 0; s < nSessions; s += 1) {
      const startedAt = daysAgo(randInt(1, 90));
      const session = await prisma.workoutSession.create({
        data: { userId: u.id, workoutId: cw.id, status: 'COMPLETED', startedAt, completedAt: new Date(startedAt.getTime() + randInt(25, 80) * 60000), durationSec: randInt(1500, 4800), totalVolume: BigInt(randInt(3000, 22000)), totalSets: randInt(12, 30), caloriesBurned: randInt(180, 620), rating: randInt(3, 5), summary: { exercises: randInt(4, 7), prs: 0 } },
      });
      // logged sets + PRs
      let volume = 0;
      const chosen = [...new Set(Array.from({ length: randInt(3, 6) }, () => pick(strengthEx)))];
      for (const name of chosen) {
        const exId = exByName[name];
        const sets = randInt(3, 5);
        for (let sn = 1; sn <= sets; sn += 1) {
          const weight = randInt(20, 160);
          const reps = randInt(5, 12);
          volume += weight * reps;
          await prisma.sessionLoggedSet.create({ data: { sessionId: session.id, exerciseId: exId, setNumber: sn, reps, weight, rpe: randInt(6, 10), isPr: sn === 1 && chance(0.25) } });
        }
        // PR record sometimes
        if (chance(0.4)) {
          const rec = await prisma.personalRecord.create({ data: { userId: u.id, exerciseId: exId, maxWeight: randInt(40, 200), maxReps: randInt(5, 15), maxVolume: BigInt(randInt(500, 6000)), est1RM: randInt(50, 220) } });
          await prisma.prHistory.create({ data: { userId: u.id, exerciseId: exId, recordId: rec.id, type: pick(['MAX_WEIGHT', 'MAX_REPS', 'EST_1RM']), value: randInt(50, 200), reps: randInt(1, 12), sessionId: session.id } });
        }
      }
      await prisma.workoutSession.update({ where: { id: session.id }, data: { totalVolume: BigInt(volume) } });
    }
    // cardio + route
    for (let c = 0; c < randInt(0, 6); c += 1) {
      const route = await prisma.route.create({ data: { userId: u.id, name: `Morning Loop ${c}`, activityType: pick(['RUNNING', 'CYCLING', 'WALKING']), distanceM: randInt(2000, 21000), elevationM: randInt(0, 300), points: [[51.5, -0.12], [51.51, -0.11], [51.52, -0.1]] } });
      const dist = route.distanceM;
      const dur = Math.round(dist / randInt(3, 6));
      await prisma.cardioSession.create({ data: { userId: u.id, activityType: route.activityType, routeId: route.id, durationSec: dur, distanceM: dist, calories: Math.round(dist / 1000 * randInt(55, 80)), avgHr: randInt(120, 175), maxHr: randInt(160, 195), avgPaceSecKm: Math.round(dur / (dist / 1000)), source: 'GPS', laps: [], hrZones: { zone1sec: dur * 0.2, zone2sec: dur * 0.3, zone3sec: dur * 0.3, zone4sec: dur * 0.15, zone5sec: dur * 0.05 } } });
    }
  }
  console.log('✓ training data seeded');
}

// ---- nutrition -------------------------------------------------------------
async function seedNutrition({ foodRows }, { members, nutritionists }) {
  console.log('🥗 seeding nutrition...');
  const food = (namePart) => foodRows.find((f) => f.name.toLowerCase().includes(namePart)) || pick(foodRows);
  for (const u of members) {
    await prisma.nutritionGoal.create({ data: { userId: u.id, calorieTarget: randInt(1800, 3200), proteinG: randInt(90, 200), carbsG: randInt(150, 400), fatG: randInt(50, 110), preset: pick(['STANDARD', 'VEGETARIAN', 'KETO', 'VEGAN']), tdee: randInt(2000, 3000) } });
    for (let d = 0; d < randInt(5, 30); d += 1) {
      const date = daysAgo(d);
      for (const slot of ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']) {
        if (!chance(0.8)) continue;
        const f = food(pick(['chicken', 'rice', 'banana', 'egg', 'oat', 'salmon', 'broccoli', 'almond']));
        const servings = randInt(1, 3);
        await prisma.mealLogEntry.create({ data: { userId: u.id, slot, foodId: f.id, date, servings, calories: f.calories * servings, proteinG: f.proteinG * servings, carbsG: f.carbsG * servings, fatG: f.fatG * servings, mealName: f.name } });
      }
      await prisma.waterLog.create({ data: { userId: u.id, date, amountMl: randInt(1000, 4000) } });
    }
    // a couple custom foods
    await prisma.food.create({ data: { name: `${u.displayName}'s Protein Bowl`, calories: 480, proteinG: 42, carbsG: 40, fatG: 14, category: 'Custom', servingLabel: '1 bowl', servingSizeG: 400, createdById: u.id, verified: false } });
  }
  // recipes + meal plans by nutritionists
  for (const u of nutritionists) {
    const r = await prisma.recipe.create({ data: { userId: u.id, name: 'High-Protein Overnight Oats', servings: 2, calories: 420, proteinG: 28, carbsG: 48, fatG: 12, dietaryTags: ['Vegetarian'], ingredients: { create: [{ name: 'Oats', quantity: 80, unit: 'g' }, { name: 'Whey', quantity: 30, unit: 'g' }, { name: 'Banana', quantity: 120, unit: 'g' }] } } });
    await prisma.recipe.create({ data: { userId: u.id, name: 'Chicken Burrito Bowl', servings: 1, calories: 550, proteinG: 45, carbsG: 55, fatG: 15, dietaryTags: [], ingredients: { create: [{ name: 'Chicken', quantity: 180, unit: 'g' }, { name: 'Rice', quantity: 150, unit: 'g' }, { name: 'Beans', quantity: 100, unit: 'g' }] } } });
    const plan = await prisma.mealPlan.create({ data: { creatorId: u.id, name: 'Lean 1800 Plan', goal: 'WEIGHT_LOSS', dietary: 'STANDARD', frequency: 'WEEKLY', caloriesPerDay: 1800, proteinG: 150, carbsG: 150, fatG: 60, published: true, priceCents: 2999, isAiGenerated: false, dayConfig: { days: 7 } } });
    const foods = foodRows.slice(0, 200);
    for (let day = 1; day <= 7; day += 1) {
      for (const slot of ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']) {
        const f = pick(foods);
        await prisma.planMeal.create({ data: { planId: plan.id, slot, dayIndex: day, foodId: f.id, calories: f.calories, proteinG: f.proteinG, carbsG: f.carbsG, fatG: f.fatG, label: f.name, servings: 1 } });
      }
    }
    await prisma.groceryList.create({ data: { userId: u.id, planId: plan.id, items: [{ name: 'Chicken', quantity: 2, unit: 'kg', category: 'Meat' }, { name: 'Rice', quantity: 1, unit: 'kg', category: 'Grain' }] } });
  }
  console.log('✓ nutrition seeded');
}

// ---- body stats + progress -------------------------------------------------
async function seedBody({ exByName }, { members }) {
  console.log('📈 seeding body stats + progress photos...');
  for (const u of members) {
    let w = randInt(60, 100);
    for (let d = 0; d < randInt(4, 24); d += 1) {
      const date = daysAgo(d * randInt(2, 7));
      w += randInt(-1, 1);
      await prisma.bodyStat.create({ data: { userId: u.id, date, weightKg: w, bodyFatPct: (randInt(12, 32) + rand()).toFixed(1), bmi: (w / 3.5).toFixed(1), muscleMassKg: (w * 0.4).toFixed(1), measurements: { waist: randInt(70, 110), hips: randInt(85, 120), chest: randInt(90, 120), leftArm: randInt(28, 45), rightArm: randInt(28, 45) } } });
    }
    if (chance(0.5)) await prisma.bodyStatGoal.create({ data: { userId: u.id, type: 'TARGET_WEIGHT', metricKey: 'weight', startValue: w + 5, targetValue: w - 5 } });
    for (let p = 0; p < randInt(0, 4); p += 1) {
      await prisma.progressPhoto.create({ data: { userId: u.id, date: daysAgo(p * 20), imageUrl: `/uploads/progressPhotos/seed-${u.id}-${p}.jpg`, pose: pick(['FRONT', 'SIDE', 'BACK']), weightKg: w + p } });
    }
  }
  console.log('✓ body stats seeded');
}

// ---- social ----------------------------------------------------------------
async function seedSocial({ exByName, exRows }, { members, admin, trainers }) {
  console.log('💬 seeding social graph...');
  const all = [...members, ...trainers.map((t) => t.user), admin];
  for (const u of members) {
    const targets = [...new Set(Array.from({ length: randInt(1, 8) }, () => pick(all)))].filter((t) => t.id !== u.id);
    for (const t of targets) {
      try { await prisma.follow.create({ data: { followerId: u.id, followingId: t.id } }); } catch (_e) { /* unique */ }
    }
    // posts
    for (let p = 0; p < randInt(0, 6); p += 1) {
      const post = await prisma.post.create({ data: { userId: u.id, type: pick(['WORKOUT', 'PROGRESS_PHOTO', 'ACHIEVEMENT', 'TIPS', 'CARDIO']), content: pick(['New PR today 💪', 'Leg day done right', 'Morning miles 🏃', 'Consistency beats motivation', 'Feeling strong!']), hashtags: pick([['legday'], ['#fitnessmotivation'], ['newPR'], ['consistency']]), stats: { volume: randInt(2000, 20000), duration: randInt(1500, 4000) }, isPublic: true, kudosCount: randInt(0, 40), commentsCount: 0 } });
      // kudos
      for (const other of new Set(Array.from({ length: randInt(0, 12) }, () => pick(all)))) {
        if (other.id === u.id) continue;
        try { await prisma.kudos.create({ data: { userId: other.id, postId: post.id } }); } catch (_e) {}
      }
      // comments
      for (let c = 0; c < randInt(0, 4); c += 1) {
        await prisma.comment.create({ data: { userId: pick(all).id, postId: post.id, content: pick(['Nice work!', '🔥🔥', 'How much did you squat?', 'Inspiring!', '💪']) } });
      }
    }
  }
  // groups
  const groupDefs = [['Running Club', 'running-club', 'Cardio'], ['Powerlifting Pit', 'powerlifting-pit', 'Strength'], ['Yoga & Mobility', 'yoga-mobility', 'Flexibility'], ['Weight Loss Warriors', 'weight-loss-warriors', 'Weight Loss']];
  const groups = [];
  for (const [name, slug, category] of groupDefs) {
    const g = await prisma.group.create({ data: { name, slug, category, description: `${name} community`, createdBy: admin.id, visibility: 'OPEN', memberCount: 0 } });
    for (const u of new Set(Array.from({ length: randInt(8, 25) }, () => pick(all)))) {
      try { await prisma.groupMember.create({ data: { groupId: g.id, userId: u.id } }); } catch (_e) {}
    }
    const count = await prisma.groupMember.count({ where: { groupId: g.id } });
    await prisma.group.update({ where: { id: g.id }, data: { memberCount: count } });
    await prisma.groupDiscussion.create({ data: { groupId: g.id, userId: pick(all).id, title: 'Introduce yourself!', content: 'Tell us your goals.', pinned: true } });
    groups.push(g);
  }
  console.log('✓ social seeded');
  return all;
}

// ---- achievements + certificates ------------------------------------------
async function seedAchievementsAndCerts({ members }, programs) {
  console.log('🏅 awarding achievements + certificates...');
  const achs = await prisma.achievement.findMany({ select: { id: true, key: true, xpReward: true } });
  for (const u of members) {
    for (const a of achs) {
      if (!chance(0.25)) continue;
      await prisma.userAchievement.create({ data: { userId: u.id, achievementId: a.id, progressValue: randInt(1, 200) } });
    }
    const done = await prisma.userAchievement.count({ where: { userId: u.id } });
    await prisma.user.update({ where: { id: u.id }, data: { xpPoints: done * 250, level: Math.max(1, Math.floor(done / 3) + 1) } });
    // certificate for completed enrollments
    const enrs = await prisma.programEnrollment.findMany({ where: { userId: u.id, status: 'COMPLETED' }, take: 2 });
    for (const e of enrs) {
      const prog = programs.find((p) => p.id === e.programId);
      await prisma.certificate.create({ data: { userId: u.id, programId: e.programId, type: 'PROGRAM_COMPLETION', title: `Completion — ${prog ? prog.name : 'Program'}`, pdfUrl: `/certificates/${u.id}-${e.programId}.pdf` } });
    }
  }
  console.log('✓ achievements awarded');
}

// ---- personal training -----------------------------------------------------
async function seedTrainingBusiness({ trainers }, { members, admin }) {
  console.log('🧑‍🏫 seeding bookings + messaging...');
  const clients = members.slice(0, 12);
  for (const { user: trainer, profile } of trainers) {
    // availability next 14 days
    for (let d = 0; d < 14; d += 1) {
      const day = daysAhead(d);
      await prisma.trainerAvailability.create({ data: { trainerId: profile.id, date: day, startTime: new Date(day.setHours(9, 0, 0, 0)), endTime: new Date(day.setHours(10, 0, 0, 0)), sessionTypes: ['VIDEO_CALL'], booked: false } });
      await prisma.trainerAvailability.create({ data: { trainerId: profile.id, date: day, startTime: new Date(day.setHours(17, 0, 0, 0)), endTime: new Date(day.setHours(18, 0, 0, 0)), sessionTypes: ['IN_PERSON', 'PROGRAM_REVIEW'], booked: false } });
    }
    // clients + bookings
    for (const client of clients.slice(0, randInt(2, 5))) {
      try { await prisma.trainerClient.create({ data: { trainerId: profile.id, clientUserId: client.id, shareWorkouts: true, shareNutrition: chance(0.6), shareBodyStats: true } }); } catch (_e) {}
      const booking = await prisma.trainerSessionBooking.create({ data: { trainerId: trainer.id, clientId: client.id, sessionType: pick(['VIDEO_CALL', 'IN_PERSON', 'PROGRAM_REVIEW']), scheduledAt: daysAhead(randInt(-20, 20)), durationMin: 60, status: pick(['PENDING', 'CONFIRMED', 'COMPLETED']), priceCents: profile.hourlyRateCents, currency: 'usd', rating: randInt(3, 5), postSessionNotes: 'Great session, increased squat volume.' } });
      await prisma.trainerMessage.create({ data: { bookingId: booking.id, senderId: trainer.id, receiverId: client.id, body: 'Looking forward to our session!' } });
      await prisma.trainerMessage.create({ data: { bookingId: booking.id, senderId: client.id, receiverId: trainer.id, body: 'Thanks, see you then.', readAt: new Date() } });
    }
  }
  console.log('✓ PT business seeded');
}

// ---- live classes ----------------------------------------------------------
async function seedLiveClasses({ trainers }, { members }) {
  console.log('🎥 seeding live classes...');
  const types = ['HIIT', 'Yoga', 'Spin', 'Strength', 'Pilates', 'Boxing'];
  for (const { user: trainer } of trainers) {
    for (let i = 0; i < randInt(2, 5); i += 1) {
      const scheduled = daysAhead(randInt(-10, 15));
      const cls = await prisma.liveClass.create({ data: { trainerId: trainer.id, title: `${pick(types)} Power Session`, classType: pick(types), durationMin: pick([30, 45, 60]), scheduledAt: scheduled, status: scheduled > new Date() ? 'SCHEDULED' : 'COMPLETED', maxParticipants: pick([20, 30, 50]), priceCents: pick([0, 999, 1499]), roomId: `room-${trainer.id.slice(0, 8)}-${i}`, attendeeCount: randInt(0, 40), ratingAvg: (4 + rand()).toFixed(2) * 1, ratingCount: randInt(0, 30) } });
      for (const u of new Set(Array.from({ length: randInt(3, 15) }, () => pick(members)))) {
        try { await prisma.classEnrollment.create({ data: { classId: cls.id, userId: u.id, paidCents: cls.priceCents } }); } catch (_e) {}
      }
      for (let c = 0; c < randInt(0, 8); c += 1) await prisma.classChatMessage.create({ data: { classId: cls.id, userId: pick(members).id, body: pick(['Let’s go! 🔥', 'Great pace', 'Tough one', 'Love this class']), reaction: chance(0.3) ? '🔥' : null } });
    }
  }
  console.log('✓ live classes seeded');
}

// ---- challenges + leaderboard ---------------------------------------------
async function seedChallenges({ members }, { admin, trainers }) {
  console.log('🏆 seeding challenges + leaderboards...');
  const defs = [
    { title: '30-Day Squat Challenge', type: 'STREAK', goalValue: 30, goalUnit: 'days', scope: 'PLATFORM' },
    { title: '10K Steps Daily', type: 'STEPS', goalValue: 10000, goalUnit: 'steps', scope: 'PLATFORM' },
    { title: 'Monthly 50km Run', type: 'DISTANCE', goalValue: 50, goalUnit: 'km', scope: 'PLATFORM' },
    { title: 'Total Volume Titans', type: 'VOLUME', goalValue: 10000, goalUnit: 'kg', scope: 'TRAINER' },
    { title: 'Calorie Crusher', type: 'CALORIES', goalValue: 5000, goalUnit: 'kcal', scope: 'COMMUNITY' },
    { title: 'Team Transformation', type: 'CUSTOM', goalValue: 100, goalUnit: 'pts', scope: 'TEAM' },
  ];
  const creator = admin;
  for (const def of defs) {
    const ch = await prisma.challenge.create({ data: { creatorId: def.scope === 'TRAINER' ? pick(trainers).user.id : creator.id, title: def.title, description: `Conquer ${def.title}!`, type: def.type, scope: def.scope, goalValue: def.goalValue, goalUnit: def.goalUnit, startDate: daysAgo(randInt(1, 10)), endDate: daysAhead(randInt(5, 30)), active: true, isTeamBased: def.scope === 'TEAM', participantCount: 0, milestones: [{ at: 0.25, label: 'Quarter' }, { at: 0.5, label: 'Halfway' }, { at: 0.75, label: 'Almost there' }] } });
    const participants = [...new Set(Array.from({ length: randInt(8, 25) }, () => pick(members)))];
    let teamId = null;
    if (ch.isTeamBased) {
      const team = await prisma.challengeTeam.create({ data: { challengeId: ch.id, name: 'Team Alpha', totalScore: 0 } });
      teamId = team.id;
    }
    for (const u of participants) {
      const progress = (Number(def.goalValue) * rand()).toFixed(2);
      const enr = await prisma.challengeEnrollment.create({ data: { challengeId: ch.id, userId: u.id, teamId, progressValue: progress, rank: 0 } });
      if (ch.isTeamBased) {
        try { await prisma.challengeTeamMember.create({ data: { teamId, userId: u.id } }); } catch (_e) {}
        await prisma.challengeTeam.update({ where: { id: teamId }, data: { totalScore: { increment: Number(progress) } } });
      }
      if (Number(progress) >= Number(def.goalValue) * 0.5) await prisma.challengeMilestone.create({ data: { challengeId: ch.id, userId: u.id, label: 'Halfway' } });
    }
    // rank
    const enrs = await prisma.challengeEnrollment.findMany({ where: { challengeId: ch.id }, orderBy: { progressValue: 'desc' } });
    for (let i = 0; i < enrs.length; i += 1) await prisma.challengeEnrollment.update({ where: { id: enrs[i].id }, data: { rank: i + 1 } });
    await prisma.challenge.update({ where: { id: ch.id }, data: { participantCount: enrs.length } });

    // leaderboard snapshot
    await prisma.leaderboardSnapshot.create({ data: { scope: 'CHALLENGE', scopeId: ch.id, period: 'WEEKLY', entries: enrs.slice(0, 10).map((e, i) => ({ userId: e.userId, score: Number(e.progressValue), rank: i + 1 })) } });
  }
  await prisma.leaderboardSnapshot.create({ data: { scope: 'PLATFORM', period: 'ALL_TIME', entries: members.slice(0, 10).map((m, i) => ({ userId: m.id, name: m.displayName, score: 10000 - i * 300, rank: i + 1 })) } });
  console.log('✓ challenges + leaderboards seeded');
}

// ---- schedule + notifications + wearables ---------------------------------
async function seedOps({ members }, { trainers }) {
  console.log('🔔 seeding schedule + notifications + wearables...');
  for (const u of members) {
    for (let d = 0; d < randInt(1, 5); d += 1) {
      await prisma.scheduledItem.create({ data: { userId: u.id, date: daysAhead(randInt(0, 10)), activityType: pick(['WORKOUT', 'CARDIO', 'LIVE_CLASS', 'TRAINER_SESSION', 'REST']), status: pick(['PLANNED', 'COMPLETED', 'MISSED']), reminderSent: chance(0.5) } });
    }
    for (let n = 0; n < randInt(1, 8); n += 1) {
      await prisma.notification.create({ data: { userId: u.id, type: pick(['WORKOUT_REMINDER', 'PR_BROKEN', 'ACHIEVEMENT_UNLOCKED', 'CHALLENGE_UPDATE', 'KUDOS', 'NEW_FOLLOWER', 'CLASS_STARTING', 'WEEKLY_REPORT']), title: pick(['New PR!', 'Achievement unlocked', 'Your class starts soon', 'You have a new follower']), body: 'Tap to view', readAt: chance(0.4) ? new Date() : null, delivered: true } });
    }
    if (chance(0.6)) await prisma.deviceToken.create({ data: { userId: u.id, token: `ExponentPushToken[${u.id}]`, platform: pick(['IOS', 'ANDROID']) } });
    if (chance(0.3)) await prisma.webPushSubscription.create({ data: { userId: u.id, endpoint: `https://push.example/${u.id}`, keys: { p256dh: 'KEY', auth: 'AUTH' } } });
    for (let w = 0; w < randInt(0, 12); w += 1) {
      const type = pick(['STEPS', 'HEART_RATE', 'SLEEP', 'ACTIVE_CALORIES', 'WORKOUT']);
      const val = type === 'STEPS' ? randInt(3000, 15000) : type === 'SLEEP' ? randInt(5, 9) : type === 'HEART_RATE' ? randInt(50, 90) : randInt(200, 900);
      await prisma.wearableDataPoint.create({ data: { userId: u.id, source: pick(['APPLE_HEALTH', 'GOOGLE_FIT', 'GARMIN_CSV', 'MANUAL']), type, date: daysAgo(w), value: val, unit: type === 'SLEEP' ? 'h' : type === 'HEART_RATE' ? 'bpm' : type === 'STEPS' ? 'steps' : 'kcal', details: {} } });
    }
  }
  console.log('✓ ops data seeded');
}

// ---- monetization + ai + admin --------------------------------------------
async function seedMonetization({ members, trainers, admin, superAdmin }, { exByName, exRows }) {
  console.log('💳 seeding payments, AI, audit...');
  for (const u of members.filter((m) => m.subscriptionType === 'PREMIUM')) {
    await prisma.subscription.create({ data: { userId: u.id, plan: 'PREMIUM', stripeSubscriptionId: `sub_${u.id}`, status: 'ACTIVE', currentPeriodEnd: daysAhead(randInt(5, 30)) } });
    await prisma.payment.create({ data: { userId: u.id, type: 'SUBSCRIPTION', status: 'SUCCEEDED', amountCents: 999, currency: 'usd' } });
  }
  for (const { user: trainer } of trainers) {
    // program sales payments to trainer
    await prisma.payment.create({ data: { userId: pick(members).id, type: 'PROGRAM_PURCHASE', status: 'SUCCEEDED', amountCents: 4999, currency: 'usd', platformFeeCents: 1000, recipientUserId: trainer.id } });
    await prisma.payout.create({ data: { trainerId: trainer.id, amountCents: randInt(5000, 50000), currency: 'usd', status: 'SUCCEEDED', periodStart: daysAgo(30), periodEnd: daysAgo(1) } });
  }
  // AI usage
  const features = ['WORKOUT_PLAN', 'MEAL_PLAN', 'COACH_CHAT', 'FORM_CHECKER', 'PROGRESS_ANALYZER', 'CALORIE_ESTIMATOR', 'INJURY_RISK'];
  for (const u of members) {
    for (let i = 0; i < randInt(0, 6); i += 1) {
      const f = pick(features);
      await prisma.aiUsageLog.create({ data: { userId: u.id, feature: f, model: 'openai/gpt-4o', promptTokens: randInt(200, 1500), completionTokens: randInt(100, 800), estimatedCost: (rand() * 0.05).toFixed(5), success: chance(0.95), latencyMs: randInt(700, 4000) } });
    }
    if (chance(0.5)) await prisma.aiConversation.create({ data: { userId: u.id, feature: 'COACH_CHAT', title: 'Coach check-in', history: [{ role: 'user', content: 'How should I progress my squat?', ts: Date.now() }, { role: 'assistant', content: 'Add 2.5kg per week...', ts: Date.now() }] } });
    if (chance(0.4)) await prisma.aiGeneratedPlan.create({ data: { userId: u.id, feature: 'WORKOUT_PLAN', payload: { name: 'AI Push Day', days: 4 } } });
  }
  // audit + analytics cache + content report
  await prisma.auditLog.createMany({ data: [
    { actorId: superAdmin.id, action: 'SEED', entityType: 'SYSTEM', entityId: null, ip: '127.0.0.1' },
    { actorId: admin.id, action: 'TRAINER_VERIFY', entityType: 'TrainerProfile', entityId: trainers[0].profile.id },
    { actorId: admin.id, action: 'FEATURE_PROGRAM', entityType: 'Program', entityId: 'demo' },
  ] });
  await prisma.analyticsCache.create({ data: { scope: 'DASHBOARD_ADMIN', payload: { totalUsers: members.length + 10, revenueCents: 125000, aiRequests: 3400 } } });
  await prisma.contentReport.create({ data: { reporterId: pick(members).id, targetType: 'POST', targetId: 'demo', reason: 'Spam', status: 'PENDING' } });
  console.log('✓ monetization + ai + admin seeded');
}

// ---- main ------------------------------------------------------------------
async function main() {
  console.log('🌱 Seeding Fitness & Workout Platform...');
  await reset();
  const { superAdmin, admin, trainers, nutritionists, members } = await seedUsers();
  const { exByName, foodRows, exRows } = await seedLibrary();
  await seedConfig(admin);
  const programs = await seedWorkoutsAndPrograms({ exByName }, { trainers, admin });
  await seedTraining({ exByName, exRows }, { members, trainers }, programs);
  await seedNutrition({ foodRows }, { members, nutritionists });
  await seedBody({ exByName }, { members });
  await seedSocial({ exByName, exRows }, { members, admin, trainers });
  await seedAchievementsAndCerts({ members }, programs);
  await seedTrainingBusiness({ trainers }, { members, admin });
  await seedLiveClasses({ trainers }, { members });
  await seedChallenges({ members }, { admin, trainers });
  await seedOps({ members }, { trainers });
  await seedMonetization({ members, trainers, admin, superAdmin }, { exByName, exRows });

  const counts = {
    users: await prisma.user.count(), exercises: await prisma.exercise.count(), foods: await prisma.food.count(),
    programs: await prisma.program.count(), sessions: await prisma.workoutSession.count(), posts: await prisma.post.count(),
    challenges: await prisma.challenge.count(), liveClasses: await prisma.liveClass.count(), achievements: await prisma.achievement.count(),
  };
  console.log('\n📊 Seeded counts:', counts);
  console.log('\n✅ Seed complete.');
}

main()
  .catch((e) => { console.error('❌ seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
