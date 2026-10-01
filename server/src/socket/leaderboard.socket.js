/**
 * Leaderboard socket handler — subscribe clients to a metric/period board and
 * push refreshed standings (from the periodic snapshot job) to subscribers.
 * Room convention: `leaderboard:<metric>:<period>`.
 */
const leaderboard = require('../services/leaderboard.service');

const roomOf = (metric, period) => `leaderboard:${metric}:${period}`;

/** Push a refreshed board to any subscribers. Called by the cron job. */
function pushBoard(io, { metric, period, limit = 50 }) {
  return (async () => {
    try {
      const board = await leaderboard.get({ metric, period, limit, useCache: true });
      io.to(roomOf(metric, period)).emit('leaderboard:update', { metric, period, entries: board.entries });
    } catch { /* metric unknown */ }
  })();
}

module.exports = function bindLeaderboard(io, socket, user) {
  socket.on('leaderboard:subscribe', async ({ metric = 'XP', period = 'WEEKLY', limit = 50 }, cb) => {
    try {
      const room = roomOf(metric, period);
      socket.join(room);
      const [board, rank] = await Promise.all([
        leaderboard.get({ metric, period, limit }),
        leaderboard.myRank(user.id, { metric, period }).catch(() => null),
      ]);
      cb && cb({ ok: true, metric, period, entries: board.entries, myRank: rank });
    } catch (err) {
      cb && cb({ error: err.message });
    }
  });

  socket.on('leaderboard:unsubscribe', ({ metric = 'XP', period = 'WEEKLY' }) => {
    socket.leave(roomOf(metric, period));
  });
};

module.exports.roomOf = roomOf;
module.exports.pushBoard = pushBoard;
