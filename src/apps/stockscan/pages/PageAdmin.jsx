// PageAdmin.jsx — Add / delete stock items
import { useState } from 'react';

const CATS  = ['network','server','power','cooling','cable','tool','consumable','other'];
const ICONS = ['📦','🌐','🖥️','⚡','❄️','🔌','🔧','🧴','💡','🔩','🖨️','📱','💻','🖱️','⌨️'];

export default function PageAdmin({ items, setupUnlocked, onAddItem, onDelItem, onLock, onUnlock }) {
  const [form, setForm] = useState({ name:'',cat:'network',stock:0,unit:'อัน',min:10,icon:'📦',count:1 });
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const IS = { width:'100%',padding:'10px 12px',borderRadius:12,border:'1.5px solid var(--teal-border)',background:'var(--surface)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:13,outline:'none',color:'var(--txt)' };

  if (!setupUnlocked) {
    return (
      <div style={{ paddingTop:40,textAlign:'center',color:'var(--txt3)' }}>
        <div style={{ fontSize:48,marginBottom:12 }}>🔒</div>
        <div style={{ fontWeight:700,fontSize:15,color:'var(--txt)',marginBottom:6 }}>ต้องใส่ PIN</div>
        <div style={{ fontSize:12,marginBottom:20 }}>กรุณาใส่ PIN เพื่อเข้าสู่โหมด Admin</div>
        <button onClick={onUnlock} style={{ padding:'13px 32px',borderRadius:16,border:'none',background:'linear-gradient(135deg,var(--teal),var(--mid-teal))',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:15,fontWeight:700,cursor:'pointer' }}>🔓 ใส่ PIN</button>
      </div>
    );
  }

  return (
    <div style={{ paddingTop:16 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
        <div style={{ fontWeight:700,fontSize:14,color:'var(--txt)' }}>⚙️ Admin Panel</div>
        <button onClick={onLock} style={{ padding:'7px 14px',borderRadius:100,border:'1.5px solid #FF4D4D',background:'transparent',color:'#FF4D4D',fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:5 }}>
          <i className="ti ti-lock" style={{ fontSize:13 }} /> ล็อค
        </button>
      </div>

      {/* Add form */}
      <div style={{ background:'var(--surface)',borderRadius:'var(--r2)',padding:'16px',boxShadow:'var(--shadow-md)',marginBottom:20 }}>
        <div style={{ fontWeight:700,fontSize:13,color:'var(--txt)',marginBottom:14 }}>➕ เพิ่มอุปกรณ์ใหม่</div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:12,color:'var(--txt2)',marginBottom:5 }}>ไอคอน</div>
          <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:8 }}>
            {ICONS.map(ic => (
              <button key={ic} onClick={() => set('icon', ic)} style={{ width:36,height:36,borderRadius:10,border:`1.5px solid ${form.icon===ic?'var(--teal)':'var(--teal-border)'}`,background:form.icon===ic?'var(--teal-dim)':'var(--surface)',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                {ic}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:12,color:'var(--txt2)',marginBottom:5 }}>ชื่ออุปกรณ์</div>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="เช่น Patch Cord Cat6 1m" style={IS} />
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}>
          <div>
            <div style={{ fontSize:12,color:'var(--txt2)',marginBottom:5 }}>หมวดหมู่</div>
            <select value={form.cat} onChange={e => set('cat', e.target.value)} style={{ ...IS }}>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:12,color:'var(--txt2)',marginBottom:5 }}>หน่วย</div>
            <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="อัน" style={IS} />
          </div>
          <div>
            <div style={{ fontSize:12,color:'var(--txt2)',marginBottom:5 }}>จำนวนเริ่มต้น</div>
            <input type="number" value={form.stock} onChange={e => set('stock', e.target.value)} min={0} style={IS} />
          </div>
          <div>
            <div style={{ fontSize:12,color:'var(--txt2)',marginBottom:5 }}>แจ้งเตือนเมื่อเหลือ</div>
            <input type="number" value={form.min} onChange={e => set('min', e.target.value)} min={0} style={IS} />
          </div>
          <div>
            <div style={{ fontSize:12,color:'var(--txt2)',marginBottom:5 }}>จำนวน QR ที่สร้าง</div>
            <input type="number" value={form.count} onChange={e => set('count', e.target.value)} min={1} max={100} style={IS} />
          </div>
        </div>
        <button onClick={() => onAddItem(form)} style={{ width:'100%',padding:13,borderRadius:14,border:'none',background:'linear-gradient(135deg,var(--teal),var(--mid-teal))',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:14,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 14px rgba(9,209,199,0.25)' }}>
          ➕ บันทึกอุปกรณ์ ({form.count} QR)
        </button>
      </div>

      {/* Item list */}
      <div style={{ fontWeight:700,fontSize:13,color:'var(--txt)',marginBottom:10 }}>รายการทั้งหมด ({items.length})</div>
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        {items.map(it => (
          <div key={it.id} style={{ background:'var(--surface)',borderRadius:'var(--r)',padding:'11px 14px',boxShadow:'var(--shadow-sm)',display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ fontSize:24,flexShrink:0 }}>{it.icon||'📦'}</div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontWeight:600,fontSize:13,color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{it.name}</div>
              <div style={{ fontSize:11,color:'var(--txt3)',fontFamily:"'Space Mono',monospace",marginTop:1 }}>{it.id}</div>
            </div>
            <div style={{ fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:16,color:'var(--teal)',flexShrink:0 }}>{it.stock}</div>
            <button onClick={() => onDelItem(it.id)} style={{ width:32,height:32,borderRadius:10,border:'1px solid #FFD0D0',background:'#FFF5F5',color:'#FF4D4D',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <i className="ti ti-trash" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
