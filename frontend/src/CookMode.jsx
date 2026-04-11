import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WS_BASE } from './config';

const WS_URL = `${WS_BASE}/ws/cook-mode`;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Filter out scraper artifacts (section headings stored as steps)
const STEP_NOISE = /^(instructions|directions|method|steps|preparation|how to make|procedure)\.?$/i;
function cleanSteps(steps = []) {
  return steps.filter(s => s && !STEP_NOISE.test(s.trim()));
}

export default function CookMode({ recipe, token, onExit }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState('Connecting...');
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiText, setAiText] = useState('');
  const [ready, setReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const wsRef = useRef(null);
  const recognizerRef = useRef(null);

  // Elapsed cook timer
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
  const steps = cleanSteps(recipe.steps);
  const stepCount = steps.length;

  const speak = useCallback((text) => {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.88;
    utt.pitch = 1;
    // Prefer Google/natural voices over eSpeak
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith('en')) ||
      voices.find(v => v.lang === 'en-US' && !v.name.toLowerCase().includes('espeak')) ||
      voices.find(v => v.lang.startsWith('en'));
    if (preferred) utt.voice = preferred;
    window.speechSynthesis.speak(utt);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'init', recipe, currentStep: 0 }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'ready') {
        setReady(true);
        setStatus('Listening...');
      } else if (msg.type === 'text') {
        setAiText(msg.text);
        speak(msg.text);
        if (msg.action === 'next') {
          setCurrentStep(s => {
            const next = Math.min(s + 1, stepCount - 1);
            wsRef.current?.send(JSON.stringify({ type: 'update_step', step: next }));
            return next;
          });
        } else if (msg.action === 'prev') {
          setCurrentStep(s => {
            const prev = Math.max(s - 1, 0);
            wsRef.current?.send(JSON.stringify({ type: 'update_step', step: prev }));
            return prev;
          });
        }
      } else if (msg.type === 'error') {
        setStatus(msg.message);
      }
    };

    ws.onclose = () => setStatus('Disconnected');
    ws.onerror = () => setStatus('Connection error');

    return () => {
      ws.close();
      stopSpeaking();
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const notifyStepChange = useCallback((step) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'update_step', step }));
    }
  }, []);

  const goNext = () => {
    const next = Math.min(currentStep + 1, stepCount - 1);
    setCurrentStep(next);
    setAiText('');
    stopSpeaking();
    notifyStepChange(next);
  };

  const goPrev = () => {
    const prev = Math.max(currentStep - 1, 0);
    setCurrentStep(prev);
    setAiText('');
    stopSpeaking();
    notifyStepChange(prev);
  };

  const stopListening = useCallback(() => {
    recognizerRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition || !ready) return;
    const recognizer = new SpeechRecognition();
    recognizer.lang = 'en-US';
    recognizer.continuous = true;
    recognizer.interimResults = false;

    recognizer.onstart = () => setListening(true);

    recognizer.onresult = (e) => {
      const result = e.results[e.results.length - 1];
      if (!result.isFinal) return;
      const said = result[0].transcript;
      setTranscript(said);
      const lower = said.toLowerCase().trim();

      // "go to step 3", "jump to step five", "step 2", etc.
      const stepMatch = lower.match(/(?:go to|jump to|skip to|step)\s+(?:step\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/);
      if (stepMatch) {
        const words = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10 };
        const target = (parseInt(stepMatch[1]) || words[stepMatch[1]] || 1) - 1;
        const clamped = Math.max(0, Math.min(target, stepCount - 1));
        setCurrentStep(clamped);
        wsRef.current?.send(JSON.stringify({ type: 'update_step', step: clamped }));
        setAiText(`Going to step ${clamped + 1}.`);
        speak(`Going to step ${clamped + 1}.`);
        return;
      }

      if (/\b(next|next step|go next|move on|continue)\b/.test(lower)) {
        setCurrentStep(s => {
          const next = Math.min(s + 1, stepCount - 1);
          wsRef.current?.send(JSON.stringify({ type: 'update_step', step: next }));
          return next;
        });
        setAiText('Moving to the next step.');
        speak('Moving to the next step.');
        return;
      }
      if (/\b(back|previous|go back|prev|last step)\b/.test(lower)) {
        setCurrentStep(s => {
          const prev = Math.max(s - 1, 0);
          wsRef.current?.send(JSON.stringify({ type: 'update_step', step: prev }));
          return prev;
        });
        setAiText('Going back a step.');
        speak('Going back a step.');
        return;
      }

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'message', text: said }));
      }
    };

    recognizer.onerror = (e) => { if (e.error !== 'no-speech') stopListening(); };
    recognizer.onend = () => setListening(false);

    recognizerRef.current = recognizer;
    recognizer.start();
  }, [ready, stepCount, speak, stopListening]);

  // Auto-start mic once connected
  useEffect(() => {
    if (ready) startListening();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = ((currentStep + 1) / stepCount) * 100;

  return (
    <div className="cook-mode-overlay">
      <div className="cook-mode-container">

        <div className="cook-mode-header">
          <div>
            <div className="cook-mode-title">{recipe.title}</div>
            <div className="cook-mode-subtitle">Step {currentStep + 1} of {stepCount} · {status} · ⏱️ {formatTime(elapsed)}</div>
          </div>
          <button className="cook-mode-exit" onClick={() => { stopSpeaking(); onExit(); }}>
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
            disabled={!ready}
          >
            {listening ? '🔴' : '🎤'}
            <span>{listening ? 'Tap to mute' : !ready ? 'Connecting...' : 'Tap to unmute'}</span>
          </button>
          <button className="cook-mode-nav-btn" onClick={goNext} disabled={currentStep === stepCount - 1}>Next →</button>
        </div>

        {(transcript || aiText) && (
          <div className="cook-mode-chat">
            {transcript && (
              <div className="cook-mode-user-msg">
                <span className="cook-mode-msg-label">You</span>
                <span>"{transcript}"</span>
              </div>
            )}
            {aiText && (
              <div className="cook-mode-ai-msg">
                <span className="cook-mode-msg-label">Assistant</span>
                <span>{aiText}</span>
              </div>
            )}
          </div>
        )}

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
