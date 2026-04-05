const pool = require('../config/database');

// ─── SEND MESSAGE ──────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  const sender_id = req.user.id;
  const { receiver_id, content } = req.body;

  if (!content) return res.status(400).json({ error: "Content required" });

  try {
    // Check if blocked
    const u1 = Math.min(sender_id, receiver_id);
    const u2 = Math.max(sender_id, receiver_id);
    
    const friendship = await pool.query(
      "SELECT * FROM friendships WHERE user_id1=$1 AND user_id2=$2",
      [u1, u2]
    );

    if (friendship.rows.length > 0 && friendship.rows[0].status === 'blocked') {
      return res.status(403).json({ error: "Messaging not allowed (user blocked)" });
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [sender_id, receiver_id, content]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
};

// ─── GET CHAT HISTORY ──────────────────────────────────────────
exports.getChat = async (req, res) => {
  const userId = req.user.id;
  const { otherId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [userId, otherId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
};

// ─── GET RECENT CONVERSATIONS ──────────────────────────────────────────
exports.getRecentConvos = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `WITH LatestMessages AS (
        SELECT 
          CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as other_user_id,
          content,
          created_at,
          ROW_NUMBER() OVER (
            PARTITION BY CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END 
            ORDER BY created_at DESC
          ) as rn
        FROM messages
        WHERE sender_id = $1 OR receiver_id = $1
      )
      SELECT lm.other_user_id, lm.content as last_message, lm.created_at, u.username, u.avatar_url
      FROM LatestMessages lm
      JOIN users u ON lm.other_user_id = u.id
      WHERE lm.rn = 1
      ORDER BY lm.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("RECENT CONVOS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};
