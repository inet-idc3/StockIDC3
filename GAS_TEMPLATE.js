// ═══════════════════════════════════════════════════════════════
// GAS_TEMPLATE.js — Google Apps Script backend template
//
// Setup:
//  1. Open script.google.com → New Project
//  2. Paste this file as Code.gs
//  3. Set SHEET_ID to your Google Sheet ID
//  4. Deploy → New deployment → Web App
//     Execute as: Me | Who has access: Anyone
//  5. Copy the Web App URL → paste into portal .env as VITE_GAS_URL
//
// Sheet tabs required:
//  - "Auth"   : columns → emp_id | hash | changed | updated_at
//  - "Items"  : columns → id | name | cat | stock | unit | min | icon
//  - "Logs"   : columns → timestamp | qr_id | item_name | cat | quantity | unit | employee | employee_name | employee_id | note | action
//  - "Assets" : columns → id | name | cat | status | location | assignee | icon | lastAudit
//  - "AuditLogs": columns → timestamp | asset_id | asset_name | status | location | inspector | note | action
// ═══════════════════════════════════════════════════════════════

const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';

// ── Simple FNV-1a hash (same algorithm as client StockScan fallback) ──
function hashPin(pin) {
  let h = 2166136261;
  for (let i = 0; i < pin.length; i++) {
    h ^= pin.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function sheetToObjects(sh) {
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// ── doGet — return all data needed by the portal ──────────────
function doGet(e) {
  try {
    const items     = sheetToObjects(getSheet('Items'));
    const logs      = sheetToObjects(getSheet('Logs'));
    const assets    = sheetToObjects(getSheet('Assets'));
    const auditLogs = sheetToObjects(getSheet('AuditLogs'));
    const authRows  = sheetToObjects(getSheet('Auth'));

    // Build auth map: { [emp_id]: { changed: bool } }
    // NOTE: we NEVER send hashes to the client
    const auth = {};
    authRows.forEach(r => {
      auth[String(r.emp_id)] = { changed: !!r.changed };
    });

    const payload = JSON.stringify({ items, logs, assets, auditLogs, auth });
    const cb = e?.parameter?.callback;
    const content = cb
      ? `${cb}(${payload})`
      : payload;

    return ContentService
      .createTextOutput(content)
      .setMimeType(cb ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ── doPost — handle all write actions ────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    let result = { ok: false, reason: 'Unknown action' };

    switch (body.action) {

      // ── Login verification ──────────────────────────────────
      case 'login': {
        const { emp_id, pin } = body;
        const sh   = getSheet('Auth');
        const rows = sheetToObjects(sh);
        const rec  = rows.find(r => String(r.emp_id) === String(emp_id));

        if (!rec) {
          // First-time login: default PIN = digits from emp_id
          const defaultPin = String(emp_id).replace(/[A-Za-z]/g, '');
          if (pin === defaultPin) {
            result = { ok: true, isFirst: true };
          } else {
            result = { ok: false, reason: 'รหัสผ่านไม่ถูกต้อง' };
          }
        } else if (!rec.changed) {
          // Has auth record but hasn't changed pw yet
          const defaultPin = String(emp_id).replace(/[A-Za-z]/g, '');
          if (pin === defaultPin) {
            result = { ok: true, isFirst: true };
          } else {
            result = { ok: false, reason: 'รหัสผ่านไม่ถูกต้อง' };
          }
        } else {
          // Normal login: compare hash
          if (hashPin(String(pin)) === String(rec.hash)) {
            result = { ok: true, isFirst: false };
          } else {
            result = { ok: false, reason: 'รหัสผ่านไม่ถูกต้อง' };
          }
        }
        break;
      }

      // ── Change password ────────────────────────────────────
      case 'change_password': {
        const { emp_id, old_pin, new_pin } = body;
        const sh   = getSheet('Auth');
        const data = sh.getDataRange().getValues();
        const headers = data[0];
        const empIdCol = headers.indexOf('emp_id');
        const hashCol  = headers.indexOf('hash');
        const changedCol = headers.indexOf('changed');
        const updatedCol = headers.indexOf('updated_at');

        // Verify old PIN
        const defaultPin = String(emp_id).replace(/[A-Za-z]/g, '');
        let rowIdx = -1;
        let isFirst = true;

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][empIdCol]) === String(emp_id)) {
            rowIdx = i;
            isFirst = !data[i][changedCol];
            break;
          }
        }

        let oldPinValid = false;
        if (isFirst || rowIdx === -1) {
          oldPinValid = old_pin === defaultPin;
        } else {
          oldPinValid = hashPin(String(old_pin)) === String(data[rowIdx][hashCol]);
        }

        if (!oldPinValid) {
          result = { ok: false, reason: 'รหัสผ่านเดิมไม่ถูกต้อง' };
          break;
        }

        const newHash = hashPin(String(new_pin));
        const now     = new Date().toISOString();

        if (rowIdx === -1) {
          // Insert new row
          sh.appendRow([emp_id, newHash, true, now]);
        } else {
          // Update existing row
          sh.getRange(rowIdx + 1, hashCol + 1).setValue(newHash);
          sh.getRange(rowIdx + 1, changedCol + 1).setValue(true);
          if (updatedCol >= 0) sh.getRange(rowIdx + 1, updatedCol + 1).setValue(now);
        }

        result = { ok: true };
        break;
      }

      // ── Stock: withdraw / return / restock ─────────────────
      case 'withdraw':
      case 'return':
      case 'restock': {
        const sh = getSheet('Logs');
        sh.appendRow([
          body.timestamp, body.qr_id, body.item_name,
          body.category,  body.quantity, body.unit,
          body.employee,  body.employee_name, body.employee_id,
          body.note,      body.action,
        ]);

        // Update stock in Items sheet
        const itemsSh = getSheet('Items');
        const itemsData = itemsSh.getDataRange().getValues();
        const idCol     = itemsData[0].indexOf('id');
        const stockCol  = itemsData[0].indexOf('stock');
        for (let i = 1; i < itemsData.length; i++) {
          if (String(itemsData[i][idCol]) === String(body.qr_id)) {
            const cur = Number(itemsData[i][stockCol]) || 0;
            const delta = body.action === 'withdraw' ? -body.quantity : body.quantity;
            itemsSh.getRange(i + 1, stockCol + 1).setValue(Math.max(0, cur + delta));
            break;
          }
        }
        result = { ok: true };
        break;
      }

      // ── Add items (bulk) ────────────────────────────────────
      case 'add_items': {
        const sh = getSheet('Items');
        (body.items || []).forEach(it => {
          sh.appendRow([it.id, it.name, it.cat, it.stock, it.unit, it.min, it.icon]);
        });
        result = { ok: true };
        break;
      }

      // ── Delete item ─────────────────────────────────────────
      case 'delete_item': {
        const sh   = getSheet('Items');
        const data = sh.getDataRange().getValues();
        const idCol = data[0].indexOf('id');
        for (let i = data.length - 1; i >= 1; i--) {
          if (String(data[i][idCol]) === String(body.id)) {
            sh.deleteRow(i + 1);
            break;
          }
        }
        result = { ok: true };
        break;
      }

      // ── Asset audit ─────────────────────────────────────────
      case 'audit': {
        const logSh = getSheet('AuditLogs');
        logSh.appendRow([
          body.timestamp, body.asset_id, body.asset_name,
          body.status, body.location, body.inspector, body.note, 'audit',
        ]);

        // Update asset status/location in Assets sheet
        const assetSh   = getSheet('Assets');
        const assetData = assetSh.getDataRange().getValues();
        const assetIdCol  = assetData[0].indexOf('id');
        const statusCol   = assetData[0].indexOf('status');
        const locationCol = assetData[0].indexOf('location');
        const auditCol    = assetData[0].indexOf('lastAudit');
        for (let i = 1; i < assetData.length; i++) {
          if (String(assetData[i][assetIdCol]) === String(body.asset_id)) {
            if (statusCol   >= 0) assetSh.getRange(i+1, statusCol+1).setValue(body.status);
            if (locationCol >= 0) assetSh.getRange(i+1, locationCol+1).setValue(body.location);
            if (auditCol    >= 0) assetSh.getRange(i+1, auditCol+1).setValue(body.timestamp);
            break;
          }
        }
        result = { ok: true };
        break;
      }

      // ── Add assets (bulk) ───────────────────────────────────
      case 'add_assets': {
        const sh = getSheet('Assets');
        (body.assets || []).forEach(a => {
          sh.appendRow([a.id, a.name, a.cat, a.status, a.location, a.assignee, a.icon, a.lastAudit || '']);
        });
        result = { ok: true };
        break;
      }

      // ── Delete asset ────────────────────────────────────────
      case 'delete_asset': {
        const sh   = getSheet('Assets');
        const data = sh.getDataRange().getValues();
        const idCol = data[0].indexOf('id');
        for (let i = data.length - 1; i >= 1; i--) {
          if (String(data[i][idCol]) === String(body.id)) {
            sh.deleteRow(i + 1);
            break;
          }
        }
        result = { ok: true };
        break;
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, reason: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
