const router = require('express').Router();
const pool = require('../config/database');

// GET all public reels
router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM ric_reels ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// POST a new reel
router.post('/', async (req, res) => {
  const { url, caption, username } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO ric_reels (url, caption, username) VALUES ($1, $2, $3) RETURNING *',
      [url, caption || '', username || 'Anonymous']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
