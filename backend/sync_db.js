const pool = require('./src/config/database');
const run = async () => {
  console.log("Checking schema...");
  try {
    await pool.query('ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'watchlist\'');
    await pool.query('ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS user_rating NUMERIC');
    await pool.query('ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS user_review TEXT');
    await pool.query('ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP');
    console.log("Database schema synchronized successfully.");
  } catch (err) {
    console.error("Schema sync failed:", err);
  } finally {
    process.exit(0);
  }
};
run();
