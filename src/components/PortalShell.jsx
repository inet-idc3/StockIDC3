// ─────────────────────────────────────────────────────────────
// PortalShell.jsx — App launcher grid + Push Notification
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { usePush }               from '../hooks/usePush.js';
import { useUnreadCount }        from './NotificationCenter.jsx';
import NotificationCenter        from './NotificationCenter.jsx';
import PushSetupBanner           from './PushSetupBanner.jsx';
import ResubscribeButton         from './ResubscribeButton.jsx';

const APPS = {
  stockscan:  { name: 'StockScan',   icon: '📦', grad: 'linear-gradient(135deg,#09D1C7,#0C6478)', sub: 'IDC-3' },
  assetaudit: { name: 'Asset Audit', icon: '🔍', grad: 'linear-gradient(135deg,#46DFB1,#15919B)', sub: 'IDC-3' },
  sparepart:  { name: 'Spare Part',  icon: '🔧', grad: 'linear-gradient(135deg,#F59E0B,#D97706)', sub: 'IDC-3' },
};

export default function PortalShell({ user, onOpenApp, onLogout }) {
  const [clock,    setClock]    = useState('');
  const [notiOpen, setNotiOpen] = useState(false);

  // ── unreadCount ต้องประกาศก่อน usePush เพราะ callback อ้างถึง refreshUnread ──
  const { count: unreadCount, refresh: refreshUnread } = useUnreadCount(notiOpen);

  // ── Push hook — callback แยกออกมาเป็น top-level hook ────────
  const handleNewNoti = useCallback(() => { refreshUnread(); }, [refreshUnread]);
  const { permission, requestPermission, ntfyTopic } = usePush({
    onNewNotification: handleNewNoti,
    userInfo: { employeeId: user?.empId || '', name: user?.displayName || '' },
  });

  // ── Clock ─────────────────────────────────────────────────
  useEffect(() => {
    function tick() {
      const d = new Date();
      setClock(d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0') + ' น.');
    }
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  // ── Handle SW click (deep link ไปหน้า pending) ────────────
  useEffect(() => {
    function onSWMsg(e) {
      if (e.data?.type === 'NOTIFICATION_CLICKED') {
        setNotiOpen(true);
        refreshUnread();
      }
    }
    navigator.serviceWorker?.addEventListener('message', onSWMsg);
    return () => navigator.serviceWorker?.removeEventListener('message', onSWMsg);
  }, [refreshUnread]);

  // ── Handle hash #pending จาก SW openWindow ────────────────
  useEffect(() => {
    if (window.location.hash === '#pending') {
      setNotiOpen(true);
      window.location.hash = '';
    }
  }, []);

  return (
    <div style={{ position:'fixed',inset:0,zIndex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>

      {/* Animated background */}
      <div style={{ position:'fixed',inset:0,zIndex:0,pointerEvents:'none',overflow:'hidden' }}>
        <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 90% 55% at 15% 0%,rgba(9,209,199,0.20) 0%,transparent 55%),radial-gradient(ellipse 70% 50% at 90% 100%,rgba(70,223,177,0.14) 0%,transparent 55%),linear-gradient(180deg,#071520 0%,#07111E 50%,#060E1A 100%)' }} />
        <div style={{ position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(9,209,199,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(9,209,199,0.04) 1px,transparent 1px)',backgroundSize:'48px 48px',animation:'pGridDrift 30s ease-in-out infinite' }} />
        <div style={{ position:'absolute',width:400,height:400,top:-120,right:-80,borderRadius:'50%',filter:'blur(80px)',background:'radial-gradient(circle,rgba(9,209,199,0.22) 0%,transparent 65%)',animation:'pOrbFloat 12s ease-in-out infinite',pointerEvents:'none' }} />
        <div style={{ position:'absolute',width:350,height:350,bottom:-100,left:-80,borderRadius:'50%',filter:'blur(80px)',background:'radial-gradient(circle,rgba(70,223,177,0.18) 0%,transparent 65%)',animation:'pOrbFloat 15s ease-in-out infinite',animationDelay:'-4s',pointerEvents:'none' }} />
      </div>

      {/* Content */}
      <div style={{ padding:'20px 20px 16px',animation:'pSlideDown 0.65s cubic-bezier(0.16,1,0.3,1) both',flexShrink:0,position:'relative',zIndex:1 }}>

        {/* Header block */}
        <div style={{ marginBottom:14 }}>

          {/* Card: INET badge + company name + live dot */}
          <div style={{ padding:'12px 16px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:18,backdropFilter:'blur(12px)',boxShadow:'0 4px 20px rgba(0,0,0,0.18),inset 0 1px 0 rgba(255,255,255,0.10)',display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>

            {/* INET badge — 3D emboss + shimmer */}
            <div style={{
              background:'linear-gradient(145deg,#0ef5ea,#09D1C7 40%,#0aabb3 70%,#15919B)',
              color:'#fff',
              fontFamily:"'Outfit',sans-serif",
              fontWeight:900,
              fontSize:15,
              padding:'7px 17px',
              borderRadius:100,
              letterSpacing:'2px',
              flexShrink:0,
              boxShadow:'0 6px 18px rgba(9,209,199,0.45),0 2px 4px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.40),inset 0 -2px 0 rgba(0,0,0,0.15)',
              textShadow:'0 1px 2px rgba(0,0,0,0.25)',
              animation:'inetShimmer 3s ease-in-out infinite',
            }}>
              INET
            </div>

            {/* Company name */}
            <div style={{ fontFamily:"'Noto Sans Thai',sans-serif",fontSize:12,color:'rgba(255,255,255,0.65)',lineHeight:1.4,flex:1 }}>
              บริษัท อินเทอร์เน็ตประเทศไทย จำกัด (มหาชน)
            </div>

            {/* Live dot */}
            <div style={{ width:7,height:7,borderRadius:'50%',background:'#09D1C7',flexShrink:0,animation:'pLiveDot 2.2s ease-in-out infinite',boxShadow:'0 0 8px #09D1C7' }} />

          </div>

          {/* Bell + Logout — below card, aligned right */}
          <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>

            <button
              onClick={() => setNotiOpen(true)}
              style={{
                position:'relative',width:38,height:38,borderRadius:12,
                background:'rgba(255,255,255,0.10)',border:'1px solid rgba(255,255,255,0.18)',
                color:'#fff',fontSize:18,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',
                transition:'background 0.18s,box-shadow 0.18s',
                boxShadow:'0 2px 8px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
              title="การแจ้งเตือน"
            >
              <i className="ti ti-bell" style={{ fontSize:18 }} />
              {unreadCount > 0 && (
                <span style={{
                  position:'absolute',top:-5,right:-5,
                  background:'linear-gradient(135deg,#FF6B35,#FF4500)',
                  color:'#fff',borderRadius:99,fontSize:10,fontWeight:800,
                  padding:'1px 5px',lineHeight:1.4,minWidth:18,textAlign:'center',
                  boxShadow:'0 2px 8px rgba(255,69,0,0.5)',
                  animation:'pulse 2s ease-in-out infinite',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  width:38,height:38,borderRadius:12,
                  background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',
                  color:'rgba(255,255,255,0.55)',fontSize:14,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  boxShadow:'0 2px 8px rgba(0,0,0,0.12),inset 0 1px 0 rgba(255,255,255,0.08)',
                  transition:'background 0.18s,box-shadow 0.18s',
                }}
                title="ออกจากระบบ"
              >
                <i className="ti ti-logout" style={{ fontSize:14 }} />
              </button>
            )}

          </div>
        </div>

        {/* Push setup banner */}
        <PushSetupBanner
          permission={permission}
          onRequest={requestPermission}
          ntfyTopic={ntfyTopic}
        />

        {/* Welcome */}
        {user?.displayName && (
          <div style={{ fontFamily:"'Noto Sans Thai',sans-serif",fontSize:12,color:'rgba(255,255,255,0.45)',marginBottom:10,letterSpacing:'0.3px' }}>
            สวัสดี, {user.displayName}
          </div>
        )}

        <div style={{ fontFamily:"'Space Mono',monospace",fontSize:10,color:'rgba(255,255,255,0.32)',letterSpacing:'2px',textTransform:'uppercase',marginBottom:10 }}>
          บริการองค์กร
        </div>

        {/* App grid */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10 }}>
          {Object.entries(APPS).map(([id, app], idx) => (
            <button
              key={id}
              onClick={() => onOpenApp(id)}
              style={{
                display:'flex',flexDirection:'column',alignItems:'center',
                padding:'14px 6px 11px',borderRadius:22,
                background:'rgba(255,255,255,0.065)',
                border:'1px solid rgba(255,255,255,0.09)',
                cursor:'pointer',color:'inherit',
                transition:'transform 0.24s cubic-bezier(0.34,1.56,0.64,1),background 0.18s,box-shadow 0.22s',
                position:'relative',overflow:'hidden',
                animation:`pCardIn 0.55s cubic-bezier(0.16,1,0.3,1) ${0.12+idx*0.1}s both`,
                userSelect:'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-5px) scale(1.04)'; e.currentTarget.style.background='rgba(255,255,255,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.background='rgba(255,255,255,0.065)'; }}
            >
              <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)' }} />
              <div style={{ width:56,height:56,borderRadius:16,marginBottom:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0,background:app.grad,boxShadow:'0 4px 14px rgba(9,209,199,0.28)' }}>
                {app.icon}
              </div>
              <div style={{ fontFamily:"'Noto Sans Thai',sans-serif",fontSize:11,fontWeight:600,color:'#E8F4F6',textAlign:'center',lineHeight:1.3,width:'100%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                {app.name}
              </div>
              <div style={{ fontSize:9,color:'rgba(255,255,255,0.32)',marginTop:2,textAlign:'center',fontFamily:"'Space Mono',monospace" }}>
                {app.sub}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Clock strip */}
      <div style={{ margin:'18px 20px 0',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,animation:'pFadeUp 0.5s ease 0.6s both',position:'relative',zIndex:1 }}>
        <div style={{ fontFamily:"'Space Mono',monospace",fontSize:11,color:'rgba(255,255,255,0.32)',letterSpacing:'1px' }}>{clock}</div>
        <div style={{ height:1,flex:1,margin:'0 12px',background:'linear-gradient(90deg,transparent,rgba(9,209,199,0.18),transparent)' }} />
        <div style={{ fontSize:10,color:'rgba(255,255,255,0.32)',fontFamily:"'Space Mono',monospace" }}>IDC-3 PORTAL</div>
      </div>

      {/* Re-subscribe button */}
      <div style={{ margin:'10px 20px 0',display:'flex',justifyContent:'center',flexShrink:0,position:'relative',zIndex:1 }}>
        <ResubscribeButton />
      </div>

      {/* Notification center panel */}
      <NotificationCenter
        isOpen={notiOpen}
        onClose={() => { setNotiOpen(false); refreshUnread(); }}
      />
    </div>
  );
}
