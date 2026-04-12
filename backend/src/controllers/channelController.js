const pool = require('../config/database');
const crypto = require('crypto');

// ─── CREATE CHANNEL ──────────────────────────────────────────
exports.createChannel = async (req, res) => {
  const { name, description, reason, category, privacy, avatar_url } = req.body;
  const creator_id = req.user.id;

  try {
    const invite_link = privacy === 'private' ? crypto.randomBytes(8).toString('hex') : null;

    const result = await pool.query(
      `INSERT INTO channels (name, description, reason, category, privacy, avatar_url, invite_link, creator_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, description, reason, category, privacy, avatar_url, invite_link, creator_id]
    );

    const channel = result.rows[0];

    // Add creator as Admin and Founder
    await pool.query(
      `INSERT INTO channel_members (channel_id, user_id, is_admin, is_creator)
       VALUES ($1, $2, TRUE, TRUE)`,
      [channel.id, creator_id]
    );

    res.json(channel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create channel" });
  }
};

// ─── JOIN CHANNEL ──────────────────────────────────────────
exports.joinChannel = async (req, res) => {
  const { channel_id, invite_link } = req.body;
  const user_id = req.user.id;

  try {
    const channelRes = await pool.query("SELECT * FROM channels WHERE id = $1", [channel_id]);
    if (channelRes.rows.length === 0) return res.status(404).json({ error: "Channel not found" });

    const channel = channelRes.rows[0];

    // Check privacy
    if (channel.privacy === 'private' && channel.invite_link !== invite_link) {
      return res.status(403).json({ error: "Invalid invite link" });
    }

    // Check if already a member
    const memberCheck = await pool.query("SELECT * FROM channel_members WHERE channel_id = $1 AND user_id = $2", [channel_id, user_id]);
    if (memberCheck.rows.length > 0) return res.json({ message: "Already a member", channel });

    await pool.query(
      "INSERT INTO channel_members (channel_id, user_id) VALUES ($1, $2)",
      [channel_id, user_id]
    );

    // System message
    await pool.query(
      "INSERT INTO channel_messages (channel_id, sender_id, content, is_system_msg) VALUES ($1, $2, $3, TRUE)",
      [channel_id, user_id, "joined the channel"]
    );

    res.json({ message: "Joined successfully", channel });
  } catch (err) {
    res.status(500).json({ error: "Failed to join channel" });
  }
};

// ─── GET CHANNELS ──────────────────────────────────────────
exports.getChannels = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT c.*, (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) as member_count FROM channels c WHERE c.privacy = 'public' ORDER BY member_count DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch channels" });
  }
};

// ─── GET MY CHANNELS ──────────────────────────────────────────
exports.getMyChannels = async (req, res) => {
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      `SELECT c.* FROM channels c 
       JOIN channel_members cm ON c.id = cm.channel_id 
       WHERE cm.user_id = $1`,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch joined channels" });
  }
};

// ─── SEND CHANNEL MESSAGE ──────────────────────────────────────────
exports.sendChannelMessage = async (req, res) => {
  const sender_id = req.user.id;
  const { channel_id, content, attachment_url, attachment_type } = req.body;

  try {
    // Check membership
    const memberCheck = await pool.query("SELECT * FROM channel_members WHERE channel_id = $1 AND user_id = $2", [channel_id, sender_id]);
    if (memberCheck.rows.length === 0) return res.status(403).json({ error: "Not a member" });

    const result = await pool.query(
      `INSERT INTO channel_messages (channel_id, sender_id, content, attachment_url, attachment_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [channel_id, sender_id, content, attachment_url, attachment_type]
    );

    // Fetch user info for frontend
    const userRes = await pool.query("SELECT username, avatar_url FROM users WHERE id = $1", [sender_id]);
    const msg = { ...result.rows[0], username: userRes.rows[0].username, avatar_url: userRes.rows[0].avatar_url };

    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: "Failed to send channel message" });
  }
};

// ─── GET CHANNEL MESSAGES ──────────────────────────────────────────
exports.getChannelHistory = async (req, res) => {
  const { channel_id } = req.params;
  const user_id = req.user.id;

  try {
    // Check membership
    const memberCheck = await pool.query("SELECT * FROM channel_members WHERE channel_id = $1 AND user_id = $2", [channel_id, user_id]);
    if (memberCheck.rows.length === 0) return res.status(403).json({ error: "Access denied" });

    const result = await pool.query(
      `SELECT cm.*, u.username, u.avatar_url FROM channel_messages cm
       LEFT JOIN users u ON cm.sender_id = u.id
       WHERE cm.channel_id = $1
       ORDER BY cm.created_at ASC`,
      [channel_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

// ─── UPDATE ADMIN STATUS ──────────────────────────────────────
exports.toggleAdmin = async (req, res) => {
  const { channel_id, target_user_id, status } = req.body;
  const requester_id = req.user.id;

  try {
    const requester = await pool.query("SELECT * FROM channel_members WHERE channel_id = $1 AND user_id = $2", [channel_id, requester_id]);
    if (!requester.rows[0]?.is_admin) return res.status(403).json({ error: "Only admins can promote" });

    const target = await pool.query("SELECT * FROM channel_members WHERE channel_id = $1 AND user_id = $2", [channel_id, target_user_id]);
    if (target.rows[0]?.is_creator) return res.status(403).json({ error: "Original founder cannot be changed" });

    await pool.query(
      "UPDATE channel_members SET is_admin = $1 WHERE channel_id = $2 AND user_id = $3",
      [status, channel_id, target_user_id]
    );

    res.json({ message: "Admin status updated" });
  } catch (err) {
    res.status(500).json({ error: "Admin update failed" });
  }
};

// ─── GET CHANNEL MEMBERS ──────────────────────────────────────
exports.getChannelMembers = async (req, res) => {
  const { channel_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT cm.*, u.username, u.avatar_url FROM channel_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.channel_id = $1
       ORDER BY cm.is_creator DESC, cm.is_admin DESC`,
      [channel_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch members" });
  }
};
