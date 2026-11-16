// amivo social post renderer. Usage: node render.js spec.json outdir
// spec: {format:"quote"|"evening"|"carousel", eyebrow, text, accent, slides:[{eyebrow,text,small}], video:true}
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
const W = 1080, H = 1920;
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&display=block" rel="stylesheet">`;
const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
const md = s => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>'); // *word* -> gold italic
const base = `*{box-sizing:border-box;margin:0}body{width:${W}px;height:${H}px;overflow:hidden;font-family:Inter,sans-serif;-webkit-font-smoothing:antialiased}
.wm{font-weight:700;letter-spacing:-3px;font-size:64px}
.eb{font-size:28px;letter-spacing:6px;text-transform:uppercase}
.serif{font-family:Newsreader,Georgia,serif;font-weight:400}
em{font-style:italic;color:#b8893f}
@keyframes up{from{transform:translateY(var(--from))}to{transform:translateY(0)}}
@keyframes fade{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
.a{animation:fade 1.4s cubic-bezier(.2,.7,.2,1) both}`;
function hills(dark){ // sunrise scene from the app icon
  return `<svg viewBox="0 0 1080 1920" width="1080" height="1920" style="position:absolute;inset:0">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dark?'#1b2a24':'#f8f6ef'}"/><stop offset="1" stop-color="${dark?'#3a4a3c':'#f3e3c4'}"/></linearGradient></defs>
  <rect width="1080" height="1920" fill="url(#sky)"/>
  <circle class="sun" cx="540" cy="1520" r="210" fill="${dark?'#c8a56b':'#e0a95a'}" style="--from:260px;animation:up 6s cubic-bezier(.2,.7,.2,1) both"/>
  <path d="M0 1560 C 300 1460 520 1500 700 1570 C 860 1630 960 1620 1080 1580 V1920 H0Z" fill="#3e7b62"/>
  <path d="M0 1680 C 280 1610 470 1630 640 1700 C 820 1770 960 1760 1080 1720 V1920 H0Z" fill="#274b3e"/></svg>`;
}
function page(s, i){
  if (s.kind === 'evening') return `<style>${base}body{background:#1c2823;color:#dfe9e2}</style>${hills(true)}
   <div style="position:absolute;inset:0;padding:230px 110px 0">
    <div class="wm a" style="color:#dfe9e2;animation-delay:.2s">amivo</div>
    <div class="eb a" style="color:#a3b3a8;margin-top:120px;animation-delay:.6s">${esc(s.eyebrow||'Tonight, a gentle question')}</div>
    <div class="serif a" style="font-size:${s.size||80}px;line-height:1.18;letter-spacing:-1.5px;margin-top:48px;padding-left:40px;border-left:6px solid #c8a56b;animation-delay:1.2s">${md(s.text)}</div>
    ${s.small?`<div class="a" style="font-size:34px;line-height:1.55;color:#a3b3a8;margin-top:56px;animation-delay:2.4s">${md(s.small)}</div>`:''}
   </div>`;
  if (s.kind === 'card') return `<style>${base}body{background:#f8f6ef;color:#274b3e}</style>${hills(false)}
   <div style="position:absolute;inset:0;padding:220px 90px 0">
    <div class="wm a" style="animation-delay:.2s">amivo</div>
    <div class="a" style="margin-top:110px;background:#fffefa;border:2px solid #e3e6dd;border-radius:56px;padding:64px 64px 72px;box-shadow:0 30px 80px #274b3e14;animation-delay:.7s">
      <div style="display:flex;justify-content:space-between;align-items:center"><span style="background:#edf2e8;color:#56745d;border-radius:99px;padding:16px 28px;font-size:28px">${esc(s.eyebrow)}</span><span style="color:#8b967f;font-size:28px">${esc(s.date||'')}</span></div>
      <div class="serif" style="font-size:${s.size||70}px;line-height:1.3;margin-top:56px">${md(s.text)}</div>
    </div>
    ${s.small?`<div class="a" style="font-size:34px;line-height:1.55;color:#6c7e72;margin-top:56px;text-align:center;animation-delay:2.2s">${md(s.small)}</div>`:''}
   </div>`;
  // default: quote / slide on light sunrise
  return `<style>${base}body{background:#f8f6ef;color:#274b3e}</style>${hills(false)}
   <div style="position:absolute;inset:0;padding:230px 110px 0;text-align:${s.align||'left'}">
    <div class="wm a" style="animation-delay:.2s">amivo</div>
    ${s.eyebrow?`<div class="eb a" style="color:#8b967f;margin-top:130px;animation-delay:.6s">${esc(s.eyebrow)}</div>`:'<div style="height:130px"></div>'}
    <div class="serif a" style="font-size:${s.size||96}px;line-height:1.12;letter-spacing:-2px;margin-top:44px;animation-delay:1.2s">${md(s.text)}</div>
    ${s.small?`<div class="a" style="font-size:36px;line-height:1.55;color:#6c7e72;margin-top:56px;animation-delay:2.4s">${md(s.small)}</div>`:''}
    ${s.counter?`<div style="position:absolute;top:252px;right:110px;font-size:28px;color:#8b967f">${esc(s.counter)}</div>`:''}
   </div>`;
}
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: H } });
  const slides = spec.slides || [spec];
  const files = [];
  for (let i = 0; i < slides.length; i++) {
    const html = `<!doctype html><html><head><meta charset="utf-8">${FONTS}</head><body>${page({ kind: spec.format, ...slides[i] }, i)}</body></html>`;
    await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
    // final still: jump all animations to the end
    await p.evaluate(() => document.getAnimations().forEach(a => a.finish()));
    const f = path.join(out, slides.length > 1 ? `slide-${i + 1}.png` : 'post.png');
    await p.screenshot({ path: f }); files.push(f);
    if (spec.video && slides.length === 1) {
      const fr = path.join(out, '_frames'); fs.mkdirSync(fr, { recursive: true });
      await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
      const fps = 24, secs = spec.seconds || 8;
      await p.evaluate(() => document.getAnimations().forEach(a => a.pause()));
      for (let n = 0; n < fps * secs; n++) {
        await p.evaluate(t => document.getAnimations().forEach(a => a.currentTime = t), n * 1000 / fps);
        await p.screenshot({ path: path.join(fr, `${String(n).padStart(4, '0')}.png`) });
      }
      execSync(`ffmpeg -y -loglevel error -framerate ${fps} -i ${fr}/%04d.png -f lavfi -i anullsrc=r=44100:cl=stereo -shortest -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -movflags +faststart ${path.join(out, 'post.mp4')}`);
      fs.rmSync(fr, { recursive: true });
    }
  }
  await b.close(); console.log(files.join('\n'));
})();
