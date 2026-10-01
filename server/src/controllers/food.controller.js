const foodService = require('../services/food.service');
const { ok, created, paginated } = require('../utils/response.util');

const search = async (req, res) => {
  const { items, page, limit, total } = await foodService.search({ ...req.query, userId: req.user?.id });
  paginated(res, items, { page, limit, total });
};
const favorites = async (req, res) => ok(res, await foodService.favorites(req.user.id));
const toggleFavorite = async (req, res) => ok(res, await foodService.toggleFavorite(req.user.id, req.params.id), 'Favorite toggled');
const recent = async (req, res) => ok(res, await foodService.recent(req.user.id, +req.query.limit || 15));
const createCustom = async (req, res) => created(res, await foodService.createCustom(req.user.id, req.body), 'Custom food created');
const createRecipe = async (req, res) => created(res, await foodService.createRecipe(req.user.id, req.body), 'Recipe created');
const listRecipes = async (req, res) => ok(res, await foodService.listRecipes(req.user.id));
const getRecipe = async (req, res) => ok(res, await foodService.getRecipe(req.params.id, req.user.id));
const deleteRecipe = async (req, res) => { await foodService.deleteRecipe(req.params.id, req.user.id); ok(res, null, 'Recipe deleted'); };

module.exports = { search, favorites, toggleFavorite, recent, createCustom, createRecipe, listRecipes, getRecipe, deleteRecipe };
