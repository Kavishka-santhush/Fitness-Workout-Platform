const { createClerkClient } = require('@clerk/backend');

/**
 * Clerk backend client — webhook user sync, admin operations (create user,
 * ban user, update profile). Request-level auth verification uses
 * `clerkMiddleware` + `getAuth` from @clerk/express (see auth.middleware).
 */
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

module.exports = { clerkClient };
