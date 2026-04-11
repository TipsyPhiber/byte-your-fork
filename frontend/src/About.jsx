import React from 'react';
import logoImg from '../Images/souschef_logo.png';

const About = ({ onHome }) => {
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
    <div style={{ 
      height: '100vh', 
      width: '100vw',
      backgroundColor: '#f3f4f6', 
      paddingTop: '5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
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
          <button style={buttonStyle} onClick={onHome}>Back</button>
        </div>
      </nav>

      <div style={{ 
        maxWidth: '1000px', 
        width: '90%',
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 7rem)'
      }}>
        <h1 style={{ color: '#1e40af', marginBottom: '15px', textAlign: 'center', marginTop: 0 }}>About Byte Your Fork</h1>
        
        <p style={{ fontSize: '1.05rem', lineHeight: '1.5', color: '#374151', marginBottom: '20px', textAlign: 'center' }}>
          Welcome to <strong>Byte Your Fork</strong>, your ultimate companion in the kitchen! We believe that cooking should be accessible, interactive, and fun for everyone.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', flex: 1, overflow: 'hidden' }}>
          <div>
            <h2 style={{ color: '#1e40af', marginTop: 0, fontSize: '1.3rem' }}>Our Mission</h2>
            <p style={{ fontSize: '1rem', lineHeight: '1.5', color: '#374151', marginBottom: '15px' }}>
              Byte Your Fork is designed to transform your culinary experience. Our platform allows you to browse recipes, search for dishes, and contribute your own culinary masterpieces to the community.
            </p>
            
            <h2 style={{ color: '#1e40af', marginTop: '15px', fontSize: '1.3rem' }}>Voice Interaction</h2>
            <p style={{ fontSize: '1rem', lineHeight: '1.5', color: '#374151' }}>
              Our <strong>Cook Mode</strong> uses the Gemini Live API to provide a hands-free experience, allowing you to focus on your cooking while receiving voice-guided assistance.
            </p>
          </div>

          <div>
            <h2 style={{ color: '#1e40af', marginTop: 0, fontSize: '1.3rem' }}>Key Features</h2>
            <ul style={{ fontSize: '1rem', lineHeight: '1.6', color: '#374151', margin: 0 }}>
              <li><strong>Smart Search:</strong> Powerful recipe discovery.</li>
              <li><strong>Interactive Cooking:</strong> Step-by-step guidance.</li>
              <li><strong>Fork Your Favorites:</strong> Build your digital cookbook.</li>
              <li><strong>Community Driven:</strong> Rate and help others.</li>
              <li><strong>AI Powered:</strong> Hands-free voice commands.</li>
            </ul>

            <div style={{ textAlign: 'center', marginTop: '25px' }}>
              <button style={{ ...buttonStyle, padding: '12px 30px', fontSize: '1.1rem' }} onClick={onHome}>
                Get Started Today
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
