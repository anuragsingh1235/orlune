const express = require('express');
const router = express.Router();
const wikipediaController = require('../controllers/wikipediaController');

router.get('/wiki', wikipediaController.getWikiData);

module.exports = router;
