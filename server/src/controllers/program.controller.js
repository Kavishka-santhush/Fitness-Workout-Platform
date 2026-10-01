const programService = require('../services/program.service');
const { ok, created, paginated } = require('../utils/response.util');
const prisma = require('../lib/prisma');

const list = async (req, res) => {
  const { items, page, limit, total } = await programService.list(req.query);
  paginated(res, items, { page, limit, total });
};

const get = async (req, res) => ok(res, await programService.get(req.params.id, req.user));

const create = async (req, res) =>
  created(res, await programService.create(req.user.id, req.body, { cover: req.files?.cover?.[0], trailer: req.files?.trailer?.[0] }), 'Program created');

const update = async (req, res) => ok(res, await programService.update(req.params.id, req.user.id, req.body), 'Program updated');

const publish = async (req, res) => ok(res, await programService.publish(req.params.id, req.user.id, req.user.role), req.body._statusHint || 'Publish requested');

const remove = async (req, res) => {
  await programService.remove(req.params.id, req.user.id, req.user.role);
  ok(res, null, 'Program archived');
};

const enroll = async (req, res) => created(res, await programService.enroll(req.user.id, req.params.id), 'Enrolled');

const unenroll = async (req, res) => {
  await programService.unenroll(req.user.id, req.params.id);
  ok(res, null, 'Unenrolled');
};

const myEnrollments = async (req, res) => {
  const items = await prisma.programEnrollment.findMany({
    where: { userId: req.user.id },
    include: { program: { select: { id: true, name: true, coverImageUrl: true, durationWeeks: true, difficulty: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  ok(res, items);
};

const review = async (req, res) => ok(res, await programService.review(req.user.id, req.params.id, req.body), 'Review saved');

const leaderboard = async (req, res) => ok(res, await programService.leaderboard(req.params.id, req.query));

const featured = async (req, res) => ok(res, await programService.list({ featured: 'true', limit: 10 }));

const setFeatured = async (req, res) =>
  ok(res, await prisma.program.update({ where: { id: req.params.id }, data: { featured: Boolean(req.body.featured) } }), 'Featured updated');

const reviewQueue = async (req, res) => {
  const items = await prisma.program.findMany({ where: { status: 'PENDING_REVIEW' }, include: { creator: { select: { displayName: true } } }, orderBy: { updatedAt: 'asc' } });
  ok(res, items);
};

const moderate = async (req, res) => {
  const status = req.body.decision === 'APPROVE' ? 'PUBLISHED' : 'REJECTED';
  const program = await prisma.program.update({ where: { id: req.params.id }, data: { status } });
  const { audit } = require('../services/admin.service');
  await audit(req.user.id, 'PROGRAM_MODERATION', 'program', program.id, null, { status });
  ok(res, program, `Program ${status.toLowerCase()}`);
};

module.exports = { list, get, create, update, publish, remove, enroll, unenroll, myEnrollments, review, leaderboard, featured, setFeatured, reviewQueue, moderate };
