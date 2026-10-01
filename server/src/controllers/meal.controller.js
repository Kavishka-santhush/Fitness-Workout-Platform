const mealService = require('../services/meal.service');
const { ok, created } = require('../utils/response.util');

const getDay = async (req, res) => ok(res, await mealService.getDay(req.user.id, req.query.date));
const addEntry = async (req, res) => created(res, await mealService.addEntry(req.user.id, req.body), 'Entry logged');
const updateEntry = async (req, res) => ok(res, await mealService.updateEntry(req.user.id, req.params.id, req.body), 'Entry updated');
const deleteEntry = async (req, res) => { await mealService.deleteEntry(req.user.id, req.params.id); ok(res, null, 'Entry removed'); };
const copyDay = async (req, res) => ok(res, await mealService.copyDay(req.user.id, req.body), 'Day copied');
const templates = async (req, res) => ok(res, await mealService.templates(req.user.id));

const logWater = async (req, res) => created(res, await mealService.logWater(req.user.id, req.body), 'Water logged');
const deleteWater = async (req, res) => { await mealService.deleteWater(req.user.id, req.params.id); ok(res, null, 'Water log removed'); };

const dailySummary = async (req, res) => ok(res, await mealService.dailySummary(req.user.id, req.query));
const weeklySummary = async (req, res) => ok(res, await mealService.weeklySummary(req.user.id, req.query));
const adherence = async (req, res) => ok(res, await mealService.adherence(req.user.id, { days: +req.query.days || 30 }));

const exportCsv = async (req, res) => {
  const csv = await mealService.exportCsv(req.user.id, req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="food-diary.csv"');
  res.send(csv);
};

module.exports = { getDay, addEntry, updateEntry, deleteEntry, copyDay, templates, logWater, deleteWater, dailySummary, weeklySummary, adherence, exportCsv };
