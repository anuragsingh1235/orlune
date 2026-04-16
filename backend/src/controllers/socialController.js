const pool = require('../config/database');

// ─── SEARCH USERS ──────────────────────────────────────────
exports.searchUsers = async (req, res) => {
  const { query } = req.query;
  const userId = req.user.id;

  if (!query) return res.json([]);

  try {
    // Split query like "Aayush kumar" into ["%Aayush%", "%kumar%"]
    const searchTerms = query.split(' ').filter(t => t.trim().length > 0).map(term => `%${term}%`);
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.bio,
         CASE 
           WHEN f.status = 'accepted' THEN 'friends'
           WHEN f.status = 'blocked' THEN 'blocked'
           WHEN fr_sent.id IS NOT NULL THEN 'request_sent'
           WHEN fr_received.id IS NOT NULL THEN 'request_received'
           ELSE 'none'
         END as connection_status
       FROM users u
       LEFT JOIN friendships f ON (f.user_id1 = u.id AND f.user_id2 = $2) OR (f.user_id1 = $2 AND f.user_id2 = u.id)
       LEFT JOIN friend_requests fr_sent ON fr_sent.sender_id = $2 AND fr_sent.receiver_id = u.id AND fr_sent.status = 'pending'
       LEFT JOIN friend_requests fr_received ON fr_received.sender_id = u.id AND fr_received.receiver_id = $2 AND fr_received.status = 'pending'
       WHERE (u.username ILIKE ANY($1::text[]) OR u.email ILIKE ANY($1::text[]))
         AND u.id != $2
       LIMIT 10`,
      [searchTerms, userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("SEARCH ERROR:", err);
    res.status(500).json({ error: "Failed to search users" });
  }
};

// ─── FRIEND REQUESTS ──────────────────────────────────────────
exports.sendFriendRequest = async (req, res) => {
  const sender_id = req.user.id;
  const { receiver_id } = req.body;

  if (sender_id === receiver_id) return res.status(400).json({ error: "Cannot add yourself" });

  try {
    // Check if already friends
    const friendCheck = await pool.query(
      "SELECT 1 FROM friendships WHERE (user_id1=$1 AND user_id2=$2) OR (user_id1=$2 AND user_id2=$1)",
      [sender_id, receiver_id]
    );
    if (friendCheck.rows.length > 0) return res.status(400).json({ error: "Already friends" });

    // Send request
    await pool.query(
      "INSERT INTO friend_requests (sender_id, receiver_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [sender_id, receiver_id]
    );
    res.json({ message: "Friend request sent" });
  } catch (err) {
    res.status(500).json({ error: "Failed to send request" });
  }
};

exports.getPendingRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT fr.id, u.username, u.id as user_id, u.avatar_url 
       FROM friend_requests fr
       JOIN users u ON fr.sender_id = u.id
       WHERE fr.receiver_id = $1 AND fr.status = 'pending'`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
};

exports.respondToRequest = async (req, res) => {
  const userId = req.user.id;
  const { requestId, status } = req.body; // 'accepted' or 'rejected'

  try {
    const request = await pool.query(
      "SELECT * FROM friend_requests WHERE id=$1 AND receiver_id=$2",
      [requestId, userId]
    );
    if (!request.rows.length) return res.status(404).json({ error: "Request not found" });

    const { sender_id } = request.rows[0];

    if (status === 'accepted') {
      const u1 = Math.min(sender_id, userId);
      const u2 = Math.max(sender_id, userId);
      
      await pool.query(
        "INSERT INTO friendships (user_id1, user_id2, status) VALUES ($1, $2, 'accepted') ON CONFLICT DO NOTHING",
        [u1, u2]
      );
    }

    await pool.query("DELETE FROM friend_requests WHERE id=$1", [requestId]);
    res.json({ message: `Request ${status}` });
  } catch (err) {
    res.status(500).json({ error: "Action failed" });
  }
};

// ─── FRIENDS LIST ──────────────────────────────────────────
exports.getFriends = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, f.status, f.blocked_by
       FROM friendships f
       JOIN users u ON (f.user_id1 = u.id OR f.user_id2 = u.id)
       WHERE (f.user_id1 = $1 OR f.user_id2 = $1) AND u.id != $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch friends" });
  }
};

// ─── BLOCK USER ──────────────────────────────────────────
exports.blockUser = async (req, res) => {
  const userId = req.user.id;
  const { friendId } = req.body;

  try {
    const u1 = Math.min(userId, friendId);
    const u2 = Math.max(userId, friendId);

    await pool.query(
      `INSERT INTO friendships (user_id1, user_id2, status, blocked_by) 
       VALUES ($1, $2, 'blocked', $3)
       ON CONFLICT (user_id1, user_id2) DO UPDATE SET status='blocked', blocked_by=$3`,
      [u1, u2, userId]
    );
    res.json({ message: "User blocked" });
  } catch (err) {
    res.status(500).json({ error: "Block failed" });
  }
};

// ─── REMOVE FRIEND ──────────────────────────────────────────
exports.removeFriend = async (req, res) => {
  const userId = req.user.id;
  const { friendId } = req.body;

  try {
    const u1 = Math.min(userId, friendId);
    const u2 = Math.max(userId, friendId);
    
    await pool.query("DELETE FROM friendships WHERE user_id1=$1 AND user_id2=$2", [u1, u2]);
    res.json({ message: "Friend removed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove friend" });
  }
};

// ─── FOLLOW ──────────────────────────────────────────
exports.followUser = async (req, res) => {
  const followerId = req.user.id;
  const { followingId } = req.body;
  if (followerId === followingId) return res.status(400).json({ error: "Cannot follow yourself" });
  try {
    await pool.query(
      "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [followerId, followingId]
    );
    res.json({ message: "Followed" });
  } catch (err) {
    res.status(500).json({ error: "Follow failed" });
  }
};

// ─── UNFOLLOW ──────────────────────────────────────────
exports.unfollowUser = async (req, res) => {
  const followerId = req.user.id;
  const { followingId } = req.body;
  try {
    await pool.query(
      "DELETE FROM follows WHERE follower_id=$1 AND following_id=$2",
      [followerId, followingId]
    );
    res.json({ message: "Unfollowed" });
  } catch (err) {
    res.status(500).json({ error: "Unfollow failed" });
  }
};

// ─── GET STATS ──────────────────────────────────────────
exports.getStats = async (req, res) => {
  const { userId } = req.params;
  const requesterId = req.user.id;

  try {
    // Basic stats are usually public, but we can restrict if needed. 
    // For now, let's keep counts public but the LISTS (below) private as requested.
    const [flwrs, flwng, wl] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM follows WHERE following_id = $1", [userId]),
      pool.query("SELECT COUNT(*) FROM follows WHERE follower_id = $1", [userId]),
      pool.query("SELECT COUNT(*) FROM watchlist_items WHERE user_id = $1", [userId]),
    ]);
    res.json({
      followers: parseInt(flwrs.rows[0].count),
      following: parseInt(flwng.rows[0].count),
      watchlist: parseInt(wl.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

const checkFriendship = async (u1, u2) => {
  if (parseInt(u1) === parseInt(u2)) return true;
  const result = await pool.query(
    `SELECT COUNT(*) FROM follows f1
     JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
     WHERE f1.follower_id = $1 AND f1.following_id = $2`,
    [u1, u2]
  );
  return parseInt(result.rows[0].count) > 0;
};

// ─── GET MUTUAL FRIENDS (both follow each other) ──────────────────────────────────────────
exports.getMutualFriends = async (req, res) => {
  const targetId = req.params.userId || req.user.id;
  const requesterId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.bio
       FROM follows f1
       JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
       JOIN users u ON u.id = f1.following_id
       WHERE f1.follower_id = $1`,
      [targetId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch mutual friends" });
  }
};

// ─── GET FOLLOWING ──────────────────────────────────────────
exports.getFollowing = async (req, res) => {
  const targetId = req.params.userId || req.user.id;
  const requesterId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.bio
       FROM follows f JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = $1`,
      [targetId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch following" });
  }
};

// ─── GET FOLLOWERS ──────────────────────────────────────────
exports.getFollowers = async (req, res) => {
  const targetId = req.params.userId || req.user.id;
  const requesterId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.bio
       FROM follows f JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = $1`,
      [targetId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch followers" });
  }
};

