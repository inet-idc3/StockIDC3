import{r as F,j as e,c as A,i as E}from"./index-DuirlTce.js";const k=E(),j="/StockIDC3/",w={1:"https://script.google.com/macros/s/AKfycbw2zpUFB7qxfr_tcnNnTF_svA9gddHA3_5p3vijBLYDrSpKRAFopm6uc7qwMpYLOQ_tQA/exec",2:"https://script.google.com/macros/s/AKfycbwEs4SoGyVF4ZAmzjVhL2raQmMKJfYQZ4C_p-uTXK8HR_BgohzvJNpf1yrMUhvp0ttUEA/exec"},v=[{id:1,tag:"PHASE 1",title:"Face Rack Phase 1",path:"apps/rack/index.html",color:k?"#FF7A6B":"#09D1C7",lines:["Zone 1","Zone 2","Network-Telecom"],units:["vent","led","vent","blank","plate","led","vent","vent","led","blank","vent","led"]},{id:2,tag:"PHASE 2",title:"Face Rack Phase 2",path:"apps/rack2/index.html",color:k?"#5FE0A0":"#46DFB1",lines:["Zone 1–2 Row 1–12","NET-A/B","TEL-A/B"],units:["led","vent","vent","plate","led","blank","vent","led","vent","vent","led","blank"]}],u={path:"apps/powerhub/index.html",color:"#FFC857",hint:"ไฟฟ้ารวม 2 เฟส"},y={path:"apps/summary/index.html",color:"#FF9F5A",hint:"PUE และน้ำมัน Gen"},N="'Noto Sans Thai',sans-serif",x=k?"#052f20":"#07111E",C=k?"95,224,160":"70,223,177",$=`
/* แถบหัว */
.fr-bar{display:flex;align-items:center;gap:8px;flex-shrink:0;font-family:${N};
  padding:calc(8px + env(safe-area-inset-top,0px)) 12px 8px;background:${x};border-bottom:1px solid rgba(255,255,255,.1)}
.fr-back{display:grid;place-items:center;flex-shrink:0;width:36px;height:36px;border-radius:12px;border:0;background:none;color:#E8F4F6;cursor:pointer;transition:background .15s}
.fr-back:active{background:rgba(255,255,255,.12)}
.fr-back:focus-visible{outline:2px solid #E8F4F6;outline-offset:1px}
@media(hover:hover){.fr-back:hover{background:rgba(255,255,255,.07)}}
.fr-bar-t{font-size:15px;font-weight:600;color:#E8F4F6}
.fr-chip{font-family:'Space Mono',monospace;font-size:11px;line-height:1;padding:5px 9px;border-radius:99px;border:1px solid rgba(255,255,255,.16);color:rgba(255,255,255,.6)}

/* พื้นหลัง: แสงเรือง + กระเบื้องพื้นห้อง Server จางลงด้านล่าง */
.fr-pick{--glow:${C};flex:1;overflow-y:auto;padding:22px 16px calc(32px + env(safe-area-inset-bottom,0px));font-family:${N};color:#E8F4F6;
  background:
    radial-gradient(80% 34% at 14% 0%, rgba(var(--glow),.18), transparent 70%),
    radial-gradient(60% 30% at 100% 22%, rgba(255,200,87,.07), transparent 70%),
    linear-gradient(180deg, transparent 0%, ${x} 72%),
    linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px) 0 0/28px 28px,
    linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px) 0 0/28px 28px,
    ${x};}
.fr-wrap{container-type:inline-size;max-width:max(560px,var(--app-w,0px));margin:0 auto}
.fr-sec+.fr-sec{margin-top:26px}
@container (min-width:720px){
  .fr-sections{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start}
  .fr-sec+.fr-sec{margin-top:0}
}

/* หัวข้อกลุ่ม */
.fr-h{display:flex;align-items:center;gap:12px;margin:0 2px 12px;font-size:13px;font-weight:600;letter-spacing:.01em;color:rgba(232,244,246,.62)}
.fr-h::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.16),transparent)}
.fr-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}

/* การ์ดพื้นฐาน */
.fr-card{position:relative;isolation:isolate;overflow:hidden;display:flex;flex-direction:column;cursor:pointer;
  color:inherit;font:inherit;text-align:left;border-radius:22px;border:1px solid rgba(255,255,255,.09);
  background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 18px 28px -22px rgba(0,0,0,.9);
  transition:transform .25s cubic-bezier(.3,1.3,.5,1),border-color .2s,box-shadow .25s}
.fr-card::before{content:'';position:absolute;inset:0;z-index:-1;
  background:radial-gradient(85% 65% at 50% 0%,color-mix(in srgb,var(--c) 22%,transparent),transparent 72%)}
.fr-card::after{content:'';position:absolute;top:0;left:18%;right:18%;height:2px;border-radius:0 0 3px 3px;background:var(--c);opacity:.85;box-shadow:0 0 14px var(--c)}
.fr-card:active{transform:scale(.97)}
.fr-card:focus-visible{outline:2px solid var(--c);outline-offset:3px}
@media(hover:hover){.fr-card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--c) 65%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.09),0 18px 34px -16px var(--c)}
  .fr-card:hover .fr-led{animation-duration:.55s}}

/* การ์ดภาพรวม (Summary / Power Hub) */
.fr-util{justify-content:space-between;gap:16px;min-height:132px;padding:18px 16px 16px}
.fr-util .fr-ico{height:46px;justify-content:flex-start}

/* การ์ดตู้ Rack */
.fr-rackcard{align-items:center;text-align:center;gap:16px;padding:20px 12px 16px}
.fr-stage{position:relative;height:150px;display:flex;align-items:flex-end;justify-content:center}
.fr-stage::after{content:'';position:absolute;z-index:-1;left:50%;bottom:-8px;width:90%;height:24px;transform:translateX(-50%);
  background:radial-gradient(closest-side,color-mix(in srgb,var(--c) 55%,transparent),transparent);filter:blur(7px)}

.fr-ico{display:flex;align-items:center}
.fr-rack,.fr-bolt{height:100%;width:auto;display:block;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5))}
.fr-t{font-size:16px;font-weight:700;line-height:1.25;color:#EAF4F6}
.fr-n{display:block;font-weight:500;font-size:12.5px;line-height:1.35;color:var(--c);margin-top:3px}
.fr-util .fr-n{font-weight:400;color:rgba(232,244,246,.62)}

.fr-led{animation:frBlink 2.4s ease-in-out infinite both}
@keyframes frBlink{0%,100%{opacity:.25}45%,55%{opacity:1}}
/* ตอนเปิดหน้า: ไฟไล่จากล่างขึ้นบนครั้งเดียว เหมือนบูตเครื่อง */
.fr-u{animation:frBoot .5s ease-out both}
@keyframes frBoot{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){.fr-led,.fr-u{animation:none}.fr-led{opacity:.9}.fr-card{transition:none}}
`;function R({units:a,color:s,label:l}){const f="frb"+F.useId().replace(/:/g,""),i=11,t=14,c=11,h=62;return e.jsxs("svg",{className:"fr-rack",viewBox:"0 0 84 160","aria-hidden":"true",focusable:"false",children:[e.jsx("defs",{children:e.jsxs("linearGradient",{id:f,x1:"0",y1:"0",x2:"0",y2:"1",children:[e.jsx("stop",{offset:"0",stopColor:"#16304B"}),e.jsx("stop",{offset:"1",stopColor:"#0A1626"})]})}),e.jsx("rect",{x:"1.5",y:"1.5",width:"81",height:"157",rx:"6",fill:`url(#${f})`,stroke:s,strokeOpacity:".6",strokeWidth:"1.5"}),e.jsx("rect",{x:"11",y:"5",width:"62",height:"4",rx:"2",fill:s,fillOpacity:".22"}),e.jsx("rect",{x:"11",y:"5",width:"18",height:"4",rx:"2",fill:s,fillOpacity:".7"}),e.jsx("rect",{x:"5",y:"9",width:"5",height:"142",rx:"1.5",fill:"rgba(255,255,255,.07)"}),e.jsx("rect",{x:"74",y:"9",width:"5",height:"142",rx:"1.5",fill:"rgba(255,255,255,.07)"}),a.map((d,n)=>e.jsxs("g",{fill:s,fillOpacity:".4",children:[e.jsx("circle",{cx:"7.5",cy:t+n*i+i/2,r:".9"}),e.jsx("circle",{cx:"76.5",cy:t+n*i+i/2,r:".9"})]},"h"+n)),a.map((d,n)=>{const r=t+n*i,p=a.length-1-n;return e.jsx("g",{className:"fr-u",style:{animationDelay:`${p*60}ms`},children:d==="plate"?e.jsxs(e.Fragment,{children:[e.jsx("rect",{x:c,y:r+.8,width:h,height:i-1.6,rx:"1.5",fill:s}),e.jsx("text",{x:c+h/2,y:r+i/2+3,textAnchor:"middle",fontSize:"8",fontWeight:"700",fill:x,fontFamily:"'Space Mono',monospace",children:l})]}):e.jsxs(e.Fragment,{children:[e.jsx("rect",{x:c,y:r+.8,width:h,height:i-1.6,rx:"1.5",fill:"rgba(255,255,255,.06)",stroke:"rgba(255,255,255,.15)",strokeWidth:".6"}),d==="vent"&&[0,1,2,3,4,5,6].map(o=>e.jsx("line",{x1:c+20+o*5,x2:c+20+o*5,y1:r+3,y2:r+i-3,stroke:"rgba(255,255,255,.2)",strokeWidth:"1"},o)),d==="led"&&[0,1,2].map(o=>{const g=o===2?"#FFC857":s,m=c+7+o*6,b=r+i/2;return e.jsxs("g",{className:"fr-led",style:{animationDelay:`${(n*370+o*530)%2400}ms`},children:[e.jsx("circle",{cx:m,cy:b,r:"3.6",fill:g,fillOpacity:".22"}),e.jsx("circle",{cx:m,cy:b,r:"1.7",fill:g})]},o)}),d==="led"&&e.jsx("rect",{x:c+30,y:r+i/2-1,width:"24",height:"2",rx:"1",fill:"rgba(255,255,255,.16)"})]})},n)}),e.jsx("rect",{x:"11",y:"151",width:"62",height:"3",rx:"1.5",fill:s,fillOpacity:".3"})]})}function B({color:a}){return e.jsxs("svg",{className:"fr-bolt",viewBox:"0 0 84 100","aria-hidden":"true",focusable:"false",children:[e.jsx("rect",{x:"1.5",y:"1.5",width:"81",height:"97",rx:"18",fill:"#0B1A2C",stroke:a,strokeOpacity:".6",strokeWidth:"1.5"}),e.jsx("rect",{x:"1.5",y:"1.5",width:"81",height:"97",rx:"18",fill:a,fillOpacity:".1"}),e.jsx("circle",{cx:"42",cy:"50",r:"30",fill:a,fillOpacity:".12"}),e.jsx("path",{d:"M48 12 24 54h16l-5 34 27-44H46z",fill:a}),e.jsx("path",{className:"fr-led",d:"M12 16h6M66 84h6",stroke:a,strokeWidth:"2",strokeLinecap:"round"})]})}function P({color:a}){return e.jsxs("svg",{className:"fr-bolt",viewBox:"0 0 84 100","aria-hidden":"true",focusable:"false",children:[e.jsx("rect",{x:"1.5",y:"1.5",width:"81",height:"97",rx:"18",fill:"#0B1A2C",stroke:a,strokeOpacity:".6",strokeWidth:"1.5"}),e.jsx("rect",{x:"1.5",y:"1.5",width:"81",height:"97",rx:"18",fill:a,fillOpacity:".1"}),e.jsx("path",{d:"M16 62a26 26 0 0 1 52 0",fill:"none",stroke:a,strokeOpacity:".35",strokeWidth:"6",strokeLinecap:"round"}),e.jsx("path",{d:"M16 62a26 26 0 0 1 36-24",fill:"none",stroke:a,strokeWidth:"6",strokeLinecap:"round"}),e.jsx("path",{className:"fr-led",d:"M42 62 56 44",stroke:"#E8F4F6",strokeWidth:"3",strokeLinecap:"round"}),e.jsx("circle",{cx:"42",cy:"62",r:"4",fill:a}),e.jsx("path",{d:"M20 80h44M26 88h32",stroke:a,strokeOpacity:".5",strokeWidth:"2.5",strokeLinecap:"round"})]})}function M({onBack:a}){const[s,l]=F.useState(null);F.useEffect(()=>{function r(p){var o,g,m,b;p.origin===window.location.origin&&(((o=p.data)==null?void 0:o.type)==="rack-auth-expired"&&(A(),window.location.reload()),((g=p.data)==null?void 0:g.type)==="rack-open-phase"&&v.some(S=>S.id===p.data.phase)&&l(p.data.phase),((m=p.data)==null?void 0:m.type)==="rack-open-powerhub"&&l("power"),((b=p.data)==null?void 0:b.type)==="rack-open-summary"&&l("summary"))}return window.addEventListener("message",r),()=>window.removeEventListener("message",r)},[]);const f=s==="power",i=s==="summary",t=v.find(r=>r.id===s),c=`${j}${u.path}?g1=${encodeURIComponent(w[1])}&g2=${encodeURIComponent(w[2])}`,h=`${j}${y.path}`,d=t?w[t.id]:"",n=(t==null?void 0:t.id)===1&&!d;return e.jsxs("div",{style:{position:"absolute",inset:0,display:"flex",flexDirection:"column",background:x},children:[e.jsx("style",{children:$}),e.jsxs("div",{className:"fr-bar",children:[e.jsx("button",{className:"fr-back",onClick:()=>s?l(null):a(),"aria-label":"กลับ",children:e.jsx("i",{className:"ti ti-chevron-left",style:{fontSize:20}})}),e.jsx("span",{className:"fr-bar-t",children:"Face Rack"}),e.jsxs("span",{className:"fr-chip",children:["IDC3",t?` · P${t.id}`:f?" · Power Hub":i?" · Summary":""]})]}),!t&&!f&&!i&&e.jsx("div",{className:"fr-pick",children:e.jsx("div",{className:"fr-wrap",children:e.jsxs("div",{className:"fr-sections",children:[e.jsxs("section",{className:"fr-sec","aria-labelledby":"fr-h-site",children:[e.jsx("h2",{className:"fr-h",id:"fr-h-site",children:"ภาพรวมทั้งไซต์"}),e.jsxs("div",{className:"fr-list",children:[e.jsxs("button",{className:"fr-card fr-util",style:{"--c":y.color},onClick:()=>l("summary"),"aria-label":"Summary",children:[e.jsx("span",{className:"fr-ico",children:e.jsx(P,{color:y.color})}),e.jsxs("span",{className:"fr-t",children:["Summary",e.jsx("span",{className:"fr-n",children:y.hint})]})]}),e.jsxs("button",{className:"fr-card fr-util",style:{"--c":u.color},onClick:()=>l("power"),"aria-label":"Power Hub",children:[e.jsx("span",{className:"fr-ico",children:e.jsx(B,{color:u.color})}),e.jsxs("span",{className:"fr-t",children:["Power Hub",e.jsx("span",{className:"fr-n",children:u.hint})]})]})]})]}),e.jsxs("section",{className:"fr-sec","aria-labelledby":"fr-h-rack",children:[e.jsx("h2",{className:"fr-h",id:"fr-h-rack",children:"ตู้ Rack"}),e.jsx("div",{className:"fr-list",children:v.map(r=>e.jsxs("button",{className:"fr-card fr-rackcard",style:{"--c":r.color},onClick:()=>l(r.id),"aria-label":`Face Rack Phase ${r.id}`,children:[e.jsx("span",{className:"fr-stage",children:e.jsx(R,{units:r.units,color:r.color,label:`P${r.id}`})}),e.jsxs("span",{className:"fr-t",children:["Face Rack",e.jsxs("span",{className:"fr-n",children:["Phase ",r.id]})]})]},r.id))})]})]})})}),f&&e.jsx("iframe",{title:"Power Hub IDC3",src:c,style:{flex:1,minHeight:0,width:"100%",border:0,display:"block",background:x}},"power"),i&&e.jsx("iframe",{title:"Summary IDC3",src:h,style:{flex:1,minHeight:0,width:"100%",border:0,display:"block",background:x}},"summary"),t&&!n&&e.jsx("iframe",{title:`Face Rack IDC3 ${t.tag}`,src:`${j}${t.path}${d?`?gas=${encodeURIComponent(d)}`:""}`,style:{flex:1,minHeight:0,width:"100%",border:0,display:"block",background:x}},t.id),t&&n&&e.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center",color:"#E8F4F6",fontFamily:N,fontSize:14,lineHeight:1.7},children:["ยังไม่ได้ตั้งค่า VITE_RACK_GAS_URL ในไฟล์ .env",e.jsx("br",{}),"(ต้อง build ใหม่หลังแก้ .env)"]})]})}export{M as default};
