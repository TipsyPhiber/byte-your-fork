-- Track multiple source recipes per shopping list item so overlapping
-- ingredients merge instead of producing duplicate rows.
ALTER TABLE shopping_list_items
  ADD COLUMN IF NOT EXISTS source_recipe_ids INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

-- Backfill existing rows: a row with a single recipe_id seeds the array.
UPDATE shopping_list_items
SET source_recipe_ids = ARRAY[recipe_id]
WHERE recipe_id IS NOT NULL
  AND (source_recipe_ids IS NULL OR array_length(source_recipe_ids, 1) IS NULL);

CREATE INDEX IF NOT EXISTS idx_shopping_list_user_name
  ON shopping_list_items (user_id, LOWER(ingredient_name))
  WHERE checked = FALSE;
