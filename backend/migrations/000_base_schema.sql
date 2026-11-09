-- Base schema for Byte Your Fork.
--
-- The production database predates the migration runner and was created by
-- hand, so the repo never contained DDL for these tables. This file
-- reconstructs the full base schema from the queries in routes/ so a fresh
-- database can be bootstrapped with `npm run migrate` alone.
--
-- Every statement is IF NOT EXISTS, so applying this against the existing
-- production database is a no-op. It sorts before 001-005, which only
-- ALTER/extend these tables.
--
-- Note: UNIQUE constraints on users.username, users.email and
-- email_hashes.email_hmac must keep Postgres' default names
-- (users_username_key, users_email_key, email_hashes_email_hmac_key) —
-- routes/auth.js matches err.constraint against those strings on 23505.

-- ── Accounts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  first_name    TEXT,
  surname       TEXT,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT UNIQUE,            -- AES-256-GCM encrypted (crypto_helper.js)
  password_hash TEXT NOT NULL
);

-- Deterministic email lookup (login / forgot-password). users.email is
-- encrypted with a random IV, so real uniqueness is enforced here.
CREATE TABLE IF NOT EXISTS email_hashes (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_hmac TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS verified_users (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admins (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avatar_data BYTEA,
  avatar_mime TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tag_name is stored encrypted (crypto_helper.js), one row per preference.
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  PRIMARY KEY (user_id, tag_name)
);

CREATE TABLE IF NOT EXISTS notification_settings (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cleared_at TIMESTAMPTZ
);

-- ── Recipes ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  ttc           INTEGER,                -- time-to-cook, minutes (1-1440)
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  creation_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One image per recipe in practice (list queries assume it). Either a blob
-- (data + mime_type, served from /api/images/:id) or an external url.
CREATE TABLE IF NOT EXISTS images (
  id        SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  url       TEXT,
  data      BYTEA,
  mime_type TEXT
);

-- One tag per recipe in practice (cuisine).
CREATE TABLE IF NOT EXISTS recipe_tags (
  id        SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ingredients (
  id        SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name      TEXT NOT NULL
);

-- One amount row per ingredient (table name is singular in all queries).
CREATE TABLE IF NOT EXISTS amount (
  id            SERIAL PRIMARY KEY,
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  name          TEXT
);

CREATE TABLE IF NOT EXISTS steps (
  id          SERIAL PRIMARY KEY,
  recipe_id   INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  instruction TEXT NOT NULL
);

-- ── Social ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS ratings (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  rating    INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  UNIQUE (user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id  INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS views (
  id        SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dismissed_notifications (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, recipe_id)
);

-- ── Indexes for the hot joins ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_images_recipe_id       ON images(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id  ON recipe_tags(recipe_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id  ON ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_amount_ingredient_id   ON amount(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_steps_recipe_id        ON steps(recipe_id);
CREATE INDEX IF NOT EXISTS idx_ratings_recipe_id      ON ratings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_comments_recipe_id     ON comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_views_recipe_id        ON views(recipe_id);
