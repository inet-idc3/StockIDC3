// PageLog.jsx — Transaction history with search + filter
import { useState, useMemo } from 'react';
import { displayTs, fuzzyMatch } from '../../../services/gasService.js';

export default function PageLog({ logs, items, onSync }) {
  const [q,      setQ]      = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    return logs.filter(l => {
      const mF = filter === 'all' || l.action === filter;
      const mQ = !q || fuzzyMatch(l.item_name + ' ' + l.employee + ' ' + l.qr_id, q);
      return mF && mQ;
    });
  }, [logs, q, filter]);

  const IS = { padding:'10px 14px 10px 36px',borderRadius:12,border:'1.5px solid var(--teal-border)',background:'var(--surface)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:13,outline:'none',color:'var(--txt)',width:'100%',boxShadow:'var(--shadow-sm)' };

  return (
    <div style={{ paddingTop:16 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
        <div style={{ fontWeight:700,fontSize:14,color:'var(--txt)' }}>🕒 ประวัติการเบิก</div>
        <button onClick={onSync} style={{ padding:'7px 14px',borderRadius:100,border:'1px solid var(--teal-border)',background:'var(--surface)',color:'var(--mid-teal)',fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:5 }}>
          <i className="ti ti-refresh" style={{ fontSize:13 }} /> รีเฟรช
        </button>
      </div>

      <div style={{ position:'relative',marginBottom:10 }}>
        <i className="ti ti-search" style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'var(--txt3)',pointerEvents:'none' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาชื่ออุปกรณ์ พนักงาน QR ID…" style={IS} />
      </div>

      <div style={{ display:'flex',gap:6,marginBottom:14,overflowX:'auto',scrollbarWidth:'none' }}>
        {[{key:'all',label:'ทั้งหมด'},{key:'withdraw',label:'📤 เบิก'},{key:'return',label:'📥 คืน'},{key:'restock',label:'📦 เติม'}].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding:'6px 14px',borderRadius:100,border:'1.5px solid',borderColor:filter===f.key?'var(--teal)':'var(--teal-border)',background:filter===f.key?'var(--teal)':'var(--surface)',color:filter===f.key?'#fff':'var(--txt2)',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.15s' }}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize:11,color:'var(--txt3)',marginBottom:10 }}>{filtered.length} รายการ</div>

      {filtered.length === 0
        ? <div style={{ textAlign:'center',padding:'40px 20px',color:'var(--txt3)' }}><div style={{ fontSize:40,marginBottom:10 }}>🔍</div>ไม่พบประวัติ</div>
        : <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {filtered.map((l, i) => {
              const color = l.action==='withdraw'?'var(--navy)':l.action==='return'?'#4A90D9':'var(--mid-teal)';
              return (
                <div key={i} style={{ background:'var(--surface)',borderRadius:'var(--r)',padding:'12px 14px',boxShadow:'var(--shadow-sm)',display:'flex',gap:12,alignItems:'flex-start',animation:`fadeUp 0.25s ${i*0.025}s ease both` }}>
                  <div style={{ width:34,height:34,borderRadius:10,background:color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>
                    {l.action==='withdraw'?'📤':l.action==='return'?'📥':'📦'}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:13,color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{l.item_name}</div>
                    <div style={{ fontSize:11,color:'var(--txt3)',marginTop:2 }}>
                      {l.quantity} {l.unit} · <span style={{ fontFamily:"'Space Mono',monospace" }}>{l.employee}</span>
                      {l.note && <span> · {l.note}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize:10,color:'var(--txt3)',fontFamily:"'Space Mono',monospace",flexShrink:0,textAlign:'right',lineHeight:1.5 }}>
                    {displayTs(l.timestamp).split(' ').slice(-2).join('\n')}
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}
