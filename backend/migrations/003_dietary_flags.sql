-- Dietary flags on recipes. Flags are short lowercase strings:
--   dairy_free, gluten_free, nut_free, egg_free, shellfish_free, vegetarian, vegan
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS dietary_flags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_recipes_dietary_flags
  ON recipes USING GIN (dietary_flags);

-- Per-user dietary restrictions. Users with restrictions will not see recipes
-- that lack the matching free-from flag.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
