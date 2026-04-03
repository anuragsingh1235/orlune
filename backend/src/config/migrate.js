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
        tmdb_id INTEGER NOT NULL,
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
    `);
    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
