const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendOrluneOTP } = require('../utils/mailer');

// 🔑 JWT
const sign = (user) =>
  jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

/* ================= REGISTER ================= */
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

/* ================= OTP GENERATION ================= */
exports.requestSignupOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    // Check if email already registered
    const userCheck = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (userCheck.rows.length > 0) return res.status(400).json({ error: "Email already registered" });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 mins

    await pool.query(
      `INSERT INTO otps (email, otp, expires_at) VALUES ($1,$2,$3)
       ON CONFLICT (email) DO UPDATE SET otp=$2, expires_at=$3`,
      [email, otp, expiresAt]
    );

    await sendOrluneOTP(email, otp, "Account Verification");
    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("OTP ERROR:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

/* ================= VERIFY SIGNUP (Create Account) ================= */
exports.verifySignup = async (req, res) => {
  const { username, email, password, otp } = req.body;

  if (!username || !email || !password || !otp) {
    return res.status(400).json({ error: "All fields and OTP required" });
  }

  try {
    const otpRec = await pool.query("SELECT * FROM otps WHERE email=$1", [email]);
    if (!otpRec.rows.length) return res.status(400).json({ error: "No OTP found for this email" });
    if (otpRec.rows[0].otp !== otp) return res.status(400).json({ error: "Invalid OTP code" });
    if (new Date() > new Date(otpRec.rows[0].expires_at)) return res.status(400).json({ error: "OTP expired" });

    // 🔐 hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const displayId = "ORL-" + crypto.randomBytes(2).toString('hex').toUpperCase();

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, display_id)
       VALUES ($1,$2,$3,$4)
       RETURNING id, username, email, display_id`,
      [username, email, hashedPassword, displayId]
    );

    // Delete OTP after success
    await pool.query("DELETE FROM otps WHERE email=$1", [email]);

    res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0],
      token: sign(result.rows[0]),
    });

  } catch (err) {
    console.error("VERIFY SIGNUP ERROR:", err);
    if (err.code === "23505") {
      if (err.constraint === "users_username_key") return res.status(400).json({ error: "Username already taken" });
      if (err.constraint === "users_email_key") return res.status(400).json({ error: "Email already registered" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email=$1",[email]);
    if (!result.rows.length) return res.status(401).json({ error: "Invalid email" });
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: "Invalid password" });
    const { password_hash, ...safeUser } = user;
    res.json({
      message: "Login successful",
      token: sign(user),
      user: safeUser,
    });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ================= ME ================= */
exports.me = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, display_id, avatar_url, bio FROM users WHERE id=$1",
      [req.user?.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ================= FORGOT PASSWORD ================= */
exports.forgotPasswordOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    const userCheck = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (!userCheck.rows.length) return res.status(400).json({ error: "Account not found with this email" });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60000); 

    await pool.query(
      `INSERT INTO otps (email, otp, expires_at) VALUES ($1,$2,$3)
       ON CONFLICT (email) DO UPDATE SET otp=$2, expires_at=$3`,
      [email, otp, expiresAt]
    );

    await sendOrluneOTP(email, otp, "Password Reset");
    res.json({ message: "Password reset OTP sent to your email" });
  } catch (err) {
    console.error("FORGOT PASS OTP ERROR:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

/* ================= RESET PASSWORD ================= */
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: "Email, OTP and new password required" });
  }

  try {
    const otpRec = await pool.query("SELECT * FROM otps WHERE email=$1", [email]);
    if (!otpRec.rows.length) return res.status(400).json({ error: "No OTP found for this email" });
    if (otpRec.rows[0].otp !== otp) return res.status(400).json({ error: "Invalid OTP code" });
    if (new Date() > new Date(otpRec.rows[0].expires_at)) return res.status(400).json({ error: "OTP expired" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash=$1 WHERE email=$2", [hashedPassword, email]);

    await pool.query("DELETE FROM otps WHERE email=$1", [email]);

    res.json({ message: "Password successfully updated. You can now login." });
  } catch (err) {
    console.error("RESET PASS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};