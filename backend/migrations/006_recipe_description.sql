-- Recipes imported from the Kaggle "recipes_extended" dataset carry a prose
-- description (TheMealDB seed recipes do not). Nullable so existing code and
-- seed recipes are unaffected; the Flutter recipe-detail screen will use it.
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS description TEXT;
