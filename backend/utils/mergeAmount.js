// Merge two ingredient amount strings. If both parse to the same unit,
// sum numerically ("2 cloves" + "3 cloves" → "5 cloves"). Otherwise
// concatenate with a separator ("1 cup" + "a pinch" → "1 cup + a pinch").

const UNICODE_FRACTIONS = {
  '½': 0.5, '⅓': 1/3, '⅔': 2/3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 1/6, '⅚': 5/6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

const NICE_FRACTIONS = [
  [1/8, '1/8'], [1/4, '1/4'], [1/3, '1/3'], [3/8, '3/8'],
  [1/2, '1/2'], [5/8, '5/8'], [2/3, '2/3'], [3/4, '3/4'], [7/8, '7/8'],
];

function parseAmount(s) {
  if (!s || typeof s !== 'string') return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  // Match leading quantity then unit word
  const m = trimmed.match(/^([\d./\s½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+)\s*([a-zA-Z]*)\s*$/);
  if (!m) return null;
  const [, rawQty, unit] = m;
  let value = 0;
  for (const tok of rawQty.trim().split(/\s+/)) {
    if (UNICODE_FRACTIONS[tok] !== undefined) { value += UNICODE_FRACTIONS[tok]; continue; }
    const frac = tok.match(/^(\d+)\/(\d+)$/);
    if (frac) {
      const denom = parseInt(frac[2], 10);
      if (denom === 0) return null;
      value += parseInt(frac[1], 10) / denom;
      continue;
    }
    const n = parseFloat(tok);
    if (!Number.isFinite(n)) return null;
    value += n;
  }
  return { value, unit: (unit || '').toLowerCase() };
}

function formatValue(n) {
  if (n === 0) return '0';
  const whole = Math.floor(n);
  const frac = n - whole;
  if (frac < 0.02) return String(whole);
  if (frac > 0.98) return String(whole + 1);
  let best = null;
  let bestDiff = Infinity;
  for (const [val, label] of NICE_FRACTIONS) {
    const d = Math.abs(frac - val);
    if (d < bestDiff) { bestDiff = d; best = label; }
  }
  if (bestDiff < 0.04) return whole > 0 ? `${whole} ${best}` : best;
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
}

function mergeAmount(existing, incoming) {
  const e = (existing || '').trim();
  const i = (incoming || '').trim();
  if (!e) return i;
  if (!i) return e;

  const pe = parseAmount(e);
  const pi = parseAmount(i);
  if (pe && pi && pe.unit === pi.unit) {
    const sum = formatValue(pe.value + pi.value);
    return pe.unit ? `${sum} ${pe.unit}` : sum;
  }
  return `${e} + ${i}`;
}

module.exports = { mergeAmount };
