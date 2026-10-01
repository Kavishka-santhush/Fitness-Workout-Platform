const nutritionService = require('../services/nutrition.service');
const calorieCalc = require('../services/calorieCalculator.service');
const { ok, created, paginated } = require('../utils/response.util');

/* Goals + calculator */
const getGoal = async (req, res) => ok(res, await nutritionService.getGoal(req.user.id));
const targetToday = async (req, res) => ok(res, await nutritionService.effectiveTargetToday(req.user.id));
const calculate = async (req, res) => ok(res, nutritionService.calculate(req.body));
const recalculate = async (req, res) => ok(res, await nutritionService.recalculate(req.user.id, { preset: req.body.preset }), 'Goal recalculated');
const applyPreset = async (req, res) => ok(res, await nutritionService.applyPreset(req.user.id, req.body.preset), 'Preset applied');
const setCustom = async (req, res) => ok(res, await nutritionService.setCustomMacros(req.user.id, req.body), 'Macros updated');
const setCycling = async (req, res) => ok(res, await nutritionService.setCalorieCycling(req.user.id, req.body), 'Calorie cycling updated');
const setWater = async (req, res) => ok(res, await nutritionService.setWaterTarget(req.user.id, req.body.waterTargetMl), 'Water target updated');
const netCalories = async (req, res) => ok(res, await calorieCalc.netCalories(req.user.id, req.query.date ? new Date(req.query.date) : new Date()));

/* Meal plans */
const createPlan = async (req, res) => created(res, await nutritionService.createPlan(req.user.id, req.body), 'Plan created');
const updatePlan = async (req, res) => ok(res, await nutritionService.updatePlan(req.user.id, req.params.id, req.body), 'Plan updated');
const deletePlan = async (req, res) => { await nutritionService.deletePlan(req.user.id, req.params.id); ok(res, null, 'Plan deleted'); };
const myPlans = async (req, res) => ok(res, await nutritionService.listMyPlans(req.user.id));
const browsePlans = async (req, res) => {
  const { items, page, limit, total } = await nutritionService.browsePlans(req.user.id, req.query);
  paginated(res, items, { page, limit, total });
};
const getPlan = async (req, res) => ok(res, await nutritionService.getPlan(req.user.id, req.params.id));
const followPlan = async (req, res) => ok(res, await nutritionService.followPlan(req.user.id, req.params.id), 'Plan followed');
const unfollowPlan = async (req, res) => ok(res, await nutritionService.unfollowPlan(req.user.id, req.params.id), 'Plan unfollowed');
const todaysPlan = async (req, res) => ok(res, await nutritionService.todaysPlan(req.user.id, req.query.date));
const logPlanMeal = async (req, res) => created(res, await nutritionService.logPlanMeal(req.user.id, req.params.planMealId), 'Plan meal logged');

/* Grocery lists */
const generateGrocery = async (req, res) => created(res, await nutritionService.generateGroceryList(req.user.id, req.body), 'Grocery list generated');
const listGrocery = async (req, res) => ok(res, await nutritionService.listGroceryLists(req.user.id));
const getGrocery = async (req, res) => ok(res, await nutritionService.getGroceryList(req.user.id, req.params.id));
const updateGrocery = async (req, res) => ok(res, await nutritionService.updateGroceryList(req.user.id, req.params.id, req.body.items), 'Grocery list updated');
const groceryPdf = async (req, res) => {
  const pdf = await nutritionService.groceryListPdf(req.user.id, req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="grocery-${req.params.id}.pdf"`);
  res.send(pdf);
};

module.exports = {
  getGoal, targetToday, calculate, recalculate, applyPreset, setCustom, setCycling, setWater, netCalories,
  createPlan, updatePlan, deletePlan, myPlans, browsePlans, getPlan, followPlan, unfollowPlan, todaysPlan, logPlanMeal,
  generateGrocery, listGrocery, getGrocery, updateGrocery, groceryPdf,
};
