const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/notification.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(controller.list));
router.get('/unread-count', asyncHandler(controller.unreadCount));
router.patch('/read-all', asyncHandler(controller.markAllRead));
router.patch('/:id/read', asyncHandler(controller.markRead));

router.post('/devices', validate({ body: z.object({ token: z.string().min(10), platform: z.enum(['IOS', 'ANDROID', 'WEB']) }) }), asyncHandler(controller.registerDevice));
router.delete('/devices/:token', asyncHandler(controller.unregisterDevice));
router.post('/web-push', validate({ body: z.object({ endpoint: z.string().min(10), keys: z.object({ p256dh: z.string(), auth: z.string() }) }) }), asyncHandler(controller.registerWebPush));

router.put('/prefs', asyncHandler(controller.savePrefs));

module.exports = router;
