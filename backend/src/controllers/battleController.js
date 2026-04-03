const pool = require('../config/database');

exports.getLeaderboard = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.battle_wins, u.battle_losses, u.total_points,
        COUNT(w.id) as watchlist_size
       FROM users u
       LEFT JOIN watchlist_items w ON w.user_id = u.id
       GROUP BY u.id ORDER BY u.total_points DESC LIMIT 20`
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createBattle = async (req, res) => {
  const { opponentId } = req.params;
  if (parseInt(opponentId) === req.user.id) return res.status(400).json({ error: "Can't challenge yourself" });
  try {
    const existing = await pool.query(
      `SELECT id FROM battles WHERE ((challenger_id=$1 AND opponent_id=$2) OR (challenger_id=$2 AND opponent_id=$1)) AND status IN ('pending','active')`,
      [req.user.id, opponentId]
    );
    if (existing.rows.length) return res.status(409).json({ error: 'Battle already exists' });
    const ends = new Date();
    ends.setDate(ends.getDate() + 3);
    const result = await pool.query(
      `INSERT INTO battles (challenger_id, opponent_id, ends_at) VALUES ($1,$2,$3) RETURNING *`,
      [req.user.id, opponentId, ends]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getMyBattles = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, c.username as challenger_name, c.avatar_url as challenger_avatar,
        o.username as opponent_name, o.avatar_url as opponent_avatar
       FROM battles b
       JOIN users c ON b.challenger_id = c.id
       JOIN users o ON b.opponent_id = o.id
       WHERE b.challenger_id=$1 OR b.opponent_id=$1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.respondToBattle = async (req, res) => {
  const { action } = req.body;
  const status = action === 'accept' ? 'active' : 'declined';
  try {
    const result = await pool.query(
      `UPDATE battles SET status=$1 WHERE id=$2 AND opponent_id=$3 AND status='pending' RETURNING *`,
      [status, req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Battle not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.vote = async (req, res) => {
  const { votedForId } = req.body;
  try {
    const battle = await pool.query('SELECT * FROM battles WHERE id=$1 AND status=$2', [req.params.id, 'active']);
    if (!battle.rows.length) return res.status(404).json({ error: 'Active battle not found' });
    const b = battle.rows[0];
    if (b.challenger_id === req.user.id || b.opponent_id === req.user.id)
      return res.status(403).json({ error: 'Participants cannot vote' });
    await pool.query(
      `INSERT INTO battle_votes (battle_id, voter_id, voted_for_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [req.params.id, req.user.id, votedForId]
    );
    const votes = await pool.query(
      `SELECT voted_for_id, COUNT(*) as count FROM battle_votes WHERE battle_id=$1 GROUP BY voted_for_id`,
      [req.params.id]
    );
    let cVotes = 0, oVotes = 0;
    for (const row of votes.rows) {
      if (parseInt(row.voted_for_id) === b.challenger_id) cVotes = parseInt(row.count);
      else oVotes = parseInt(row.count);
    }
    await pool.query('UPDATE battles SET challenger_votes=$1, opponent_votes=$2 WHERE id=$3', [cVotes, oVotes, req.params.id]);
    res.json({ challengerVotes: cVotes, opponentVotes: oVotes });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getBattle = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, c.username as challenger_name, c.avatar_url as challenger_avatar,
        o.username as opponent_name, o.avatar_url as opponent_avatar
       FROM battles b JOIN users c ON b.challenger_id=c.id JOIN users o ON b.opponent_id=o.id
       WHERE b.id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const [cList, oList] = await Promise.all([
      pool.query('SELECT * FROM watchlist_items WHERE user_id=$1 AND status=$2', [result.rows[0].challenger_id, 'completed']),
      pool.query('SELECT * FROM watchlist_items WHERE user_id=$1 AND status=$2', [result.rows[0].opponent_id, 'completed']),
    ]);
    res.json({ battle: result.rows[0], challengerWatchlist: cList.rows, opponentWatchlist: oList.rows });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.searchUsers = async (req, res) => {
  const { q } = req.query;
  try {
    const result = await pool.query(
      `SELECT id, username, avatar_url, total_points, battle_wins FROM users WHERE username ILIKE $1 AND id != $2 LIMIT 10`,
      [`%${q}%`, req.user.id]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
};
