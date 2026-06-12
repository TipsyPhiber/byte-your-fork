import React from 'react';
import homeImg from '../Images/HomePageImage.png';
import logoImg from '../Images/souschef_logo.png';
import { Mic, Search, Star, Bookmark, ChefHat, ArrowRight, Check, Sparkles } from 'lucide-react';

const FEATURES = [
  { icon: <Mic size={22} />,      title: 'Voice Cook Mode',    color: '#3b82f6', glow: 'rgba(59,130,246,0.28)',   desc: "Hands-free voice guidance using your browser's built-in speech recognition. Talk to it while you cook — no app or account needed." },
  { icon: <Search size={22} />,   title: 'Smart Discovery',    color: '#8b5cf6', glow: 'rgba(139,92,246,0.28)',  desc: 'Search by dish, ingredient, or browse by cuisine. Results tailored to what you actually like.' },
  { icon: <Star size={22} />,     title: 'Community Ratings',  color: '#f59e0b', glow: 'rgba(245,158,11,0.28)',  desc: "Every recipe rated by real home cooks. Know what's worth making before you even start." },
  { icon: <Bookmark size={22} />, title: 'Your Cookbook',      color: '#10b981', glow: 'rgba(16,185,129,0.28)',  desc: 'Save, filter by cuisine, and sort by rating, name, or cook time. Your collection, your rules.' },
  { icon: <ChefHat size={22} />,  title: 'Step-by-Step',       color: '#f97316', glow: 'rgba(249,115,22,0.28)',  desc: 'Clear instructions built for the kitchen. Follow at your own pace without losing your place.' },
  { icon: <Sparkles size={22} />, title: 'Tailored For You',   color: '#ec4899', glow: 'rgba(236,72,153,0.28)',  desc: 'Recommendations shaped by your taste preferences. The more you explore, the smarter it gets.' },
];

const CHECKS = ['Free to get started', 'No ads, ever', 'Works on any device', 'Hands-free voice guidance', 'Community rated'];

const LandingPage = ({ onLogin, onSignUp, onHome, onAbout }) => {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100dvh', position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: 'white', padding: 'calc(96px + env(safe-area-inset-top)) 20px 80px', overflow: 'hidden',
      }}>
        {/* Background image — separate layer so we can blur it without affecting content */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${homeImg})`, backgroundSize: 'cover', backgroundPosition: 'center 30%', filter: 'blur(2.5px) saturate(1.2) brightness(0.85)', transform: 'scale(1.05)', zIndex: 0, pointerEvents: 'none' }} />
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(6,6,12,0.82) 0%, rgba(6,6,12,0.5) 40%, rgba(13,13,24,1) 100%)', zIndex: 1, pointerEvents: 'none' }} />
        {/* Blobs on hero */}
        <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', background: 'rgba(59,130,246,0.10)', top: -400, left: -300, filter: 'blur(100px)', pointerEvents: 'none', animation: 'blob1 32s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'rgba(139,92,246,0.08)', bottom: -300, right: -200, filter: 'blur(100px)', pointerEvents: 'none', animation: 'blob2 42s ease-in-out infinite' }} />

        {/* Nav */}
        <nav className="preauth-nav">
          <img src={logoImg} alt="Byte Your Fork" className="preauth-logo" onClick={onHome} />
          <div className="preauth-nav-actions">
            <button className="glass-btn" onClick={onAbout}>About</button>
            <button className="glass-btn" onClick={onLogin}>Log In</button>
            <button className="glass-btn solid" onClick={onSignUp}>Sign Up</button>
          </div>
        </nav>

        {/* Hero content */}
        <div style={{ textAlign: 'center', maxWidth: '680px', position: 'relative', zIndex: 1, width: '100%' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '100px', padding: '5px 14px', marginBottom: '28px', fontSize: '0.72rem', fontWeight: 700, color: '#93c5fd', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            <Mic size={11} /> Hands-Free Voice Cooking
          </div>
          <h1 style={{ fontSize: 'clamp(2.6rem, 7vw, 5.8rem)', fontWeight: 800, margin: '0 0 20px', letterSpacing: '-0.035em', lineHeight: 1.02, textShadow: '0 2px 40px rgba(0,0,0,0.4)' }}>
            Cook Smarter.<br />Eat Better.
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'rgba(255,255,255,0.58)', margin: '0 0 40px', lineHeight: 1.7 }}>
            Discover recipes you'll love, save your favorites, and get hands-free AI guidance every step of the way.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
            <button onClick={onSignUp} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '16px 34px', minHeight: 52, borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 0 32px rgba(59,130,246,0.4)', flex: '1 1 220px', maxWidth: 320 }}>
              Get Started Free <ArrowRight size={17} />
            </button>
            <button onClick={onLogin} style={{ background: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.18)', padding: '16px 34px', minHeight: 52, borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem', fontFamily: 'inherit', flex: '1 1 160px', maxWidth: 320 }}>
              Log In
            </button>
          </div>
          {/* Trust pills */}
          <div style={{ display: 'flex', gap: '10px 16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {CHECKS.map(c => (
              <span key={c} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', fontWeight: 500 }}>
                <Check size={12} color="#3b82f6" strokeWidth={2.5} /> {c}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }}>
          <span>Features</span>
          <div style={{ width: 1, height: 36, background: 'linear-gradient(to bottom, rgba(255,255,255,0.35), transparent)' }} />
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{
        padding: '90px 20px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${homeImg})`, backgroundSize: 'cover', backgroundPosition: 'center 65%', filter: 'blur(3px) saturate(1.1) brightness(0.7)', transform: 'scale(1.05)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(13,13,24,0.93) 0%, rgba(18,8,42,0.93) 45%, rgba(9,24,40,0.93) 100%)', zIndex: 1, pointerEvents: 'none' }} />
        {/* subtle background glows */}
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: 'rgba(59,130,246,0.07)', top: -200, right: -200, filter: 'blur(120px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'rgba(139,92,246,0.06)', bottom: -100, left: -100, filter: 'blur(100px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '1.4px', textTransform: 'uppercase', margin: '0 0 16px' }}>Why Byte Your Fork</p>
            <h2 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.4rem)', fontWeight: 800, color: 'white', margin: '0 0 18px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Everything you need<br />in the kitchen
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
              Built for people who love food, not fussing with apps.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="landing-feature-card"
                style={{
                  '--card-color': f.color,
                  '--card-glow': f.glow,
                  '--card-border': `${f.color}55`,
                  '--card-bg': `${f.color}28`,
                }}
              >
                <div className="feature-icon">{f.icon}</div>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        background: '#111120', padding: '96px 20px calc(96px + env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', top: -300, left: '50%', transform: 'translateX(-50%)', filter: 'blur(100px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480 }}>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, color: 'white', margin: '0 0 14px', letterSpacing: '-0.03em' }}>
            Ready to start cooking?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem', margin: '0 0 40px', lineHeight: 1.6 }}>
            Free to join. No credit card needed.
          </p>
          <button onClick={onSignUp} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '16px 40px', minHeight: 52, borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 0 40px rgba(59,130,246,0.35)', width: '100%', maxWidth: 340 }}>
            Create Your Account <ArrowRight size={17} />
          </button>
          <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.78rem', margin: '16px 0 0' }}>No credit card required.</p>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
