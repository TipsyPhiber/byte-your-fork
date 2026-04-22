import React from 'react';
import logoImg from '../../Images/souschef_logo.png';
import { Home, Search, Bookmark, Bell, Plus, Settings as SettingsIcon, LogOut } from 'lucide-react';

export default function Sidebar({ view, onNavigate, onHome, user, isAdmin, notifCount, onLogout }) {
  return (
    <aside className="sidebar">
      <img src={logoImg} className="sidebar-logo" onClick={onHome} alt="Logo" />

      <div
        className="sidebar-avatar-wrap"
        onClick={() => onNavigate('settings')}
        title={user?.username}
      >
        {user?.avatar_url
          ? <img src={user.avatar_url} alt="avatar" />
          : <div className="sidebar-avatar-placeholder">
              {user?.first_name?.[0]?.toUpperCase() || '?'}
            </div>
        }
      </div>

      <nav className="sidebar-nav">
        <button className={`nav-icon-button ${view === 'dashboard' ? 'active' : ''}`} onClick={onHome} title="Home">
          <Home size={20} />
        </button>
        <button className={`nav-icon-button ${view === 'explore' ? 'active' : ''}`} onClick={() => onNavigate('explore')} title="Explore">
          <Search size={20} />
        </button>
        <button className={`nav-icon-button ${view === 'favorites' ? 'active' : ''}`} onClick={() => onNavigate('favorites')} title="Favorites">
          <Bookmark size={20} />
        </button>
        <button className={`nav-icon-button ${view === 'notifications' ? 'active' : ''}`} onClick={() => onNavigate('notifications')} title="Notifications" style={{ position: 'relative' }}>
          <Bell size={20} />
          {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
        </button>
        {isAdmin && (
          <button className={`nav-icon-button ${view === 'add-recipe' ? 'active' : ''}`} onClick={() => onNavigate('add-recipe')} title="Add Recipe">
            <Plus size={20} />
          </button>
        )}
      </nav>

      <div className="sidebar-bottom">
        <button className={`nav-icon-button ${view === 'settings' ? 'active' : ''}`} onClick={() => onNavigate('settings')} title="Settings">
          <SettingsIcon size={20} />
        </button>
        <button className="nav-icon-button" onClick={onLogout} title="Sign Out">
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
}
