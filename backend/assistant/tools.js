// Tools the kitchen assistant can call. Each tool has a JSON schema (sent to
// the model) and a run() function (executed here, on the server).
//
// Two rules hold for every tool:
//  1. The model never sees or picks the user id. run() gets it from the
//     signed-in session, so the assistant can only read the current user's data.
//  2. Dietary restrictions are enforced in SQL, not in the prompt. A vegan user
//     cannot be shown a recipe with chicken in it even if the model asks for one.
//
// The only tool that "changes" anything is propose_shopping_list_add, and it
// doesn't write either: it hands the proposal back to the app, which shows the
// user a button. Nothing lands on the shopping list until the user taps it.

const { decrypt } = require('../crypto_helper');

const MAX_RESULTS = 8;
const MAX_INGREDIENTS = 15;
const MAX_PROPOSAL = 5;

class ToolInputError extends Error {}

// Escape LIKE wildcards so "100%" or "half_and_half" match literally.
const likeEscape = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

function cleanString(value, field, max = 100) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ToolInputError(`${field} must be a non-empty string`);
  }
  return value.trim().slice(0, max);
}

function cleanId(value, field) {
  if (!Number.isInteger(value) || value < 1) {
    throw new ToolInputError(`${field} must be a positive integer`);
  }
  return value;
}

async function getRestrictions(db, userId) {
  const r = await db.query('SELECT dietary_restrictions FROM users WHERE id = $1', [userId]);
  return r.rows[0]?.dietary_restrictions || [];
}

const definitions = [
  {
    name: 'get_my_preferences',
    description:
      "Get the signed-in user's dietary restrictions, favorite cuisines, and saved recipes. " +
      'Call this first when the request depends on what the user likes or cannot eat.',
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    name: 'search_recipes',
    description:
      'Search the recipe catalog by dish name, cuisine, or ingredient. Results already exclude ' +
      "anything that breaks the user's dietary restrictions. Returns up to 8 recipes with id, " +
      'title, cuisine, minutes to cook, and average rating.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words to search for, e.g. "curry" or "pasta".' },
        max_minutes: {
          type: ['integer', 'null'],
          description: 'Only return recipes that take at most this many minutes. null for no limit.',
        },
      },
      required: ['query', 'max_minutes'],
      additionalProperties: false,
    },
  },
  {
    name: 'find_recipes_with_ingredients',
    description:
      'Find recipes that use the ingredients the user already has. Ranks recipes by how many of ' +
      "the given ingredients they use. Results already exclude anything that breaks the user's " +
      'dietary restrictions.',
    input_schema: {
      type: 'object',
      properties: {
        ingredients: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ingredient names, e.g. ["chicken", "rice", "spinach"]. Up to 15.',
        },
      },
      required: ['ingredients'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_recipe_details',
    description:
      'Get the full ingredient list with amounts, the steps, and the rating for one recipe. ' +
      'Use it before describing a recipe in detail.',
    input_schema: {
      type: 'object',
      properties: { recipe_id: { type: 'integer' } },
      required: ['recipe_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'propose_shopping_list_add',
    description:
      "Offer to add the ingredients of up to 5 recipes to the user's shopping list. This does NOT " +
      'add anything. The app shows the user a button, and items are added only if they tap it. ' +
      'Only propose recipes you found with the other tools.',
    input_schema: {
      type: 'object',
      properties: {
        recipe_ids: { type: 'array', items: { type: 'integer' } },
      },
      required: ['recipe_ids'],
      additionalProperties: false,
    },
  },
];

// The "fits diet" check matches the frontend rule in utils/dietaryFilter.js:
// a recipe passes only if it carries every flag the user has restricted.
const handlers = {
  async get_my_preferences(_input, { db, userId }) {
    const [restrictions, prefs, favs] = await Promise.all([
      getRestrictions(db, userId),
      db.query('SELECT tag_name FROM user_preferences WHERE user_id = $1', [userId]),
      db.query(
        `SELECT r.id, r.title FROM favorites f JOIN recipes r ON r.id = f.recipe_id
          WHERE f.user_id = $1 ORDER BY r.title LIMIT 10`,
        [userId]
      ),
    ]);
    return {
      dietary_restrictions: restrictions,
      favorite_cuisines: prefs.rows.map((p) => decrypt(p.tag_name)),
      saved_recipes: favs.rows,
    };
  },

  async search_recipes(input, { db, userId }) {
    const query = cleanString(input.query, 'query');
    const maxMinutes = input.max_minutes == null ? null : cleanId(input.max_minutes, 'max_minutes');
    const restrictions = await getRestrictions(db, userId);
    const r = await db.query(
      `SELECT r.id, r.title, r.ttc AS minutes, MIN(t.name) AS cuisine,
              ROUND(AVG(rt.rating)::numeric, 1)::float AS avg_rating
         FROM recipes r
         LEFT JOIN recipe_tags t ON t.recipe_id = r.id
         LEFT JOIN ratings rt ON rt.recipe_id = r.id
        WHERE r.dietary_flags @> $2::text[]
          AND ($3::int IS NULL OR r.ttc <= $3)
          AND (
            to_tsvector('english', r.title || ' ' || COALESCE(t.name, '')) @@ websearch_to_tsquery('english', $1)
            OR r.title ILIKE '%' || $4 || '%'
            OR t.name ILIKE '%' || $4 || '%'
            OR EXISTS (SELECT 1 FROM ingredients i WHERE i.recipe_id = r.id AND i.name ILIKE '%' || $4 || '%')
          )
        GROUP BY r.id
        ORDER BY avg_rating DESC NULLS LAST, r.id
        LIMIT ${MAX_RESULTS}`,
      [query, restrictions, maxMinutes, likeEscape(query)]
    );
    return { recipes: r.rows, filtered_for: restrictions };
  },

  async find_recipes_with_ingredients(input, { db, userId }) {
    if (!Array.isArray(input.ingredients) || input.ingredients.length === 0) {
      throw new ToolInputError('ingredients must be a non-empty array');
    }
    const terms = [...new Set(
      input.ingredients
        .filter((s) => typeof s === 'string' && s.trim())
        .map((s) => s.trim().toLowerCase().slice(0, 60))
    )].slice(0, MAX_INGREDIENTS);
    if (terms.length === 0) throw new ToolInputError('ingredients must contain at least one name');

    const restrictions = await getRestrictions(db, userId);
    const r = await db.query(
      `SELECT r.id, r.title, r.ttc AS minutes,
              COUNT(DISTINCT w.term)::int AS uses_count,
              ARRAY_AGG(DISTINCT w.term) AS uses,
              (SELECT COUNT(*)::int FROM ingredients i2 WHERE i2.recipe_id = r.id) AS total_ingredients
         FROM recipes r
         JOIN ingredients i ON i.recipe_id = r.id
         JOIN unnest($1::text[]) AS w(term)
           ON i.name ILIKE '%' || replace(replace(replace(w.term, '\\', '\\\\'), '%', '\\%'), '_', '\\_') || '%'
        WHERE r.dietary_flags @> $2::text[]
        GROUP BY r.id
        ORDER BY uses_count DESC, total_ingredients ASC, r.id
        LIMIT ${MAX_RESULTS}`,
      [terms, restrictions]
    );
    return { recipes: r.rows, filtered_for: restrictions };
  },

  async get_recipe_details(input, { db, userId }) {
    const id = cleanId(input.recipe_id, 'recipe_id');
    const recipe = await db.query(
      `SELECT r.id, r.title, r.ttc AS minutes, r.dietary_flags,
              (SELECT name FROM recipe_tags WHERE recipe_id = r.id LIMIT 1) AS cuisine,
              (SELECT ROUND(AVG(rating)::numeric, 1)::float FROM ratings WHERE recipe_id = r.id) AS avg_rating
         FROM recipes r WHERE r.id = $1`,
      [id]
    );
    if (recipe.rows.length === 0) throw new ToolInputError(`No recipe with id ${id}`);
    const [ingredients, steps, restrictions] = await Promise.all([
      db.query(
        `SELECT i.name, a.name AS amount FROM ingredients i
           LEFT JOIN amount a ON a.ingredient_id = i.id
          WHERE i.recipe_id = $1 ORDER BY i.id`,
        [id]
      ),
      db.query('SELECT instruction FROM steps WHERE recipe_id = $1 ORDER BY id', [id]),
      getRestrictions(db, userId),
    ]);
    const row = recipe.rows[0];
    const flags = row.dietary_flags || [];
    return {
      ...row,
      fits_your_diet: restrictions.every((x) => flags.includes(x)),
      ingredients: ingredients.rows,
      steps: steps.rows.map((s) => s.instruction),
    };
  },

  async propose_shopping_list_add(input, { db, proposals }) {
    if (!Array.isArray(input.recipe_ids) || input.recipe_ids.length === 0) {
      throw new ToolInputError('recipe_ids must be a non-empty array');
    }
    const ids = [...new Set(input.recipe_ids.map((x) => cleanId(x, 'recipe_ids[]')))];
    if (ids.length > MAX_PROPOSAL) throw new ToolInputError(`Propose at most ${MAX_PROPOSAL} recipes`);
    const r = await db.query('SELECT id, title FROM recipes WHERE id = ANY($1::int[]) ORDER BY id', [ids]);
    if (r.rows.length === 0) throw new ToolInputError('None of those recipe ids exist');
    for (const row of r.rows) {
      if (!proposals.some((p) => p.id === row.id)) proposals.push(row);
    }
    return {
      status: 'shown_to_user_for_confirmation',
      recipes: r.rows,
      note: 'Nothing has been added yet. Tell the user they can tap the button to add these.',
    };
  },
};

// Runs one tool call. Always resolves (never throws) so the agent loop can
// hand the error back to the model as an is_error tool_result.
async function runTool(name, input, ctx) {
  const handler = handlers[name];
  if (!handler) return { isError: true, content: `Unknown tool: ${name}` };
  try {
    const result = await handler(input || {}, ctx);
    return { isError: false, content: JSON.stringify(result) };
  } catch (err) {
    if (err instanceof ToolInputError) return { isError: true, content: err.message };
    console.error(`Assistant tool ${name} failed:`, err.message);
    return { isError: true, content: 'The tool failed on the server. Try a different approach.' };
  }
}

module.exports = { definitions, runTool, ToolInputError };
