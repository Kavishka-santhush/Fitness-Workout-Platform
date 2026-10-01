/**
 * AI service — 19 OpenRouter-powered features with per-plan quota enforcement,
 * usage metering (AiUsageLog), chat history (AiConversation) and persisted
 * generated plans (AiGeneratedPlan).
 *
 * Every feature funnels through `guard()` (quota) + `track()` (logging) so
 * billing/limits live in one place. Features that produce structured plans use
 * chatJson; conversational ones use chat.
 */
const prisma = require('../lib/prisma');
const openrouter = require('../utils/openrouter.util');
const analytics = require('./analytics.service');
const { tooMany, notFound, badRequest } = require('../utils/response.util');
const logger = require('../utils/logger.util');

const FREE_DAILY_LIMIT = parseInt(process.env.FREE_AI_REQUESTS_PER_DAY || '3', 10);
const PAID_FEATURES = ['PREMIUM', 'TRAINER_PRO', 'NUTRITION_PRO', 'ENTERPRISE'];

/* ---------- Quota + metering ---------- */

function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

async function getUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, subscriptionType: true } });
  if (!user) throw notFound('User not found');
  return user;
}

/** Throws when a free member has exhausted the daily AI quota. */
async function guard(userId) {
  const user = await getUser(userId);
  const paid = PAID_FEATURES.includes(user.subscriptionType);
  if (paid) return { user, paid: true, limit: null };
  const used = await prisma.aiUsageLog.count({ where: { userId, success: true, createdAt: { gte: startOfToday() } } });
  if (used >= FREE_DAILY_LIMIT) {
    throw tooMany(`Free plan allows ${FREE_DAILY_LIMIT} AI requests per day — upgrade for unlimited AI`, { upgradeUrl: '/pricing', used, limit: FREE_DAILY_LIMIT });
  }
  return { user, paid: false, limit: FREE_DAILY_LIMIT, used };
}

async function getQuota(userId) {
  const user = await getUser(userId);
  const paid = PAID_FEATURES.includes(user.subscriptionType);
  const used = await prisma.aiUsageLog.count({ where: { userId, success: true, createdAt: { gte: startOfToday() } } });
  return { plan: user.subscriptionType, paid, used, limit: paid ? null : FREE_DAILY_LIMIT, remaining: paid ? null : Math.max(0, FREE_DAILY_LIMIT - used) };
}

/** Log one model call (success or failure) with token + cost metering. */
async function track(userId, feature, result, startedAt, error) {
  const usage = result?.usage || {};
  const promptTokens = usage.prompt_tokens || usage.promptTokens || 0;
  const completionTokens = usage.completion_tokens || usage.completionTokens || 0;
  // Rough cost estimate (USD) — real cost comes from the provider invoice.
  const estimatedCost = ((promptTokens + completionTokens) / 1000) * 0.0025;
  await prisma.aiUsageLog.create({
    data: {
      userId, feature,
      model: result?.model || openrouter.DEFAULT_MODEL,
      promptTokens, completionTokens,
      estimatedCost,
      success: !error,
      error: error ? String(error.message || error).slice(0, 500) : null,
      latencyMs: Date.now() - startedAt,
    },
  });
}

/** Run a prompt under quota + metering. opts: {json, temperature, maxTokens, model}. */
async function run(userId, feature, messages, opts = {}) {
  await guard(userId);
  const startedAt = Date.now();
  try {
    const result = opts.json ? await openrouter.chatJson(messages, opts) : await openrouter.chat(messages, opts);
    await track(userId, feature, result, startedAt, null);
    return result;
  } catch (err) {
    await track(userId, feature, null, startedAt, err);
    logger.error(`AI ${feature} failed for ${userId}: ${err.message}`);
    throw badRequest('The AI assistant is unavailable right now. Please try again shortly.');
  }
}

/* ---------- Context builders ---------- */

async function buildProfileContext(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, goal: true, experienceLevel: true, activityLevel: true, sex: true, heightCm: true, weightKg: true, targetWeightKg: true, workoutDaysWeek: true, preferredDuration: true, equipment: true, injuries: true, preferredTypes: true, subscriptionType: true, level: true, streakCurrent: true },
  });
  const latestBody = await prisma.bodyStat.findFirst({ where: { userId }, orderBy: { date: 'desc' }, select: { weightKg: true, bodyFatPct: true, muscleMassKg: true, bmi: true, date: true } });
  const recentSessions = await prisma.workoutSession.findMany({ where: { userId, status: 'COMPLETED' }, orderBy: { completedAt: 'desc' }, take: 8, select: { name: true, totalVolume: true, caloriesBurned: true, durationSec: true, completedAt: true } });
  const prs = await prisma.personalRecord.findMany({ where: { userId }, orderBy: { achievedAt: 'desc' }, take: 8, include: { exercise: { select: { name: true } } } });
  const nutritionGoal = await prisma.nutritionGoal.findUnique({ where: { userId } });
  return { user, latestBody, recentSessions, prs: prs.map((p) => ({ exercise: p.exercise.name, maxWeight: p.maxWeight ? Number(p.maxWeight) : null, est1RM: p.est1RM ? Number(p.est1RM) : null })), nutritionGoal };
}

function ctxBrief(ctx) {
  const s = JSON.stringify(ctx);
  return s.length > 6000 ? s.slice(0, 6000) : s;
}

const SYSTEM = 'You are an elite certified strength-and-conditioning coach and registered dietitian embedded in a fitness platform. Use ONLY the provided user data plus general best-practice knowledge. Be specific, safe, and encouraging. If data is missing, ask or make reasonable assumptions and state them. You are not a medical professional; add a brief disclaimer when giving anything close to medical, injury, or supplement advice.';

/* ---------- Plan-shaped features ---------- */

async function workoutPlan(userId, input = {}) {
  const ctx = await buildProfileContext(userId);
  const { data } = await run(userId, 'WORKOUT_PLAN', [
    { role: 'system', content: `${SYSTEM}\nReturn STRICT JSON: {"title","weeks","daysPerWeek","sessions":[{"day","focus","name","estimatedMinutes","warmup":[],"exercises":[{"name","sets","reps","restSec","notes"}],"cooldown":[]}],"progressionNotes","deload"}` },
    { role: 'user', content: `Build a workout plan.\nRequest: ${JSON.stringify(input)}\nUser data: ${ctxBrief(ctx)}` },
  ], { json: true, temperature: 0.6 });
  const plan = await prisma.aiGeneratedPlan.create({ data: { userId, feature: 'WORKOUT_PLAN', payload: data } });
  return { planId: plan.id, ...data };
}

async function mealPlan(userId, input = {}) {
  const ctx = await buildProfileContext(userId);
  const { data } = await run(userId, 'MEAL_PLAN', [
    { role: 'system', content: `${SYSTEM}\nReturn STRICT JSON: {"title","caloriesPerDay","macros":{"proteinG","carbsG","fatG"},"days":[{"day","meals":[{"slot","name","items":[{"food","quantity","calories","proteinG","carbsG","fatG"}]}]},"shoppingList":[],"notes"}` },
    { role: 'user', content: `Build a weekly meal plan.\nRequest: ${JSON.stringify(input)}\nUser data: ${ctxBrief(ctx)}` },
  ], { json: true, temperature: 0.6 });
  const plan = await prisma.aiGeneratedPlan.create({ data: { userId, feature: 'MEAL_PLAN', payload: data } });
  return { planId: plan.id, ...data };
}

async function coachChat(userId, { message, conversationId } = {}) {
  if (!message) throw badRequest('message is required');
  await guard(userId);
  const ctx = await buildProfileContext(userId);
  let conversation = conversationId ? await prisma.aiConversation.findFirst({ where: { id: conversationId, userId } }) : null;
  if (!conversation) {
    conversation = await prisma.aiConversation.create({ data: { userId, feature: 'COACH_CHAT', title: message.slice(0, 60), history: [], context: ctx } });
  }
  const history = Array.isArray(conversation.history) ? conversation.history : [];
  const startedAt = Date.now();
  const messages = [
    { role: 'system', content: `${SYSTEM}\nHere is the member's current data: ${ctxBrief(ctx)}\nAnswer their question referencing this data when relevant.` },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];
  try {
    const result = await openrouter.chat(messages, { temperature: 0.7 });
    await track(userId, 'COACH_CHAT', result, startedAt, null);
    const newHistory = [...history, { role: 'user', content: message, ts: Date.now() }, { role: 'assistant', content: result.content, ts: Date.now() }];
    await prisma.aiConversation.update({ where: { id: conversation.id }, data: { history: newHistory, context: ctx } });
    return { conversationId: conversation.id, reply: result.content };
  } catch (err) {
    await track(userId, 'COACH_CHAT', null, startedAt, err);
    throw badRequest('The AI coach is unavailable right now. Please try again shortly.');
  }
}

/* ---------- Analytical JSON features ---------- */

async function progressAnalyzer(userId) {
  const ctx = await buildProfileContext(userId);
  const { data } = await run(userId, 'PROGRESS_ANALYZER', [
    { role: 'system', content: `${SYSTEM}\nAnalyze weight/measurement/workout trends. Return JSON: {"summary","trends":[{"metric","direction","detail"}],"insights":[],"recommendations":[]}` },
    { role: 'user', content: ctxBrief(ctx) },
  ], { json: true });
  return data;
}

async function injuryRisk(userId, input = {}) {
  const ctx = await buildProfileContext(userId);
  const volume = await prisma.sessionLoggedSet.groupBy({ by: ['session'], where: { session: { userId, completedAt: { gte: new Date(Date.now() - 14 * 864e5) } } }, _count: true });
  const { data } = await run(userId, 'INJURY_RISK', [
    { role: 'system', content: `${SYSTEM}\nAssess overtraining/injury risk from volume, muscle balance and recovery. Include a medical disclaimer. Return JSON: {"riskLevel":"LOW|MEDIUM|HIGH","score":0-100,"factors":[],"warnings":[],"recommendations":[]}` },
    { role: 'user', content: JSON.stringify({ ctx: ctxBrief(ctx), recentSetCount: volume.length, request: input }) },
  ], { json: true });
  return data;
}

async function calorieEstimator(userId, { meal } = {}) {
  if (!meal) throw badRequest('meal description is required');
  const { data } = await run(userId, 'CALORIE_ESTIMATOR', [
    { role: 'system', content: 'You estimate calories and macros from a text description of a meal. Return JSON: {"calories","proteinG","carbsG","fatG","confidence":"LOW|MEDIUM|HIGH","foods":[{"name","quantity","calories"}],"notes"}' },
    { role: 'user', content: meal },
  ], { json: true });
  return data;
}

async function foodRecognition(userId, { description, brand } = {}) {
  if (!description) throw badRequest('description is required');
  const { data } = await run(userId, 'FOOD_RECOGNITION', [
    { role: 'system', content: 'Identify foods from a description/photo-caption and estimate nutrition. Return JSON: {"foods":[{"name","brand","serving","calories","proteinG","carbsG","fatG"}],"totalCalories","notes"}' },
    { role: 'user', content: JSON.stringify({ description, brand }) },
  ], { json: true });
  return data;
}

async function workoutModification(userId, { workoutId, limitation } = {}) {
  if (!limitation) throw badRequest('limitation is required');
  let workout = null;
  if (workoutId) workout = await prisma.workout.findFirst({ where: { id: workoutId, OR: [{ userId }, { visibility: 'PUBLIC' }] }, include: { exercises: { include: { exercise: { select: { name: true, primaryMuscles: true } } } } } });
  const { data } = await run(userId, 'WORKOUT_MODIFICATION', [
    { role: 'system', content: `${SYSTEM}\nModify the workout to accommodate the injury/limitation, swapping unsafe exercises for safe alternatives. Return JSON: {"summary","swaps":[{"original","replacement","reason"}],"modifiedWorkout":{}}` },
    { role: 'user', content: JSON.stringify({ limitation, workout: workout || 'No workout provided — produce a generic safe template.' }) },
  ], { json: true });
  return data;
}

async function plateauBuster(userId) {
  const ctx = await buildProfileContext(userId);
  const { data } = await run(userId, 'PLATEAU_BUSTER', [
    { role: 'system', content: `${SYSTEM}\nDetect if progress has stalled and suggest concrete training/nutrition changes. Return JSON: {"isPlateau":bool,"evidence":[],"trainingChanges":[],"nutritionChanges":[],"plan":"suggested 2-week plan"}` },
    { role: 'user', content: ctxBrief(ctx) },
  ], { json: true });
  return data;
}

async function deloadRecommendation(userId) {
  const ctx = await buildProfileContext(userId);
  const { data } = await run(userId, 'DELOAD_RECOMMENDATION', [
    { role: 'system', content: `${SYSTEM}\nAnalyze fatigue signals (recent volume, frequency, streak) and advise whether to deload. Return JSON: {"shouldDeload":bool,"reasoning","deloadProtocol":{"durationDays","intensityPct","notes"},"fatigueSignals":[]}` },
    { role: 'user', content: ctxBrief(ctx) },
  ], { json: true });
  return data;
}

async function supplementAdvisor(userId, input = {}) {
  const ctx = await buildProfileContext(userId);
  const { data } = await run(userId, 'SUPPLEMENT_ADVISOR', [
    { role: 'system', content: `${SYSTEM}\nNON-PRESCRIPTIVE supplement education only. Always advise consulting a physician. Return JSON: {"disclaimer","suggestions":[{"supplement","why","typicalDose","evidence":"STRONG|MODERATE|WEAK"}],"gapsFromDiet":[]}` },
    { role: 'user', content: JSON.stringify({ ctx: ctxBrief(ctx), request: input }) },
  ], { json: true });
  return data;
}

async function recoveryOptimizer(userId) {
  const ctx = await buildProfileContext(userId);
  const sleep = await prisma.wearableDataPoint.findMany({ where: { userId, type: 'SLEEP' }, orderBy: { date: 'desc' }, take: 14, select: { date: true, value: true, unit: true } });
  const { data } = await run(userId, 'RECOVERY_OPTIMIZER', [
    { role: 'system', content: `${SYSTEM}\nAnalyze sleep, workout intensity and rest days to optimise recovery. Return JSON: {"recoveryScore":0-100,"sleepInsights":[],"readiness":"HIGH|MODERATE|LOW","recommendations":[]}` },
    { role: 'user', content: JSON.stringify({ ctx: ctxBrief(ctx), sleep }) },
  ], { json: true });
  return data;
}

async function strengthPredictor(userId, input = {}) {
  const ctx = await buildProfileContext(userId);
  const { data } = await run(userId, 'STRENGTH_PREDICTOR', [
    { role: 'system', content: `${SYSTEM}\nUsing current lifts, predict potential 1RM and realistic 8-12 week strength gains. Return JSON: {"lifts":[{"exercise","currentE1RM","projected1RM","timelineWeeks","confidence"}],"assumptions":[]}` },
    { role: 'user', content: JSON.stringify({ ctx: ctxBrief(ctx), request: input }) },
  ], { json: true });
  return data;
}

async function cardioOptimizer(userId) {
  const ctx = await buildProfileContext(userId);
  const cardio = await prisma.cardioSession.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 20, select: { date: true, activityType: true, distanceM: true, durationSec: true, avgHr: true, calories: true } });
  const { data } = await run(userId, 'CARDIO_OPTIMIZER', [
    { role: 'system', content: `${SYSTEM}\nAnalyse cardio history and prescribe zone-based improvements. Return JSON: {"currentLevel","weeklyVolumeMin","zoneBreakdown":{"Z1":pct,"Z2":pct,"Z3":pct,"Z4":pct,"Z5":pct},"prescription":[],"goals":[]}` },
    { role: 'user', content: JSON.stringify({ ctx: ctxBrief(ctx), cardio }) },
  ], { json: true });
  return data;
}

async function accountabilityCoach(userId) {
  const report = await analytics.weeklyReport(userId);
  const reply = await run(userId, 'ACCOUNTABILITY_COACH', [
    { role: 'system', content: `${SYSTEM}\nDo a weekly check-in: review the numbers, celebrate wins, address misses, and set 2-3 intentions for next week. Warm, direct, concise.` },
    { role: 'user', content: JSON.stringify(report) },
  ], { temperature: 0.8 });
  return { report, reply: reply.content };
}

async function annualWrapNarrative(userId, year = new Date().getFullYear()) {
  const stats = await analytics.annualWrap(userId, year);
  const reply = await run(userId, 'ANNUAL_WRAP', [
    { role: 'system', content: 'Write a punchy, celebratory Spotify-Wrapped-style annual fitness recap (150-250 words, second person, a few emoji allowed). Use only the provided stats.' },
    { role: 'user', content: JSON.stringify(stats) },
  ], { temperature: 0.9 });
  return { stats, narrative: reply.content };
}

async function motivationalQuote(userId, input = {}) {
  const ctx = await getUser(userId);
  const reply = await run(userId, 'MOTIVATIONAL_QUOTE', [
    { role: 'system', content: 'Give ONE short original motivational line tailored to this member, plus an optional attribution-free maxim. Max 40 words.' },
    { role: 'user', content: JSON.stringify({ goal: input.goal, mood: input.mood }) },
  ], { temperature: 1.0, maxTokens: 200 });
  return { quote: reply.content };
}

async function exerciseAlternatives(userId, { exerciseId, reason, equipment } = {}) {
  let exercise = null;
  if (exerciseId) exercise = await prisma.exercise.findUnique({ where: { id: exerciseId }, select: { name: true, primaryMuscles: true, equipment: true, category: true } });
  if (!exercise && !reason) throw badRequest('exerciseId or reason is required');
  const { data } = await run(userId, 'EXERCISE_ALTERNATIVES', [
    { role: 'system', content: 'Suggest exercise alternatives that train the same muscle(s) given an injury, missing equipment, or preference. Return JSON: {"alternatives":[{"name","why","muscles":[],"equipment","difficulty":"BEGINNER|INTERMEDIATE|ADVANCED"}]}' },
    { role: 'user', content: JSON.stringify({ exercise, reason, equipment }) },
  ], { json: true });
  return data;
}

async function formChecker(userId, { exercise, description } = {}) {
  if (!exercise || !description) throw badRequest('exercise and description are required');
  const reply = await run(userId, 'FORM_CHECKER', [
    { role: 'system', content: `${SYSTEM}\nThe member describes how they perform an exercise. Identify likely form faults and cue corrections. Return JSON: {"issues":[{"problem","cue","risk"}],"overall","safetyNote"}` },
    { role: 'user', content: JSON.stringify({ exercise, description }) },
  ], { json: true });
  return reply.data;
}

/* ---------- Conversations + generated plans ---------- */

async function listConversations(userId) {
  return prisma.aiConversation.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, feature: true, updatedAt: true } });
}
async function getConversation(userId, id) {
  const c = await prisma.aiConversation.findFirst({ where: { id, userId } });
  if (!c) throw notFound('Conversation not found');
  return c;
}
async function deleteConversation(userId, id) {
  const c = await prisma.aiConversation.findFirst({ where: { id, userId } });
  if (!c) throw notFound('Conversation not found');
  await prisma.aiConversation.delete({ where: { id } });
  return { deleted: true };
}

async function listGeneratedPlans(userId, feature) {
  return prisma.aiGeneratedPlan.findMany({ where: { userId, ...(feature ? { feature } : {}) }, orderBy: { createdAt: 'desc' }, select: { id: true, feature: true, appliedRef: true, createdAt: true, payload: true } });
}
async function getGeneratedPlan(userId, id) {
  const p = await prisma.aiGeneratedPlan.findFirst({ where: { id, userId } });
  if (!p) throw notFound('Generated plan not found');
  return p;
}
async function markPlanApplied(userId, id, appliedRef) {
  const p = await prisma.aiGeneratedPlan.findFirst({ where: { id, userId } });
  if (!p) throw notFound('Generated plan not found');
  return prisma.aiGeneratedPlan.update({ where: { id }, data: { appliedRef } });
}

async function usageSummary(userId) {
  const since = startOfToday();
  const month = new Date(Date.now() - 30 * 864e5);
  const [today, monthAgg, byFeature] = await Promise.all([
    getQuota(userId),
    prisma.aiUsageLog.aggregate({ where: { userId, createdAt: { gte: month } }, _count: true, _sum: { promptTokens: true, completionTokens: true, estimatedCost: true } }),
    prisma.aiUsageLog.groupBy({ by: ['feature'], where: { userId, createdAt: { gte: month } }, _count: true, orderBy: { _count: { feature: 'desc' } } }),
  ]);
  return { today, month: { requests: monthAgg._count, promptTokens: monthAgg._sum.promptTokens || 0, completionTokens: monthAgg._sum.completionTokens || 0, estimatedCostUsd: Number(monthAgg._sum.estimatedCost || 0).toFixed(4) }, byFeature };
}

module.exports = {
  getQuota, usageSummary,
  workoutPlan, mealPlan, coachChat, formChecker, progressAnalyzer, injuryRisk,
  calorieEstimator, foodRecognition, workoutModification, plateauBuster,
  deloadRecommendation, supplementAdvisor, recoveryOptimizer, strengthPredictor,
  cardioOptimizer, accountabilityCoach, annualWrapNarrative, motivationalQuote, exerciseAlternatives,
  listConversations, getConversation, deleteConversation, listGeneratedPlans, getGeneratedPlan, markPlanApplied,
};
