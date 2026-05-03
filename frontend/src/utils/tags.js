// Canonical cuisine/category tag list shown when adding/editing a recipe.
// Stored on the recipe as a single string in the recipe_tags table.
export const CUISINE_TAGS = [
  'American', 'Asian', 'British', 'Cajun', 'Chicken', 'Chinese', 'French',
  'Greek', 'Indian', 'Italian', 'Japanese', 'Korean', 'Mediterranean', 'Mexican',
  'Middle Eastern', 'Pasta', 'Southwest', 'Spanish', 'Thai', 'Turkish',
  'Vegan', 'Vegetarian', 'Vietnamese',
];

// Dietary flags stored on recipes.dietary_flags (TEXT[]). Keys match DB values;
// labels are display-only (also exported from utils/dietaryFilter.js).
export const DIETARY_FLAGS = [
  { key: 'dairy_free',     label: 'Dairy-free' },
  { key: 'gluten_free',    label: 'Gluten-free' },
  { key: 'nut_free',       label: 'Nut-free' },
  { key: 'egg_free',       label: 'Egg-free' },
  { key: 'shellfish_free', label: 'Shellfish-free' },
  { key: 'vegetarian',     label: 'Vegetarian' },
  { key: 'vegan',          label: 'Vegan' },
];
