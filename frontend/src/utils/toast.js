const listeners = new Set();
let nextId = 1;

export function showToast({ kind = 'info', message, action, duration = 3500 }) {
  const id = nextId++;
  const toast = { id, kind, message, action, duration };
  listeners.forEach(fn => fn(toast));
  return id;
}

export function onToast(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
