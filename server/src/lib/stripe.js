/**
 * Stripe client — subscriptions, one-off purchases, Connect payouts.
 * Lazy-instantiated so the app can boot without a key in CI.
 * Price IDs / amounts for platform plans live in PLAN_CATALOGUE below and are
 * mirrored by the web pricing page.
 */
const Stripe = require('stripe');

let client = null;
function stripe() {
  if (!client) client = Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  return client;
}

/** Platform subscription catalogue (monthly, in cents). */
const PLAN_CATALOGUE = {
  PREMIUM: { priceCents: 999, name: 'Premium', stripePriceIdMonthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY },
  TRAINER_PRO: { priceCents: 2999, name: 'Trainer Pro', stripePriceIdMonthly: process.env.STRIPE_PRICE_TRAINER_PRO_MONTHLY },
  NUTRITION_PRO: { priceCents: 1999, name: 'Nutrition Pro', stripePriceIdMonthly: process.env.STRIPE_PRICE_NUTRITION_PRO_MONTHLY },
  ENTERPRISE: { priceCents: 9999, name: 'Enterprise', stripePriceIdMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY },
};

/** Platform commission taken from trainer/nutritionist sales (%). */
const COMMISSION_PCT = () => parseInt(process.env.PLATFORM_COMMISSION_PERCENT || '20', 10);

module.exports = { stripe, PLAN_CATALOGUE, COMMISSION_PCT };
