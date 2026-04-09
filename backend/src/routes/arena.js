const router = require('express').Router();
const c = require('../controllers/arenaController');
const auth = require('../middleware/auth');
const optAuth = require('../middleware/optAuth');

router.get('/upcoming', c.getUpcoming);
router.get('/today', c.getTodayReleased);
router.post('/reminder', auth, c.toggleReminder);
router.get('/reminders', auth, c.getMyReminders);
router.post('/rating', auth, c.submitRating);
router.get('/rating/:tmdb_id', optAuth, c.getMovieRatings);
router.get('/feed', c.getArenaFeed);
router.post('/challenge', auth, c.createChallenge);
router.put('/challenge/:id/respond', auth, c.respondChallenge);
router.put('/challenge/:id/movie', auth, c.selectMovie);
router.post('/challenge/:id/vote', auth, c.voteChallenge);
router.get('/challenge/:id/my-vote', auth, c.getMyArenaVote);

module.exports = router;
