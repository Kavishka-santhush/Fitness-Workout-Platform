const workoutService = require('../services/workout.service');
const { ok, created, paginated } = require('../utils/response.util');

const list = async (req, res) => {
  const { page, limit, visibility, tag, template, q } = req.query;
  const { items, total } = await workoutService.list({ userId: req.user?.id, visibility, tag, template: template === 'true', q, page: +page || 1, limit: +limit || 20 });
  paginated(res, items, { page: +page || 1, limit: +limit || 20, total });
};

const get = async (req, res) => ok(res, await workoutService.get(req.params.id, req.user));

const create = async (req, res) => {
  await workoutService.assertPlanLimit(req.user);
  created(res, await workoutService.create(req.user.id, req.body, { thumbnail: req.file }), 'Workout created');
};

const update = async (req, res) => ok(res, await workoutService.update(req.params.id, req.user.id, req.body), 'Workout updated');

const reorder = async (req, res) => ok(res, await workoutService.reorder(req.params.id, req.user.id, req.body.order), 'Order saved');

const superset = async (req, res) => ok(res, await workoutService.linkSuperset(req.params.id, req.body.exerciseRowId, req.body.withRowId), 'Superset linked');

const circuit = async (req, res) => ok(res, await workoutService.createCircuit(req.params.id, req.user.id, req.body), 'Circuit created');

const duplicate = async (req, res) => created(res, await workoutService.duplicate(req.params.id, req.user.id), 'Workout duplicated');

const template = async (req, res) => ok(res, await workoutService.setTemplate(req.params.id, req.user.id, Boolean(req.body.isTemplate)), 'Template flag updated');

const remove = async (req, res) => {
  await workoutService.remove(req.params.id, req.user.id);
  ok(res, null, 'Workout deleted');
};

module.exports = { list, get, create, update, reorder, superset, circuit, duplicate, template, remove };
