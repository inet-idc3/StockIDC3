import{r as N,j as r,c as C,i as B}from"./index-Ce9O3NNR.js";const g=B(),k="/StockIDC3/",j={1:"https://script.google.com/macros/s/AKfycbw2zpUFB7qxfr_tcnNnTF_svA9gddHA3_5p3vijBLYDrSpKRAFopm6uc7qwMpYLOQ_tQA/exec",2:"https://script.google.com/macros/s/AKfycbwEs4SoGyVF4ZAmzjVhL2raQmMKJfYQZ4C_p-uTXK8HR_BgohzvJNpf1yrMUhvp0ttUEA/exec"},v=[{id:1,tag:"PHASE 1",title:"Face Rack Phase 1",path:"apps/rack/index.html",color:g?"#FF7A6B":"#09D1C7",lines:["Zone 1","Zone 2","Network-Telecom"],units:["vent","led","vent","blank","plate","led","vent","vent","led","blank","vent","led"]},{id:2,tag:"PHASE 2",title:"Face Rack Phase 2",path:"apps/rack2/index.html",color:g?"#5FE0A0":"#46DFB1",lines:["Zone 1–2 Row 1–12","NET-A/B","TEL-A/B"],units:["led","vent","vent","plate","led","blank","vent","led","vent","vent","led","blank"]}],w={path:"apps/powerhub/index.html",color:"#FFC857",hint:"ไฟฟ้ารวม 2 เฟส"},F={path:"apps/summary/index.html",color:"#FF9F5A",hint:"PUE และน้ำมัน Gen"},A="'Noto Sans Thai',sans-serif",x=g?"#052f20":"#07111E",E=g?"95,224,160":"70,223,177",L=`
/* แถบหัว */
.fr-bar{display:flex;align-items:center;gap:8px;flex-shrink:0;font-family:${A};
  padding:calc(8px + env(safe-area-inset-top,0px)) 12px 8px;background:${x};border-bottom:1px solid rgba(255,255,255,.1)}
/* หน้าเลือก: แถบลอยโปร่งใสทับพื้นหลัง (ให้ลูกบอล/ไฟประดับห้อยจากขอบบนสุดได้) */
.fr-bar-pick{position:absolute;top:0;left:0;right:0;z-index:6;background:transparent;border-bottom:0}
.fr-back{display:grid;place-items:center;flex-shrink:0;width:36px;height:36px;border-radius:12px;border:0;background:none;color:#E8F4F6;cursor:pointer;transition:background .15s}
.fr-back:active{background:rgba(255,255,255,.12)}
.fr-back:focus-visible{outline:2px solid #E8F4F6;outline-offset:1px}
@media(hover:hover){.fr-back:hover{background:rgba(255,255,255,.07)}}
.fr-bar-t{font-size:15px;font-weight:600;color:#E8F4F6}
.fr-chip{font-family:'Space Mono',monospace;font-size:11px;line-height:1;padding:5px 9px;border-radius:99px;border:1px solid rgba(255,255,255,.16);color:rgba(255,255,255,.6)}

/* พื้นหลังหน้าเลือก: แสงเรือง + กระเบื้องพื้นห้อง Server จางลงด้านล่าง */
.fr-pickwrap{--glow:${E};position:relative;flex:1;min-height:0;overflow:hidden;font-family:${A};color:#E8F4F6;
  background:
    radial-gradient(80% 34% at 14% 0%, rgba(var(--glow),.18), transparent 70%),
    radial-gradient(60% 30% at 100% 22%, rgba(255,200,87,.07), transparent 70%),
    linear-gradient(180deg, transparent 0%, ${x} 72%),
    linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px) 0 0/28px 28px,
    linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px) 0 0/28px 28px,
    ${x};}
/* ธีมคริสต์มาส: เขียวเข้มแบบ Portal + โบเก้สีแดง/ทอง */
.fr-xm{
  background:
    radial-gradient(22% 15% at 10% 40%, rgba(255,200,87,.20), transparent 72%),
    radial-gradient(20% 16% at 92% 46%, rgba(255,110,80,.22), transparent 72%),
    radial-gradient(28% 18% at 4% 92%, rgba(255,80,70,.24), transparent 72%),
    radial-gradient(70% 36% at 20% 0%, rgba(95,224,160,.22), transparent 70%),
    radial-gradient(60% 34% at 100% 6%, rgba(255,200,87,.10), transparent 70%),
    linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px) 0 0/28px 28px,
    linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px) 0 0/28px 28px,
    linear-gradient(180deg,#0b4a31 0%,#08392a 50%,#052f20 100%);}
.fr-pick{position:absolute;inset:0;z-index:2;overflow-y:auto;padding:calc(64px + env(safe-area-inset-top,0px)) 16px calc(32px + env(safe-area-inset-bottom,0px))}
.fr-xm .fr-pick{padding-top:calc(134px + env(safe-area-inset-top,0px));padding-bottom:calc(120px + env(safe-area-inset-bottom,0px))}
.fr-wrap{container-type:inline-size;max-width:max(560px,var(--app-w,0px));margin:0 auto}
.fr-sec+.fr-sec{margin-top:26px}
@container (min-width:720px){
  .fr-sections{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start}
  .fr-sec+.fr-sec{margin-top:0}
}

/* หัวข้อกลุ่ม */
.fr-h{display:flex;align-items:center;gap:12px;margin:0 2px 12px;font-size:13px;font-weight:600;letter-spacing:.01em;color:rgba(232,244,246,.62)}
.fr-h::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.16),transparent)}
.fr-xm .fr-h{font-size:12.5px;font-weight:500;letter-spacing:.16em;color:rgba(232,244,246,.5)}
.fr-xm .fr-h::after{display:none}
.fr-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}

/* การ์ด (กระจกโปร่ง) — ไอคอนในกรอบสี + ชื่อ + คำอธิบายสั้น */
.fr-card{position:relative;isolation:isolate;overflow:hidden;display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;cursor:pointer;
  color:inherit;font:inherit;border-radius:22px;border:1px solid rgba(255,255,255,.09);padding:22px 10px 18px;
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
/* ธีมคริสต์มาส: การ์ดกระจก + ขอบบนเป็นหิมะสีขาวเป็นลอน */
.fr-xm .fr-card{padding-top:34px;border-color:rgba(255,255,255,.14);border-radius:24px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
  background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.035))}
.fr-xm .fr-card::after{top:0;left:0;right:0;height:12px;border-radius:0;box-shadow:none;opacity:.96;
  background:radial-gradient(circle at 8px 0,#f6fbf8 0 6.4px,transparent 7px) 0 0/16px 12px repeat-x}

/* กรอบไอคอนแบบแอป */
.fr-tile{width:76px;height:76px;border-radius:22px;display:grid;place-items:center;flex-shrink:0;
  background:linear-gradient(150deg,color-mix(in srgb,var(--c) 90%,#fff),color-mix(in srgb,var(--c) 58%,#000));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 -8px 14px rgba(0,0,0,.16),0 12px 20px -10px color-mix(in srgb,var(--c) 75%,#000)}
.fr-tile .fr-rack{height:58px;width:auto;display:block;filter:drop-shadow(0 3px 5px rgba(0,0,0,.45))}
.fr-tile .fr-glyph{width:44px;height:44px;display:block}
.fr-t{font-size:16px;font-weight:700;line-height:1.25;color:#EAF4F6}
.fr-n{display:block;font-weight:400;font-size:12.5px;line-height:1.35;color:rgba(232,244,246,.58);margin-top:3px}

.fr-led{animation:frBlink 2.4s ease-in-out infinite both}
@keyframes frBlink{0%,100%{opacity:.25}45%,55%{opacity:1}}
/* ตอนเปิดหน้า: ไฟไล่จากล่างขึ้นบนครั้งเดียว เหมือนบูตเครื่อง */
.fr-u{animation:frBoot .5s ease-out both}
@keyframes frBoot{from{opacity:0}to{opacity:1}}

/* ───── เครื่องประดับคริสต์มาส (อยู่ใต้การ์ด · กดทะลุได้) ───── */
.fr-xd{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}
.fr-lt{position:absolute;width:7px;height:10px;border-radius:50% 50% 60% 60%;background:var(--c);box-shadow:0 0 10px 3px var(--c);
  transform:translateX(-50%);animation:frTwk 2.4s ease-in-out var(--dl) infinite}
@keyframes frTwk{0%,100%{opacity:.45}50%{opacity:1}}
.fr-bz{position:absolute;top:0;transform:translateX(-50%)}
.fr-bz-in{display:flex;flex-direction:column;align-items:center;transform-origin:50% 0;animation:frSwing var(--dur) ease-in-out var(--dl) infinite alternate}
.fr-bz-str{display:block;width:1px;height:var(--len);background:rgba(255,255,255,.4)}
.fr-bz-in svg{display:block;filter:drop-shadow(0 6px 8px rgba(0,0,0,.4))}
@keyframes frSwing{from{transform:rotate(-3.5deg)}to{transform:rotate(3.5deg)}}
.fr-sn{position:absolute;top:-10px;left:var(--l);width:var(--s);height:var(--s);border-radius:50%;background:#fff;opacity:var(--o);
  animation:frSnow var(--d) linear var(--dl) infinite}
@keyframes frSnow{to{transform:translate3d(var(--x),105vh,0)}}
.fr-flk{position:absolute;left:var(--l);top:var(--t);width:var(--s);height:var(--s);opacity:.85;animation:frSpin 26s linear infinite}
.fr-flk svg{width:100%;height:100%;display:block}
@keyframes frSpin{to{transform:rotate(360deg)}}
.fr-st{position:absolute;left:var(--l);top:var(--t);width:var(--s);height:var(--s);animation:frStar 2.8s ease-in-out var(--dl) infinite}
.fr-st svg{width:100%;height:100%;display:block;filter:drop-shadow(0 0 5px rgba(255,200,87,.8))}
@keyframes frStar{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}
.fr-floor{position:absolute;left:0;right:0;bottom:0;height:58px;
  background:
    radial-gradient(ellipse 50% 100% at 50% 100%,#f6fbf8 0 97%,transparent 100%) 0 100%/150px 46px repeat-x,
    radial-gradient(ellipse 50% 100% at 50% 100%,#d9ece3 0 97%,transparent 100%) 75px 100%/150px 58px repeat-x}
.fr-tree{position:absolute;left:50%;bottom:30px;height:96px;width:auto;transform:translateX(-50%);filter:drop-shadow(0 6px 10px rgba(0,0,0,.35))}

@media(prefers-reduced-motion:reduce){
  .fr-led,.fr-u,.fr-lt,.fr-bz-in,.fr-sn,.fr-flk,.fr-st{animation:none}
  .fr-led{opacity:.9}.fr-card{transition:none}.fr-sn{display:none}
}
`;function M(e){return()=>{e|=0,e=e+1831565813|0;let a=Math.imul(e^e>>>15,1|e);return a=a+Math.imul(a^a>>>7,61|a)^a,((a^a>>>14)>>>0)/4294967296}}const h=M(2027),R=["#FFC857","#5FE0A0","#FF7A6B","#7CC8FF"],$=Array.from({length:22},(e,a)=>({x:(a+.5)/22*100,y:3+6*Math.sin(a*.9),c:R[a%4],dl:(a*.37%2.4).toFixed(2)})),O=[{x:9,len:62,d:30,c:"R"},{x:24,len:70,d:34,c:"G"},{x:38,len:90,d:38,c:"R"},{x:52,len:56,d:28,c:"G"},{x:64,len:92,d:38,c:"G"},{x:77,len:72,d:32,c:"R"},{x:89,len:88,d:36,c:"R"},{x:97,len:58,d:28,c:"G"}].map((e,a)=>({...e,dur:(4+a*.7%2.6).toFixed(1),dl:(-(a*.9)%5).toFixed(1)})),G=Array.from({length:26},()=>({l:(h()*100).toFixed(1)+"%",s:(2+h()*3.2).toFixed(1)+"px",d:(9+h()*11).toFixed(1)+"s",dl:(-h()*20).toFixed(1)+"s",x:((h()-.5)*60).toFixed(0)+"px",o:(.35+h()*.55).toFixed(2)})),P=[{l:"5%",t:"62%",s:34},{l:"47%",t:"70%",s:28},{l:"80%",t:"81%",s:36},{l:"92%",t:"50%",s:24}],H=[{l:"14%",t:"56%",s:12},{l:"30%",t:"74%",s:14},{l:"60%",t:"64%",s:11},{l:"86%",t:"70%",s:15},{l:"96%",t:"58%",s:11},{l:"8%",t:"86%",s:13}].map((e,a)=>({...e,dl:(-(a*.8)).toFixed(1)+"s"}));function T({d:e,c:a}){return r.jsxs("svg",{width:e,height:Math.round(e*1.15),viewBox:"0 0 40 46","aria-hidden":"true",focusable:"false",children:[r.jsx("rect",{x:"15",y:"0",width:"10",height:"7",rx:"2",fill:"#C99A2E"}),r.jsx("circle",{cx:"20",cy:"26",r:"19",fill:`url(#frBz${a})`}),r.jsx("ellipse",{cx:"13.5",cy:"17.5",rx:"5",ry:"3.4",transform:"rotate(-30 13.5 17.5)",fill:"#fff",fillOpacity:".55"})]})}function D(){return r.jsx("svg",{viewBox:"0 0 40 40",fill:"none",stroke:"#fff",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[0,60,120,180,240,300].map(e=>r.jsx("g",{transform:`rotate(${e} 20 20)`,children:r.jsx("path",{d:"M20 20V3M15.5 8l4.5 4.5L24.5 8"})},e))})}function W(){return r.jsx("svg",{viewBox:"0 0 24 24","aria-hidden":"true",children:r.jsx("path",{d:"m12 2 2.6 6.9L22 10l-5.7 4.7L18 22l-6-4-6 4 1.7-7.3L2 10l7.4-1.1z",fill:"#FFC857"})})}function I(){return r.jsxs("svg",{className:"fr-tree",viewBox:"0 0 64 96","aria-hidden":"true",focusable:"false",children:[r.jsx("rect",{x:"28",y:"82",width:"8",height:"12",rx:"1.5",fill:"#6B4A2B"}),r.jsx("path",{d:"M32 18 14 46h8L8 66h10L4 86h56L46 66h10L42 46h8z",fill:"#0F7A47"}),r.jsx("path",{d:"M32 18 20 38h24zM32 40 16 62h32zM32 62 10 84h44z",fill:"#14915A",fillOpacity:".55"}),r.jsx("path",{d:"M26 30l6-6 6 6zM22 52l10-8 10 8zM16 74l16-10 16 10z",fill:"#F6FBF8",fillOpacity:".92"}),r.jsx("path",{d:"m32 4 2.2 5.8 6.2.5-4.8 4 1.5 6-5.1-3.3-5.1 3.3 1.5-6-4.8-4 6.2-.5z",fill:"#FFC857"}),[[26,50,"#FF7A6B"],[40,58,"#FFC857"],[22,72,"#7CC8FF"],[44,76,"#FF7A6B"],[32,66,"#FFC857"]].map(([e,a,l],d)=>r.jsx("circle",{className:"fr-led",cx:e,cy:a,r:"2.2",fill:l,style:{animationDelay:`${d*380}ms`}},d))]})}function _(){return r.jsxs("div",{className:"fr-xd","aria-hidden":"true",children:[r.jsx("svg",{width:"0",height:"0",style:{position:"absolute"},children:r.jsxs("defs",{children:[r.jsxs("radialGradient",{id:"frBzG",cx:".35",cy:".3",r:".85",children:[r.jsx("stop",{offset:"0",stopColor:"#FFE58A"}),r.jsx("stop",{offset:".6",stopColor:"#E7B53A"}),r.jsx("stop",{offset:"1",stopColor:"#A87415"})]}),r.jsxs("radialGradient",{id:"frBzR",cx:".35",cy:".3",r:".85",children:[r.jsx("stop",{offset:"0",stopColor:"#FF7A7A"}),r.jsx("stop",{offset:".6",stopColor:"#E02A3A"}),r.jsx("stop",{offset:"1",stopColor:"#8F0F1F"})]})]})}),$.map((e,a)=>r.jsx("i",{className:"fr-lt",style:{left:e.x+"%",top:e.y,"--c":e.c,"--dl":e.dl+"s"}},a)),O.map((e,a)=>r.jsx("div",{className:"fr-bz",style:{left:e.x+"%","--len":e.len+"px","--dur":e.dur+"s","--dl":e.dl+"s"},children:r.jsxs("div",{className:"fr-bz-in",children:[r.jsx("i",{className:"fr-bz-str"}),r.jsx(T,{d:e.d,c:e.c})]})},a)),G.map((e,a)=>r.jsx("i",{className:"fr-sn",style:{"--l":e.l,"--s":e.s,"--d":e.d,"--dl":e.dl,"--x":e.x,"--o":e.o}},a)),P.map((e,a)=>r.jsx("span",{className:"fr-flk",style:{"--l":e.l,"--t":e.t,"--s":e.s+"px"},children:r.jsx(D,{})},a)),H.map((e,a)=>r.jsx("span",{className:"fr-st",style:{"--l":e.l,"--t":e.t,"--s":e.s+"px","--dl":e.dl},children:r.jsx(W,{})},a)),r.jsx("div",{className:"fr-floor"}),r.jsx(I,{})]})}function U({units:e,color:a,label:l}){const d="frb"+N.useId().replace(/:/g,""),s=11,t=14,p=11,m=62;return r.jsxs("svg",{className:"fr-rack",viewBox:"0 0 84 160","aria-hidden":"true",focusable:"false",children:[r.jsx("defs",{children:r.jsxs("linearGradient",{id:d,x1:"0",y1:"0",x2:"0",y2:"1",children:[r.jsx("stop",{offset:"0",stopColor:"#16304B"}),r.jsx("stop",{offset:"1",stopColor:"#0A1626"})]})}),r.jsx("rect",{x:"1.5",y:"1.5",width:"81",height:"157",rx:"6",fill:`url(#${d})`,stroke:a,strokeOpacity:".6",strokeWidth:"1.5"}),r.jsx("rect",{x:"11",y:"5",width:"62",height:"4",rx:"2",fill:a,fillOpacity:".22"}),r.jsx("rect",{x:"11",y:"5",width:"18",height:"4",rx:"2",fill:a,fillOpacity:".7"}),r.jsx("rect",{x:"5",y:"9",width:"5",height:"142",rx:"1.5",fill:"rgba(255,255,255,.07)"}),r.jsx("rect",{x:"74",y:"9",width:"5",height:"142",rx:"1.5",fill:"rgba(255,255,255,.07)"}),e.map((f,o)=>r.jsxs("g",{fill:a,fillOpacity:".4",children:[r.jsx("circle",{cx:"7.5",cy:t+o*s+s/2,r:".9"}),r.jsx("circle",{cx:"76.5",cy:t+o*s+s/2,r:".9"})]},"h"+o)),e.map((f,o)=>{const c=t+o*s,n=e.length-1-o;return r.jsx("g",{className:"fr-u",style:{animationDelay:`${n*60}ms`},children:f==="plate"?r.jsxs(r.Fragment,{children:[r.jsx("rect",{x:p,y:c+.8,width:m,height:s-1.6,rx:"1.5",fill:a}),r.jsx("text",{x:p+m/2,y:c+s/2+3,textAnchor:"middle",fontSize:"8",fontWeight:"700",fill:x,fontFamily:"'Space Mono',monospace",children:l})]}):r.jsxs(r.Fragment,{children:[r.jsx("rect",{x:p,y:c+.8,width:m,height:s-1.6,rx:"1.5",fill:"rgba(255,255,255,.06)",stroke:"rgba(255,255,255,.15)",strokeWidth:".6"}),f==="vent"&&[0,1,2,3,4,5,6].map(i=>r.jsx("line",{x1:p+20+i*5,x2:p+20+i*5,y1:c+3,y2:c+s-3,stroke:"rgba(255,255,255,.2)",strokeWidth:"1"},i)),f==="led"&&[0,1,2].map(i=>{const b=i===2?"#FFC857":a,u=p+7+i*6,y=c+s/2;return r.jsxs("g",{className:"fr-led",style:{animationDelay:`${(o*370+i*530)%2400}ms`},children:[r.jsx("circle",{cx:u,cy:y,r:"3.6",fill:b,fillOpacity:".22"}),r.jsx("circle",{cx:u,cy:y,r:"1.7",fill:b})]},i)}),f==="led"&&r.jsx("rect",{x:p+30,y:c+s/2-1,width:"24",height:"2",rx:"1",fill:"rgba(255,255,255,.16)"})]})},o)}),r.jsx("rect",{x:"11",y:"151",width:"62",height:"3",rx:"1.5",fill:a,fillOpacity:".3"})]})}function K(){return r.jsxs("svg",{className:"fr-glyph",viewBox:"0 0 48 48","aria-hidden":"true",focusable:"false",children:[r.jsx("path",{d:"M27 3 10 27h11.5L18 45l20-26H26.5z",fill:"#2A1B00",fillOpacity:".88"}),r.jsx("path",{className:"fr-led",d:"M8 8h5M35 40h5",stroke:"#2A1B00",strokeWidth:"2.4",strokeLinecap:"round"})]})}function X(){return r.jsxs("svg",{className:"fr-glyph",viewBox:"0 0 48 48","aria-hidden":"true",focusable:"false",children:[r.jsx("path",{d:"M7 32a17 17 0 0 1 34 0",fill:"none",stroke:"#2A1500",strokeOpacity:".35",strokeWidth:"5",strokeLinecap:"round"}),r.jsx("path",{d:"M7 32a17 17 0 0 1 23.5-15.7",fill:"none",stroke:"#2A1500",strokeOpacity:".88",strokeWidth:"5",strokeLinecap:"round"}),r.jsx("path",{className:"fr-led",d:"M24 32 33 21",stroke:"#2A1500",strokeWidth:"3",strokeLinecap:"round"}),r.jsx("circle",{cx:"24",cy:"32",r:"3.4",fill:"#2A1500"}),r.jsx("path",{d:"M12 41h24",stroke:"#2A1500",strokeOpacity:".6",strokeWidth:"2.6",strokeLinecap:"round"})]})}function Z({onBack:e}){const[a,l]=N.useState(null);N.useEffect(()=>{function n(i){var b,u,y,S;i.origin===window.location.origin&&(((b=i.data)==null?void 0:b.type)==="rack-auth-expired"&&(C(),window.location.reload()),((u=i.data)==null?void 0:u.type)==="rack-open-phase"&&v.some(z=>z.id===i.data.phase)&&l(i.data.phase),((y=i.data)==null?void 0:y.type)==="rack-open-powerhub"&&l("power"),((S=i.data)==null?void 0:S.type)==="rack-open-summary"&&l("summary"))}return window.addEventListener("message",n),()=>window.removeEventListener("message",n)},[]);const d=a==="power",s=a==="summary",t=v.find(n=>n.id===a),p=`${k}${w.path}?g1=${encodeURIComponent(j[1])}&g2=${encodeURIComponent(j[2])}`,m=`${k}${F.path}`,f=!t&&!d&&!s,o=t?j[t.id]:"",c=(t==null?void 0:t.id)===1&&!o;return r.jsxs("div",{style:{position:"absolute",inset:0,display:"flex",flexDirection:"column",background:x},children:[r.jsx("style",{children:L}),r.jsxs("div",{className:`fr-bar${f?" fr-bar-pick":""}`,children:[r.jsx("button",{className:"fr-back",onClick:()=>a?l(null):e(),"aria-label":"กลับ",children:r.jsx("i",{className:"ti ti-chevron-left",style:{fontSize:20}})}),r.jsx("span",{className:"fr-bar-t",children:"Face Rack"}),r.jsxs("span",{className:"fr-chip",children:["IDC3",t?` · P${t.id}`:d?" · Power Hub":s?" · Summary":""]})]}),f&&r.jsxs("div",{className:`fr-pickwrap${g?" fr-xm":""}`,children:[g&&r.jsx(_,{}),r.jsx("div",{className:"fr-pick",children:r.jsx("div",{className:"fr-wrap",children:r.jsxs("div",{className:"fr-sections",children:[r.jsxs("section",{className:"fr-sec","aria-labelledby":"fr-h-site",children:[r.jsx("h2",{className:"fr-h",id:"fr-h-site",children:"ภาพรวมทั้งไซต์"}),r.jsxs("div",{className:"fr-list",children:[r.jsxs("button",{className:"fr-card",style:{"--c":F.color},onClick:()=>l("summary"),"aria-label":"Summary",children:[r.jsx("span",{className:"fr-tile",children:r.jsx(X,{})}),r.jsxs("span",{className:"fr-t",children:["Summary",r.jsx("span",{className:"fr-n",children:F.hint})]})]}),r.jsxs("button",{className:"fr-card",style:{"--c":w.color},onClick:()=>l("power"),"aria-label":"Power Hub",children:[r.jsx("span",{className:"fr-tile",children:r.jsx(K,{})}),r.jsxs("span",{className:"fr-t",children:["Power Hub",r.jsx("span",{className:"fr-n",children:w.hint})]})]})]})]}),r.jsxs("section",{className:"fr-sec","aria-labelledby":"fr-h-rack",children:[r.jsx("h2",{className:"fr-h",id:"fr-h-rack",children:"ตู้ Rack"}),r.jsx("div",{className:"fr-list",children:v.map(n=>r.jsxs("button",{className:"fr-card",style:{"--c":n.color},onClick:()=>l(n.id),"aria-label":`Face Rack Phase ${n.id}`,children:[r.jsx("span",{className:"fr-tile",children:r.jsx(U,{units:n.units,color:n.color,label:`P${n.id}`})}),r.jsxs("span",{className:"fr-t",children:["Face Rack",r.jsxs("span",{className:"fr-n",children:["Phase ",n.id]})]})]},n.id))})]})]})})})]}),d&&r.jsx("iframe",{title:"Power Hub IDC3",src:p,style:{flex:1,minHeight:0,width:"100%",border:0,display:"block",background:x}},"power"),s&&r.jsx("iframe",{title:"Summary IDC3",src:m,style:{flex:1,minHeight:0,width:"100%",border:0,display:"block",background:x}},"summary"),t&&!c&&r.jsx("iframe",{title:`Face Rack IDC3 ${t.tag}`,src:`${k}${t.path}${o?`?gas=${encodeURIComponent(o)}`:""}`,style:{flex:1,minHeight:0,width:"100%",border:0,display:"block",background:x}},t.id),t&&c&&r.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center",color:"#E8F4F6",fontFamily:A,fontSize:14,lineHeight:1.7},children:["ยังไม่ได้ตั้งค่า VITE_RACK_GAS_URL ในไฟล์ .env",r.jsx("br",{}),"(ต้อง build ใหม่หลังแก้ .env)"]})]})}export{Z as default};
