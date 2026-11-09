import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Mic, MicOff, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { cleanSteps } from './utils/cleanRecipe';
import { scaleAmount } from './utils/scaleAmount';
import { speak as ttsSpeak, cancelSpeech, isTtsAudible, loadVoices, onVoicesChanged, createRecognizer } from './utils/speech';
import { setSessionKeepAlive } from './utils/session';
import { useWakeLock } from './hooks/useWakeLock';

const WORD_NUMS = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10 };

export default function CookMode({ recipe, onExit, scale = 1 }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [listening, setListening]     = useState(false);
  const [transcript, setTranscript]   = useState('');
  const [response, setResponse]       = useState('');
  const [micError, setMicError]       = useState('');
  const [elapsed, setElapsed]         = useState(0);
  const [voices, setVoices]           = useState([]);
  const [voiceURI, setVoiceURI]       = useState(() => localStorage.getItem('cm_voiceURI') || '');

  const recognizerRef  = useRef(null);
  const mountedRef     = useRef(true);
  const currentStepRef = useRef(0);
  const readStepRef    = useRef(null); // avoids dependency chain in auto-read effect

  // Memoize so steps reference is stable across re-renders
  const steps     = useMemo(() => cleanSteps(recipe.steps ?? []), [recipe.steps]);
  const stepCount = steps.length;

  // Kitchen mode: keep the screen awake, and don't let the hands-free lull
  // trip the inactivity logout.
  useWakeLock(true);
  useEffect(() => {
    setSessionKeepAlive(true);
    return () => setSessionKeepAlive(false);
  }, []);

  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelSpeech();
      recognizerRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const stop = () => cancelSpeech();
    window.addEventListener('beforeunload', stop);
    return () => window.removeEventListener('beforeunload', stop);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => { loadVoices().then(list => { if (!cancelled) setVoices(list); }); };
    refresh();
    const unsubscribe = onVoicesChanged(refresh);
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  useEffect(() => { localStorage.setItem('cm_voiceURI', voiceURI); }, [voiceURI]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const speak = useCallback((text) => {
    if (!mountedRef.current) return;
    ttsSpeak(text, { rate: 0.88, pitch: 1, voiceURI });
  }, [voiceURI]);

  const readStep = useCallback((idx) => {
    if (!steps[idx]) return;
    const text = `Step ${idx + 1}. ${steps[idx]}`;
    speak(text);
    setResponse(text);
  }, [speak, steps]);

  // Keep ref in sync so auto-read effect can call latest version without being a dep
  useEffect(() => { readStepRef.current = readStep; }, [readStep]);

  // Auto-read step 0 on mount — runs once only
  useEffect(() => {
    if (!steps.length) return;
    const id = setTimeout(() => { if (mountedRef.current) readStepRef.current?.(0); }, 250);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = useCallback(() => {
    recognizerRef.current?.stop();
    setListening(false);
  }, []);

  const handleCommand = useCallback((said) => {
    const lower = said.toLowerCase().trim();

    const stepMatch = lower.match(/(?:go to|jump to|skip to|step)\s+(?:step\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/);
    if (stepMatch) {
      const raw = stepMatch[1];
      const target = (parseInt(raw) || WORD_NUMS[raw] || 1) - 1;
      const idx = Math.max(0, Math.min(target, stepCount - 1));
      setCurrentStep(idx);
      readStep(idx);
      return;
    }
    if (/\b(next|next step|go next|move on|continue|forward)\b/.test(lower)) {
      const idx = Math.min(currentStepRef.current + 1, stepCount - 1);
      setCurrentStep(idx);
      readStep(idx);
      return;
    }
    if (/\b(back|previous|go back|prev|last step|before)\b/.test(lower)) {
      const idx = Math.max(currentStepRef.current - 1, 0);
      setCurrentStep(idx);
      readStep(idx);
      return;
    }
    if (/\b(repeat|again|say again|read|read step|read that|what was that)\b/.test(lower)) {
      readStep(currentStepRef.current);
      return;
    }
    if (/\b(ingredients?|what do i need|what('s| is) in this)\b/.test(lower)) {
      const list = recipe.ingredients?.map(i => `${scaleAmount(i.amount, scale)} ${i.name}`).join(', ') || 'No ingredients listed.';
      const text = `You will need: ${list}`;
      speak(text);
      setResponse(text);
      return;
    }
    if (/\b(stop|pause|quiet|silence|shush)\b/.test(lower)) {
      cancelSpeech();
      setResponse('Stopped.');
      return;
    }
    if (/\b(where am i|which step|current step|what step)\b/.test(lower)) {
      readStep(currentStepRef.current);
      return;
    }
    if (/\b(how many steps|total steps|steps total)\b/.test(lower)) {
      const text = `This recipe has ${stepCount} steps. You are on step ${currentStepRef.current + 1}.`;
      speak(text);
      setResponse(text);
      return;
    }
    const fallback = 'Try saying: next, back, repeat, ingredients, or go to step 3.';
    speak(fallback);
    setResponse(fallback);
  }, [stepCount, speak, readStep, recipe.ingredients, scale]);

  const startListening = useCallback(() => {
    setMicError('');
    const rec = createRecognizer({
      onStart:  () => setListening(true),
      onResult: (said) => {
        // The mic hears our own TTS ("…try saying next") — drop anything
        // captured while the voice is (or just was) audible.
        if (isTtsAudible()) return;
        setTranscript(said);
        handleCommand(said);
      },
      onError:  (err) => {
        setListening(false);
        setMicError(err?.message || 'Voice input failed.');
      },
      onEnd:    () => setListening(false),
    });
    recognizerRef.current = rec;
    rec.start();
  }, [handleCommand]);

  const goNext = () => {
    const idx = Math.min(currentStep + 1, stepCount - 1);
    setCurrentStep(idx);
    setTranscript('');
    readStep(idx);
  };

  const goPrev = () => {
    const idx = Math.max(currentStep - 1, 0);
    setCurrentStep(idx);
    setTranscript('');
    readStep(idx);
  };

  const handleExit = () => {
    cancelSpeech();
    recognizerRef.current?.stop();
    onExit();
  };

  const progress = stepCount > 0 ? ((currentStep + 1) / stepCount) * 100 : 0;

  if (!stepCount) return (
    <div className="cook-mode-overlay">
      <div className="cm-header">
        <div className="cm-header-info">
          <div className="cm-title">{recipe.title}</div>
        </div>
        <button className="cm-exit" onClick={handleExit} aria-label="Exit Cook Mode"><X size={20} /></button>
      </div>
      <div className="cm-body">
        <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: 40 }}>No steps found for this recipe.</p>
      </div>
    </div>
  );

  return (
    <div className="cook-mode-overlay">

      <div className="cm-header">
        <div className="cm-header-info">
          <div className="cm-title">{recipe.title}</div>
          <div className="cm-subtitle">
            <span>Step {currentStep + 1} of {stepCount}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} /> {formatTime(elapsed)}
            </span>
          </div>
        </div>
        <button className="cm-exit" onClick={handleExit} aria-label="Exit Cook Mode"><X size={20} /></button>
      </div>

      <div className="cm-progress-track">
        <div className="cm-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="cm-body">
        <div className="cm-body-inner">
          <div className="cm-step-card">
            <div className="cm-step-num">Step {currentStep + 1}</div>
            <div className="cm-step-text">{steps[currentStep]}</div>
          </div>

          {currentStep === stepCount - 1 && (
            <div className="cm-done">All steps complete — enjoy your meal!</div>
          )}

          {(transcript || response) && (
            <div className="cm-chat">
              {transcript && (
                <div className="cm-user-msg">
                  <span className="cm-msg-label">You</span>
                  <span>"{transcript}"</span>
                </div>
              )}
              {response && (
                <div className="cm-ai-msg">
                  <span className="cm-msg-label">Cook Mode</span>
                  <span>{response}</span>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 'auto' }}>
            <details className="cm-accordion">
              <summary>Ingredients</summary>
              <ul>
                {recipe.ingredients?.map((ing, i) => (
                  <li key={i}><strong>{scaleAmount(ing.amount, scale)}</strong> {ing.name}</li>
                ))}
              </ul>
            </details>

            <details className="cm-accordion">
              <summary>Voice commands</summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px 24px', margin: '6px 0 14px' }}>
                {[
                  ['"next"',           'Go to next step'],
                  ['"back"',           'Go to previous step'],
                  ['"repeat"',         'Re-read current step'],
                  ['"step 3"',         'Jump to a specific step'],
                  ['"ingredients"',    'List all ingredients'],
                  ['"where am I"',     'Read current step again'],
                  ['"how many steps"', 'Total step count'],
                  ['"stop"',           'Stop speaking'],
                ].map(([cmd, desc]) => (
                  <div key={cmd} style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{cmd}</span>
                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{desc}</span>
                  </div>
                ))}
              </div>
            </details>

            <details className="cm-accordion">
              <summary>Voice settings</summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '6px 0 14px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem', color: '#64748b' }}>
                  Voice
                  <select
                    value={voiceURI}
                    onChange={e => setVoiceURI(e.target.value)}
                    style={{ padding: '12px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: '#15151f', color: '#e2e8f0', fontSize: '1rem', fontFamily: 'inherit' }}
                  >
                    <option value="">Default (auto-select)</option>
                    {voices.map(v => (
                      <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                </label>
                <button
                  className="glass-btn"
                  onClick={() => speak('Hello! This is how I will sound while reading your recipe.')}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Test voice
                </button>
                {voices.length === 0 && (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No voices loaded yet — they appear after the browser registers them.</span>
                )}
              </div>
            </details>
          </div>
        </div>
      </div>

      <div className="cm-controls">
        <button className="cm-nav-btn" onClick={goPrev} disabled={currentStep === 0} aria-label="Previous step">
          <ChevronLeft size={26} />
        </button>

        <div className="cm-mic-wrap">
          <button
            className={`cm-mic-btn ${listening ? 'listening' : ''}`}
            onClick={listening ? stopListening : startListening}
            aria-label={listening ? 'Stop listening' : 'Start voice control'}
          >
            {listening ? <MicOff size={30} /> : <Mic size={30} />}
          </button>
          <span className={`cm-mic-label ${listening ? 'listening' : ''}`}>
            {micError ? micError : listening ? 'Listening — tap to mute' : 'Tap to speak'}
          </span>
        </div>

        <button className="cm-nav-btn" onClick={goNext} disabled={currentStep === stepCount - 1} aria-label="Next step">
          <ChevronRight size={26} />
        </button>
      </div>

    </div>
  );
}
