const pool = require('./src/config/database');
const setup = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS otps (
          email VARCHAR(255) PRIMARY KEY,
          otp VARCHAR(6) NOT NULL,
          expires_at TIMESTAMP NOT NULL
      )
    `);
    console.log("OTP table created");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};
setup();
