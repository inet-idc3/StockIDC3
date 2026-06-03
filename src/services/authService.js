// ─────────────────────────────────────────────────────────────
// authService.js
//
// All authentication logic goes through GAS (Google Apps Script).
// No password hashes are stored or compared in the browser.
//
// Flow:
//   1. Portal load → syncAuthCache()  pulls auth table from GAS
//   2. Login       → verifyCredentials() sends empId + pin to GAS
//                    GAS returns { ok, isFirst, token? }
//   3. Token stored in sessionStorage (cleared on tab close)
//   4. App re-opens → readSession() restores user from token
// ─────────────────────────────────────────────────────────────

const CACHE_KEY   = 'idc3_auth_cache_v4';
const SESSION_KEY = 'idc3_session_v4';

// ── Helpers ──────────────────────────────────────────────────

/** Load auth metadata cache (employee list + changed flags) from localStorage */
export function loadAuthCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
  catch { return {}; }
}

export function saveAuthCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); }
  catch { /* quota exceeded — ignore */ }
}

/** Session token (lives only in sessionStorage — cleared on tab close) */
export function saveSession(user) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
  catch { /* ignore */ }
}

export function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null; }
  catch { return null; }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ── Network ──────────────────────────────────────────────────

/** GET data from GAS with CORS + JSONP fallback */
export async function gasGet(url) {
  // Primary: fetch with CORS
  try {
    const res  = await fetch(`${url}?_t=${Date.now()}`, { method: 'GET', mode: 'cors', redirect: 'follow' });
    const text = await res.text();
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);
    const m = trimmed.match(/^[^(]+\((.+)\)\s*;?\s*$/s);
    if (m) return JSON.parse(m[1]);
    throw new Error('Unexpected response');
  } catch (_) { /* fall through to JSONP */ }

  // Fallback: JSONP
  return new Promise((resolve, reject) => {
    const cb     = `_idc3_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    let   done   = false;

    const cleanup = () => {
      done = true;
      delete window[cb];
      script.remove();
    };

    const timer = setTimeout(() => { cleanup(); reject(new Error('JSONP timeout')); }, 20_000);

    window[cb] = data => {
      clearTimeout(timer);
      cleanup();
      resolve(data);
    };

    script.src      = `${url}?callback=${cb}&_t=${Date.now()}`;
    script.onerror  = () => { clearTimeout(timer); cleanup(); reject(new Error('JSONP blocked')); };
    document.head.appendChild(script);
  });
}

/** POST action to GAS */
export async function gasPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  try { return JSON.parse(await res.text()); }
  catch { return { status: 'ok' }; }
}

// ── Auth API ─────────────────────────────────────────────────

/**
 * Pull the full auth table from GAS and merge into local cache.
 * Called once on portal load, before the login screen appears.
 *
 * GAS doGet() must return: { auth: { [empId]: { changed: bool, hash?: string } }, items: [...], ... }
 */
export async function syncAuthCache(gasUrl) {
  if (!gasUrl) return { ok: false };
  try {
    const data = await gasGet(gasUrl);
    if (data?.auth && typeof data.auth === 'object') {
      const merged = { ...loadAuthCache(), ...data.auth };
      saveAuthCache(merged);
      return { ok: true, data };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

/**
 * Verify employee credentials against GAS.
 *
 * GAS doPost() must handle action:'login' and return:
 *   { ok: true,  isFirst: bool }    → credentials valid
 *   { ok: false, reason: string }   → invalid credentials
 *
 * This way the browser NEVER sees or compares password hashes.
 */
export async function verifyCredentials(gasUrl, empId, pin) {
  if (!gasUrl) throw new Error('GAS URL ยังไม่ได้ตั้งค่า');

  const result = await gasPost(gasUrl, {
    action:   'login',
    emp_id:   empId,
    pin:      pin,           // plain-text PIN; TLS encrypts in transit; GAS hashes server-side
  });

  if (!result?.ok) {
    throw new Error(result?.reason || 'รหัสผ่านไม่ถูกต้อง');
  }

  return { isFirst: !!result.isFirst };
}

/**
 * Change password via GAS.
 * GAS doPost() handles action:'change_password' and stores new hash server-side.
 */
export async function changePassword(gasUrl, empId, oldPin, newPin) {
  const result = await gasPost(gasUrl, {
    action:   'change_password',
    emp_id:   empId,
    old_pin:  oldPin,
    new_pin:  newPin,
  });
  if (!result?.ok) throw new Error(result?.reason || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
}
