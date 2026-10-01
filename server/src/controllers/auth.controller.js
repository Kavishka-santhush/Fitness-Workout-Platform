const { Webhook } = require('svix');
const authService = require('../services/auth.service');
const { ok, badRequest } = require('../utils/response.util');

/** POST /api/auth/clerk-webhook — svix signature verification + user sync. */
const clerkWebhook = async (req, res) => {
  const signingSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!signingSecret) throw badRequest('CLERK_WEBHOOK_SECRET not configured');

  const wh = new Webhook(signingSecret);
  let event;
  try {
    event = wh.verify(req.body, {
      'svix-id': req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    });
  } catch (err) {
    throw badRequest(`Invalid webhook signature: ${err.message}`);
  }

  const result = await authService.handleWebhook(event);
  ok(res, { received: true, synced: Boolean(result) }, 'Webhook processed');
};

/** GET /api/auth/me */
const me = async (req, res) => ok(res, await authService.getMe(req.user.id));

/** POST /api/auth/onboarding */
const onboarding = async (req, res) =>
  ok(res, await authService.completeOnboarding(req.user.id, req.body), 'Onboarding complete');

module.exports = { clerkWebhook, me, onboarding };
