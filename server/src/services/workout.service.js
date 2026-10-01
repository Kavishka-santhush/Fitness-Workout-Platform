/**
 * Workout service — custom builder: CRUD, ordering (dnd), supersets/circuits,
 * sections, duplication, templates, visibility, calorie estimation.
 */
const prisma = require('../lib/prisma');
const { notFound, forbidden, badRequest } = require('../utils/response.util');
const { estimateWorkoutCalories } = require('../utils/calories.util');
const { publicUrl } = require('../utils/upload.util');

const FULL_INCLUDE = {
  exercises: {
    orderBy: { position: 'asc' },
    include: { exercise: { select: { id: true, name: true, primaryMuscles: true, exerciseType: true, videoUrl: true, difficulty: true } } },
  },
  user: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
};

async function list({ userId, visibility, tag, template, q, page = 1, limit = 20 }) {
  const where = {};
  if (template) where.isTemplate = true;
  if (tag) where.tags = { has: tag };
  if (q) where.name = { contains: q, mode: 'insensitive' };
  if (userId) {
    where.OR = [
      { userId, visibility: 'PRIVATE' },
      { userId },
      { visibility: 'PUBLIC' },
    ];
    if (template) where.userId = userId;
  } else {
    where.visibility = 'PUBLIC';
  }
  const [items, total] = await Promise.all([
    prisma.workout.findMany({ where, include: { _count: { select: { exercises: true } }, user: { select: { displayName: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: +limit }),
    prisma.workout.count({ where }),
  ]);
  return { items, page: +page, limit: +limit, total };
}

async function get(id, requester) {
  const workout = await prisma.workout.findUnique({ where: { id }, include: FULL_INCLUDE });
  if (!workout) throw notFound('Workout not found');
  const isOwner = requester && workout.userId === requester.id;
  const isStaff = requester && ['SUPER_ADMIN', 'ADMIN'].includes(requester.role);
  if (workout.visibility === 'PRIVATE' && !isOwner && !isStaff) throw forbidden('This workout is private');
  if (workout.visibility === 'CLIENTS_ONLY' && !isOwner && !isStaff) {
    if (!requester) throw forbidden('Sign in to view');
    const link = await prisma.trainerClient.findFirst({ where: { clientUserId: requester.id, trainerId: workout.userId } });
    if (!link) throw forbidden('Clients only');
  }
  return workout;
}

async function create(userId, data, { thumbnail } = {}) {
  const { exercises = [], ...rest } = data;
  const workout = await prisma.workout.create({
    data: {
      ...rest,
      userId,
      thumbnailUrl: thumbnail ? publicUrl('workoutThumbnails', thumbnail.filename) : data.thumbnailUrl || null,
      exercises: { create: exercises.map((e, i) => normalizeExerciseRow(e, i)) },
    },
    include: FULL_INCLUDE,
  });
  await recomputeEstimate(workout.id);
  return prisma.workout.findUnique({ where: { id: workout.id }, include: FULL_INCLUDE });
}

function normalizeExerciseRow(e, i) {
  return {
    exerciseId: e.exerciseId,
    position: e.position ?? i,
    sets: e.sets ?? 3,
    reps: e.reps != null ? String(e.reps) : null,
    weight: e.weight ?? null,
    durationSec: e.durationSec ?? null,
    restSec: e.restSec ?? 90,
    rpeTarget: e.rpeTarget ?? null,
    section: e.section || 'MAIN',
    notes: e.notes || null,
    coachingCues: e.coachingCues || null,
    configuration: e.configuration || {},
  };
}

async function update(id, userId, data) {
  const workout = await prisma.workout.findUnique({ where: { id } });
  if (!workout) throw notFound('Workout not found');
  if (workout.userId !== userId) throw forbidden('Not your workout');

  const { exercises, ...rest } = data;
  if (exercises) {
    await prisma.workoutExercise.deleteMany({ where: { workoutId: id } });
  }
  const updated = await prisma.workout.update({
    where: { id },
    data: { ...rest, ...(exercises ? { exercises: { create: exercises.map(normalizeExerciseRow) } } : {}) },
    include: FULL_INCLUDE,
  });
  await recomputeEstimate(id);
  return prisma.workout.findUnique({ where: { id }, include: FULL_INCLUDE });
}

/** Drag & drop reorder: [{id, position}] */
async function reorder(id, userId, order) {
  const workout = await prisma.workout.findUnique({ where: { id } });
  if (!workout) throw notFound('Workout not found');
  if (workout.userId !== userId) throw forbidden('Not your workout');
  await prisma.$transaction(
    order.map((row) => prisma.workoutExercise.update({ where: { id: row.id }, data: { position: row.position } })),
  );
  return prisma.workoutExercise.findMany({ where: { workoutId: id }, orderBy: { position: 'asc' } });
}

/** Superset link: store counterpart id in both rows' JSONB configuration. */
async function linkSuperset(id, exerciseRowId, withRowId) {
  const rows = await prisma.workoutExercise.findMany({ where: { id: { in: [exerciseRowId, withRowId] }, workoutId: id } });
  if (rows.length !== 2) throw badRequest('Both exercises must belong to this workout');
  for (const row of rows) {
    const other = rows.find((r) => r.id !== row.id);
    await prisma.workoutExercise.update({
      where: { id: row.id },
      data: { configuration: { ...(row.configuration || {}), supersetWith: other.id } },
    });
  }
  return prisma.workoutExercise.findMany({ where: { workoutId: id }, orderBy: { position: 'asc' } });
}

/** Circuit: tag multiple rows with a group id + laps. */
async function createCircuit(id, userId, { name, exerciseRowIds, laps }) {
  const workout = await prisma.workout.findUnique({ where: { id } });
  if (workout.userId !== userId) throw forbidden('Not your workout');
  const groupId = `circuit-${Date.now()}`;
  await prisma.$transaction(
    exerciseRowIds.map((rowId) =>
      prisma.workoutExercise.update({
        where: { id: rowId },
        data: { configuration: { circuit: { groupId, name, laps: laps || 3 } } },
      }),
    ),
  );
  return { groupId, name, laps: laps || 3, members: exerciseRowIds };
}

async function duplicate(id, userId) {
  const source = await prisma.workout.findUnique({ where: { id }, include: { exercises: true } });
  if (!source) throw notFound('Workout not found');
  if (source.visibility !== 'PUBLIC' && source.userId !== userId && !['SUPER_ADMIN', 'ADMIN'].includes(userId?.role || '')) {
    throw forbidden('Cannot clone a private workout');
  }
  const clone = await prisma.workout.create({
    data: {
      userId,
      name: `${source.name} (copy)`,
      description: source.description,
      exerciseType: source.exerciseType,
      difficulty: source.difficulty,
      estimatedDuration: source.estimatedDuration,
      equipment: source.equipment,
      targetMuscles: source.targetMuscles,
      visibility: 'PRIVATE',
      tags: source.tags,
      parentWorkoutId: source.id,
      exercises: { create: source.exercises.map((e, i) => ({ ...e, id: undefined, workoutId: undefined, position: i })) },
    },
    include: FULL_INCLUDE,
  });
  return clone;
}

async function remove(id, userId) {
  const workout = await prisma.workout.findUnique({ where: { id } });
  if (!workout) throw notFound('Workout not found');
  if (workout.userId !== userId) throw forbidden('Not your workout');
  await prisma.workout.delete({ where: { id } });
  return true;
}

async function setTemplate(id, userId, isTemplate) {
  const workout = await prisma.workout.findUnique({ where: { id } });
  if (workout.userId !== userId) throw forbidden('Not your workout');
  return prisma.workout.update({ where: { id }, data: { isTemplate } });
}

/** Recompute estimated calories from exercises + owner weight. */
async function recomputeEstimate(id) {
  const workout = await prisma.workout.findUnique({
    where: { id },
    include: { exercises: true, user: { select: { weightKg: true } } },
  });
  const est = estimateWorkoutCalories({
    exercises: workout.exercises,
    durationMinutes: workout.estimatedDuration,
    weight: Number(workout.user.weightKg || 70),
    difficulty: workout.difficulty,
  });
  return prisma.workout.update({ where: { id }, data: { estimatedCalories: est } });
}

/** Free-plan gate: free members can save max 3 workouts. */
async function assertPlanLimit(user) {
  if (user.subscriptionType !== 'FREE') return;
  const count = await prisma.workout.count({ where: { userId: user.id } });
  if (count >= 3) throw forbidden('Free plan allows 3 saved workouts — upgrade to Premium', { upgradeUrl: '/pricing' });
}

module.exports = { list, get, create, update, reorder, linkSuperset, createCircuit, duplicate, remove, setTemplate, recomputeEstimate, assertPlanLimit, FULL_INCLUDE };
