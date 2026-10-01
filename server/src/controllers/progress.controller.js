const progressService = require('../services/progress.service');
const { ok, created, paginated } = require('../utils/response.util');

/* Photos */
const addPhoto = async (req, res) => created(res, await progressService.addPhoto(req.user.id, req.file, req.body), 'Photo added');
const updatePhoto = async (req, res) => ok(res, await progressService.updatePhoto(req.user.id, req.params.id, req.body), 'Photo updated');
const deletePhoto = async (req, res) => { await progressService.deletePhoto(req.user.id, req.params.id); ok(res, null, 'Photo deleted'); };
const photoTimeline = async (req, res) => ok(res, await progressService.photoTimeline(req.user.id));
const beforeAfter = async (req, res) => ok(res, await progressService.beforeAfter(req.user.id, req.query.pose));

/* Charts */
const weightChart = async (req, res) => ok(res, await progressService.weightChart(req.user.id, req.query));
const workoutChart = async (req, res) => ok(res, await progressService.workoutChart(req.user.id, req.query));
const exerciseProgress = async (req, res) => ok(res, await progressService.exerciseProgress(req.user.id, req.params.exerciseId, req.query));
const cardioChart = async (req, res) => ok(res, await progressService.cardioChart(req.user.id, req.query));
const caloriesChart = async (req, res) => ok(res, await progressService.caloriesChart(req.user.id, req.query));

/* PRs */
const personalRecords = async (req, res) => {
  const { items, page, limit, total } = await progressService.personalRecords(req.user.id, req.query);
  paginated(res, items, { page, limit, total });
};
const prHistory = async (req, res) => ok(res, await progressService.prHistory(req.user.id, req.params.exerciseId));

/* Exports */
const exportAll = async (req, res) => {
  const data = await progressService.exportAll(req.user.id);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="my-data.json"');
  res.send(JSON.stringify(data, null, 2));
};
const exportWorkouts = async (req, res) => {
  const csv = await progressService.exportWorkoutsCsv(req.user.id);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="workouts.csv"');
  res.send(csv);
};

module.exports = { addPhoto, updatePhoto, deletePhoto, photoTimeline, beforeAfter, weightChart, workoutChart, exerciseProgress, cardioChart, caloriesChart, personalRecords, prHistory, exportAll, exportWorkouts };
