const ai = require('../services/ai.service');
const { ok, created } = require('../utils/response.util');

const quota = async (req, res) => ok(res, await ai.getQuota(req.user.id));
const usage = async (req, res) => ok(res, await ai.usageSummary(req.user.id));

const workoutPlan = async (req, res) => created(res, await ai.workoutPlan(req.user.id, req.body), 'Workout plan generated');
const mealPlan = async (req, res) => created(res, await ai.mealPlan(req.user.id, req.body), 'Meal plan generated');
const coachChat = async (req, res) => ok(res, await ai.coachChat(req.user.id, req.body), 'Coach replied');
const formChecker = async (req, res) => ok(res, await ai.formChecker(req.user.id, req.body));
const progressAnalyzer = async (req, res) => ok(res, await ai.progressAnalyzer(req.user.id));
const injuryRisk = async (req, res) => ok(res, await ai.injuryRisk(req.user.id, req.body));
const calorieEstimator = async (req, res) => ok(res, await ai.calorieEstimator(req.user.id, req.body));
const foodRecognition = async (req, res) => ok(res, await ai.foodRecognition(req.user.id, req.body));
const workoutModification = async (req, res) => ok(res, await ai.workoutModification(req.user.id, req.body));
const plateauBuster = async (req, res) => ok(res, await ai.plateauBuster(req.user.id));
const deload = async (req, res) => ok(res, await ai.deloadRecommendation(req.user.id));
const supplement = async (req, res) => ok(res, await ai.supplementAdvisor(req.user.id, req.body));
const recovery = async (req, res) => ok(res, await ai.recoveryOptimizer(req.user.id));
const strength = async (req, res) => ok(res, await ai.strengthPredictor(req.user.id, req.body));
const cardio = async (req, res) => ok(res, await ai.cardioOptimizer(req.user.id));
const accountability = async (req, res) => ok(res, await ai.accountabilityCoach(req.user.id));
const annualWrap = async (req, res) => ok(res, await ai.annualWrapNarrative(req.user.id, req.query.year ? parseInt(req.query.year, 10) : undefined));
const quote = async (req, res) => ok(res, await ai.motivationalQuote(req.user.id, req.query));
const alternatives = async (req, res) => ok(res, await ai.exerciseAlternatives(req.user.id, { ...req.query, ...req.body }));

const listConversations = async (req, res) => ok(res, await ai.listConversations(req.user.id));
const getConversation = async (req, res) => ok(res, await ai.getConversation(req.user.id, req.params.id));
const deleteConversation = async (req, res) => ok(res, await ai.deleteConversation(req.user.id, req.params.id), 'Conversation deleted');
const listPlans = async (req, res) => ok(res, await ai.listGeneratedPlans(req.user.id, req.query.feature));
const getPlan = async (req, res) => ok(res, await ai.getGeneratedPlan(req.user.id, req.params.id));
const applyPlan = async (req, res) => ok(res, await ai.markPlanApplied(req.user.id, req.params.id, req.body.appliedRef), 'Plan marked applied');

module.exports = { quota, usage, workoutPlan, mealPlan, coachChat, formChecker, progressAnalyzer, injuryRisk, calorieEstimator, foodRecognition, workoutModification, plateauBuster, deload, supplement, recovery, strength, cardio, accountability, annualWrap, quote, alternatives, listConversations, getConversation, deleteConversation, listPlans, getPlan, applyPlan };
