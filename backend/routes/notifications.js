const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const recent = await pool.query(`
      SELECT r.id, r.title, r.creation_date, i.url as image_url, t.name as tag
      FROM recipes r
      LEFT JOIN images i ON r.id = i.recipe_id
      LEFT JOIN recipe_tags t ON r.id = t.recipe_id
      WHERE r.creation_date >= NOW() - INTERVAL '30 days'
        AND r.id NOT IN (
          SELECT recipe_id FROM dismissed_notifications WHERE user_id = $1
        )
      ORDER BY r.creation_date DESC
      LIMIT 20
    `, [req.user.id]);
    res.json(recent.rows);
  } catch (err) {
    res.status(500).json({ error: 'Fetch Failed' });
  }
});

router.delete('/:recipeId', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO dismissed_notifications (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.recipeId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Dismiss Failed' });
  }
});

module.exports = router;
