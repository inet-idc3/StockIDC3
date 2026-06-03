// ─────────────────────────────────────────────────────────────
// gasService.js — Data sync utilities (items, logs, audit)
// ─────────────────────────────────────────────────────────────
import { gasGet, gasPost } from './authService.js';

export { gasGet, gasPost };

// ── Local storage helpers ──────────────────────────────────

export function loadLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}

export function saveLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* quota */ }
}

// ── Data normalisers ───────────────────────────────────────

export function normalizeItems(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map(it => ({
      id:    String(it.id    || it.ID    || '').trim(),
      name:  String(it.name  || it.Name  || '').trim(),
      cat:   String(it.cat   || it.category || it.Category || '').trim(),
      stock: Number(String(it.stock ?? it.Stock ?? 0).replace(/[^0-9.]/g, '')) || 0,
      unit:  String(it.unit  || it.Unit  || 'อัน').trim(),
      min:   Number(String(it.min   ?? it.Min   ?? 0).replace(/[^0-9.]/g, '')) || 0,
      icon:  String(it.icon  || it.Icon  || '📦').trim(),
    }))
    .filter(it => it.id);
}

export function normalizeLogs(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(l => ({
    timestamp: String(l.timestamp || '').trim(),
    qr_id:     String(l.qr_id     || '').trim(),
    item_name: String(l.item_name || l.Item_Name || l.name || '').trim(),
    cat:       String(l.cat       || l.category  || '').trim(),
    quantity:  parseInt(String(l.quantity ?? l.Quantity ?? 0)) || 0,
    unit:      String(l.unit      || l.Unit || '').trim(),
    employee:  String(l.employee  || l.Employee || '').trim(),
    note:      String(l.note      || l.Note || '').trim(),
    action:    String(l.action    || 'withdraw').trim(),
  }));
}

// ── Misc utils ─────────────────────────────────────────────

export function uid() {
  return 'QR-' + Date.now().toString(36).toUpperCase().slice(-4) +
    Math.random().toString(36).substr(2, 3).toUpperCase();
}

export function nowISO() {
  const now  = new Date();
  const thai = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return thai.toISOString().replace('Z', '+07:00');
}

export function parseTs(s) {
  try { const d = new Date(s); return isNaN(d) ? null : d; }
  catch { return null; }
}

export function displayTs(s) {
  try {
    return new Date(s).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return s || '—'; }
}

export function fuzzyMatch(text, query) {
  if (!query) return true;
  const t = text.toLowerCase();
  return query.toLowerCase().trim().split(/\s+/).every(w => t.includes(w));
}
