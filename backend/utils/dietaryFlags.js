// Heuristic dietary flag inference from ingredient names + optional category tag.
// Returns an array of flags the recipe qualifies for.
// Philosophy: "free-from" flags are positive assertions — we only tag a flag
// when we're confident NO disqualifying ingredient appears. When in doubt, omit.

const ALL_FLAGS = [
  'dairy_free', 'gluten_free', 'nut_free', 'egg_free', 'shellfish_free',
  'vegetarian', 'vegan',
];

// Ingredient keyword patterns. Word-boundary regexes — avoid false matches
// like "buttermilk substitute" triggering on "milk" when it's intended as an alt.
const DAIRY = /\b(milk|buttermilk|butter|cheese|cream|yogurt|yoghurt|ghee|whey|casein|half[- ]and[- ]half|sour cream|crème\s?frai[ch]he|kefir|cottage cheese|mascarpone|ricotta|parmesan|cheddar|mozzarella|feta|brie|camembert|gouda|swiss|queso|condensed milk|evaporated milk)\b/i;
const GLUTEN = /\b(flour|wheat|bread(?!fruit)|pasta|noodle|noodles|spaghetti|linguine|penne|fettuccine|macaroni|lasagna|lasagne|orzo|couscous|bulgur|barley|rye|semolina|farro|seitan|panko|breadcrumbs?|pita|tortilla|bagel|biscuit|pretzel|cracker|cake flour|all[- ]purpose|bread flour|beer|soy sauce|udon|ramen)\b/i;
// soy sauce often contains wheat (tamari doesn't). Conservative: flag it as gluten.
const NUTS = /\b(almond|cashew|walnut|pecan|pistachio|hazelnut|macadamia|brazil nut|pine nut|peanut|peanuts|praline|marzipan|nutella|amaretto|frangipane)\b/i;
const EGGS = /\b(egg|eggs|mayo|mayonnaise|aioli|meringue|custard|hollandaise|béarnaise|bearnaise|carbonara)\b/i;
const SHELLFISH = /\b(shrimp|prawn|lobster|crab|crayfish|crawfish|langoustine|scallop|oyster|mussel|clam|calamari|squid|octopus|abalone|krill)\b/i;
const MEAT = /\b(chicken|beef|pork|bacon|sausage|ham|lamb|turkey|duck|goose|veal|venison|rabbit|prosciutto|salami|pepperoni|chorizo|pancetta|anchov|fish|salmon|tuna|cod|trout|tilapia|sardine|mackerel|herring|halibut|snapper|grouper|flounder|bass|perch|catfish|swordfish|mahi|branzino|shrimp|prawn|lobster|crab|oyster|mussel|clam|scallop|calamari|squid|octopus|gelatin|lard|tallow|bone broth|beef broth|chicken broth|beef stock|chicken stock|fish sauce|oyster sauce|shrimp paste|worcestershire)\b/i;

const CATEGORY_HINTS = {
  vegan: ['vegan'],
  vegetarian: ['vegan', 'vegetarian'],
};

function textHas(re, texts) {
  for (const t of texts) if (re.test(t)) return true;
  return false;
}

function inferDietaryFlags(recipe) {
  const { ingredients = [], category = '', tags = [] } = recipe;
  const ingredientTexts = ingredients.map(i => `${i.amount || ''} ${i.name || ''}`.toLowerCase());
  const allTexts = [...ingredientTexts, String(category).toLowerCase(), ...tags.map(t => String(t).toLowerCase())];
  const catLower = String(category).toLowerCase();

  const hasDairy = textHas(DAIRY, ingredientTexts);
  const hasGluten = textHas(GLUTEN, ingredientTexts);
  const hasNuts = textHas(NUTS, ingredientTexts);
  const hasEggs = textHas(EGGS, ingredientTexts);
  const hasShellfish = textHas(SHELLFISH, ingredientTexts);
  const hasMeat = textHas(MEAT, ingredientTexts);

  const flags = new Set();
  if (!hasDairy) flags.add('dairy_free');
  if (!hasGluten) flags.add('gluten_free');
  if (!hasNuts) flags.add('nut_free');
  if (!hasEggs) flags.add('egg_free');
  if (!hasShellfish) flags.add('shellfish_free');

  // Vegetarian = no meat or shellfish
  const vegetarianByIngredients = !hasMeat && !hasShellfish;
  // Vegan = vegetarian + no dairy + no eggs
  const veganByIngredients = vegetarianByIngredients && !hasDairy && !hasEggs;

  // Category hints override / confirm
  const catSaysVegan = CATEGORY_HINTS.vegan.some(h => catLower.includes(h));
  const catSaysVegetarian = CATEGORY_HINTS.vegetarian.some(h => catLower.includes(h));

  if (veganByIngredients || catSaysVegan) flags.add('vegan');
  if (vegetarianByIngredients || catSaysVegetarian) flags.add('vegetarian');
  // Anything vegan is also vegetarian
  if (flags.has('vegan')) flags.add('vegetarian');

  return Array.from(flags);
}

module.exports = { inferDietaryFlags, ALL_FLAGS };
