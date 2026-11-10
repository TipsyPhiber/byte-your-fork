// Integration tests for the assistant's tools against a real Postgres.
// They need an empty, migrated database:
//   TEST_DATABASE_URL=postgres://user:pass@127.0.0.1:5432/byf_test npm test
// Without TEST_DATABASE_URL they are skipped.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');

process.env.AES_KEY = process.env.AES_KEY || 'a'.repeat(64);
const { encrypt } = require('../crypto_helper');
const { runTool } = require('../assistant/tools');

const url = process.env.TEST_DATABASE_URL;
const skip = !url && 'TEST_DATABASE_URL not set';
let db;
const ids = {};

const call = async (name, input, userId, proposals = []) => {
  const res = await runTool(name, input, { db, userId, proposals });
  return { ...res, data: res.isError ? null : JSON.parse(res.content), proposals };
};
const titles = (data) => data.recipes.map((r) => r.title);

before(async () => {
  if (skip) return;
  db = new Pool({ connectionString: url });
  await db.query(`TRUNCATE users, recipes, shopping_list_items RESTART IDENTITY CASCADE`);

  const user = async (name, restrictions) =>
    (await db.query(
      `INSERT INTO users (username, password_hash, dietary_restrictions) VALUES ($1, 'x', $2) RETURNING id`,
      [name, restrictions]
    )).rows[0].id;
  ids.vegan = await user('vegan_val', ['vegan']);
  ids.anyone = await user('omni_olly', []);

  const ALL_BUT_DIET = ['dairy_free', 'gluten_free', 'nut_free', 'egg_free', 'shellfish_free'];
  const recipe = async (title, ttc, flags, tag, ingredients, steps = []) => {
    const id = (await db.query(
      'INSERT INTO recipes (title, ttc, dietary_flags) VALUES ($1, $2, $3) RETURNING id',
      [title, ttc, flags]
    )).rows[0].id;
    await db.query('INSERT INTO recipe_tags (recipe_id, name) VALUES ($1, $2)', [id, tag]);
    for (const [name, amount] of ingredients) {
      const ing = await db.query('INSERT INTO ingredients (recipe_id, name) VALUES ($1, $2) RETURNING id', [id, name]);
      await db.query('INSERT INTO amount (ingredient_id, name) VALUES ($1, $2)', [ing.rows[0].id, amount]);
    }
    for (const s of steps) await db.query('INSERT INTO steps (recipe_id, instruction) VALUES ($1, $2)', [id, s]);
    return id;
  };

  ids.chicken = await recipe('Chicken Curry', 40, ALL_BUT_DIET, 'Indian',
    [['chicken thighs', '500 g'], ['rice', '1 cup'], ['curry powder', '2 tbsp']],
    ['Brown the chicken.', 'Add curry powder.', 'Simmer and serve over rice.']);
  ids.chickpea = await recipe('Chickpea Curry', 30, [...ALL_BUT_DIET, 'vegetarian', 'vegan'], 'Indian',
    [['chickpeas', '1 can'], ['spinach', '2 cups'], ['rice', '1 cup'], ['coconut milk', '1 can']],
    ['Warm the spices.', 'Add chickpeas and coconut milk.', 'Stir in spinach.']);
  ids.pasta = await recipe('Spinach Pasta', 20, ['nut_free', 'egg_free', 'shellfish_free', 'vegetarian'], 'Italian',
    [['pasta', '200 g'], ['spinach', '2 cups'], ['parmesan', '1/2 cup']]);
  ids.bread = await recipe('100% Rye Bread', 180, ['dairy_free', 'nut_free', 'egg_free', 'shellfish_free', 'vegetarian', 'vegan'], 'Nordic',
    [['rye flour', '500 g'], ['water', '400 ml']]);

  await db.query('INSERT INTO ratings (user_id, recipe_id, rating) VALUES ($1, $2, 5), ($3, $2, 4)',
    [ids.vegan, ids.chickpea, ids.anyone]);
  await db.query('INSERT INTO user_preferences (user_id, tag_name) VALUES ($1, $2)', [ids.vegan, encrypt('Indian')]);
  await db.query('INSERT INTO favorites (user_id, recipe_id) VALUES ($1, $2)', [ids.vegan, ids.chickpea]);
});

after(async () => { if (db) await db.end(); });

test('search never returns recipes that break the user\'s diet', { skip }, async () => {
  const vegan = await call('search_recipes', { query: 'curry', max_minutes: null }, ids.vegan);
  assert.deepEqual(titles(vegan.data), ['Chickpea Curry']);
  assert.deepEqual(vegan.data.filtered_for, ['vegan']);

  const anyone = await call('search_recipes', { query: 'curry', max_minutes: null }, ids.anyone);
  assert.deepEqual(titles(anyone.data).sort(), ['Chicken Curry', 'Chickpea Curry']);
});

test('search respects max_minutes and matches ingredients', { skip }, async () => {
  const quick = await call('search_recipes', { query: 'curry', max_minutes: 35 }, ids.anyone);
  assert.deepEqual(titles(quick.data), ['Chickpea Curry']);

  const byIngredient = await call('search_recipes', { query: 'parmesan', max_minutes: null }, ids.anyone);
  assert.deepEqual(titles(byIngredient.data), ['Spinach Pasta']);
});

test('search treats % and _ literally', { skip }, async () => {
  const pct = await call('search_recipes', { query: '%', max_minutes: null }, ids.anyone);
  assert.deepEqual(titles(pct.data), ['100% Rye Bread']);
  const underscore = await call('search_recipes', { query: '_', max_minutes: null }, ids.anyone);
  assert.deepEqual(titles(underscore.data), []);
});

test('ingredient search ranks by how many ingredients the recipe uses', { skip }, async () => {
  const anyone = await call('find_recipes_with_ingredients', { ingredients: ['rice', 'Spinach', 'rice'] }, ids.anyone);
  assert.equal(anyone.data.recipes[0].title, 'Chickpea Curry');
  assert.equal(anyone.data.recipes[0].uses_count, 2);
  assert.deepEqual(titles(anyone.data).slice(1).sort(), ['Chicken Curry', 'Spinach Pasta']);

  const vegan = await call('find_recipes_with_ingredients', { ingredients: ['rice', 'spinach'] }, ids.vegan);
  assert.deepEqual(titles(vegan.data), ['Chickpea Curry']);
});

test('recipe details include amounts, ordered steps, and a diet check', { skip }, async () => {
  const res = await call('get_recipe_details', { recipe_id: ids.chicken }, ids.vegan);
  assert.equal(res.data.title, 'Chicken Curry');
  assert.equal(res.data.fits_your_diet, false);
  assert.deepEqual(res.data.ingredients[0], { name: 'chicken thighs', amount: '500 g' });
  assert.deepEqual(res.data.steps, ['Brown the chicken.', 'Add curry powder.', 'Simmer and serve over rice.']);

  const ok = await call('get_recipe_details', { recipe_id: ids.chickpea }, ids.vegan);
  assert.equal(ok.data.fits_your_diet, true);
  assert.equal(ok.data.avg_rating, 4.5);
});

test('preferences come back decrypted, with saved recipes', { skip }, async () => {
  const res = await call('get_my_preferences', {}, ids.vegan);
  assert.deepEqual(res.data, {
    dietary_restrictions: ['vegan'],
    favorite_cuisines: ['Indian'],
    saved_recipes: [{ id: ids.chickpea, title: 'Chickpea Curry' }],
  });
});

test('proposing a shopping list add writes nothing', { skip }, async () => {
  const proposals = [];
  const res = await call('propose_shopping_list_add', { recipe_ids: [ids.chickpea, ids.chickpea, 9999] }, ids.vegan, proposals);
  assert.equal(res.isError, false);
  assert.deepEqual(proposals, [{ id: ids.chickpea, title: 'Chickpea Curry' }]);
  const rows = await db.query('SELECT COUNT(*)::int AS n FROM shopping_list_items');
  assert.equal(rows.rows[0].n, 0);
});

test('bad input comes back as a tool error, not an exception', { skip }, async () => {
  const cases = [
    ['search_recipes', { query: '   ', max_minutes: null }, /query/],
    ['get_recipe_details', { recipe_id: 9999 }, /No recipe/],
    ['get_recipe_details', { recipe_id: 'drop table' }, /positive integer/],
    ['propose_shopping_list_add', { recipe_ids: [1, 2, 3, 4, 5, 6] }, /at most 5/],
    ['find_recipes_with_ingredients', { ingredients: [] }, /non-empty/],
    ['delete_everything', {}, /Unknown tool/],
  ];
  for (const [name, input, msg] of cases) {
    const res = await call(name, input, ids.anyone);
    assert.equal(res.isError, true, name);
    assert.match(res.content, msg, name);
  }
});
