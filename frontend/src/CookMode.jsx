import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function CookMode({ recipe, token, onExit }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [listening, setListening] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported] = useState(!!SpeechRecognition);
  const recognizerRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const stepCount = recipe.steps?.length || 0;

  const speak = useCallback((text) => {
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = 1;
    synthRef.current.speak(utt);
  }, []);

  // Read current step aloud whenever it changes
  useEffect(() => {
    if (recipe.steps?.[currentStep]) {
      speak(`Step ${currentStep + 1}. ${recipe.steps[currentStep]}`);
    }
  }, [currentStep, recipe.steps, speak]);

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      synthRef.current.cancel();
      recognizerRef.current?.stop();
    };
  }, []);

  const sendToGemini = useCallback(async (text) => {
    setLoading(true);
    setAiResponse('');
    try {
      const res = await axios.post(
        `${API_BASE}/cook-mode/chat`,
        { message: text, recipe, currentStep },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { response, action } = res.data;
      setAiResponse(response);
      speak(response);

      if (action === 'next') setCurrentStep(s => Math.min(s + 1, stepCount - 1));
      else if (action === 'prev') setCurrentStep(s => Math.max(s - 1, 0));
    } catch {
      const msg = 'Sorry, I could not connect to the assistant right now.';
      setAiResponse(msg);
      speak(msg);
    } finally {
      setLoading(false);
    }
  }, [currentStep, recipe, stepCount, token, speak]);

  const startListening = useCallback(() => {
    if (!supported || listening) return;
    const recognizer = new SpeechRecognition();
    recognizer.lang = 'en-US';
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;

    recognizer.onstart = () => { setListening(true); setTranscript(''); };
    recognizer.onresult = (e) => {
      const said = e.results[0][0].transcript;
      setTranscript(said);
      sendToGemini(said);
    };
    recognizer.onerror = () => setListening(false);
    recognizer.onend = () => setListening(false);

    recognizerRef.current = recognizer;
    synthRef.current.cancel();
    recognizer.start();
  }, [supported, listening, sendToGemini]);

  const goNext = () => {
    setCurrentStep(s => Math.min(s + 1, stepCount - 1));
    setAiResponse('');
  };
  const goPrev = () => {
    setCurrentStep(s => Math.max(s - 1, 0));
    setAiResponse('');
  };

  const progress = ((currentStep + 1) / stepCount) * 100;

  return (
    <div className="cook-mode-overlay">
      <div className="cook-mode-container">

        {/* Header */}
        <div className="cook-mode-header">
          <div>
            <div className="cook-mode-title">{recipe.title}</div>
            <div className="cook-mode-subtitle">Step {currentStep + 1} of {stepCount}</div>
          </div>
          <button className="cook-mode-exit" onClick={() => { synthRef.current.cancel(); onExit(); }}>
            Exit Cook Mode
          </button>
        </div>

        {/* Progress bar */}
        <div className="cook-mode-progress-track">
          <div className="cook-mode-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Current step */}
        <div className="cook-mode-step-card">
          <div className="cook-mode-step-num">Step {currentStep + 1}</div>
          <div className="cook-mode-step-text">{recipe.steps?.[currentStep]}</div>
        </div>

        {/* Navigation */}
        <div className="cook-mode-nav">
          <button className="cook-mode-nav-btn" onClick={goPrev} disabled={currentStep === 0}>
            ← Previous
          </button>
          <button
            className={`cook-mode-mic-btn ${listening ? 'listening' : ''}`}
            onClick={startListening}
            disabled={!supported || loading}
            title={supported ? 'Tap to speak' : 'Voice not supported in this browser'}
          >
            {listening ? '🔴' : '🎤'}
            <span>{listening ? 'Listening...' : loading ? 'Thinking...' : 'Ask Gemini'}</span>
          </button>
          <button className="cook-mode-nav-btn" onClick={goNext} disabled={currentStep === stepCount - 1}>
            Next →
          </button>
        </div>

        {/* Transcript + AI response */}
        {(transcript || aiResponse) && (
          <div className="cook-mode-chat">
            {transcript && (
              <div className="cook-mode-user-msg">
                <span className="cook-mode-msg-label">You</span>
                <span>"{transcript}"</span>
              </div>
            )}
            {aiResponse && (
              <div className="cook-mode-ai-msg">
                <span className="cook-mode-msg-label">Gemini</span>
                <span>{aiResponse}</span>
              </div>
            )}
          </div>
        )}

        {/* Ingredients quick reference */}
        <details className="cook-mode-ingredients">
          <summary>Ingredients reference</summary>
          <ul>
            {recipe.ingredients?.map((ing, i) => (
              <li key={i}><strong>{ing.amount}</strong> {ing.name}</li>
            ))}
          </ul>
        </details>

        {currentStep === stepCount - 1 && (
          <div className="cook-mode-done">
            All steps complete! Enjoy your meal.
          </div>
        )}
      </div>
    </div>
  );
}
