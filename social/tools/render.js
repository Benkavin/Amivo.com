// amivo social post renderer (v2, "calm premium" style). Usage: node render.js spec.json outdir
// spec: {format:"quote"|"evening"|"card", eyebrow, text, small, size, date, video:true, seconds, slides:[{eyebrow,text,small,size}]}
// Wrap 1-3 words in *stars* for the gold italic accent. Old style kept in render-v1.js.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
const W = 1080; let H = 1920; const os = require('os');
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300;1,6..72,400&display=block" rel="stylesheet">`;
const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
// split into word spans for staggered motion; *x* -> gold italic
function words(s, start, step){
  let i = 0; const parts = String(s||'').split(/(\*[^*]+\*)/);
  return parts.map(p => { const em = /^\*.*\*$/.test(p); const t = em ? p.slice(1,-1) : p;
    const w = t.split(/(\s+)/).map(x => /^\s+$/.test(x)||!x ? x : `<span class="w" style="animation-delay:${(start+step*(i++)).toFixed(2)}s">${esc(x)}</span>`).join('');
    return em ? `<em>${w}</em>` : w; }).join('');
}
const GRAIN = `<svg class="grain" width="1080" height="1920"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .45  0 0 0 0 .4  0 0 0 .9 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;
const SUNMARK = c => `<svg width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="25" r="11" fill="${c.sun}"/><path d="M2 31c8-4 14-4 21-1s13 3 21-1v15H2z" fill="${c.hill}"/></svg>`;
const css = (c) => `*{box-sizing:border-box;margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;background:${c.bg};color:${c.ink};font-family:Inter,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
.scene{position:absolute;inset:0;animation:drift 9s ease-out both}
.grain{position:absolute;inset:0;opacity:${c.grain};mix-blend-mode:${c.blend};pointer-events:none}
.vig{position:absolute;inset:0;background:radial-gradient(ellipse 120% 80% at 50% 45%,transparent 55%,${c.vig} 100%)}
.col{position:absolute;left:0;right:0;top:0;padding:0 120px;text-align:center;display:flex;flex-direction:column;align-items:center}
.brand{display:flex;align-items:center;gap:14px;font-weight:650;font-size:44px;letter-spacing:-2px;color:${c.ink};animation:fade 1.6s ease both .1s}
.eb{display:flex;align-items:center;gap:22px;font-size:22px;font-weight:500;letter-spacing:7px;text-transform:uppercase;color:${c.soft};animation:fade 1.6s ease both .5s}
.eb:before,.eb:after{content:"";width:56px;height:1px;background:${c.rule}}
.msg{font-family:Newsreader,Georgia,serif;font-weight:300;font-variation-settings:"opsz" 72;letter-spacing:-.025em;text-wrap:balance;color:${c.ink}}
.msg em{font-style:italic;color:${c.gold};font-weight:300}
.small{font-size:31px;font-weight:400;line-height:1.6;color:${c.soft};text-wrap:balance;animation:fade 1.8s ease both}
.w{display:inline-block;animation:word 1.5s cubic-bezier(.2,.65,.2,1) both}
.dots{display:flex;gap:12px}.dots i{width:10px;height:10px;border-radius:50%;background:${c.rule}}.dots i.on{background:${c.gold};width:30px;border-radius:6px}
@keyframes drift{from{transform:scale(1.045)}to{transform:scale(1)}}
@keyframes fade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes word{from{opacity:0;filter:blur(10px);transform:translateY(18px)}to{opacity:1;filter:blur(0);transform:none}}
@keyframes rise{from{transform:translateY(170px)}to{transform:none}}
@keyframes glow{from{opacity:.35}to{opacity:1}}
@keyframes tw{0%,100%{opacity:.25}50%{opacity:.9}}
@keyframes mist{from{transform:translateX(-30px)}to{transform:translateX(30px)}}`;
const DAY = {bg:'#f8f3e8',ink:'#24443a',soft:'#6f7f72',gold:'#b5873c',rule:'#cdbf9f',sun:'#e6a85a',hill:'#3e7b62',grain:.10,blend:'multiply',vig:'#e9dcc055'};
const NIGHT = {bg:'#13201c',ink:'#efe8da',soft:'#a9b5a8',gold:'#d8b77c',rule:'#5b6b5e',sun:'#e8d3a6',hill:'#2d5546',grain:.12,blend:'overlay',vig:'#0a110e99'};
function dayScene(){ return `<div class="scene">
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,#fcfaf4 0%,#f9f1e1 38%,#f5e2c0 62%,#f0cf9c 80%,#ebc28a 100%)"></div>
  <div style="position:absolute;left:-200px;right:-200px;top:900px;height:900px;background:radial-gradient(closest-side,#f6c98399,#f6c98300);animation:glow 6s ease both"></div>
  <div style="position:absolute;left:350px;top:1300px;width:380px;height:380px;border-radius:50%;animation:rise 7s cubic-bezier(.2,.6,.2,1) both">
    <div style="position:absolute;inset:-70px;border-radius:50%;background:radial-gradient(closest-side,#f3b96a66,#f3b96a00)"></div>
    <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 40%,#f4c27c,#e49d4f)"></div></div>
  <svg width="1080" height="1920" style="position:absolute;inset:0">
    <defs><linearGradient id="h0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d3b4"/><stop offset="1" stop-color="#b3c4a5"/></linearGradient>
    <linearGradient id="h1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f8a6c"/><stop offset="1" stop-color="#3a7058"/></linearGradient>
    <linearGradient id="h2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c5446"/><stop offset="1" stop-color="#1e3a31"/></linearGradient>
    <linearGradient id="mi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf3e2" stop-opacity="0"/><stop offset=".6" stop-color="#fbf3e2" stop-opacity=".55"/><stop offset="1" stop-color="#fbf3e2" stop-opacity="0"/></linearGradient></defs>
    <path d="M0 1500 C 180 1460 330 1470 470 1500 C 640 1535 800 1475 1080 1450 V1920 H0Z" fill="url(#h0)" opacity=".9"/>
    <path d="M0 1590 C 280 1505 500 1530 690 1595 C 860 1650 970 1640 1080 1605 V1920 H0Z" fill="url(#h1)"/>
    <path d="M0 1715 C 260 1650 470 1665 650 1725 C 830 1790 960 1780 1080 1745 V1920 H0Z" fill="url(#h2)"/></svg></div>`; }
function nightScene(off=0){
  let st = ''; let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) { const x = r()*1080, y = r()*1250, s = r()<.85 ? 2 : 3.2;
    st += `<i style="position:absolute;left:${x|0}px;top:${y|0}px;width:${s}px;height:${s}px;border-radius:50%;background:#f3e9cf;animation:tw ${(3+r()*4).toFixed(1)}s ease-in-out ${(-r()*6).toFixed(1)}s infinite"></i>`; }
  return `<div class="scene">
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,#0e1916 0%,#15241f 40%,#22342b 66%,#3d4836 84%,#5a5640 100%)"></div>
  <div style="position:absolute;left:-200px;right:-200px;top:1150px;height:700px;background:radial-gradient(closest-side,#c8a56b40,#c8a56b00)"></div>
  ${st}
  <div style="position:absolute;left:${off?880:760}px;top:${250+off}px;width:120px;height:120px;animation:fade 3s ease both .3s">
    <div style="position:absolute;inset:-60px;border-radius:50%;background:radial-gradient(closest-side,#f1dfb233,#f1dfb200)"></div>
    <div style="position:absolute;inset:0;border-radius:50%;box-shadow:inset -26px 10px 0 0 #efdcae"></div></div>
  <svg width="1080" height="1920" style="position:absolute;inset:0">
    <defs><linearGradient id="n1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#28463a"/><stop offset="1" stop-color="#1c3329"/></linearGradient>
    <linearGradient id="n2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14261f"/><stop offset="1" stop-color="#0c1814"/></linearGradient></defs>
    <path d="M0 1520 C 200 1480 340 1490 480 1520 C 650 1555 810 1495 1080 1470 V1920 H0Z" fill="#3a4a3c" opacity=".8"/>
    <path d="M0 1600 C 280 1515 500 1540 690 1605 C 860 1660 970 1650 1080 1615 V1920 H0Z" fill="url(#n1)"/>
    <path d="M0 1720 C 260 1655 470 1670 650 1730 C 830 1795 960 1785 1080 1750 V1920 H0Z" fill="url(#n2)"/></svg></div>`; }
function body(s, idx, total, feed){
  const OFF = feed ? 560 : 0;
  const night = s.kind === 'evening'; const c = night ? NIGHT : DAY;
  const size = Math.round((s.size || (s.kind === 'card' ? 70 : 92)) * (feed ? .84 : 1));
  const brand = `<div class="brand">${SUNMARK(c)}amivo</div>`;
  const eb = s.eyebrow ? `<div class="eb" style="margin-top:${feed?70:(night?150:170)}px">${esc(s.eyebrow)}</div>` : `<div style="height:${feed?70:(night?150:170)}px"></div>`;
  const msg = `<div class="msg" style="font-size:${size}px;line-height:1.14">${words(s.text, 1.1, .11)}</div>`;
  const small = s.small ? `<div class="small" style="margin-top:${feed?36:58}px;animation-delay:2.9s">${esc(s.small)}</div>` : '';
  const dots = total > 1 ? `<div class="dots" style="margin-top:70px">${Array.from({length:total},(_,k)=>`<i class="${k===idx?'on':''}"></i>`).join('')}</div>` : '';
  let mid;
  if (s.kind === 'card') mid = `<div style="margin-top:${feed?60:150}px;width:100%;padding:62px 62px 70px;border-radius:52px;background:rgba(255,253,247,.66);border:1.5px solid rgba(255,255,255,.85);box-shadow:0 40px 90px -30px rgba(60,50,20,.25),inset 0 1px 0 #fff;backdrop-filter:blur(18px);text-align:left;animation:fade 1.6s ease both .5s">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:25px"><span style="background:#e9efe2;color:#4f6e57;border-radius:99px;padding:14px 26px">${esc(s.eyebrow)}</span><span style="color:#94a08f">${esc(s.date||'')}</span></div>
      <div class="msg" style="font-size:${size}px;line-height:1.24;margin-top:52px;text-wrap:pretty">${words(s.text, 1.1, .09)}</div></div>${small}`;
  else mid = `${eb}<div style="margin-top:46px">${msg}</div>${small}${dots}`;
  return `<style>${css(c)}</style><div style="position:absolute;left:0;right:0;top:${-OFF}px;height:1920px">${night ? nightScene(OFF ? 350 : 0) : dayScene()}</div><div class="vig"></div>${GRAIN}
   <div class="col" style="padding-top:${feed?96:200}px">${brand}${mid}</div>`;
}
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: H } });
  const slides = spec.slides || [spec]; const files = [];
  for (let i = 0; i < slides.length; i++) {
    const html = `<!doctype html><html><head><meta charset="utf-8">${FONTS}</head><body>${body({ kind: spec.format, ...slides[i] }, i, slides.length)}</body></html>`;
    await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
    const settle = () => p.evaluate(() => document.getAnimations().forEach(a => { if (a.effect.getTiming().iterations === Infinity) a.currentTime = 1500; else a.finish(); }));
    await settle();
    const f = path.join(out, slides.length > 1 ? `slide-${i + 1}.png` : 'post.png');
    await p.screenshot({ path: f }); files.push(f);
    // 4:5 image for Instagram feed (feed.jpg, or feed-N.jpg for slides)
    H = 1350; await p.setViewportSize({ width: W, height: H });
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONTS}</head><body>${body({ kind: spec.format, ...slides[i] }, i, slides.length, true)}</body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await settle();
    await p.screenshot({ path: path.join(out, slides.length > 1 ? `feed-${i + 1}.jpg` : 'feed.jpg'), type: 'jpeg', quality: 93 });
    H = 1920; await p.setViewportSize({ width: W, height: H });
    if (spec.video && slides.length === 1) {
      const fr = fs.mkdtempSync(path.join(os.tmpdir(), 'amivo-frames-')); fs.mkdirSync(fr, { recursive: true });
      await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
      const fps = 30, secs = spec.seconds || 9;
      await p.evaluate(() => document.getAnimations().forEach(a => a.pause()));
      for (let n = 0; n < fps * secs; n++) {
        await p.evaluate(t => document.getAnimations().forEach(a => a.currentTime = t), n * 1000 / fps);
        await p.screenshot({ path: path.join(fr, `${String(n).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 95 });
      }
      execSync(`ffmpeg -y -loglevel error -framerate ${fps} -i ${fr}/%04d.jpg -f lavfi -i anullsrc=r=44100:cl=stereo -shortest -vf "fade=in:0:12" -c:v libx264 -pix_fmt yuv420p -crf 17 -preset slow -c:a aac -movflags +faststart ${path.join(out, 'post.mp4')}`);
      fs.rmSync(fr, { recursive: true });
    }
  }
  await b.close(); console.log(files.join('\n'));
})();
