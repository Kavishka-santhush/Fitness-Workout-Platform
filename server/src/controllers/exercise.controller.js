const exerciseService = require('../services/exercise.service');
const { ok, created, paginated } = require('../utils/response.util');

const list = async (req, res) => {
  const { items, page, limit, total } = await exerciseService.list(req.query);
  paginated(res, items, { page, limit, total });
};

const get = async (req, res) => ok(res, await exerciseService.getById(req.params.id, req.user?.id));

const toggleFavorite = async (req, res) => ok(res, await exerciseService.toggleFavorite(req.user.id, req.params.id), 'Favorite toggled');

const favorites = async (req, res) => ok(res, await exerciseService.listFavorites(req.user.id));

const rate = async (req, res) => ok(res, await exerciseService.rate(req.user.id, req.params.id, req.body), 'Rating saved');

const history = async (req, res) => ok(res, await exerciseService.personalHistory(req.user.id));

/* Admin + community */

const create = async (req, res) => {
  const isCommunity = req.user.role === 'MEMBER';
  const files = { video: req.files?.video?.[0], images: req.files?.images || [] };
  created(res, await exerciseService.create(req.body, { userId: req.user.id, isCommunity, files }));
};

const update = async (req, res) => ok(res, await exerciseService.update(req.params.id, req.body), 'Exercise updated');

const uploadMedia = async (req, res) => {
  const files = { video: req.files?.video?.[0], images: req.files?.images || [] };
  ok(res, await exerciseService.attachMedia(req.params.id, files), 'Media attached');
};

const remove = async (req, res) => {
  await exerciseService.remove(req.params.id);
  ok(res, null, 'Exercise deleted');
};

const pending = async (req, res) => {
  const { items, page, limit, total } = await exerciseService.pendingSubmissions(req.query);
  paginated(res, items, { page, limit, total });
};

const review = async (req, res) => ok(res, await exerciseService.reviewSubmission(req.params.id, req.body.decision, req.user.id), 'Submission reviewed');

module.exports = { list, get, toggleFavorite, favorites, rate, history, create, update, uploadMedia, remove, pending, review };
