const router = require('express').Router();
const c = require('../controllers/battleController');
const auth = require('../middleware/auth');

router.get('/leaderboard', c.getLeaderboard);
router.get('/users/search', auth, c.searchUsers);
router.get('/my', auth, c.getMyBattles);
router.post('/challenge/:opponentId', auth, c.createBattle);
router.put('/:id/respond', auth, c.respondToBattle);
router.post('/:id/vote', auth, c.vote);
router.get('/:id', c.getBattle);

module.exports = router;
