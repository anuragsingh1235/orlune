const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech')) {
  poolConfig.ssl = { require: true };
}

const pool = new Pool(poolConfig);

module.exports = pool;
