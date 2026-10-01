const sessionService = require('../services/session.service');
const { ok, created, paginated } = require('../utils/response.util');

const start = async (req, res) => created(res, await sessionService.start(req.user.id, req.body), 'Session started');
const autoSave = async (req, res) => ok(res, await sessionService.autoSave(req.user.id, req.params.id, req.body), 'Auto-saved');
const pause = async (req, res) => ok(res, await sessionService.pause(req.user.id, req.params.id), 'Paused');
const resume = async (req, res) => ok(res, await sessionService.resume(req.user.id, req.params.id), 'Resumed');

const logSet = async (req, res) => {
  const { set, prs } = await sessionService.logSet(req.user.id, req.params.id, req.body);
  ok(res, { set, prs }, prs.length ? 'PR! 🎉' : 'Set logged');
};

const skip = async (req, res) => ok(res, await sessionService.skipExercise(req.user.id, req.params.id, req.body), 'Exercise skipped');
const swap = async (req, res) => ok(res, await sessionService.swapExercise(req.user.id, req.params.id, req.body), 'Exercise swapped');

const complete = async (req, res) => ok(res, await sessionService.complete(req.user.id, req.params.id, req.body), 'Workout complete');
const savePartial = async (req, res) => ok(res, await sessionService.savePartial(req.user.id, req.params.id, req.body), 'Partial workout saved');
const abandon = async (req, res) => ok(res, await sessionService.abandon(req.user.id, req.params.id), 'Session abandoned');

const attachPhoto = async (req, res) => created(res, await sessionService.attachPhoto(req.user.id, req.params.id, req.file), 'Photo attached');

const get = async (req, res) => ok(res, await sessionService.getSession(req.user.id, req.params.id));
const history = async (req, res) => {
  const { items, page, limit, total } = await sessionService.history(req.user.id, req.query);
  paginated(res, items, { page, limit, total });
};

const logCardio = async (req, res) => created(res, await sessionService.logCardio(req.user.id, req.body), 'Cardio logged');
const saveRoute = async (req, res) => created(res, await sessionService.saveRoute(req.user.id, req.body), 'Route saved');
const routes = async (req, res) => ok(res, await sessionService.listRoutes(req.user.id));
const shareRoute = async (req, res) => ok(res, await sessionService.shareRoute(req.user.id, req.params.id, Boolean(req.body.isShared)), 'Route share updated');

module.exports = { start, autoSave, pause, resume, logSet, skip, swap, complete, savePartial, abandon, attachPhoto, get, history, logCardio, saveRoute, routes, shareRoute };
