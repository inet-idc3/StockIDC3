// ─────────────────────────────────────────────────────────────
// CinBackground.jsx — Reusable cinematic animated background
// Used by Login screen, Portal shell, Employee overlay, etc.
// ─────────────────────────────────────────────────────────────
import { useMemo } from 'react';

/** Floating particles */
export function CinParticles({ count = 18, color = 'rgba(9,209,199,0.5)', className = 'pl-pt' }) {
  const pts = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id:    i,
    left:  Math.random() * 100,
    size:  Math.random() * 4 + 2,
    dur:   Math.random() * 12 + 8,
    delay: Math.random() * 10,
    op:    Math.random() * 0.4 + 0.2,
  })), []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {pts.map(p => (
        <div key={p.id} className={className} style={{
          position: 'absolute', borderRadius: '50%', background: color,
          left: `${p.left}%`, width: p.size, height: p.size, opacity: p.op,
          animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`,
        }} />
      ))}
    </div>
  );
}

/** Login / splash cinematic background */
export function LoginBackground({ children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', fontFamily: "'Prompt',sans-serif",
      paddingTop:    'env(safe-area-inset-top,0px)',
      paddingBottom: 'env(safe-area-inset-bottom,0px)',
    }}>
      {/* Animated BG */}
      <div style={{ position: 'fixed', inset: 0, animation: 'cin-bg-reveal 1.4s cubic-bezier(0.22,1,0.36,1) both' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,#072D3A 0%,#0C5060 28%,#0E7A82 55%,#14A89A 78%,#2DD4BF 100%)' }} />

        {/* Depth grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(9,209,199,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(9,209,199,0.05) 1px,transparent 1px)',
          backgroundSize: '40px 40px', transformOrigin: 'center bottom',
          animation: 'cin-grid-in 1.8s cubic-bezier(0.22,1,0.36,1) 0.2s both, cin-layer-drift 20s ease-in-out infinite 2s',
        }} />

        {/* Orbs */}
        <div style={{ position:'absolute',width:320,height:320,top:-80,right:-80,borderRadius:'50%',filter:'blur(60px)',background:'radial-gradient(circle,rgba(9,209,199,0.35) 0%,transparent 70%)',animation:'cin-orb-float 9s ease-in-out infinite' }} />
        <div style={{ position:'absolute',width:260,height:260,bottom:-60,left:-60,borderRadius:'50%',filter:'blur(60px)',background:'radial-gradient(circle,rgba(70,223,177,0.28) 0%,transparent 70%)',animation:'cin-orb-float2 11s ease-in-out infinite' }} />
        <div style={{ position:'absolute',width:180,height:180,top:'38%',left:'30%',borderRadius:'50%',filter:'blur(60px)',background:'radial-gradient(circle,rgba(21,145,155,0.22) 0%,transparent 70%)',animation:'cin-orb-float 13s ease-in-out infinite 2s' }} />

        {/* Noise */}
        <div style={{ position:'absolute',inset:'-20%',width:'140%',height:'140%',backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",opacity:0.04,animation:'cin-noise 8s steps(2) infinite' }} />

        {/* Vignette */}
        <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 90% 90% at 50% 50%,transparent 40%,rgba(4,20,30,0.55) 100%)',animation:'cin-vignette-in 1.6s ease both',pointerEvents:'none' }} />
      </div>

      {/* Scanline sweep — runs once on mount */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 2,
        background: 'linear-gradient(90deg,transparent 0%,rgba(9,209,199,0.6) 40%,rgba(70,223,177,0.8) 50%,rgba(9,209,199,0.6) 60%,transparent 100%)',
        boxShadow: '0 0 12px rgba(9,209,199,0.5),0 0 30px rgba(9,209,199,0.2)',
        animation: 'cin-scanline 3.2s cubic-bezier(0.4,0,0.6,1) 0.6s 1 forwards',
        pointerEvents: 'none', zIndex: 10,
      }} />

      <CinParticles />
      {children}
    </div>
  );
}
