const socialService = require('../services/social.service');
const { ok, created, paginated } = require('../utils/response.util');

/* Feed + posts */
const feed = async (req, res) => { const r = await socialService.feed(req.user.id, req.query); paginated(res, r.items, r); };
const userPosts = async (req, res) => { const r = await socialService.userPosts(req.user.id, req.params.userId, req.query); paginated(res, r.items, r); };
const createPost = async (req, res) => created(res, await socialService.createPost(req.user.id, req.body), 'Posted');
const getPost = async (req, res) => ok(res, await socialService.getPost(req.user?.id, req.params.id));
const deletePost = async (req, res) => { await socialService.deletePost(req.user.id, req.params.id); ok(res, null, 'Post deleted'); };

/* Kudos + comments */
const toggleKudos = async (req, res) => ok(res, await socialService.toggleKudos(req.user.id, req.params.id), 'Kudos toggled');
const addComment = async (req, res) => created(res, await socialService.addComment(req.user.id, req.params.id, req.body), 'Comment added');
const listComments = async (req, res) => { const r = await socialService.listComments(req.params.id, req.query); paginated(res, r.items, r); };
const deleteComment = async (req, res) => { await socialService.deleteComment(req.user.id, req.params.id); ok(res, null, 'Comment deleted'); };

/* Follows */
const follow = async (req, res) => ok(res, await socialService.follow(req.user.id, req.params.userId), 'Following');
const unfollow = async (req, res) => ok(res, await socialService.unfollow(req.user.id, req.params.userId), 'Unfollowed');
const followers = async (req, res) => ok(res, await socialService.followers(req.params.userId));
const following = async (req, res) => ok(res, await socialService.following(req.params.userId));
const suggestions = async (req, res) => ok(res, await socialService.suggestions(req.user.id, +req.query.limit || 10));

/* Groups */
const createGroup = async (req, res) => created(res, await socialService.createGroup(req.user.id, req.body), 'Group created');
const listGroups = async (req, res) => { const r = await socialService.listGroups(req.user.id, req.query); paginated(res, r.items, r); };
const getGroup = async (req, res) => ok(res, await socialService.getGroup(req.user.id, req.params.slug));
const joinGroup = async (req, res) => ok(res, await socialService.joinGroup(req.user.id, req.params.id), 'Joined group');
const leaveGroup = async (req, res) => ok(res, await socialService.leaveGroup(req.user.id, req.params.id), 'Left group');

/* Discussions */
const createDiscussion = async (req, res) => created(res, await socialService.createDiscussion(req.user.id, req.body), 'Discussion started');
const listDiscussions = async (req, res) => { const r = await socialService.listDiscussions(req.params.id, req.query); paginated(res, r.items, r); };
const discussionReplies = async (req, res) => { const r = await socialService.discussionReplies(req.params.id, req.query); paginated(res, r.items, r); };
const addDiscussionReply = async (req, res) => created(res, await socialService.addDiscussionReply(req.user.id, req.params.id, req.body), 'Reply added');

/* Blocks + reports */
const block = async (req, res) => ok(res, await socialService.blockUser(req.user.id, req.params.userId), 'User blocked');
const unblock = async (req, res) => ok(res, await socialService.unblockUser(req.user.id, req.params.userId), 'User unblocked');
const listBlocks = async (req, res) => ok(res, await socialService.listBlocks(req.user.id));
const report = async (req, res) => created(res, await socialService.report(req.user.id, req.body), 'Report submitted');

module.exports = {
  feed, userPosts, createPost, getPost, deletePost,
  toggleKudos, addComment, listComments, deleteComment,
  follow, unfollow, followers, following, suggestions,
  createGroup, listGroups, getGroup, joinGroup, leaveGroup,
  createDiscussion, listDiscussions, discussionReplies, addDiscussionReply,
  block, unblock, listBlocks, report,
};
