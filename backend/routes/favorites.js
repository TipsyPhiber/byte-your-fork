const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { logEvent } = require('../utils/events');

// Get all favorited recipes for the logged-in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, i.url as image_url, t.name as tag
      FROM favorites f
      JOIN recipes r ON f.recipe_id = r.id
      LEFT JOIN images i ON r.id = i.recipe_id
      LEFT JOIN recipe_tags t ON r.id = t.recipe_id
      WHERE f.user_id = $1
      ORDER BY r.title ASC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Fetch Failed' });
  }
});

// Get just the IDs of the user's favorites (for heart state on load)
router.get('/ids', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT recipe_id FROM favorites WHERE user_id = $1', [req.user.id]);
    res.json(result.rows.map(r => r.recipe_id));
  } catch (err) {
    res.status(500).json({ error: 'Fetch Failed' });
  }
});

// Add a favorite
router.post('/:recipeId', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO favorites (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.recipeId]
    );
    await logEvent(req.user.id, 'recipe_favorited', req.params.recipeId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Save Failed' });
  }
});

// Remove a favorite
router.delete('/:recipeId', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM favorites WHERE user_id = $1 AND recipe_id = $2', [req.user.id, req.params.recipeId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete Failed' });
  }
});

module.exports = router;
