const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET average rating + user's own rating for a recipe
router.get('/:recipeId', authenticateToken, async (req, res) => {
  try {
    const [avgResult, userResult] = await Promise.all([
      pool.query('SELECT ROUND(AVG(rating)::numeric, 1) as average, COUNT(*) as count FROM ratings WHERE recipe_id = $1', [req.params.recipeId]),
      pool.query('SELECT rating FROM ratings WHERE recipe_id = $1 AND user_id = $2', [req.params.recipeId, req.user.id])
    ]);
    res.json({
      average: parseFloat(avgResult.rows[0].average) || 0,
      count: parseInt(avgResult.rows[0].count),
      userRating: userResult.rows[0]?.rating || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// POST or update a rating (1-5)
router.post('/:recipeId', authenticateToken, async (req, res) => {
  const { rating } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  try {
    await pool.query(
      'INSERT INTO ratings (user_id, recipe_id, rating) VALUES ($1, $2, $3) ON CONFLICT (user_id, recipe_id) DO UPDATE SET rating = $3',
      [req.user.id, req.params.recipeId, rating]
    );
    const avgResult = await pool.query(
      'SELECT ROUND(AVG(rating)::numeric, 1) as average, COUNT(*) as count FROM ratings WHERE recipe_id = $1',
      [req.params.recipeId]
    );
    res.json({
      average: parseFloat(avgResult.rows[0].average),
      count: parseInt(avgResult.rows[0].count),
      userRating: rating
    });
  } catch (err) {
    res.status(500).json({ error: 'Rating failed' });
  }
});

module.exports = router;
