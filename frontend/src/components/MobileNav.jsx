import React from 'react';
import logoImg from '../../Images/souschef_logo.png';

export default function MobileNav({ isOpen, onClose, view, onNavigate, onHome, user, isAdmin, notifCount, onLogout }) {
  if (!isOpen) return null;

  return (
    <div className="mobile-nav-overlay" onClick={onClose}>
      <div className="mobile-nav-drawer" onClick={e => e.stopPropagation()}>
        <img src={logoImg} className="mobile-nav-logo" onClick={() => { onHome(); onClose(); }} alt="Logo" />

        <div className="mobile-nav-user">
          <div className="mobile-nav-avatar">
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span>{user?.first_name?.[0]?.toUpperCase() || '?'}</span>}
          </div>
          <span>{user?.first_name} {user?.last_name}</span>
        </div>

        <nav className="mobile-nav-links">
          <button className={`mobile-nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => { onHome(); onClose(); }}>🏠 <span>Home</span></button>
          <button className={`mobile-nav-item ${view === 'explore' ? 'active' : ''}`} onClick={() => onNavigate('explore')}>🔍 <span>Explore</span></button>
          <button className={`mobile-nav-item ${view === 'favorites' ? 'active' : ''}`} onClick={() => onNavigate('favorites')}>❤️ <span>Favorites</span></button>
          <button className={`mobile-nav-item ${view === 'notifications' ? 'active' : ''}`} onClick={() => onNavigate('notifications')}>
            🔔 <span>Notifications</span>
            {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
          </button>
          {isAdmin && (
            <button className={`mobile-nav-item ${view === 'add-recipe' ? 'active' : ''}`} onClick={() => onNavigate('add-recipe')}>➕ <span>Add Recipe</span></button>
          )}
          <button className={`mobile-nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => onNavigate('settings')}>⚙️ <span>Settings</span></button>
          <button className="mobile-nav-item mobile-nav-logout" onClick={onLogout}>🚪 <span>Logout</span></button>
        </nav>
      </div>
    </div>
  );
}
