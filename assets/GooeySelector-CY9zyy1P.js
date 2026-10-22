import{a as qt,r as k,j as ot}from"./index-DVHFRCtp.js";const L=32,nt=4,C=72,It=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`,Ot=`#version 300 es
precision highp float;

uniform vec2 uSize;
uniform float uRatio;
uniform vec4 uPills[${nt}];
uniform vec4 uHover;
uniform vec4 uDrops[${L}];
uniform vec2 uTails[${L}];
uniform vec3 uTints[${L}];
uniform int uCount;
uniform float uSmooth;
uniform vec3 uPill;
uniform vec4 uHoverColor;
uniform float uShadow;
uniform float uCornerRadius;

out vec4 outColor;

float sdPill(vec2 p, vec4 box) {
  vec2 extent = max(box.zw, vec2(0.0));
  float r = min(min(extent.x, extent.y), uCornerRadius);
  vec2 q = abs(p - box.xy) - extent + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

vec4 blend(vec4 a, vec4 b, float k) {
  float h = clamp(0.5 + 0.5 * (b.w - a.w) / k, 0.0, 1.0);
  return vec4(mix(b.rgb, a.rgb, h), mix(b.w, a.w, h) - k * h * (1.0 - h));
}

vec4 field(vec2 p) {
  vec4 shape = vec4(uPill, 1e5);
  for (int i = 0; i < ${nt}; i++) {
    vec4 pill = uPills[i];
    if (pill.z <= 0.0) continue;
    shape = blend(shape, vec4(uPill, sdPill(p, pill)), uSmooth);
  }
  for (int i = 0; i < ${L}; i++) {
    if (i >= uCount) break;
    vec4 drop = uDrops[i];
    if (drop.z <= 0.0) continue;
    float d = sdCapsule(p, drop.xy, drop.xy - uTails[i], drop.z);
    if (d > shape.w + uSmooth) continue;
    shape = blend(shape, vec4(uTints[i], d), uSmooth);
  }
  return shape;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uRatio - gl_FragCoord.y) / uRatio;
  vec4 shape = field(p);
  float d = shape.w;
  float aa = max(fwidth(d), 0.35);
  float body = clamp(0.5 - d / aa, 0.0, 1.0);

  vec2 grad = vec2(dFdx(d), -dFdy(d));
  vec2 n = length(grad) > 0.0001 ? normalize(grad) : vec2(0.0, 1.0);
  float rim = shape.r > 0.5 ? 0.0 : (1.0 - smoothstep(0.0, 1.6, -d)) * max(0.0, -n.y) * 0.3;
  float shade = shape.r > 0.5 ? 1.0 : (1.0 - 0.06 * max(0.0, n.y) * (1.0 - smoothstep(0.0, 6.0, -d)));
  vec3 fill = mix(shape.rgb, vec3(1.0), rim) * shade;

  float lifted = field(p - vec2(0.0, 3.0)).w;
  float shadow = (1.0 - smoothstep(-3.0, 9.0, lifted)) * uShadow * (1.0 - body);

  float hover = clamp(0.5 - sdPill(p, uHover) / aa, 0.0, 1.0) * uHoverColor.a;

  vec4 color = vec4(0.0, 0.0, 0.0, shadow);
  color = vec4(uHoverColor.rgb * hover, hover) + color * (1.0 - hover);
  color = vec4(fill * body, body) + color * (1.0 - body);
  outColor = color;
}
`,jt=n=>{const s=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(n).trim());if(s){const v=s[1].length===3?s[1].replace(/./g,y=>y+y):s[1];return[0,2,4].map(y=>parseInt(v.slice(y,y+2),16)/255).concat(1)}const w=/rgba?\(([^)]+)\)/i.exec(String(n));if(w){const v=w[1].split(",").map(y=>parseFloat(y));return[v[0]/255,v[1]/255,v[2]/255,v[3]??1]}return[1,1,1,1]},U=n=>Math.min(1,Math.max(0,n)),Bt=n=>{const s=U(n);return s<.5?4*s*s*s:1-(-2*s+2)**3/2},$t=(n,s,w,v,y)=>{const l=1-y;return l*l*l*n+3*l*l*y*s+3*l*y*y*w+y*y*y*v},Vt=(n,s,w,v,y)=>{if(w<=.5||v<=.5)return"";const l=Math.min(Math.min(w,v)/2,y);return l===0?`M${n},${s}H${n+w}V${s+v}H${n}Z`:`M${n+l},${s}H${n+w-l}A${l},${l} 0 0 1 ${n+w},${s+l}V${s+v-l}A${l},${l} 0 0 1 ${n+w-l},${s+v}H${n+l}A${l},${l} 0 0 1 ${n},${s+v-l}V${s+l}A${l},${l} 0 0 1 ${n+l},${s}Z`},At=(n,s,w)=>{const v=n.createShader(s);return n.shaderSource(v,w),n.compileShader(v),v},Nt=["uCornerRadius","uSize","uRatio","uPills","uHover","uDrops","uTails","uTints","uCount","uSmooth","uPill","uHoverColor","uShadow"],Gt=n=>{const s=n.createProgram(),w=At(n,n.VERTEX_SHADER,It),v=At(n,n.FRAGMENT_SHADER,Ot);if(n.attachShader(s,w),n.attachShader(s,v),n.linkProgram(s),n.deleteShader(w),n.deleteShader(v),!n.getProgramParameter(s,n.LINK_STATUS))return n.deleteProgram(s),null;const y=Object.fromEntries(Nt.map(q=>[q,n.getUniformLocation(s,q)])),l=n.createBuffer();return n.bindBuffer(n.ARRAY_BUFFER,l),n.bufferData(n.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),n.STATIC_DRAW),{program:s,uniforms:y,buffer:l,position:n.getAttribLocation(s,"aPosition")}},Zt=({activeIndex:n,itemCount:s=3,color:w,labelColor:v,activeLabelColor:y,cornerRadius:l=9999})=>{const{theme:q}=qt(),X=Math.min(Math.max(0,n),s-1),at=w||(q==="dark"?"#ffffff":"#000000"),rt=k.useRef(null),dt=k.useRef(null),Y=k.useRef(null),j=k.useRef(X),pt={cornerRadius:Math.max(0,l),customColor:!!w,labelColor:v??(q==="dark"?"#ffffff":"#000000"),activeLabelColor:y??(w?"#ffffff":q==="dark"?"#000000":"#ffffff"),animationTime:600,particleCount:15,timeVariance:300,spread:56,gooeyness:.5,wobble:.5,hoverEffect:!1,pillRgb:jt(at),tints:[],hoverRgb:[0,0,0,0],shadow:0},F=k.useRef(pt);return k.useLayoutEffect(()=>{j.current=X,F.current=pt}),k.useLayoutEffect(()=>{const I=rt.current?.parentElement,E=rt.current,W=I,B=dt.current;if(!I||!E||!W||!B)return;const K=window.matchMedia("(prefers-reduced-motion: reduce)");let Q=K.matches;const u=Q?null:E.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1}),_=u?Gt(u):null;B.style.display=_?"none":"block",E.style.display=_?"block":"none";const T=document.createElement("span");T.setAttribute("aria-hidden","true"),T.inert=!0,Object.assign(T.style,{position:"absolute",inset:"0",pointerEvents:"none",zIndex:"2"}),I.appendChild(T);const J=Array.from(W.querySelectorAll(":scope > button, :scope > a")),Ct=J.map(t=>t.style.color),st=()=>{T.replaceChildren(),T.style.display=F.current.customColor?"none":"",J.forEach((t,d)=>{const r=H[d];if(!r)return;const a=document.createElement("span"),x=getComputedStyle(t);for(const h of["font-family","font-size","font-weight","line-height","letter-spacing","text-transform","gap","padding","box-sizing","align-items","justify-content"])a.style.setProperty(h,x.getPropertyValue(h));Object.assign(a.style,{position:"absolute",display:"flex",alignItems:"center",justifyContent:"center",left:r.x+"px",top:r.y+"px",width:r.w+"px",height:r.h+"px",whiteSpace:"nowrap",color:F.current.activeLabelColor});for(const h of t.childNodes)a.appendChild(h.cloneNode(!0));a.querySelectorAll("[id]").forEach(h=>h.removeAttribute("id")),T.appendChild(a),t.style.color=F.current.customColor&&d===j.current?F.current.activeLabelColor:F.current.labelColor})},z={width:0,height:0};let H=[],$=-1;const S=new Map,P=[],A={x:0,y:0,w:0,h:0,alpha:0,index:-1},V=new Float32Array(nt*4),Z=new Float32Array(L*4),it=new Float32Array(L*2),tt=new Float32Array(L*3);let O=0,ct=0,lt=!1;const et=()=>{const t=I.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);z.width=t.width,z.height=t.height;const r=t.width+C*2,a=t.height+C*2;Object.assign(E.style,{left:`${-C}px`,top:`${-C}px`,width:`${r}px`,height:`${a}px`});const x=Math.max(1,Math.round(r*d)),h=Math.max(1,Math.round(a*d));(E.width!==x||E.height!==h)&&(E.width=x,E.height=h),H=Array.from(W.querySelectorAll(":scope > button, :scope > a")).map(f=>{const m=f.getBoundingClientRect();return{x:m.left-t.left-I.clientLeft,y:m.top-t.top-I.clientTop,w:m.width,h:m.height}}),st()},St=(t,d,r)=>{const a=(f,m)=>{let g=1e5;const c=i=>{const b=U(.5+.5*(i-g)/r);g=i+(g-i)*b-r*b*(1-b)};for(const i of t){const b=Math.min(i.hw,i.hh,F.current.cornerRadius),o=Math.abs(f-i.cx)-i.hw+b,M=Math.abs(m-i.cy)-i.hh+b;c(Math.hypot(Math.max(o,0),Math.max(M,0))+Math.min(Math.max(o,M),0)-b)}for(const i of d){const b=f-i.x,o=m-i.y,M=-i.tx,p=-i.ty,e=M*M+p*p,R=e>1e-4?U((b*M+o*p)/e):0,D=Math.hypot(b-M*R,o-p*R)-i.r;D>g+r||c(D)}return g},h=[];for(let f=0;f<z.height;f+=1){const m=f+.5;let g=a(0,m),c=g<0?0:null;for(let i=2;i<=z.width+2;i+=2){const b=a(Math.min(i,z.width),m);if(g<0!=b<0){const o=i-2+2*g/(g-b);b<0?c=o:c!==null&&(h.push(`M${c.toFixed(1)},${f}H${o.toFixed(1)}V${f+1}H${c.toFixed(1)}Z`),c=null)}g=b}c!==null&&h.push(`M${c.toFixed(1)},${f}H${z.width}V${f+1}H${c.toFixed(1)}Z`)}return h.join("")},ht=t=>(S.has(t)||S.set(t,{mass:0,scale:0,velocity:0,outgoing:0}),S.get(t)),bt=(t,d)=>{const r=H[t];if(!r||d<=.002)return null;const a=r.h*Math.min(1.08,.42+.58*Math.sqrt(Math.max(0,d))),x=Math.max(a,r.w*Math.max(0,d)**.75);return{x:r.x+r.w/2-x/2,y:r.y+r.h/2-a/2,w:x,h:a}},ut=(t,d,r,a)=>{const x=F.current,h=H[d];if(!h)return;const f=Math.max(0,x.spread),m=h.x+h.w/2+(Math.random()-.5)*h.w*.45,g=h.y+h.h/2+(Math.random()-.5)*h.h*.2,c=Math.max(.15,x.animationTime/1e3),i=(Math.random()-.5)*(Math.max(0,x.timeVariance)/1e3),b=Math.max(.15,c*(.62+Math.random()*.32)+i*.6),o=Math.random()*Math.PI*2,M=Math.random()*Math.PI*2,p=f*(.7+Math.random()*.6),e=f*(.55+Math.random()*.55),R=Math.min(b/3,.12);t.index=d,t.start=r,t.duration=b,t.path=[t.x,t.y,a?t.x+Math.cos(o)*p*1.6:t.x+t.vx*R,a?t.y+Math.sin(o)*p*1.6:t.y+t.vy*R,m+Math.cos(M)*e*1.5,g+Math.sin(M)*e*1.5,m,g]},Pt=(t,d,r)=>{const a=F.current,x=S.get(t),h=H[t];if(!x||!h||!H[d])return;const f=x.mass-x.outgoing;if(f<=.002)return;const m=L-P.length,g=Math.min(m,Math.max(1,Math.round(Math.max(1,a.particleCount)*f)));if(g<=0)return;const c=Math.max(.15,a.animationTime/1e3)*.16;for(let i=0;i<g;i++){const b=f/g;x.outgoing+=b,P.push({x:h.x+h.w/2+(Math.random()-.5)*h.w*.6,y:h.y+h.h/2+(Math.random()-.5)*h.h*.3,vx:0,vy:0,mass:b,size:.8+Math.random()*.4,given:0,source:t,index:d,leave:r+Math.random()*c*1e3,emerged:0,absorbed:0,state:"waiting",tint:a.tints.length?a.tints[Math.floor(Math.random()*a.tints.length)]:null})}},N=()=>{const t=F.current,d=H[$]?.h??H[0]?.h??36,r=d*(.18+.5*U(t.gooeyness)),a=[],x=[];for(const[o,M]of S){const p=bt(o,M.scale);p&&a.push({cx:p.x+p.w/2,cy:p.y+p.h/2,hw:p.w/2,hh:p.h/2})}for(const o of P){if(o.state==="waiting")continue;const M=.26*d*o.size*Math.min(o.emerged,1-o.absorbed);if(M<=.05)continue;const p=Math.hypot(o.vx,o.vy),e=Math.min(M*1.1,p*.018);x.push({x:o.x,y:o.y,r:M,tx:p>.01?o.vx/p*e:0,ty:p>.01?o.vy/p*e:0,tint:o.tint})}if(a.length===1&&!x.length){const o=a[0];T.style.clipPath=`path('${Vt(o.cx-o.hw,o.cy-o.hh,o.hw*2,o.hh*2,t.cornerRadius)}')`}else T.style.clipPath=`path('${St(a,x,r)||"M0,0Z"}')`;if(T.style.visibility="visible",!_||!u){const o=bt($,1);o&&(B.style.transform=`translate(${o.x.toFixed(2)}px, ${o.y.toFixed(2)}px)`,B.style.width=`${o.w}px`,B.style.height=`${o.h}px`),B.style.opacity=o?"1":"0";return}let f=0;for(const o of a){if(f>=nt)break;V[f*4]=o.cx+C,V[f*4+1]=o.cy+C,V[f*4+2]=o.hw,V[f*4+3]=o.hh,f+=1}V.fill(0,f*4);let m=0;for(const o of x){if(m>=L)break;Z[m*4]=o.x+C,Z[m*4+1]=o.y+C,Z[m*4+2]=o.r,Z[m*4+3]=0,it[m*2]=o.tx,it[m*2+1]=o.ty;const M=o.tint||t.pillRgb;tt[m*3]=M[0],tt[m*3+1]=M[1],tt[m*3+2]=M[2],m+=1}const{program:g,uniforms:c,buffer:i,position:b}=_;u.viewport(0,0,E.width,E.height),u.clearColor(0,0,0,0),u.clear(u.COLOR_BUFFER_BIT),u.useProgram(g),u.bindBuffer(u.ARRAY_BUFFER,i),u.enableVertexAttribArray(b),u.vertexAttribPointer(b,2,u.FLOAT,!1,0,0),u.uniform2f(c.uSize,z.width+C*2,z.height+C*2),u.uniform1f(c.uRatio,E.width/Math.max(1,z.width+C*2)),u.uniform4fv(c.uPills,V),u.uniform4f(c.uHover,A.x+C,A.y+C,A.w/2,A.h/2),u.uniform4fv(c.uDrops,Z),u.uniform2fv(c.uTails,it),u.uniform3fv(c.uTints,tt),u.uniform1i(c.uCount,m),u.uniform1f(c.uSmooth,r),u.uniform3f(c.uPill,t.pillRgb[0],t.pillRgb[1],t.pillRgb[2]),u.uniform4f(c.uHoverColor,t.hoverRgb[0],t.hoverRgb[1],t.hoverRgb[2],t.hoverRgb[3]*A.alpha),u.uniform1f(c.uShadow,t.shadow),u.uniform1f(c.uCornerRadius,t.cornerRadius),u.drawArrays(u.TRIANGLE_STRIP,0,4)},vt=t=>{O=0;const d=F.current,r=Math.min(.05,(t-ct)/1e3||0);ct=t;const a=.09,x=.12;for(let p=P.length-1;p>=0;p--){const e=P[p];if(e.state==="waiting"){if(t<e.leave)continue;e.state="flying",ut(e,e.index,t,!0)}if(e.state==="flying"){e.emerged=Math.min(1,e.emerged+r/a);const R=S.get(e.source);if(R&&e.given<e.mass){const mt=Math.min(e.mass*(r/a),e.mass-e.given);R.mass=Math.max(0,R.mass-mt),R.outgoing=Math.max(0,R.outgoing-mt),e.given+=mt}const D=U((t-(e.start??t))/1e3/(e.duration??1)),Mt=Bt(D),[Et,Tt,Ht,zt,kt,Lt,_t,Dt]=e.path??[e.x,e.y,e.x,e.y,e.x,e.y,e.x,e.y],wt=$t(Et,Ht,kt,_t,Mt),Rt=$t(Tt,zt,Lt,Dt,Mt);r>0&&(e.vx=(wt-e.x)/r,e.vy=(Rt-e.y)/r),e.x=wt,e.y=Rt,D>=1&&(e.state="absorbing")}if(e.state==="absorbing"){const R=Math.min(1-e.absorbed,r/x);e.absorbed+=R,e.vx*=.8,e.vy*=.8;const D=ht(e.index);D.mass=Math.min(1,D.mass+e.mass*R),e.absorbed>=1&&P.splice(p,1)}}const h=Q?1:1-.72*U(d.wobble),f=26,m=Math.max(1,Math.ceil(r/(1/240))),g=r/m;for(const[p,e]of S){for(let R=0;R<m;R++)e.velocity+=(f*f*(e.mass-e.scale)-2*h*f*e.velocity)*g,e.scale+=e.velocity*g;p!==$&&e.mass<=.002&&e.outgoing<=.002&&Math.abs(e.scale)<.004&&S.delete(p)}const c=d.hoverEffect&&A.index>=0?1:0;A.alpha+=(c-A.alpha)*(1-Math.exp(-r/.08)),N();const i=S.get($),b=P.length===0&&S.size===1&&i&&Math.abs(i.mass-i.scale)<8e-4&&Math.abs(i.velocity)<.004,o=H[A.index],M=Math.abs(c-A.alpha)>.003||o&&Math.abs(o.x+o.w/2-A.x)+Math.abs(o.w-A.w)>.1;!b||M?O=requestAnimationFrame(vt):(i.mass=1,i.scale=1,i.velocity=0,A.alpha=c,N())},xt=()=>{O||lt||(ct=performance.now(),O=requestAnimationFrame(vt))},G=t=>{S.clear(),P.length=0,$=t;const d=ht(t);d.mass=1,d.scale=1,d.velocity=0,N()},Ft=(t,d)=>{if(st(),t===$)return;if(!H[t]||Q||!_||$<0){G(t);return}const r=performance.now();$=t,ht(t);for(const a of P)a.index=t,a.state==="flying"&&ut(a,t,r,!1),a.state==="absorbing"&&(a.state="flying",a.mass*=1-a.absorbed,a.absorbed=0,ut(a,t,r,!1));for(const a of[...S.keys()])a!==t&&Pt(a,t,r);xt()},ft=new ResizeObserver(()=>{et(),P.length?N():G($<0?j.current:$)});ft.observe(I);for(const t of W.querySelectorAll(":scope > button, :scope > a"))ft.observe(t);const gt=new MutationObserver(()=>{et(),P.length?N():G($<0?j.current:$)});for(const t of J)gt.observe(t,{childList:!0,subtree:!0,characterData:!0});const yt=()=>{Q=K.matches,cancelAnimationFrame(O),O=0,G(j.current)};return K.addEventListener("change",yt),et(),G(j.current),document.fonts?.ready.then(()=>{lt||(et(),P.length||G($))}),Y.current={go:t=>Ft(t),refresh:()=>{st(),N(),xt()}},()=>{lt=!0,cancelAnimationFrame(O),ft.disconnect(),gt.disconnect(),T.remove(),J.forEach((t,d)=>{t.style.color=Ct[d]}),K.removeEventListener("change",yt),u&&_&&(u.deleteBuffer(_.buffer),u.deleteProgram(_.program)),Y.current=null}},[s]),k.useEffect(()=>{Y.current?.go(X)},[X]),k.useEffect(()=>{Y.current?.refresh()},[at,q,v,y,l]),ot.jsxs(ot.Fragment,{children:[ot.jsx("canvas",{ref:rt,"aria-hidden":"true",className:"pointer-events-none absolute left-0 top-0"}),ot.jsx("span",{ref:dt,"aria-hidden":"true",className:"pointer-events-none absolute left-0 top-0 rounded-full",style:{background:at,borderRadius:Math.max(0,l)}})]})};export{Zt as G};
