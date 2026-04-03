const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 🔑 JWT
const sign = (user) =>
  jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

/* ================= REGISTER ================= */
exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields required" });
  }

  try {
    // 🔐 hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1,$2,$3)
       RETURNING id, username, email`,
      [username, email, hashedPassword]
    );

    res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0],
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);

    // 🔥 duplicate handle
    if (err.code === "23505") {
      if (err.constraint === "users_username_key") {
        return res.status(400).json({ error: "Username already taken" });
      }
      if (err.constraint === "users_email_key") {
        return res.status(400).json({ error: "Email already registered" });
      }
    }

    res.status(500).json({ error: "Server error" });
  }
};

/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: "Invalid email" });
    }

    const user = result.rows[0];

    // 🔐 compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const { password_hash, ...safeUser } = user;

    res.json({
      message: "Login successful",
      token: sign(user),
      user: safeUser,
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= ME ================= */
exports.me = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email FROM users WHERE id=$1",
      [req.user?.id || 1] // temp fallback
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("ME ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};