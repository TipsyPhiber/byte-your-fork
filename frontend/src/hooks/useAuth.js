import { useState, useEffect, useCallback, useRef } from 'react';
import { isSessionKeptAlive } from '../utils/session';
import { showToast } from '../utils/toast';

const INACTIVITY_MS = 15 * 60 * 1000;

export function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback((t) => {
    localStorage.setItem('token', t);
    setToken(t);
  }, []);

  // Any API call that fails with an expired/invalid token (see api.js) ends
  // the session in one place, with an explanation instead of silent failures.
  useEffect(() => {
    if (!token) return;
    const onExpired = () => {
      logout();
      showToast({ kind: 'error', message: 'Session expired — please log in again.' });
    };
    window.addEventListener('byf:session-expired', onExpired);
    return () => window.removeEventListener('byf:session-expired', onExpired);
  }, [token, logout]);

  const inactivityTimer = useRef(null);
  useEffect(() => {
    if (!token) return;
    const arm = () => {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        // Hands-free Cook Mode produces no touch events — don't log the user
        // out mid-recipe; restart the window instead.
        if (isSessionKeptAlive()) { arm(); return; }
        logout();
      }, INACTIVITY_MS);
    };
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(ev => document.addEventListener(ev, arm, { passive: true }));
    arm();
    return () => {
      events.forEach(ev => document.removeEventListener(ev, arm));
      clearTimeout(inactivityTimer.current);
    };
  }, [token, logout]);

  return { token, user, setUser, login, logout };
}
