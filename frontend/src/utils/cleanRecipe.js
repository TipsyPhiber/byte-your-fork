const NOISE_RE = /^(instructions|directions|method|steps|preparation|how to make|procedure)\.?$/i;
const METHOD_PREFIX_RE = /^(first|second|third|fourth)\s+method:\s*/i;

const normalizeQuotes = (s) =>
  s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

// A "step" should be a complete sentence. If it has no terminal punctuation
// AND is short, it's almost certainly a section heading scraped as a list item.
const isHeader = (s) => {
  if (NOISE_RE.test(s)) return true;
  if (/[.!?:]$/.test(s)) return false;
  return s.length < 60 && s.trim().split(/\s+/).length < 8;
};

export const cleanSteps = (steps = []) =>
  steps
    .map((s) => normalizeQuotes((s || '').trim().replace(METHOD_PREFIX_RE, '')))
    .filter((s) => s && !isHeader(s));
