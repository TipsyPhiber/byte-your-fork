#!/usr/bin/env node
// Import recipes from Spoonacular (commercially licensed content source).
// Requires SPOONACULAR_API_KEY in backend/.env. Free tier: 150 points/day.
// Each recipe costs ~1 point via complexSearch + 1 via informationBulk.
//
// Usage:
//   node importSpoonacular.js                    # default cuisines, ~50/cuisine
//   SPOONACULAR_LIMIT=20 node importSpoonacular.js
//   SPOONACULAR_CUISINES='Italian,Thai' node importSpoonacular.js

const axios = require('axios');
require('dotenv').config();
const pool = require('./db');
const { toTitleCase } = require('./utils/titleCase');
const { inferDietaryFlags } = require('./utils/dietaryFlags');

const API_KEY = process.env.SPOONACULAR_API_KEY;
const PER_CUISINE = parseInt(process.env.SPOONACULAR_LIMIT || '50', 10);
const DELAY_MS = parseInt(process.env.SPOONACULAR_DELAY_MS || '500', 10);
const DEFAULT_CUISINES = [
  'Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'Indian',
  'French', 'Greek', 'Spanish', 'Middle Eastern', 'American',
  'Korean', 'Vietnamese', 'British', 'Mediterranean',
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

if (!API_KEY) {
  console.error('SPOONACULAR_API_KEY is not set in backend/.env.');
  console.error('Sign up free at https://spoonacular.com/food-api (150 points/day).');
  process.exit(1);
}

async function fetchImageBuffer(url) {
  try {
    const response = await axios({ url, method: 'GET', responseType: 'arraybuffer', timeout: 10000 });
    const mimeType = response.headers['content-type']?.split(';')[0] || 'image/jpeg';
    return { buffer: Buffer.from(response.data), mimeType };
  } catch { return null; }
}

function extractIngredients(extended) {
  if (!Array.isArray(extended)) return [];
  return extended.map(ing => {
    const amountStr = ing.original?.match(/^[\d./\s½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞-]+\s?\w+/)?.[0]?.trim() || '';
    let amount = amountStr;
    if (!amount && ing.measures?.us) {
      const amt = ing.measures.us.amount;
      const unit = ing.measures.us.unitShort || ing.measures.us.unitLong || '';
      if (amt) amount = `${amt % 1 === 0 ? amt : amt.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}${unit ? ' ' + unit : ''}`.trim();
    }
    const name = (ing.nameClean || ing.name || '').trim();
    return { name, amount };
  }).filter(i => i.name);
}

function extractSteps(analyzed) {
  if (!Array.isArray(analyzed) || analyzed.length === 0) return [];
  const out = [];
  for (const section of analyzed) {
    for (const step of section.steps || []) {
      if (step.step && step.step.trim().length > 5) out.push(step.step.trim());
    }
  }
  return out;
}

async function saveRecipe(r) {
  r.title = toTitleCase(r.title);
  const existing = await pool.query('SELECT id FROM recipes WHERE title = $1', [r.title]);
  if (existing.rows.length > 0) {
    console.log(`  Skipping (exists): ${r.title}`);
    return;
  }

  const imgData = r.imageUrl ? await fetchImageBuffer(r.imageUrl) : null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      'INSERT INTO recipes (title, ttc, user_id, dietary_flags) VALUES ($1, $2, $3, $4) RETURNING id',
      [r.title, r.ttc, 1, r.dietaryFlags || []]
    );
    const rid = res.rows[0].id;

    if (imgData) {
      const imgRes = await client.query(
        'INSERT INTO images (recipe_id, data, mime_type, url) VALUES ($1, $2, $3, $4) RETURNING id',
        [rid, imgData.buffer, imgData.mimeType, '']
      );
      const imageId = imgRes.rows[0].id;
      const appUrl = process.env.APP_URL || 'http://localhost:5000';
      await client.query('UPDATE images SET url = $1 WHERE id = $2', [`${appUrl}/api/images/${imageId}`, imageId]);
    }

    if (r.category) {
      await client.query('INSERT INTO recipe_tags (recipe_id, name) VALUES ($1, $2)', [rid, r.category]);
    }

    for (const ing of r.ingredients) {
      const iRes = await client.query('INSERT INTO ingredients (recipe_id, name) VALUES ($1, $2) RETURNING id', [rid, ing.name]);
      await client.query('INSERT INTO amount (ingredient_id, name) VALUES ($1, $2)', [iRes.rows[0].id, ing.amount || '']);
    }
    for (const s of r.steps) {
      await client.query('INSERT INTO steps (recipe_id, instruction) VALUES ($1, $2)', [rid, s]);
    }

    await client.query('COMMIT');
    console.log(`Saved: [${r.category}] ${r.title}`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(`Save failed for "${r.title}":`, e.message);
  } finally { client.release(); }
}

async function searchCuisine(cuisine, limit) {
  const url = 'https://api.spoonacular.com/recipes/complexSearch';
  const res = await axios.get(url, {
    timeout: 20000,
    params: {
      apiKey: API_KEY,
      cuisine,
      number: limit,
      addRecipeInformation: true,
      fillIngredients: true,
      instructionsRequired: true,
    },
  });
  const quotaUsed = res.headers['x-api-quota-used'];
  const quotaLeft = res.headers['x-api-quota-left'];
  if (quotaLeft) console.log(`  Quota: used ${quotaUsed} / ${parseFloat(quotaUsed || 0) + parseFloat(quotaLeft || 0)}`);
  return res.data.results || [];
}

async function start() {
  const cuisines = (process.env.SPOONACULAR_CUISINES
    ? process.env.SPOONACULAR_CUISINES.split(',').map(s => s.trim()).filter(Boolean)
    : DEFAULT_CUISINES);

  console.log(`Importing from Spoonacular (${cuisines.length} cuisines, ${PER_CUISINE}/cuisine)...`);

  for (const cuisine of cuisines) {
    console.log(`--- ${cuisine} ---`);
    let results;
    try {
      results = await searchCuisine(cuisine, PER_CUISINE);
    } catch (e) {
      if (e.response?.status === 402) {
        console.error(`  Daily quota exceeded. Stopping. Resumes tomorrow, or upgrade at spoonacular.com/food-api.`);
        break;
      }
      console.error(`  Search failed: ${e.response?.status || e.code || e.message}`);
      continue;
    }
    console.log(`  Got ${results.length} recipes`);

    for (const raw of results) {
      // Spoonacular exposes explicit booleans. Map them to our flag strings.
      const spoonacularFlags = new Set();
      if (raw.vegan) spoonacularFlags.add('vegan');
      if (raw.vegetarian) spoonacularFlags.add('vegetarian');
      if (raw.dairyFree) spoonacularFlags.add('dairy_free');
      if (raw.glutenFree) spoonacularFlags.add('gluten_free');
      // Anything vegan is vegetarian
      if (spoonacularFlags.has('vegan')) spoonacularFlags.add('vegetarian');

      const ingredients = extractIngredients(raw.extendedIngredients);
      const steps = extractSteps(raw.analyzedInstructions);

      // Fill in the flags Spoonacular doesn't provide (nut_free, egg_free, shellfish_free)
      // via our heuristic, and only add flags, never remove.
      const inferred = inferDietaryFlags({ category: cuisine, ingredients });
      for (const f of ['nut_free', 'egg_free', 'shellfish_free']) {
        if (inferred.includes(f)) spoonacularFlags.add(f);
      }

      const recipe = {
        title: raw.title,
        ttc: Math.min(Math.max(raw.readyInMinutes || 30, 1), 1440),
        imageUrl: raw.image,
        ingredients,
        steps,
        category: cuisine,
        dietaryFlags: Array.from(spoonacularFlags),
      };
      if (!recipe.title || recipe.ingredients.length === 0 || recipe.steps.length === 0) {
        console.log(`  Skipping (incomplete): ${raw.title || '?'}`);
        continue;
      }
      await saveRecipe(recipe);
      await sleep(DELAY_MS);
    }
  }

  console.log('Spoonacular import complete.');
  await pool.end();
}

start().catch(err => { console.error(err); process.exit(1); });
