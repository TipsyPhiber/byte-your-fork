const express = require('express');
const router = express.Router();
const pool = require('../db');
const { encrypt, decrypt } = require('../crypto_helper');
const { authenticateToken } = require('../middleware/auth');

router.put('/preferences', authenticateToken, async (req, res) => {
  const { preferences } = req.body;
  if (!Array.isArray(preferences)) return res.status(400).json({ error: 'preferences must be an array' });
  try {
    await pool.query('DELETE FROM user_preferences WHERE user_id = $1', [req.user.id]);
    for (const tag of preferences) {
      await pool.query(
        'INSERT INTO user_preferences (user_id, tag_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, encrypt(tag)]
      );
    }
    res.json({ preferences });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.put('/clear-notifications', authenticateToken, async (req, res) => {
  try {
    await pool.query(`
      INSERT INTO notification_settings (user_id, cleared_at)
      VALUES ($1, NOW())
      ON CONFLICT (user_id) DO UPDATE SET cleared_at = NOW()
    `, [req.user.id]);
    const result = await pool.query('SELECT cleared_at FROM notification_settings WHERE user_id = $1', [req.user.id]);
    res.json({ cleared_at: result.rows[0].cleared_at });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
