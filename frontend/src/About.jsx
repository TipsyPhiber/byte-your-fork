import React from 'react';
import logoImg from '../Images/souschef_logo.png';
import homeImg from '../Images/HomePageImage.png';
import { Mic, Search, Star, Bookmark, ChefHat, Users, ArrowRight, Check } from 'lucide-react';

const FEATURES = [
  {
    icon: <Mic size={26} />,
    title: 'AI Cook Mode',
    desc: 'Hands-free voice guidance powered by Gemini Live. Ask questions, skip steps, and get real-time help — without touching your screen.',
  },
  {
    icon: <Search size={26} />,
    title: 'Smart Discovery',
    desc: 'Find recipes matched to your cuisine preferences. Search by dish, ingredient, or browse by cuisine — results that actually fit you.',
  },
  {
    icon: <Star size={26} />,
    title: 'Community Ratings',
    desc: 'Every recipe is rated by real home cooks. Know before you start whether a dish is worth your time.',
  },
  {
    icon: <Bookmark size={26} />,
    title: 'Your Digital Cookbook',
    desc: 'Save favorites and sort by rating, name, or cook time. Build a personal collection that\'s always one tap away.',
  },
  {
    icon: <ChefHat size={26} />,
    title: 'Step-by-Step Guidance',
    desc: 'Structured instructions with clear ingredient lists. Follow at your own pace with a layout designed for the kitchen.',
  },
  {
    icon: <Users size={26} />,
    title: 'Built for Everyone',
    desc: 'Quick weeknight dinners or ambitious weekend projects. Byte Your Fork adapts to however you cook.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Discover',
    desc: 'Browse a curated library of recipes or search by cuisine, ingredient, or dish name. Filter by what you love.',
  },
  {
    num: '02',
    title: 'Save & Sort',
    desc: 'Favorite the recipes you want to try. Sort your collection by rating, name, or cook time whenever you need it.',
  },
  {
    num: '03',
    title: 'Cook Hands-Free',
    desc: 'Launch Cook Mode and let AI walk you through every step by voice. No screen-touching. No losing your place.',
  },
];

const PERKS = [
  'No ads, ever',
  'AI-powered voice guidance',
  'Community-rated recipes',
  'Works on any device',
  'Instant search',
  'Free to get started',
];

const nav = {
  position: 'fixed', top: 0, left: 0, width: '100%', height: '68px',
  background: 'rgba(10, 10, 18, 0.82)', backdropFilter: 'blur(16px)',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  padding: '0 40px', display: 'flex', justifyContent: 'space-between',
  alignItems: 'center', boxSizing: 'border-box', zIndex: 1000,
};

export default function About({ onHome }) {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* ── Nav ── */}
      <nav style={nav}>
        <img src={logoImg} alt="Byte Your Fork" style={{ height: '2.6rem', cursor: 'pointer' }} onClick={onHome} />
        <button
          onClick={onHome}
          style={{
            background: '#3b82f6', color: 'white', border: 'none',
            padding: '8px 20px', borderRadius: '8px', cursor: 'pointer',
            fontWeight: '700', fontSize: '0.875rem', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          Get Started <ArrowRight size={15} />
        </button>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100vh',
        backgroundImage: `linear-gradient(to bottom, rgba(8,8,14,0.78), rgba(8,8,14,0.55), rgba(8,8,14,0.92)), url(${homeImg})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '100px 24px 80px', color: 'white',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: '100px', padding: '6px 16px', marginBottom: '28px',
          fontSize: '0.8rem', fontWeight: '700', color: '#93c5fd',
          letterSpacing: '0.5px', textTransform: 'uppercase',
        }}>
          <Mic size={13} /> AI-Powered Cooking Assistant
        </div>

        <h1 style={{
          fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: '800',
          margin: '0 0 20px', lineHeight: 1.05, letterSpacing: '-0.03em',
          maxWidth: '800px',
        }}>
          Cook Smarter.<br />Eat Better.
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'rgba(255,255,255,0.6)',
          maxWidth: '520px', lineHeight: 1.65, margin: '0 0 40px', fontWeight: 400,
        }}>
          Discover recipes you'll love, save your favorites, and cook hands-free with AI voice guidance — all in one place.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={onHome} style={{
            background: '#3b82f6', color: 'white', border: 'none',
            padding: '14px 32px', borderRadius: '10px', cursor: 'pointer',
            fontWeight: '700', fontSize: '1rem', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            Start Cooking Free <ArrowRight size={17} />
          </button>
          <button onClick={onHome} style={{
            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.18)',
            padding: '14px 32px', borderRadius: '10px', cursor: 'pointer',
            fontWeight: '600', fontSize: '1rem', fontFamily: 'inherit',
          }}>
            See Features ↓
          </button>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ background: '#f5f5f9', padding: '100px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p style={{ color: '#3b82f6', fontWeight: '700', fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 12px' }}>
              Everything You Need
            </p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: '800', color: '#0d0d14', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              A smarter way to cook
            </h2>
            <p style={{ color: '#6b6b80', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
              Every feature is built around the moment you're standing in the kitchen wondering what to make next.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: 'white', borderRadius: '16px', padding: '28px',
                border: '1px solid #e6e6ed',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.2s',
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '18px',
                }}>
                  {f.icon}
                </div>
                <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: '700', color: '#0d0d14' }}>{f.title}</h3>
                <p style={{ margin: 0, color: '#6b6b80', lineHeight: 1.65, fontSize: '0.9rem' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ background: '#111120', padding: '100px 24px', color: 'white' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p style={{ color: '#3b82f6', fontWeight: '700', fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 12px' }}>
              Simple by Design
            </p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: '800', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              From discovery to dinner in 3 steps
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {STEPS.map(s => (
              <div key={s.num} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', padding: '32px',
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#3b82f6', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
                  Step {s.num}
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 12px', letterSpacing: '-0.01em' }}>{s.title}</h3>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, fontSize: '0.9rem' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Spotlight ── */}
      <section style={{ background: '#f5f5f9', padding: '100px 24px' }}>
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          background: 'linear-gradient(135deg, #111120 0%, #131325 100%)',
          borderRadius: '24px', padding: '64px 56px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          border: '1px solid rgba(59,130,246,0.2)',
          boxShadow: '0 0 80px rgba(59,130,246,0.08)',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#93c5fd', marginBottom: '28px',
          }}>
            <Mic size={30} />
          </div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '800', color: 'white', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Cooking just became hands-free
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', maxWidth: '520px', lineHeight: 1.7, margin: '0 0 36px' }}>
            Cook Mode connects you to an AI assistant powered by Gemini Live. Ask it anything mid-recipe — ingredient substitutions, timing, techniques — and it responds in real time by voice.
          </p>
          <button onClick={onHome} style={{
            background: '#3b82f6', color: 'white', border: 'none',
            padding: '13px 28px', borderRadius: '10px', cursor: 'pointer',
            fontWeight: '700', fontSize: '0.95rem', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            Try Cook Mode Free <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ── Perks / Trust ── */}
      <section style={{ background: 'white', padding: '80px 24px', borderTop: '1px solid #e6e6ed', borderBottom: '1px solid #e6e6ed' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#6b6b80', fontSize: '0.9rem', fontWeight: '600', margin: '0 0 32px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            What you get with Byte Your Fork
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            {PERKS.map(p => (
              <div key={p} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#f5f5f9', borderRadius: '100px',
                padding: '10px 18px', fontSize: '0.875rem', fontWeight: '600', color: '#0d0d14',
              }}>
                <Check size={15} color="#3b82f6" strokeWidth={2.5} /> {p}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{
        background: '#111120', padding: '100px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: '800', color: 'white', margin: '0 0 16px', letterSpacing: '-0.03em', maxWidth: '600px' }}>
          Ready to cook smarter?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.05rem', margin: '0 0 40px', maxWidth: '400px', lineHeight: 1.6 }}>
          Join Byte Your Fork and turn every meal into something you're proud of.
        </p>
        <button onClick={onHome} style={{
          background: '#3b82f6', color: 'white', border: 'none',
          padding: '16px 40px', borderRadius: '10px', cursor: 'pointer',
          fontWeight: '800', fontSize: '1.1rem', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: '10px',
          letterSpacing: '-0.01em',
        }}>
          Get Started — It's Free <ArrowRight size={18} />
        </button>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', margin: '16px 0 0' }}>No credit card required.</p>
      </section>

    </div>
  );
}
