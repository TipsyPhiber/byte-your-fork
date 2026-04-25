const pool = require('./db');
const axios = require('axios');
const cheerio = require('cheerio');
const { toTitleCase } = require('./utils/titleCase');
const { inferDietaryFlags } = require('./utils/dietaryFlags');

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const PER_CATEGORY_LIMIT = parseInt(process.env.SCRAPE_LIMIT || '60', 10);
const MEALDB_PER_AREA_LIMIT = parseInt(process.env.MEALDB_LIMIT || '40', 10);
const REQUEST_DELAY_MS = parseInt(process.env.SCRAPE_DELAY_MS || '1500', 10);
const BACKOFF_ON_BLOCK_MS = parseInt(process.env.SCRAPE_BACKOFF_MS || '60000', 10);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchHtml(url, timeoutMs = 15000) {
  const res = await axios.get(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: timeoutMs,
    responseType: 'text',
    validateStatus: (s) => s < 400 || s === 403 || s === 429 || s === 402,
  });
  // If we hit a block, surface it as an error with a marker property
  if (res.status === 403 || res.status === 429 || res.status === 402) {
    const err = new Error(`HTTP ${res.status} from ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.data;
}

async function fetchImageBuffer(url) {
  try {
    const response = await axios({ url, method: 'GET', responseType: 'arraybuffer', timeout: 10000, headers: { 'User-Agent': UA } });
    const mimeType = response.headers['content-type']?.split(';')[0] || 'image/jpeg';
    return { buffer: Buffer.from(response.data), mimeType };
  } catch {
    return null;
  }
}

// ── ISO8601 duration to minutes (PT1H30M → 90) ────────────────────────────────
function iso8601ToMinutes(s) {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/^P(?:T)?(?:(\d+)D)?(?:T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (!m) return null;
  const [, d, h, min] = m;
  const total = (parseInt(d || 0) * 1440) + (parseInt(h || 0) * 60) + parseInt(min || 0);
  return total > 0 ? total : null;
}

// ── Split a free-form ingredient line into { amount, name } heuristically ─────
const UNIT_WORDS = new Set([
  'cup','cups','tbsp','tbsps','tablespoon','tablespoons','tsp','tsps','teaspoon','teaspoons',
  'oz','ounce','ounces','lb','lbs','pound','pounds','g','gram','grams','kg','kilogram','kilograms',
  'ml','milliliter','milliliters','l','liter','liters','litre','litres',
  'pinch','pinches','dash','dashes','clove','cloves','stick','sticks','slice','slices',
  'can','cans','jar','jars','bunch','bunches','handful','handfuls','sprig','sprigs',
  'quart','quarts','pint','pints','gallon','gallons','package','packages','pkg','packet','packets',
]);

function splitIngredient(line) {
  if (!line) return { amount: '', name: '' };
  const cleaned = line.trim().replace(/\s+/g, ' ');
  // Quantity run: digits, fractions, unicode-fractions, ranges, decimals
  const qtyMatch = cleaned.match(/^([\d./\s½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞–-]+)(\s+|$)(.*)$/);
  if (!qtyMatch) return { amount: '', name: cleaned };

  const qty = qtyMatch[1].trim();
  let rest = qtyMatch[3].trim();
  // Look for a unit word as the first token of rest
  const restTokens = rest.split(/\s+/);
  if (restTokens.length > 0) {
    const first = restTokens[0].toLowerCase().replace(/[.,;:]$/, '');
    if (UNIT_WORDS.has(first)) {
      return { amount: `${qty} ${restTokens[0]}`.trim(), name: restTokens.slice(1).join(' ').trim() };
    }
  }
  return { amount: qty, name: rest };
}

// ── Find the Recipe object inside a page's JSON-LD blocks ─────────────────────
function findRecipeInLd(node) {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeInLd(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === 'object') {
    const type = node['@type'];
    if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return node;
    if (node['@graph']) return findRecipeInLd(node['@graph']);
  }
  return null;
}

function extractRecipeFromHtml(html) {
  const $ = cheerio.load(html);
  const blocks = $('script[type="application/ld+json"]').toArray();
  for (const el of blocks) {
    const raw = $(el).contents().text().trim();
    if (!raw) continue;
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { continue; }
    const recipe = findRecipeInLd(parsed);
    if (recipe) return recipe;
  }
  return null;
}

function normalizeInstructions(ld) {
  const inst = ld.recipeInstructions;
  if (!inst) return [];
  const out = [];
  const walk = (node) => {
    if (!node) return;
    if (typeof node === 'string') { out.push(node.trim()); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node === 'object') {
      if (node['@type'] === 'HowToSection' && node.itemListElement) return walk(node.itemListElement);
      if (node.text) out.push(String(node.text).trim());
      else if (node.name) out.push(String(node.name).trim());
    }
  };
  walk(inst);
  return out
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => s.length > 3);
}

function normalizeImage(ld) {
  const img = ld.image;
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) return typeof img[0] === 'string' ? img[0] : img[0]?.url;
  if (typeof img === 'object') return img.url || null;
  return null;
}

function normalizeRecipe(ld, fallbackCategory) {
  if (!ld) return null;
  const title = typeof ld.name === 'string' ? ld.name.trim() : null;
  if (!title) return null;

  const ttc = iso8601ToMinutes(ld.totalTime)
    || iso8601ToMinutes(ld.cookTime)
    || 30;

  const rawIngredients = Array.isArray(ld.recipeIngredient) ? ld.recipeIngredient
    : Array.isArray(ld.ingredients) ? ld.ingredients
    : [];
  const ingredients = rawIngredients
    .map(s => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .map(splitIngredient)
    .filter(i => i.name);

  const steps = normalizeInstructions(ld);
  if (ingredients.length === 0 || steps.length === 0) return null;

  return {
    title,
    ttc: Math.min(Math.max(ttc, 1), 1440),
    imageUrl: normalizeImage(ld),
    ingredients,
    steps,
    category: fallbackCategory,
  };
}

async function scrapeRecipeUrl(url, category) {
  const html = await fetchHtml(url);
  const ld = extractRecipeFromHtml(html);
  if (!ld) return null;
  return normalizeRecipe(ld, category);
}

// Common slugs that match a generic "recipe-looking" URL pattern but aren't recipes.
const NON_RECIPE_SLUG = /\/(about|contact|faq|join|index|privacy-policy|terms-conditions|web-accessibility|kitchen-basics|stock-kitchen-pantry-staples|welcome-to-[a-z-]+|easy-[a-z-]+-recipes|\d+-[a-z-]+-(weeknight|dinner|lunch|breakfast|recipes))\/?$/i;

// ── Category page link extractor ──────────────────────────────────────────────
// containerSelector: scope link search to article/content containers so we don't
// pick up site-wide nav/footer links (e.g. /privacy-policy/, /about/).
async function getRecipeLinks({ categoryUrl, linkPattern, maxLinks, maxPages = 6, paginateTemplate, containerSelectors = ['article', 'main article', '.entry-content', '.post-card', '.card-list'] }) {
  const seen = new Set();
  const links = [];
  for (let pageNum = 1; pageNum <= maxPages && links.length < maxLinks; pageNum++) {
    const url = pageNum === 1 ? categoryUrl : paginateTemplate(categoryUrl, pageNum);
    let html;
    try {
      html = await fetchHtml(url);
    } catch (e) {
      console.log(`  Page ${pageNum} fetch failed: ${e.message}`);
      break;
    }

    const $ = cheerio.load(html);
    // Find first container selector that yields any matches; if none, fall back to whole page
    // but still filter aggressively.
    let $scope = null;
    for (const sel of containerSelectors) {
      const found = $(sel);
      if (found.length > 0) { $scope = found; break; }
    }
    const $root = $scope || $.root();

    let foundOnPage = 0;
    $root.find('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      let absolute;
      try { absolute = new URL(href, categoryUrl).toString().split('#')[0]; }
      catch { return; }
      if (NON_RECIPE_SLUG.test(absolute)) return;
      if (!linkPattern.test(absolute)) return;
      if (seen.has(absolute)) return;
      seen.add(absolute);
      links.push(absolute);
      foundOnPage++;
      if (links.length >= maxLinks) return false;
    });

    if (foundOnPage === 0) {
      console.log(`  Page ${pageNum}: 0 links (HTML size: ${html.length}B, scope: ${$scope ? 'scoped' : 'full-page fallback'})`);
      break;
    }
    await sleep(REQUEST_DELAY_MS);
  }
  return links;
}

// ── Save (same shape as before) ───────────────────────────────────────────────
async function saveRecipe(r) {
  r.title = toTitleCase(r.title);
  const existing = await pool.query('SELECT id FROM recipes WHERE title = $1', [r.title]);
  if (existing.rows.length > 0) {
    console.log(`  Skipping (exists): ${r.title}`);
    return;
  }

  const imgData = r.imageUrl ? await fetchImageBuffer(r.imageUrl) : null;

  const client = await pool.connect();
  const dietaryFlags = inferDietaryFlags({ category: r.category, ingredients: r.ingredients });
  try {
    await client.query('BEGIN');
    const res = await client.query(
      'INSERT INTO recipes (title, ttc, user_id, dietary_flags) VALUES ($1, $2, $3, $4) RETURNING id',
      [r.title, r.ttc, 1, dietaryFlags]
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
      await client.query('INSERT INTO amount (ingredient_id, name) VALUES ($1, $2)', [iRes.rows[0].id, ing.amount]);
    }
    for (const s of r.steps) await client.query('INSERT INTO steps (recipe_id, instruction) VALUES ($1, $2)', [rid, s]);

    await client.query('COMMIT');
    console.log(`Saved: [${r.category}] ${r.title}`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Save failed:', e.message);
  } finally { client.release(); }
}

// ── Source: generic JSON-LD sites ─────────────────────────────────────────────
async function scrapeJsonLdSource({ name, categories, linkPattern, paginateTemplate }) {
  for (const cat of categories) {
    console.log(`--- ${name}: ${cat.name} ---`);
    let urls = [];
    try {
      urls = await getRecipeLinks({
        categoryUrl: cat.url,
        linkPattern,
        maxLinks: PER_CATEGORY_LIMIT,
        paginateTemplate,
      });
    } catch (e) {
      if (e.status === 403 || e.status === 429) {
        console.error(`  ${name} blocked (${e.status}). Sleeping ${BACKOFF_ON_BLOCK_MS / 1000}s before continuing...`);
        await sleep(BACKOFF_ON_BLOCK_MS);
      } else {
        console.error(`  Failed to list ${cat.url}: ${e.message}`);
      }
      continue;
    }
    console.log(`  Found ${urls.length} candidate links`);
    for (const url of urls) {
      try {
        const recipe = await scrapeRecipeUrl(url, cat.name);
        if (recipe) {
          await saveRecipe(recipe);
        }
        // Silent on no-JSON-LD — we already filter most via NON_RECIPE_SLUG upstream
      } catch (e) {
        if (e.status === 403 || e.status === 429) {
          console.error(`  ${name} blocked (${e.status}) on ${url}. Backing off ${BACKOFF_ON_BLOCK_MS / 1000}s and moving on.`);
          await sleep(BACKOFF_ON_BLOCK_MS);
          break; // move to next category
        }
        console.error(`  Error on ${url}: ${e.message}`);
      }
      await sleep(REQUEST_DELAY_MS);
    }
  }
}

// ── TheMealDB API fetcher (unchanged — already pure HTTP) ─────────────────────
const MEALDB_AREA_MAP = {
  'Middle Eastern': 'Moroccan',
  'Cajun':          'Jamaican',
};

function describeError(e) {
  const parts = [];
  if (e.code) parts.push(e.code);
  if (e.response?.status) parts.push(`HTTP ${e.response.status}`);
  if (e.message) parts.push(e.message);
  else if (e.errno) parts.push(`errno ${e.errno}`);
  return parts.length ? parts.join(' — ') : 'unknown error';
}

async function getJsonWithRetry(url, { timeout = 15000, attempts = 3, backoffMs = 1500 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await axios.get(url, { timeout, headers: { 'User-Agent': UA } });
      return res.data;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await sleep(backoffMs * (i + 1));
    }
  }
  throw lastErr;
}

async function fetchMealDB(categoryName) {
  const area = MEALDB_AREA_MAP[categoryName] || categoryName;
  console.log(`--- TheMealDB: ${categoryName} (area: ${area}) ---`);

  let listData;
  try {
    listData = await getJsonWithRetry(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${area}`);
  } catch (e) {
    console.error(`  Failed to list ${area}: ${describeError(e)} (skipping area)`);
    return [];
  }
  const meals = (listData.meals || []).slice(0, MEALDB_PER_AREA_LIMIT);

  const results = [];
  for (const meal of meals) {
    try {
      const detailRes = { data: await getJsonWithRetry(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`) };
      const m = detailRes.data.meals[0];

      const ingredients = [];
      for (let i = 1; i <= 20; i++) {
        const name = m[`strIngredient${i}`];
        const amount = m[`strMeasure${i}`];
        if (name && name.trim()) ingredients.push({ name: name.trim(), amount: (amount || '').trim() });
      }

      const steps = m.strInstructions
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(s => s.length > 10);

      results.push({
        title: m.strMeal,
        ttc: 30,
        imageUrl: m.strMealThumb,
        ingredients,
        steps,
        category: categoryName,
      });
    } catch { /* skip meals that fail detail fetch */ }
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function start() {
  const budgetBytes = {
    name: 'Budget Bytes',
    linkPattern: /^https?:\/\/(www\.)?budgetbytes\.com\/[a-z0-9-]+\/$/,
    paginateTemplate: (base, n) => `${base.endsWith('/') ? base : base + '/'}page/${n}/`,
    categories: [
      { name: 'Italian',       url: 'https://www.budgetbytes.com/category/recipes/global/italian/' },
      { name: 'Asian',         url: 'https://www.budgetbytes.com/category/recipes/global/asian/' },
      { name: 'Mediterranean', url: 'https://www.budgetbytes.com/category/recipes/global/mediterranean/' },
      { name: 'Indian',        url: 'https://www.budgetbytes.com/category/recipes/global/indian/' },
      { name: 'Southwest',     url: 'https://www.budgetbytes.com/category/recipes/global/southwest/' },
      { name: 'Breakfast',     url: 'https://www.budgetbytes.com/category/recipes/breakfast-recipes/' },
      { name: 'Soup',          url: 'https://www.budgetbytes.com/category/recipes/soup-stew/' },
      { name: 'Pasta',         url: 'https://www.budgetbytes.com/category/recipes/pasta/' },
      { name: 'Salad',         url: 'https://www.budgetbytes.com/category/recipes/salad-recipes/' },
      { name: 'Chicken',       url: 'https://www.budgetbytes.com/category/recipes/by-protein/chicken/' },
      { name: 'Beef',          url: 'https://www.budgetbytes.com/category/recipes/by-protein/beef-recipes/' },
      { name: 'Vegetarian',    url: 'https://www.budgetbytes.com/category/recipes/vegetarian/' },
      { name: 'Vegan',         url: 'https://www.budgetbytes.com/category/recipes/vegan/' },
      { name: 'Dessert',       url: 'https://www.budgetbytes.com/category/recipes/dessert-recipes/' },
      { name: 'Slow Cooker',   url: 'https://www.budgetbytes.com/category/recipes/slow-cooker-recipes/' },
    ],
  };

  // Alternative JSON-LD sources that allow scraping. Add more as needed.
  const simplyRecipes = {
    name: 'Simply Recipes',
    linkPattern: /^https?:\/\/(www\.)?simplyrecipes\.com\/recipes\/[a-z0-9_-]+\/?$/,
    paginateTemplate: (base, n) => `${base}${base.endsWith('/') ? '' : '/'}?page=${n}`,
    categories: [
      { name: 'Breakfast', url: 'https://www.simplyrecipes.com/breakfast-recipes-5091371' },
      { name: 'Dinner',    url: 'https://www.simplyrecipes.com/dinner-recipes-5091376' },
      { name: 'Dessert',   url: 'https://www.simplyrecipes.com/dessert-recipes-5091382' },
    ],
  };

  const mealDbCategories = [
    'Mexican', 'American', 'Thai', 'Middle Eastern', 'Cajun',
    'Italian', 'Indian', 'Chinese', 'Japanese', 'French',
    'Greek', 'Spanish', 'British', 'Vietnamese', 'Turkish',
  ];

  console.log('Starting sync (existing recipes will be skipped)...');

  try { await scrapeJsonLdSource(budgetBytes); }
  catch (e) { console.error('Budget Bytes source failed:', e.message); }

  try { await scrapeJsonLdSource(simplyRecipes); }
  catch (e) { console.error('Simply Recipes source failed:', e.message); }

  for (const catName of mealDbCategories) {
    try {
      const recipes = await fetchMealDB(catName);
      for (const r of recipes) await saveRecipe(r);
    } catch (e) {
      console.error(`MealDB ${catName} failed: ${e.message} (continuing)`);
    }
  }

  console.log('Sync complete.');
  process.exit(0);
}

if (require.main === module) {
  start().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { scrapeRecipeUrl, extractRecipeFromHtml, normalizeRecipe, splitIngredient };
