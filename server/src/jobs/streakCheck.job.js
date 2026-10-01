/**
 * Streak check job.
 *  - 20:00 daily → nudge members whose streak is at risk (worked out in the
 *    last day+ but not today) with a STREAK_AT_RISK notification.
 *  - 00:15 daily → break streaks for members who missed a full day, preserving
 *    their longest-ever streak. Members with an active streak-freeze keep it.
 */
const cron = require('node-cron');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger.util');
const notification = require('../services/notification.service');
const analytics = require('../services/analytics.service');

function daysSince(date) {
  if (!date) return Infinity;
  return Math.floor((Date.now() - new Date(date).getTime()) / 864e5);
}

/** Evening nudge for streaks that could still be saved today. */
async function remindAtRisk() {
  const atRisk = await analytics.streaksAtRisk(); // last workout >1d but streak>=3
  for (const u of atRisk) {
    await notification
      .notify(u.id, 'STREAK_AT_RISK', 'Your streak is at risk 🔥', `You're on a ${u.streakCurrent}-day streak — a quick session today keeps it alive.`, { streak: u.streakCurrent, screen: 'Home' })
      .catch(() => {});
  }
  if (atRisk.length) logger.debug(`streakCheck: nudged ${atRisk.length} at-risk members`);
  return atRisk.length;
}

/** Midnight reset: a gap of >1 full day zeroes the current streak. */
async function breakExpiredStreaks() {
  // Anyone with streakCurrent>0 whose last workout was 2+ days ago has missed a day.
  const candidates = await prisma.user.findMany({
    where: { streakCurrent: { gt: 0 }, isBanned: false },
    select: { id: true, streakCurrent: true, lastWorkoutAt: true, streakFreezesUsed: true },
  });
  let reset = 0;
  for (const u of candidates) {
    const gap = daysSince(u.lastWorkoutAt);
    if (gap >= 2) {
      await prisma.user.update({ where: { id: u.id }, data: { streakCurrent: 0 } });
      reset++;
    }
  }
  if (reset) logger.debug(`streakCheck: reset ${reset} expired streaks`);
  return reset;
}

function start() {
  cron.schedule('0 20 * * *', () => remindAtRisk().catch((e) => logger.error(`streakCheck nudge: ${e.message}`)));
  cron.schedule('15 0 * * *', () => breakExpiredStreaks().catch((e) => logger.error(`streakCheck break: ${e.message}`)));
  logger.info('Cron registered: streakCheck (20:00 nudge, 00:15 reset)');
  return { remindAtRisk, breakExpiredStreaks };
}

module.exports = { start, remindAtRisk, breakExpiredStreaks };
