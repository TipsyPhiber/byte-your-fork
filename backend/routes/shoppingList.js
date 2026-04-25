const express = require('express');
const axios = require('axios');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sendShoppingListEmail } = require('../mailer');
const { decrypt } = require('../crypto_helper');
const { mergeAmount } = require('../utils/mergeAmount');

const MAX_NAME_LEN = 200;
const MAX_AMOUNT_LEN = 100;
const MAX_BULK_ITEMS = 100;

const sanitize = (s, max) => {
  if (typeof s !== 'string') return null;
  const trimmed = s.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
};

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.ingredient_name, s.amount, s.checked, s.recipe_id, s.created_at,
        s.source_recipe_ids,
        r.title AS recipe_title,
        COALESCE(
          (SELECT array_agg(r2.title ORDER BY r2.title)
           FROM unnest(s.source_recipe_ids) AS src(rid)
           JOIN recipes r2 ON r2.id = src.rid),
          ARRAY[]::TEXT[]
        ) AS source_titles
      FROM shopping_list_items s
      LEFT JOIN recipes r ON s.recipe_id = r.id
      WHERE s.user_id = $1
      ORDER BY s.checked ASC, s.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('List fetch failed:', err.message);
    res.status(500).json({ error: 'Fetch Failed', detail: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const name = sanitize(req.body.ingredient_name, MAX_NAME_LEN);
  if (!name) return res.status(400).json({ error: 'ingredient_name required' });
  const amount = req.body.amount ? sanitize(req.body.amount, MAX_AMOUNT_LEN) : null;
  const recipeId = Number.isInteger(req.body.recipe_id) ? req.body.recipe_id : null;

  try {
    const result = await pool.query(
      `INSERT INTO shopping_list_items (user_id, ingredient_name, amount, recipe_id)
       VALUES ($1, $2, $3, $4) RETURNING id, ingredient_name, amount, checked, recipe_id, created_at`,
      [req.user.id, name, amount, recipeId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Save Failed' });
  }
});

router.post('/bulk', authenticateToken, async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : null;
  if (!items || items.length === 0) return res.status(400).json({ error: 'items required' });
  if (items.length > MAX_BULK_ITEMS) return res.status(400).json({ error: 'Too many items' });
  const recipeId = Number.isInteger(req.body.recipe_id) ? req.body.recipe_id : null;

  const cleaned = [];
  for (const it of items) {
    const name = sanitize(it?.ingredient_name, MAX_NAME_LEN);
    if (!name) continue;
    const amount = it?.amount ? sanitize(it.amount, MAX_AMOUNT_LEN) : null;
    cleaned.push({ name, amount });
  }
  if (cleaned.length === 0) return res.status(400).json({ error: 'No valid items' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const items = [];
    let added = 0;
    let merged = 0;
    for (const c of cleaned) {
      const existing = await client.query(
        `SELECT id, amount, source_recipe_ids FROM shopping_list_items
         WHERE user_id = $1 AND LOWER(ingredient_name) = LOWER($2) AND checked = FALSE
         LIMIT 1`,
        [req.user.id, c.name]
      );
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        const alreadyHasSource = recipeId !== null && (row.source_recipe_ids || []).includes(recipeId);
        if (alreadyHasSource) continue;
        const combined = mergeAmount(row.amount || '', c.amount || '').slice(0, MAX_AMOUNT_LEN);
        const updated = await client.query(
          `UPDATE shopping_list_items
           SET amount = $1,
               source_recipe_ids = CASE WHEN $2::INTEGER IS NULL THEN source_recipe_ids ELSE array_append(source_recipe_ids, $2) END
           WHERE id = $3
           RETURNING id, ingredient_name, amount, checked, recipe_id, created_at`,
          [combined || null, recipeId, row.id]
        );
        items.push(updated.rows[0]);
        merged++;
      } else {
        const sourceIds = recipeId !== null ? [recipeId] : [];
        const r = await client.query(
          `INSERT INTO shopping_list_items (user_id, ingredient_name, amount, recipe_id, source_recipe_ids)
           VALUES ($1, $2, $3, $4, $5::INTEGER[])
           RETURNING id, ingredient_name, amount, checked, recipe_id, created_at`,
          [req.user.id, c.name, c.amount, recipeId, sourceIds]
        );
        items.push(r.rows[0]);
        added++;
      }
    }
    await client.query('COMMIT');
    res.status(201).json({ items, added, merged });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bulk add failed:', err.message);
    res.status(500).json({ error: 'Save Failed', detail: err.message });
  } finally {
    client.release();
  }
});

// Bulk toggle checked state on multiple items (e.g., check-all in a recipe group).
router.post('/bulk-check', authenticateToken, async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(Number.isInteger) : null;
  const checked = req.body.checked;
  if (!ids || ids.length === 0) return res.status(400).json({ error: 'ids required' });
  if (typeof checked !== 'boolean') return res.status(400).json({ error: 'checked must be boolean' });
  if (ids.length > 200) return res.status(400).json({ error: 'Too many ids' });
  try {
    const result = await pool.query(
      `UPDATE shopping_list_items SET checked = $1
       WHERE user_id = $2 AND id = ANY($3::INTEGER[])
       RETURNING id`,
      [checked, req.user.id, ids]
    );
    res.json({ updated: result.rowCount });
  } catch (err) {
    console.error('Bulk check failed:', err.message);
    res.status(500).json({ error: 'Update Failed', detail: err.message });
  }
});

router.patch('/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
  const fields = [];
  const values = [];
  let idx = 1;
  if (typeof req.body.checked === 'boolean') {
    fields.push(`checked = $${idx++}`);
    values.push(req.body.checked);
  }
  if (req.body.ingredient_name !== undefined) {
    const name = sanitize(req.body.ingredient_name, MAX_NAME_LEN);
    if (!name) return res.status(400).json({ error: 'Invalid ingredient_name' });
    fields.push(`ingredient_name = $${idx++}`);
    values.push(name);
  }
  if (req.body.amount !== undefined) {
    const amount = req.body.amount === null ? null : sanitize(req.body.amount, MAX_AMOUNT_LEN);
    fields.push(`amount = $${idx++}`);
    values.push(amount);
  }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(req.user.id, id);
  try {
    const result = await pool.query(
      `UPDATE shopping_list_items SET ${fields.join(', ')}
       WHERE user_id = $${idx++} AND id = $${idx}
       RETURNING id, ingredient_name, amount, checked, recipe_id, created_at`,
      values
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not Found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Update Failed' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const r = await pool.query(
      'DELETE FROM shopping_list_items WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not Found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete Failed' });
  }
});

router.delete('/', authenticateToken, async (req, res) => {
  const onlyChecked = req.query.checked === 'true';
  try {
    if (onlyChecked) {
      await pool.query('DELETE FROM shopping_list_items WHERE user_id = $1 AND checked = TRUE', [req.user.id]);
    } else {
      await pool.query('DELETE FROM shopping_list_items WHERE user_id = $1', [req.user.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete Failed' });
  }
});

// Add all ingredients from a recipe to the user's shopping list in one call.
router.post('/from-recipe/:recipeId', authenticateToken, async (req, res) => {
  const recipeId = parseInt(req.params.recipeId, 10);
  if (!Number.isInteger(recipeId)) return res.status(400).json({ error: 'Invalid recipe id' });

  try {
    const recipeRow = await pool.query('SELECT title FROM recipes WHERE id = $1', [recipeId]);
    if (recipeRow.rows.length === 0) return res.status(404).json({ error: 'Recipe not found' });
    const recipeTitle = recipeRow.rows[0].title;

    const ingResult = await pool.query(
      'SELECT i.name, a.name AS amount FROM ingredients i LEFT JOIN amount a ON i.id = a.ingredient_id WHERE i.recipe_id = $1',
      [recipeId]
    );
    if (ingResult.rows.length === 0) return res.status(404).json({ error: 'Recipe has no ingredients' });

    let added = 0;
    let merged = 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const ing of ingResult.rows) {
        const name = typeof ing.name === 'string' ? ing.name.trim().slice(0, MAX_NAME_LEN) : '';
        if (!name) continue;
        const amount = typeof ing.amount === 'string' && ing.amount.trim()
          ? ing.amount.trim().slice(0, MAX_AMOUNT_LEN)
          : null;

        // Look for an existing unchecked item with the same name (case-insensitive)
        const existing = await client.query(
          `SELECT id, amount, source_recipe_ids FROM shopping_list_items
           WHERE user_id = $1 AND LOWER(ingredient_name) = LOWER($2) AND checked = FALSE
           LIMIT 1`,
          [req.user.id, name]
        );

        if (existing.rows.length > 0) {
          const row = existing.rows[0];
          const alreadyHasSource = (row.source_recipe_ids || []).includes(recipeId);
          if (alreadyHasSource) continue; // same recipe added twice — skip silently
          const combined = mergeAmount(row.amount || '', amount || '').slice(0, MAX_AMOUNT_LEN);
          await client.query(
            `UPDATE shopping_list_items
             SET amount = $1,
                 source_recipe_ids = array_append(source_recipe_ids, $2)
             WHERE id = $3`,
            [combined || null, recipeId, row.id]
          );
          merged++;
        } else {
          await client.query(
            `INSERT INTO shopping_list_items (user_id, ingredient_name, amount, recipe_id, source_recipe_ids)
             VALUES ($1, $2, $3, $4, ARRAY[$4]::INTEGER[])`,
            [req.user.id, name, amount, recipeId]
          );
          added++;
        }
      }
      await client.query('COMMIT');
      res.status(201).json({ count: added + merged, added, merged, recipe_title: recipeTitle });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Add from recipe failed:', err.message);
    const missingTable = /shopping_list_items.*does not exist/i.test(err.message);
    res.status(500).json({
      error: missingTable ? 'Shopping list table missing — run: npm run migrate' : 'Save Failed',
      detail: err.message,
    });
  }
});

// Email the user's current shopping list to themselves (or a custom address).
router.post('/email', authenticateToken, async (req, res) => {
  const overrideTo = typeof req.body?.to === 'string' ? req.body.to.trim() : '';
  const onlyUnchecked = req.body?.onlyUnchecked === true;
  try {
    const userResult = await pool.query('SELECT first_name, email FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const firstName = userResult.rows[0].first_name || '';
    const userEmail = decrypt(userResult.rows[0].email);

    const to = overrideTo || userEmail;
    if (!to || !/^\S+@\S+\.\S+$/.test(to)) return res.status(400).json({ error: 'Invalid email address' });

    const filter = onlyUnchecked ? 'AND s.checked = FALSE' : '';
    const itemsResult = await pool.query(
      `SELECT s.ingredient_name, s.amount, s.checked, r.title AS recipe_title
       FROM shopping_list_items s
       LEFT JOIN recipes r ON s.recipe_id = r.id
       WHERE s.user_id = $1 ${filter}
       ORDER BY s.checked ASC, s.created_at DESC`,
      [req.user.id]
    );

    if (itemsResult.rows.length === 0) {
      return res.status(400).json({ error: 'Your shopping list is empty' });
    }

    await sendShoppingListEmail(to, firstName, itemsResult.rows);
    res.json({ success: true, sentTo: to, count: itemsResult.rows.length });
  } catch (err) {
    console.error('Email shopping list failed:', err.message);
    res.status(500).json({ error: 'Email Failed' });
  }
});

// Generate an Instacart "Create a List" hosted page covering 80+ retailers.
// Requires INSTACART_API_KEY to be set; without it returns 503 with helpful message.
router.post('/instacart', authenticateToken, async (req, res) => {
  const apiKey = process.env.INSTACART_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Instacart integration not configured',
      hint: 'Set INSTACART_API_KEY in backend/.env (get one at developer.instacart.com).',
    });
  }

  const onlyUnchecked = req.body?.onlyUnchecked !== false;
  try {
    const filter = onlyUnchecked ? 'AND s.checked = FALSE' : '';
    const itemsResult = await pool.query(
      `SELECT s.ingredient_name, s.amount
       FROM shopping_list_items s
       WHERE s.user_id = $1 ${filter}
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    if (itemsResult.rows.length === 0) return res.status(400).json({ error: 'Your shopping list is empty' });

    const lineItems = itemsResult.rows.map(it => ({
      name: it.ingredient_name,
      ...(it.amount ? { display_text: `${it.amount} ${it.ingredient_name}` } : {}),
      quantity: 1,
    }));

    const apiBase = process.env.INSTACART_API_BASE || 'https://connect.instacart.com';
    const response = await axios.post(
      `${apiBase}/idp/v1/products/products_link`,
      {
        title: 'Byte Your Fork shopping list',
        link_type: 'shopping_list',
        line_items: lineItems,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const url = response.data?.products_link_url;
    if (!url) return res.status(502).json({ error: 'Instacart returned no link' });
    res.json({ url, count: itemsResult.rows.length });
  } catch (err) {
    const status = err.response?.status;
    console.error('Instacart link failed:', status, err.response?.data || err.message);
    res.status(502).json({ error: 'Instacart request failed', status });
  }
});

module.exports = router;
