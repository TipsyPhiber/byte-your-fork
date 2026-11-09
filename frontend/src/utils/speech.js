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
      
      // Store the original index to match native plugin indexing properly
      const mapped = (voices || []).map((v, originalIndex) => ({
        voiceURI: v.voiceURI || `native-${originalIndex}`,
        name: v.name || v.voiceURI || `Voice ${originalIndex + 1}`,
        lang: v.lang || 'en',
        originalIndex,
      }));

      // Filter: English only, and deduplicate by name
      const seen = new Set();
      const uniqueVoices = [];
      for (const v of mapped) {
        if (!v.lang.toLowerCase().startsWith('en')) continue;
        const normName = v.name.trim().toLowerCase();
        if (!normName || seen.has(normName)) continue;
        seen.add(normName);
        uniqueVoices.push(v);
      }

      // Sort Google/premium voices to the top
      const getPriority = (name) => {
        const lower = name.toLowerCase();
        if (lower.includes('google')) return 3;
        if (lower.includes('natural') || lower.includes('premium')) return 2;
        if (lower.includes('local') || lower.includes('device')) return 1;
        return 0;
      };
      uniqueVoices.sort((a, b) => getPriority(b.name) - getPriority(a.name));

      nativeVoices = uniqueVoices;
      return nativeVoices;
    } catch {
      return [];
    }
  }

  const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  const seen = new Set();
  const uniqueVoices = [];
  for (const v of voices) {
    const normName = (v.name || v.voiceURI || '').trim().toLowerCase();
    if (!normName || seen.has(normName)) continue;
    seen.add(normName);
    uniqueVoices.push(v);
  }

  const getPriority = (name) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('google')) return 3;
    if (lower.includes('natural') || lower.includes('premium')) return 2;
    if (lower.includes('local') || lower.includes('device')) return 1;
    return 0;
  };
  uniqueVoices.sort((a, b) => getPriority(b.name) - getPriority(a.name));

  return uniqueVoices.map(v => ({ voiceURI: v.voiceURI, name: v.name, lang: v.lang }));
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
// Track when TTS is audible so Cook Mode can ignore recognition results that
// are actually the synthesized voice ("Try saying next…" must not trigger
// the "next" command). A short grace window covers recognizer latency.
let speechEndAt = 0;
let speakingNow = false;

export function isTtsAudible(graceMs = 800) {
  return speakingNow || (Date.now() - speechEndAt) < graceMs;
}

export async function speak(text, { rate = 0.88, pitch = 1, voiceURI } = {}) {
  if (isNative) {
    await TextToSpeech.stop().catch(() => {});
    const voiceObj = voiceURI ? nativeVoices.find(v => (v.voiceURI || '') === voiceURI) : null;
    const idx = voiceObj ? voiceObj.originalIndex : -1;
    const lang = voiceObj ? voiceObj.lang : 'en-US';
    speakingNow = true;
    // Plugin resolves when playback finishes.
    await TextToSpeech.speak({
      text,
      lang,
      rate,
      pitch,
      queueStrategy: 1, // Stop previous speech and speak immediately
      ...(idx >= 0 ? { voice: idx } : {}),
    }).catch(() => {});
    speakingNow = false;
    speechEndAt = Date.now();
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
  speakingNow = true;
  // Chrome sometimes never fires onend (esp. when voices stall) — without a
  // watchdog the "TTS audible" gate would mute voice commands forever.
  const watchdog = setTimeout(done, 3000 + text.length * 100);
  function done() {
    clearTimeout(watchdog);
    speakingNow = false;
    speechEndAt = Date.now();
  }
  utt.onend = done;
  utt.onerror = done;
  window.speechSynthesis.speak(utt);
}

export function cancelSpeech() {
  speakingNow = false;
  speechEndAt = Date.now();
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
// Both paths emulate continuous listening until stop() is called:
//  - Android's native recognizer is one-shot → re-arm loop.
//  - Chrome's "continuous" session still self-terminates after silence →
//    restart from onend while the user intends to listen.
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
      start: () => onError?.(new Error(
        'Voice input is not supported in this browser — try Chrome or Edge.'
      )),
      stop: () => {},
    };
  }

  let active = false;
  let rec = null;
  let restartTimer = null;

  const launch = () => {
    rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const result = e.results[e.results.length - 1];
      if (!result.isFinal) return;
      onResult?.(result[0].transcript.trim());
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return; // normal lulls
      // Fatal errors (mic denied, network) — stop for real and tell the user.
      active = false;
      const messages = {
        'not-allowed': 'Microphone access was denied — allow it in your browser settings.',
        'audio-capture': 'No microphone found.',
        'network': 'Voice recognition needs an internet connection.',
      };
      onError?.(new Error(messages[e.error] || `Voice input error: ${e.error}`));
    };
    rec.onend = () => {
      // Chrome ends "continuous" sessions after silence. While the user still
      // wants the mic on, restart quietly instead of going silently deaf.
      if (active) {
        restartTimer = setTimeout(() => {
          if (!active) return;
          try { launch(); } catch { active = false; onEnd?.(); }
        }, 150);
        return;
      }
      onEnd?.();
    };
    rec.start();
  };

  return {
    start: () => {
      if (active) return;
      active = true;
      try {
        launch();
        onStart?.();
      } catch (e) {
        active = false;
        onError?.(e);
      }
    },
    stop: () => {
      active = false;
      clearTimeout(restartTimer);
      try { rec?.stop(); } catch { /* already stopped */ }
      rec = null;
    },
  };
}
