const { getAuth } = require('@clerk/express');
const prisma = require('../lib/prisma');
const { unauthorized, forbidden } = require('../utils/response.util');

/**
 * Requires a valid Clerk session. Attaches req.auth (Clerk claims) and
 * req.user (our PostgreSQL User row, synced via webhook).
 */
const requireAuth = async (req, res, next) => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) throw unauthorized('Not signed in');

    req.auth = auth;

    const user = await prisma.user.findUnique({ where: { clerkUserId: auth.userId } });
    if (!user) {
      // Webhook has not created the row yet — lazily sync minimal profile.
      throw forbidden('User profile not found. Please complete onboarding.');
    }
    if (user.isBanned) throw forbidden('Account suspended');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/** Attaches req.user when a session exists, but never blocks the request. */
const optionalAuth = async (req, res, next) => {
  try {
    const auth = getAuth(req);
    if (auth.userId) {
      req.auth = auth;
      req.user = await prisma.user.findUnique({ where: { clerkUserId: auth.userId } }) || null;
    }
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { requireAuth, optionalAuth };
