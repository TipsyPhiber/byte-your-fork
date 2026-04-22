import React from 'react';
import homeImg from '../Images/HomePageImage.png';
import logoImg from '../Images/souschef_logo.png';
import { Mic, Search, Star, Bookmark, ChefHat, ArrowRight, Check } from 'lucide-react';

const FEATURES = [
  { icon: <Mic size={22} />,      title: 'AI Cook Mode',       desc: 'Hands-free voice guidance powered by Gemini Live. Get real-time help without touching your screen.' },
  { icon: <Search size={22} />,   title: 'Smart Discovery',    desc: 'Search by dish, ingredient, or browse by cuisine. Results tailored to what you actually like.' },
  { icon: <Star size={22} />,     title: 'Community Ratings',  desc: 'Every recipe rated by real home cooks. Know what\'s worth making before you even start.' },
  { icon: <Bookmark size={22} />, title: 'Your Cookbook',      desc: 'Save, filter by cuisine, and sort by rating, name, or cook time. Your collection, your rules.' },
  { icon: <ChefHat size={22} />,  title: 'Step-by-Step',       desc: 'Clear instructions built for the kitchen. Follow at your own pace without losing your place.' },
];

const CHECKS = ['Free to get started', 'No ads, ever', 'Works on any device', 'AI voice guidance', 'Community rated'];

const LandingPage = ({ onLogin, onSignUp, onHome, onAbout }) => (
  <div style={{ fontFamily: "'Inter', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}>

    {/* ── Hero ── */}
    <section style={{
      minHeight: '100vh', position: 'relative',
      backgroundImage: `linear-gradient(to bottom, rgba(6,6,12,0.82) 0%, rgba(6,6,12,0.5) 40%, rgba(4,4,10,0.94) 100%), url(${homeImg})`,
      backgroundSize: 'cover', backgroundPosition: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: 'white', padding: '100px 24px 80px', overflow: 'hidden',
    }}>
      {/* Blobs on hero */}
      <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', background: 'rgba(59,130,246,0.10)', top: -400, left: -300, filter: 'blur(100px)', pointerEvents: 'none', animation: 'blob1 32s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'rgba(139,92,246,0.08)', bottom: -300, right: -200, filter: 'blur(100px)', pointerEvents: 'none', animation: 'blob2 42s ease-in-out infinite' }} />

      {/* Nav */}
      <nav style={{
        position: 'absolute', top: 0, width: '100%', height: 68,
        background: 'rgba(6,6,12,0.6)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 40px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', boxSizing: 'border-box',
      }}>
        <img src={logoImg} alt="Byte Your Fork" style={{ height: '2.6rem', cursor: 'pointer' }} onClick={onHome} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onAbout} style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'inherit' }}>About</button>
          <button onClick={onLogin} style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'inherit' }}>Log In</button>
          <button onClick={onSignUp} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'inherit' }}>Sign Up</button>
        </div>
      </nav>

      {/* Hero content */}
      <div style={{ textAlign: 'center', maxWidth: '680px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '100px', padding: '5px 14px', marginBottom: '28px', fontSize: '0.72rem', fontWeight: 700, color: '#93c5fd', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
          <Mic size={11} /> AI-Powered Voice Cooking
        </div>
        <h1 style={{ fontSize: 'clamp(3rem, 7vw, 5.8rem)', fontWeight: 800, margin: '0 0 20px', letterSpacing: '-0.035em', lineHeight: 1.02, textShadow: '0 2px 40px rgba(0,0,0,0.4)' }}>
          Cook Smarter.<br />Eat Better.
        </h1>
        <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'rgba(255,255,255,0.58)', margin: '0 0 44px', lineHeight: 1.7 }}>
          Discover recipes you'll love, save your favorites, and get hands-free AI guidance every step of the way.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
          <button onClick={onSignUp} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '15px 34px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 32px rgba(59,130,246,0.4)' }}>
            Get Started Free <ArrowRight size={17} />
          </button>
          <button onClick={onLogin} style={{ background: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.18)', padding: '15px 34px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem', fontFamily: 'inherit' }}>
            Log In
          </button>
        </div>
        {/* Trust pills */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {CHECKS.map(c => (
            <span key={c} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', fontWeight: 500 }}>
              <Check size={12} color="#3b82f6" strokeWidth={2.5} /> {c}
            </span>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{ position: 'absolute', bottom: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
        <span>Features</span>
        <div style={{ width: 1, height: 32, background: 'linear-gradient(to bottom, rgba(255,255,255,0.25), transparent)' }} />
      </div>
    </section>

    {/* ── Features ── */}
    <section style={{ background: '#f4f4f8', padding: '100px 24px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '1.2px', textTransform: 'uppercase', margin: '0 0 14px' }}>Why Byte Your Fork</p>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', fontWeight: 800, color: '#0d0d14', margin: '0 0 14px', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            Everything you need<br />in the kitchen
          </h2>
          <p style={{ color: '#6b6b80', fontSize: '1.05rem', maxWidth: '440px', margin: '0 auto', lineHeight: 1.65 }}>
            Built for people who love food, not fussing with apps.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} style={{
              background: 'white', borderRadius: '16px', padding: '28px',
              border: '1px solid #e6e6ed',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.04)',
              display: 'flex', gap: '18px', alignItems: 'flex-start',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(59,130,246,0.10)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {f.icon}
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700, color: '#0d0d14' }}>{f.title}</h3>
                <p style={{ margin: 0, color: '#6b6b80', lineHeight: 1.65, fontSize: '0.875rem' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── CTA ── */}
    <section style={{
      background: '#111120', padding: '96px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', top: -300, left: '50%', transform: 'translateX(-50%)', filter: 'blur(100px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, color: 'white', margin: '0 0 14px', letterSpacing: '-0.03em' }}>
          Ready to start cooking?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem', margin: '0 0 40px', lineHeight: 1.6 }}>
          Free to join. No credit card needed.
        </p>
        <button onClick={onSignUp} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '10px', boxShadow: '0 0 40px rgba(59,130,246,0.35)' }}>
          Create Your Account <ArrowRight size={17} />
        </button>
        <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.78rem', margin: '16px 0 0' }}>No credit card required.</p>
      </div>
    </section>

  </div>
);

export default LandingPage;
