import React, { useState } from 'react';
import axios from 'axios';
import logoImg from '../Images/souschef_logo.png';
import homeImg from '../Images/HomePageImage.png';

function Auth({ setToken, initialTab, onHome, onAbout }) {
  const [isLogin, setIsLogin] = useState(initialTab !== 'signup');
  const [formData, setFormData] = useState({
    first_name: '',
    surname: '',
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

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
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token, { email: formData.email, username: formData.username });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
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
                  placeholder="Username" 
                  value={formData.username}
                  onChange={handleChange} 
                  required 
                />
              </>
            )}
            <input 
              type="email" 
              name="email" 
              placeholder="Email" 
              value={formData.email}
              onChange={handleChange} 
              required 
            />
            <input 
              type="password" 
              name="password" 
              placeholder="Password" 
              value={formData.password}
              onChange={handleChange} 
              required 
            />
            
            <button type="submit" className="primary-button" style={{ backgroundColor: '#6366f1' }}>
              {isLogin ? 'Log In' : 'Sign Up'}
            </button>
          </form>

          <p className="toggle-text">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => setIsLogin(!isLogin)} className="toggle-link" style={{ color: '#6366f1' }}>
              {isLogin ? 'Sign up here.' : 'Log in here.'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Auth;
