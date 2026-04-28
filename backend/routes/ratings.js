const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { logEvent } = require('../utils/events');

const fetchAverage = async (recipeId) => {
  const res = await pool.query(
    'SELECT ROUND(AVG(rating)::numeric, 1) as average, COUNT(*) as count FROM ratings WHERE recipe_id = $1',
    [recipeId]
  );
  return {
    average: parseFloat(res.rows[0].average) || 0,
    count: parseInt(res.rows[0].count) || 0,
  };
};

router.get('/:recipeId', authenticateToken, async (req, res) => {
  try {
    const [avg, userResult] = await Promise.all([
      fetchAverage(req.params.recipeId),
      pool.query('SELECT rating FROM ratings WHERE recipe_id = $1 AND user_id = $2', [req.params.recipeId, req.user.id])
    ]);
    res.json({ ...avg, userRating: userResult.rows[0]?.rating || null });
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

router.post('/:recipeId', authenticateToken, async (req, res) => {
  const { rating } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  try {
    await pool.query(
      'INSERT INTO ratings (user_id, recipe_id, rating) VALUES ($1, $2, $3) ON CONFLICT (user_id, recipe_id) DO UPDATE SET rating = $3',
      [req.user.id, req.params.recipeId, rating]
    );
    await logEvent(req.user.id, 'recipe_rated', req.params.recipeId);
    const avg = await fetchAverage(req.params.recipeId);
    res.json({ ...avg, userRating: rating });
  } catch (err) {
    res.status(500).json({ error: 'Rating failed' });
  }
});

module.exports = router;
