const puppeteer = require('puppeteer');
const pool = require('./db');
const axios = require('axios');

async function fetchImageBuffer(url) {
  try {
    const response = await axios({ url, method: 'GET', responseType: 'arraybuffer', timeout: 10000 });
    const mimeType = response.headers['content-type']?.split(';')[0] || 'image/jpeg';
    return { buffer: Buffer.from(response.data), mimeType };
  } catch (e) {
    return null;
  }
}

async function saveRecipe(r) {
  // Skip if recipe already exists
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
      'INSERT INTO recipes (title, ttc, user_id) VALUES ($1, $2, $3) RETURNING id',
      [r.title, r.ttc, 1]
    );
    const rid = res.rows[0].id;

    if (imgData) {
      const imgRes = await client.query(
        'INSERT INTO images (recipe_id, data, mime_type, url) VALUES ($1, $2, $3, $4) RETURNING id',
        [rid, imgData.buffer, imgData.mimeType, '']
      );
      const imageId = imgRes.rows[0].id;
      await client.query('UPDATE images SET url = $1 WHERE id = $2', [`http://localhost:5000/api/images/${imageId}`, imageId]);
    }

    await client.query('INSERT INTO recipe_tags (recipe_id, name) VALUES ($1, $2)', [rid, r.category]);

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

// ── Budget Bytes scraper (puppeteer) ──────────────────────────────────────────
async function scrapeBudgetBytes(page, categoryName, categoryUrl) {
  console.log(`--- Scraping Budget Bytes: ${categoryName} ---`);
  await page.goto(categoryUrl, { waitUntil: 'networkidle2' });

  const recipeLinks = await page.evaluate(() => {
    const seen = new Set();
    const links = [];
    for (const a of document.querySelectorAll('article a[href]')) {
      const href = a.href;
      if (!seen.has(href) && /budgetbytes\.com\/[a-z0-9-]+\/$/.test(href)) {
        seen.add(href);
        links.push(href);
      }
      if (links.length >= 10) break;
    }
    return links;
  });

  const results = [];
  for (const url of recipeLinks) {
    try {
      console.log(`  Scraping: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 800));

      const data = await page.evaluate(() => {
        const title = document.querySelector('.wprm-recipe-name')?.innerText || document.querySelector('h1.entry-title')?.innerText;
        const ttcEl = document.querySelector('.wprm-recipe-total_time-container');
        const ttcMins = ttcEl ? parseInt(ttcEl.innerText) : 30;
        const imgEl = document.querySelector('.wprm-recipe-image img');
        const imageUrl = imgEl?.getAttribute('data-lazy-src') || imgEl?.src;

        const ingredients = Array.from(document.querySelectorAll('.wprm-recipe-ingredient')).map(node => ({
          name: node.querySelector('.wprm-recipe-ingredient-name')?.innerText || '',
          amount: [
            node.querySelector('.wprm-recipe-ingredient-amount')?.innerText || '',
            node.querySelector('.wprm-recipe-ingredient-unit')?.innerText || ''
          ].join(' ').trim()
        }));

        const steps = Array.from(document.querySelectorAll('.wprm-recipe-instruction-text')).map(n => n.innerText.trim());

        return { title, ttc: ttcMins || 30, imageUrl, ingredients, steps };
      });

      if (data.title) results.push({ ...data, category: categoryName });
    } catch (e) { console.error(`  Error: ${url}`); }
  }
  return results;
}

// ── TheMealDB API fetcher ─────────────────────────────────────────────────────
const MEALDB_AREA_MAP = {
  'Mexican':      'Mexican',
  'American':     'American',
  'Thai':         'Thai',
  'Middle Eastern': 'Moroccan',
  'Cajun':        'Jamaican',
};

async function fetchMealDB(categoryName) {
  const area = MEALDB_AREA_MAP[categoryName];
  console.log(`--- Fetching TheMealDB: ${categoryName} (area: ${area}) ---`);

  const listRes = await axios.get(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${area}`);
  const meals = (listRes.data.meals || []).slice(0, 10);

  const results = [];
  for (const meal of meals) {
    try {
      const detailRes = await axios.get(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`);
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
        category: categoryName
      });
      console.log(`  Fetched: ${m.strMeal}`);
    } catch (e) { console.error(`  Error fetching meal ${meal.idMeal}`); }
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function start() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const budgetBytesCategories = [
    { name: 'Italian',       url: 'https://www.budgetbytes.com/category/recipes/global/italian/' },
    { name: 'Asian',         url: 'https://www.budgetbytes.com/category/recipes/global/asian/' },
    { name: 'Mediterranean', url: 'https://www.budgetbytes.com/category/recipes/global/mediterranean/' },
    { name: 'Indian',        url: 'https://www.budgetbytes.com/category/recipes/global/indian/' },
    { name: 'Southwest',     url: 'https://www.budgetbytes.com/category/recipes/global/southwest/' },
  ];

  const mealDbCategories = ['Mexican', 'American', 'Thai', 'Middle Eastern', 'Cajun'];

  console.log('Starting sync (existing recipes will be skipped)...');

  // Budget Bytes categories
  for (const cat of budgetBytesCategories) {
    const recipes = await scrapeBudgetBytes(page, cat.name, cat.url);
    for (const r of recipes) await saveRecipe(r);
  }

  await browser.close();

  // TheMealDB categories
  for (const catName of mealDbCategories) {
    const recipes = await fetchMealDB(catName);
    for (const r of recipes) await saveRecipe(r);
  }

  console.log('Master Sync Complete.');
  process.exit(0);
}

start();
