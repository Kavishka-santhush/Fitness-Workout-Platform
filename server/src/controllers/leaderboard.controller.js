const leaderboardService = require('../services/leaderboard.service');
const { ok } = require('../utils/response.util');

const get = async (req, res) => ok(res, await leaderboardService.get({ ...req.query, limit: +req.query.limit || 50 }));
const metrics = async (req, res) => ok(res, { metrics: leaderboardService.METRICS, periods: ['DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'] });
const mine = async (req, res) => ok(res, await leaderboardService.myRank(req.user.id, req.query));

module.exports = { get, metrics, mine };
