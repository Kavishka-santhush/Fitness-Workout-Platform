const userService = require('../services/user.service');
const { ok } = require('../utils/response.util');

const updateProfile = async (req, res) => ok(res, await userService.updateProfile(req.user.id, req.body), 'Profile updated');

const uploadAvatar = async (req, res) => ok(res, await userService.setAvatar(req.user.id, req.file), 'Avatar updated');

const updateSettings = async (req, res) => ok(res, await userService.updateSettings(req.user.id, req.body), 'Settings saved');

const publicProfile = async (req, res) => ok(res, await userService.getPublicProfile(req.params.username));

const search = async (req, res) => ok(res, await userService.searchUsers(req.query.q, Math.min(+req.query.limit || 20, 50)));

const dashboard = async (req, res) => ok(res, await userService.getDashboard(req.user.id));

const deleteAccount = async (req, res) => {
  await userService.deleteAccount(req.user.id);
  ok(res, null, 'Account deleted');
};

module.exports = { updateProfile, uploadAvatar, updateSettings, publicProfile, search, dashboard, deleteAccount };
