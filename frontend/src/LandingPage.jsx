import React from 'react';
import homeImg from '../Images/HomePageImage.png';
import logoImg from '../Images/souschef_logo.png';

const LandingPage = ({ onLogin, onSignUp, onHome, onAbout }) => {
  const containerStyle = {
    height: '100vh',
    width: '100%',
    backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.3), rgba(0, 0, 0, 0.8)), url(${homeImg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    position: 'relative'
  };

  const navStyle = {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: '4rem',
    backgroundColor: '#38bdf8',
    padding: '0 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxSizing: 'border-box',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
  };

  const buttonStyle = {
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontWeight: '600',
    marginLeft: '10px',
    transition: 'background 0.3s'
  };

  return (
    <div style={containerStyle}>
      <nav style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={logoImg} 
            alt="Sous Chef Logo" 
            style={{ height: '3.5rem', cursor: 'pointer' }} 
            onClick={onHome}
          />
        </div>
        <div>
          <button style={buttonStyle} onClick={onAbout}>About</button>
          <button style={buttonStyle} onClick={onLogin}>Login</button>
          <button style={buttonStyle} onClick={onSignUp}>Sign Up</button>
        </div>
      </nav>

      <h1 style={{ 
        fontSize: '4.5rem', 
        fontWeight: '700', 
        textAlign: 'center',
        fontFamily: "'Inter', sans-serif",
        margin: 0,
        textShadow: '0 4px 15px rgba(0,0,0,0.6)'
      }}>
        Welcome To Byte Your Fork!
      </h1>
    </div>
  );
};

export default LandingPage;
