const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/search', socialController.searchUsers);
router.post('/request', socialController.sendFriendRequest);
router.get('/requests', socialController.getPendingRequests);
router.post('/respond', socialController.respondToRequest);
router.get('/friends', socialController.getFriends);
router.post('/block', socialController.blockUser);

module.exports = router;
