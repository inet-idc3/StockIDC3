// ─────────────────────────────────────────────────────────────
// App.jsx — Root component: Login → Shell → App
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { EMPLOYEES } from './data/employees.js';
import PortalLogin from './components/PortalLogin.jsx';
import PortalShell  from './components/PortalShell.jsx';
import AppOverlay   from './components/AppOverlay.jsx';
import ChangePasswordScreen from './components/ChangePasswordScreen.jsx';

export default function App() {
  const {
    user, syncing, syncReady, syncFailed, error, setError,
    login, commitLogin, logout, retry, gasUrl,
  } = useAuth();

  const [activeApp,     setActiveApp]     = useState(null);
  const [needChangePw,  setNeedChangePw]  = useState(false);
  const [pendingEmpId,  setPendingEmpId]  = useState(null);

  // Restore employee object from session user
  const loggedInEmp = user
    ? EMPLOYEES.find(e => e.id === user.empId) || null
    : null;

  async function handleLogin(empId, pin) {
    const { isFirst } = await login(empId, pin);

    const emp = EMPLOYEES.find(e => e.id === empId);
    const userObj = {
      empId,
      displayName: emp?.displayName || empId,
      id: empId,
    };

    if (isFirst) {
      // Need to change password before entering portal
      setPendingEmpId(empId);
      setNeedChangePw(true);
      return { isFirst: true };
    }

    commitLogin(userObj);
    return { isFirst: false };
  }

  function handlePasswordChanged() {
    const emp = EMPLOYEES.find(e => e.id === pendingEmpId);
    commitLogin({
      empId:       pendingEmpId,
      displayName: emp?.displayName || pendingEmpId,
      id:          pendingEmpId,
    });
    setNeedChangePw(false);
    setPendingEmpId(null);
  }

  // ── Change password screen (first login) ──────────────────
  if (needChangePw && pendingEmpId) {
    return (
      <ChangePasswordScreen
        empId={pendingEmpId}
        gasUrl={gasUrl}
        onDone={handlePasswordChanged}
      />
    );
  }

  // ── Not logged in → show login ────────────────────────────
  if (!user) {
    return (
      <PortalLogin
        syncing={syncing}
        syncFailed={syncFailed}
        onLogin={handleLogin}
        onRetry={retry}
        error={error}
        setError={setError}
      />
    );
  }

  // ── Logged in → shell + app overlay ──────────────────────
  return (
    <>
      <PortalShell
        user={loggedInEmp || user}
        onOpenApp={setActiveApp}
        onLogout={logout}
      />
      {activeApp && (
        <AppOverlay
          appId={activeApp}
          user={loggedInEmp || user}
          onClose={() => setActiveApp(null)}
        />
      )}
    </>
  );
}
