#!/usr/bin/env node
// Bulk importer for the Kaggle "recipes_extended" dataset (~62k recipes).
//
// Why a separate script from seed.js: seed.js inserts one recipe per
// transaction and downloads an image per recipe over the network — fine for
// ~100 TheMealDB recipes, far too slow for 62k. This streams the CSV and uses
// batched multi-row inserts, no network calls.
//
// Mapping CSV -> schema:
//   recipe_title          -> recipes.title
//   description           -> recipes.description   (migration 006)
//   category, subcategory -> recipe_tags.name      (deduped)
//   ingredients (JSON[])  -> ingredients.name       (FULL string, e.g.
//                            "3/4 cup ketchup"; amount left null — the API
//                            LEFT JOINs amount, so null is fine. A later pass
//                            can split quantity from name if needed.)
//   directions (JSON[])   -> steps.instruction
//   (derived)             -> recipes.ttc            (estimated from counts)
//   (derived)             -> recipes.dietary_flags  (rule engine, no LLM)
// No images (dataset has none) — added later.
//
// Recipes get an author (first admin) and a creation_date spread 31–400 days
// in the past, so 62k rows don't flood the 30-day Notifications screen.
//
// Usage:
//   node importKaggle.js --dry-run [--limit=20]   # parse + map, print, no writes
//   node importKaggle.js [--limit=N]              # real import (optional cap)
//   IMPORT_CSV=/abs/path.csv node importKaggle.js
//
// Idempotent-ish: dedupes by title against the DB and within the run.

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const pool = require('./db');
const { inferDietaryFlags } = require('./utils/dietaryFlags');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = (() => {
  const a = args.find(x => x.startsWith('--limit='));
  return a ? parseInt(a.split('=')[1], 10) : Infinity;
})();
const BATCH_SIZE = parseInt(process.env.IMPORT_BATCH || '500', 10);
const CSV = process.env.IMPORT_CSV ||
  path.join(__dirname, '..', 'recipes_extended-selected-columns.csv');

// ── ttc estimate (same shape as seed.js) ─────────────────────────────────────
function estimateTtc(nSteps, nIng) {
  const raw = 10 + nSteps * 4 + Math.round(nIng * 1.5);
  return Math.max(15, Math.min(90, Math.round(raw / 5) * 5));
}

// ── Map one CSV record to a normalized recipe, or null to skip ───────────────
function mapRow(rec) {
  const title = (rec.recipe_title || '').trim();
  if (!title) return null;

  let ingredients, steps;
  try {
    ingredients = JSON.parse(rec.ingredients || '[]')
      .map(s => String(s).trim()).filter(Boolean);
    steps = JSON.parse(rec.directions || '[]')
      .map(s => String(s).trim()).filter(s => s.length > 0);
  } catch {
    return null; // malformed JSON cell
  }
  if (ingredients.length < 1 || steps.length < 1) return null;

  const category = (rec.category || '').trim();
  const subcategory = (rec.subcategory || '').trim();
  const tags = [];
  if (category) tags.push(category);
  if (subcategory && subcategory !== category) tags.push(subcategory);

  const flags = inferDietaryFlags({
    category,
    ingredients: ingredients.map(name => ({ name, amount: '' })),
  });

  return {
    title,
    description: (rec.description || '').trim() || null,
    ttc: estimateTtc(steps.length, ingredients.length),
    flags,
    tags,
    ingredients,
    steps,
  };
}

// ── Generic chunked multi-row insert (respects PG's 65535-param limit) ────────
async function bulkInsert(client, table, cols, rows, returning) {
  if (!rows.length) return [];
  const perRow = cols.length;
  const chunkSize = Math.max(1, Math.floor(60000 / perRow));
  const out = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const params = [];
    const tuples = chunk.map((r, ri) => {
      const ph = r.map((_, ci) => `$${ri * perRow + ci + 1}`);
      params.push(...r);
      return `(${ph.join(',')})`;
    });
    let q = `INSERT INTO ${table} (${cols.join(', ')}) VALUES ${tuples.join(', ')}`;
    if (returning) q += ` RETURNING ${returning}`;
    const res = await client.query(q, params);
    if (returning) out.push(...res.rows);
  }
  return out;
}

// ── Flush a batch of recipes in one transaction ──────────────────────────────
async function flush(batch, authorId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const recipeRows = batch.map(r => {
      const daysAgo = 31 + Math.floor(Math.random() * 369);
      const created = new Date(Date.now() - daysAgo * 86400000);
      return [r.title, r.ttc, authorId, r.flags, r.description, created];
    });
    const ids = await bulkInsert(
      client, 'recipes',
      ['title', 'ttc', 'user_id', 'dietary_flags', 'description', 'creation_date'],
      recipeRows, 'id',
    );

    const stepRows = [];
    const tagRows = [];
    const ingRows = [];
    ids.forEach((row, i) => {
      for (const s of batch[i].steps) stepRows.push([row.id, s]);
      for (const t of batch[i].tags) tagRows.push([row.id, t]);
      for (const ing of batch[i].ingredients) ingRows.push([row.id, ing]);
    });
    await bulkInsert(client, 'steps', ['recipe_id', 'instruction'], stepRows);
    await bulkInsert(client, 'recipe_tags', ['recipe_id', 'name'], tagRows);
    await bulkInsert(client, 'ingredients', ['recipe_id', 'name'], ingRows);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function run() {
  // Author = first admin (recipes.user_id is required).
  const admin = await pool.query('SELECT user_id FROM admins ORDER BY user_id LIMIT 1');
  if (!admin.rows.length) {
    console.error('No admin user found. Run `npm run seed` first to create one.');
    process.exit(1);
  }
  const authorId = admin.rows[0].user_id;

  // Dedupe against existing titles.
  const seen = new Set(
    (await pool.query('SELECT lower(title) AS t FROM recipes')).rows.map(r => r.t)
  );
  const startCount = seen.size;

  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Importing from ${CSV}`);
  console.log(`Author user_id=${authorId}, ${startCount} recipes already in DB, batch=${BATCH_SIZE}`);

  const parser = fs.createReadStream(CSV).pipe(
    parse({ columns: true, relax_column_count: true, skip_empty_lines: true })
  );

  let processed = 0, imported = 0, skipped = 0, dupes = 0;
  let batch = [];

  for await (const rec of parser) {
    if (processed >= LIMIT) break;
    processed++;

    const mapped = mapRow(rec);
    if (!mapped) { skipped++; continue; }

    const key = mapped.title.toLowerCase();
    if (seen.has(key)) { dupes++; continue; }
    seen.add(key);

    if (DRY_RUN) {
      if (imported < 20) {
        console.log(`\n#${imported + 1} ${mapped.title}`);
        console.log(`  ttc=${mapped.ttc}min  tags=[${mapped.tags.join(', ')}]`);
        console.log(`  flags=[${mapped.flags.join(', ')}]`);
        console.log(`  ingredients(${mapped.ingredients.length}): ${mapped.ingredients.slice(0, 3).join(' | ')}…`);
        console.log(`  steps(${mapped.steps.length}): ${mapped.steps[0].slice(0, 80)}…`);
      }
      imported++;
      continue;
    }

    batch.push(mapped);
    if (batch.length >= BATCH_SIZE) {
      await flush(batch, authorId);
      imported += batch.length;
      batch = [];
      if (imported % 5000 < BATCH_SIZE) {
        console.log(`  …${imported} imported (${processed} processed)`);
      }
    }
  }
  if (!DRY_RUN && batch.length) {
    await flush(batch, authorId);
    imported += batch.length;
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] would import' : 'Imported'} ${imported} recipes.`);
  console.log(`  processed=${processed}  skipped(bad)=${skipped}  dupes=${dupes}`);
  if (!DRY_RUN) {
    const total = await pool.query('SELECT count(*)::int AS n FROM recipes');
    console.log(`  recipes in DB now: ${total.rows[0].n}`);
  }
  await pool.end();
}

run().catch(err => { console.error(err); process.exit(1); });
