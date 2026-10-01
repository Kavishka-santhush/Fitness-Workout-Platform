/**
 * Notification socket handler — per-user realtime inbox. New notifications are
 * pushed by the notification service (via io.to(`user:<id>`)); here we handle
 * the client pulling its recent list, marking read, and requesting unread count
 * on connect.
 */
const prisma = require('../lib/prisma');
const notification = require('../services/notification.service');

async function unreadCount(userId) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

module.exports = function bindNotification(io, socket, user) {
  // On connect, deliver the current unread badge.
  unreadCount(user.id).then((count) => socket.emit('notification:unread', { count }));

  socket.on('notification:list', async ({ unreadOnly = false, page = 1, limit = 30 }, cb) => {
    try {
      const result = await notification.listMine(user.id, { unreadOnly, page, limit });
      cb && cb({ ok: true, ...result });
    } catch (err) {
      cb && cb({ error: err.message });
    }
  });

  socket.on('notification:read', async ({ id }, cb) => {
    await notification.markRead(user.id, id);
    const count = await unreadCount(user.id);
    socket.emit('notification:unread', { count });
    cb && cb({ ok: true });
  });

  socket.on('notification:readAll', async (_payload, cb) => {
    await notification.markAllRead(user.id);
    socket.emit('notification:unread', { count: 0 });
    cb && cb({ ok: true });
  });
};

module.exports.unreadCount = unreadCount;
