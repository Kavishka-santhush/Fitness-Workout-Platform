const challengeService = require('../services/challenge.service');
const { ok, created, paginated } = require('../utils/response.util');

const create = async (req, res) => created(res, await challengeService.create(req.user.id, req.body), 'Challenge created');
const browse = async (req, res) => {
  const { items, page, limit, total } = await challengeService.browse(req.user.id, req.query);
  paginated(res, items, { page, limit, total });
};
const getOne = async (req, res) => ok(res, await challengeService.getOne(req.user.id, req.params.id));
const enroll = async (req, res) => created(res, await challengeService.enroll(req.user.id, req.params.id), 'Enrolled');
const joinTeam = async (req, res) => ok(res, await challengeService.joinTeam(req.user.id, req.params.id, req.body), 'Joined team');
const leaderboard = async (req, res) => ok(res, await challengeService.leaderboard(req.params.id, req.query));
const mine = async (req, res) => ok(res, await challengeService.myChallenges(req.user.id));
const refresh = async (req, res) => ok(res, await challengeService.refreshChallenge(req.params.id), 'Leaderboard refreshed');

module.exports = { create, browse, getOne, enroll, joinTeam, leaderboard, mine, refresh };
