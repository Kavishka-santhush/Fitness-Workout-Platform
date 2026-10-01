/**
 * Social service — activity feed, posts, kudos, comments, follows,
 * groups + discussions, blocks, content reports.
 */
const prisma = require('../lib/prisma');
const { notFound, badRequest, conflict, forbidden } = require('../utils/response.util');

const authorSelect = { id: true, displayName: true, username: true, avatarUrl: true, role: true, level: true };

async function blockedSet(userId) {
  const rows = await prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] }, select: { blockerId: true, blockedId: true } });
  const s = new Set();
  for (const r of rows) { s.add(r.blockerId === userId ? r.blockedId : r.blockerId); }
  return s;
}

/* ---------- Feed ---------- */

async function feed(userId, { page = 1, limit = 20, groupId, hashtag }) {
  const blocked = await blockedSet(userId);
  const following = await prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } });
  const followIds = following.map((f) => f.followingId);
  const where = { userId: { notIn: [...blocked] } };
  if (groupId) { where.groupId = groupId; }
  else where.OR = [{ isPublic: true }, { userId: { in: [userId, ...followIds] } }];
  if (hashtag) where.hashtags = { has: hashtag.replace(/^#/, '') };
  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: { user: { select: authorSelect }, _count: { select: { comments: true, kudos: true } }, kudos: { where: { userId }, select: { id: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: +limit,
    }),
    prisma.post.count({ where }),
  ]);
  return {
    items: items.map((p) => ({ ...p, hasGivenKudos: p.kudos.length > 0, kudos: undefined })),
    page: +page, limit: +limit, total,
  };
}

async function userPosts(userId, targetId, { page = 1, limit = 20 }) {
  const blocked = await blockedSet(userId);
  if (blocked.has(targetId)) return { items: [], page, limit, total: 0 };
  const where = { userId: targetId, OR: [{ isPublic: true }, ...(userId === targetId ? [{ isPublic: false }] : [])] };
  const [items, total] = await Promise.all([
    prisma.post.findMany({ where, include: { user: { select: authorSelect }, _count: { select: { comments: true, kudos: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: +limit }),
    prisma.post.count({ where }),
  ]);
  return { items, page: +page, limit: +limit, total };
}

/* ---------- Posts ---------- */

async function createPost(userId, data) {
  const content = (data.content || '').trim();
  const hashtags = [...new Set((content.match(/#\w+/g) || []).map((h) => h.slice(1)))];
  const mentions = [...new Set((content.match(/@\w+/g) || []).map((m) => m.slice(1)))];
  if (data.groupId) {
    const member = await prisma.groupMember.findFirst({ where: { groupId: data.groupId, userId } });
    if (!member) throw forbidden('Join the group first');
  }
  return prisma.post.create({
    data: {
      userId,
      type: data.type || 'TIPS',
      sessionId: data.sessionId || null,
      cardioId: data.cardioId || null,
      routeId: data.routeId || null,
      photoId: data.photoId || null,
      groupId: data.groupId || null,
      content: content || null,
      mediaUrls: data.mediaUrls || [],
      stats: data.stats || {},
      hashtags,
      mentions,
      isPublic: data.isPublic !== false,
    },
    include: { user: { select: authorSelect } },
  });
}

async function getPost(userId, id) {
  const post = await prisma.post.findUnique({ where: { id }, include: { user: { select: authorSelect }, _count: { select: { comments: true, kudos: true } }, kudos: { where: { userId }, select: { id: true } } } });
  if (!post) throw notFound('Post not found');
  return { ...post, hasGivenKudos: post.kudos.length > 0, kudos: undefined };
}

async function deletePost(userId, id) {
  const post = await prisma.post.findFirst({ where: { id, userId } });
  if (!post) throw notFound('Post not found (or not yours)');
  await prisma.post.delete({ where: { id } });
  return true;
}

/* ---------- Kudos ---------- */

async function toggleKudos(userId, postId) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw notFound('Post not found');
  const existing = await prisma.kudos.findFirst({ where: { userId, postId } });
  if (existing) {
    await prisma.kudos.delete({ where: { id: existing.id } });
    await prisma.post.update({ where: { id: postId }, data: { kudosCount: { decrement: 1 } } });
    return { kudos: false, count: Math.max(0, post.kudosCount - 1) };
  }
  await prisma.kudos.create({ data: { userId, postId } });
  await prisma.post.update({ where: { id: postId }, data: { kudosCount: { increment: 1 } } });
  if (post.userId !== userId) {
    const notificationService = require('./notification.service');
    const giver = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    notificationService.notify(post.userId, 'KUDOS', `${giver?.displayName || 'Someone'} gave you kudos`, null, { postId, screen: 'Post', params: { id: postId } }).catch(() => {});
  }
  return { kudos: true, count: post.kudosCount + 1 };
}

/* ---------- Comments ---------- */

async function addComment(userId, postId, { content, parentId }) {
  if (!content?.trim()) throw badRequest('Empty comment');
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw notFound('Post not found');
  const comment = await prisma.comment.create({
    data: { userId, postId, targetType: 'POST', content: content.trim(), parentId: parentId || null, mentions: [...new Set((content.match(/@\w+/g) || []).map((m) => m.slice(1)))] },
    include: { user: { select: authorSelect } },
  });
  await prisma.post.update({ where: { id: postId }, data: { commentsCount: { increment: 1 } } });
  const notifyUser = parentId ? null : post.userId;
  if (notifyUser && notifyUser !== userId) {
    const notificationService = require('./notification.service');
    const c = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    notificationService.notify(notifyUser, 'COMMENT', `${c?.displayName || 'Someone'} commented`, content.slice(0, 120), { postId }).catch(() => {});
  }
  return comment;
}

async function listComments(postId, { page = 1, limit = 30 }) {
  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where: { postId, parentId: null },
      include: { user: { select: authorSelect }, replies: { include: { user: { select: authorSelect } } } },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: +limit,
    }),
    prisma.comment.count({ where: { postId, parentId: null } }),
  ]);
  return { items, page: +page, limit: +limit, total };
}

async function deleteComment(userId, id) {
  const c = await prisma.comment.findFirst({ where: { id, userId } });
  if (!c) throw notFound('Comment not found (or not yours)');
  await prisma.comment.delete({ where: { id } });
  if (c.postId) await prisma.post.update({ where: { id: c.postId }, data: { commentsCount: { decrement: 1 } } }).catch(() => {});
  return true;
}

/* ---------- Follows ---------- */

async function follow(userId, targetId) {
  if (userId === targetId) throw badRequest('Cannot follow yourself');
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) throw notFound('User not found');
  const existing = await prisma.follow.findFirst({ where: { followerId: userId, followingId: targetId } });
  if (existing) throw conflict('Already following');
  await prisma.follow.create({ data: { followerId: userId, followingId: targetId } });
  const notificationService = require('./notification.service');
  const f = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
  notificationService.notify(targetId, 'NEW_FOLLOWER', `${f?.displayName || 'Someone'} started following you`, null, { userId, screen: 'Profile', params: { id: userId } }).catch(() => {});
  return { following: true };
}

async function unfollow(userId, targetId) {
  const existing = await prisma.follow.findFirst({ where: { followerId: userId, followingId: targetId } });
  if (!existing) return { following: false };
  await prisma.follow.delete({ where: { id: existing.id } });
  return { following: false };
}

async function followers(userId) {
  const rows = await prisma.follow.findMany({ where: { followingId: userId }, include: { follower: { select: authorSelect } }, orderBy: { createdAt: 'desc' } });
  return rows.map((r) => r.follower);
}

async function following(userId) {
  const rows = await prisma.follow.findMany({ where: { followerId: userId }, include: { following: { select: authorSelect } }, orderBy: { createdAt: 'desc' } });
  return rows.map((r) => r.following);
}

async function suggestions(userId, limit = 10) {
  const followIds = (await prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } })).map((f) => f.followingId);
  return prisma.user.findMany({
    where: { id: { notIn: [userId, ...followIds] }, role: { in: ['TRAINER', 'NUTRITIONIST', 'MEMBER'] }, isBanned: false },
    select: authorSelect,
    orderBy: { followsFollowers: { _count: 'desc' } },
    take: limit,
  });
}

/* ---------- Groups ---------- */

async function createGroup(userId, data) {
  const slug = (data.slug || data.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const existing = await prisma.group.findUnique({ where: { slug } });
  if (existing) throw conflict('Slug taken');
  const group = await prisma.group.create({
    data: { name: data.name, slug, description: data.description || null, coverUrl: data.coverUrl || null, visibility: data.visibility || 'OPEN', category: data.category || null, createdBy: userId, members: { create: { userId, role: 'OWNER' } } },
    include: { _count: { select: { members: true } } },
  });
  return group;
}

async function listGroups(userId, { q, category, page = 1, limit = 20 }) {
  const where = { visibility: { not: 'PRIVATE' } };
  if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }];
  if (category) where.category = category;
  const [items, total] = await Promise.all([
    prisma.group.findMany({ where, include: { _count: { select: { members: true } } }, orderBy: { memberCount: 'desc' }, skip: (page - 1) * limit, take: +limit }),
    prisma.group.count({ where }),
  ]);
  const mine = await prisma.groupMember.findMany({ where: { userId, groupId: { in: items.map((g) => g.id) } }, select: { groupId: true } });
  const set = new Set(mine.map((m) => m.groupId));
  return { items: items.map((g) => ({ ...g, isMember: set.has(g.id) })), page: +page, limit: +limit, total };
}

async function getGroup(userId, slug) {
  const group = await prisma.group.findUnique({ where: { slug }, include: { creator: { select: authorSelect }, _count: { select: { members: true, posts: true } } } });
  if (!group) throw notFound('Group not found');
  const membership = await prisma.groupMember.findFirst({ where: { groupId: group.id, userId } });
  return { ...group, isMember: !!membership, role: membership?.role || null };
}

async function joinGroup(userId, groupId) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw notFound('Group not found');
  if (group.visibility === 'PRIVATE') throw forbidden('Private group — invite only');
  const existing = await prisma.groupMember.findFirst({ where: { groupId, userId } });
  if (existing) throw conflict('Already a member');
  await prisma.groupMember.create({ data: { groupId, userId, role: 'MEMBER' } });
  await prisma.group.update({ where: { id: groupId }, data: { memberCount: { increment: 1 } } });
  return { joined: true };
}

async function leaveGroup(userId, groupId) {
  const membership = await prisma.groupMember.findFirst({ where: { groupId, userId } });
  if (!membership) throw notFound('Not a member');
  if (membership.role === 'OWNER') throw badRequest('Owner must transfer or delete the group');
  await prisma.groupMember.delete({ where: { id: membership.id } });
  await prisma.group.update({ where: { id: groupId }, data: { memberCount: { decrement: 1 } } });
  return { left: true };
}

/* ---------- Discussions ---------- */

async function createDiscussion(userId, { groupId, title, content }) {
  const member = await prisma.groupMember.findFirst({ where: { groupId, userId } });
  if (!member) throw forbidden('Join the group first');
  return prisma.groupDiscussion.create({ data: { groupId, userId, title, content: content || null }, include: { user: { select: authorSelect } } });
}

async function listDiscussions(groupId, { page = 1, limit = 20 }) {
  const [items, total] = await Promise.all([
    prisma.groupDiscussion.findMany({ where: { groupId }, include: { user: { select: authorSelect }, _count: { select: { comments: true } } }, orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: +limit }),
    prisma.groupDiscussion.count({ where: { groupId } }),
  ]);
  return { items, page: +page, limit: +limit, total };
}

async function discussionReplies(discussionId, { page = 1, limit = 30 }) {
  const [items, total] = await Promise.all([
    prisma.comment.findMany({ where: { discussionId, parentId: null }, include: { user: { select: authorSelect }, replies: { include: { user: { select: authorSelect } } } }, orderBy: { createdAt: 'asc' }, skip: (page - 1) * limit, take: +limit }),
    prisma.comment.count({ where: { discussionId, parentId: null } }),
  ]);
  return { items, page: +page, limit: +limit, total };
}

async function addDiscussionReply(userId, discussionId, { content, parentId }) {
  const d = await prisma.groupDiscussion.findUnique({ where: { id: discussionId } });
  if (!d) throw notFound('Discussion not found');
  const comment = await prisma.comment.create({ data: { userId, discussionId, targetType: 'GROUP_DISCUSSION', content, parentId: parentId || null }, include: { user: { select: authorSelect } } });
  await prisma.groupDiscussion.update({ where: { id: discussionId }, data: { replyCount: { increment: 1 } } });
  return comment;
}

/* ---------- Blocks ---------- */

async function blockUser(userId, targetId) {
  if (userId === targetId) throw badRequest('Cannot block yourself');
  const existing = await prisma.block.findFirst({ where: { blockerId: userId, blockedId: targetId } });
  if (existing) throw conflict('Already blocked');
  await prisma.block.create({ data: { blockerId: userId, blockedId: targetId } });
  await prisma.follow.deleteMany({ where: { followerId: userId, followingId: targetId } });
  await prisma.follow.deleteMany({ where: { followerId: targetId, followingId: userId } });
  return { blocked: true };
}

async function unblockUser(userId, targetId) {
  const existing = await prisma.block.findFirst({ where: { blockerId: userId, blockedId: targetId } });
  if (existing) await prisma.block.delete({ where: { id: existing.id } });
  return { blocked: false };
}

async function listBlocks(userId) {
  const rows = await prisma.block.findMany({ where: { blockerId: userId }, orderBy: { createdAt: 'desc' } });
  const ids = rows.map((r) => r.blockedId);
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: authorSelect });
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  return ids.map((id) => byId[id]).filter(Boolean);
}

/* ---------- Reports ---------- */

async function report(userId, data) {
  if (!data.targetType || !data.targetId || !data.reason) throw badRequest('targetType, targetId and reason required');
  return prisma.contentReport.create({
    data: {
      reporterId: userId,
      targetType: data.targetType,
      targetId: data.targetId,
      postId: data.targetType === 'POST' ? data.targetId : null,
      reason: data.reason,
    },
  });
}

module.exports = {
  feed, userPosts, createPost, getPost, deletePost,
  toggleKudos, addComment, listComments, deleteComment,
  follow, unfollow, followers, following, suggestions,
  createGroup, listGroups, getGroup, joinGroup, leaveGroup,
  createDiscussion, listDiscussions, discussionReplies, addDiscussionReply,
  blockUser, unblockUser, listBlocks, report,
};
