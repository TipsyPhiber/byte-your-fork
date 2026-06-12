import React from 'react';
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
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100dvh', position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: 'calc(96px + env(safe-area-inset-top)) 20px 80px', color: 'white', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${homeImg})`, backgroundSize: 'cover', backgroundPosition: 'center 30%', filter: 'blur(2.5px) saturate(1.2) brightness(0.85)', transform: 'scale(1.05)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(6,6,12,0.82) 0%, rgba(6,6,12,0.5) 40%, rgba(13,13,24,1) 100%)', zIndex: 1, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', background: 'rgba(59,130,246,0.10)', top: -400, left: -300, filter: 'blur(100px)', pointerEvents: 'none', animation: 'blob1 32s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'rgba(139,92,246,0.08)', bottom: -300, right: -200, filter: 'blur(100px)', pointerEvents: 'none', animation: 'blob2 42s ease-in-out infinite' }} />

        {/* Header — same safe-area-aware chrome as Landing/Auth */}
        <nav className="preauth-nav">
          <img src={logoImg} alt="Byte Your Fork" className="preauth-logo" onClick={onHome} />
          <div className="preauth-nav-actions">
            <button className="glass-btn" onClick={onHome}>
              <ArrowLeft size={14} /> Back
            </button>
            <button className="glass-btn solid" onClick={onHome}>
              Get Started <ArrowRight size={14} />
            </button>
          </div>
        </nav>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '720px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '100px', padding: '5px 14px', marginBottom: '28px', fontSize: '0.72rem', fontWeight: 700, color: '#93c5fd', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            About Byte Your Fork
          </div>
          <h1 style={{ fontSize: 'clamp(2.4rem, 7vw, 5.5rem)', fontWeight: 800, margin: '0 0 20px', lineHeight: 1.05, letterSpacing: '-0.035em', textShadow: '0 2px 40px rgba(0,0,0,0.4)' }}>
            Built for people<br />who love food.
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'rgba(255,255,255,0.58)', maxWidth: '520px', margin: '0 auto 40px', lineHeight: 1.7 }}>
            We built Byte Your Fork because cooking should be enjoyable, not frustrating. No paywalls, no ads — just great recipes and the tools to actually make them.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={onHome} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '16px 34px', minHeight: 52, borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 0 32px rgba(59,130,246,0.4)', flex: '1 1 220px', maxWidth: 320 }}>
              Start Cooking Free <ArrowRight size={17} />
            </button>
            <button onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })} style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', padding: '16px 34px', minHeight: 52, borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem', fontFamily: 'inherit', flex: '1 1 180px', maxWidth: 320 }}>
              How it works ↓
            </button>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" style={{
        background: 'linear-gradient(180deg, #0d0d18 0%, #111120 100%)',
        padding: '90px 20px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'rgba(59,130,246,0.06)', top: -200, left: '50%', transform: 'translateX(-50%)', filter: 'blur(120px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '1.4px', textTransform: 'uppercase', margin: '0 0 16px' }}>Simple by Design</p>
            <h2 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.4rem)', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              From discovery to dinner<br />in 3 steps
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '20px' }}>
            {STEPS.map(s => (
              <div
                key={s.num}
                className="landing-feature-card"
                style={{
                  '--card-color': s.color,
                  '--card-glow': s.glow,
                  '--card-border': `${s.color}55`,
                  '--card-bg': `${s.color}28`,
                  flexDirection: 'column', padding: '32px 26px',
                }}
              >
                <div className="feature-icon" style={{ borderRadius: '12px', fontSize: '0.82rem', fontWeight: 800, letterSpacing: '1px' }}>
                  {s.num}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.3rem', margin: '0 0 12px', letterSpacing: '-0.02em' }}>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Spotlight ── */}
      <section style={{ padding: '90px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${homeImg})`, backgroundSize: 'cover', backgroundPosition: 'center 40%', filter: 'blur(3px) saturate(1.1) brightness(0.65)', transform: 'scale(1.05)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(13,13,24,0.95) 0%, rgba(18,8,42,0.95) 50%, rgba(9,24,40,0.95) 100%)', zIndex: 1, pointerEvents: 'none' }} />
        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
            borderRadius: '24px', padding: 'clamp(32px, 6vw, 64px) clamp(22px, 6vw, 56px)',
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
            <button onClick={onHome} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '14px 28px', minHeight: 50, borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 32px rgba(59,130,246,0.35)' }}>
              Try Cook Mode Free <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Perks ── */}
      <section style={{ background: 'linear-gradient(180deg, #111120 0%, #0d0d18 100%)', padding: '80px 20px calc(80px + env(safe-area-inset-bottom))' }}>
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
                borderRadius: '100px', padding: '12px 20px',
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
