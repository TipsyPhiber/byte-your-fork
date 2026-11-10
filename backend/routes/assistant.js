const express = require('express');
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { runAgent } = require('../assistant/agent');

const router = express.Router();

const MAX_TURNS = 20;
const MAX_CHARS = 2000;

// Built lazily so the rest of the API runs fine without a key.
let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

// Each message costs money, so limit per user, not just per IP.
const assistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => `user:${req.user.id}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many assistant messages. Try again in a few minutes.' },
});

// The browser sends the chat so far as plain text turns. Tool calls and
// results from earlier turns stay on the server and are never trusted from
// the client.
function validateHistory(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const turns = raw.slice(-MAX_TURNS);
  const clean = [];
  for (const m of turns) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return null;
    if (typeof m.content !== 'string' || !m.content.trim()) return null;
    clean.push({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS) });
  }
  while (clean.length && clean[0].role !== 'user') clean.shift();
  if (clean.length === 0 || clean[clean.length - 1].role !== 'user') return null;
  return clean;
}

router.post('/chat', authenticateToken, assistantLimiter, async (req, res) => {
  const anthropic = getClient();
  if (!anthropic) {
    return res.status(503).json({ error: 'The assistant is not set up on this server (missing ANTHROPIC_API_KEY).' });
  }
  const history = validateHistory(req.body?.messages);
  if (!history) {
    return res.status(400).json({ error: 'messages must be a list of user/assistant text turns ending with a user turn' });
  }

  try {
    const result = await runAgent({
      client: anthropic,
      db: pool,
      userId: req.user.id,
      history,
      model: process.env.ASSISTANT_MODEL || undefined,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'The assistant is busy right now. Try again in a minute.' });
    }
    if (err instanceof Anthropic.APIError) {
      console.error('Assistant API error:', err.status, err.message);
      return res.status(502).json({ error: 'The assistant could not answer. Try again.' });
    }
    console.error('Assistant failed:', err);
    res.status(500).json({ error: 'Assistant failed' });
  }
});

module.exports = router;
module.exports.validateHistory = validateHistory;
