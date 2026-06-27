// PageHome.jsx — StockScan dashboard
import { useMemo, useState } from 'react';
import { displayTs } from '../../../services/gasService.js';

function StatCard({ icon, label, value, color, isActive, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: isActive ? `${color}18` : 'var(--surface)',
        borderRadius: 'var(--r)', padding: '14px 16px',
        boxShadow: isActive ? `0 4px 18px ${color}30` : 'var(--shadow-sm)',
        border: `1.5px solid ${isActive ? color : 'transparent'}`,
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', transition: 'all .18s cubic-bezier(.4,0,.2,1)',
        transform: isActive ? 'scale(1.03)' : 'scale(1)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {isActive && (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg,${color}10,transparent)`, pointerEvents: 'none' }} />
      )}
      <div style={{ fontSize: 26, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--txt)', fontFamily: "'Outfit',sans-serif", lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, color: isActive ? color : 'var(--txt3)', marginTop: 2, fontWeight: isActive ? 600 : 400, transition: 'color .18s' }}>{label}</div>
      </div>
      {isActive && (
        <div style={{ position: 'absolute', top: 7, right: 9, width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
      )}
    </div>
  );
}

function ItemCard({ item }) {
  const pct  = item.min > 0 ? Math.min(100, (item.stock / (item.min * 2)) * 100) : 100;
  const low  = item.stock <= item.min;
  const zero = item.stock === 0;
  const col  = zero ? '#FF4D4D' : low ? '#FFB700' : 'var(--teal)';
  return (
    <div style={{ background:'var(--surface)',borderRadius:'var(--r)',padding:'12px 14px',boxShadow:'var(--shadow-sm)',display:'flex',gap:12,alignItems:'flex-start',animation:'fadeUp 0.3s ease both',border:`1.5px solid ${low ? col : 'transparent'}` }}>
      <div style={{ fontSize:28,flexShrink:0,lineHeight:1 }}>{item.icon||'📦'}</div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontWeight:700,fontSize:13,color:'var(--txt)',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{item.name}</div>
        <div style={{ fontSize:11,color:'var(--txt3)',marginBottom:8 }}>{item.cat} · <span style={{ fontFamily:"'Space Mono',monospace",fontSize:10 }}>{item.id}</span></div>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ flex:1,height:5,borderRadius:100,background:'var(--bg)',overflow:'hidden' }}>
            <div style={{ height:'100%',width:`${pct}%`,background:col,borderRadius:100,transition:'width 0.5s ease' }} />
          </div>
          <span style={{ fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:15,color:col,flexShrink:0 }}>{item.stock}</span>
          <span style={{ fontSize:11,color:'var(--txt3)',flexShrink:0 }}>{item.unit}</span>
        </div>
      </div>
    </div>
  );
}

export default function PageHome({ items, logs, onGoScan }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const stats = useMemo(() => ({
    total: items.length,
    ok:    items.filter(x => x.stock > x.min).length,
    low:   items.filter(x => x.stock <= x.min && x.stock > 0).length,
    zero:  items.filter(x => x.stock === 0).length,
  }), [items]);

  const recentLogs = useMemo(() => logs.slice(0, 5), [logs]);

  const filterConfig = {
    all:  { label: 'รายการทั้งหมด', icon: '📦', color: 'var(--navy)', fn: () => true },
    ok:   { label: 'ปกติ',          icon: '✅', color: 'var(--teal)', fn: x => x.stock > x.min },
    low:  { label: 'ใกล้หมด',       icon: '⚠️', color: '#FFB700',    fn: x => x.stock <= x.min && x.stock > 0 },
    zero: { label: 'หมดแล้ว',       icon: '🚨', color: '#FF4D4D',    fn: x => x.stock === 0 },
  };

  const statCards = [
    { key: 'all',  icon: '📦', label: 'รายการทั้งหมด', value: stats.total, color: 'var(--navy)' },
    { key: 'ok',   icon: '✅', label: 'ปกติ',           value: stats.ok,    color: 'var(--teal)' },
    { key: 'low',  icon: '⚠️', label: 'ใกล้หมด',        value: stats.low,   color: '#FFB700' },
    { key: 'zero', icon: '🚨', label: 'หมดแล้ว',         value: stats.zero,  color: '#FF4D4D' },
  ];

  const displayItems = useMemo(() =>
    items
      .filter(filterConfig[activeFilter].fn)
      .sort((a, b) => (a.stock / Math.max(a.min * 2, 1)) - (b.stock / Math.max(b.min * 2, 1))),
    [items, activeFilter]
  );

  const currentFilter = filterConfig[activeFilter];

  return (
    <div style={{ paddingTop: 16 }}>
      {/* Stat cards — clickable filter */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {statCards.map(({ key, icon, label, value, color }) => (
          <StatCard
            key={key}
            icon={icon}
            label={label}
            value={value}
            color={color}
            isActive={activeFilter === key}
            onClick={() => setActiveFilter(activeFilter === key ? 'all' : key)}
          />
        ))}
      </div>

      <button onClick={onGoScan} style={{ width:'100%',padding:'15px 20px',borderRadius:'var(--r2)',border:'none',background:'linear-gradient(135deg,var(--teal),var(--mid-teal))',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:16,fontWeight:700,cursor:'pointer',boxShadow:'0 6px 20px rgba(9,209,199,0.3)',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'center',gap:10 }}>
        <i className="ti ti-qrcode" style={{ fontSize:22 }} /> สแกน QR / เบิกอุปกรณ์
      </button>

      {/* Filtered item list */}
      {items.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight:700,fontSize:14,color:'var(--txt)',marginBottom:10,display:'flex',alignItems:'center',gap:6 }}>
            <span>{currentFilter.icon}</span>
            <span style={{ color: currentFilter.color }}>{currentFilter.label}</span>
            <span style={{ marginLeft:'auto',fontSize:11,color:'var(--txt3)',fontWeight:400,background:'rgba(0,0,0,.1)',padding:'2px 8px',borderRadius:100 }}>
              {displayItems.length} รายการ
            </span>
          </div>
          {displayItems.length === 0 ? (
            <div style={{ textAlign:'center',padding:'32px 20px',color:'var(--txt3)',background:'var(--surface)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)' }}>
              <div style={{ fontSize:36,marginBottom:8 }}>✨</div>
              <div style={{ fontWeight:600,fontSize:13 }}>ไม่มีรายการในหมวดนี้</div>
            </div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {displayItems.map(it => <ItemCard key={it.id} item={it} />)}
            </div>
          )}
        </div>
      )}

      {/* Recent logs — only show when viewing "all" */}
      {activeFilter === 'all' && recentLogs.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontWeight:700,fontSize:14,color:'var(--txt)',marginBottom:10 }}>🕒 การเบิกล่าสุด</div>
          <div style={{ background:'var(--surface)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)',overflow:'hidden' }}>
            {recentLogs.map((l, i) => (
              <div key={i} style={{ padding:'11px 14px',borderBottom:i<recentLogs.length-1?'1px solid var(--teal-border)':'none',display:'flex',alignItems:'flex-start',gap:10 }}>
                <div style={{ fontSize:18,flexShrink:0 }}>{l.action==='withdraw'?'📤':l.action==='return'?'📥':'📦'}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{l.item_name}</div>
                  <div style={{ fontSize:11,color:'var(--txt3)',marginTop:2 }}>{l.quantity} {l.unit} · {l.employee}</div>
                </div>
                <div style={{ fontSize:10,color:'var(--txt3)',fontFamily:"'Space Mono',monospace",flexShrink:0 }}>
                  {displayTs(l.timestamp).split(' ').slice(-2).join(' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div style={{ textAlign:'center',padding:'48px 20px',color:'var(--txt3)' }}>
          <div style={{ fontSize:48,marginBottom:12 }}>🗄️</div>
          <div style={{ fontWeight:600,marginBottom:6 }}>ยังไม่มีอุปกรณ์ในระบบ</div>
          <div style={{ fontSize:12 }}>ไปที่ Admin เพื่อเพิ่มอุปกรณ์</div>
        </div>
      )}
    </div>
  );
}
