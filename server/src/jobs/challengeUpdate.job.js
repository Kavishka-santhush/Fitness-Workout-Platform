/**
 * Challenge update job — runs every 30 minutes. Recomputes progress, ranks and
 * completions for every active challenge (which also fires milestone /
 * completion notifications inside the service), then broadcasts fresh standings
 * to anyone watching each challenge over the websocket.
 */
const cron = require('node-cron');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger.util');
const challenge = require('../services/challenge.service');
const { getIo } = require('../socket/index.socket');
const challengeSocket = require('../socket/challenge.socket');

async function tick() {
  const active = await prisma.challenge.findMany({
    where: { active: true, startDate: { lte: new Date() }, endDate: { gte: new Date() } },
    select: { id: true },
    take: 300,
  });

  // evaluateActive() refreshes every in-window challenge and notifies on milestones.
  await challenge.evaluateActive();

  const io = getIo ? getIo() : null;
  if (io) {
    for (const c of active) {
      await challengeSocket.pushStandings(io, c.id).catch(() => {});
    }
  }
  if (active.length) logger.debug(`challengeUpdate: refreshed ${active.length} active challenges`);
  return active.length;
}

function start() {
  cron.schedule('*/30 * * * *', () => tick().catch((e) => logger.error(`challengeUpdate job: ${e.message}`)));
  logger.info('Cron registered: challengeUpdate (*/30 min)');
  return { tick };
}

module.exports = { start, tick };
