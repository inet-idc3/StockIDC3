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
//  - "Logs"   : columns → timestamp | qr_id | item_name | cat | quantity | unit | employee_name | employee_id | note | pm_job | action
//  - "Assets" : columns → id | name | cat | status | location | assignee | icon | lastAudit
//  - "AuditLogs": columns → timestamp | asset_id | asset_name | status | location | inspector | note | action
// ═══════════════════════════════════════════════════════════════

const SHEET_ID = '1GswRPK_iTPu1SHn2OAd8X9QaZ1JZQNZUv5lC_7jIbII';

// ── ntfy.sh config ───────────────────────────────────────────
// เปลี่ยน topic ให้ยากเดา เช่น "inet-idc3-xk9m2p7q"
var NTFY_TOPIC = "inet-idc3-stockscan2026";   // ← เปลี่ยนให้ยากเดา

// ── Cloudflare Worker proxy URL ──────────────────────────────
// 1. ติดตั้ง Worker จากไฟล์ cloudflare-worker.js
// 2. วาง URL ที่ได้จาก Cloudflare ด้านล่าง (อย่าใส่ / ท้าย)
var NTFY_PROXY_URL    = "https://ntfy-proxy-idc3.pongsatorn2612.workers.dev/"; // ← แก้ตรงนี้
var NTFY_PROXY_SECRET = "idc3-secret-2026";  // ← ต้องตรงกับที่ตั้งใน Cloudflare

function sendNtfy(title, message, opts) {
  opts = opts || {};
  try {
    var payload = {
      topic:    NTFY_TOPIC,
      title:    title,
      message:  message,
      priority: opts.priority || "default",  // min/low/default/high/urgent
      tags:     opts.tags     || ["bell"],
    };
    if (opts.clickUrl) payload.click = opts.clickUrl;

    // ── ส่งผ่าน Cloudflare Worker (bypass Google IP block) ──
    var resp = UrlFetchApp.fetch(NTFY_PROXY_URL, {
      method:             "post",
      headers: {
        "Content-Type":   "application/json",
        "X-Proxy-Secret": NTFY_PROXY_SECRET,
      },
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    var code = resp.getResponseCode();
    Logger.log("ntfy via CF Worker: " + code + " " + resp.getContentText());

  } catch(e) {
    Logger.log("ntfy error: " + e);
  }
}

// ── Simple FNV-1a hash ────────────────────────────────────────
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

// ── doGet ─────────────────────────────────────────────────────
function doGet(e) {
  try {
    const items     = sheetToObjects(getSheet('Items'));
    const logs      = sheetToObjects(getSheet('Logs'));
    const assets    = sheetToObjects(getSheet('Assets'));
    const auditLogs = sheetToObjects(getSheet('AuditLogs'));
    const authRows  = sheetToObjects(getSheet('Auth'));

    const auth = {};
    authRows.forEach(r => {
      auth[String(r.emp_id)] = { changed: !!r.changed };
    });

    const pendingRows = sheetToObjects(getSheet('Pending'));
    const pendingRequests = pendingRows.map(r => ({
      id:           String(r.id),
      timestamp:    String(r.timestamp),
      mode:         String(r.mode),
      itemId:       String(r.itemId),
      itemName:     String(r.itemName),
      itemCat:      String(r.itemCat   || ''),
      qty:          Number(r.qty)      || 0,
      unit:         String(r.unit      || ''),
      employeeId:   String(r.employeeId),
      employeeName: String(r.employeeName),
      note:         String(r.note      || ''),
      pmJob:        String(r.pmJob     || ''),
    }));

    const payload = JSON.stringify({ items, logs, assets, auditLogs, auth, pendingRequests });
    const cb = e?.parameter?.callback;
    const content = cb ? `${cb}(${payload})` : payload;

    return ContentService
      .createTextOutput(content)
      .setMimeType(cb ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ── doPost ────────────────────────────────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    let result = { ok: false, reason: 'Unknown action' };

    switch (body.action) {

      case 'login': {
        const { emp_id, pin } = body;
        const sh   = getSheet('Auth');
        const rows = sheetToObjects(sh);
        const rec  = rows.find(r => String(r.emp_id) === String(emp_id));

        if (!rec) {
          const defaultPin = String(emp_id).replace(/[A-Za-z]/g, '');
          result = pin === defaultPin ? { ok: true, isFirst: true } : { ok: false, reason: 'รหัสผ่านไม่ถูกต้อง' };
        } else if (!rec.changed) {
          const defaultPin = String(emp_id).replace(/[A-Za-z]/g, '');
          result = pin === defaultPin ? { ok: true, isFirst: true } : { ok: false, reason: 'รหัสผ่านไม่ถูกต้อง' };
        } else {
          result = hashPin(String(pin)) === String(rec.hash)
            ? { ok: true, isFirst: false }
            : { ok: false, reason: 'รหัสผ่านไม่ถูกต้อง' };
        }
        break;
      }

      // ── Change password ─────────────────────────────────────
      case 'change_password': {
        const { emp_id, old_pin, new_pin } = body;
        const sh   = getSheet('Auth');
        const data = sh.getDataRange().getValues();
        const headers = data[0];
        const empIdCol   = headers.indexOf('emp_id');
        const hashCol    = headers.indexOf('hash');
        const changedCol = headers.indexOf('changed');
        const updatedCol = headers.indexOf('updated_at');

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

        if (!oldPinValid) { result = { ok: false, reason: 'รหัสผ่านเดิมไม่ถูกต้อง' }; break; }

        const newHash = hashPin(String(new_pin));
        const now = new Date().toISOString();
        if (rowIdx === -1) {
          sh.appendRow([emp_id, newHash, true, now]);
        } else {
          sh.getRange(rowIdx + 1, hashCol + 1).setValue(newHash);
          sh.getRange(rowIdx + 1, changedCol + 1).setValue(true);
          if (updatedCol >= 0) sh.getRange(rowIdx + 1, updatedCol + 1).setValue(now);
        }
        result = { ok: true };
        break;
      }

      // ── Stock: withdraw / return / restock ──────────────────
      case 'withdraw':
      case 'return':
      case 'restock': {
        const sh = getSheet('Logs');

        // ── บันทึก Log พร้อมคอลัมน์ pm_job ──────────────────
        sh.appendRow([
          body.timestamp,
          body.qr_id,
          body.item_name,
          body.category,
          body.quantity,
          body.unit,
          body.employee_name,
          body.employee_id,
          body.note       || '',
          body.pm_job     || '',   // ← คอลัมน์ใหม่: งาน PM
          body.action,
        ]);

        // ── อัปเดต stock ──────────────────────────────────────
        const itemsSh   = getSheet('Items');
        const itemsData = itemsSh.getDataRange().getValues();
        const idCol     = itemsData[0].indexOf('id');
        const stockCol  = itemsData[0].indexOf('stock');
        for (let i = 1; i < itemsData.length; i++) {
          if (String(itemsData[i][idCol]) === String(body.qr_id)) {
            const cur   = Number(itemsData[i][stockCol]) || 0;
            const delta = body.action === 'withdraw' ? -body.quantity : body.quantity;
            itemsSh.getRange(i + 1, stockCol + 1).setValue(Math.max(0, cur + delta));
            break;
          }
        }

        // ── LINE notification (ปิดไว้เพื่อประหยัด quota — แจ้งเฉพาะตอน add_pending) ──
        // sendLine(...);

        result = { ok: true };
        break;
      }

      // ── Add pending batch (single or multi-item) ──────────────
      case 'add_pending_batch': {
        const requests = body.requests || [];
        if (requests.length === 0) { result = { ok: true }; break; }

        const sh = getSheet('Pending');
        requests.forEach(r => {
          sh.appendRow([
            r.id, r.timestamp, r.mode, r.itemId, r.itemName,
            r.itemCat || '', r.qty, r.unit,
            r.employeeId, r.employeeName, r.note || '', r.pmJob || '',
          ]);
        });

        // ── ntfy.sh notification ──────────────────────────────
        const first = requests[0];
        const modeLabel = first.mode === 'withdraw' ? 'เบิก' : 'คืน';
        const modeIcon  = first.mode === 'withdraw' ? '📤' : '📥';
        const modeTag   = first.mode === 'withdraw' ? 'outbox_tray' : 'inbox_tray';

        const itemLines = requests
          .map(r => '• ' + r.itemName + ' ×' + r.qty + ' ' + r.unit)
          .join('\n');
        const contextLine = first.pmJob
          ? '\n🔧 PM: ' + first.pmJob
          : first.note ? '\n💬 ' + first.note : '';

        const title = modeIcon + ' ขอ' + modeLabel + ' ' + requests.length + ' รายการ — รออนุมัติ';
        const msg   = '👤 ' + first.employeeName + ' (' + first.employeeId + ')'
                    + contextLine + '\n\n'
                    + itemLines;

        sendNtfy(title, msg, {
          priority: 'high',
          tags:     [modeTag, 'bell'],
          clickUrl: 'https://inet-idc3.github.io/StockIDC3/',  // ← แก้ URL
        });
        result = { ok: true };
        break;
      }

      // ── Remove pending request (after approve/reject) ────────
      case 'remove_pending': {
        const sh   = getSheet('Pending');
        const data = sh.getDataRange().getValues();
        if (data.length > 1) {
          const idCol = data[0].indexOf('id');
          for (let i = data.length - 1; i >= 1; i--) {
            if (String(data[i][idCol]) === String(body.id)) {
              sh.deleteRow(i + 1);
              break;
            }
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
          if (String(data[i][idCol]) === String(body.id)) { sh.deleteRow(i + 1); break; }
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
          body.stock ?? 1, body.found_count ?? body.stock ?? 1,
        ]);

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

        const d2 = new Date();
        const ds2 = Utilities.formatDate(d2, Session.getScriptTimeZone(), 'd MMM yyyy HH:mm');
        const msg2 = '🔍 แจ้งเตือนตรวจสอบครุภัณฑ์ — IDC-3\n'
                   + '👤 ผู้ตรวจ: ' + (body.inspector || '-') + '\n'
                   + '📋 รายการ: ' + body.asset_name + '\n'
                   + '📍 สถานที่: ' + (body.location || '-') + '\n'
                   + '🔖 สถานะ: ' + (body.status || '-') + '\n'
                   + '🕐 เวลา: ' + ds2;
        // sendLine(msg2); // ปิดไว้เพื่อประหยัด quota
        result = { ok: true };
        break;
      }

      // ── Add assets (bulk) ───────────────────────────────────
      case 'add_assets': {
        const sh = getSheet('Assets');
        (body.assets || []).forEach(a => {
          sh.appendRow([a.id, a.name, a.cat, a.status, a.location, a.assignee, a.icon, a.lastAudit || '', a.stock ?? 1]);
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
          if (String(data[i][idCol]) === String(body.id)) { sh.deleteRow(i + 1); break; }
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

// ── Setup sheets ──────────────────────────────────────────────
function setupDatabaseSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var schema = {
    "Auth":      ["emp_id", "hash", "changed", "updated_at"],
    "Items":     ["id", "name", "cat", "stock", "unit", "min", "icon"],
    // ★ เพิ่ม pm_job หลัง note
    "Logs":      ["timestamp", "qr_id", "item_name", "cat", "quantity", "unit", "employee_name", "employee_id", "note", "pm_job", "action"],
    "Assets":    ["id", "name", "cat", "status", "location", "assignee", "icon", "lastAudit", "stock"],
    "AuditLogs": ["timestamp", "asset_id", "asset_name", "status", "location", "inspector", "note", "action", "stock", "found_count"],
    "Pending":   ["id", "timestamp", "mode", "itemId", "itemName", "itemCat", "qty", "unit", "employeeId", "employeeName", "note", "pmJob"]
  };

  for (var sheetName in schema) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log("สร้าง Sheet ใหม่: " + sheetName);
    } else {
      Logger.log("มี Sheet ชื่อ " + sheetName + " อยู่แล้ว (ข้ามการสร้าง)");
    }
    var headers = schema[sheetName];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }

  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);

  Browser.msgBox("ระบบตั้งค่าโครงสร้างตารางเรียบร้อยแล้วครับ!");
}

// ── addPmJobColumn — รันครั้งเดียวเพื่อเพิ่มคอลัมน์ pm_job ──
// ใช้สำหรับ Sheet "Logs" ที่มีข้อมูลเดิมอยู่แล้ว
// วิ่งใน Apps Script Editor แล้วกด Run ได้เลย
function addPmJobColumn() {
  const sh   = getSheet('Logs');
  const data = sh.getDataRange().getValues();
  if (data.length === 0) { Logger.log('Logs sheet ว่างเปล่า'); return; }

  const headers   = data[0];
  const actionCol = headers.indexOf('action');   // หา index ของ "action"

  if (actionCol === -1) {
    Logger.log('ไม่พบคอลัมน์ "action" ใน Logs sheet');
    return;
  }

  // ตรวจว่ามี pm_job อยู่แล้วหรือยัง
  if (headers.indexOf('pm_job') !== -1) {
    Logger.log('มีคอลัมน์ "pm_job" อยู่แล้ว ข้ามขั้นตอนนี้');
    return;
  }

  // แทรกคอลัมน์ pm_job ก่อน action (insertColumnBefore แบบ 1-based)
  sh.insertColumnBefore(actionCol + 1);
  sh.getRange(1, actionCol + 1).setValue('pm_job').setFontWeight('bold');

  // เติมค่าว่างให้แถวเดิมทุกแถว (ไม่ให้ขยับข้อมูลผิด)
  if (data.length > 1) {
    sh.getRange(2, actionCol + 1, data.length - 1, 1).setValue('');
  }

  Logger.log('✅ เพิ่มคอลัมน์ pm_job ก่อน action เรียบร้อยแล้ว (' + (data.length - 1) + ' แถวที่มีอยู่)');
  Browser.msgBox('✅ เพิ่มคอลัมน์ pm_job เรียบร้อยแล้ว!\nรันแล้วใช้ได้เลยโดยไม่ต้อง Re-deploy');
}

// ═══════════════════════════════════════════════════════════════
// WEEKLY REPORT
// ═══════════════════════════════════════════════════════════════

function writeWeeklyReport() {
  const tz  = Session.getScriptTimeZone();
  const now = new Date();

  const day     = now.getDay();
  const diffMon = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffMon);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(now);
  weekEnd.setHours(23, 59, 59, 999);

  const weekLabel = Utilities.formatDate(weekStart, tz, 'd MMM yyyy')
                  + ' – '
                  + Utilities.formatDate(weekEnd, tz, 'd MMM yyyy');

  const allItems = sheetToObjects(getSheet('Items'));
  const allLogs  = sheetToObjects(getSheet('Logs'));
  const weekLogs = allLogs.filter(log => {
    const ts = new Date(log.timestamp);
    return ts >= weekStart && ts <= weekEnd;
  });

  const withdrawMap = {};
  weekLogs.forEach(log => {
    const id  = String(log.qr_id);
    const qty = Number(log.quantity) || 0;
    if (!withdrawMap[id]) withdrawMap[id] = 0;
    if      (log.action === 'withdraw') withdrawMap[id] += qty;
    else if (log.action === 'return')   withdrawMap[id] -= qty;
  });

  const inetItems   = allItems.filter(it =>  String(it.cat).toLowerCase().includes('inet'));
  const supplyItems = allItems.filter(it => !String(it.cat).toLowerCase().includes('inet'));

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheetName = 'รายงานสัปดาห์';
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);

  const startRow = sh.getLastRow() === 0 ? 1 : sh.getLastRow() + 3;
  let row = startRow;

  function setCell(r, c, value, opts = {}) {
    const cell = sh.getRange(r, c);
    cell.setValue(value);
    if (opts.bg)    cell.setBackground(opts.bg);
    if (opts.bold)  cell.setFontWeight('bold');
    if (opts.color) cell.setFontColor(opts.color);
    if (opts.size)  cell.setFontSize(opts.size);
    if (opts.align) cell.setHorizontalAlignment(opts.align);
    if (opts.wrap)  cell.setWrap(true);
  }

  function writeBorderRow(r, values, opts = {}) {
    values.forEach((v, i) => {
      const cell = sh.getRange(r, i + 1);
      cell.setValue(v);
      if (opts.bg)    cell.setBackground(opts.bg);
      if (opts.bold)  cell.setFontWeight('bold');
      if (opts.color) cell.setFontColor(opts.color);
      if (opts.align) cell.setHorizontalAlignment(opts.align);
      cell.setBorder(true,true,true,true,false,false,'#b7b7b7',SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    });
  }

  const COL_NO=1, COL_NAME=2, COL_UNIT=3, COL_MIN=4, COL_WD=5, COL_STOCK=6, COL_FLAG=7;

  function drawItemTable(items, groupLabel, accentBg) {
    sh.getRange(row, 1, 1, 7).merge();
    setCell(row, 1, groupLabel, { bg: accentBg, color:'#ffffff', bold:true, size:11, align:'center' });
    row++;
    writeBorderRow(row, ['#','ชื่อรายการ','หน่วย','ขั้นต่ำ','เบิกสัปดาห์นี้','คงเหลือ','สถานะ'],
                   { bg:'#d0e4f7', bold:true, align:'center' });
    row++;
    items.forEach((it, idx) => {
      const id = String(it.id);
      const stock = Number(it.stock) || 0;
      const min   = Number(it.min)   || 0;
      const withdrew = withdrawMap[id] || 0;
      const isLow = stock <= min;
      const isZero = stock === 0;
      const rowBg = isZero ? '#f4cccc' : isLow ? '#fce5cd' : (idx % 2 === 0 ? '#ffffff' : '#f8f9fa');
      const status = isZero ? '🔴 หมดแล้ว' : isLow ? '🟠 ใกล้หมด' : '🟢 ปกติ';
      [idx+1, it.name, it.unit||'-', min>0?min:'-', withdrew>0?withdrew:'-', stock, status].forEach((v,i) => {
        const cell = sh.getRange(row, i+1);
        cell.setValue(v).setBackground(rowBg);
        if (i===0||i>=2) cell.setHorizontalAlignment('center');
        if (i===1) cell.setFontWeight(isLow?'bold':'normal');
        cell.setBorder(true,true,true,true,false,false,'#d9d9d9',SpreadsheetApp.BorderStyle.SOLID);
      });
      row++;
    });
    const totalWd    = items.reduce((s,it) => s + (withdrawMap[String(it.id)]||0), 0);
    const totalStock = items.reduce((s,it) => s + (Number(it.stock)||0), 0);
    writeBorderRow(row, ['','รวม','','', totalWd||'-', totalStock,''], { bg:'#d0e4f7', bold:true, align:'center' });
    row += 2;
  }

  sh.getRange(row, 1, 1, 7).merge();
  setCell(row, 1, `รายงานสรุปสต็อกประจำสัปดาห์  |  ${weekLabel}`,
          { bg:'#1a3a5c', color:'#ffffff', bold:true, size:12, align:'center' });
  row++;
  sh.getRange(row, 1, 1, 7).merge();
  setCell(row, 1,
          `สร้างเมื่อ ${Utilities.formatDate(now, tz, 'd MMM yyyy HH:mm')}  |  transaction สัปดาห์นี้ ${weekLogs.length} รายการ`,
          { bg:'#1a3a5c', color:'#aacbf0', align:'center' });
  row += 2;

  drawItemTable(supplyItems, '📦  วัสดุสิ้นเปลือง', '#2e7d32');
  drawItemTable(inetItems,   '🌐  INET',             '#1565c0');

  if (startRow === 1) {
    sh.setColumnWidth(COL_NO,40); sh.setColumnWidth(COL_NAME,220);
    sh.setColumnWidth(COL_UNIT,70); sh.setColumnWidth(COL_MIN,70);
    sh.setColumnWidth(COL_WD,110); sh.setColumnWidth(COL_STOCK,90);
    sh.setColumnWidth(COL_FLAG,110);
  }
  Logger.log(`✅ เขียนรายงานสัปดาห์สำเร็จ แถว ${startRow}–${row}`);
}

function sendWeeklySummary() {
  writeWeeklyReport();
  const tz  = Session.getScriptTimeZone();
  const now = Utilities.formatDate(new Date(), tz, 'd MMM yyyy HH:mm');
  sendNtfy(
    '📋 รายงานสรุปสต็อกสัปดาห์พร้อมแล้ว',
    '🕐 ' + now + '\n👉 ดูรายละเอียดใน Google Sheet',
    { priority: 'default', tags: ['bar_chart'] }
  );
}

function setupWeeklyTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sendWeeklySummary') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendWeeklySummary')
    .timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(10).create();
  Browser.msgBox('✅ ตั้ง Trigger สำเร็จ\nจะรันทุกวันศุกร์ เวลา 10:00 น.');
}

function testWeeklyReport() { writeWeeklyReport(); }
function testSendNtfy() {
  sendNtfy(
    '🔔 ทดสอบระบบแจ้งเตือน ntfy.sh',
    'ถ้าเห็นข้อความนี้ แสดงว่า ntfy.sh ทำงานถูกต้องแล้วครับ ✅',
    { priority: 'high', tags: ['white_check_mark'] }
  );
  Logger.log("ntfy test sent → topic: " + NTFY_TOPIC);
}