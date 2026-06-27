// ─────────────────────────────────────────────────────────────
// AppOverlay.jsx — Slide-up container that hosts StockScan / AssetAudit
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, lazy, Suspense } from 'react';

const StockScan  = lazy(() => import('../apps/stockscan/StockScan.jsx'));
const AssetAudit = lazy(() => import('../apps/assetaudit/AssetAudit.jsx'));
const SparePart  = lazy(() => import('../apps/sparepart/SparePart.jsx'));

const APP_META = {
  stockscan:  { name: 'StockScan',   icon: '📦', grad: 'linear-gradient(135deg,#09D1C7,#0C6478)' },
  assetaudit: { name: 'Asset Audit', icon: '🔍', grad: 'linear-gradient(135deg,#46DFB1,#15919B)' },
  sparepart:  { name: 'Spare Part',  icon: '🔧', grad: 'linear-gradient(135deg,#F59E0B,#D97706)' },
};

function AppLoader() {
  return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flexDirection:'column',gap:16,color:'var(--txt3)' }}>
      <span style={{ display:'inline-block',width:24,height:24,border:'3px solid var(--teal-border)',borderTopColor:'var(--teal)',borderRadius:'50%',animation:'scanLine 0.7s linear infinite' }} />
      <div style={{ fontFamily:"'Space Mono',monospace",fontSize:11,letterSpacing:'1px' }}>LOADING...</div>
    </div>
  );
}

export default function AppOverlay({ appId, user, gasUrl, onClose }) {
  const [open,    setOpen]    = useState(false);
  const prevApp   = useRef(null);

  // Animate in whenever appId changes
  useEffect(() => {
    if (appId) {
      prevApp.current = appId;
      // rAF ensures CSS transition fires
      requestAnimationFrame(() => setOpen(true));
    } else {
      setOpen(false);
    }
  }, [appId]);

  const meta = APP_META[appId || prevApp.current] || {};

  function handleClose() {
    setOpen(false);
    // Wait for slide-down animation before destroying
    setTimeout(onClose, 500);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
        background: '#EEF5F7', overflow: 'hidden',
        height: '100dvh', width: '100vw',
      }}
    >
      {/* Top bar */}
      <div style={{
        background: 'rgba(10,22,40,0.95)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: `calc(14px + env(safe-area-inset-top,0px)) 14px 12px`,
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0, zIndex: 500, position: 'relative',
      }}>
        <button
          onClick={handleClose}
          style={{ display:'flex',alignItems:'center',gap:5,padding:'8px 14px',borderRadius:100,border:'1px solid rgba(255,255,255,0.22)',background:'rgba(255,255,255,0.09)',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:13,fontWeight:600,cursor:'pointer',transition:'background 0.16s',flexShrink:0 }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.16)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.09)'}
        >
          <i className="ti ti-chevron-left" style={{ fontSize:16 }} /> กลับ
        </button>

        <div style={{ display:'flex',alignItems:'center',gap:8,flex:1,overflow:'hidden' }}>
          <div style={{ width:28,height:28,borderRadius:8,overflow:'hidden',flexShrink:0,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',background:meta.grad || 'transparent' }}>
            {meta.icon}
          </div>
          <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
            {meta.name}
          </div>
        </div>
      </div>

      {/* App content */}
      <div style={{ flex:1,overflowY:'auto',overflowX:'hidden',WebkitOverflowScrolling:'touch',position:'relative',minHeight:0 }}>
        <Suspense fallback={<AppLoader />}>
          {(appId === 'stockscan'  || prevApp.current === 'stockscan')  && <StockScan  user={user} visible={appId === 'stockscan'} />}
          {(appId === 'assetaudit' || prevApp.current === 'assetaudit') && <AssetAudit user={user} visible={appId === 'assetaudit'} />}
          {(appId === 'sparepart'  || prevApp.current === 'sparepart')  && <SparePart  user={user} gasUrl={gasUrl} visible={appId === 'sparepart'} />}
        </Suspense>
      </div>
    </div>
  );
}
