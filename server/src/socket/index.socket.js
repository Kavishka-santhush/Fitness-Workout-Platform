/**
 * Socket.io bootstrap + authentication.
 *
 * Clients connect with a Clerk JWT in `handshake.auth.token`. We verify it,
 * resolve our PostgreSQL User row, and auto-join per-user + role rooms. All
 * domain handlers (live class, challenge, leaderboard, notification) are bound
 * to the shared `io` here; the notification service is given an io accessor via
 * `bindIo` so REST-side events can fan out in real time too.
 */
const { verifyToken } = require('@clerk/backend');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger.util');
const notificationService = require('../services/notification.service');

let ioRef = null;
const getIo = () => ioRef;

/** Verify the Clerk JWT and load our user row. Throws to reject the socket. */
async function authenticate(socket) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) throw new Error('Authentication token required');
  const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
  const user = await prisma.user.findUnique({
    where: { clerkUserId: claims.sub },
    select: { id: true, role: true, displayName: true, avatarUrl: true, isBanned: true },
  });
  if (!user) throw new Error('User not found');
  if (user.isBanned) throw new Error('Account suspended');
  return user;
}

function registerCore(socket, user) {
  socket.data.user = user;
  socket.join(`user:${user.id}`);
  socket.join(`role:${user.role}`);

  socket.on('ping', (cb) => typeof cb === 'function' && cb({ pong: Date.now() }));

  // Generic room helpers used by the class/challenge/leaderboard UIs.
  socket.on('room:join', (room) => { if (typeof room === 'string') socket.join(room); });
  socket.on('room:leave', (room) => { if (typeof room === 'string') socket.leave(room); });
}

function init(io) {
  ioRef = io;
  notificationService.bindIo(getIo);

  io.use(async (socket, next) => {
    try {
      const user = await authenticate(socket);
      socket.data.user = user;
      next();
    } catch (err) {
      logger.warn(`socket auth rejected: ${err.message}`);
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    registerCore(socket, user);
    logger.debug(`socket connected user=${user.id} sid=${socket.id}`);
    socket.emit('connected', { userId: user.id, at: Date.now() });

    // Bind domain-specific handlers (each guards its own events/rooms).
    require('./liveClass.socket')(io, socket, user);
    require('./challenge.socket')(io, socket, user);
    require('./leaderboard.socket')(io, socket, user);
    require('./notification.socket')(io, socket, user);

    socket.on('disconnect', (reason) => {
      logger.debug(`socket disconnected user=${user.id} (${reason})`);
    });
  });

  return io;
}

module.exports = { init, getIo };
