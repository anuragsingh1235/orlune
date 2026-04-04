const express = require('express');
const router = express.Router();
const animeController = require('../controllers/animeController');

// ─── ANIME ROUTES ──────────────────────────────
router.get('/trending', animeController.getTrending);
router.get('/search', animeController.search);

module.exports = router;
