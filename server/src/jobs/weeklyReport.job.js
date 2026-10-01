/**
 * Weekly report job — Mondays 08:00. Builds each active member's weekly summary
 * and delivers it in-app + by email. Members with no activity in the last 7 days
 * are skipped to avoid noise.
 */
const cron = require('node-cron');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger.util');
const analytics = require('../services/analytics.service');
const notification = require('../services/notification.service');
const { sendEmail } = require('../utils/email.util');

const BATCH = 200;

async function tick() {
  const activeSince = new Date(Date.now() - 7 * 864e5);
  let cursor = null;
  let sent = 0;

  // Page through members active in the last week (recent workout or food log).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const users = await prisma.user.findMany({
      where: {
        isBanned: false,
        role: { in: ['MEMBER', 'TRAINER', 'NUTRITIONIST'] },
        OR: [{ lastWorkoutAt: { gte: activeSince } }, { mealEntries: { some: { date: { gte: activeSince } } } }],
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: { id: true, email: true, displayName: true },
      orderBy: { id: 'asc' },
      take: BATCH,
    });
    if (!users.length) break;

    for (const u of users) {
      try {
        const report = await analytics.weeklyReport(u.id);
        const title = 'Your weekly progress report 📊';
        const body = `${report.workouts} workout${report.workouts === 1 ? '' : 's'} · ${report.volumeKg.toLocaleString()} kg volume · ${report.caloriesBurned.toLocaleString()} kcal burned · ${report.streak}-day streak`;
        await notification.notify(u.id, 'WEEKLY_REPORT', title, body, { screen: 'Progress', ...report },
          u.email ? { email: u.email, emailTemplate: 'weeklyReport', emailProps: { name: u.displayName || 'there', report } } : {});
        sent++;
      } catch (e) {
        logger.warn(`weeklyReport failed for ${u.id}: ${e.message}`);
      }
    }
    cursor = users[users.length - 1].id;
    if (users.length < BATCH) break;
  }
  logger.info(`weeklyReport job: sent ${sent} reports`);
  return sent;
}

function start() {
  // '0 8 * * 1' = Monday 08:00 local.
  cron.schedule('0 8 * * 1', () => tick().catch((e) => logger.error(`weeklyReport job: ${e.message}`)));
  logger.info('Cron registered: weeklyReport (Mon 08:00)');
  return { tick };
}

module.exports = { start, tick };
