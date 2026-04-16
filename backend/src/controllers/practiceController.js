const pool = require("../config/database");

exports.getTasks = async (req, res) => {
  const userId = req.user.id;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM practice_tasks WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch practice archive." });
  }
};

exports.addTask = async (req, res) => {
  const userId = req.user.id;
  const { title, thumbnail_url, duration_minutes } = req.body;

  try {
    // Calculate expires_at
    const expiresAt = new Date(Date.now() + duration_minutes * 60000);

    const { rows } = await pool.query(
      "INSERT INTO practice_tasks (user_id, title, thumbnail_url, duration_minutes, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [userId, title, thumbnail_url, duration_minutes, expiresAt]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to store practice record." });
  }
};

exports.deleteTask = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM practice_tasks WHERE id = $1 AND user_id = $2", [id, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to purge record." });
  }
};

exports.cleanupExpired = async (req, res) => {
  try {
    await pool.query("DELETE FROM practice_tasks WHERE expires_at < NOW()");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Cleanup failed." });
  }
};
