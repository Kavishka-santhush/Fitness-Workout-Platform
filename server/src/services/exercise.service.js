/**
 * Exercise service — library browsing (pg_trgm search + filters), favorites,
 * ratings, history, admin CRUD, community submissions.
 */
const prisma = require('../lib/prisma');
const { notFound, badRequest } = require('../utils/response.util');
const { publicUrl } = require('../utils/upload.util');

/** GET /api/exercises — filters: q, muscle, equipment, difficulty, type, category, sort. */
async function list({ q, muscle, equipment, difficulty, type, category, page = 1, limit = 20, sort = 'popular' }) {
  const where = { status: 'APPROVED' };
  if (muscle) where.OR = [{ primaryMuscles: { has: muscle } }, { secondaryMuscles: { has: muscle } }];
  if (equipment) where.equipment = { has: equipment };
  if (difficulty) where.difficulty = difficulty;
  if (type) where.exerciseType = type;
  if (category) where.category = category;

  const orderBy = {
    popular: [{ usageCount: 'desc' }],
    newest: [{ createdAt: 'desc' }],
    rating: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
    name: [{ name: 'asc' }],
  }[sort] || [{ usageCount: 'desc' }];

  if (q && q.length >= 2) {
    // trigram similarity search when a term is given, keep other filters too.
    const rows = muscle
      ? await prisma.$queryRaw`
          SELECT id FROM exercises
          WHERE status = 'APPROVED' AND name % ${q}
            AND (${muscle} = ANY("primaryMuscles") OR ${muscle} = ANY("secondaryMuscles"))
          ORDER BY similarity(name, ${q}) DESC
          LIMIT ${+limit}`
      : await prisma.$queryRaw`
          SELECT id FROM exercises
          WHERE status = 'APPROVED' AND name % ${q}
          ORDER BY similarity(name, ${q}) DESC
          LIMIT ${+limit}`;
    if (rows.length) {
      const ids = rows.map((r) => r.id);
      const items = await prisma.exercise.findMany({ where: { id: { in: ids }, ...where }, orderBy });
      const total = ids.length;
      return { items, page, limit, total };
    }
  }

  const [items, total] = await Promise.all([
    prisma.exercise.findMany({ where, orderBy, skip: (page - 1) * limit, take: +limit }),
    prisma.exercise.count({ where }),
  ]);
  return { items, page: +page, limit: +limit, total };
}

async function getById(id, userId = null) {
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    include: { ratings: { orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { displayName: true, avatarUrl: true } } } } },
  });
  if (!exercise) throw notFound('Exercise not found');
  let isFavorite = false;
  let personalHistory = null;
  if (userId) {
    const [fav, logCount, lastSets] = await Promise.all([
      prisma.favoriteExercise.findFirst({ where: { userId, exerciseId: id } }),
      prisma.sessionLoggedSet.count({ where: { exerciseId: id, session: { userId } } }),
      prisma.sessionLoggedSet.findMany({ where: { exerciseId: id, session: { userId } }, orderBy: { loggedAt: 'desc' }, take: 5 }),
    ]);
    isFavorite = Boolean(fav);
    personalHistory = { timesLogged: logCount, recentSets: lastSets };
  }
  return { ...exercise, isFavorite, personalHistory };
}

async function toggleFavorite(userId, exerciseId) {
  const existing = await prisma.favoriteExercise.findUnique({ where: { userId_exerciseId: { userId, exerciseId } } }).catch(() => null);
  if (existing) {
    await prisma.favoriteExercise.delete({ where: { id: existing.id } }).catch(() =>
      prisma.favoriteExercise.deleteMany({ where: { userId, exerciseId } }));
    return { favorited: false };
  }
  await prisma.favoriteExercise.create({ data: { userId, exerciseId } });
  return { favorited: true };
}

async function listFavorites(userId) {
  const favs = await prisma.favoriteExercise.findMany({ where: { userId }, include: { exercise: true }, orderBy: { createdAt: 'desc' } });
  return favs.map((f) => f.exercise);
}

async function rate(userId, exerciseId, { rating, comment }) {
  if (rating < 1 || rating > 5) throw badRequest('Rating must be 1-5');
  const row = await prisma.exerciseRating.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    create: { userId, exerciseId, rating, comment },
    update: { rating, comment },
  });
  const agg = await prisma.exerciseRating.aggregate({ where: { exerciseId }, _avg: { rating: true }, _count: true });
  await prisma.exercise.update({
    where: { id: exerciseId },
    data: { ratingAvg: agg._avg.rating || 0, ratingCount: agg._count },
  });
  return row;
}

/* ---------- Admin / community ---------- */

async function create(data, { userId, isCommunity = false, files = {} }) {
  const exercise = await prisma.exercise.create({
    data: {
      ...data,
      videoUrl: files.video ? publicUrl('exerciseVideos', files.video.filename) : data.videoUrl || null,
      demoImages: (files.images || []).map((f) => publicUrl('exerciseImages', f.filename)),
      status: isCommunity ? 'PENDING' : 'APPROVED',
      isCommunity,
      submittedById: isCommunity ? userId : null,
    },
  });
  return exercise;
}

async function update(id, data) {
  const { videoUrl, demoImages, ...rest } = data;
  return prisma.exercise.update({ where: { id }, data: rest });
}

async function attachMedia(id, { video, images = [] }) {
  const exercise = await prisma.exercise.findUnique({ where: { id } });
  if (!exercise) throw notFound('Exercise not found');
  const data = {};
  if (video) data.videoUrl = publicUrl('exerciseVideos', video.filename);
  if (images.length) data.demoImages = [...exercise.demoImages, ...images.map((f) => publicUrl('exerciseImages', f.filename))];
  return prisma.exercise.update({ where: { id }, data });
}

async function remove(id) {
  await prisma.exercise.delete({ where: { id } });
  return true;
}

async function pendingSubmissions({ page = 1, limit = 20 }) {
  const [items, total] = await Promise.all([
    prisma.exercise.findMany({ where: { status: 'PENDING' }, include: { submittedBy: { select: { id: true, displayName: true } } }, orderBy: { createdAt: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.exercise.count({ where: { status: 'PENDING' } }),
  ]);
  return { items, page, limit, total };
}

async function reviewSubmission(id, decision, reviewerId) {
  if (!['APPROVED', 'REJECTED'].includes(decision)) throw badRequest('decision must be APPROVED or REJECTED');
  const exercise = await prisma.exercise.update({ where: { id }, data: { status: decision } });
  const { audit } = require('./admin.service');
  await audit(reviewerId, 'EXERCISE_REVIEW', 'exercise', id, null, { decision });
  return exercise;
}

/** Personal stats: logged count per exercise for history view. */
async function personalHistory(userId) {
  return prisma.sessionLoggedSet.groupBy({
    by: ['exerciseId'],
    where: { session: { userId, status: 'COMPLETED' } },
    _count: { id: true },
    _max: { weight: true },
  });
}

module.exports = { list, getById, toggleFavorite, listFavorites, rate, create, update, attachMedia, remove, pendingSubmissions, reviewSubmission, personalHistory };
