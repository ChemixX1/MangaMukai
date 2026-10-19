import{r as G,j as _e}from"./index-CyqxaRui.js";const ge=8,ae=4,ie=24,Me=1.2,Ce=.7,Ue=.015,tt=2.4,j=60,N=100,ot=16,rt=.78,Le=["#1e3fd8","#f6f8ff","#a5d8ff","#38bdf8"],De=" =+xX0S8#@",Ie='"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',at={horizon:0,pinch:1,rise:2,eclipse:3},it={none:0,wave:1,burst:2},nt=`#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,Oe=`
float hash12(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
`,ct=`#version 300 es
precision highp float;
precision highp int;
uniform float uAspect;
uniform float uTime;
uniform int uShape;
uniform vec3 uRamp[8];
uniform int uCount;
uniform float uScale;
uniform float uSoftness;
uniform float uFlow;
uniform vec2 uSeed;
uniform vec4 uTrail[24];
uniform float uRadius;
uniform vec4 uClicks[4];
uniform int uClickEffect;
uniform float uIntro;
uniform float uFrame;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outAux;
${Oe}
vec2 hash22(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy) * 2.0 - 1.0;
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash22(i), f);
  float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return 0.5 + 0.5 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec3 labToRgb(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 horizon(vec2 p, float time, out float order) {
  float span = 0.5 * max(uAspect, 1.0);
  float x = p.x / span;
  float arch = -0.17 - 0.2 * x * x + 0.02 * sin(time * 0.6);
  float soft = mix(0.05, 0.22, uSoftness);
  float edge = p.y - arch;
  float rim = 0.38 * smoothstep(-soft, 0.42, edge);
  vec2 sun = vec2(0.08 * sin(time * 0.31) * span, 0.58);
  float spread = length((p - sun) / vec2(0.95 * span, 0.75));
  float sky = mix(0.55, 1.0, smoothstep(0.2, 0.95, spread));
  order = clamp(edge * 1.3, 0.0, 1.0);
  return vec3(rim, sky, smoothstep(0.18, 0.62, edge));
}

vec3 pinch(vec2 p, float time, out float order) {
  float span = 0.5 * max(uAspect, 0.75);
  float x = p.x / span;
  float sway = 0.02 * sin(x * 1.7 + time * 0.55);
  float breathe = 1.0 + 0.06 * sin(time * 0.8);
  float width = (0.13 + 0.22 * x * x) * breathe * mix(0.85, 1.2, uSoftness);
  float y = abs(p.y - sway) / width;
  float t = exp(-pow(y, 2.2)) * (0.42 + 0.58 * exp(-x * x * 1.8));
  order = clamp(abs(p.y - sway) * 2.4 + abs(x) * 0.3, 0.0, 1.0);
  return vec3(t, t, 0.0);
}

vec3 rise(vec2 p, float time, out float order) {
  float wide = max(uAspect, 0.9);
  vec2 center = vec2(0.05 * sin(time * 0.45) * wide, -0.7);
  vec2 radius = vec2(0.82 * wide, 0.64 * (1.0 + 0.04 * sin(time * 0.8)));
  float d = length((p - center) / radius);
  float soft = mix(0.6, 1.15, uSoftness);
  float t = clamp(pow(clamp(1.0 - d, 0.0, 1.0), soft) * 1.35, 0.0, 1.0);
  order = clamp((d - 0.2) * 1.3, 0.0, 1.0);
  return vec3(t, t, 0.0);
}

vec3 eclipse(vec2 p, float time, out float order) {
  float fit = min(1.0, uAspect * 1.25);
  float r = 0.23 * fit * (1.0 + 0.015 * sin(time * 0.9));
  float angle = atan(p.y, p.x);
  float rays = noise(vec2(cos(angle), sin(angle)) * 2.2 + time * 0.08) * 0.8 + 0.6;
  float d = length(p) - r;
  float reach = mix(0.07, 0.15, uSoftness) * rays * fit;
  float t = smoothstep(-0.006, 0.006 + 0.02 * uSoftness, d) * exp(-max(d, 0.0) / reach);
  order = clamp(d * 2.0, 0.0, 1.0);
  return vec3(t, t, 0.0);
}

vec4 tone(float t) {
  float x = smoothstep(0.3, 1.0, t) * float(uCount - 1);
  int index = int(floor(x));
  return vec4(mix(uRamp[index], uRamp[min(index + 1, uCount - 1)], fract(x)), smoothstep(0.0, 0.38, t));
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float time = uTime;
  vec2 q = p / uScale;
  vec2 warp = vec2(
    noise(q * 1.6 + uSeed + vec2(0.0, time * 0.3)),
    noise(q * 1.6 + uSeed.yx + vec2(4.3, -time * 0.24))
  ) - 0.5;
  q += warp * uFlow * (uShape == 3 ? 0.04 : 0.18);
  float order = 0.0;
  vec3 shape;
  if (uShape == 0) shape = horizon(q, time, order);
  else if (uShape == 1) shape = pinch(q, time, order);
  else if (uShape == 2) shape = rise(q, time, order);
  else shape = eclipse(q, time, order);

  float reveal = clamp((uIntro * 1.45 - order) / 0.45, 0.0, 1.0);
  reveal = reveal * reveal * (3.0 - 2.0 * reveal);

  float scramble = 0.0;
  for (int i = 0; i < 24; i++) {
    vec4 point = uTrail[i];
    if (point.z <= 0.0) continue;
    vec2 d = p - point.xy;
    scramble = max(scramble, point.z * exp(-dot(d, d) / (uRadius * uRadius)));
  }
  for (int i = 0; i < 4; i++) {
    vec4 c = uClicks[i];
    if (c.w <= 0.0) continue;
    float d = length(p - c.xy);
    if (uClickEffect == 1) {
      scramble = max(scramble, exp(-pow((d - c.z * 0.75) / 0.06, 2.0)) * c.w);
    } else if (uClickEffect == 2) {
      float size = 0.08 + 0.22 * (1.0 - exp(-c.z * 5.0));
      scramble = max(scramble, (1.0 - smoothstep(size * 0.6, size, d)) * c.w);
    }
  }
  vec2 t = clamp(shape.xy * mix(0.7, 1.0, reveal), 0.0, 1.0);
  vec4 mixed = mix(tone(t.x), tone(t.y), shape.z);
  vec3 color = encode(labToRgb(mixed.rgb));
  float alpha = mixed.a * reveal;
  float dither = (hash12(gl_FragCoord.xy + uFrame * 13.7) - 0.5) / 255.0;
  outColor = clamp(vec4(color * alpha + dither, alpha + dither), 0.0, 1.0);
  outAux = vec4(reveal, scramble, 0.0, 1.0);
}`,Xe=`
uniform sampler2D uField;
uniform sampler2D uAux;
uniform sampler2D uAtlas;
uniform vec2 uResolution;
uniform vec2 uCell;
uniform vec2 uOffset;
uniform vec2 uAtlasGrid;
uniform float uCount;
uniform float uDensity;
uniform float uOpacity;
uniform float uFlicker;
uniform float uDepth;
uniform float uGlyphTime;
uniform float uSeedValue;
uniform float uLight;
${Oe}
float sampleGlyph(float index, vec2 local, vec2 coord, float soft) {
  float column = mod(index, uAtlasGrid.x);
  float row = floor(index / uAtlasGrid.x);
  vec2 atlasUv = vec2((column + local.x) / uAtlasGrid.x, (row + 1.0 - local.y) / uAtlasGrid.y);
  vec2 continuous = coord / uAtlasGrid;
  float scale = exp2(soft);
  return textureGrad(uAtlas, atlasUv, dFdx(continuous) * scale, dFdy(continuous) * scale).a;
}

vec4 glyphAt(vec2 px) {
  vec2 coord = (px - uOffset) / uCell;
  vec2 cell = floor(coord);
  vec2 local = coord - cell;
  vec2 uv = clamp(((cell + 0.5) * uCell + uOffset) / uResolution, vec2(0.0), vec2(1.0));
  vec4 field = texture(uField, uv);
  vec4 aux = texture(uAux, uv);
  vec3 visible = uLight > 0.5 ? field.rgb + (1.0 - field.a) : field.rgb;
  float luma = dot(visible, vec3(0.2126, 0.7152, 0.0722));
  float value = uLight > 0.5 ? clamp((1.0 - luma) * 1.5, 0.0, 1.0) : luma;
  float pick = hash12(cell + uSeedValue * 7.31);
  float level = hash12(cell * 1.73 + 4.1 + uSeedValue);
  float tick = floor(uGlyphTime * 9.0 + level * 9.0);
  float wobble = (hash12(cell * 2.31 + tick * 17.7) - 0.5) * uFlicker * 0.4 + (level - 0.5) * 0.1;
  float tone = clamp(pow(value, 0.75) + wobble, 0.0, 1.0);
  float index = floor(tone * (uCount - 1.0) + 0.5);
  float decode = max(aux.g, 1.0 - aux.r);
  if (decode > 0.02) {
    float frame = floor(uGlyphTime * 20.0);
    if (hash12(cell * 3.7 + frame * 5.3) < decode * 1.25) index = 1.0 + floor(hash12(cell + frame * 1.37) * (uCount - 1.0));
  }
  float present = step(pick, uDensity * mix(1.0, 0.3 + tone * 1.1, 0.55));
  float cutoff = smoothstep(0.03, 0.1, value);
  float focus = step(hash12(cell * 0.71 + 9.2 + uSeedValue), uDepth);
  float coverage = sampleGlyph(index, local, coord, focus * 1.2);
  float alpha = uOpacity * present * cutoff * coverage * mix(1.0, 0.35 + 0.65 * level, 0.55) * (1.0 - focus * 0.5);
  if (uLight < 0.5) {
    vec3 light = field.rgb * 0.55 + vec3(0.03) * field.a;
    return vec4(light * alpha, 0.6 * field.a * alpha);
  }
  vec3 ink = visible * 0.8;
  return vec4(ink * alpha, alpha);
}
`,ut=`#version 300 es
precision highp float;
uniform float uDownscale;
in vec2 vUv;
out vec4 outColor;
${Xe}
void main() {
  outColor = glyphAt(gl_FragCoord.xy * uDownscale);
}`,st=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uStep;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 sum = texture(uSource, vUv) * 0.2270270270;
  sum += texture(uSource, vUv + uStep * 1.3846153846) * 0.3162162162;
  sum += texture(uSource, vUv - uStep * 1.3846153846) * 0.3162162162;
  sum += texture(uSource, vUv + uStep * 3.2307692308) * 0.0702702703;
  sum += texture(uSource, vUv - uStep * 3.2307692308) * 0.0702702703;
  outColor = sum;
}`,lt=`#version 300 es
precision highp float;
uniform sampler2D uHalo;
uniform float uGlow;
uniform float uGradient;
uniform float uGrain;
uniform float uFrame;
in vec2 vUv;
out vec4 outColor;
${Xe}
void main() {
  vec4 base = texture(uField, vUv) * uGradient;
  vec4 glyph = glyphAt(gl_FragCoord.xy);
  vec4 halo = texture(uHalo, vUv) * uGlow;
  vec4 color;
  if (uLight < 0.5) {
    color = base + glyph + halo;
  } else {
    color = glyph + base * (1.0 - glyph.a);
    color += halo * 0.6 * (1.0 - color.a);
  }
  float grain = (hash12(gl_FragCoord.xy + uFrame * vec2(17.0, 59.0)) + hash12(gl_FragCoord.xy * 1.31 + uFrame * 7.0) - 1.0) * uGrain;
  float body = clamp(color.a, 0.0, 1.0);
  color.rgb += grain * (0.25 + body) * 0.5;
  color.a = clamp(color.a, 0.0, 1.0);
  color.rgb = clamp(color.rgb, 0.0, color.a);
  outColor = color;
}`,x=(t,s,l)=>Math.min(l,Math.max(s,t)),ne=t=>t<=.04045?t/12.92:((t+.055)/1.055)**2.4,ft=([t,s,l])=>{const i=ne(t),u=ne(s),f=ne(l),R=Math.cbrt(.4122214708*i+.5363325363*u+.0514459929*f),h=Math.cbrt(.2119034982*i+.6806995451*u+.1073969566*f),m=Math.cbrt(.0883024619*i+.2817188376*u+.6299787005*f);return[.2104542553*R+.793617785*h-.0040720468*m,1.9779984951*R-2.428592205*h+.4505937099*m,.0259040371*R+.7827717662*h-.808675766*m]},Ge=(t,s,l)=>{const i=t.createShader(s);return i?(t.shaderSource(i,l),t.compileShader(i),t.getShaderParameter(i,t.COMPILE_STATUS)?i:(t.deleteShader(i),null)):null},K=(t,s)=>{const l=Ge(t,t.VERTEX_SHADER,nt),i=Ge(t,t.FRAGMENT_SHADER,s),u=t.createProgram();if(!l||!i||!u)return null;if(t.attachShader(u,l),t.attachShader(u,i),t.linkProgram(u),t.deleteShader(l),t.deleteShader(i),!t.getProgramParameter(u,t.LINK_STATUS))return t.deleteProgram(u),null;const f={},R=t.getProgramParameter(u,t.ACTIVE_UNIFORMS);for(let h=0;h<R;h++){const m=t.getActiveUniform(u,h);if(!m)continue;const F=m.name.replace(/\[0\]$/,"");f[F]=t.getUniformLocation(u,F)}return{program:u,uniforms:f}},ce=(t,s)=>({textures:Array.from({length:s},()=>{const i=t.createTexture();return t.bindTexture(t.TEXTURE_2D,i),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),i}),framebuffer:t.createFramebuffer(),width:0,height:0}),ue=(t,s,l,i)=>{s.width===l&&s.height===i||(s.width=l,s.height=i,t.bindFramebuffer(t.FRAMEBUFFER,s.framebuffer),s.textures.forEach((u,f)=>{t.bindTexture(t.TEXTURE_2D,u),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,l,i,0,t.RGBA,t.UNSIGNED_BYTE,null),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+f,t.TEXTURE_2D,u,0)}),t.bindFramebuffer(t.FRAMEBUFFER,null))},Pe=(t,s,l)=>{const i=[...new Set([...s].filter(M=>M!==`
`&&M!=="\r"))];i.length||i.push(" ");const u=`300 ${Math.round(N*rt)}px ${l}`,f=Math.min(ot,i.length),R=Math.ceil(i.length/f),h=document.createElement("canvas");h.width=j*f,h.height=N*R;const m=h.getContext("2d");m&&(m.font=u,m.textAlign="center",m.textBaseline="middle",m.fillStyle="#fff",i.forEach((M,z)=>{const Y=z%f,J=Math.floor(z/f);m.fillText(M,Y*j+j/2,J*N+N/2+3)}));const F=t.createTexture();return t.bindTexture(t.TEXTURE_2D,F),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,t.RGBA,t.UNSIGNED_BYTE,h),t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),{texture:F,count:i.length,grid:[f,R]}},dt=({colors:t=Le,shape:s="horizon",characters:l=De,cellSize:i=18,density:u=.8,glyphOpacity:f=.85,glow:R=.2,depthOfField:h=0,flicker:m=.2,softness:F=.5,scale:M=1,flow:z=.5,speed:Y=1,gradientOpacity:J=.9,grain:ke=.08,variation:Ne=0,mouseInteraction:ze=!0,scrambleRadius:qe=.1,clickEffect:Be="wave",intro:He=!0,lightMode:Ve=!1,fontFamily:$e=Ie,dpr:We,className:Ke="",style:je,...Ye})=>{const se=G.useRef(null),le=G.useRef(null),Q=G.useRef(null),q=(Array.isArray(t)&&t.length?t:Le).slice(0,ge),fe={colors:q.length>1?q:[q[0],q[0]],shape:at[s]??0,characters:l||De,cellSize:x(i,6,64),density:x(u,0,1),glyphOpacity:x(f,0,1),glow:x(R,0,2),depthOfField:x(h,0,1),flicker:x(m,0,1),softness:x(F,0,1),scale:x(M,.4,2.5),flow:x(z,0,2),speed:Math.max(0,Y),gradientOpacity:x(J,0,1),grain:x(ke,0,.4),variation:Math.max(0,Ne),mouseInteraction:ze,scrambleRadius:x(qe,.02,.4),clickEffect:it[Be]??1,intro:He,lightMode:Ve,fontFamily:$e||Ie,dpr:We},y=G.useRef(fe);return y.current=fe,G.useEffect(()=>{const C=se.current,d=le.current,e=d?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!C||!d||!e)return;const B=K(e,ct),P=K(e,ut),U=K(e,st),O=K(e,lt);if(!B||!P||!U||!O)return;const me=e.createVertexArray(),_=ce(e,2),T=ce(e,1),H=ce(e,1),L=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),de=new Map,Je=a=>{const r=String(a),o=de.get(r);if(o)return o;let n=[0,0,0];if(L){L.clearRect(0,0,1,1),L.fillStyle="#000000",L.fillStyle=r,L.fillRect(0,0,1,1);const[c,w,S]=L.getImageData(0,0,1,1).data;n=[c/255,w/255,S/255]}return de.set(r,n),n},g=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,A={width:1,height:1,ratio:1},he=new Float32Array(ge*3),Z=new Float32Array(ae*4),b=[],ee=new Float32Array(ie*4),E=[],v={x:0,y:0,inside:!1};let p=null,te="",pe="",ve=0,xe=0,X=y.current.intro&&!g?0:1,V=0,oe=0,k=0,D=0,$=!0,W=!1;const Qe=()=>{const a=y.current,r=`${a.fontFamily}|${a.characters}`;r===te&&p||(te=r,p&&e.deleteTexture(p.texture),p=Pe(e,a.characters,a.fontFamily),document.fonts?.load?.(`300 64px ${a.fontFamily}`,a.characters).then(()=>{W||te!==r||(p&&e.deleteTexture(p.texture),p=Pe(e,a.characters,a.fontFamily),re())},()=>{}))},Ze=()=>{const a=y.current,r=a.colors.join(",");r!==pe&&(pe=r,a.colors.forEach((o,n)=>he.set(ft(Je(o)),n*3)))},Ee=(a,r,o)=>{if(!p)return;const n=y.current,c=a.uniforms,w=n.cellSize*A.ratio,S=w*(j/N);e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,_.textures[0]),e.uniform1i(c.uField,0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,_.textures[1]),e.uniform1i(c.uAux,1),e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,p.texture),e.uniform1i(c.uAtlas,2),e.uniform2f(c.uResolution,r,o),e.uniform2f(c.uCell,S,w),e.uniform2f(c.uOffset,(r-Math.ceil(r/S)*S)/2,(o-Math.ceil(o/w)*w)/2),e.uniform2f(c.uAtlasGrid,p.grid[0],p.grid[1]),e.uniform1f(c.uCount,p.count),e.uniform1f(c.uDensity,n.density),e.uniform1f(c.uOpacity,n.glyphOpacity),e.uniform1f(c.uFlicker,g?0:n.flicker),e.uniform1f(c.uDepth,n.depthOfField),e.uniform1f(c.uGlyphTime,xe),e.uniform1f(c.uSeedValue,n.variation),e.uniform1f(c.uLight,n.lightMode?1:0)},re=()=>{const a=y.current,r=A.width/A.height;Qe(),Ze(),e.bindVertexArray(me),e.disable(e.BLEND),e.bindFramebuffer(e.FRAMEBUFFER,_.framebuffer),e.drawBuffers([e.COLOR_ATTACHMENT0,e.COLOR_ATTACHMENT1]),e.viewport(0,0,_.width,_.height),e.useProgram(B.program);const o=B.uniforms;e.uniform1f(o.uAspect,r),e.uniform1f(o.uTime,ve),e.uniform1i(o.uShape,a.shape),e.uniform3fv(o.uRamp,he),e.uniform1i(o.uCount,a.colors.length),e.uniform1f(o.uScale,a.scale),e.uniform1f(o.uSoftness,a.softness),e.uniform1f(o.uFlow,a.flow),e.uniform2f(o.uSeed,a.variation*3.17,a.variation*1.91),e.uniform4fv(o.uTrail,ee),e.uniform1f(o.uRadius,a.scrambleRadius),e.uniform4fv(o.uClicks,Z),e.uniform1i(o.uClickEffect,a.clickEffect),e.uniform1f(o.uIntro,X),e.uniform1f(o.uFrame,V),e.drawArrays(e.TRIANGLES,0,3);const n=a.glow>.001;n&&(e.bindFramebuffer(e.FRAMEBUFFER,T.framebuffer),e.drawBuffers([e.COLOR_ATTACHMENT0]),e.viewport(0,0,T.width,T.height),e.useProgram(P.program),Ee(P,d.width,d.height),e.uniform1f(P.uniforms.uDownscale,d.width/T.width),e.drawArrays(e.TRIANGLES,0,3),e.useProgram(U.program),e.activeTexture(e.TEXTURE0),e.uniform1i(U.uniforms.uSource,0),e.bindFramebuffer(e.FRAMEBUFFER,H.framebuffer),e.bindTexture(e.TEXTURE_2D,T.textures[0]),e.uniform2f(U.uniforms.uStep,1/T.width,0),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,T.framebuffer),e.bindTexture(e.TEXTURE_2D,H.textures[0]),e.uniform2f(U.uniforms.uStep,0,1/T.height),e.drawArrays(e.TRIANGLES,0,3)),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,d.width,d.height),e.useProgram(O.program),Ee(O,d.width,d.height);const c=O.uniforms;e.activeTexture(e.TEXTURE3),e.bindTexture(e.TEXTURE_2D,T.textures[0]),e.uniform1i(c.uHalo,3),e.uniform1f(c.uGlow,n?a.glow:0),e.uniform1f(c.uGradient,a.gradientOpacity),e.uniform1f(c.uGrain,a.grain),e.uniform1f(c.uFrame,V),e.drawArrays(e.TRIANGLES,0,3)},Te=()=>{const a=y.current;A.width=Math.max(1,C.clientWidth),A.height=Math.max(1,C.clientHeight),A.ratio=Math.min(a.dpr||window.devicePixelRatio||1,2),d.width=Math.max(1,Math.round(A.width*A.ratio)),d.height=Math.max(1,Math.round(A.height*A.ratio)),ue(e,_,Math.max(1,Math.round(d.width/2)),Math.max(1,Math.round(d.height/2)));const r=Math.max(1,Math.round(d.width/4)),o=Math.max(1,Math.round(d.height/4));ue(e,T,r,o),ue(e,H,r,o),re(),I()},et=a=>{for(E.forEach(r=>{r.age+=a});E.length&&E[E.length-1].age>Ce;)E.pop();for(let r=0;r<ie;r++){const o=E[r];if(!o){ee[r*4+2]=0;continue}const n=1-o.age/Ce;ee.set([o.x,o.y,n*n,0],r*4)}for(b.forEach(r=>{r.age+=a});b.length&&b[b.length-1].age>Me;)b.pop();for(let r=0;r<ae;r++){const o=b[r];if(!o){Z[r*4+3]=0;continue}const n=o.age/Me,c=Math.min(1,o.age/.08)*(1-n)*(1-n);Z.set([o.x,o.y,o.age,c],r*4)}},Re=a=>{if(k=0,W||!$||document.hidden)return;const r=y.current,o=D?x((a-D)/1e3,.001,.05):1/60;D=a,g||(ve+=o*r.speed*.5,xe+=o*Math.max(r.speed,.15)),X<1&&(X=Math.min(1,X+o/tt)),oe+=o,!g&&oe>1/24&&(oe=0,V=(V+1)%97),et(o),re(),!g||X<1||b.length>0||E.length>0?k=requestAnimationFrame(Re):D=0};function I(){!k&&!W&&$&&!document.hidden&&(k=requestAnimationFrame(Re))}const ye=a=>{const r=C.getBoundingClientRect(),o=(a.clientX-r.left)/Math.max(1,r.width),n=1-(a.clientY-r.top)/Math.max(1,r.height),c=r.width/Math.max(1,r.height);v.inside=o>=0&&o<=1&&n>=0&&n<=1,v.x=(o-.5)*c,v.y=n-.5},Ae=a=>{ye(a);const r=y.current;if(!v.inside||!r.mouseInteraction||g)return;const o=E[0],n=o?Math.hypot(v.x-o.x,v.y-o.y):1/0;if(!(n<Ue)){if(o&&o.age<.1){const c=Math.min(6,Math.floor(n/(Ue*2)));for(let w=1;w<=c;w++){const S=w/(c+1);E.unshift({x:o.x+(v.x-o.x)*S,y:o.y+(v.y-o.y)*S,age:0})}}E.unshift({x:v.x,y:v.y,age:0}),E.length=Math.min(E.length,ie),I()}},be=a=>{ye(a);const r=y.current;!v.inside||!r.clickEffect||g||(b.unshift({x:v.x,y:v.y,age:0}),b.length>ae&&b.pop(),I())},we=()=>{D=0,I()},Se=new ResizeObserver(Te);Se.observe(C);const Fe=new IntersectionObserver(a=>{$=a.some(r=>r.isIntersecting),$&&(D=0,I())});return Fe.observe(C),window.addEventListener("pointermove",Ae,{passive:!0}),window.addEventListener("pointerdown",be,{passive:!0}),document.addEventListener("visibilitychange",we),Te(),Q.current=I,()=>{W=!0,cancelAnimationFrame(k),Q.current=null,Se.disconnect(),Fe.disconnect(),window.removeEventListener("pointermove",Ae),window.removeEventListener("pointerdown",be),document.removeEventListener("visibilitychange",we),[_,T,H].forEach(a=>{a.textures.forEach(r=>e.deleteTexture(r)),e.deleteFramebuffer(a.framebuffer)}),p&&e.deleteTexture(p.texture),e.deleteVertexArray(me),[B,P,U,O].forEach(a=>e.deleteProgram(a.program))}},[]),G.useEffect(()=>{Q.current?.()}),_e.jsx("div",{ref:se,className:["relative h-full w-full overflow-hidden",Ke].filter(Boolean).join(" "),style:je,...Ye,children:_e.jsx("canvas",{ref:le,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})};export{dt as default};
