const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  const { query } = req.query;
  
  try {
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const term = query.trim();
    const results = await pool.query(`
      SELECT DISTINCT ON (r.id) r.*, i.url as image_url,
        ts_rank(
          to_tsvector('english', r.title || ' ' || COALESCE(t.name, '')),
          websearch_to_tsquery('english', $1)
        ) as rank
      FROM recipes r
      LEFT JOIN images i ON r.id = i.recipe_id
      LEFT JOIN recipe_tags t ON r.id = t.recipe_id
      WHERE
        to_tsvector('english', r.title || ' ' || COALESCE(t.name, '')) @@ websearch_to_tsquery('english', $1)
        OR r.title ILIKE $2
      ORDER BY r.id, rank DESC
      LIMIT 15
    `, [term, `%${term}%`]);

    res.json(results.rows);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: "Search Failed" });
  }
});

module.exports = router;
