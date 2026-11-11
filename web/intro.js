// MOLT — short silent story intro (comic captions), shown once before the first game.
// Tap = next scene, "ข้าม" = skip. Replay from the ❓ button.
"use strict";

// Story clip (5 Gemini clips joined) with captions drawn on top. Times are seconds in img/intro.mp4.
const CAPS = [
  { from: 0.6, to: 7.2, cap: 'ณ ทุ่งหญ้าแสนสงบ…\nบ้านของ Serจ่อย กับไข่เป็ดทองคำ\nที่เสกเหรียญได้ทุกวัน' },
  { from: 8.0, to: 14.8, cap: 'แต่แล้วคืนหนึ่ง…\nฝูงแมวก็มาล้อมบ้าน' },
  { from: 16.6, to: 22.6, bubble: 'ไข่ทองคำนั่น…\nข้าจะเอาไปทำไข่เจียว!\nทหาร บุก!!', who: 'ราชาแมว', red: true, y: 0.08 },
  { from: 23.2, to: 27.6, bubble: 'ลูกน้อง… จัดการที\n(หาว~) ข้าจะนอนต่อ', who: 'Serจ่อย', y: 0.08 },
  { from: 28.4, to: 33.0, cap: 'เหล่าเป็ด… ออกรบ!' },
];
const LOGO_AT = 33.2;
const vid = document.createElement('video');
vid.muted = true; vid.playsInline = true; vid.setAttribute('playsinline', ''); vid.setAttribute('webkit-playsinline', ''); vid.preload = 'auto';
vid.src = 'img/intro.mp4';

let introOn = false, introDone = null, introT = 0, introEnd = false;
function playIntro(done) {
  introOn = true; introDone = done || null; introT = 0; introEnd = false;
  state = 'intro';
  ['tdUi', 'menu', 'result', 'tut'].forEach(id => { const e = document.getElementById(id); if (e) e.classList.add('hidden'); });
  document.getElementById('introUi').classList.remove('hidden');
  try { vid.currentTime = 0; const p = vid.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
}
function endIntro() {
  if (!introOn) return;
  introOn = false;
  try { vid.pause(); } catch (e) {}
  document.getElementById('introUi').classList.add('hidden');
  save.introSeen = true; persist();
  enterTD();
  if (introDone) introDone();
  else if (!save.tut.td) setTimeout(() => runTut('td'), 400);
}
function introUpdate(dt) {
  // follow the video clock; if the video can't play, captions still advance on their own
  if (vid.readyState >= 2 && !vid.paused) introT = vid.currentTime;
  else introT += dt;
  if (vid.ended || introT >= vid.duration) introEnd = true;
}
function nextIntro() {
  if (vid.paused && !introEnd) { try { const p = vid.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} if (introT < 1) return; }
  if (introT >= LOGO_AT || introEnd) { endIntro(); return; }
  // tap = jump to the next caption
  const nx = CAPS.find(c => c.from > introT + 0.3);
  const to = nx ? nx.from - 0.4 : LOGO_AT;
  try { vid.currentTime = to; } catch (e) {}
  introT = to;
}

function introDraw() {
  const t = introT;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (vid.readyState >= 2) {
    const s = Math.max(W / vid.videoWidth, H / vid.videoHeight), dw = vid.videoWidth * s, dh = vid.videoHeight * s;
    ctx.drawImage(vid, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = '#fff'; ctx.font = '700 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText('กำลังโหลด…', W / 2, H / 2);
  }
  for (const c of CAPS) {
    if (t < c.from || t > c.to) continue;
    const a = Math.min(1, (t - c.from) / 0.35, (c.to - t) / 0.35);
    if (c.bubble) bubble(c.bubble, W / 2, H * c.y, a, c.who, c.red);
    else caption(c.cap, a);
  }
  if (t >= LOGO_AT) {
    const lt = t - LOGO_AT;
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.4, lt)})`; ctx.fillRect(0, 0, W, H);
    const p = Math.min(1, lt / 0.5), s = 0.4 + 0.6 * p + Math.sin(p * Math.PI) * 0.15;
    ctx.save(); ctx.translate(W / 2, H * 0.4); ctx.scale(s, s);
    ctx.font = `900 ${Math.round(Math.min(W / 4.5, 96))}px Mitr,system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 14; ctx.strokeStyle = '#7a3f00'; ctx.strokeText('MOLT', 0, 0);
    ctx.fillStyle = '#ffd84a'; ctx.fillText('MOLT', 0, 0);
    ctx.font = `800 ${Math.round(Math.min(W / 17, 22))}px Mitr,system-ui,sans-serif`; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.strokeText('ปกป้องไข่ทองคำของ Serจ่อย!', 0, 70); ctx.fillStyle = '#fff'; ctx.fillText('ปกป้องไข่ทองคำของ Serจ่อย!', 0, 70);
    if (lt > 1) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(lt * 5); ctx.font = '800 16px Mitr,system-ui,sans-serif'; ctx.fillText('แตะเพื่อเริ่มเล่น', 0, 120); ctx.globalAlpha = 1; }
    ctx.restore(); ctx.textBaseline = 'alphabetic';
  }
  // progress bar
  const d = vid.duration || 35.8;
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(20, H - 22, W - 40, 3);
  ctx.fillStyle = '#ffd84a'; ctx.fillRect(20, H - 22, (W - 40) * Math.min(1, t / d), 3);
}
function caption(text, a) {
  const fs = Math.round(Math.min(W / 17, 24));
  ctx.font = `800 ${fs}px Mitr,system-ui,sans-serif`;
  const lines = text.split('\n'), bw = Math.min(W - 32, Math.max(...lines.map(l => ctx.measureText(l).width)) + 36), bh = lines.length * fs * 1.45 + 22;
  const bx = W / 2 - bw / 2, by = H * 0.07;
  ctx.globalAlpha = a;
  ctx.fillStyle = '#fff6d8'; ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 3;
  roundRect(bx, by, bw, bh, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a2a14'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, W / 2, by + 12 + i * fs * 1.45));
  ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
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
  ctx.font = `800 ${fs}px Mitr,system-ui,sans-serif`;
  const lines = text.split('\n'), bw = Math.min(W - 30, Math.max(...lines.map(l => ctx.measureText(l).width)) + 40), bh = lines.length * fs * 1.4 + 40;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(0.85 + 0.15 * a, 0.85 + 0.15 * a);
  ctx.fillStyle = red ? '#ffe9e4' : '#ffffff'; ctx.strokeStyle = red ? '#9a1d10' : '#2b2216'; ctx.lineWidth = 3;
  roundRect(-bw / 2, 0, bw, bh, 18); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-12, bh - 1); ctx.lineTo(0, bh + 18); ctx.lineTo(12, bh - 1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-12, bh); ctx.lineTo(0, bh + 18); ctx.lineTo(12, bh); ctx.stroke();
  ctx.font = `900 ${Math.round(fs * 0.7)}px Mitr,system-ui,sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = red ? '#c22a2a' : '#c77d00'; ctx.fillText(who, -bw / 2 + 14, 8);
  ctx.font = `800 ${fs}px Mitr,system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#2b2216';
  lines.forEach((l, i) => ctx.fillText(l, 0, 8 + fs * 0.9 + i * fs * 1.4));
  ctx.restore(); ctx.textBaseline = 'alphabetic';
}

// ---------- input ----------
document.getElementById('introUi').addEventListener('pointerdown', e => { if (e.target.id !== 'introSkip') nextIntro(); });
document.getElementById('introSkip').onclick = e => { e.stopPropagation(); endIntro(); };
if (!save.introSeen) playIntro();
