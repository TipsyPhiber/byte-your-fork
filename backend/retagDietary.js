#!/usr/bin/env node
// One-shot script to retag all recipes with inferred dietary flags.
// Safe to re-run. Usage: npm run retag

require('dotenv').config();
const pool = require('./db');
const { inferDietaryFlags } = require('./utils/dietaryFlags');

async function run() {
  const recipes = await pool.query(`
    SELECT r.id, r.title, t.name AS category
    FROM recipes r
    LEFT JOIN recipe_tags t ON r.id = t.recipe_id
  `);
  console.log(`Retagging ${recipes.rows.length} recipes...`);

  let changed = 0;
  for (const r of recipes.rows) {
    const ing = await pool.query(
      'SELECT i.name, a.name AS amount FROM ingredients i LEFT JOIN amount a ON i.id = a.ingredient_id WHERE i.recipe_id = $1',
      [r.id]
    );
    const flags = inferDietaryFlags({
      category: r.category,
      ingredients: ing.rows,
    });
    await pool.query('UPDATE recipes SET dietary_flags = $1 WHERE id = $2', [flags, r.id]);
    changed++;
    if (changed % 50 === 0) console.log(`  ${changed}/${recipes.rows.length}`);
  }
  console.log(`Done. Updated ${changed} recipes.`);
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
