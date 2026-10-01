/**
 * Challenge socket handler — subscribe enrolled members to a challenge room so
 * they receive live leaderboard/milestone updates pushed by the service and the
 * challenge-refresh cron job. Room convention: `challenge:<challengeId>`.
 */
const challenge = require('../services/challenge.service');

const roomOf = (challengeId) => `challenge:${challengeId}`;

/** Broadcast a fresh standings snapshot to everyone watching a challenge. */
async function pushStandings(io, challengeId) {
  try {
    const board = await challenge.leaderboard(challengeId);
    io.to(roomOf(challengeId)).emit('challenge:standings', { challengeId, ...board });
  } catch { /* challenge may be closed */ }
}

module.exports = function bindChallenge(io, socket, user) {
  socket.on('challenge:join', async ({ challengeId }, cb) => {
    try {
      socket.join(roomOf(challengeId));
      const [detail, board] = await Promise.all([
        challenge.getOne(user.id, challengeId).catch(() => null),
        challenge.leaderboard(challengeId).catch(() => null),
      ]);
      cb && cb({ ok: true, challenge: detail, standings: board });
      socket.emit('challenge:standings', { challengeId, ...(board || {}) });
    } catch (err) {
      cb && cb({ error: err.message });
    }
  });

  socket.on('challenge:leave', ({ challengeId }) => socket.leave(roomOf(challengeId)));

  // A member finishing a milestone asks us to recompute + rebroadcast.
  socket.on('challenge:refresh', async ({ challengeId }, cb) => {
    try {
      await challenge.refreshChallenge(challengeId);
      await pushStandings(io, challengeId);
      cb && cb({ ok: true });
    } catch (err) {
      cb && cb({ error: err.message });
    }
  });
};

module.exports.roomOf = roomOf;
module.exports.pushStandings = pushStandings;
