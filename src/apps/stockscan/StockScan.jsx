// ─────────────────────────────────────────────────────────────
// StockScan.jsx — Stock management app with Approval system
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { EMPLOYEES } from '../../data/employees.js';
import {
  gasGet, gasPost,
  loadLocal, saveLocal,
  normalizeItems, normalizeLogs, normalizePending,
  uid, nowISO, parseTs, displayTs, fuzzyMatch,
} from '../../services/gasService.js';
import { syncAuthCache, verifyCredentials } from '../../services/authService.js';
import EmployeeDirectory, { EmpMiniAvatar, EmployeePicker } from '../../components/EmployeeDirectory.jsx';
import PageHome     from './pages/PageHome.jsx';
import PageScan     from './pages/PageScan.jsx';
import PageLog      from './pages/PageLog.jsx';
import PageAdmin    from './pages/PageAdmin.jsx';
import PageSetup    from './pages/PageSetup.jsx';

// ── Config ────────────────────────────────────────────────────
const DEFAULT_GAS_URL = import.meta.env.VITE_GAS_URL || '';
const SECURE_PIN      = import.meta.env.VITE_ADMIN_PIN || '240739';

// ── Approvers ─────────────────────────────────────────────────
const APPROVER_IDS = ['OD1158048', 'OD1162151'];

// ── Preventive Maintenance Job List ───────────────────────────
const PM_JOBS = [
  'Fire Alarm Office',
  'Booter pump Office',
  'ปั๊มบ่อน้ำพุ',
  'Fire hose cabinet ,Fire hose box',
  'ระบบเครื่องกรองน้ำ',
  'Booter pump UT Phase1',
  'Air Office',
  'Pump & FCU OAU Phase1',
  'ล้างแผงรังผึ้ง Chiller Phase1',
  'Fuel Supply System (Day & Underground Tank) Phase1',
  'CPMS Phase1',
  'Air Shower',
  'VMP',
  'Lighting Control & Lighting Fixture Phase1',
  'TVSS Phase1',
  'CCTV Phase1',
  'ตู้ไฟฟ้าย่อย Phase1',
  'Subsation Phase1',
  'Measurement Battery Monitering Phase1',
  'Emergency Litgh & Exit Sign Phase1',
  'Ventilation Fan Phase1',
  'Fuel Supply System (Day & Underground Tank) Phase2',
  'Chiller Water Pump Phase2',
  'Booster Pump Phase2',
  'FCU&OAU Phase2',
  'CPMS Phase2',
  'Lighting Control & Lighting Fixture Phase2',
  'TVSS Phase2',
  'CCTV Phase2',
  'ตู้ไฟฟ้าย่อย Phase2',
  'Emergency Litgh & Exit Sign Phase2',
  'Ventilation Fan Phase2',
  'Bus duct IT Phase2',
  'Pubilc addess ประกาศเสียง Office ,Phase 1 ,Phase2',
  'โทรมาตร',
  'MATV ประกาศเสียง Office',
  'ประตูเลื่อนอัตโนมัติ โครงการ 6 บาน',
  'ประตูเลื่อนอัตโนมัติ Office&DC 5 บาน',
  'สปิงเกอร์รดน้ำต้นไม้',
  'ปั้มเติมอากาศบ่อบำบัดน้ำเสีย',
  'แสงสว่างรอบโครงการ',
  'ถังดับเพลิง Phase1',
  'Piping ท่อส่งน้ำเย็น & Valve Phase1',
  'Piping ท่อส่งน้ำเย็น & Valve Phase2',
  'FireAlarm Substation',
  'FUC Substation',
  'Access Control Phase1',
  'BMS Phase1',
  'PME Phase1',
  'Access Control Phase2',
  'BMS Phase2',
  'PME Phase2',
  'Generator Phase1',
  'Fire Suppression&Fire Alarm Phase1',
  'Fire Pump & Jockey Pump',
  'Water Leak Phase1',
  'Main Electrical System Phase1',
  'Main Electrical System Phase2',
  'Generator Phase2',
  'Fire Suppression&Fire Alarm Phase2',
  'ล้างแผงรังผึ้ง Chiller Phase2',
  'Measurement Battery Monitering Phase2',
  'Grounding System Phase1',
  'Grounding System Phase2',
  'MDB & DB Solar Farm',
  'Transformer Solar Farm',
  'โครงสร้าง PV,Mounting Solar Farm',
  'Grounding System Solar Farm',
  'Fire Alarm Solar Farm',
  'วัดประสิทธิภาพแผง IV Curve Solar Farm',
  'Inverter System Solar Farm',
  'แสงสว่าง Solar Farm',
  'CCTV Solar Farm',
  'Air Condition Solar Farm',
  'Water Trestment Solar Farm',
];

const CACHE_KEY = 'idc3_ss_auth_v4';
const PENDING_KEY = 'idc3_ss_pending_v1';
function loadAuthCache()    { try { return JSON.parse(localStorage.getItem(CACHE_KEY))   || {}; } catch { return {}; } }
function saveAuthCache(d)   { try { localStorage.setItem(CACHE_KEY, JSON.stringify(d));  } catch { } }
function loadPending()      { try { return JSON.parse(localStorage.getItem(PENDING_KEY)) || []; } catch { return []; } }
function savePending(arr)   { try { localStorage.setItem(PENDING_KEY, JSON.stringify(arr)); } catch { } }

// ── Status map ────────────────────────────────────────────────
const STATUS_MAP = {
  syncing: { color: 'var(--txt3)',  text: 'กำลังซิงค์...' },
  ok:      { color: 'var(--teal)', text: 'Connected ✓' },
  error:   { color: '#FF4D4D',     text: 'ซิงค์ไม่ได้ ⚠' },
  none:    { color: 'var(--txt3)', text: 'ยังไม่ได้เชื่อม Sheet' },
};

// ── Toast ─────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{ position:'fixed',bottom:96,left:'50%',transform:'translateX(-50%)',background:toast.color,color:'#fff',borderRadius:100,padding:'12px 24px',fontSize:13,zIndex:300,whiteSpace:'nowrap',boxShadow:'0 8px 32px rgba(33,58,88,0.2)',animation:'toastPop .3s cubic-bezier(0.34,1.56,0.64,1)' }}>
      {toast.msg}
    </div>
  );
}

// ── PMJobPicker ───────────────────────────────────────────────
function PMJobPicker({ value, onChange }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = React.useRef(null);

  const filtered = search.trim()
    ? PM_JOBS.filter(j => j.toLowerCase().includes(search.toLowerCase()))
    : PM_JOBS;

  function select(job) {
    onChange(job);
    setOpen(false);
    setSearch('');
  }

  function clear(e) {
    e.stopPropagation();
    onChange('');
    setSearch('');
  }

  return (
    <>
      {/* Trigger button */}
      <div
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 80); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 14px', borderRadius: 14,
          border: `1.5px solid ${value ? 'var(--teal)' : 'var(--teal-border)'}`,
          background: value ? 'rgba(9,209,199,0.06)' : 'var(--surface)',
          cursor: 'pointer', minHeight: 46,
          transition: 'all 0.18s',
        }}
      >
        <i className="ti ti-tools" style={{ fontSize: 15, color: value ? 'var(--teal)' : 'var(--txt3)', flexShrink: 0 }} />
        <span style={{
          flex: 1, fontSize: 13,
          fontFamily: "'Noto Sans Thai',sans-serif",
          color: value ? 'var(--txt)' : 'var(--txt3)',
          lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value || 'เลือกงาน PM (ถ้ามี)...'}
        </span>
        {value
          ? <button onClick={clear} style={{ background:'none',border:'none',cursor:'pointer',padding:2,color:'var(--txt3)',display:'flex',alignItems:'center',flexShrink:0 }}><i className="ti ti-x" style={{ fontSize:14 }} /></button>
          : <i className="ti ti-chevron-down" style={{ fontSize:14, color:'var(--txt3)', flexShrink:0 }} />
        }
      </div>

      {/* Bottom sheet picker */}
      {open && (
        <div
          style={{ position:'fixed',inset:0,zIndex:270,background:'rgba(33,58,88,0.5)',display:'flex',alignItems:'flex-end',justifyContent:'center' }}
          onClick={() => { setOpen(false); setSearch(''); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background:'var(--surface)', borderRadius:'28px 28px 0 0',
              width:'100%', maxWidth:480,
              paddingBottom:'env(safe-area-inset-bottom,0px)',
              maxHeight:'72vh', display:'flex', flexDirection:'column',
              animation:'slideUp .28s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {/* Header */}
            <div style={{ padding:'18px 18px 12px', borderBottom:'1px solid var(--teal-border)', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,var(--teal),var(--mid-teal))',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <i className="ti ti-tools" style={{ fontSize:16,color:'#fff' }} />
                </div>
                <div>
                  <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:800,color:'var(--navy)' }}>เลือกงาน PM</div>
                  <div style={{ fontSize:10,color:'var(--txt3)' }}>Preventive Maintenance</div>
                </div>
                <button
                  onClick={() => { setOpen(false); setSearch(''); }}
                  style={{ marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'var(--txt3)',padding:4,display:'flex',alignItems:'center' }}
                >
                  <i className="ti ti-x" style={{ fontSize:18 }} />
                </button>
              </div>
              {/* Search box */}
              <div style={{ position:'relative' }}>
                <i className="ti ti-search" style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'var(--txt3)' }} />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ค้นหางาน PM..."
                  style={{
                    width:'100%', padding:'10px 12px 10px 36px',
                    borderRadius:12, border:'1.5px solid var(--teal-border)',
                    background:'var(--surface2)', fontSize:13,
                    fontFamily:"'Noto Sans Thai',sans-serif",
                    outline:'none', color:'var(--txt)',
                    boxSizing:'border-box',
                  }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--txt3)',padding:2,display:'flex' }}>
                    <i className="ti ti-x" style={{ fontSize:13 }} />
                  </button>
                )}
              </div>
              {search && (
                <div style={{ fontSize:10,color:'var(--txt3)',marginTop:6,fontFamily:"'Space Mono',monospace" }}>
                  พบ {filtered.length} รายการ
                </div>
              )}
            </div>

            {/* Job list */}
            <div style={{ overflowY:'auto', flex:1, padding:'8px 0' }}>
              {/* "ไม่ระบุ" option */}
              <button
                onClick={() => select('')}
                style={{
                  width:'100%', padding:'11px 18px', textAlign:'left',
                  background: !value ? 'rgba(9,209,199,0.08)' : 'none',
                  border:'none', cursor:'pointer',
                  display:'flex', alignItems:'center', gap:10,
                }}
              >
                <span style={{ fontSize:14 }}>—</span>
                <span style={{ fontSize:13,color:'var(--txt3)',fontFamily:"'Noto Sans Thai',sans-serif",fontStyle:'italic' }}>
                  ไม่ระบุงาน PM
                </span>
                {!value && <i className="ti ti-check" style={{ marginLeft:'auto',fontSize:14,color:'var(--teal)' }} />}
              </button>

              {filtered.length === 0 && (
                <div style={{ padding:'28px 18px',textAlign:'center',color:'var(--txt3)',fontSize:13,fontFamily:"'Noto Sans Thai',sans-serif" }}>
                  ไม่พบงานที่ค้นหา
                </div>
              )}

              {filtered.map((job, i) => {
                const isSelected = value === job;
                const highlight = search.trim();
                let label;
                if (highlight) {
                  const idx = job.toLowerCase().indexOf(highlight.toLowerCase());
                  if (idx >= 0) {
                    label = (
                      <span>
                        {job.slice(0, idx)}
                        <mark style={{ background:'rgba(9,209,199,0.25)',color:'inherit',borderRadius:3,padding:'0 1px' }}>
                          {job.slice(idx, idx + highlight.length)}
                        </mark>
                        {job.slice(idx + highlight.length)}
                      </span>
                    );
                  } else { label = job; }
                } else { label = job; }

                return (
                  <button
                    key={i}
                    onClick={() => select(job)}
                    style={{
                      width:'100%', padding:'11px 18px', textAlign:'left',
                      background: isSelected ? 'rgba(9,209,199,0.08)' : 'none',
                      border:'none', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:10,
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--teal-border)' : 'none',
                    }}
                  >
                    <i className="ti ti-tool" style={{ fontSize:13,color:isSelected?'var(--teal)':'var(--txt3)',flexShrink:0 }} />
                    <span style={{ fontSize:13,color:isSelected?'var(--teal)':'var(--txt)',fontFamily:"'Noto Sans Thai',sans-serif",flex:1,lineHeight:1.4 }}>
                      {label}
                    </span>
                    {isSelected && <i className="ti ti-check" style={{ fontSize:14,color:'var(--teal)',flexShrink:0 }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── ApprovalInbox ─────────────────────────────────────────────
function ApprovalInbox({ pendingRequests, isApprover, onApprove, onReject }) {
  const [open, setOpen] = useState(false);
  const count = pendingRequests.length;

  if (!isApprover || count === 0) return null;

  const modeLabel = m => m === 'withdraw' ? 'เบิก' : 'คืน';
  const modeColor = m => m === 'withdraw' ? '#E05C00' : '#1A7ABE';
  const modeIcon  = m => m === 'withdraw' ? '📤' : '📥';

  return (
    <>
      {/* Inbox bell button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'relative',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '6px 10px',
          display: 'flex', alignItems: 'center', gap: 5,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #FFF3E0, #FFE0B2)',
          border: '1.5px solid #FFAB40',
          boxShadow: '0 2px 8px rgba(255,171,64,0.3)',
          animation: 'inboxPulse 2s ease-in-out infinite',
        }}
      >
        <i className="ti ti-mail" style={{ fontSize: 15, color: '#E65100' }} />
        <span style={{ fontSize: 11, fontFamily: "'Noto Sans Thai',sans-serif", color: '#E65100', fontWeight: 700 }}>
          อนุมัติ
        </span>
        <span style={{
          background: '#E65100', color: '#fff',
          borderRadius: '50%', width: 16, height: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 800,
        }}>
          {count}
        </span>
      </button>

      {/* Inbox bottom sheet */}
      {open && (
        <div style={{ position:'fixed',inset:0,zIndex:260,background:'rgba(33,58,88,0.5)',display:'flex',alignItems:'flex-end',justifyContent:'center' }} onClick={() => setOpen(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', borderRadius: '28px 28px 0 0',
              width: '100%', maxWidth: 480,
              padding: '0 0 calc(24px + env(safe-area-inset-bottom,0px)) 0',
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
              animation: 'slideUp .3s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {/* Sheet header */}
            <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--teal-border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#FF8C00,#FFB700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-mail" style={{ fontSize: 18, color: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontFamily:"'Outfit',sans-serif", fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
                    กล่องรออนุมัติ
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)', fontFamily:"'Space Mono',monospace" }}>
                    {count} รายการรอการพิจารณา
                  </div>
                </div>
              </div>
            </div>

            {/* Request list */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingRequests.map(req => {
                const emp = EMPLOYEES.find(e => e.id === req.employeeId);
                const reqTime = new Date(req.timestamp);
                const timeStr = reqTime.toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' });
                const dateStr = reqTime.toLocaleDateString('th-TH', { day:'2-digit', month:'short' });

                return (
                  <div key={req.id} style={{
                    background: 'var(--surface2)',
                    borderRadius: 18,
                    border: `1.5px solid ${modeColor(req.mode)}22`,
                    padding: '14px 16px',
                    boxShadow: '0 2px 8px rgba(33,58,88,0.06)',
                  }}>
                    {/* Request header */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <span style={{ fontSize: 18 }}>{modeIcon(req.mode)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', lineHeight: 1.3 }}>
                          {req.itemName}
                        </div>
                        <div style={{
                          display: 'inline-block',
                          background: `${modeColor(req.mode)}18`,
                          color: modeColor(req.mode),
                          borderRadius: 100, padding: '1px 8px',
                          fontSize: 10, fontWeight: 700, marginTop: 2,
                        }}>
                          {modeLabel(req.mode)} {req.qty} {req.unit}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 10, color: 'var(--txt3)', fontFamily:"'Space Mono',monospace" }}>{timeStr}</div>
                        <div style={{ fontSize: 10, color: 'var(--txt3)', fontFamily:"'Space Mono',monospace" }}>{dateStr}</div>
                      </div>
                    </div>

                    {/* Requester */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:req.note ? 8 : 12 }}>
                      {emp && <EmpMiniAvatar emp={emp} size={26} radius={8} />}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:'var(--txt2)' }}>
                          {emp?.displayName || req.employeeId}
                        </div>
                        <div style={{ fontSize:10, color:'var(--txt3)', fontFamily:"'Space Mono',monospace" }}>{req.employeeId}</div>
                      </div>
                    </div>

                    {/* PM Job */}
                    {req.pmJob && (
                      <div style={{ background:'rgba(9,209,199,0.07)', borderRadius:10, padding:'7px 10px', marginBottom:8, fontSize:11, color:'var(--teal)', borderLeft:'3px solid var(--teal)', display:'flex', alignItems:'center', gap:6 }}>
                        <i className="ti ti-tools" style={{ fontSize:12, flexShrink:0 }} />
                        <span style={{ fontFamily:"'Noto Sans Thai',sans-serif", fontWeight:600 }}>PM: {req.pmJob}</span>
                      </div>
                    )}

                    {/* Note */}
                    {req.note && (
                      <div style={{ background:'var(--surface)', borderRadius:10, padding:'7px 10px', marginBottom:12, fontSize:11, color:'var(--txt2)', borderLeft:'3px solid var(--teal-border)' }}>
                        💬 {req.note}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display:'flex', gap:8 }}>
                      <button
                        onClick={() => { onReject(req.id); }}
                        style={{
                          flex:1, padding:'10px 0', borderRadius:14,
                          border:'1.5px solid #FF4D4D44', background:'#FFF0F0',
                          color:'#CC2222', fontFamily:"'Noto Sans Thai',sans-serif",
                          fontSize:12, fontWeight:700, cursor:'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                        }}
                      >
                        <i className="ti ti-x" style={{ fontSize:13 }} /> ไม่อนุมัติ
                      </button>
                      <button
                        onClick={() => { onApprove(req.id); }}
                        style={{
                          flex:2, padding:'10px 0', borderRadius:14,
                          border:'none',
                          background:'linear-gradient(135deg,var(--teal),var(--mid-teal))',
                          color:'#fff', fontFamily:"'Noto Sans Thai',sans-serif",
                          fontSize:12, fontWeight:700, cursor:'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                          boxShadow:'0 3px 10px rgba(9,209,199,0.3)',
                        }}
                      >
                        <i className="ti ti-check" style={{ fontSize:13 }} /> อนุมัติ ✓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes inboxPulse {
          0%,100% { box-shadow: 0 2px 8px rgba(255,171,64,0.3); }
          50%      { box-shadow: 0 4px 16px rgba(255,171,64,0.6), 0 0 0 4px rgba(255,171,64,0.12); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity:0; }
          to   { transform: translateY(0);    opacity:1; }
        }
      `}</style>
    </>
  );
}

// ── ApprovalStatusBanner (shown to requester after submission) ─
function ApprovalStatusBanner({ pendingRequests, loggedInEmp }) {
  if (!loggedInEmp) return null;
  const myPending = pendingRequests.filter(r => r.employeeId === loggedInEmp.id);
  if (myPending.length === 0) return null;

  return (
    <div style={{
      margin:'12px 0 4px',
      background:'linear-gradient(135deg,#FFF8E1,#FFF3CD)',
      border:'1.5px solid #FFD54F',
      borderRadius:16,
      padding:'11px 14px',
      display:'flex', alignItems:'center', gap:10,
    }}>
      <div style={{ fontSize:20, flexShrink:0 }}>⏳</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#8B5000', fontFamily:"'Noto Sans Thai',sans-serif" }}>
          รอการอนุมัติ {myPending.length} รายการ
        </div>
        <div style={{ fontSize:10, color:'#A0650A', fontFamily:"'Space Mono',monospace", marginTop:1 }}>
          คำขอของคุณอยู่ระหว่างรอผู้มีอำนาจอนุมัติ
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
        {myPending.map(r => (
          <div key={r.id} style={{
            fontSize:10, color:'#E65100',
            background:'#FFF3E0', borderRadius:100, padding:'2px 8px',
            fontFamily:"'Noto Sans Thai',sans-serif", fontWeight:600,
          }}>
            {r.mode === 'withdraw' ? 'เบิก' : 'คืน'} {r.itemName} × {r.qty}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BottomNav ─────────────────────────────────────────────────
const NAV_LEFT  = [
  { key:'home',  icon:'ti-layout-grid',    label:'ภาพรวม' },
  { key:'log',   icon:'ti-list',           label:'Log' },
];
const NAV_RIGHT = [
  { key:'admin', icon:'ti-box',            label:'เพิ่มอุปกรณ์' },
  { key:'setup', icon:'ti-settings',       label:'ตั้งค่า' },
];

function BottomNav({ active, onGo }) {
  const isScanActive = active === 'scan';
  return (
    <div className="cin-bottom-nav" style={{
      position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
      width:'100%', maxWidth:480, zIndex:100,
      background:'rgba(255,255,255,0.95)',
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      borderTop:'1px solid var(--teal-border)',
      paddingBottom:'env(safe-area-inset-bottom,0px)',
    }}>
      <div style={{ display:'flex', alignItems:'flex-end', height:64 }}>
        {NAV_LEFT.map(n => {
          const isActive = active === n.key;
          return (
            <button key={n.key} onClick={() => onGo(n.key)} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              gap:3, padding:'10px 4px 8px', background:'none', border:'none',
              cursor:'pointer', color:isActive?'var(--teal)':'var(--txt3)',
              transition:'color 0.18s', position:'relative', height:'100%', justifyContent:'center',
            }}>
              {isActive && <div style={{ position:'absolute',top:0,left:'20%',right:'20%',height:2,background:'var(--teal)',borderRadius:2 }} />}
              <i className={`ti ${n.icon}`} style={{ fontSize:20 }} />
              <span style={{ fontSize:10, fontFamily:"'Noto Sans Thai',sans-serif", fontWeight:isActive?700:400 }}>{n.label}</span>
            </button>
          );
        })}

        {/* Center scan button */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', paddingBottom:6, position:'relative' }}>
          <button onClick={() => onGo('scan')} style={{
            width:62, height:62, borderRadius:'50%', border:'none',
            background:'linear-gradient(135deg,var(--teal),var(--mid-teal))',
            color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer',
            boxShadow: isScanActive
              ? '0 6px 24px rgba(9,209,199,0.55), 0 2px 8px rgba(9,209,199,0.3)'
              : '0 4px 18px rgba(9,209,199,0.4), 0 2px 6px rgba(9,209,199,0.2)',
            position:'relative', bottom: isScanActive ? 22 : 18,
            transition:'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
            transform: isScanActive ? 'scale(1.08)' : 'scale(1)',
            animation: isScanActive ? 'scanBtnPulse 2s ease-in-out infinite' : 'scanBtnFloat 3s ease-in-out infinite',
            outline: isScanActive ? '3px solid rgba(9,209,199,0.25)' : 'none',
            outlineOffset: 3,
          }}>
            <i className="ti ti-scan" style={{ fontSize:26 }} />
          </button>
          <span style={{
            fontSize:10, fontFamily:"'Noto Sans Thai',sans-serif",
            fontWeight: isScanActive ? 700 : 400,
            color: isScanActive ? 'var(--teal)' : 'var(--txt3)',
            marginTop:-2, lineHeight:1,
          }}>สแกน/เบิก</span>
        </div>

        {NAV_RIGHT.map(n => {
          const isActive = active === n.key;
          return (
            <button key={n.key} onClick={() => onGo(n.key)} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              gap:3, padding:'10px 4px 8px', background:'none', border:'none',
              cursor:'pointer', color:isActive?'var(--teal)':'var(--txt3)',
              transition:'color 0.18s', position:'relative', height:'100%', justifyContent:'center',
            }}>
              {isActive && <div style={{ position:'absolute',top:0,left:'20%',right:'20%',height:2,background:'var(--teal)',borderRadius:2 }} />}
              <i className={`ti ${n.icon}`} style={{ fontSize:20 }} />
              <span style={{ fontSize:10, fontFamily:"'Noto Sans Thai',sans-serif", fontWeight:isActive?700:400 }}>{n.label}</span>
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes scanBtnPulse {
          0%,100% { box-shadow: 0 6px 24px rgba(9,209,199,0.55), 0 2px 8px rgba(9,209,199,0.3); }
          50%      { box-shadow: 0 8px 30px rgba(9,209,199,0.75), 0 2px 12px rgba(9,209,199,0.4); }
        }
        @keyframes scanBtnFloat {
          0%,100% { transform: scale(1) translateY(0px); }
          50%      { transform: scale(1) translateY(-2px); }
        }
      `}</style>
    </div>
  );
}

// ── TopBar ────────────────────────────────────────────────────
function TopBar({ syncStatus, onSync, onOpenDirectory, loggedInEmp, pendingRequests, isApprover, onApprove, onReject }) {
  const s = STATUS_MAP[syncStatus] || STATUS_MAP.none;
  return (
    <div className="cin-topbar-wrap" style={{ padding:'16px 16px 0',display:'flex',flexDirection:'column',gap:8 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:8 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ background:'var(--navy)',color:'#fff',fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:13,padding:'5px 14px',borderRadius:100,letterSpacing:'0.3px',boxShadow:'0 2px 8px rgba(33,58,88,0.18)' }}>Stock</div>
          <span style={{ fontSize:11,color:'var(--txt3)',fontFamily:"'Space Mono',monospace",letterSpacing:'.5px' }}>IDC3</span>
          <button className="emp-link-btn" onClick={onOpenDirectory}>
            <i className="ti ti-users" style={{ fontSize:12 }} /> พนักงาน
          </button>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Approval inbox bell for approvers */}
          <ApprovalInbox
            pendingRequests={pendingRequests}
            isApprover={isApprover}
            onApprove={onApprove}
            onReject={onReject}
          />
          <div onClick={onSync} style={{ display:'flex',alignItems:'center',gap:6,cursor:'pointer',padding:'6px 12px',borderRadius:100,background:'var(--surface)',border:'1px solid var(--teal-border)',boxShadow:'var(--shadow-sm)',flexShrink:0 }}>
            <div style={{ width:7,height:7,borderRadius:'50%',background:s.color,flexShrink:0 }} />
            <span style={{ fontSize:11,color:s.color,fontFamily:"'Space Mono',monospace" }}>{s.text}</span>
          </div>
        </div>
      </div>

      {loggedInEmp && (
        <div style={{ display:'flex',alignItems:'center',gap:10,background:'linear-gradient(135deg,var(--navy),var(--deep-teal))',borderRadius:14,padding:'9px 14px' }}>
          <EmpMiniAvatar emp={loggedInEmp} size={34} radius={10} />
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:12,fontWeight:600,color:'#fff',lineHeight:1.3 }}>{loggedInEmp.displayName}</div>
            <div style={{ fontSize:10,color:'rgba(255,255,255,0.5)',fontFamily:"'Space Mono',monospace",marginTop:1 }}>{loggedInEmp.id}</div>
          </div>
          {isApprover && (
            <div style={{ background:'linear-gradient(135deg,#FFB700,#FF8C00)', borderRadius:100, padding:'3px 10px', fontSize:10, fontWeight:800, color:'#fff', fontFamily:"'Noto Sans Thai',sans-serif" }}>
              👑 Approver
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── PinModal ──────────────────────────────────────────────────
function PinModal({ target, correctPin, onSuccess, onClose }) {
  const [pin,   setPin]   = useState('');
  const [error, setError] = useState('');
  function submit() {
    if (pin === correctPin) { onSuccess(target); }
    else { setError('PIN ไม่ถูกต้อง'); setPin(''); }
  }
  return (
    <div className="cin-pin-overlay" style={{ position:'fixed',inset:0,zIndex:250,background:'rgba(33,58,88,0.45)',display:'flex',alignItems:'flex-end',justifyContent:'center' }}>
      <div className="cin-pin-sheet" style={{ background:'var(--surface)',borderRadius:'28px 28px 0 0',padding:28,width:'100%',maxWidth:480,paddingBottom:'calc(28px + env(safe-area-inset-bottom,0px))' }}>
        <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:800,color:'var(--txt)',marginBottom:6 }}>🔐 ยืนยัน PIN</div>
        <div style={{ fontSize:13,color:'var(--txt2)',marginBottom:20 }}>{target === 'restock' ? 'ปลดล็อคโหมดเติม Stock' : 'เข้าสู่โหมด ' + (target === 'admin' ? 'Admin' : 'ตั้งค่า')}</div>
        <input
          type="password" inputMode="numeric" maxLength={10} value={pin}
          onChange={e => { setPin(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="กรอก PIN"
          style={{ width:'100%',padding:'14px 16px',borderRadius:16,border:'2px solid var(--teal-border)',background:'var(--surface2)',fontFamily:"'Space Mono',monospace",fontSize:20,letterSpacing:6,outline:'none',textAlign:'center',marginBottom:12 }}
          autoFocus
        />
        <div style={{ textAlign:'center',color:'#e03030',fontSize:12,marginTop:4,minHeight:18 }}>{error}</div>
        <button onClick={submit} style={{ width:'100%',padding:14,borderRadius:20,border:'none',background:'linear-gradient(135deg,var(--teal),var(--mid-teal))',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:15,fontWeight:700,cursor:'pointer',marginTop:8,boxShadow:'0 4px 14px rgba(9,209,199,0.3)' }}>ยืนยัน</button>
        <button onClick={onClose} style={{ width:'100%',padding:13,borderRadius:20,marginTop:10,border:'1.5px solid var(--teal-border)',background:'var(--surface)',color:'var(--txt2)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:15,fontWeight:600,cursor:'pointer' }}>ยกเลิก</button>
      </div>
    </div>
  );
}

// ── CameraOverlay ─────────────────────────────────────────────
function CameraOverlay({ onScan, onClose }) {
  const videoRef  = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const rafRef    = React.useRef(null);
  const [status, setStatus] = useState('กำลังเปิดกล้อง...');

  useEffect(() => {
    let lastScan = 0, active = true;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setStatus('พร้อมสแกน ✓');
        scanLoop();
      } catch { setStatus('❌ ไม่สามารถเปิดกล้องได้'); setTimeout(onClose, 2000); }
    }

    function scanLoop() {
      const video = videoRef.current, canvas = canvasRef.current;
      if (!video || !canvas) return;
      const ctx = canvas.getContext('2d');
      function tick() {
        if (!active) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth; canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const now = Date.now();
          if (now - lastScan > 300) {
            lastScan = now;
            try {
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = window.jsQR?.(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
              if (code?.data) { active = false; onScan(code.data.trim()); return; }
            } catch { }
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    start();
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div style={{ position:'fixed',inset:0,zIndex:100,background:'#000',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%',maxWidth:390,height:'100%',objectFit:'cover',position:'absolute',inset:0 }} />
      <canvas ref={canvasRef} style={{ display:'none' }} />
      <button onClick={onClose} style={{ position:'absolute',top:48,right:16,zIndex:20,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',color:'#fff',borderRadius:'50%',width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,cursor:'pointer',backdropFilter:'blur(10px)' }}>
        <i className="ti ti-x" />
      </button>
      <div style={{ position:'relative',zIndex:10,display:'flex',flexDirection:'column',alignItems:'center',gap:16,width:'100%' }}>
        <div style={{ width:240,height:240,borderRadius:20,position:'relative',boxShadow:'0 0 0 2000px rgba(33,58,88,0.6)' }}>
          {[{top:0,left:0,borderWidth:'3px 0 0 3px',borderRadius:'10px 0 0 0'},{top:0,right:0,borderWidth:'3px 3px 0 0',borderRadius:'0 10px 0 0'},{bottom:0,left:0,borderWidth:'0 0 3px 3px',borderRadius:'0 0 0 10px'},{bottom:0,right:0,borderWidth:'0 3px 3px 0',borderRadius:'0 0 10px 0'}].map((s,i)=><div key={i} style={{ position:'absolute',width:44,height:44,borderColor:'var(--teal)',borderStyle:'solid',...s }} />)}
          <div style={{ position:'absolute',left:4,right:4,height:2,background:'linear-gradient(90deg,transparent,var(--teal),transparent)',animation:'scanLine 2s ease-in-out infinite' }} />
        </div>
        <div style={{ color:'rgba(255,255,255,0.7)',fontSize:13,textAlign:'center' }}>วาง QR Code ให้อยู่ในกรอบ</div>
        <div style={{ color:'#fff',fontFamily:"'Space Mono',monospace",fontSize:11,textAlign:'center',minHeight:16 }}>{status}</div>
      </div>
      <button onClick={onClose} style={{ position:'absolute',bottom:100,left:'50%',transform:'translateX(-50%)',zIndex:20,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',color:'#fff',borderRadius:100,padding:'10px 24px',fontSize:13,fontFamily:"'Noto Sans Thai',sans-serif",cursor:'pointer',backdropFilter:'blur(10px)',whiteSpace:'nowrap' }}>⌨ พิมพ์รหัสแทน</button>
    </div>
  );
}

// ── Main StockScan component ──────────────────────────────────
import React from 'react';
import { LoginBackground, CinParticles } from '../../components/ui/CinBackground.jsx';

export default function StockScan({ user }) {
  const [loggedInEmp,     setLoggedInEmp]     = useState(() => user ? EMPLOYEES.find(e => e.id === user.id) || null : null);
  const [needChangePw,    setNeedChangePw]    = useState(false);
  const [authData,        setAuthData]        = useState(loadAuthCache);
  const [items,           setItems]           = useState(() => normalizeItems(loadLocal('ss_items', [])));
  const [logs,            setLogs]            = useState(() => normalizeLogs(loadLocal('ss_logs', [])));
  const [cfg,             setCfg]             = useState(() => { const c = loadLocal('ss_cfg', {}); if (!c.url) c.url = DEFAULT_GAS_URL; return c; });
  const [activePage,      setActivePage]      = useState('home');
  const [curItem,         setCurItem]         = useState(null);
  const [setupUnlocked,   setSetupUnlocked]   = useState(false);
  const [isSyncing,       setIsSyncing]       = useState(false);
  const [syncStatus,      setSyncStatus]      = useState('none');
  const [authSynced,      setAuthSynced]      = useState(() => !!user || Object.keys(loadAuthCache()).length > 0);
  const [syncFailed,      setSyncFailed]      = useState(false);
  const [pinTarget,       setPinTarget]       = useState(null);
  const [showCamera,      setShowCamera]      = useState(false);
  const [showDirectory,   setShowDirectory]   = useState(false);
  const [toast,           setToast]           = useState(null);
  // ── Approval state ──────────────────────────────────────────
  const [pendingRequests, setPendingRequests] = useState(loadPending);
  // ── PM Job selection ────────────────────────────────────────
  const [pmJob, setPmJob] = useState('');

  const isApprover = loggedInEmp ? APPROVER_IDS.includes(loggedInEmp.id) : false;

  const showToast = useCallback((msg, color) => {
    setToast({ msg, color: color || '#213A58' });
    setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => { saveAuthCache(authData); }, [authData]);
  useEffect(() => { saveLocal('ss_items', items); }, [items]);
  useEffect(() => { saveLocal('ss_logs', logs); }, [logs]);
  useEffect(() => { saveLocal('ss_cfg', cfg); }, [cfg]);
  useEffect(() => { savePending(pendingRequests); }, [pendingRequests]);
  useEffect(() => { syncData(); }, [cfg.url]);
  useEffect(() => { if (loggedInEmp) syncData(); }, [loggedInEmp]);

  // ── Auto-poll pending requests ────────────────────────────────
  // poll ทุก 30 วินาที เพื่อให้ Approver เห็นกระดิ่งใหม่โดยไม่ต้อง refresh
  useEffect(() => {
    if (!cfg.url || !loggedInEmp) return;

    async function pollPending() {
      try {
        const d = await gasGet(cfg.url);
        if (Array.isArray(d?.pendingRequests)) {
          setPendingRequests(normalizePending(d.pendingRequests));
        }
      } catch { /* silent fail — ไม่กระทบ UI */ }
    }

    const timer = setInterval(pollPending, 30000); // ทุก 30 วินาที

    // poll ทันทีเมื่อ tab กลับมา visible (เช่น สลับแท็บ หรือปลดล็อคมือถือ)
    function onVisible() {
      if (document.visibilityState === 'visible') pollPending();
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [cfg.url, loggedInEmp]);

  function handleAuthUpdate(empId, record) { setAuthData(prev => ({ ...prev, [empId]: record })); }

  async function syncData() {
    if (!cfg.url) { setSyncStatus('none'); return; }
    setIsSyncing(true); setSyncStatus('syncing');
    let ok = false;
    try {
      const d = await gasGet(cfg.url);
      if (d?.items) { setItems(normalizeItems(d.items)); setLogs(normalizeLogs(d.logs || [])); }
      if (d?.auth && typeof d.auth === 'object') {
        setAuthData(prev => { const m = { ...prev, ...d.auth }; saveAuthCache(m); return m; });
      }
      // ── sync pending requests จาก GAS (ทำให้ Approver เห็นกระดิ่ง) ──
      if (Array.isArray(d?.pendingRequests)) {
        setPendingRequests(normalizePending(d.pendingRequests));
      }
      setSyncStatus('ok'); ok = true;
    } catch { }
    if (!ok) { setSyncStatus('error'); if (!authSynced) setSyncFailed(true); }
    else { setSyncFailed(false); setAuthSynced(true); }
    setIsSyncing(false);
  }

  // ── Auth guard ───────────────────────────────────────────────
  const hasCachedAuth = Object.keys(authData).length > 0;

  if (!loggedInEmp) {
    if (!authSynced && !(syncFailed && hasCachedAuth)) {
      return (
        <LoginBackground>
          {syncFailed ? (
            <div style={{ zIndex:5,textAlign:'center',color:'#fff',padding:'0 32px' }}>
              <div style={{ fontSize:44,marginBottom:14 }}>⚠️</div>
              <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:'1.3rem',fontWeight:800,marginBottom:8 }}>เชื่อมต่อไม่ได้</div>
              <div style={{ color:'rgba(255,255,255,0.65)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:'0.85rem',marginBottom:24,lineHeight:1.6 }}>ไม่สามารถดึงข้อมูลจาก Server ได้</div>
              <button onClick={() => { setSyncFailed(false); syncData(); }} style={{ padding:'13px 32px',borderRadius:14,border:'none',background:'linear-gradient(135deg,rgba(255,255,255,0.95),rgba(220,248,246,0.95))',color:'#0C5060',fontFamily:"'Prompt',sans-serif",fontWeight:700,fontSize:'1rem',cursor:'pointer' }}>🔄 ลองใหม่</button>
            </div>
          ) : (
            <div style={{ zIndex:5,textAlign:'center',color:'#fff' }}>
              <div style={{ fontSize:40,marginBottom:16 }}>📦</div>
              <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:'1.4rem',fontWeight:800,letterSpacing:'1.5px',marginBottom:10 }}>INET-IDC3</div>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:10,color:'rgba(255,255,255,0.7)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:'0.9rem' }}>
                <span style={{ display:'inline-block',width:16,height:16,border:'2px solid rgba(9,209,199,0.8)',borderTopColor:'transparent',borderRadius:'50%',animation:'scanLine 0.8s linear infinite' }} />
                กำลังโหลดข้อมูลจากระบบ...
              </div>
            </div>
          )}
        </LoginBackground>
      );
    }
    return <SSLoginScreen authData={authData} isSyncing={isSyncing} onLogin={(emp, isFirst) => { setLoggedInEmp(emp); setNeedChangePw(isFirst); }} />;
  }

  if (needChangePw) return <SSChangePwScreen emp={loggedInEmp} gasUrl={cfg.url} onAuthUpdate={handleAuthUpdate} onDone={() => setNeedChangePw(false)} />;

  function handleLogout() { if (!window.confirm('ต้องการออกจากระบบ?')) return; window.closeApp?.(); }
  function requestAdminAccess()   { setActivePage('admin');  if (!setupUnlocked) setPinTarget('admin'); }
  function requestSetupAccess()   { setActivePage('setup');  if (!setupUnlocked) setPinTarget('setup'); }
  function requestRestockAccess() { setPinTarget('restock'); }

  function onPinSuccess(target) {
    setSetupUnlocked(true); setPinTarget(null);
    if (target === 'restock') showToast('✓ ปลดล็อคโหมดเติม Stock แล้ว');
    else if (target === 'setup') showToast('✓ เข้าสู่หน้าตั้งค่าแล้ว');
    else showToast('✓ เข้าสู่โหมด Admin แล้ว');
  }

  function lockAdmin() { setSetupUnlocked(false); showToast('🔒 ล็อคการตั้งค่า/Admin แล้ว'); setActivePage('home'); }

  function scanItem(code) {
    const it = items.find(x => x.id === code);
    if (!it) { showToast('ไม่เจอ QR นี้ในระบบ ❌', '#FF4D4D'); return; }
    setPmJob(''); // reset PM job selection for new scan
    setCurItem(it); setActivePage('scan');
  }

  // ── Confirm action: Approver → direct commit, others → pending ──
  async function confirmAction(mode, _empObj, qty, note) {
    if (!curItem) return;
    if (qty < 1) { showToast('จำนวนต้องมากกว่า 0', '#FFB700'); return; }
    if (mode === 'withdraw' && qty > curItem.stock) { showToast('จำนวนเกินสต๊อก ❌', '#FF4D4D'); return; }

    const emp = loggedInEmp;
    const snap = { ...curItem };
    const jobSnap = pmJob; // capture current PM job
    const modeLabel = mode === 'withdraw' ? 'เบิก' : mode === 'return' ? 'คืน' : 'เติม Stock';

    // Restock (mode==='restock') or Approver → execute immediately
    if (mode === 'restock' || isApprover) {
      await _executeAction(mode, emp, qty, note, snap, jobSnap);
      return;
    }

    // withdraw / return → create pending request
    setCurItem(null);
    setPmJob('');
    const newReq = {
      id: uid(),
      timestamp: nowISO(),
      mode,
      itemId: snap.id,
      itemName: snap.name,
      itemCat: snap.cat,
      qty,
      unit: snap.unit,
      employeeId: emp.id,
      employeeName: emp.displayName || emp.name,
      note: note || '',
      pmJob: jobSnap || '',
    };
    setPendingRequests(prev => [...prev, newReq]);
    showToast(`📨 ส่งคำขอ${modeLabel} "${snap.name}" ${qty} ${snap.unit} รอการอนุมัติ...`, '#FFB700');
    // ── ส่งขึ้น GAS เพื่อให้ Approver เห็นกระดิ่ง ──
    if (cfg.url) {
      try { await gasPost(cfg.url, { action: 'add_pending', request: newReq }); }
      catch { /* ถ้าส่งไม่ได้ก็เก็บ local ไว้ก่อน */ }
    }
  }

  // ── Execute the action (after approval or direct) ──────────────
  async function _executeAction(mode, emp, qty, note, snap, jobLabel) {
    const ts = nowISO();
    const modeLabel = mode === 'withdraw' ? 'เบิก' : mode === 'return' ? 'คืน' : 'เติม Stock';
    const toastColor = mode === 'withdraw' ? '#213A58' : mode === 'return' ? '#4A90D9' : 'var(--mid-teal)';
    const fullNote = [note, jobLabel ? `PM: ${jobLabel}` : ''].filter(Boolean).join(' | ');

    setItems(prev => prev.map(x => x.id !== snap.id ? x : {
      ...x,
      stock: mode === 'withdraw' ? x.stock - qty : x.stock + qty,
    }));
    setLogs(prev => [{ timestamp:ts, qr_id:snap.id, item_name:snap.name, cat:snap.cat, quantity:qty, unit:snap.unit, employee:emp.id, note:fullNote, action:mode, pm_job:jobLabel||'' }, ...prev]);
    setCurItem(null);
    setPmJob('');
    showToast(`${modeLabel} "${snap.name}" ${qty} ${snap.unit} สำเร็จ ✓`, toastColor);
    if (cfg.url) {
      try {
        await gasPost(cfg.url, { action:mode, timestamp:ts, qr_id:snap.id, item_name:snap.name, category:snap.cat, quantity:qty, unit:snap.unit, employee:emp.id, employee_name:emp.displayName||emp.name, employee_id:emp.id, note:fullNote, pm_job:jobLabel||'' });
        setTimeout(syncData, 1000);
      } catch { showToast('บันทึกในเครื่องแล้ว (ส่งไป Sheet ไม่ได้)', '#FFB700'); }
    } else { showToast('บันทึกในเครื่องแล้ว (ยังไม่ได้เชื่อม Sheet)', '#FFB700'); }
  }

  // ── Approve a pending request ──────────────────────────────────
  async function handleApprove(reqId) {
    const req = pendingRequests.find(r => r.id === reqId);
    if (!req) return;
    const item = items.find(x => x.id === req.itemId);
    if (!item) { showToast('ไม่พบอุปกรณ์ในระบบ', '#FF4D4D'); return; }
    if (req.mode === 'withdraw' && req.qty > item.stock) {
      showToast(`สต๊อก "${item.name}" ไม่พอ (เหลือ ${item.stock} ${item.unit}) ❌`, '#FF4D4D');
      return;
    }
    const requesterEmp = EMPLOYEES.find(e => e.id === req.employeeId) || { id: req.employeeId, displayName: req.employeeName, name: req.employeeName };
    setPendingRequests(prev => prev.filter(r => r.id !== reqId));
    await _executeAction(req.mode, requesterEmp, req.qty, req.note, item, req.pmJob || '');
    showToast(`✅ อนุมัติ${req.mode === 'withdraw' ? 'เบิก' : 'คืน'} "${req.itemName}" ให้ ${req.employeeName} แล้ว`, 'var(--teal)');
    // ── ลบออกจาก GAS ──
    if (cfg.url) {
      try { await gasPost(cfg.url, { action: 'remove_pending', id: reqId }); }
      catch { /* ไม่ critical */ }
      setTimeout(syncData, 800);
    }
  }

  // ── Reject a pending request ──────────────────────────────────
  async function handleReject(reqId) {
    const req = pendingRequests.find(r => r.id === reqId);
    if (!req) return;
    setPendingRequests(prev => prev.filter(r => r.id !== reqId));
    showToast(`❌ ปฏิเสธคำขอ${req.mode === 'withdraw' ? 'เบิก' : 'คืน'} "${req.itemName}" ของ ${req.employeeName} แล้ว`, '#FF4D4D');
    // ── ลบออกจาก GAS ──
    if (cfg.url) {
      try { await gasPost(cfg.url, { action: 'remove_pending', id: reqId }); }
      catch { /* ไม่ critical */ }
      setTimeout(syncData, 800);
    }
  }

  async function addItem(formData) {
    if (!cfg.url) { showToast('กรุณาตั้งค่า GAS URL ก่อน ⚠', '#FFB700'); return; }
    const { name, cat, stock, unit, min, icon, count } = formData;
    if (!name) { showToast('ใส่ชื่ออุปกรณ์ด้วยนะ ⚠', '#FFB700'); return; }
    const cnt = Math.max(1, parseInt(count) || 1);
    const newItems = Array.from({ length: cnt }, () => ({ id: uid(), name, cat, stock: parseInt(stock)||0, unit: unit||'อัน', min: parseInt(min)||10, icon: icon||'📦' }));
    showToast(`กำลังบันทึก "${name}" ${cnt} ชิ้น ☁...`);
    try { await gasPost(cfg.url, { action: 'add_items', items: newItems }); showToast(`บันทึก "${name}" สำเร็จ ✓`); await syncData(); }
    catch { showToast('มีปัญหาการส่งไป Sheet', '#FF4D4D'); }
  }

  async function delItem(id) {
    if (!window.confirm('ยืนยันการลบอุปกรณ์นี้?')) return;
    if (!cfg.url) { showToast('ยังไม่ได้เชื่อม Sheet', '#FFB700'); return; }
    try { await gasPost(cfg.url, { action: 'delete_item', id }); showToast('ลบแล้ว ✓'); await syncData(); }
    catch { showToast('ลบไม่สำเร็จ', '#FF4D4D'); }
  }

  function saveSettings(url) { setCfg(c => ({ ...c, url })); setTimeout(syncData, 200); }

  function goNav(key) {
    if (key === 'admin') { requestAdminAccess(); return; }
    if (key === 'setup') { requestSetupAccess(); return; }
    setActivePage(key);
  }

  return (
    <div style={{ fontFamily:"'Noto Sans Thai',sans-serif",background:'var(--bg)',color:'var(--txt)',maxWidth:480,margin:'0 auto',minHeight:'100%',width:'100%',overflowX:'hidden',paddingBottom:88 }}>
      <TopBar
        syncStatus={syncStatus}
        onSync={syncData}
        onOpenDirectory={() => setShowDirectory(true)}
        loggedInEmp={loggedInEmp}
        pendingRequests={pendingRequests}
        isApprover={isApprover}
        onApprove={handleApprove}
        onReject={handleReject}
      />
      <div style={{ padding:'0 14px' }}>
        {/* Pending status banner for non-approvers */}
        {!isApprover && <ApprovalStatusBanner pendingRequests={pendingRequests} loggedInEmp={loggedInEmp} />}

        {activePage === 'home'  && <PageHome  items={items} logs={logs} onGoScan={() => setActivePage('scan')} />}
        {activePage === 'scan'  && <>
          {/* PM Job picker — shown only when an item is loaded (withdraw/return context) */}
          {curItem && (
            <div style={{ marginTop:12, marginBottom:4 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--txt2)', fontFamily:"'Noto Sans Thai',sans-serif", marginBottom:5, display:'flex', alignItems:'center', gap:5 }}>
                <i className="ti ti-tools" style={{ fontSize:11 }} />
                งาน PM (Preventive Maintenance)
              </div>
              <PMJobPicker value={pmJob} onChange={setPmJob} />
            </div>
          )}
          <PageScan  items={items} curItem={curItem} onScan={scanItem} onConfirm={confirmAction} onCancel={() => { setCurItem(null); setPmJob(''); }} onOpenCamera={() => setShowCamera(true)} loggedInEmp={loggedInEmp} setupUnlocked={setupUnlocked} onUnlockRestock={requestRestockAccess} pmJob={pmJob} onPmJobChange={setPmJob} renderPmPicker={() => <PMJobPicker value={pmJob} onChange={setPmJob} />} />
        </>}
        {activePage === 'log'   && <PageLog   logs={logs} items={items} onSync={syncData} />}
        {activePage === 'admin' && <PageAdmin items={items} setupUnlocked={setupUnlocked} onAddItem={addItem} onDelItem={delItem} onLock={lockAdmin} onUnlock={requestAdminAccess} />}
        {activePage === 'setup' && <PageSetup cfg={cfg} setupUnlocked={setupUnlocked} onSave={saveSettings} onSync={syncData} onLock={lockAdmin} onUnlock={requestSetupAccess} />}
      </div>
      <BottomNav active={activePage} onGo={goNav} />
      {pinTarget && <PinModal target={pinTarget} correctPin={SECURE_PIN} onSuccess={() => onPinSuccess(pinTarget)} onClose={() => { setPinTarget(null); if (!setupUnlocked && pinTarget !== 'restock') setActivePage('home'); }} />}
      {showCamera && <CameraOverlay onScan={code => { setShowCamera(false); scanItem(code); }} onClose={() => setShowCamera(false)} />}
      <EmployeeDirectory isOpen={showDirectory} onClose={() => setShowDirectory(false)} selectMode={false} />
      <Toast toast={toast} />
    </div>
  );
}

// ── In-app login (StockScan-specific) ────────────────────────
function SSLoginScreen({ authData, isSyncing, onLogin }) {
  const [empId, setEmpId] = useState('');
  const [pin,   setPin]   = useState('');
  const [error, setError] = useState('');

  function hashPin(p) {
    let h = 2166136261;
    for (let i = 0; i < p.length; i++) { h ^= p.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }
  function defaultPw(id) { return id.replace(/[A-Za-z]/g, ''); }

  function submit() {
    setError('');
    const id = empId.trim();
    if (!id || !pin) { setError('กรอกรหัสพนักงานและรหัสผ่านด้วย'); return; }
    const record  = authData[id];
    const isFirst = !record || !record.changed;
    if (isFirst) {
      if (pin !== defaultPw(id)) { setError('รหัสผ่านไม่ถูกต้อง\n(ครั้งแรก: ใช้ตัวเลขจากรหัสพนักงาน)'); return; }
    } else {
      if (hashPin(pin) !== record.hash) { setError('รหัสผ่านไม่ถูกต้อง'); return; }
    }
    const emp = EMPLOYEES.find(e => e.id === id);
    if (emp) onLogin(emp, isFirst);
    else setError('ไม่พบพนักงานในระบบ');
  }

  const IS = { width:'100%',padding:'13px 14px',borderRadius:14,border:'1.5px solid var(--teal-border)',background:'var(--surface)',fontFamily:"'Space Mono','Noto Sans Thai',sans-serif",fontSize:14,outline:'none',color:'var(--txt)' };

  return (
    <div style={{ padding:'40px 20px',maxWidth:360,margin:'0 auto' }}>
      <div style={{ textAlign:'center',marginBottom:32 }}>
        <div style={{ fontSize:48,marginBottom:12 }}>📦</div>
        <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:'1.5rem',fontWeight:800,color:'var(--navy)' }}>StockScan</div>
        <div style={{ fontSize:12,color:'var(--txt3)' }}>INET IDC-3</div>
      </div>
      {error && <div style={{ background:'#FFF0F0',border:'1px solid #FFB0B0',borderRadius:12,padding:'10px 14px',color:'#CC3333',fontSize:13,marginBottom:16,textAlign:'center' }}>{error}</div>}
      <label style={{ fontSize:12,color:'var(--txt2)',display:'block',marginBottom:6 }}>รหัสพนักงาน</label>
      <input value={empId} onChange={e => setEmpId(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="OD1100000" style={{ ...IS, marginBottom:12 }} />
      <label style={{ fontSize:12,color:'var(--txt2)',display:'block',marginBottom:6 }}>รหัสผ่าน</label>
      <input value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} type="password" placeholder="ตัวเลข 6 หลัก" inputMode="numeric" style={{ ...IS, marginBottom:20 }} />
      <button onClick={submit} style={{ width:'100%',padding:14,borderRadius:16,border:'none',background:'linear-gradient(135deg,var(--teal),var(--mid-teal))',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:15,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 16px rgba(9,209,199,0.3)' }}>เข้าสู่ระบบ →</button>
    </div>
  );
}

function SSChangePwScreen({ emp, gasUrl, onAuthUpdate, onDone }) {
  const [old_, setOld] = useState('');
  const [nw,   setNw]  = useState('');
  const [cf,   setCf]  = useState('');
  const [err,  setErr] = useState('');
  const IS = { width:'100%',padding:'13px 14px',borderRadius:14,border:'1.5px solid var(--teal-border)',background:'var(--surface)',fontFamily:"'Space Mono',monospace",fontSize:14,outline:'none',color:'var(--txt)',marginBottom:14 };

  async function submit() {
    setErr('');
    if (nw.length < 6)   { setErr('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัว'); return; }
    if (nw !== cf)        { setErr('รหัสผ่านไม่ตรงกัน'); return; }
    if (!gasUrl)          { setErr('ยังไม่ได้ตั้งค่า GAS URL'); return; }
    try {
      const res = await gasPost(gasUrl, { action:'change_password', emp_id:emp.id, old_pin:old_, new_pin:nw });
      if (res?.ok) { onAuthUpdate(emp.id, res.record); onDone(); }
      else setErr(res?.reason || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } catch { setErr('เชื่อมต่อ GAS ไม่ได้'); }
  }

  return (
    <div style={{ padding:'40px 20px',maxWidth:360,margin:'0 auto' }}>
      <div style={{ textAlign:'center',marginBottom:28 }}>
        <div style={{ fontSize:40,marginBottom:10 }}>🔑</div>
        <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:'1.3rem',fontWeight:800,color:'var(--navy)' }}>ตั้งรหัสผ่านใหม่</div>
        <div style={{ fontSize:12,color:'var(--txt3)',marginTop:4 }}>ครั้งแรกที่เข้าใช้งาน กรุณาตั้งรหัสผ่านของคุณ</div>
      </div>
      {err && <div style={{ background:'#FFF0F0',border:'1px solid #FFB0B0',borderRadius:12,padding:'10px 14px',color:'#CC3333',fontSize:13,marginBottom:16,textAlign:'center' }}>{err}</div>}
      <label style={{ fontSize:12,color:'var(--txt2)',display:'block',marginBottom:6 }}>รหัสผ่านเดิม (ตัวเลขจากรหัสพนักงาน)</label>
      <input value={old_} onChange={e => setOld(e.target.value)} type="password" inputMode="numeric" style={IS} />
      <label style={{ fontSize:12,color:'var(--txt2)',display:'block',marginBottom:6 }}>รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</label>
      <input value={nw} onChange={e => setNw(e.target.value)} type="password" inputMode="numeric" style={IS} />
      <label style={{ fontSize:12,color:'var(--txt2)',display:'block',marginBottom:6 }}>ยืนยันรหัสผ่านใหม่</label>
      <input value={cf} onChange={e => setCf(e.target.value)} onKeyDown={e => e.key==='Enter'&&submit()} type="password" inputMode="numeric" style={IS} />
      <button onClick={submit} style={{ width:'100%',padding:14,borderRadius:16,border:'none',background:'linear-gradient(135deg,var(--teal),var(--mid-teal))',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:15,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 16px rgba(9,209,199,0.3)' }}>บันทึกรหัสผ่านใหม่</button>
    </div>
  );
}
