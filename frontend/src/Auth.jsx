import React, { useState } from 'react';
import axios from 'axios';
import logoImg from '../Images/souschef_logo.png';
import homeImg from '../Images/HomePageImage.png';

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
  const [formData, setFormData] = useState({
    first_name: '',
    surname: '',
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyError('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/verify-email', { userId: pendingUserId, code: verifyCode });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token, {});
    } catch (err) {
      setVerifyError(err.response?.data?.error || 'Invalid code. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    setResendStatus('');
    try {
      await axios.post('http://localhost:5000/api/auth/resend-verification', { userId: pendingUserId });
      setResendStatus('New code sent!');
    } catch {
      setResendStatus('Failed to resend. Please try again.');
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotStatus('');
    try {
      await axios.post('http://localhost:5000/api/auth/forgot-password', { email: forgotEmail });
      setForgotStatus('Check your email — a reset link has been sent.');
    } catch {
      setForgotStatus('Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        const res = await axios.post('http://localhost:5000/api/auth/login', {
          email: formData.email,
          password: formData.password
        });
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token, res.data.user || { email: formData.email });
      } else {
        const res = await axios.post('http://localhost:5000/api/auth/signup', {
          first_name: formData.first_name,
          surname: formData.surname,
          username: formData.username,
          email: formData.email,
          password: formData.password
        });
        setPendingUserId(res.data.userId);
        setShowVerify(true);
      }
    } catch (err) {
      // If login attempted but email not verified, take them to verify screen
      if (err.response?.data?.unverified) {
        setPendingUserId(err.response.data.userId);
        setShowVerify(true);
      } else {
        setError(err.response?.data?.error || 'An error occurred. Please try again.');
      }
    }
  };

  const navStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '4rem',
    backgroundColor: '#38bdf8',
    padding: '0 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxSizing: 'border-box',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
    zIndex: 1000
  };

  const buttonStyle = {
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'background 0.3s'
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <nav style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={logoImg} 
            alt="Sous Chef Logo" 
            style={{ height: '3.5rem', cursor: 'pointer' }} 
            onClick={onHome}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={buttonStyle} onClick={onAbout}>About</button>
          <button style={buttonStyle} onClick={onHome}>Back</button>
        </div>
      </nav>

      <div style={{ 
        flex: 1, 
        backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.5)), url(${homeImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }} className="auth-image-side">
      </div>

      <div style={{ 
        flex: 1, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingTop: '4rem'
      }}>
        <div className="auth-card" style={{ boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          {showVerify ? (
            <>
              <h2>Check Your Email</h2>
              <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.9rem', margin: '0 0 20px' }}>
                We sent a 6-digit code to your email. Enter it below to verify your account.
              </p>
              {verifyError && <p className="error-message">{verifyError}</p>}
              <form onSubmit={handleVerifySubmit} className="auth-form">
                <input
                  type="text"
                  placeholder="000000"
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: '1.8rem', letterSpacing: '10px', fontWeight: '700' }}
                  required
                />
                <button type="submit" className="primary-button" style={{ backgroundColor: '#6366f1' }} disabled={verifyLoading || verifyCode.length !== 6}>
                  {verifyLoading ? 'Verifying...' : 'Verify Email'}
                </button>
              </form>
              <p className="toggle-text" style={{ marginTop: '16px' }}>
                Didn't get it?{' '}
                <span onClick={handleResend} className="toggle-link" style={{ color: '#6366f1' }}>Resend code</span>
              </p>
              {resendStatus && <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#16a34a', marginTop: '8px' }}>{resendStatus}</p>}
            </>
          ) : showForgot ? (
            <>
              <h2>Forgot Password</h2>
              {forgotStatus ? (
                <p style={{ textAlign: 'center', color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', fontSize: '0.9rem' }}>{forgotStatus}</p>
              ) : (
                <form onSubmit={handleForgotSubmit} className="auth-form">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                  />
                  <button type="submit" className="primary-button" style={{ backgroundColor: '#6366f1' }} disabled={forgotLoading}>
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}
              <p className="toggle-text" style={{ marginTop: '16px' }}>
                <span onClick={() => { setShowForgot(false); setForgotStatus(''); setForgotEmail(''); }} className="toggle-link" style={{ color: '#6366f1' }}>
                  ← Back to login
                </span>
              </p>
            </>
          ) : (
            <>
              <h2>{isLogin ? 'Welcome Back' : 'Join Byte Your Fork'}</h2>
              {error && <p className="error-message">{error}</p>}

              <form onSubmit={handleSubmit} className="auth-form">
                {!isLogin && (
                  <>
                    <input
                      type="text"
                      name="first_name"
                      placeholder="First Name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                    />
                    <input
                      type="text"
                      name="surname"
                      placeholder="Last Name"
                      value={formData.surname}
                      onChange={handleChange}
                      required
                    />
                    <input
                      type="text"
                      name="username"
                      placeholder="Username (max 15 characters)"
                      maxLength={15}
                      value={formData.username}
                      onChange={handleChange}
                      required
                    />
                  </>
                )}
                <input
                  type="text"
                  name="email"
                  placeholder={isLogin ? "Email or Username" : "Email"}
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password (max 15 characters)"
                  maxLength={15}
                  value={formData.password}
                  onChange={handleChange}
                  required
                />

                <button type="submit" className="primary-button" style={{ backgroundColor: '#6366f1' }}>
                  {isLogin ? 'Log In' : 'Sign Up'}
                </button>
              </form>

              {isLogin && (
                <p style={{ textAlign: 'center', margin: '12px 0 4px' }}>
                  <span onClick={() => setShowForgot(true)} className="toggle-link" style={{ color: '#6366f1', fontSize: '0.9rem' }}>
                    Forgot your password?
                  </span>
                </p>
              )}

              <p className="toggle-text">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <span onClick={() => { setIsLogin(!isLogin); setError(''); }} className="toggle-link" style={{ color: '#6366f1' }}>
                  {isLogin ? 'Sign up here.' : 'Log in here.'}
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;
