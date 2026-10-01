const achievementService = require('../services/achievement.service');
const { ok } = require('../utils/response.util');

const gallery = async (req, res) => ok(res, await achievementService.gallery(req.user.id));
const leaderboard = async (req, res) => ok(res, await achievementService.leaderboard(req.query));
const evaluate = async (req, res) => ok(res, { unlocked: await achievementService.evaluateAll(req.user.id) }, 'Achievements re-evaluated');

module.exports = { gallery, leaderboard, evaluate };
