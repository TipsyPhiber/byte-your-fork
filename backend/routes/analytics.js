const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const adminResult = await pool.query('SELECT 1 FROM admins WHERE user_id = $1', [req.user.id]);
    if (adminResult.rows.length === 0) return res.status(403).json({ error: 'Admins only' });

    const topQuery = (eventType) => pool.query(
      `SELECT r.id, r.title, COUNT(*)::int AS count
         FROM events e
         JOIN recipes r ON r.id = e.recipe_id
        WHERE e.event_type = $1
        GROUP BY r.id, r.title
        ORDER BY count DESC
        LIMIT 5`,
      [eventType]
    );

    const [viewed, favorited, rated] = await Promise.all([
      topQuery('recipe_viewed'),
      topQuery('recipe_favorited'),
      topQuery('recipe_rated'),
    ]);

    res.json({
      topViewed: viewed.rows,
      topFavorited: favorited.rows,
      topRated: rated.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Analytics fetch failed' });
  }
});

module.exports = router;
