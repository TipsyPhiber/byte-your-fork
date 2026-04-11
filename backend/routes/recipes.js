const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, i.url as image_url, t.name as tag,
        ROUND(AVG(rt.rating)::numeric, 1) as avg_rating,
        COUNT(rt.rating) as rating_count
      FROM recipes r
      LEFT JOIN images i ON r.id = i.recipe_id
      LEFT JOIN recipe_tags t ON r.id = t.recipe_id
      LEFT JOIN ratings rt ON r.id = rt.recipe_id
      GROUP BY r.id, i.url, t.name
      ORDER BY r.creation_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Fetch Failed" });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { ttc, ingredients, steps, imageUrl } = req.body;
  const title = req.body.title?.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const userId = req.user.id;

  const adminResult = await pool.query('SELECT 1 FROM admins WHERE user_id = $1', [userId]);
  if (adminResult.rows.length === 0) {
    return res.status(403).json({ error: "Access denied: Only admins can add recipes" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const recipeResult = await client.query(
      'INSERT INTO recipes (title, ttc, user_id) VALUES ($1, $2, $3) RETURNING id',
      [title, ttc, userId]
    );
    const recipeId = recipeResult.rows[0].id;

    if (imageUrl) {
      await client.query(
        'INSERT INTO images (recipe_id, url) VALUES ($1, $2)',
        [recipeId, imageUrl]
      );
    }

    if (ingredients) {
      for (const item of ingredients) {
        const ingResult = await client.query(
          'INSERT INTO ingredients (recipe_id, name) VALUES ($1, $2) RETURNING id',
          [recipeId, item.name]
        );
        await client.query(
          'INSERT INTO amount (ingredient_id, name) VALUES ($1, $2)',
          [ingResult.rows[0].id, item.amount]
        );
      }
    }

    if (steps) {
      for (const stepText of steps) {
        await client.query(
          'INSERT INTO steps (recipe_id, instruction) VALUES ($1, $2)',
          [recipeId, stepText]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ recipeId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: "Process Failed" });
  } finally {
    client.release();
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const recipeResult = await pool.query(`
      SELECT r.*, i.url as image_url, t.name as tag
      FROM recipes r
      LEFT JOIN images i ON r.id = i.recipe_id
      LEFT JOIN recipe_tags t ON r.id = t.recipe_id
      WHERE r.id = $1
    `, [id]);
    if (recipeResult.rows.length === 0) return res.status(404).json({ error: "Recipe Not Found" });

    const recipe = recipeResult.rows[0];

    const ingredientsResult = await pool.query(
      'SELECT i.name, a.name as amount FROM ingredients i LEFT JOIN amount a ON i.id = a.ingredient_id WHERE i.recipe_id = $1',
      [id]
    );
    recipe.ingredients = ingredientsResult.rows;

    const stepsResult = await pool.query(
      'SELECT instruction FROM steps WHERE recipe_id = $1 ORDER BY id',
      [id]
    );
    recipe.steps = stepsResult.rows.map(r => r.instruction);

    res.json(recipe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch Failed" });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const adminResult = await pool.query('SELECT 1 FROM admins WHERE user_id = $1', [req.user.id]);
  if (adminResult.rows.length === 0) return res.status(403).json({ error: "Admins only" });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM images WHERE recipe_id = $1', [id]);
    await client.query('DELETE FROM amount WHERE ingredient_id IN (SELECT id FROM ingredients WHERE recipe_id = $1)', [id]);
    await client.query('DELETE FROM ingredients WHERE recipe_id = $1', [id]);
    await client.query('DELETE FROM steps WHERE recipe_id = $1', [id]);
    await client.query('DELETE FROM recipe_tags WHERE recipe_id = $1', [id]);
    await client.query('DELETE FROM recipes WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: "Delete Failed" });
  } finally { client.release(); }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const adminResult = await pool.query('SELECT 1 FROM admins WHERE user_id = $1', [req.user.id]);
  if (adminResult.rows.length === 0) return res.status(403).json({ error: "Admins only" });

  const { ttc, ingredients, steps } = req.body;
  const title = req.body.title?.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE recipes SET title = $1, ttc = $2 WHERE id = $3', [title, ttc, id]);

    await client.query('DELETE FROM amount WHERE ingredient_id IN (SELECT id FROM ingredients WHERE recipe_id = $1)', [id]);
    await client.query('DELETE FROM ingredients WHERE recipe_id = $1', [id]);
    for (const ing of ingredients) {
      const iRes = await client.query('INSERT INTO ingredients (recipe_id, name) VALUES ($1, $2) RETURNING id', [id, ing.name]);
      await client.query('INSERT INTO amount (ingredient_id, name) VALUES ($1, $2)', [iRes.rows[0].id, ing.amount]);
    }

    await client.query('DELETE FROM steps WHERE recipe_id = $1', [id]);
    for (const step of steps) {
      await client.query('INSERT INTO steps (recipe_id, instruction) VALUES ($1, $2)', [id, step]);
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: "Update Failed" });
  } finally { client.release(); }
});

module.exports = router;