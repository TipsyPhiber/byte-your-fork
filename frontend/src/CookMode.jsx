import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cleanSteps } from './utils/cleanRecipe';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const WORD_NUMS = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10 };

export default function CookMode({ recipe, onExit }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [listening, setListening]     = useState(false);
  const [transcript, setTranscript]   = useState('');
  const [response, setResponse]       = useState('');
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

  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.speechSynthesis.cancel();
      recognizerRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const stop = () => window.speechSynthesis.cancel();
    window.addEventListener('beforeunload', stop);
    return () => window.removeEventListener('beforeunload', stop);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
      setVoices(list);
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
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
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.88;
    utt.pitch = 1;
    const all = window.speechSynthesis.getVoices();
    const chosen =
      (voiceURI && all.find(v => v.voiceURI === voiceURI)) ||
      all.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith('en')) ||
      all.find(v => v.lang === 'en-US' && !v.name.toLowerCase().includes('espeak')) ||
      all.find(v => v.lang.startsWith('en'));
    if (chosen) utt.voice = chosen;
    window.speechSynthesis.speak(utt);
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
    const tryRead = () => { if (mountedRef.current) readStepRef.current?.(0); };
    if (window.speechSynthesis.getVoices().length > 0) {
      setTimeout(tryRead, 150);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        tryRead();
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
    return () => { window.speechSynthesis.onvoiceschanged = null; };
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
      const list = recipe.ingredients?.map(i => `${i.amount} ${i.name}`).join(', ') || 'No ingredients listed.';
      const text = `You will need: ${list}`;
      speak(text);
      setResponse(text);
      return;
    }
    if (/\b(stop|pause|quiet|silence|shush)\b/.test(lower)) {
      window.speechSynthesis.cancel();
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
  }, [stepCount, speak, readStep, recipe.ingredients]);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onstart  = () => setListening(true);
    rec.onresult = (e) => {
      const result = e.results[e.results.length - 1];
      if (!result.isFinal) return;
      const said = result[0].transcript.trim();
      setTranscript(said);
      handleCommand(said);
    };
    rec.onerror = (e) => { if (e.error !== 'no-speech') stopListening(); };
    rec.onend   = () => setListening(false);
    recognizerRef.current = rec;
    rec.start();
  }, [handleCommand, stopListening]);

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

  const progress = stepCount > 0 ? ((currentStep + 1) / stepCount) * 100 : 0;

  if (!stepCount) return (
    <div className="cook-mode-overlay">
      <div className="cook-mode-container">
        <div className="cook-mode-header">
          <div className="cook-mode-title">{recipe.title}</div>
          <button className="cook-mode-exit" onClick={onExit}>Exit Cook Mode</button>
        </div>
        <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: 40 }}>No steps found for this recipe.</p>
      </div>
    </div>
  );

  return (
    <div className="cook-mode-overlay">
      <div className="cook-mode-container">

        <div className="cook-mode-header">
          <div>
            <div className="cook-mode-title">{recipe.title}</div>
            <div className="cook-mode-subtitle">Step {currentStep + 1} of {stepCount} · ⏱ {formatTime(elapsed)}</div>
          </div>
          <button className="cook-mode-exit" onClick={() => { window.speechSynthesis.cancel(); recognizerRef.current?.stop(); onExit(); }}>
            Exit Cook Mode
          </button>
        </div>

        <div className="cook-mode-progress-track">
          <div className="cook-mode-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="cook-mode-step-card">
          <div className="cook-mode-step-num">Step {currentStep + 1}</div>
          <div className="cook-mode-step-text">{steps[currentStep]}</div>
        </div>

        <div className="cook-mode-nav">
          <button className="cook-mode-nav-btn" onClick={goPrev} disabled={currentStep === 0}>← Previous</button>
          <button
            className={`cook-mode-mic-btn ${listening ? 'listening' : ''}`}
            onClick={listening ? stopListening : startListening}
          >
            {listening ? '🔴' : '🎤'}
            <span>{listening ? 'Listening — tap to mute' : 'Tap to speak'}</span>
          </button>
          <button className="cook-mode-nav-btn" onClick={goNext} disabled={currentStep === stepCount - 1}>Next →</button>
        </div>

        {(transcript || response) && (
          <div className="cook-mode-chat">
            {transcript && (
              <div className="cook-mode-user-msg">
                <span className="cook-mode-msg-label">You</span>
                <span>"{transcript}"</span>
              </div>
            )}
            {response && (
              <div className="cook-mode-ai-msg">
                <span className="cook-mode-msg-label">Cook Mode</span>
                <span>{response}</span>
              </div>
            )}
          </div>
        )}

        <details className="cook-mode-ingredients">
          <summary>Voice settings</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem', color: '#64748b' }}>
              Voice
              <select
                value={voiceURI}
                onChange={e => setVoiceURI(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)' }}
              >
                <option value="">Default (auto-select)</option>
                {voices.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </label>
            <button
              className="cook-mode-nav-btn"
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

        <details className="cook-mode-ingredients">
          <summary>Voice commands</summary>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', marginTop: '10px' }}>
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
                <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{cmd}</span>
                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{desc}</span>
              </div>
            ))}
          </div>
        </details>

        <details className="cook-mode-ingredients">
          <summary>Ingredients reference</summary>
          <ul>
            {recipe.ingredients?.map((ing, i) => (
              <li key={i}><strong>{ing.amount}</strong> {ing.name}</li>
            ))}
          </ul>
        </details>

        {currentStep === stepCount - 1 && (
          <div className="cook-mode-done">All steps complete — enjoy your meal!</div>
        )}

      </div>
    </div>
  );
}
