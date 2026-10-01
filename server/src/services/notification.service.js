/**
 * Notification service — in-app (DB + Socket.io) + Expo push (mobile) +
 * email (React Email) + web push subscriptions. Respects per-user prefs,
 * quiet hours, and active-workout suppression.
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger.util');
const { sendEmail } = require('../utils/email.util');

/** Lazy socket accessor set by index.socket.js to avoid circular imports. */
let getIo = null;
function bindIo(fn) { getIo = fn; }

function isQuietNow(prefs = {}) {
  if (!prefs.quietHours) return false;
  const { start = '22:00', end = '07:00' } = prefs.quietHours;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  return s <= e ? mins >= s && mins <= e : mins >= s || mins <= e;
}

async function shouldSuppress(userId, type) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } });
  const prefs = user?.notificationPrefs || {};
  if (prefs[type] === false) return true;
  if (isQuietNow(prefs) && !['SYSTEM', 'SUBSCRIPTION'].includes(type)) return true;
  // Don't interrupt an active workout except for in-class/PR notifications
  const active = await prisma.workoutSession.findFirst({ where: { userId, status: 'ACTIVE' } });
  if (active && !['PR_BROKEN', 'ACHIEVEMENT_UNLOCKED', 'CLASS_STARTING'].includes(type)) return true;
  return false;
}

/**
 * Create a notification and fan out. type must be a NotificationType enum value.
 */
async function notify(userId, type, title, body, data = {}, { email = null, emailTemplate = null, emailProps = {} } = {}) {
  if (await shouldSuppress(userId, type)) {
    logger.debug(`Notification suppressed for ${userId} (${type})`);
    // still persist for the inbox, but do not push/email
  }
  const row = await prisma.notification.create({ data: { userId, type, title, body, data } });

  // Socket.io real-time delivery
  try {
    if (getIo) getIo().to(`user:${userId}`).emit('notification:new', row);
  } catch (err) {
    logger.warn(`socket emit failed: ${err.message}`);
  }

  // Expo push
  try {
    const devices = await prisma.deviceToken.findMany({ where: { userId } });
    if (devices.length) await sendExpoPush(devices.map((d) => d.token), row);
  } catch (err) {
    logger.warn(`expo push failed: ${err.message}`);
  }

  // Email (optional per notification)
  if (emailTemplate && email) {
    sendEmail({ to: email, templateName: emailTemplate, props: { name: row.title, ...emailProps } }).catch(() => {});
  }

  await prisma.notification.update({ where: { id: row.id }, data: { delivered: true } });
  return row;
}

async function sendExpoPush(tokens, notification) {
  const axios = require('axios');
  const messages = tokens.map((to) => ({
    to,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    sound: 'default',
  }));
  try {
    await axios.post('https://exp.host/--/api/v2/push/send', messages, {
      headers: { Accept: 'application/json', 'Accept-encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
      timeout: 10000,
    });
  } catch (err) {
    logger.warn(`Expo push error: ${err.message}`);
  }
}

async function listMine(userId, { unreadOnly = false, page = 1, limit = 30 }) {
  const where = { userId, ...(unreadOnly === 'true' || unreadOnly === true ? { readAt: null } : {}) };
  const [items, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: +limit }),
    prisma.notification.count({ where }),
  ]);
  return { items, page: +page, limit: +limit, total };
}

async function markRead(userId, id) {
  return prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
}

async function markAllRead(userId) {
  return prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

async function registerDevice(userId, { token, platform }) {
  return prisma.deviceToken.upsert({ where: { token }, create: { userId, token, platform }, update: { userId, platform } });
}

async function unregisterDevice(userId, token) {
  return prisma.deviceToken.deleteMany({ where: { token, userId } });
}

async function registerWebPush(userId, subscription) {
  return prisma.webPushSubscription.upsert({ where: { endpoint: subscription.endpoint }, create: { userId, endpoint: subscription.endpoint, keys: subscription.keys }, update: {} });
}

async function savePrefs(userId, prefs) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return prisma.user.update({ where: { id: userId }, data: { notificationPrefs: { ...(user.notificationPrefs || {}), ...prefs } } });
}

module.exports = { bindIo, notify, listMine, markRead, markAllRead, registerDevice, unregisterDevice, registerWebPush, savePrefs, sendExpoPush };
