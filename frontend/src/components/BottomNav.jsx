import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Bookmark, Bell, Plus, Settings as SettingsIcon, LogOut } from 'lucide-react';

export default function BottomNav({ user, isAdmin, notifCount, onLogout }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const go = (to) => { navigate(to); setMenuOpen(false); };
  const isActive = (path) => pathname === path;

  return (
    <nav className="bottom-nav">
      <button className={`bottom-nav-item ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => go('/dashboard')}>
        <Home size={21} />
        <span>Home</span>
      </button>

      <button className={`bottom-nav-item ${isActive('/explore') ? 'active' : ''}`} onClick={() => go('/explore')}>
        <Search size={21} />
        <span>Explore</span>
      </button>

      <button className={`bottom-nav-item ${isActive('/favorites') ? 'active' : ''}`} onClick={() => go('/favorites')}>
        <Bookmark size={21} />
        <span>Saved</span>
      </button>

      <button className={`bottom-nav-item ${isActive('/notifications') ? 'active' : ''}`} onClick={() => go('/notifications')} style={{ position: 'relative' }}>
        <Bell size={21} />
        {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
        <span>Updates</span>
      </button>

      {isAdmin && (
        <button className={`bottom-nav-item ${isActive('/add-recipe') ? 'active' : ''}`} onClick={() => go('/add-recipe')}>
          <Plus size={21} />
          <span>Add</span>
        </button>
      )}

      {/* Profile / user menu */}
      <div className="bottom-nav-profile" ref={menuRef}>
        <button
          className={`bottom-nav-item ${isActive('/settings') ? 'active' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
        >
          <div className="bottom-nav-avatar">
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="avatar" />
              : <span>{user?.first_name?.[0]?.toUpperCase() || '?'}</span>
            }
          </div>
          <span>Profile</span>
        </button>

        {menuOpen && (
          <div className="bottom-nav-dropdown">
            <div className="bottom-nav-dropdown-header">
              <span style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '0.9rem' }}>
                {user?.first_name} {user?.last_name}
              </span>
              <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: '0.78rem' }}>
                @{user?.username}
              </span>
            </div>
            <button onClick={() => go('/settings')}>
              <SettingsIcon size={15} /> Settings
            </button>
            <button className="signout-btn" onClick={() => { onLogout(); setMenuOpen(false); }}>
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
