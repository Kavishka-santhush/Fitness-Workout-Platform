/**
 * Auth service — Clerk owns credentials/OAuth; this service mirrors users into
 * PostgreSQL (webhook-driven) and exposes the "current user" view.
 */
const prisma = require('../lib/prisma');
const { notFound, badRequest } = require('../utils/response.util');
const logger = require('../utils/logger.util');

/** Upsert a User row from Clerk user data (idempotent). */
async function syncFromClerk(clerkUser, { partial = false } = {}) {
  if (!clerkUser?.id) throw badRequest('Missing Clerk user id');
  const email = clerkUser.primaryEmailAddress?.emailAddress
    || clerkUser.emailAddresses?.[0]?.emailAddress
    || `${clerkUser.id}@no-email.clerk`;

  const base = {
    clerkUserId: clerkUser.id,
    email,
    username: clerkUser.username || clerkUser.id.toLowerCase().replace(/[^a-z0-9]/g, ''),
    firstName: clerkUser.firstName || null,
    lastName: clerkUser.lastName || null,
    displayName: clerkUser.fullName || clerkUser.username || 'Athlete',
    avatarUrl: clerkUser.imageUrl || null,
  };

  const existing = await prisma.user.findUnique({ where: { clerkUserId: clerkUser.id } });
  if (existing) {
    const data = partial ? Object.fromEntries(Object.entries(base).filter(([, v]) => v !== null)) : base;
    return prisma.user.update({ where: { id: existing.id }, data });
  }
  return prisma.user.create({ data: base });
}

/** Handle a verified Clerk webhook event. */
async function handleWebhook(event) {
  const { type, data } = event || {};
  switch (type) {
    case 'user.created':
      logger.info(`Clerk webhook: user.created ${data.id}`);
      return syncFromClerk(data);
    case 'user.updated':
      logger.info(`Clerk webhook: user.updated ${data.id}`);
      return syncFromClerk(data, { partial: true });
    case 'user.deleted': {
      logger.info(`Clerk webhook: user.deleted ${data?.id}`);
      const user = await prisma.user.findUnique({ where: { clerkUserId: data.id } });
      if (user) await prisma.user.delete({ where: { id: user.id } }); // cascades domain data
      return user;
    }
    case 'session.created':
    case 'session.end':
    case 'session.revoked':
      // Activity tracking only — no domain changes needed.
      if (data?.userId) {
        await prisma.user.updateMany({ where: { clerkUserId: data.userId }, data: { lastActiveAt: new Date() } });
      }
      return null;
    default:
      logger.debug(`Clerk webhook ignored: ${type}`);
      return null;
  }
}

/** Full "me" payload: profile + fitness profile + subscription + stats summary. */
async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      fitnessProfile: true,
      trainerProfile: true,
      subscriptions: { where: { status: 'ACTIVE' }, take: 1 },
      nutritionGoal: true,
    },
  });
  if (!user) throw notFound('User not synced yet — retry after onboarding');
  const [sessionCount, streak, xp] = await Promise.all([
    prisma.workoutSession.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.user.findUnique({ where: { id: userId }, select: { streakCurrent: true, level: true, xpPoints: true } }),
    Promise.resolve(null),
  ]);
  return { ...user, lifetimeWorkouts: sessionCount, streakSummary: streak };
}

/** Onboarding completion: goals, body stats, preferences (first-time). */
async function completeOnboarding(userId, payload) {
  const {
    displayName, goal, experienceLevel, activityLevel, sex, birthDate,
    heightCm, weightKg, preferredTypes = [], equipment = [], injuries = [],
    workoutDaysWeek, preferredDuration, units, language,
  } = payload;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      displayName: displayName ?? undefined,
      goal, experienceLevel, activityLevel,
      sex: sex || undefined,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      heightCm: heightCm ? Number(heightCm) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      preferredTypes, equipment, injuries,
      workoutDaysWeek: workoutDaysWeek ? Number(workoutDaysWeek) : undefined,
      preferredDuration: preferredDuration ? Number(preferredDuration) : undefined,
      units: units || undefined,
      language: language || undefined,
      onboarded: true,
    },
  });

  await prisma.fitnessProfile.upsert({
    where: { userId },
    create: {
      userId,
      goal: goal || 'GENERAL_FITNESS',
      experienceLevel: experienceLevel || 'BEGINNER',
      equipment,
      limitations: injuries,
      workoutDays: workoutDaysWeek ? Number(workoutDaysWeek) : null,
      sessionDuration: preferredDuration ? Number(preferredDuration) : null,
    },
    update: { equipment, limitations: injuries },
  });

  // Seed nutrition goal from TDEE if body stats provided.
  const calorieCalc = require('./calorieCalculator.service');
  if (weightKg && heightCm && birthDate) {
    await calorieCalc.ensureNutritionGoal(userId);
  }
  return user;
}

module.exports = { syncFromClerk, handleWebhook, getMe, completeOnboarding };
