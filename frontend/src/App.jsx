import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import Auth from './Auth';
import LandingPage from './LandingPage';
import About from './About';
import Settings from './Settings';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [view, setView] = useState(() => {
    const savedToken = localStorage.getItem('token');
    return savedToken ? 'dashboard' : 'landing';
  });
  const [recipes, setRecipes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setView('landing');
  }, []);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    async function fetchData() {
      try {
        const [profileRes, recipesRes] = await Promise.all([
          axios.get('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5000/api/recipes')
        ]);

        if (isMounted) {
          setUser(profileRes.data);
          setRecipes(recipesRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        if (isMounted && (err.response?.status === 401 || err.response?.status === 403)) {
          handleLogout();
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [token, handleLogout]);

  const fetchRecipeDetails = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/recipes/${id}`);
      setSelectedRecipe(res.data);
    } catch (err) {
      console.error('Failed to fetch recipe details:', err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.get(`http://localhost:5000/api/search?query=${searchQuery}`);
      setRecipes(res.data);
      setSelectedRecipe(null);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleAuthSuccess = (t, userData) => {
    localStorage.setItem('token', t);
    setToken(t);
    if (userData) setUser(userData);
    setView('dashboard');
  };

  const isAdmin = user?.role === 'admin';

  if (!token) {
    if (view === 'login') {
      return <Auth setToken={handleAuthSuccess} initialTab="login" onHome={() => setView('landing')} onAbout={() => setView('about')} />;
    }
    if (view === 'signup') {
      return <Auth setToken={handleAuthSuccess} initialTab="signup" onHome={() => setView('landing')} onAbout={() => setView('about')} />;
    }
    if (view === 'about') {
      return <About onHome={() => setView('landing')} />;
    }
    return (
      <LandingPage 
        onLogin={() => setView('login')} 
        onSignUp={() => setView('signup')} 
        onHome={() => setView('landing')}
        onAbout={() => setView('about')}
      />
    );
  }

  const renderContent = () => {
    if (selectedRecipe) {
      return (
        <section className="recipe-details">
          <button className="primary-button" style={{ marginBottom: '20px' }} onClick={() => setSelectedRecipe(null)}>
            ← Back to Recipes
          </button>
          <h2 style={{ color: 'var(--dark-blue)', marginTop: '0' }}>{selectedRecipe.title}</h2>
          <p><strong>Time to cook:</strong> {selectedRecipe.ttc} mins</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px' }}>
            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
              <h3 style={{ color: 'var(--primary-blue)', marginTop: 0 }}>Ingredients</h3>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                {selectedRecipe.ingredients?.map((ing, idx) => (
                  <li key={idx}>{ing.amount} {ing.name}</li>
                ))}
              </ul>
            </div>
            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
              <h3 style={{ color: 'var(--primary-blue)', marginTop: 0 }}>Steps</h3>
              <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                {selectedRecipe.steps?.map((step, idx) => (
                  <li key={idx} style={{ marginBottom: '12px' }}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      );
    }

    switch (view) {
      case 'explore':
        return <div style={{ textAlign: 'center', padding: '50px' }}><h2>Explore</h2><p>Coming soon: Discover trending and recommended recipes!</p></div>;
      case 'notifications':
        return <div style={{ textAlign: 'center', padding: '50px' }}><h2>Notifications</h2><p>You're all caught up!</p></div>;
      case 'settings':
        return <Settings user={user} setUser={setUser} token={token} />;
      default:
        return (
          <section className="recipe-grid">
            {recipes.length > 0 ? (
              recipes.map((recipe) => (
                <div key={recipe.id} className="recipe-card">
                  <h3>{recipe.title}</h3>
                  <p style={{ color: 'var(--text-light)', marginBottom: '20px' }}>Time: {recipe.ttc} mins</p>
                  <button className="primary-button" onClick={() => fetchRecipeDetails(recipe.id)}>View Details</button>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-light)', marginTop: '50px' }}>No recipes found. Try searching for something else!</p>
            )}
          </section>
        );
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 style={{ cursor: 'pointer' }} onClick={() => { setView('dashboard'); setSelectedRecipe(null); }}>BYTE YOUR FORK</h1>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-button ${view === 'dashboard' && !selectedRecipe ? 'active' : ''}`} onClick={() => { setView('dashboard'); setSelectedRecipe(null); }}>Home</button>
          <button className={`nav-button ${view === 'explore' ? 'active' : ''}`} onClick={() => { setView('explore'); setSelectedRecipe(null); }}>Explore</button>
          <button className={`nav-button ${view === 'notifications' ? 'active' : ''}`} onClick={() => { setView('notifications'); setSelectedRecipe(null); }}>Notifications</button>
          <button className="nav-button">My Recipes</button>
          {isAdmin && <button className="nav-button">Add Recipe</button>}
          <button className="nav-button logout-button" onClick={handleLogout}>Logout</button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="header-bar">
          <div className="search-container">
            {view === 'dashboard' && !selectedRecipe && (
              <form onSubmit={handleSearch}>
                <input 
                  type="text" 
                  className="search-bar" 
                  placeholder="Search recipes..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            )}
          </div>
          <div className="header-actions">
            <button className="primary-button" onClick={() => setView('settings')}>Account</button>
          </div>
        </header>

        <div className="content-area">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
