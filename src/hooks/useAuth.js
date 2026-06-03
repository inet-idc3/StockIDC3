// ─────────────────────────────────────────────────────────────
// useAuth.js — Portal-level auth state + GAS sync
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  syncAuthCache, verifyCredentials,
  saveSession, readSession, clearSession,
  loadAuthCache,
} from '../services/authService.js';

const GAS_URL = import.meta.env.VITE_GAS_URL || '';

export function useAuth() {
  const [user,        setUser]       = useState(() => readSession());
  const [syncing,     setSyncing]    = useState(false);
  const [syncReady,   setSyncReady]  = useState(() => Object.keys(loadAuthCache()).length > 0);
  const [syncFailed,  setSyncFailed] = useState(false);
  const [error,       setError]      = useState('');

  // Pull auth table from GAS once on mount
  useEffect(() => {
    if (user) return;          // already logged in from session
    doSync();
  }, []);

  const doSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncFailed(false);
    const { ok } = await syncAuthCache(GAS_URL);
    if (ok) setSyncReady(true);
    else if (!Object.keys(loadAuthCache()).length) setSyncFailed(true);
    setSyncing(false);
  }, [syncing]);

  /** Login: sends credentials to GAS, returns { isFirst } */
  const login = useCallback(async (empId, pin) => {
    setError('');
    try {
      const result = await verifyCredentials(GAS_URL, empId, pin);
      return result;   // { isFirst }
    } catch (e) {
      setError(e.message || 'เข้าระบบไม่ได้');
      throw e;
    }
  }, []);

  /** Called after successful login — sets user in state + session */
  const commitLogin = useCallback((userObj) => {
    saveSession(userObj);
    setUser(userObj);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return {
    user, syncing, syncReady, syncFailed, error, setError,
    login, commitLogin, logout, retry: doSync,
    gasUrl: GAS_URL,
  };
}
