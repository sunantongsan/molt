// MOLT — short silent story intro (comic captions), shown once before the first game.
// Tap = next scene, "ข้าม" = skip. Replay from the ❓ button.
"use strict";

// Each scene: picture, camera move (from/to focus x,y in 0..1 of the picture and zoom), caption or speech bubble.
const INTRO = [
  { img: 'story1', dur: 4.6, from: [0.5, 0.55, 1.0], to: [0.5, 0.5, 1.12], cap: 'ณ ทุ่งหญ้าแสนสงบ…\nบ้านของ Serจ่อย กับไข่เป็ดทองคำ\nที่เสกเหรียญได้ทุกวัน' },
  { img: 'story1', dur: 4.4, from: [0.55, 0.42, 1.4], to: [0.56, 0.4, 1.9], bubble: 'ชีวิตดีจริง~\nมีเป็ดทำงานให้ ข้าแค่นอน 😴', who: 'Serจ่อย' },
  { img: 'story2', dur: 4.6, from: [0.5, 0.35, 1.25], to: [0.5, 0.62, 1.05], cap: 'แต่แล้วคืนหนึ่ง…\nฝูงแมวก็มาล้อมบ้าน' },
  { img: 'story3', dur: 4.8, from: [0.48, 0.25, 1.6], to: [0.5, 0.5, 1.0], shake: true, bubble: 'ไข่ทองคำนั่น…\nข้าจะเอาไปทำไข่เจียว!\nทหาร บุก!!', who: 'ราชาแมว', red: true, bubbleY: 0.62 },
  { img: 'story1', dur: 4.4, from: [0.56, 0.4, 1.9], to: [0.56, 0.4, 2.1], night: 0.55, bubble: 'ลูกน้อง… จัดการที\n(หาว~) ข้าจะนอนต่อ', who: 'Serจ่อย' },
  { img: 'story5', dur: 4.6, from: [0.5, 0.45, 1.25], to: [0.5, 0.5, 1.0], shake: true, cap: 'เหล่าเป็ด… ออกรบ!' },
  { img: 'story5', dur: 3.4, from: [0.5, 0.5, 1.0], to: [0.5, 0.5, 1.0], logo: true, dim: 0.35 },
];
let introI = 0, introT = 0, introOn = false, introDone = null;
function playIntro(done) {
  introOn = true; introI = 0; introT = 0; introDone = done || null;
  state = 'intro';
  ['tdUi', 'menu', 'result', 'tut'].forEach(id => { const e = document.getElementById(id); if (e) e.classList.add('hidden'); });
  document.getElementById('introUi').classList.remove('hidden');
}
function endIntro() {
  if (!introOn) return;
  introOn = false;
  document.getElementById('introUi').classList.add('hidden');
  save.introSeen = true; persist();
  enterTD();
  if (introDone) introDone();
  else if (!save.tut.td) setTimeout(() => runTut('td'), 400);
}
function introUpdate(dt) {
  introT += dt;
  if (introT >= INTRO[introI].dur && introI < INTRO.length - 1) nextIntro();
}
function nextIntro() {
  if (introI >= INTRO.length - 1) { endIntro(); return; }
  introI++; introT = 0;
}

// ---------- drawing ----------
function drawScene(sc, t, alpha) {
  const img = IMG[sc.img];
  if (!ready(img)) return;
  const k = Math.min(1, t / sc.dur), e = k * k * (3 - 2 * k);
  const fx = sc.from[0] + (sc.to[0] - sc.from[0]) * e, fy = sc.from[1] + (sc.to[1] - sc.from[1]) * e;
  const z = sc.from[2] + (sc.to[2] - sc.from[2]) * e;
  // cover the screen, then zoom around the focus point
  const base = Math.max(W / img.naturalWidth, H / img.naturalHeight) * z;
  const dw = img.naturalWidth * base, dh = img.naturalHeight * base;
  let x = W / 2 - fx * dw, y = H / 2 - fy * dh;
  x = Math.min(0, Math.max(W - dw, x)); y = Math.min(0, Math.max(H - dh, y));
  if (sc.shake && t < 2.5) { x += (Math.random() - 0.5) * 6 * (1 - t / 2.5); y += (Math.random() - 0.5) * 6 * (1 - t / 2.5); }
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x, y, dw, dh);
  if (sc.night) { ctx.fillStyle = `rgba(20,20,70,${sc.night})`; ctx.fillRect(0, 0, W, H); }
  if (sc.dim) { ctx.fillStyle = `rgba(0,0,0,${sc.dim})`; ctx.fillRect(0, 0, W, H); }
  ctx.globalAlpha = 1;
}
function introDraw() {
  const sc = INTRO[introI], t = introT, k = Math.min(1, t / 0.5);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // crossfade from the previous picture
  if (introI > 0 && t < 0.5) drawScene(INTRO[introI - 1], INTRO[introI - 1].dur, 1);
  drawScene(sc, t, introI > 0 ? k : Math.min(1, t / 0.8));
  // letterbox bars for a film feel
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, 6); ctx.fillRect(0, H - 6, W, 6);
  const ta = Math.min(1, Math.max(0, (t - 0.4) / 0.4));
  if (sc.bubble) bubble(sc.bubble, W / 2, H * (sc.bubbleY || 0.1), ta, sc.who, sc.red);
  if (sc.cap) {
    const fs = Math.round(Math.min(W / 17, 24));
    ctx.font = `800 ${fs}px system-ui,sans-serif`;
    const lines = sc.cap.split('\n'), bw = Math.min(W - 32, Math.max(...lines.map(l => ctx.measureText(l).width)) + 36), bh = lines.length * fs * 1.45 + 22;
    const bx = W / 2 - bw / 2, by = H * 0.06;
    ctx.globalAlpha = ta;
    ctx.fillStyle = '#fff6d8'; ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 3;
    roundRect(bx, by, bw, bh, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a2a14'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, W / 2, by + 12 + i * fs * 1.45));
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
  }
  if (sc.logo) {
    const p = Math.min(1, t / 0.5), s = 0.4 + 0.6 * p + Math.sin(p * Math.PI) * 0.15;
    ctx.save(); ctx.translate(W / 2, H * 0.4); ctx.scale(s, s);
    ctx.font = `900 ${Math.round(Math.min(W / 4.5, 96))}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 14; ctx.strokeStyle = '#7a3f00'; ctx.strokeText('MOLT', 0, 0);
    ctx.fillStyle = '#ffd84a'; ctx.fillText('MOLT', 0, 0);
    ctx.font = `800 ${Math.round(Math.min(W / 17, 22))}px system-ui,sans-serif`; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.strokeText('ปกป้องไข่ทองคำของ Serจ่อย!', 0, 70); ctx.fillStyle = '#fff'; ctx.fillText('ปกป้องไข่ทองคำของ Serจ่อย!', 0, 70);
    if (t > 1.2) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5); ctx.font = '800 16px system-ui,sans-serif'; ctx.fillText('แตะเพื่อเริ่มเล่น', 0, 120); ctx.globalAlpha = 1; }
    ctx.restore(); ctx.textBaseline = 'alphabetic';
  }
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  INTRO.forEach((_, i) => { ctx.globalAlpha = i === introI ? 1 : 0.35; ctx.beginPath(); ctx.arc(W / 2 + (i - (INTRO.length - 1) / 2) * 14, H - 30, 4, 0, Math.PI * 2); ctx.fill(); });
  ctx.globalAlpha = 1;
}
function drawEgg(x, y, r, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  glow.addColorStop(0, 'rgba(255,220,80,.55)'); glow.addColorStop(1, 'rgba(255,200,0,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (ready(IMG.golden_egg)) { drawAt(IMG.golden_egg, x, y + r, r * 2.4); return; }
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.5, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, '#fff7c2'); g.addColorStop(0.4, '#ffd23a'); g.addColorStop(1, '#c98a00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r * 0.78, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#a06a00'; ctx.lineWidth = 2; ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const a = t * 2 + i * 2.1, sx = x + Math.cos(a) * r * 1.3, sy = y + Math.sin(a) * r * 1.1;
    ctx.fillStyle = '#fff'; ctx.font = `${Math.round(r * 0.6)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('✦', sx, sy);
  }
}
function bubble(text, x, y, a, who, red) {
  if (a <= 0) return;
  const fs = Math.round(Math.min(W / 17, 23));
  ctx.font = `800 ${fs}px system-ui,sans-serif`;
  const lines = text.split('\n'), bw = Math.min(W - 30, Math.max(...lines.map(l => ctx.measureText(l).width)) + 40), bh = lines.length * fs * 1.4 + 40;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(0.85 + 0.15 * a, 0.85 + 0.15 * a);
  ctx.fillStyle = red ? '#ffe9e4' : '#ffffff'; ctx.strokeStyle = red ? '#9a1d10' : '#2b2216'; ctx.lineWidth = 3;
  roundRect(-bw / 2, 0, bw, bh, 18); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-12, bh - 1); ctx.lineTo(0, bh + 18); ctx.lineTo(12, bh - 1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-12, bh); ctx.lineTo(0, bh + 18); ctx.lineTo(12, bh); ctx.stroke();
  ctx.font = `900 ${Math.round(fs * 0.7)}px system-ui,sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = red ? '#c22a2a' : '#c77d00'; ctx.fillText(who, -bw / 2 + 14, 8);
  ctx.font = `800 ${fs}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#2b2216';
  lines.forEach((l, i) => ctx.fillText(l, 0, 8 + fs * 0.9 + i * fs * 1.4));
  ctx.restore(); ctx.textBaseline = 'alphabetic';
}

// ---------- input ----------
document.getElementById('introUi').addEventListener('pointerdown', e => { if (e.target.id !== 'introSkip') nextIntro(); });
document.getElementById('introSkip').onclick = e => { e.stopPropagation(); endIntro(); };
if (!save.introSeen) playIntro();
