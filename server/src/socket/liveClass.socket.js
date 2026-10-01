/**
 * Live class socket handler — realtime chat, reactions, presence, attendance
 * and host broadcast of class state (start/end, workout cues).
 * Room convention: `class:<classId>`.
 */
const prisma = require('../lib/prisma');
const liveClass = require('../services/liveClass.service');
const logger = require('../utils/logger.util');

module.exports = function bindLiveClass(io, socket, user) {
  const roomOf = (classId) => `class:${classId}`;

  socket.on('class:join', async ({ classId }, cb) => {
    try {
      const klass = await prisma.liveClass.findUnique({ where: { id: classId }, select: { id: true, roomId: true, status: true, trainerId: true } });
      if (!klass) return cb && cb({ error: 'Class not found' });
      const enrollment = await prisma.classEnrollment.findFirst({ where: { classId, userId: user.id } });
      socket.join(roomOf(classId));
      if (enrollment) await liveClass.markAttendance(classId, user.id).catch(() => {});
      const history = await liveClass.chatHistory(classId).catch(() => []);
      io.to(roomOf(classId)).emit('class:presence', { classId, joined: user.displayName || user.id, count: io.sockets.adapter.rooms.get(roomOf(classId))?.size || 1 });
      cb && cb({ ok: true, status: klass.status, isHost: klass.trainerId === user.id, history });
    } catch (err) {
      logger.warn(`class:join failed: ${err.message}`);
      cb && cb({ error: err.message });
    }
  });

  socket.on('class:leave', ({ classId }) => {
    socket.leave(roomOf(classId));
    io.to(roomOf(classId)).emit('class:presence', { classId, left: user.displayName || user.id, count: io.sockets.adapter.rooms.get(roomOf(classId))?.size || 0 });
  });

  socket.on('class:chat', async ({ classId, body }, cb) => {
    try {
      const msg = await liveClass.postChat(user.id, classId, { body });
      io.to(roomOf(classId)).emit('class:chat', msg);
      cb && cb({ ok: true, id: msg.id });
    } catch (err) {
      cb && cb({ error: err.message });
    }
  });

  socket.on('class:reaction', async ({ classId, reaction }, cb) => {
    try {
      const msg = await liveClass.postChat(user.id, classId, { reaction });
      io.to(roomOf(classId)).emit('class:reaction', { classId, userId: user.id, reaction });
      cb && cb({ ok: true, id: msg.id });
    } catch (err) {
      cb && cb({ error: err.message });
    }
  });

  // Host controls — only the class trainer may broadcast state changes.
  socket.on('class:host-event', async ({ classId, event, payload }, cb) => {
    try {
      const klass = await prisma.liveClass.findFirst({ where: { id: classId, trainerId: user.id }, select: { id: true } });
      if (!klass) return cb && cb({ error: 'Not your class' });
      if (event === 'status') {
        const updated = await liveClass.setStatus(user.id, classId, payload.status);
        io.to(roomOf(classId)).emit('class:status', { classId, status: updated.status });
      } else {
        io.to(roomOf(classId)).emit('class:cue', { classId, event, payload, from: user.displayName });
      }
      cb && cb({ ok: true });
    } catch (err) {
      cb && cb({ error: err.message });
    }
  });
};
