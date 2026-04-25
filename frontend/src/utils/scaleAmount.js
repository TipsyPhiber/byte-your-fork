// Scale ingredient amount strings ("1 1/2 cups", "2-3 cloves", "1.5 lbs") by a factor.
// Leaves non-numeric amounts ("to taste", "a pinch") unchanged.

const UNICODE_FRACTIONS = {
  '½': 0.5, '⅓': 1/3, '⅔': 2/3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 1/6, '⅚': 5/6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

const NICE_FRACTIONS = [
  [1/8, '1/8'], [1/4, '1/4'], [1/3, '1/3'], [3/8, '3/8'],
  [1/2, '1/2'], [5/8, '5/8'], [2/3, '2/3'], [3/4, '3/4'], [7/8, '7/8'],
];

const parseToken = (token) => {
  if (UNICODE_FRACTIONS[token] !== undefined) return UNICODE_FRACTIONS[token];
  const fracMatch = token.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    const denom = parseInt(fracMatch[2], 10);
    if (denom === 0) return null;
    return parseInt(fracMatch[1], 10) / denom;
  }
  const num = parseFloat(token);
  return Number.isFinite(num) ? num : null;
};

// Match a quantity at the start of a string: "1 1/2", "2-3", "1.5", "½", "1½"
// Returns { value, end } or null.
const parseQuantity = (str) => {
  let i = 0;
  // Skip leading whitespace
  while (i < str.length && /\s/.test(str[i])) i++;
  const start = i;

  // Collect a number-ish run: digits, dots, slashes, unicode fractions, single spaces between.
  const tokens = [];
  let buf = '';
  while (i < str.length) {
    const c = str[i];
    if (UNICODE_FRACTIONS[c] !== undefined) {
      if (buf) { tokens.push(buf); buf = ''; }
      tokens.push(c);
      i++;
    } else if (/[\d./]/.test(c)) {
      buf += c;
      i++;
    } else if (c === ' ' && buf && i + 1 < str.length && /[\d/½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/.test(str[i + 1])) {
      tokens.push(buf);
      buf = '';
      i++;
    } else {
      break;
    }
  }
  if (buf) tokens.push(buf);
  if (tokens.length === 0) return null;

  let total = 0;
  for (const t of tokens) {
    const v = parseToken(t);
    if (v === null) return null;
    total += v;
  }
  return { value: total, end: i, rawStart: start };
};

const formatNumber = (n) => {
  if (!Number.isFinite(n)) return '';
  if (n === 0) return '0';

  const whole = Math.floor(n);
  const frac = n - whole;

  // If essentially a whole number, return integer
  if (frac < 0.02) return String(whole);
  if (frac > 0.98) return String(whole + 1);

  // Snap to nearest nice fraction
  let best = null;
  let bestDiff = Infinity;
  for (const [val, label] of NICE_FRACTIONS) {
    const d = Math.abs(frac - val);
    if (d < bestDiff) { bestDiff = d; best = label; }
  }

  // If we're within ~0.04 of a nice fraction, use it; else fall back to one decimal
  if (bestDiff < 0.04) {
    return whole > 0 ? `${whole} ${best}` : best;
  }
  // Round to one decimal, drop trailing zero
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

export const scaleAmount = (amount, factor) => {
  if (!amount || typeof amount !== 'string') return amount;
  if (factor === 1 || !Number.isFinite(factor) || factor <= 0) return amount;

  // Try a range first: "2-3 cups", "2 to 3 cups"
  const rangeMatch = amount.match(/^(\s*)([\d./\s½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+?)\s*(-|–|to)\s*([\d./\s½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+?)(\s+.*|$)/);
  if (rangeMatch) {
    const a = parseQuantity(rangeMatch[2]);
    const b = parseQuantity(rangeMatch[4]);
    if (a && b) {
      return `${rangeMatch[1]}${formatNumber(a.value * factor)}${rangeMatch[3] === 'to' ? ' to ' : '-'}${formatNumber(b.value * factor)}${rangeMatch[5]}`;
    }
  }

  const q = parseQuantity(amount);
  if (!q) return amount;
  const scaled = formatNumber(q.value * factor);
  return amount.slice(0, q.rawStart) + scaled + amount.slice(q.end);
};
