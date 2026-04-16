const pool = require("../config/database");
const { sendReminderEmail } = require("../utils/mailer");

exports.getTasks = async (req, res) => {
  const userId = req.user.id;
  try {
    // 🔔 Lazy Trigger: Process any pending reminders whenever tasks are fetched
    await triggerReminders();

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
  const { title, thumbnail_url, duration_minutes, expires_at, reminders } = req.body;
  try {
    let finalExpiresAt;
    if (expires_at) {
      finalExpiresAt = new Date(expires_at);
    } else {
      finalExpiresAt = new Date(Date.now() + (duration_minutes || 60) * 60000);
    }

    const { rows } = await pool.query(
      "INSERT INTO practice_tasks (user_id, title, thumbnail_url, duration_minutes, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [userId, title, thumbnail_url, duration_minutes || 0, finalExpiresAt]
    );

    const newTask = rows[0];

    // 🔔 Create Reminders if provided (Max 2 handled by frontend, but let's be safe)
    if (reminders && Array.isArray(reminders)) {
      for (const remindAt of reminders.slice(0, 2)) {
        await pool.query(
          "INSERT INTO practice_reminders (task_id, user_id, remind_at) VALUES ($1, $2, $3)",
          [newTask.id, userId, new Date(remindAt)]
        );
      }
    }

    res.json(newTask);
  } catch (err) {
    console.error("ADD TASK ERROR:", err);
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

async function triggerReminders() {
  try {
    const { rows: pending } = await pool.query(`
      SELECT r.*, t.title, t.expires_at, u.email 
      FROM practice_reminders r
      JOIN practice_tasks t ON r.task_id = t.id
      JOIN users u ON r.user_id = u.id
      WHERE r.remind_at <= NOW() AND r.is_sent = FALSE
    `);

    if (pending.length === 0) return;

    for (const r of pending) {
      try {
        await sendReminderEmail(r.email, r.title, r.expires_at);
        await pool.query("UPDATE practice_reminders SET is_sent = TRUE WHERE id = $1", [r.id]);
        console.log(`[RECALL] Sent to ${r.email} for ${r.title}`);
      } catch (mailErr) {
        console.error("Reminder Mail Failed:", mailErr);
      }
    }
  } catch (err) {
    console.error("Trigger Reminders Error:", err);
  }
}
