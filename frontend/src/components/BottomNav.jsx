import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Bookmark, Bell, Plus, Settings as SettingsIcon, LogOut, ShoppingCart, ChefHat } from 'lucide-react';

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
    // touchstart too — mousedown alone is unreliable in mobile webviews
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [menuOpen]);

  const go = (to) => { navigate(to); setMenuOpen(false); };
  const isActive = (path) => pathname === path;

  return (
    <nav className="bottom-nav">
      <button className={`bottom-nav-item ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => go('/dashboard')} aria-label="Home">
        <Home size={22} strokeWidth={isActive('/dashboard') ? 2.4 : 2} />
        <span>Home</span>
      </button>

      <button className={`bottom-nav-item ${isActive('/explore') ? 'active' : ''}`} onClick={() => go('/explore')} aria-label="Explore">
        <Search size={22} strokeWidth={isActive('/explore') ? 2.4 : 2} />
        <span>Explore</span>
      </button>

      <button className={`bottom-nav-item ${isActive('/assistant') ? 'active' : ''}`} onClick={() => go('/assistant')} aria-label="Kitchen assistant">
        <ChefHat size={22} strokeWidth={isActive('/assistant') ? 2.4 : 2} />
        <span>Chef</span>
      </button>

      <button className={`bottom-nav-item ${isActive('/favorites') ? 'active' : ''}`} onClick={() => go('/favorites')} aria-label="Saved recipes">
        <Bookmark size={22} strokeWidth={isActive('/favorites') ? 2.4 : 2} />
        <span>Saved</span>
      </button>

      <button className={`bottom-nav-item ${isActive('/shopping-list') ? 'active' : ''}`} onClick={() => go('/shopping-list')} aria-label="Shopping list">
        <ShoppingCart size={22} strokeWidth={isActive('/shopping-list') ? 2.4 : 2} />
        <span>List</span>
      </button>

      <button className={`bottom-nav-item ${isActive('/notifications') ? 'active' : ''}`} onClick={() => go('/notifications')} aria-label="Notifications">
        <Bell size={22} strokeWidth={isActive('/notifications') ? 2.4 : 2} />
        {notifCount > 0 && <span className="notif-badge">{notifCount > 9 ? '9+' : notifCount}</span>}
        <span>Updates</span>
      </button>

      {isAdmin && (
        <button className={`bottom-nav-item ${isActive('/add-recipe') ? 'active' : ''}`} onClick={() => go('/add-recipe')} aria-label="Add recipe">
          <Plus size={22} strokeWidth={isActive('/add-recipe') ? 2.4 : 2} />
          <span>Add</span>
        </button>
      )}

      {/* Profile / user menu */}
      <div className="bottom-nav-profile" ref={menuRef}>
        <button
          className={`bottom-nav-item ${isActive('/settings') ? 'active' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Profile menu"
          aria-expanded={menuOpen}
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
              <SettingsIcon size={16} /> Settings
            </button>
            <button className="signout-btn" onClick={() => { onLogout(); setMenuOpen(false); }}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
