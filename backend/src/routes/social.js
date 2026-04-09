const express = require('express');
const router = express.Router();
const sc = require('../controllers/socialController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/search', sc.searchUsers);
router.post('/request',  sc.sendFriendRequest);
router.get('/requests',  sc.getPendingRequests);
router.post('/respond',  sc.respondToRequest);
router.get('/friends',   sc.getMutualFriends);    // mutual follows = friends
router.get('/following', sc.getFollowing);
router.get('/followers', sc.getFollowers);
router.post('/follow',   sc.followUser);
router.post('/unfollow', sc.unfollowUser);
router.post('/block',    sc.blockUser);
router.post('/remove',   sc.removeFriend);

module.exports = router;
