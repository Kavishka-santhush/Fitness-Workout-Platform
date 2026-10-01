/**
 * Workout reminder job — runs every 10 minutes. Finds PLANNED scheduled items
 * starting within the next 30 minutes that have not been reminded yet and
 * pushes a WORKOUT_REMINDER notification (in-app + push + email handled by the
 * notification service). Also promotes items whose window has passed to MISSED.
 */
const cron = require('node-cron');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger.util');
const notification = require('../services/notification.service');

const REMIND_TYPES = ['WORKOUT', 'CARDIO', 'LIVE_CLASS', 'TRAINER_SESSION'];

async function tick() {
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 60 * 1000);

  const due = await prisma.scheduledItem.findMany({
    where: {
      status: 'PLANNED',
      reminderSent: false,
      activityType: { in: REMIND_TYPES },
      date: { gte: now, lte: soon },
      user: { isBanned: false },
    },
    include: { workout: { select: { name: true } } },
    take: 500,
  });

  for (const item of due) {
    const label = item.workout?.name || item.note || item.activityType.replace('_', ' ').toLowerCase();
    const mins = Math.max(0, Math.round((item.date - now) / 60000));
    await notification
      .notify(item.userId, 'WORKOUT_REMINDER', 'Workout starting soon', `${label} begins in ${mins} min. Time to get ready!`, { scheduledItemId: item.id, screen: 'Schedule' })
      .catch(() => {});
    await prisma.scheduledItem.update({ where: { id: item.id }, data: { reminderSent: true } }).catch(() => {});
  }

  // Mark past uncompleted items as MISSED (older than 2h) so the day view stays tidy.
  const staleBefore = new Date(now.getTime() - 2 * 3600 * 1000);
  const missed = await prisma.scheduledItem.updateMany({
    where: { status: 'PLANNED', date: { lt: staleBefore }, activityType: { in: REMIND_TYPES } },
    data: { status: 'MISSED' },
  });

  if (due.length || missed.count) logger.debug(`workoutReminder: reminded=${due.length} missed=${missed.count}`);
}

function start() {
  cron.schedule('*/10 * * * *', () => tick().catch((e) => logger.error(`workoutReminder job: ${e.message}`)));
  logger.info('Cron registered: workoutReminder (*/10 min)');
  return { tick };
}

module.exports = { start, tick };
