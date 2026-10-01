const { forbidden } = require('../utils/response.util');

/**
 * Role-based access control. req.user.role is one of:
 * SUPER_ADMIN | ADMIN | TRAINER | NUTRITIONIST | MEMBER
 * Subscription tier: FREE | PREMIUM | TRAINER_PRO | NUTRITION_PRO | ENTERPRISE
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(forbidden('Authentication required'));
  if (!roles.includes(req.user.role)) return next(forbidden(`Requires role: ${roles.join(' or ')}`));
  next();
};

/** Staff shortcut: SUPER_ADMIN or ADMIN. */
const requireStaff = requireRole('SUPER_ADMIN', 'ADMIN');

/** Premium gating for member features (AI quotas, live classes, offline...). */
const requirePremium = (req, res, next) => {
  const paid = ['PREMIUM', 'TRAINER_PRO', 'NUTRITION_PRO', 'ENTERPRISE'];
  if (!req.user) return next(forbidden('Authentication required'));
  if (req.user.subscriptionType === 'FREE' && !paid.includes(req.user.subscriptionType)) {
    return next(forbidden('Premium subscription required', { upgradeUrl: '/pricing' }));
  }
  next();
};

/** Trainer-verified gating (can sell programs, host live classes). */
const requireVerifiedTrainer = async (req, res, next) => {
  try {
    if (!req.user || (req.user.role !== 'TRAINER' && req.user.subscriptionType !== 'TRAINER_PRO')) {
      return next(forbidden('Trainer account required'));
    }
    const prisma = require('../lib/prisma');
    const profile = await prisma.trainerProfile.findUnique({ where: { userId: req.user.id }, select: { verificationStatus: true } });
    if (!profile || profile.verificationStatus !== 'APPROVED') {
      return next(forbidden('Trainer account pending verification by an admin'));
    }
    req.trainerProfile = profile;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireRole, requireStaff, requirePremium, requireVerifiedTrainer };
