CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  user_id INT,
  event_type TEXT NOT NULL,
  recipe_id INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_user_id ON events (user_id);
CREATE INDEX IF NOT EXISTS idx_events_recipe_id ON events (recipe_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events (event_type);
