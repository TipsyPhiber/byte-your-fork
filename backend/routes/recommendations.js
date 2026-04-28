const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/:user_id', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.user_id, 10);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'Invalid user_id' });

  if (req.user.id !== userId) {
    const adminResult = await pool.query('SELECT 1 FROM admins WHERE user_id = $1', [req.user.id]);
    if (adminResult.rows.length === 0) return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const result = await pool.query(`
      WITH user_recipes AS (
        SELECT DISTINCT recipe_id
          FROM events
         WHERE user_id = $1 AND recipe_id IS NOT NULL
      ),
      similar_users AS (
        SELECT DISTINCT e.user_id
          FROM events e
          JOIN user_recipes ur ON ur.recipe_id = e.recipe_id
         WHERE e.user_id IS NOT NULL AND e.user_id <> $1
      )
      SELECT r.id, r.title, COUNT(*)::int AS score
        FROM events e
        JOIN similar_users su ON su.user_id = e.user_id
        JOIN recipes r ON r.id = e.recipe_id
       WHERE e.recipe_id IS NOT NULL
         AND e.recipe_id NOT IN (SELECT recipe_id FROM user_recipes)
       GROUP BY r.id, r.title
       ORDER BY score DESC
       LIMIT 5
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Recommendation fetch failed' });
  }
});

module.exports = router;
