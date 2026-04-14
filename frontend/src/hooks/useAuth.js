import { useState, useEffect, useCallback, useRef } from 'react';

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

  const inactivityTimer = useRef(null);
  useEffect(() => {
    if (!token) return;
    const reset = () => {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(logout, 15 * 60 * 1000);
    };
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(ev => document.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => {
      events.forEach(ev => document.removeEventListener(ev, reset));
      clearTimeout(inactivityTimer.current);
    };
  }, [token, logout]);

  return { token, user, setUser, login, logout };
}
