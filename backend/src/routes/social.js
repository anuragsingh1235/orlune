const express = require('express');
const router = express.Router();
const sc = require('../controllers/socialController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/search', sc.searchUsers);
router.post('/request',  sc.sendFriendRequest);
router.get('/requests',  sc.getPendingRequests);
router.post('/respond',  sc.respondToRequest);

router.get('/stats/:userId', sc.getStats);
router.get('/friends/:userId?',   sc.getMutualFriends); 
router.get('/following/:userId?', sc.getFollowing);
router.get('/followers/:userId?', sc.getFollowers);

router.post('/follow',   sc.followUser);
router.post('/unfollow', sc.unfollowUser);
router.post('/block',    sc.blockUser);
router.post('/remove',   sc.removeFriend);

module.exports = router;
