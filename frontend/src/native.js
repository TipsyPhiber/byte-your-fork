// Native-only platform setup (status bar, keyboard). All no-ops on web, so it's
// safe to call unconditionally from the app entry point and theme hook.

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

export const isNative = Capacitor.isNativePlatform();

// Match the status bar backdrop to the app's page background per theme
// (see index.css body backgrounds).
const STATUS_BG = { light: '#f4f4f8', dark: '#13131e' };

// Keep the status bar in step with the in-app dark-mode toggle. Style.Dark =
// light icons (for a dark backdrop), Style.Light = dark icons (light backdrop).
export async function applyStatusBarTheme(dark) {
  if (!isNative) return;
  try {
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: dark ? STATUS_BG.dark : STATUS_BG.light });
  } catch { /* status bar unavailable on this device */ }
}

export async function initNative() {
  if (!isNative) return;

  // Status bar sits above the web content rather than overlaying it, so the
  // layout doesn't need to reason about the notch for the top bar.
  try { await StatusBar.setOverlaysWebView({ overlays: false }); } catch { /* noop */ }

  // The soft keyboard resizes the native view (pushing inputs into view)
  // instead of floating over the page.
  try { await Keyboard.setResizeMode({ mode: KeyboardResize.Native }); } catch { /* noop */ }

  // Hide the fixed bottom nav while typing so it doesn't ride on top of the
  // keyboard. CSS (body.keyboard-open .bottom-nav) does the actual hiding.
  Keyboard.addListener('keyboardWillShow', () => document.body.classList.add('keyboard-open'));
  Keyboard.addListener('keyboardWillHide', () => document.body.classList.remove('keyboard-open'));
}
