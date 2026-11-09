#!/usr/bin/env node
// Local development seeder.
//
// Creates a verified admin + two demo users, then imports recipes from
// TheMealDB's free JSON API (the only content source in this project that is
// safe to use — see ENGINEERING_NOTES.md; the BudgetBytes/SimplyRecipes
// scrapers in scraper.js must not be used). Adds ratings, favorites, comments
// and events from the demo users so every screen has data.
//
// Idempotent: users upsert by username, recipes dedupe by title.
//
//   npm run seed                 # ~110 recipes across 12 cuisines
//   SEED_PER_AREA=4 npm run seed # smaller catalog
//
// Admin login (local only): username `brad`, password `TastyTest123`
// — override with SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD / SEED_ADMIN_EMAIL.

const axios = require('axios');
const bcrypt = require('bcrypt');
const pool = require('./db');
const { encrypt, hmac } = require('./crypto_helper');
const { inferDietaryFlags } = require('./utils/dietaryFlags');
const { toTitleCase } = require('./utils/titleCase');

const PER_AREA = parseInt(process.env.SEED_PER_AREA || '9', 10);
const AREAS = (process.env.SEED_AREAS ||
  'Italian,Mexican,Indian,Thai,Chinese,Greek,Moroccan,Jamaican,French,Japanese,Spanish,Vietnamese'
).split(',').map(a => a.trim()).filter(Boolean);

const MEALDB = 'https://www.themealdb.com/api/json/v1/1';

// ── Users ────────────────────────────────────────────────────────────────────
async function upsertUser({ first_name, surname, username, email, password, admin = false }) {
  const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  let id;
  if (existing.rows.length) {
    id = existing.rows[0].id;
  } else {
    const hash = await bcrypt.hash(password, 10);
    const res = await pool.query(
      'INSERT INTO users (first_name, surname, username, email, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [first_name, surname, username, encrypt(email.toLowerCase()), hash]
    );
    id = res.rows[0].id;
    await pool.query(
      'INSERT INTO email_hashes (user_id, email_hmac) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET email_hmac = $2',
      [id, hmac(email)]
    );
  }
  await pool.query('INSERT INTO verified_users (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [id]);
  if (admin) await pool.query('INSERT INTO admins (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [id]);
  return id;
}

// ── TheMealDB ────────────────────────────────────────────────────────────────
async function fetchArea(area) {
  const { data } = await axios.get(`${MEALDB}/filter.php`, { params: { a: area }, timeout: 15000 });
  return data.meals || [];
}

async function fetchMeal(id) {
  const { data } = await axios.get(`${MEALDB}/lookup.php`, { params: { i: id }, timeout: 15000 });
  return data.meals?.[0] || null;
}

function parseMeal(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = (meal[`strIngredient${i}`] || '').trim();
    if (!name) continue;
    ingredients.push({ name, amount: (meal[`strMeasure${i}`] || '').trim() });
  }
  const steps = (meal.strInstructions || '')
    .split(/\r?\n+/)
    .map(s => s.replace(/^\s*(step\s*\d+[.:)]?|\d+[.:)])\s*/i, '').trim())
    .filter(s => s.length > 10);
  return { title: toTitleCase(meal.strMeal), ingredients, steps, imageUrl: meal.strMealThumb, category: meal.strCategory || '' };
}

// TheMealDB has no cook times; estimate one from recipe complexity so the
// catalog doesn't show a uniform fake "30 min" on every card.
function estimateTtc({ steps, ingredients }) {
  const raw = 10 + steps.length * 4 + Math.round(ingredients.length * 1.5);
  return Math.max(15, Math.min(90, Math.round(raw / 5) * 5));
}

async function fetchImage(url) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    return { buffer: Buffer.from(res.data), mime: res.headers['content-type']?.split(';')[0] || 'image/jpeg' };
  } catch {
    return null;
  }
}

async function insertRecipe({ title, ingredients, steps, imageUrl, category }, tag, userId) {
  const dupe = await pool.query('SELECT id FROM recipes WHERE title = $1', [title]);
  if (dupe.rows.length) return null;

  const img = imageUrl ? await fetchImage(imageUrl) : null;
  const flags = inferDietaryFlags({ category, ingredients });
  const daysAgo = Math.random() * 45; // spread creation dates so notifications/“new” surfaces have content

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO recipes (title, ttc, user_id, dietary_flags, creation_date)
       VALUES ($1, $2, $3, $4, NOW() - ($5 || ' days')::interval) RETURNING id`,
      [title, estimateTtc({ steps, ingredients }), userId, flags, daysAgo.toFixed(2)]
    );
    const recipeId = r.rows[0].id;

    if (img) {
      // Relative URL: works through the Vite dev proxy, nginx in prod, and the
      // Capacitor app's API-base prefix (normalizeImageUrl). Never bake an
      // absolute localhost URL into the database.
      const i = await client.query(
        'INSERT INTO images (recipe_id, data, mime_type) VALUES ($1, $2, $3) RETURNING id',
        [recipeId, img.buffer, img.mime]
      );
      await client.query('UPDATE images SET url = $1 WHERE id = $2', [`/api/images/${i.rows[0].id}`, i.rows[0].id]);
    }

    await client.query('INSERT INTO recipe_tags (recipe_id, name) VALUES ($1, $2)', [recipeId, tag]);
    for (const ing of ingredients) {
      const i = await client.query('INSERT INTO ingredients (recipe_id, name) VALUES ($1, $2) RETURNING id', [recipeId, ing.name]);
      await client.query('INSERT INTO amount (ingredient_id, name) VALUES ($1, $2)', [i.rows[0].id, ing.amount]);
    }
    for (const step of steps) {
      await client.query('INSERT INTO steps (recipe_id, instruction) VALUES ($1, $2)', [recipeId, step]);
    }
    await client.query('COMMIT');
    return recipeId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Social data so ratings/analytics/recommendations aren't empty ────────────
async function addSocial(recipeIds, userIds) {
  const comments = [
    'Made this last night — easy and delicious.',
    'Family favorite already. Doubled the sauce.',
    'Great weeknight recipe, very forgiving.',
    'Came out perfect on the first try.',
  ];
  for (const recipeId of recipeIds) {
    for (const userId of userIds) {
      if (Math.random() < 0.55) {
        const rating = 3 + Math.floor(Math.random() * 3); // 3-5
        await pool.query(
          'INSERT INTO ratings (user_id, recipe_id, rating) VALUES ($1, $2, $3) ON CONFLICT (user_id, recipe_id) DO UPDATE SET rating = $3',
          [userId, recipeId, rating]
        );
        await pool.query('INSERT INTO events (user_id, event_type, recipe_id) VALUES ($1, $2, $3)', [userId, 'recipe_rated', recipeId]);
      }
      if (Math.random() < 0.4) {
        await pool.query('INSERT INTO events (user_id, event_type, recipe_id) VALUES ($1, $2, $3)', [userId, 'recipe_viewed', recipeId]);
      }
      if (Math.random() < 0.15) {
        await pool.query('INSERT INTO favorites (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, recipeId]);
        await pool.query('INSERT INTO events (user_id, event_type, recipe_id) VALUES ($1, $2, $3)', [userId, 'recipe_favorited', recipeId]);
      }
      if (Math.random() < 0.08) {
        await pool.query(
          'INSERT INTO comments (user_id, recipe_id, text) VALUES ($1, $2, $3)',
          [userId, recipeId, comments[Math.floor(Math.random() * comments.length)]]
        );
      }
    }
  }
}

async function run() {
  console.log('Seeding users…');
  const admin = await upsertUser({
    first_name: 'Brad', surname: 'M',
    username: process.env.SEED_ADMIN_USERNAME || 'brad',
    email: process.env.SEED_ADMIN_EMAIL || 'brad@local.test',
    password: process.env.SEED_ADMIN_PASSWORD || 'TastyTest123',
    admin: true,
  });
  const carla = await upsertUser({ first_name: 'Carla', surname: 'Demo', username: 'demo_carla', email: 'carla@local.test', password: 'TastyTest123' });
  const marco = await upsertUser({ first_name: 'Marco', surname: 'Demo', username: 'demo_marco', email: 'marco@local.test', password: 'TastyTest123' });
  console.log(`  admin id=${admin} (+ demo users ${carla}, ${marco})`);

  const newIds = [];
  for (const area of AREAS) {
    let list;
    try {
      list = await fetchArea(area);
    } catch (err) {
      console.warn(`  ${area}: list fetch failed (${err.message}) — skipping area`);
      continue;
    }
    const picks = list.slice(0, PER_AREA);
    let added = 0;
    for (const item of picks) {
      try {
        const meal = await fetchMeal(item.idMeal);
        if (!meal) continue;
        const parsed = parseMeal(meal);
        if (parsed.steps.length < 2 || parsed.ingredients.length < 2) continue;
        const id = await insertRecipe(parsed, area, admin);
        if (id) { newIds.push(id); added++; }
      } catch (err) {
        console.warn(`  ${area}/${item.strMeal}: ${err.message}`);
      }
    }
    console.log(`  ${area}: +${added} recipes`);
  }

  if (newIds.length) {
    console.log('Adding ratings/favorites/comments/events…');
    await addSocial(newIds, [admin, carla, marco]);
  }

  const total = await pool.query('SELECT COUNT(*)::int AS n FROM recipes');
  console.log(`Done. ${newIds.length} new recipes (${total.rows[0].n} total).`);
  await pool.end();
}

run().catch(err => { console.error(err); process.exit(1); });
