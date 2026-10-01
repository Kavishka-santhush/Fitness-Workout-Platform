/**
 * Express application assembly (no listening here — see index.js).
 *
 * Order matters:
 *  1. Security + CORS + logging + compression.
 *  2. Raw-body webhooks (Clerk svix + Stripe) BEFORE the JSON parser so the
 *     signature verifiers get the exact bytes.
 *  3. JSON / urlencoded body parsing.
 *  4. Static uploads (HLS/range friendly) + AI rate limiter + all API routers.
 *  5. 404 + centralised error handler.
 */
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const logger = require('./utils/logger.util');
const { UPLOAD_ROOT } = require('./utils/upload.util');
const { globalLimiter, aiLimiter, authLimiter } = require('./middleware/rateLimit.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const asyncHandler = require('./utils/asyncHandler.util');

const authController = require('./controllers/auth.controller');
const paymentController = require('./controllers/payment.controller');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    origin: (origin, cb) => cb(null, true), // allow any origin in dev; lock down via CORS_ORIGIN env in prod
    credentials: true,
    exposedHeaders: ['content-disposition'],
  }),
);
app.use(compression());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
}

/* ---------- Raw-body webhooks (must precede express.json) ---------- */
app.post('/api/auth/clerk-webhook', authLimiter, express.raw({ type: 'application/json' }), asyncHandler(authController.clerkWebhook));
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), asyncHandler(paymentController.webhook));

/* ---------- Body parsers ---------- */
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

/* ---------- Static uploads (video streaming + HLS) ---------- */
app.use(
  '/uploads',
  express.static(UPLOAD_ROOT, {
    acceptRanges: true,
    range: true,
    maxAge: '30d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.m3u8')) res.setHeader('Content-Type', 'application/x-mpegURL');
      else if (filePath.endsWith('.ts')) res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Accept-Ranges', 'bytes');
    },
  }),
);

/* ---------- Health ---------- */
app.get('/health', (req, res) => res.status(200).json({ success: true, status: 'ok', uptime: process.uptime(), ts: Date.now() }));

/* ---------- Global rate limit for the API surface ---------- */
app.use('/api', globalLimiter);

/* ---------- API routes ---------- */
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/exercises', require('./routes/exercise.routes'));
app.use('/api/workouts', require('./routes/workout.routes'));
app.use('/api/programs', require('./routes/program.routes'));
app.use('/api/sessions', require('./routes/session.routes'));
app.use('/api/nutrition', require('./routes/nutrition.routes'));
app.use('/api/meals', require('./routes/meal.routes'));
app.use('/api/foods', require('./routes/food.routes'));
app.use('/api/body-stats', require('./routes/bodyStats.routes'));
app.use('/api/progress', require('./routes/progress.routes'));
app.use('/api/challenges', require('./routes/challenge.routes'));
app.use('/api/leaderboard', require('./routes/leaderboard.routes'));
app.use('/api/social', require('./routes/social.routes'));
app.use('/api/trainers', require('./routes/trainer.routes'));
app.use('/api/classes', require('./routes/liveClass.routes'));
app.use('/api/schedule', require('./routes/schedule.routes'));
app.use('/api/achievements', require('./routes/achievement.routes'));
app.use('/api/wearable', require('./routes/wearable.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/ai', aiLimiter, require('./routes/ai.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

/* ---------- Catch-all + errors ---------- */
app.use((req, res) => notFoundHandler(req, res));
app.use(errorHandler);

module.exports = app;
