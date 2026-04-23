import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const STEP_NOISE = /^(instructions|directions|method|steps|preparation|how to make|procedure)\.?$/i;
function cleanSteps(steps = []) {
  return steps.filter(s => s && !STEP_NOISE.test(s.trim()));
}

const WORD_NUMS = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10 };

export default function CookMode({ recipe, onExit }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [listening, setListening]     = useState(false);
  const [transcript, setTranscript]   = useState('');
  const [response, setResponse]       = useState('');
  const [elapsed, setElapsed]         = useState(0);

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
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith('en')) ||
      voices.find(v => v.lang === 'en-US' && !v.name.toLowerCase().includes('espeak')) ||
      voices.find(v => v.lang.startsWith('en'));
    if (preferred) utt.voice = preferred;
    window.speechSynthesis.speak(utt);
  }, []);

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
