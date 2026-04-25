export const DIETARY_LABELS = {
  dairy_free: 'Dairy-free',
  gluten_free: 'Gluten-free',
  nut_free: 'Nut-free',
  egg_free: 'Egg-free',
  shellfish_free: 'Shellfish-free',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
};

// A recipe passes if every restriction the user has is in its dietary_flags.
// If a recipe has no flags (legacy data), it fails any active restriction.
export function recipeMatchesRestrictions(recipe, restrictions) {
  if (!restrictions || restrictions.length === 0) return true;
  const flags = recipe.dietary_flags || [];
  for (const r of restrictions) {
    if (!flags.includes(r)) return false;
  }
  return true;
}
