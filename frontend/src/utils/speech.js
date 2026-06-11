// Unified speech layer for Cook Mode.
//
// On the web (dev server, nginx-served PWA) it uses the browser's Web Speech API.
// Inside the packaged Capacitor app — where Web Speech is unreliable or absent —
// it uses native plugins. Cook Mode imports only from here and never touches
// window.speechSynthesis / SpeechRecognition directly.

import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

const isNative = Capacitor.isNativePlatform();

// ───────────────────────── Voices ─────────────────────────
// Normalized voice shape: { voiceURI, name, lang }
let nativeVoices = [];

export async function loadVoices() {
  if (isNative) {
    try {
      const { voices } = await TextToSpeech.getSupportedVoices();
      nativeVoices = (voices || []).filter(v => (v.lang || '').startsWith('en'));
      return nativeVoices.map((v, i) => ({
        voiceURI: v.voiceURI || `native-${i}`,
        name: v.name || v.voiceURI || `Voice ${i + 1}`,
        lang: v.lang || 'en',
      }));
    } catch {
      return [];
    }
  }
  return window.speechSynthesis.getVoices()
    .filter(v => v.lang.startsWith('en'))
    .map(v => ({ voiceURI: v.voiceURI, name: v.name, lang: v.lang }));
}

// Subscribe to async voice availability (web only — native loads synchronously
// above). Returns an unsubscribe function.
export function onVoicesChanged(cb) {
  if (isNative) return () => {};
  const handler = () => cb();
  window.speechSynthesis.addEventListener('voiceschanged', handler);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
}

// ───────────────────────── Speak ─────────────────────────
export async function speak(text, { rate = 0.88, pitch = 1, voiceURI } = {}) {
  if (isNative) {
    await TextToSpeech.stop().catch(() => {});
    const idx = voiceURI ? nativeVoices.findIndex(v => (v.voiceURI || '') === voiceURI) : -1;
    await TextToSpeech.speak({
      text,
      lang: 'en-US',
      rate,
      pitch,
      ...(idx >= 0 ? { voice: idx } : {}),
    }).catch(() => {});
    return;
  }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = rate;
  utt.pitch = pitch;
  const all = window.speechSynthesis.getVoices();
  const chosen =
    (voiceURI && all.find(v => v.voiceURI === voiceURI)) ||
    all.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith('en')) ||
    all.find(v => v.lang === 'en-US' && !v.name.toLowerCase().includes('espeak')) ||
    all.find(v => v.lang.startsWith('en'));
  if (chosen) utt.voice = chosen;
  window.speechSynthesis.speak(utt);
}

export function cancelSpeech() {
  if (isNative) {
    TextToSpeech.stop().catch(() => {});
    return;
  }
  window.speechSynthesis.cancel();
}

// ───────────────────── Speech recognition ─────────────────────
// Returns a recognizer with start()/stop(). Callbacks: onResult(transcript),
// onError(err), onStart(), onEnd().
//
// Web uses a single continuous SpeechRecognition session. Android's native
// recognizer is one-shot, so we re-arm it after each result to emulate
// continuous listening for as long as the user keeps the mic on.
export function createRecognizer({ onResult, onError, onStart, onEnd } = {}) {
  if (isNative) {
    let active = false;

    const REARM_DELAY_MS = 200;        // let the native recognizer release before re-arming
    const MAX_CONSECUTIVE_ERRORS = 5;  // bail out instead of spinning if it keeps failing
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // "Didn't hear anything" outcomes are normal between commands — re-arm
    // quietly rather than surfacing them as errors or muting the mic.
    const isTransient = (msg) =>
      /no match|no speech|timeout|didn'?t understand|client side|busy|retry/i.test(msg);

    // Android's recognizer is one-shot, so we loop to emulate continuous
    // listening. Crucially this loop ALWAYS waits between turns (success or
    // error), so a fast-failing start() can't become a hot CPU/battery loop —
    // and a run of hard failures stops the loop instead of spinning forever.
    const runLoop = async () => {
      let consecutiveErrors = 0;
      while (active) {
        try {
          const result = await SpeechRecognition.start({
            language: 'en-US',
            partialResults: false,
            popup: false,
          });
          if (!active) return;
          consecutiveErrors = 0;
          const said = result?.matches?.[0];
          if (said) onResult?.(said.trim());
          await sleep(REARM_DELAY_MS);
        } catch (e) {
          if (!active) return;
          const msg = (e?.message || String(e)).toLowerCase();
          if (isTransient(msg)) {
            consecutiveErrors += 1;
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
              active = false;
              onError?.(new Error('Voice input keeps failing — stopped listening.'));
              onEnd?.();
              return;
            }
            await sleep(REARM_DELAY_MS);
            continue;
          }
          // Fatal (permission denied, recognizer unavailable, …) — stop cleanly.
          active = false;
          onError?.(e);
          onEnd?.();
          return;
        }
      }
    };

    return {
      start: async () => {
        try {
          await SpeechRecognition.requestPermissions();
          const { available } = await SpeechRecognition.available();
          if (!available) { onError?.(new Error('Speech recognition unavailable')); return; }
        } catch (e) {
          onError?.(e);
          return;
        }
        if (active) return; // already listening — don't start a second loop
        active = true;
        onStart?.();
        runLoop();
      },
      stop: async () => {
        active = false;
        try { await SpeechRecognition.stop(); } catch { /* already stopped */ }
        onEnd?.();
      },
    };
  }

  // ── Web ──
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    return {
      start: () => onError?.(new Error('SpeechRecognition not supported')),
      stop: () => {},
    };
  }
  let rec = null;
  return {
    start: () => {
      rec = new SR();
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = false;
      rec.onstart = () => onStart?.();
      rec.onresult = (e) => {
        const result = e.results[e.results.length - 1];
        if (!result.isFinal) return;
        onResult?.(result[0].transcript.trim());
      };
      rec.onerror = (e) => { if (e.error !== 'no-speech') onError?.(e); };
      rec.onend = () => onEnd?.();
      rec.start();
    },
    stop: () => { rec?.stop(); rec = null; },
  };
}
