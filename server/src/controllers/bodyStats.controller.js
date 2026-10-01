const bodyStatsService = require('../services/bodyStats.service');
const { ok, created } = require('../utils/response.util');

const log = async (req, res) => created(res, await bodyStatsService.log(req.user.id, req.body), 'Body stats saved');
const list = async (req, res) => ok(res, await bodyStatsService.list(req.user.id, req.query));
const history = async (req, res) => ok(res, await bodyStatsService.history(req.user.id, req.query));
const current = async (req, res) => ok(res, await bodyStatsService.current(req.user.id));
const remove = async (req, res) => { await bodyStatsService.deleteStat(req.user.id, req.params.id); ok(res, null, 'Body stat deleted'); };

const setGoal = async (req, res) => created(res, await bodyStatsService.setGoal(req.user.id, req.body), 'Goal created');
const listGoals = async (req, res) => ok(res, await bodyStatsService.listGoals(req.user.id));
const removeGoal = async (req, res) => { await bodyStatsService.deleteGoal(req.user.id, req.params.id); ok(res, null, 'Goal deleted'); };

const estimateBodyFat = async (req, res) => ok(res, bodyStatsService.estimateBodyFat(req.body));

module.exports = { log, list, history, current, remove, setGoal, listGoals, removeGoal, estimateBodyFat };
