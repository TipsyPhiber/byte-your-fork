const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET comments for a recipe
router.get('/:recipeId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.user_id, c.text, c.created_at, u.username, u.first_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.recipe_id = $1
      ORDER BY c.created_at DESC
    `, [req.params.recipeId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// POST a comment
router.post('/:recipeId', authenticateToken, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });
  if (text.length > 255) return res.status(400).json({ error: 'Comment must be 255 characters or less' });
  try {
    const result = await pool.query(
      'INSERT INTO comments (user_id, recipe_id, text) VALUES ($1, $2, $3) RETURNING id, text, created_at',
      [req.user.id, req.params.recipeId, text.trim()]
    );
    const userResult = await pool.query('SELECT username, first_name FROM users WHERE id = $1', [req.user.id]);
    res.status(201).json({ ...result.rows[0], user_id: req.user.id, ...userResult.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Post failed' });
  }
});

// DELETE a comment (own comments only, or admin)
router.delete('/:commentId', authenticateToken, async (req, res) => {
  try {
    const comment = await pool.query('SELECT user_id FROM comments WHERE id = $1', [req.params.commentId]);
    if (comment.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const isAdmin = await pool.query('SELECT 1 FROM admins WHERE user_id = $1', [req.user.id]);
    if (comment.rows[0].user_id !== req.user.id && isAdmin.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [req.params.commentId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
