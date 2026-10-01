/**
 * Server entry point — HTTP + Socket.io + cron jobs.
 * package.json "main"/"start"/"dev" point here (server/index.js).
 */
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./src/app');
const logger = require('./src/utils/logger.util');
const socketIndex = require('./src/socket/index.socket');

const PORT = parseInt(process.env.PORT || '5000', 10);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});
socketIndex.init(io);

// Expose io to anything that imports the app directly (tests, ad-hoc emits).
app.set('io', io);

/* ---------- Cron jobs ---------- */
if (process.env.DISABLE_JOBS !== 'true') {
  require('./src/jobs/workoutReminder.job').start();
  require('./src/jobs/streakCheck.job').start();
  require('./src/jobs/challengeUpdate.job').start();
  require('./src/jobs/weeklyReport.job').start();
}

server.listen(PORT, () => {
  logger.info(`🚀 API listening on :${PORT} (${process.env.NODE_ENV || 'development'})`);
});

/* ---------- Graceful shutdown ---------- */
function shutdown(signal) {
  logger.warn(`${signal} received — shutting down gracefully`);
  io.close();
  server.close(async () => {
    try {
      const prisma = require('./src/lib/prisma');
      await prisma.$disconnect();
    } catch (err) {
      logger.error(`prisma disconnect failed: ${err.message}`);
    }
    process.exit(0);
  });
  // Force-exit if connections refuse to drain.
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => logger.error(`Unhandled rejection: ${reason}`));
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.stack || err}`);
});

module.exports = { app, server, io };
