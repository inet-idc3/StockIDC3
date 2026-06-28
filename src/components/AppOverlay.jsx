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
      {/* App content — each app renders its own header with back button */}
      <div style={{ flex:1,overflowY:'auto',overflowX:'hidden',WebkitOverflowScrolling:'touch',position:'relative',minHeight:0 }}>
        <Suspense fallback={<AppLoader />}>
          {(appId === 'stockscan'  || prevApp.current === 'stockscan')  && <StockScan  user={user} visible={appId === 'stockscan'}  onBack={handleClose} />}
          {(appId === 'assetaudit' || prevApp.current === 'assetaudit') && <AssetAudit user={user} visible={appId === 'assetaudit'} onBack={handleClose} />}
          {(appId === 'sparepart'  || prevApp.current === 'sparepart')  && <SparePart  user={user} gasUrl={gasUrl} visible={appId === 'sparepart'}  onBack={handleClose} />}
        </Suspense>
      </div>
    </div>
  );
}
