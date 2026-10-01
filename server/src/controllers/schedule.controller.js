const scheduleService = require('../services/schedule.service');
const { ok, created } = require('../utils/response.util');

const add = async (req, res) => created(res, await scheduleService.add(req.user.id, req.body), 'Added to calendar');
const bulkPlan = async (req, res) => created(res, await scheduleService.bulkPlan(req.user.id, req.body), 'Week planned');
const range = async (req, res) => ok(res, await scheduleService.range(req.user.id, req.query));
const week = async (req, res) => ok(res, await scheduleService.week(req.user.id, req.query));
const today = async (req, res) => ok(res, await scheduleService.today(req.user.id));
const update = async (req, res) => ok(res, await scheduleService.update(req.user.id, req.params.id, req.body), 'Updated');
const setStatus = async (req, res) => ok(res, await scheduleService.setStatus(req.user.id, req.params.id, req.body.status), 'Status updated');
const reschedule = async (req, res) => ok(res, await scheduleService.reschedule(req.user.id, req.params.id, req.body), 'Rescheduled');
const remove = async (req, res) => { await scheduleService.remove(req.user.id, req.params.id); ok(res, null, 'Removed'); };
const setRestDay = async (req, res) => ok(res, await scheduleService.setRestDay(req.user.id, req.body), 'Rest day set');
const rollOver = async (req, res) => ok(res, await scheduleService.rollOver(req.user.id, req.body), 'Rolled over');
const upcoming = async (req, res) => ok(res, await scheduleService.upcoming(req.user.id, req.query));

module.exports = { add, bulkPlan, range, week, today, update, setStatus, reschedule, remove, setRestDay, rollOver, upcoming };
