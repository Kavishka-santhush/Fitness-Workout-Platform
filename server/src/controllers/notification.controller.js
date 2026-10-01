const notificationService = require('../services/notification.service');
const { ok, paginated } = require('../utils/response.util');
const prisma = require('../lib/prisma');

const list = async (req, res) => {
  const { items, page, limit, total } = await notificationService.listMine(req.user.id, req.query);
  paginated(res, items, { page, limit, total });
};

const unreadCount = async (req, res) =>
  ok(res, { count: await prisma.notification.count({ where: { userId: req.user.id, readAt: null } }) });

const markRead = async (req, res) => {
  await notificationService.markRead(req.user.id, req.params.id);
  ok(res, null, 'Marked read');
};

const markAllRead = async (req, res) => {
  await notificationService.markAllRead(req.user.id);
  ok(res, null, 'All marked read');
};

const registerDevice = async (req, res) => ok(res, await notificationService.registerDevice(req.user.id, req.body), 'Device registered');
const unregisterDevice = async (req, res) => {
  await notificationService.unregisterDevice(req.user.id, req.params.token);
  ok(res, null, 'Device unregistered');
};
const registerWebPush = async (req, res) => ok(res, await notificationService.registerWebPush(req.user.id, req.body), 'Web push registered');
const savePrefs = async (req, res) => ok(res, await notificationService.savePrefs(req.user.id, req.body), 'Preferences saved');

module.exports = { list, unreadCount, markRead, markAllRead, registerDevice, unregisterDevice, registerWebPush, savePrefs };
