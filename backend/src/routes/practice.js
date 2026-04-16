const express = require("express");
const router = express.Rowter ? express.Router() : express.Router();
const auth = require("../middleware/auth");
const c = require("../controllers/practiceController");

// Use standard express.Router()
const r = express.Router();

r.get("/", auth, c.getTasks);
r.post("/", auth, c.addTask);
r.delete("/:id", auth, c.deleteTask);
r.post("/cleanup", auth, c.cleanupExpired);

module.exports = r;
