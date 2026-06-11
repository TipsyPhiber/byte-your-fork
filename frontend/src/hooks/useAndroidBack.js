import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

// Wires the Android hardware back button to an app-level handler.
// No-op on web (and iOS, which has no hardware back button). The handler
// receives { canGoBack } — true when the webview has navigation history.
export function useAndroidBack(onBack) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listener;
    CapApp.addListener('backButton', (e) => onBack(e))
      .then((l) => { listener = l; });
    return () => { listener?.remove(); };
  }, [onBack]);
}
