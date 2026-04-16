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

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1,$2,$3)
       RETURNING id, username, email`,
      [username, email, hashedPassword]
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
      "SELECT id, username, email, avatar_url, bio, name FROM users WHERE id=$1",
      [req.user.id]
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

/* ================= PUBLIC PROFILE ================= */
exports.getUserProfile = async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      "SELECT id, username, avatar_url, bio, name FROM users WHERE id=$1",
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
};

/* ================= UPDATE PROFILE ================= */
exports.updateProfile = async (req, res) => {
  const { avatar_url, bio, name, username } = req.body;
  try {
    const result = await pool.query(
      "UPDATE users SET avatar_url=$1, bio=$2, name=$3, username=$4 WHERE id=$5 RETURNING id, username, email, avatar_url, bio, name",
      [avatar_url || '', bio || '', name || '', username || '', req.user.id]
    );
    res.json({ message: "Profile updated successfully", user: result.rows[0] });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
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

/* ================= VAULT SECURITY (Dual Key) ================= */
exports.verifyVaultAccess = async (req, res) => {
  const { pin } = req.body;
  const userId = req.user.id;

  if (!pin) return res.status(400).json({ error: "Pin required" });

  try {
    const result = await pool.query("SELECT vault_pin FROM users WHERE id=$1", [userId]);
    const userPin = result.rows[0]?.vault_pin || '1999';

    // ✅ DUAL KEY LOGIC: 1999 (Universal) OR personal userPin
    if (pin === '1999' || pin === userPin) {
      return res.json({ success: true, message: "Decryption Successful" });
    } else {
      return res.status(401).json({ error: "Unauthorized access attempt" });
    }
  } catch (err) {
    res.status(500).json({ error: "Vault verification failed" });
  }
};

exports.requestVaultPinOTP = async (req, res) => {
  const userId = req.user.id;
  try {
    const userRes = await pool.query("SELECT email FROM users WHERE id=$1", [userId]);
    const email = userRes.rows[0].email;

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60000); // 5 mins

    await pool.query(
      "UPDATE users SET vault_otp=$1, vault_otp_expiry=$2 WHERE id=$3",
      [otp, expiresAt, userId]
    );

    await sendOrluneOTP(email, otp, "Vault Access Recovery");
    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("VAULT RECOVERY ERROR:", err);
    res.status(500).json({ error: "Failed to initiate recovery. Check email configuration." });
  }
};

exports.resetVaultPin = async (req, res) => {
  const { otp, newPin } = req.body;
  const userId = req.user.id;

  if (!otp || !newPin || newPin.length !== 4) {
    return res.status(400).json({ error: "OTP and 4-digit PIN required" });
  }

  try {
    const result = await pool.query("SELECT vault_otp, vault_otp_expiry FROM users WHERE id=$1", [userId]);
    const user = result.rows[0];

    if (!user.vault_otp || user.vault_otp !== otp) return res.status(400).json({ error: "Invalid OTP" });
    if (new Date() > new Date(user.vault_otp_expiry)) return res.status(400).json({ error: "OTP Expired" });

    await pool.query(
      "UPDATE users SET vault_pin=$1, vault_otp=NULL, vault_otp_expiry=NULL WHERE id=$2",
      [newPin, userId]
    );

    res.json({ message: "Vault Passkey Updated Successfully" });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
};