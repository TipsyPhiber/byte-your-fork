export const API_BASE = import.meta.env.VITE_API_BASE ?? '';
export const WS_BASE = import.meta.env.VITE_WS_BASE ?? '';

// Strip absolute host prefix from /api/* URLs so they load same-origin
// (via Vite proxy in dev, nginx in prod). Avoids cross-origin / CORP issues.
export const normalizeImageUrl = (url) =>
  url ? url.replace(/^https?:\/\/[^/]+(?=\/api\/)/, '') : url;

export const normalizeRowImage = (row) =>
  row ? { ...row, image_url: normalizeImageUrl(row.image_url) } : row;
