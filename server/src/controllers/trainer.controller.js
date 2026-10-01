const trainerService = require('../services/trainer.service');
const { ok, created, paginated } = require('../utils/response.util');

/* Application + profile */
const apply = async (req, res) => created(res, await trainerService.apply(req.user.id, req.body), 'Trainer application submitted');
const myProfile = async (req, res) => ok(res, await trainerService.getMyProfile(req.user.id));
const updateProfile = async (req, res) => ok(res, await trainerService.updateMyProfile(req.user.id, req.body), 'Profile updated');
const browse = async (req, res) => { const r = await trainerService.browse(req.query); paginated(res, r.items, r); };
const publicProfile = async (req, res) => ok(res, await trainerService.publicProfile(req.params.userId));
const dashboard = async (req, res) => ok(res, await trainerService.dashboard(req.user.id));

/* Availability */
const setAvailability = async (req, res) => ok(res, await trainerService.setAvailability(req.user.id, req.body), 'Availability saved');
const listAvailability = async (req, res) => ok(res, await trainerService.listAvailability(req.user.id, req.query));
const publicAvailability = async (req, res) => ok(res, await trainerService.publicAvailability(req.params.userId, req.query));
const deleteAvailability = async (req, res) => { await trainerService.deleteAvailability(req.user.id, req.params.id); ok(res, null, 'Slot removed'); };

/* Bookings */
const createBooking = async (req, res) => created(res, await trainerService.createBooking(req.user.id, req.body), 'Booking requested');
const bookingsAsClient = async (req, res) => { const r = await trainerService.myBookingsAsClient(req.user.id, req.query); paginated(res, r.items, r); };
const bookingsAsTrainer = async (req, res) => { const r = await trainerService.myBookingsAsTrainer(req.user.id, req.query); paginated(res, r.items, r); };
const getBooking = async (req, res) => ok(res, await trainerService.getBooking(req.user.id, req.params.id));
const setBookingStatus = async (req, res) => ok(res, await trainerService.setBookingStatus(req.user.id, req.params.id, req.body.status), 'Booking updated');
const assignHomework = async (req, res) => ok(res, await trainerService.assignHomework(req.user.id, req.params.id, req.body.homework), 'Homework assigned');
const postNotes = async (req, res) => ok(res, await trainerService.postSessionNotes(req.user.id, req.params.id, req.body.notes), 'Notes saved');
const rate = async (req, res) => ok(res, await trainerService.rateBooking(req.user.id, req.params.id, req.body), 'Thanks for rating');

/* Messaging */
const sendMessage = async (req, res) => created(res, await trainerService.sendMessage(req.user.id, req.params.id, req.body), 'Message sent');
const unread = async (req, res) => ok(res, { unread: await trainerService.unreadCount(req.user.id) });
const markRead = async (req, res) => ok(res, await trainerService.markRead(req.user.id, req.params.id), 'Marked read');

/* Clients */
const listClients = async (req, res) => ok(res, await trainerService.listClients(req.user.id));
const upsertClient = async (req, res) => ok(res, await trainerService.upsertClientShare(req.user.id, req.body), 'Client share updated');

module.exports = {
  apply, myProfile, updateProfile, browse, publicProfile, dashboard,
  setAvailability, listAvailability, publicAvailability, deleteAvailability,
  createBooking, bookingsAsClient, bookingsAsTrainer, getBooking, setBookingStatus,
  assignHomework, postNotes, rate, sendMessage, unread, markRead, listClients, upsertClient,
};
