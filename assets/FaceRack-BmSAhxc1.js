import{r as h,j as e,c as y}from"./index-Dtbi2hdS.js";const b="/StockIDC3/",u={1:"https://script.google.com/macros/s/AKfycbzS60fGBKgye4kchm7pApICSnm3uqqcM36p_f6HEMOsxJgKVksfIMIiv_lJKZPraztY/exec",2:"https://script.google.com/macros/s/AKfycbwEs4SoGyVF4ZAmzjVhL2raQmMKJfYQZ4C_p-uTXK8HR_BgohzvJNpf1yrMUhvp0ttUEA/exec"},p=[{id:1,tag:"PHASE 1",title:"Face Rack Phase 1",path:"apps/rack/index.html",color:"#09D1C7",lines:["Zone 1","Zone 2","Network-Telecom"],units:["vent","led","vent","blank","plate","led","vent","vent","led","blank","vent","led"]},{id:2,tag:"PHASE 2",title:"Face Rack Phase 2",path:"apps/rack2/index.html",color:"#46DFB1",lines:["Zone 1–2 Row 1–12","NET-A/B","TEL-A/B"],units:["led","vent","vent","plate","led","blank","vent","led","vent","vent","led","blank"]}],f="'Noto Sans Thai',sans-serif",l="#07111E",v=`
.fr-pick{flex:1;overflow-y:auto;padding:26px 16px calc(28px + env(safe-area-inset-bottom,0px));font-family:${f};color:#E8F4F6;
  background:
    radial-gradient(circle at 1px 1px, rgba(255,255,255,.07) 1px, transparent 1.5px) 0 0/14px 14px,
    radial-gradient(120% 60% at 50% 0%, rgba(70,223,177,.10), transparent 60%),
    ${l};}
.fr-wrap{max-width:720px;margin:0 auto}
.fr-h{font-size:22px;font-weight:700;margin:0 0 4px;letter-spacing:.01em}
.fr-s{font-size:13px;color:rgba(232,244,246,.62);margin:0 0 22px;line-height:1.6}
.fr-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:16px}

.fr-card{position:relative;display:grid;grid-template-columns:96px 1fr;gap:18px;align-items:stretch;text-align:left;cursor:pointer;
  color:inherit;font:inherit;padding:16px 18px 16px 14px;border-radius:22px 22px 22px 6px;
  border:1px solid color-mix(in srgb,var(--c) 40%,transparent);
  background:linear-gradient(155deg,color-mix(in srgb,var(--c) 13%,transparent),rgba(255,255,255,.025) 55%);
  transition:transform .25s cubic-bezier(.3,1.3,.5,1),border-color .2s,box-shadow .25s}
.fr-card:active{transform:scale(.985)}
.fr-card:focus-visible{outline:2px solid var(--c);outline-offset:3px}
@media(hover:hover){.fr-card:hover{transform:translateY(-3px);border-color:var(--c);box-shadow:0 16px 34px -16px var(--c)}
  .fr-card:hover .fr-led{animation-duration:.55s}
  .fr-card:hover .fr-go i{transform:translateX(4px)}}

.fr-rack{width:96px;height:auto;display:block;align-self:center;filter:drop-shadow(0 8px 14px rgba(0,0,0,.45))}
.fr-body{display:flex;flex-direction:column;min-width:0;padding:2px 0}
.fr-ph{font-size:30px;font-weight:700;line-height:1.1;color:var(--c);letter-spacing:-.01em}
.fr-n{font-weight:400;font-size:14px;color:rgba(232,244,246,.6);display:block;margin-bottom:3px}
.fr-zl{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:7px;font-size:13.5px;color:rgba(232,244,246,.82)}
.fr-zl li{display:flex;align-items:center;gap:9px}
.fr-zl li:before{content:"";width:12px;height:2px;border-radius:2px;background:var(--c);opacity:.7;flex:none}
.fr-go{margin-top:auto;padding-top:16px;display:flex;align-items:center;gap:2px;font-size:14px;font-weight:600;color:var(--c)}
.fr-go i{font-size:17px;transition:transform .2s}

.fr-led{animation:frBlink 2.4s ease-in-out infinite both}
@keyframes frBlink{0%,100%{opacity:.25}45%,55%{opacity:1}}
/* ตอนเปิดหน้า: ไฟไล่จากล่างขึ้นบนครั้งเดียว เหมือนบูตเครื่อง */
.fr-u{animation:frBoot .5s ease-out both}
@keyframes frBoot{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){.fr-led,.fr-u{animation:none}.fr-led{opacity:.9}.fr-card{transition:none}}
`;function j({units:o,color:n}){return e.jsxs("svg",{className:"fr-rack",viewBox:"0 0 84 160","aria-hidden":"true",focusable:"false",children:[e.jsx("rect",{x:"1.5",y:"1.5",width:"81",height:"157",rx:"5",fill:"#0B1A2C",stroke:n,strokeOpacity:".55",strokeWidth:"1.5"}),e.jsx("rect",{x:"5",y:"9",width:"5",height:"142",rx:"1.5",fill:"rgba(255,255,255,.06)"}),e.jsx("rect",{x:"74",y:"9",width:"5",height:"142",rx:"1.5",fill:"rgba(255,255,255,.06)"}),o.map((r,a)=>e.jsxs("g",{fill:n,fillOpacity:".35",children:[e.jsx("circle",{cx:"7.5",cy:14+a*11+11/2,r:".9"}),e.jsx("circle",{cx:"76.5",cy:14+a*11+11/2,r:".9"})]},"h"+a)),o.map((r,a)=>{const i=14+a*11,g=o.length-1-a,m=e.jsx("rect",{x:11,y:i+.8,width:62,height:11-1.6,rx:"1.5",fill:"rgba(255,255,255,.055)",stroke:"rgba(255,255,255,.14)",strokeWidth:".6"});return e.jsx("g",{className:"fr-u",style:{animationDelay:`${g*60}ms`},children:r==="plate"?e.jsxs(e.Fragment,{children:[e.jsx("rect",{x:11,y:i+.8,width:62,height:11-1.6,rx:"1.5",fill:n}),e.jsx("text",{x:11+62/2,y:i+11/2+3,textAnchor:"middle",fontSize:"8",fontWeight:"700",fill:l,fontFamily:"'Space Mono',monospace",children:n===p[0].color?"P1":"P2"})]}):e.jsxs(e.Fragment,{children:[m,r==="vent"&&[0,1,2,3,4,5,6].map(s=>e.jsx("line",{x1:31+s*5,x2:31+s*5,y1:i+3,y2:i+11-3,stroke:"rgba(255,255,255,.18)",strokeWidth:"1"},s)),r==="led"&&[0,1,2].map(s=>e.jsx("circle",{className:"fr-led",cx:18+s*6,cy:i+11/2,r:"1.7",fill:s===2?"#FFC857":n,style:{animationDelay:`${(a*370+s*530)%2400}ms`}},s)),r==="led"&&e.jsx("rect",{x:41,y:i+11/2-1,width:"24",height:"2",rx:"1",fill:"rgba(255,255,255,.14)"})]})},a)})]})}function w({onBack:o}){const[n,d]=h.useState(null);h.useEffect(()=>{function r(a){var i;a.origin===window.location.origin&&((i=a.data)==null?void 0:i.type)==="rack-auth-expired"&&(y(),window.location.reload())}return window.addEventListener("message",r),()=>window.removeEventListener("message",r)},[]);const t=p.find(r=>r.id===n),c=t?u[t.id]:"",x=(t==null?void 0:t.id)===1&&!c;return e.jsxs("div",{style:{position:"absolute",inset:0,display:"flex",flexDirection:"column",background:l},children:[e.jsx("style",{children:v}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,flexShrink:0,padding:"calc(10px + env(safe-area-inset-top, 0px)) 14px 10px",background:l,borderBottom:"1px solid rgba(255,255,255,0.12)"},children:[e.jsx("button",{onClick:()=>n?d(null):o(),"aria-label":"กลับ",style:{background:"none",border:"none",cursor:"pointer",padding:"4px 6px 4px 0",display:"flex",alignItems:"center",color:"#E8F4F6",flexShrink:0},children:e.jsx("i",{className:"ti ti-chevron-left",style:{fontSize:20}})}),e.jsx("span",{style:{fontFamily:f,fontSize:14,fontWeight:600,color:"#E8F4F6"},children:"Face Rack"}),e.jsxs("span",{style:{fontSize:11,color:"rgba(255,255,255,0.45)",fontFamily:"'Space Mono',monospace"},children:["IDC3",t?` · P${t.id}`:""]})]}),!t&&e.jsx("div",{className:"fr-pick",children:e.jsxs("div",{className:"fr-wrap",children:[e.jsx("h2",{className:"fr-h",children:"เลือกเฟสที่จะเข้าดู"}),e.jsx("p",{className:"fr-s",children:"แตะตู้ Rack เพื่อเปิดผังหน้า Rack ของเฟสนั้น"}),e.jsx("div",{className:"fr-list",children:p.map(r=>e.jsxs("button",{className:"fr-card",style:{"--c":r.color},onClick:()=>d(r.id),"aria-label":`${r.title} — ${r.lines.join(", ")}`,children:[e.jsx(j,{units:r.units,color:r.color}),e.jsxs("span",{className:"fr-body",children:[e.jsxs("span",{className:"fr-ph",children:[e.jsx("span",{className:"fr-n",children:"Face Rack"}),"Phase ",r.id]}),e.jsx("ul",{className:"fr-zl",children:r.lines.map(a=>e.jsx("li",{children:a},a))}),e.jsxs("span",{className:"fr-go",children:["เข้าดูผัง Phase ",r.id,e.jsx("i",{className:"ti ti-chevron-right"})]})]})]},r.id))})]})}),t&&!x&&e.jsx("iframe",{title:`Face Rack IDC3 ${t.tag}`,src:`${b}${t.path}${c?`?gas=${encodeURIComponent(c)}`:""}`,style:{flex:1,minHeight:0,width:"100%",border:0,display:"block",background:l}},t.id),t&&x&&e.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center",color:"#E8F4F6",fontFamily:f,fontSize:14,lineHeight:1.7},children:["ยังไม่ได้ตั้งค่า VITE_RACK_GAS_URL ในไฟล์ .env",e.jsx("br",{}),"(ต้อง build ใหม่หลังแก้ .env)"]})]})}export{w as default};
