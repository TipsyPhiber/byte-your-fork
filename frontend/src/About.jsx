import React, { useState } from 'react';
import logoImg from '../Images/souschef_logo.png';
import homeImg from '../Images/HomePageImage.png';
import { Mic, ArrowRight, ArrowLeft, Check } from 'lucide-react';

const STEPS = [
  { num: '01', title: 'Discover',        color: '#3b82f6', glow: 'rgba(59,130,246,0.22)', desc: 'Browse a curated library of recipes or search by cuisine, ingredient, or dish name. Filter by what you love.' },
  { num: '02', title: 'Save & Sort',     color: '#8b5cf6', glow: 'rgba(139,92,246,0.22)', desc: 'Favorite the recipes you want to try. Sort your collection by rating, name, or cook time whenever you need it.' },
  { num: '03', title: 'Cook Hands-Free', color: '#10b981', glow: 'rgba(16,185,129,0.22)', desc: 'Launch Cook Mode and let voice commands walk you through every step. No screen-touching. No losing your place.' },
];

const PERKS = [
  'No ads, ever', 'Voice-powered cook mode', 'Community-rated recipes',
  'Works on any device', 'Instant search', 'Free to get started',
];

export default function About({ onHome }) {
  const [hoveredStep, setHoveredStep] = useState(null);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100vh', position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '100px 24px 80px', color: 'white', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${homeImg})`, backgroundSize: 'cover', backgroundPosition: 'center 30%', filter: 'blur(2.5px) saturate(1.2) brightness(0.85)', transform: 'scale(1.05)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(6,6,12,0.82) 0%, rgba(6,6,12,0.5) 40%, rgba(13,13,24,1) 100%)', zIndex: 1, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', background: 'rgba(59,130,246,0.10)', top: -400, left: -300, filter: 'blur(100px)', pointerEvents: 'none', animation: 'blob1 32s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'rgba(139,92,246,0.08)', bottom: -300, right: -200, filter: 'blur(100px)', pointerEvents: 'none', animation: 'blob2 42s ease-in-out infinite' }} />

        {/* Floating header */}
        <img src={logoImg} alt="Byte Your Fork" onClick={onHome} style={{ position: 'absolute', top: 20, left: 32, zIndex: 10, height: '2.4rem', cursor: 'pointer' }} />
        <div style={{ position: 'absolute', top: 16, right: 32, zIndex: 10, display: 'flex', gap: '8px' }}>
          <button onClick={onHome} style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.22)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <button onClick={onHome} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Get Started <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '720px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '100px', padding: '5px 14px', marginBottom: '28px', fontSize: '0.72rem', fontWeight: 700, color: '#93c5fd', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            About Byte Your Fork
          </div>
          <h1 style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 800, margin: '0 0 20px', lineHeight: 1.05, letterSpacing: '-0.035em', textShadow: '0 2px 40px rgba(0,0,0,0.4)' }}>
            Built for people<br />who love food.
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'rgba(255,255,255,0.58)', maxWidth: '520px', margin: '0 auto 40px', lineHeight: 1.7 }}>
            We built Byte Your Fork because cooking should be enjoyable, not frustrating. No paywalls, no ads — just great recipes and the tools to actually make them.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={onHome} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '15px 34px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 32px rgba(59,130,246,0.4)' }}>
              Start Cooking Free <ArrowRight size={17} />
            </button>
            <button onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })} style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', padding: '15px 34px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem', fontFamily: 'inherit' }}>
              How it works ↓
            </button>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" style={{
        background: 'linear-gradient(180deg, #0d0d18 0%, #111120 100%)',
        padding: '110px 24px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'rgba(59,130,246,0.06)', top: -200, left: '50%', transform: 'translateX(-50%)', filter: 'blur(120px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '72px' }}>
            <p style={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '1.4px', textTransform: 'uppercase', margin: '0 0 16px' }}>Simple by Design</p>
            <h2 style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              From discovery to dinner<br />in 3 steps
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {STEPS.map(s => {
              const hovered = hoveredStep === s.num;
              return (
                <div
                  key={s.num}
                  className="landing-feature-card"
                  onMouseEnter={() => setHoveredStep(s.num)}
                  onMouseLeave={() => setHoveredStep(null)}
                  style={{
                    background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${hovered ? s.color + '55' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '18px', padding: '36px 32px',
                    backdropFilter: 'blur(12px)',
                    boxShadow: hovered ? `0 16px 48px ${s.glow}` : '0 4px 24px rgba(0,0,0,0.2)',
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
                    cursor: 'default',
                  }}
                >
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 44, height: 44, borderRadius: '12px',
                    background: hovered ? `${s.color}28` : 'rgba(255,255,255,0.06)',
                    color: hovered ? s.color : 'rgba(255,255,255,0.4)',
                    fontSize: '0.82rem', fontWeight: 800, letterSpacing: '1px',
                    marginBottom: '20px',
                    transition: 'all 0.3s ease',
                    boxShadow: hovered ? `0 0 16px ${s.glow}` : 'none',
                  }}>
                    {s.num}
                  </div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 12px', color: 'white', letterSpacing: '-0.02em' }}>{s.title}</h3>
                  <p style={{ margin: 0, color: hovered ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.45)', lineHeight: 1.7, fontSize: '0.95rem', transition: 'color 0.3s ease' }}>{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI Spotlight ── */}
      <section style={{ padding: '110px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${homeImg})`, backgroundSize: 'cover', backgroundPosition: 'center 40%', filter: 'blur(3px) saturate(1.1) brightness(0.65)', transform: 'scale(1.05)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(13,13,24,0.95) 0%, rgba(18,8,42,0.95) 50%, rgba(9,24,40,0.95) 100%)', zIndex: 1, pointerEvents: 'none' }} />
        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
            borderRadius: '24px', padding: '64px 56px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            border: '1px solid rgba(59,130,246,0.25)',
            boxShadow: '0 0 80px rgba(59,130,246,0.12)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '16px',
              background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#93c5fd', marginBottom: '28px',
              boxShadow: '0 0 32px rgba(59,130,246,0.2)',
            }}>
              <Mic size={30} />
            </div>
            <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', fontWeight: 800, color: 'white', margin: '0 0 16px', letterSpacing: '-0.03em' }}>
              Cooking just became hands-free
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', maxWidth: '520px', lineHeight: 1.7, margin: '0 0 36px' }}>
              Cook Mode listens for your voice commands and reads each step aloud. Say "next", "repeat", or "ingredients" — no touching your screen, no losing your place.
            </p>
            <button onClick={onHome} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '13px 28px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 32px rgba(59,130,246,0.35)' }}>
              Try Cook Mode Free <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Perks ── */}
      <section style={{ background: 'linear-gradient(180deg, #111120 0%, #0d0d18 100%)', padding: '80px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', fontWeight: 700, margin: '0 0 36px', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
            What you get with Byte Your Fork
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            {PERKS.map(p => (
              <div key={p} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '100px', padding: '10px 20px',
                fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)',
              }}>
                <Check size={14} color="#3b82f6" strokeWidth={2.5} /> {p}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
