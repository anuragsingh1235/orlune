const pool = require('./database');
require('dotenv').config();

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500) DEFAULT '',
        bio TEXT DEFAULT '',
        battle_wins INTEGER DEFAULT 0,
        battle_losses INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS watchlist_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tmdb_id VARCHAR(255) NOT NULL,
        media_type VARCHAR(10) NOT NULL DEFAULT 'movie',
        title VARCHAR(255) NOT NULL,
        poster_path VARCHAR(500),
        backdrop_path VARCHAR(500),
        overview TEXT,
        release_date VARCHAR(20),
        vote_average DECIMAL(3,1),
        genres TEXT,
        user_rating INTEGER CHECK(user_rating >= 1 AND user_rating <= 10),
        user_review TEXT,
        status VARCHAR(20) DEFAULT 'watchlist',
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, tmdb_id, media_type)
      );

      CREATE TABLE IF NOT EXISTS battles (
        id SERIAL PRIMARY KEY,
        challenger_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        opponent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        challenger_votes INTEGER DEFAULT 0,
        opponent_votes INTEGER DEFAULT 0,
        winner_id INTEGER REFERENCES users(id),
        ends_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS battle_votes (
        id SERIAL PRIMARY KEY,
        battle_id INTEGER REFERENCES battles(id) ON DELETE CASCADE,
        voter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        voted_for_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(battle_id, voter_id)
      );

      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(follower_id, following_id)
      );

      CREATE TABLE IF NOT EXISTS friend_requests (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(sender_id, receiver_id)
      );

      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        user_id1 INTEGER REFERENCES users(id) ON DELETE CASCADE,
        user_id2 INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'accepted',
        blocked_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        CHECK(user_id1 < user_id2),
        UNIQUE(user_id1, user_id2)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 🔥 Patch Updates
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255)');
      await pool.query('ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT');
      await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT');
      await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50)');

      // New Battle Arena Tables
      await pool.query(`CREATE TABLE IF NOT EXISTS upcoming_reminders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tmdb_id VARCHAR(255) NOT NULL,
        media_type VARCHAR(10) NOT NULL DEFAULT 'movie',
        title VARCHAR(255) NOT NULL,
        release_date VARCHAR(20),
        poster_path VARCHAR(500),
        email VARCHAR(255),
        reminded BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, tmdb_id, media_type)
      )`);

      await pool.query(`CREATE TABLE IF NOT EXISTS movie_ratings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tmdb_id VARCHAR(255) NOT NULL,
        media_type VARCHAR(10) NOT NULL DEFAULT 'movie',
        title VARCHAR(255) NOT NULL,
        rating INTEGER CHECK(rating >= 1 AND rating <= 10),
        submit_count INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, tmdb_id)
      )`);

      await pool.query(`CREATE TABLE IF NOT EXISTS arena_challenges (
        id SERIAL PRIMARY KEY,
        creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        opponent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        genre VARCHAR(100),
        creator_movie_id VARCHAR(255),
        creator_movie_title VARCHAR(255),
        creator_movie_poster VARCHAR(500),
        opponent_movie_id VARCHAR(255),
        opponent_movie_title VARCHAR(255),
        opponent_movie_poster VARCHAR(500),
        creator_color VARCHAR(20) DEFAULT '#e50914',
        opponent_color VARCHAR(20) DEFAULT '#0095f6',
        creator_votes INTEGER DEFAULT 0,
        opponent_votes INTEGER DEFAULT 0,
        ends_at TIMESTAMP,
        winner_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )`);

      await pool.query(`CREATE TABLE IF NOT EXISTS arena_votes (
        id SERIAL PRIMARY KEY,
        challenge_id INTEGER REFERENCES arena_challenges(id) ON DELETE CASCADE,
        voter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        voted_for INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(challenge_id, voter_id)
      )`);

      await pool.query('ALTER TABLE battles ADD COLUMN IF NOT EXISTS challenger_movie_id VARCHAR(255)');
      await pool.query('ALTER TABLE battles ADD COLUMN IF NOT EXISTS challenger_movie_title VARCHAR(255)');
      await pool.query('ALTER TABLE battles ADD COLUMN IF NOT EXISTS challenger_movie_poster VARCHAR(500)');
      await pool.query('ALTER TABLE battles ADD COLUMN IF NOT EXISTS opponent_movie_id VARCHAR(255)');
      await pool.query('ALTER TABLE battles ADD COLUMN IF NOT EXISTS opponent_movie_title VARCHAR(255)');
      await pool.query('ALTER TABLE battles ADD COLUMN IF NOT EXISTS opponent_movie_poster VARCHAR(500)');

      // 🦾 ID Universalization: Support Wiki String IDs
      await pool.query('ALTER TABLE watchlist_items ALTER COLUMN tmdb_id TYPE VARCHAR(255)');
      await pool.query('ALTER TABLE upcoming_reminders ALTER COLUMN tmdb_id TYPE VARCHAR(255)');
      await pool.query('ALTER TABLE movie_ratings ALTER COLUMN tmdb_id TYPE VARCHAR(255)');
      await pool.query('ALTER TABLE arena_challenges ALTER COLUMN creator_movie_id TYPE VARCHAR(255)');
      await pool.query('ALTER TABLE arena_challenges ALTER COLUMN opponent_movie_id TYPE VARCHAR(255)');
      await pool.query('ALTER TABLE battles ALTER COLUMN challenger_movie_id TYPE VARCHAR(255)');
      await pool.query('ALTER TABLE battles ALTER COLUMN opponent_movie_id TYPE VARCHAR(255)');

    } catch(e) {
      console.log('Patch warning:', e.message);
    }

    // 🌐 CHANNEL SYSTEM TABLES
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS channels (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          reason TEXT,
          category VARCHAR(50),
          privacy VARCHAR(20) DEFAULT 'public',
          avatar_url TEXT,
          invite_link VARCHAR(100) UNIQUE,
          creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS channel_members (
          id SERIAL PRIMARY KEY,
          channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          is_admin BOOLEAN DEFAULT FALSE,
          is_creator BOOLEAN DEFAULT FALSE,
          joined_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(channel_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS channel_messages (
          id SERIAL PRIMARY KEY,
          channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
          sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          content TEXT,
          attachment_url TEXT,
          attachment_type VARCHAR(50),
          is_system_msg BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // Ensure Global channel exists
      const globalCheck = await pool.query("SELECT * FROM channels WHERE name = 'Global'");
      if (globalCheck.rows.length === 0) {
        await pool.query(
          "INSERT INTO channels (name, description, privacy, category) VALUES ('Global', 'The official Orlune Global hub for all users.', 'public', 'General')"
        );
      }
    } catch (e) {
      console.log('Channel Migration warning:', e.message);
    }

    // 📱 RIC PERSISTENCE
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ric_reels (
          id SERIAL PRIMARY KEY,
          url TEXT NOT NULL,
          caption TEXT,
          username VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
    } catch (e) {
      console.log('RIC Migration warning:', e.message);
    }

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS practice_tasks (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          thumbnail_url TEXT,
          duration_minutes INTEGER,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
    } catch (e) {
      console.log('Practice Migration warning:', e.message);
    }

    console.log('✅ Migration check complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}

if (require.main === module) {
  migrate();
} else {
  module.exports = migrate;
}
