// Permission catalogue + role → permission grants.
const PERMISSIONS = [
  { key: 'users:view', description: 'View users' },
  { key: 'users:manage', description: 'Create/edit users' },
  { key: 'users:ban', description: 'Ban/unban users' },
  { key: 'users:setRole', description: 'Change user roles' },
  { key: 'trainers:verify', description: 'Approve/reject trainer applications' },
  { key: 'exercises:view', description: 'View exercise library' },
  { key: 'exercises:manage', description: 'CRUD exercises' },
  { key: 'exercises:review', description: 'Approve community submissions' },
  { key: 'programs:view', description: 'View programs' },
  { key: 'programs:manage', description: 'Create/edit own programs' },
  { key: 'programs:moderate', description: 'Approve/feature programs' },
  { key: 'programs:sell', description: 'Sell programs' },
  { key: 'challenges:manage', description: 'Create platform challenges' },
  { key: 'community:moderate', description: 'Moderate posts/reports' },
  { key: 'liveclasses:conduct', description: 'Host live classes' },
  { key: 'sessions:book', description: 'Offer bookable sessions' },
  { key: 'mealplans:create', description: 'Create meal plans' },
  { key: 'clients:manage', description: 'Manage trainer clients' },
  { key: 'payouts:request', description: 'Request Stripe payouts' },
  { key: 'ai:unlimited', description: 'Unlimited AI requests' },
  { key: 'analytics:platform', description: 'View platform analytics' },
  { key: 'settings:manage', description: 'Edit platform settings' },
  { key: 'audit:view', description: 'View audit logs' },
];

const ROLE_GRANTS = {
  MEMBER: ['exercises:view', 'programs:view', 'sessions:book'],
  NUTRITIONIST: ['exercises:view', 'programs:view', 'sessions:book', 'mealplans:create', 'clients:manage', 'programs:manage', 'payouts:request', 'ai:unlimited'],
  TRAINER: ['exercises:view', 'programs:view', 'sessions:book', 'programs:manage', 'programs:sell', 'liveclasses:conduct', 'clients:manage', 'payouts:request', 'ai:unlimited'],
  ADMIN: ['exercises:view', 'programs:view', 'sessions:book', 'users:view', 'users:manage', 'users:ban', 'trainers:verify', 'exercises:manage', 'exercises:review', 'programs:moderate', 'challenges:manage', 'community:moderate', 'analytics:platform', 'ai:unlimited'],
  SUPER_ADMIN: PERMISSIONS.map((p) => p.key),
};

module.exports = { PERMISSIONS, ROLE_GRANTS };
