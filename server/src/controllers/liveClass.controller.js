const liveClassService = require('../services/liveClass.service');
const { ok, created, paginated } = require('../utils/response.util');

const create = async (req, res) => created(res, await liveClassService.create(req.user.id, req.body), 'Class scheduled');
const update = async (req, res) => ok(res, await liveClassService.update(req.user.id, req.params.id, req.body), 'Class updated');
const cancel = async (req, res) => ok(res, await liveClassService.cancel(req.user.id, req.params.id), 'Class cancelled');
const browse = async (req, res) => { const r = await liveClassService.browse(req.query); paginated(res, r.items, r); };
const getOne = async (req, res) => ok(res, await liveClassService.getOne(req.user?.id, req.params.id));
const enroll = async (req, res) => created(res, await liveClassService.enroll(req.user.id, req.params.id), 'Enrolled');
const cancelEnrollment = async (req, res) => ok(res, await liveClassService.cancelEnrollment(req.user.id, req.params.id), 'Enrollment cancelled');
const setStatus = async (req, res) => ok(res, await liveClassService.setStatus(req.user.id, req.params.id, req.body.status), 'Status updated');
const attachRecording = async (req, res) => ok(res, await liveClassService.attachRecording(req.user.id, req.params.id, req.file), 'Recording attached');
const markAttendance = async (req, res) => ok(res, await liveClassService.markAttendance(req.params.id, req.user.id), 'Attendance recorded');
const rate = async (req, res) => ok(res, await liveClassService.rateClass(req.user.id, req.params.id, req.body), 'Thanks for rating');
const mine = async (req, res) => { const r = await liveClassService.myClasses(req.user.id, req.query); paginated(res, r.items, r); };
const postChat = async (req, res) => created(res, await liveClassService.postChat(req.user.id, req.params.id, req.body), 'sent');
const chatHistory = async (req, res) => ok(res, await liveClassService.chatHistory(req.params.id, req.query));
const replays = async (req, res) => ok(res, await liveClassService.replays(req.user.id));
const saveReplayProgress = async (req, res) => ok(res, await liveClassService.saveReplayProgress(req.user.id, req.params.id, req.body.watchedSec), 'Progress saved');

module.exports = { create, update, cancel, browse, getOne, enroll, cancelEnrollment, setStatus, attachRecording, markAttendance, rate, mine, postChat, chatHistory, replays, saveReplayProgress };
