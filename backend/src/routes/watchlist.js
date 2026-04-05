const express = require("express");
const router = express.Router();

const c = require("../controllers/watchlistController");
const auth = require("../middleware/auth");

// 📥 GET all watchlist items
router.get("/", auth, c.getItems);

// 👤 GET another user's watchlist
router.get("/user/:id", auth, c.getUserWatchlist);

// ➕ ADD item
router.post("/", auth, c.addItem);

// ✏️ UPDATE item
router.put("/:id", auth, c.updateItem);

// 🏛️ GET community ratings
router.get("/community/scores", c.getCommunityRatings);

// ❌ DELETE item
router.delete("/:id", auth, c.removeItem);

module.exports = router;