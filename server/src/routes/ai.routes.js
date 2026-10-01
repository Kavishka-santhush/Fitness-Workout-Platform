const express = require('express');
const { z } = require('zod');
const ai = require('../controllers/ai.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate, idParam } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();
router.use(requireAuth);

const msg = z.string().min(1).max(4000);

router.get('/quota', asyncHandler(ai.quota));
router.get('/usage', asyncHandler(ai.usage));

router.post('/workout-plan', validate({ body: z.object({ goal: z.string().optional(), days: z.coerce.number().int().optional(), equipment: z.array(z.string()).optional(), notes: z.string().max(2000).optional() }).passthrough() }), asyncHandler(ai.workoutPlan));
router.post('/meal-plan', validate({ body: z.object({ calories: z.coerce.number().optional(), dietary: z.string().optional(), allergies: z.array(z.string()).optional(), cuisine: z.string().optional(), notes: z.string().max(2000).optional() }).passthrough() }), asyncHandler(ai.mealPlan));
router.post('/coach-chat', validate({ body: z.object({ message: msg, conversationId: z.string().optional() }) }), asyncHandler(ai.coachChat));
router.post('/form-checker', validate({ body: z.object({ exercise: z.string().min(2), description: msg }) }), asyncHandler(ai.formChecker));
router.get('/progress-analyzer', asyncHandler(ai.progressAnalyzer));
router.post('/injury-risk', validate({ body: z.object({ focus: z.string().optional() }).passthrough() }), asyncHandler(ai.injuryRisk));
router.post('/calorie-estimator', validate({ body: z.object({ meal: msg }) }), asyncHandler(ai.calorieEstimator));
router.post('/food-recognition', validate({ body: z.object({ description: msg, brand: z.string().optional() }) }), asyncHandler(ai.foodRecognition));
router.post('/workout-modification', validate({ body: z.object({ workoutId: z.string().optional(), limitation: msg }) }), asyncHandler(ai.workoutModification));
router.get('/plateau-buster', asyncHandler(ai.plateauBuster));
router.get('/deload', asyncHandler(ai.deload));
router.post('/supplement-advisor', validate({ body: z.object({ goal: z.string().optional(), diet: z.string().optional() }).passthrough() }), asyncHandler(ai.supplement));
router.get('/recovery', asyncHandler(ai.recovery));
router.post('/strength-predictor', validate({ body: z.object({ lifts: z.array(z.object({ exercise: z.string(), weight: z.number(), reps: z.number().int().optional() })).optional() }).passthrough() }), asyncHandler(ai.strength));
router.get('/cardio-optimizer', asyncHandler(ai.cardio));
router.get('/accountability', asyncHandler(ai.accountability));
router.get('/annual-wrap', validate({ query: z.object({ year: z.coerce.number().int().min(2000).max(2100).optional() }) }), asyncHandler(ai.annualWrap));
router.get('/quote', validate({ query: z.object({ goal: z.string().optional(), mood: z.string().optional() }) }), asyncHandler(ai.quote));
router.post('/exercise-alternatives', validate({ body: z.object({ exerciseId: z.string().optional(), reason: z.string().optional(), equipment: z.array(z.string()).optional() }) }), asyncHandler(ai.alternatives));

/* Conversation + generated-plan history */
router.get('/conversations', asyncHandler(ai.listConversations));
router.get('/conversations/:id', validate({ params: idParam }), asyncHandler(ai.getConversation));
router.delete('/conversations/:id', validate({ params: idParam }), asyncHandler(ai.deleteConversation));
router.get('/plans', validate({ query: z.object({ feature: z.string().optional() }) }), asyncHandler(ai.listPlans));
router.get('/plans/:id', validate({ params: idParam }), asyncHandler(ai.getPlan));
router.post('/plans/:id/apply', validate({ params: idParam, body: z.object({ appliedRef: z.string().min(1) }) }), asyncHandler(ai.applyPlan));

module.exports = router;
