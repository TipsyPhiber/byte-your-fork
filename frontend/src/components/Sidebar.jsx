import React from 'react';
import logoImg from '../../Images/souschef_logo.png';

export default function Sidebar({ view, onNavigate, onHome, user, isAdmin, notifCount, onLogout }) {
  return (
    <aside className="sidebar">
      <img src={logoImg} className="sidebar-logo" onClick={onHome} alt="Logo" />

      <div
        className="sidebar-avatar"
        onClick={() => onNavigate('settings')}
        title={user?.username}
        style={{ cursor: 'pointer', margin: '0 auto 8px', width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary-blue)', flexShrink: 0 }}
      >
        {user?.avatar_url
          ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
              {user?.first_name?.[0]?.toUpperCase() || '?'}
            </div>
        }
      </div>

      <nav className="sidebar-nav">
        <button className={`nav-icon-button ${view === 'dashboard' ? 'active' : ''}`} onClick={onHome} title="Home">🏠</button>
        <button className={`nav-icon-button ${view === 'explore' ? 'active' : ''}`} onClick={() => onNavigate('explore')} title="Explore">🔍</button>
        <button className={`nav-icon-button ${view === 'favorites' ? 'active' : ''}`} onClick={() => onNavigate('favorites')} title="Favorites">🍴</button>
        <button className={`nav-icon-button ${view === 'notifications' ? 'active' : ''}`} onClick={() => onNavigate('notifications')} title="Notifications" style={{ position: 'relative' }}>
          🔔
          {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
        </button>
        {isAdmin && (
          <button className={`nav-icon-button ${view === 'add-recipe' ? 'active' : ''}`} onClick={() => onNavigate('add-recipe')} title="Add Recipe">➕</button>
        )}
        <button className={`nav-icon-button ${view === 'settings' ? 'active' : ''}`} onClick={() => onNavigate('settings')} title="Settings">⚙️</button>
        <button className="nav-icon-button" onClick={onLogout} title="Logout">🚪</button>
      </nav>
    </aside>
  );
}
