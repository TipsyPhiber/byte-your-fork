import { useEffect } from 'react';

// Keep the screen on while mounted (Cook Mode — messy hands, long steps).
// Screen Wake Lock API is supported in Chrome and Android WebView; on
// anything else this is a silent no-op. The lock auto-releases when the tab
// is hidden, so re-acquire on visibilitychange.
export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let lock = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) lock.release().catch(() => {});
      } catch { /* low battery, hidden tab, or unsupported — fine */ }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
