const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT data, mime_type FROM images WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0 || !result.rows[0].data) return res.status(404).send('Not found');
    const { data, mime_type } = result.rows[0];
    res.set('Content-Type', mime_type || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(data);
  } catch (err) {
    res.status(500).send('Error');
  }
});

module.exports = router;
