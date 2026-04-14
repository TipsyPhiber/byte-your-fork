const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.post('/admin/set-role', authenticateToken, async (req, res) => {
  const { username, makeAdmin } = req.body;
  try {
    const callerAdmin = await pool.query('SELECT 1 FROM admins WHERE user_id = $1', [req.user.id]);
    if (callerAdmin.rows.length === 0) return res.status(403).json({ error: 'Admins only.' });
    const target = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (target.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const targetId = target.rows[0].id;
    if (makeAdmin) {
      await pool.query('INSERT INTO admins (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [targetId]);
    } else {
      await pool.query('DELETE FROM admins WHERE user_id = $1', [targetId]);
    }
    res.json({ message: `${username} is now ${makeAdmin ? 'an admin' : 'a regular user'}.` });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
