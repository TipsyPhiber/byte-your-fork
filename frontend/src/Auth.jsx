import React, { useState } from 'react';
import { api } from './api';
import logoImg from '../Images/souschef_logo.png';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

function Auth({ setToken, initialTab, onHome, onAbout }) {
  const [isLogin, setIsLogin] = useState(initialTab !== 'signup');
  const [showForgot, setShowForgot] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', surname: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setVerifyLoading(true); setVerifyError('');
    try {
      const res = await api.post('/auth/verify-email', { userId: pendingUserId, code: verifyCode });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token, {});
    } catch (err) {
      setVerifyError(err.response?.data?.error || 'Invalid code. Please try again.');
    } finally { setVerifyLoading(false); }
  };

  const handleResend = async () => {
    setResendStatus('');
    try {
      await api.post('/auth/resend-verification', { userId: pendingUserId });
      setResendStatus('New code sent!');
    } catch { setResendStatus('Failed to resend. Please try again.'); }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true); setForgotStatus('');
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotStatus('Check your email — a reset link has been sent.');
    } catch { setForgotStatus('Something went wrong. Please try again.'); }
    finally { setForgotLoading(false); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (submitting) return;
    setSubmitting(true);
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email: formData.email, password: formData.password });
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token, res.data.user || { email: formData.email });
      } else {
        const res = await api.post('/auth/signup', {
          first_name: formData.first_name, surname: formData.surname,
          username: formData.username, email: formData.email, password: formData.password,
        });
        setPendingUserId(res.data.userId);
        setShowVerify(true);
      }
    } catch (err) {
      if (err.response?.data?.unverified) { setPendingUserId(err.response.data.userId); setShowVerify(true); }
      else setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{
      minHeight: '100dvh', width: '100%',
      background: 'linear-gradient(135deg, #0f0f1c 0%, #13131f 50%, #0f0f1a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 'calc(84px + env(safe-area-inset-top)) 20px calc(40px + env(safe-area-inset-bottom))', position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Animated blobs */}
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', top: -300, left: -250, filter: 'blur(100px)', animation: 'blob1 32s ease-in-out infinite', willChange: 'transform' }} />
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'rgba(139,92,246,0.10)', bottom: -250, right: -200, filter: 'blur(100px)', animation: 'blob2 42s ease-in-out infinite', willChange: 'transform' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(6,182,212,0.08)', top: '50%', left: '60%', filter: 'blur(80px)', animation: 'blob3 26s ease-in-out infinite', willChange: 'transform' }} />

      {/* Top bar */}
      <nav className="preauth-nav">
        <img src={logoImg} alt="Byte Your Fork" className="preauth-logo" onClick={onHome} />
        <div className="preauth-nav-actions">
          <button className="glass-btn" onClick={onHome}>
            <ArrowLeft size={14} /> Back
          </button>
          <button className="glass-btn" onClick={onAbout}>About</button>
        </div>
      </nav>

      {/* Card */}
      <div className="auth-light-card" style={{
        background: 'rgba(255,255,255,0.97)',
        borderRadius: '20px', padding: '36px 28px',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.15)',
        position: 'relative', zIndex: 1,
        backdropFilter: 'blur(20px)',
      }}>
        {showVerify ? (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.6rem', fontWeight: 800, color: '#0f0f14', textAlign: 'center' }}>Check Your Email</h2>
            <p style={{ textAlign: 'center', color: '#6b6b80', fontSize: '0.875rem', margin: '0 0 24px', lineHeight: 1.55 }}>
              We sent a 6-digit code to your email. Enter it below to verify your account.
            </p>
            {verifyError && <p className="error-message">{verifyError}</p>}
            <form onSubmit={handleVerifySubmit} className="auth-form">
              <input
                type="text" placeholder="0  0  0  0  0  0"
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                style={{ textAlign: 'center', fontSize: '1.6rem', letterSpacing: '12px', fontWeight: 700 }}
                required
              />
              <button type="submit" className="primary-button" disabled={verifyLoading || verifyCode.length !== 6} style={{ justifyContent: 'center' }}>
                {verifyLoading ? 'Verifying…' : 'Verify Email'}
              </button>
            </form>
            <p className="toggle-text" style={{ marginTop: '16px' }}>
              Didn't get it? <span onClick={handleResend} className="toggle-link">Resend code</span>
            </p>
            {resendStatus && <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#16a34a', marginTop: '8px' }}>{resendStatus}</p>}
          </>
        ) : showForgot ? (
          <>
            <h2 style={{ margin: '0 0 24px', fontSize: '1.6rem', fontWeight: 800, color: '#0f0f14', textAlign: 'center' }}>Forgot Password</h2>
            {forgotStatus ? (
              <p style={{ textAlign: 'center', color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', fontSize: '0.875rem', lineHeight: 1.5 }}>{forgotStatus}</p>
            ) : (
              <form onSubmit={handleForgotSubmit} className="auth-form">
                <input type="email" inputMode="email" autoComplete="email" placeholder="Enter your email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                <button type="submit" className="primary-button" disabled={forgotLoading} style={{ justifyContent: 'center' }}>
                  {forgotLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            )}
            <p className="toggle-text" style={{ marginTop: '16px' }}>
              <span onClick={() => { setShowForgot(false); setForgotStatus(''); setForgotEmail(''); }} className="toggle-link">← Back to login</span>
            </p>
          </>
        ) : (
          <>
            <h2 style={{ margin: '0 0 24px', fontSize: '1.6rem', fontWeight: 800, color: '#0f0f14', textAlign: 'center' }}>
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" name="first_name" placeholder="First name" autoComplete="given-name" value={formData.first_name} onChange={handleChange} required style={{ flex: 1, minWidth: 0 }} />
                    <input type="text" name="surname" placeholder="Last name" autoComplete="family-name" value={formData.surname} onChange={handleChange} required style={{ flex: 1, minWidth: 0 }} />
                  </div>
                  <input type="text" name="username" placeholder="Username" maxLength={15} autoComplete="username" autoCapitalize="none" value={formData.username} onChange={handleChange} required />
                </>
              )}
              <input
                type={isLogin ? 'text' : 'email'}
                name="email"
                placeholder={isLogin ? 'Email or username' : 'Email'}
                autoComplete={isLogin ? 'username' : 'email'}
                autoCapitalize="none"
                inputMode={isLogin ? undefined : 'email'}
                value={formData.email}
                onChange={handleChange}
                required
              />
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password"
                  maxLength={15}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  style={{ paddingRight: 52 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9898ac',
                    width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button type="submit" className="primary-button" disabled={submitting} style={{ justifyContent: 'center' }}>
                {submitting ? (isLogin ? 'Logging in…' : 'Signing up…') : (isLogin ? 'Log In' : 'Sign Up')}
              </button>
            </form>
            {isLogin && (
              <p style={{ textAlign: 'center', margin: '12px 0 4px' }}>
                <span onClick={() => setShowForgot(true)} className="toggle-link" style={{ fontSize: '0.85rem' }}>Forgot your password?</span>
              </p>
            )}
            <p className="toggle-text" style={{ marginTop: '8px' }}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span onClick={() => { setIsLogin(!isLogin); setError(''); }} className="toggle-link">
                {isLogin ? 'Sign up' : 'Log in'}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Auth;
