const pool = require('../db');

async function logEvent(userId, eventType, recipeId) {
  try {
    await pool.query(
      'INSERT INTO events (user_id, event_type, recipe_id) VALUES ($1, $2, $3)',
      [userId ?? null, eventType, recipeId ?? null]
    );
  } catch (err) {
    console.error('logEvent failed:', err.message);
  }
}

module.exports = { logEvent };
