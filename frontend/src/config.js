export const API_BASE = import.meta.env.VITE_API_BASE ?? '';
export const WS_BASE = import.meta.env.VITE_WS_BASE ?? '';

// Resolve a backend image URL for the current runtime.
// On web, API_BASE is '' so backend images load same-origin (via Vite proxy in
// dev, nginx in prod). In the packaged mobile app there is no proxy, so API_BASE
// is set and we prefix the backend path with it. External/CDN URLs are untouched.
export const normalizeImageUrl = (url) => {
  if (!url) return url;
  // Collapse any absolute backend host down to a path we control the origin of.
  const path = url.replace(/^https?:\/\/[^/]+(?=\/(?:api|uploads)\/)/, '');
  // A still-absolute URL is an external asset (e.g. a CDN) — leave it alone.
  if (/^https?:\/\//.test(path)) return path;
  return API_BASE ? `${API_BASE}${path}` : path;
};

export const normalizeRowImage = (row) =>
  row ? { ...row, image_url: normalizeImageUrl(row.image_url) } : row;
