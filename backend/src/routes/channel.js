const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channelController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/create', channelController.createChannel);
router.post('/join', channelController.joinChannel);
router.get('/list', channelController.getChannels);
router.get('/my', channelController.getMyChannels);
router.post('/message', channelController.sendChannelMessage);
router.get('/history/:channel_id', channelController.getChannelHistory);
router.get('/members/:channel_id', channelController.getChannelMembers);
router.post('/admin/toggle', channelController.toggleAdmin);

module.exports = router;
