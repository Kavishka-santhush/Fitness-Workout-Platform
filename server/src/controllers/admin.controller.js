const admin = require('../services/admin.service');
const analytics = require('../services/analytics.service');
const { ok, paginated } = require('../utils/response.util');

const dashboard = async (req, res) => ok(res, await analytics.adminDashboard());

const listUsers = async (req, res) => { const { items, total, page, limit } = await admin.listUsers(req.query); paginated(res, items, { page, limit, total }); };
const getUser = async (req, res) => ok(res, await admin.getUserDetail(req.params.id));
const ban = async (req, res) => ok(res, await admin.setBanned(req.user, req.params.id, { banned: true, reason: req.body.reason }, req.ip), 'User banned');
const unban = async (req, res) => ok(res, await admin.setBanned(req.user, req.params.id, { banned: false }, req.ip), 'User unbanned');
const setRole = async (req, res) => ok(res, await admin.setRole(req.user, req.params.id, req.body, req.ip), 'Role updated');
const setSubscription = async (req, res) => ok(res, await admin.setSubscription(req.user, req.params.id, req.body, req.ip), 'Subscription updated');

const pendingTrainers = async (req, res) => { const { items, total, page, limit } = await admin.pendingTrainers(req.query); paginated(res, items, { page, limit, total }); };
const reviewTrainer = async (req, res) => ok(res, await admin.reviewTrainer(req.user, req.params.id, req.body, req.ip), 'Trainer review saved');

const pendingExercises = async (req, res) => { const { items, total, page, limit } = await admin.pendingExercises(req.query); paginated(res, items, { page, limit, total }); };
const reviewExercise = async (req, res) => ok(res, await admin.reviewExercise(req.user, req.params.id, req.body, req.ip), 'Exercise review saved');

const pendingPrograms = async (req, res) => { const { items, total, page, limit } = await admin.pendingPrograms(req.query); paginated(res, items, { page, limit, total }); };
const reviewProgram = async (req, res) => ok(res, await admin.reviewProgram(req.user, req.params.id, req.body, req.ip), 'Program review saved');
const featureProgram = async (req, res) => ok(res, await admin.featureProgram(req.user, req.params.id, req.body, req.ip), 'Program featured state updated');

const listReports = async (req, res) => { const { items, total, page, limit } = await admin.listReports(req.query); paginated(res, items, { page, limit, total }); };
const resolveReport = async (req, res) => ok(res, await admin.resolveReport(req.user, req.params.id, req.body, req.ip), 'Report resolved');

const getSettings = async (req, res) => ok(res, await admin.getSettings());
const setSetting = async (req, res) => ok(res, await admin.setSetting(req.user, req.body, req.ip), 'Setting saved');

const listAuditLogs = async (req, res) => { const { items, total, page, limit } = await admin.listAuditLogs(req.query); paginated(res, items, { page, limit, total }); };

module.exports = { dashboard, listUsers, getUser, ban, unban, setRole, setSubscription, pendingTrainers, reviewTrainer, pendingExercises, reviewExercise, pendingPrograms, reviewProgram, featureProgram, listReports, resolveReport, getSettings, setSetting, listAuditLogs };
