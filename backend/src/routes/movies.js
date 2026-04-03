const express = require("express");
const router = express.Router();

const c = require("../controllers/moviesController");

router.get("/trending", c.getTrending);
router.get("/search", c.search);
router.get("/:id", c.getDetails);

module.exports = router;