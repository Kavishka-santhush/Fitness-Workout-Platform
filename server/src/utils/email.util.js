/**
 * Nodemailer + React Email — sends a compiled React Email template by name.
 * Templates live in src/emails/ (workoutReminder, streakAtRisk, prCelebration,
 * bookingConfirmed, classReminder, weeklyReport, verifyTrainer, receipt).
 */
const nodemailer = require('nodemailer');
const { render } = require('@react-email/render');
const React = require('react');
const logger = require('./logger.util');

const templates = {
  workoutReminder: require('../emails/WorkoutReminderEmail'),
  streakAtRisk: require('../emails/StreakAtRiskEmail'),
  prCelebration: require('../emails/PRCelebrationEmail'),
  bookingConfirmed: require('../emails/BookingConfirmedEmail'),
  classReminder: require('../emails/LiveClassReminderEmail'),
  weeklyReport: require('../emails/WeeklyReportEmail'),
  trainerApplication: require('../emails/TrainerApplicationEmail'),
  receipt: require('../emails/ReceiptEmail'),
  welcome: require('../emails/WelcomeEmail'),
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

/**
 * @param {string} templateName key from `templates`
 * @param {object} props props for the React Email component
 * @returns {Promise<{html:string, subject:string}>}
 */
async function renderTemplate(templateName, props = {}) {
  const mod = templates[templateName];
  if (!mod) throw new Error(`Unknown email template: ${templateName}`);
  const Email = mod.default || mod;
  const html = await render(React.createElement(Email, props));
  const subject = typeof mod.subject === 'function' ? mod.subject(props) : (mod.subject || 'Fitness Platform');
  return { html, subject };
}

/** Render + send an email. Never throws in dev (logs instead of failing the request). */
async function sendEmail({ to, templateName, props = {}, attachments = [] }) {
  const { html, subject } = await renderTemplate(templateName, props);
  try {
    const info = await transporter.sendMail({
      from: `"Fitness & Workout Platform" <${process.env.EMAIL_FROM || 'no-reply@localhost'}>`,
      to,
      subject,
      html,
      attachments,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return { delivered: true, messageId: info.messageId };
  } catch (err) {
    logger.error(`Email to ${to} failed: ${err.message}`);
    return { delivered: false, error: err.message };
  }
}

module.exports = { sendEmail, renderTemplate, transporter };
