// MOLT — day 16 rally cutscene: the duck chief calls everyone together — "we won't take it any more,
// this time WE attack! who's ready? raise your hands!" — then the gate opens and the ducks march out.
// Drawn live with the game's own art (no video download). Tap = next shot, "ข้าม" = skip.
"use strict";
(() => {
const REN = {
  "15 วันแล้ว… ที่แมวบุกเมืองเราทุกคืน": "15 days now… the cats have raided our city every night",
  "หัวหน้าเป็ด": "Duck Chief",
  "Serจ่อย": "Serjoy",
  "ทุกตัว! มารวมกันตรงนี้เดี๋ยวนี้!!": "Everyone! Gather round, right now!!",
  "เราโดนบุกมา 15 วันเต็ม…\nไข่ทองคำเกือบโดนเอาไปทำไข่เจียว!": "We've been attacked for 15 whole days…\nthe golden egg nearly became an omelette!",
  "พอกันที!!\nเราจะไม่ทนอีกต่อไป!": "Enough!!\nWe won't take it any more!",
  "คราวนี้… เราจะบุกบ้าง!!\nใครพร้อม ยกมือขึ้น!": "This time… WE attack!!\nWho's ready? Hands up!",
  "ก๊าบ!": "Quack!",
  "พร้อม!": "Ready!",
  "(งัวเงีย) …ไปกันหมดเลยเหรอ?\nแล้วใครจะพัดให้ฉันล่ะ…": "(yawn) …you're ALL going?\nThen who's going to fan me…",
  "เหล่าเป็ด… ออกศึก!": "Ducks… march out!",
  "ข้าม ▶▶": "Skip ▶▶",
  "แตะเพื่อไปต่อ": "Tap to continue",
  "ก๊ง!": "CLANG!",
};
const rt = s => tr(gameLanguage === 'en' && REN[s] ? REN[s] : s);

// sprites cut from the duck sheet (01.webp, 4×4 tiles of 168 px)
const SPR = {};
{ const sheet = new Image(); sheet.onload = () => { for (let i = 0; i < 16; i++) { const c = document.createElement('canvas'); c.width = c.height = 168; c.getContext('2d').drawImage(sheet, (i % 4) * 168, Math.floor(i / 4) * 168, 168, 168, 0, 0, 168, 168); SPR[i] = c; } }; sheet.src = 'img/molt-art/01.webp'; }
function duck(i, x, y, h, flip, rot, sx, sy) {
  const c = SPR[i]; if (!c) return;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale((flip ? -1 : 1) * (sx || 1), sy || 1);
  ctx.drawImage(c, -h / 2, -h * 0.97, h, h); ctx.restore();
}

// timeline (seconds). Each shot: start time; taps jump to the next one.
const SHOTS = [0, 4.2, 8.6, 13.4, 17.4, 22.4, 27.6, 31.6];
const END = 35;
let R = null;
function start(done) {
  R = { t: 0, done, crowd: [], said: {}, flash: 0 };
  const wpn = ['it_chopsticks', 'it_fork', 'it_ladle', 'it_chili', 'it_spatula'];
  // crowd: 3 loose rows on the right, facing the chief on the left; each comes running in
  let k = 0;
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4 + row; i++) {
    R.crowd.push({ row, col: i, ox: 0.5 + i * 0.12 + row * 0.03 - (row === 1 ? 0.05 : 0), oy: 0.66 + row * 0.085, in: 4.6 + k * 0.17, raise: 22.9 + k * 0.16 + (k === 7 ? 1.6 : 0), wpn: wpn[k % wpn.length], ph: Math.random() * 6, sleepy: k === 7, fromLeft: k % 3 === 0 });
    k++;
  }
  const ui = document.getElementById('rallyUi') || (() => {
    const d = document.createElement('div'); d.id = 'rallyUi';
    d.style.cssText = 'position:fixed;inset:0;z-index:30;';
    d.innerHTML = `<button id="rallySkip" style="position:absolute;top:14px;right:12px;border:0;border-radius:14px;padding:8px 14px;background:rgba(0,0,0,.55);color:#fff;font:800 14px Mitr,system-ui">${rt("ข้าม ▶▶")}</button>`;
    document.body.appendChild(d); return d;
  })();
  ui.style.display = '';
  ui.onpointerdown = e => { if (e.target.id === 'rallySkip') return; next(); };
  document.getElementById('rallySkip').onclick = e => { e.stopPropagation(); finish(); };
}
function next() { if (!R) return; const nx = SHOTS.find(s => s > R.t + 0.2); if (nx === undefined || R.t > END - 1) { finish(); return; } R.t = nx - 0.05; }
function finish() {
  if (!R) return; const d = R.done; R = null;
  const ui = document.getElementById('rallyUi'); if (ui) ui.style.display = 'none';
  if (d) d();
}
function once(key, fn) { if (!R.said[key]) { R.said[key] = true; try { fn(); } catch (e) {} } }
function update(dt) {
  if (!R) return;
  R.t += dt; const t = R.t;
  if (t > 4.4) once('clang', () => { SFX.play('clang'); setTimeout(() => SFX.play('clang'), 260); });
  if (t > 5) once('q1', () => SFX.play('quack'));
  if (t > 13.5) once('roar', () => { SFX.play('slam'); R.flash = 0.5; });
  if (t > 17.5) once('horn', () => SFX.play('horn'));
  for (const c of R.crowd) if (t > c.raise) once('r' + c.col + c.row, () => { if ((c.col + c.row) % 2 === 0) SFX.play('quack'); });
  if (t > 25.6) once('fan', () => SFX.play('fanfare'));
  if (t > 31.7) once('gate', () => SFX.play('gateGood'));
  R.flash = Math.max(0, R.flash - dt);
  if (t >= END) finish();
}
// ---------- drawing ----------
function sky(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.45);
  g.addColorStop(0, t < 13.4 ? '#f7a65a' : '#ff8a4a'); g.addColorStop(1, '#ffe2a0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.45);
  ctx.fillStyle = 'rgba(255,240,200,.85)'; ctx.beginPath(); ctx.arc(W * 0.78, H * 0.17, W * 0.09, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 4; i++) { const x = ((i * 0.31 + t * 0.008) % 1.2) * W - 40, y = H * (0.06 + i * 0.05); ctx.fillStyle = 'rgba(255,255,255,.7)'; for (const [dx, r] of [[0, 18], [20, 24], [44, 16]]) { ctx.beginPath(); ctx.arc(x + dx, y, r, 0, Math.PI * 2); ctx.fill(); } }
}
function wall(yTop, h, gateOpen) {
  // the city wall across the scene, scratched by 15 nights of cats
  const top = yTop, bw = W / 9;
  ctx.fillStyle = '#c4b193'; ctx.fillRect(0, top, W, h);
  for (let r = 0; r < 3; r++) for (let i = -1; i < 10; i++) { const x = i * bw + (r % 2) * bw / 2, y = top + r * h / 3; ctx.strokeStyle = '#a8957a'; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, h / 3); }
  for (let i = 0; i < 9; i += 1) { if (i % 2) continue; ctx.fillStyle = '#d8c7a6'; ctx.fillRect(i * bw + 4, top - h * 0.28, bw - 8, h * 0.3); ctx.strokeStyle = '#4a3a2c'; ctx.lineWidth = 2; ctx.strokeRect(i * bw + 4, top - h * 0.28, bw - 8, h * 0.3); }
  ctx.strokeStyle = '#4a3a2c'; ctx.lineWidth = 3; ctx.strokeRect(-2, top, W + 4, h);
  // claw marks
  ctx.strokeStyle = 'rgba(90,60,30,.55)'; ctx.lineWidth = 2.5;
  for (const [x, y] of [[0.12, 0.3], [0.62, 0.5], [0.86, 0.25]]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(W * x + k * 7, top + h * y); ctx.lineTo(W * x + k * 7 + 10, top + h * (y + 0.35)); ctx.stroke(); }
  // gate in the middle
  const gw = W * 0.2, gx = W / 2 - gw / 2, gy = top + h * 0.12, gh = h * 0.88;
  ctx.fillStyle = gateOpen > 0 ? '#3a5a2a' : '#7a4a22'; ctx.beginPath(); ctx.moveTo(gx, gy + gh); ctx.lineTo(gx, gy + gw / 2); ctx.arc(W / 2, gy + gw / 2, gw / 2, Math.PI, 0); ctx.lineTo(gx + gw, gy + gh); ctx.closePath(); ctx.fill();
  if (gateOpen > 0) { const g = ctx.createLinearGradient(0, gy, 0, gy + gh); g.addColorStop(0, '#8fdc6a'); g.addColorStop(1, '#4a9a3a'); ctx.fillStyle = g; ctx.fill(); }
  const doorW = gw / 2 * (1 - Math.min(1, gateOpen));
  ctx.fillStyle = '#9a5e2a'; ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 2;
  for (const s of [-1, 1]) { if (doorW < 2) break; const x0 = s < 0 ? gx : gx + gw - doorW; ctx.fillRect(x0, gy + gw * 0.15, doorW, gh - gw * 0.15); ctx.strokeRect(x0, gy + gw * 0.15, doorW, gh - gw * 0.15); }
  ctx.strokeStyle = '#4a3a2c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx, gy + gh); ctx.lineTo(gx, gy + gw / 2); ctx.arc(W / 2, gy + gw / 2, gw / 2, Math.PI, 0); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
}
function floor(y0) {
  const img = IMG.floor;
  if (ready(img)) { const s = W / artWidth(img); ctx.drawImage(img, 0, y0, W, artHeight(img) * s); if (artHeight(img) * s < H - y0) ctx.drawImage(img, 0, y0 + artHeight(img) * s, W, artHeight(img) * s); }
  else { ctx.fillStyle = '#f4c48a'; ctx.fillRect(0, y0, W, H - y0); }
  const g = ctx.createLinearGradient(0, y0, 0, y0 + 40); g.addColorStop(0, 'rgba(60,30,10,.35)'); g.addColorStop(1, 'rgba(60,30,10,0)'); ctx.fillStyle = g; ctx.fillRect(0, y0, W, 40);
}
function speech(text, x, y, who, red, a) {
  if (a <= 0) return;
  const fs = Math.round(Math.min(W / 18, 21));
  ctx.font = `800 ${fs}px Mitr,system-ui,sans-serif`;
  const lines = text.split('\n'), bw = Math.min(W - 24, Math.max(...lines.map(l => ctx.measureText(l).width)) + 34), bh = lines.length * fs * 1.38 + (who ? 34 : 18);
  const bx = Math.max(12, Math.min(W - 12 - bw, x - bw / 2));
  ctx.save(); ctx.globalAlpha = Math.min(1, a); const s = 0.85 + 0.15 * Math.min(1, a); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y);
  ctx.fillStyle = red ? '#fff1e0' : '#ffffff'; ctx.strokeStyle = red ? '#b03a10' : '#2b2216'; ctx.lineWidth = 3;
  roundRect(bx, y - bh - 16, bw, bh, 16); ctx.fill(); ctx.stroke();
  const tx = Math.max(bx + 20, Math.min(bx + bw - 20, x));
  ctx.beginPath(); ctx.moveTo(tx - 10, y - 17); ctx.lineTo(tx, y); ctx.lineTo(tx + 10, y - 17); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(tx - 10, y - 16); ctx.lineTo(tx, y); ctx.lineTo(tx + 10, y - 16); ctx.stroke();
  ctx.textBaseline = 'top';
  if (who) { ctx.font = `900 ${Math.round(fs * 0.68)}px Mitr,system-ui`; ctx.textAlign = 'left'; ctx.fillStyle = red ? '#c0400f' : '#c77d00'; ctx.fillText(who, bx + 14, y - bh - 8); }
  ctx.font = `800 ${fs}px Mitr,system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#2b2216';
  lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, y - bh - 16 + (who ? 26 : 10) + i * fs * 1.38));
  ctx.restore(); ctx.textBaseline = 'alphabetic';
}
function caption(text, a) {
  if (a <= 0) return;
  const fs = Math.round(Math.min(W / 18, 22));
  ctx.font = `800 ${fs}px Mitr,system-ui`;
  const lines = text.split('\n'), bw = Math.min(W - 28, Math.max(...lines.map(l => ctx.measureText(l).width)) + 34), bh = lines.length * fs * 1.4 + 20;
  ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = 'rgba(30,18,8,.78)'; roundRect(W / 2 - bw / 2, H * 0.08, bw, bh, 12); ctx.fill();
  ctx.fillStyle = '#fff6d8'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; lines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.08 + 10 + i * fs * 1.4)); ctx.restore(); ctx.textBaseline = 'alphabetic';
}
function pop(text, x, y, t0, t, col, size) {
  const u = t - t0; if (u < 0 || u > 1.1) return;
  const s = u < 0.15 ? u / 0.15 * 1.3 : u < 0.3 ? 1.3 - (u - 0.15) * 2 : 1;
  ctx.save(); ctx.globalAlpha = u > 0.8 ? (1.1 - u) / 0.3 : 1; ctx.translate(x, y - u * 24); ctx.scale(s, s); ctx.rotate(-0.1);
  ctx.font = `900 ${size || 20}px Mitr,system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 5; ctx.strokeStyle = '#3a2008'; ctx.strokeText(text, 0, 0); ctx.fillStyle = col || '#fff'; ctx.fillText(text, 0, 0); ctx.restore();
}
function fade(a) { if (a <= 0) return; ctx.fillStyle = `rgba(0,0,0,${Math.min(1, a)})`; ctx.fillRect(0, 0, W, H); }
const easeOut = u => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3);
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));

function draw() {
  if (!R) return;
  const t = R.t, h = Math.min(W * 0.26, H * 0.14);                 // duck height
  const chief = { x: W * 0.24, y: H * 0.69 };
  // camera: wide, then push in on the chief for the big lines, back out for the cheer
  let zoom = 1, fx = W / 2, fy = H / 2;
  const zin = seg(t, 8.6, 9.6) * (1 - seg(t, 22.0, 22.8)), punch = t > 13.4 && t < 17.4 ? 0.12 * Math.exp(-(t - 13.4) * 5) : 0;
  zoom = 1 + zin * 0.45 + punch; fx = W / 2 + (chief.x - W / 2) * zin * 0.9; fy = H / 2 + (chief.y - h * 0.8 - H / 2) * zin * 0.7;
  if (t >= SHOTS[6]) { zoom = 1 + seg(t, 27.6, 28.6) * 0.5; fx = W * 0.78; fy = H * 0.62; }
  if (t >= SHOTS[7]) { zoom = 1; fx = W / 2; fy = H / 2; }
  // never let the camera show past the painted scene
  fx = Math.max(W / 2 / zoom, Math.min(W - W / 2 / zoom, fx)); fy = Math.max(H / 2 / zoom, Math.min(H - H / 2 / zoom, fy));
  const shake = t > 13.4 && t < 14.2 ? (14.2 - t) * 14 : 0;
  ctx.save();
  ctx.translate(W / 2 + (Math.random() - 0.5) * shake, H / 2 + (Math.random() - 0.5) * shake); ctx.scale(zoom, zoom); ctx.translate(-fx, -fy);
  // ---- scene ----
  const wallTop = H * 0.36, wallH = H * 0.16, gateOpen = seg(t, 31.8, 33.2);
  sky(t); wall(wallTop, wallH, gateOpen); floor(wallTop + wallH);
  // the golden egg altar at the back and Serjoy snoozing on the right
  if (ready(IMG.molt_altar)) { const gx = W * 0.6, gy = wallTop + wallH + h * 0.25; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(gx, gy - h * 0.7, 0, gx, gy - h * 0.7, h); gl.addColorStop(0, 'rgba(255,220,90,.45)'); gl.addColorStop(1, 'rgba(255,200,0,0)'); ctx.fillStyle = gl; ctx.fillRect(gx - h, gy - h * 1.7, h * 2, h * 2); ctx.restore(); drawAt(IMG.molt_altar, gx, gy, h * 1.1); }
  if (ready(IMG.shrine_serjoy)) { const sw = t > 27.6 && t < 31.6 ? Math.sin(t * 10) * 0.03 : 0; ctx.save(); ctx.translate(W * 0.86, H * 0.6); ctx.rotate(sw); drawAt(IMG.shrine_serjoy, 0, 0, h * 1.25); ctx.restore(); if (t < 27.6 || t > 31.6) pop('z', W * 0.86 + 20 + Math.sin(t * 2) * 4, H * 0.6 - h * 1.25 - ((t * 0.7) % 1) * 20, Math.floor(t * 0.7) / 0.7, t, '#bfe6ff', 16); }
  // crate stage + the chief
  const stageUp = easeOut(seg(t, 4.2, 4.7));
  const cx = chief.x, cy = chief.y;
  if (ready(IMG.k_plat1)) drawAt(IMG.k_plat1, cx, cy + 6, h * 0.95);
  else { ctx.fillStyle = '#b07a40'; ctx.fillRect(cx - h * 0.4, cy - h * 0.3, h * 0.8, h * 0.36); }
  const standY = cy - h * 0.3;
  // chief: walks in tired in shot 1, hops on the crate, bangs the pot, then shouts
  let ci = 4, cxp = cx, cyp = standY, sq = 1, rot = 0, raiseSpoon = false;
  if (t < 4.2) { ci = 7; cxp = cx - h * 0.2; cyp = cy + h * 0.25; }                       // slumped on the floor
  else if (t < 4.7) { ci = 6; const u = seg(t, 4.2, 4.7); cxp = cx - h * 0.2 * (1 - u); cyp = cy + h * 0.25 - (h * 0.55) * u - Math.sin(u * Math.PI) * h * 0.5; }
  else if (t < 8.6) { ci = 4; sq = 1 + Math.sin(t * 12) * 0.04; }
  else if (t < 13.4) { ci = 4; sq = 1 + Math.sin(t * 6) * 0.02; }
  else if (t < 17.4) { ci = 6; sq = 1 + 0.15 * Math.exp(-(t - 13.4) * 4); rot = -0.06; }
  else { ci = 1; raiseSpoon = true; sq = 1 + Math.abs(Math.sin(t * 5)) * 0.05; }
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(cxp, (t < 4.7 ? cy + h * 0.25 : standY) + 2, h * 0.28, h * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  duck(ci, cxp, cyp, h * 1.15, false, rot, 1 / sq, sq);
  drawItem('it_pot', cxp + h * 0.04, cyp - h * 1.02 * sq, h * 0.5, 0.12);                   // the chief's pot helmet
  ctx.fillStyle = '#d8352a'; ctx.fillRect(cxp - h * 0.2, cyp - h * 0.86 * sq, h * 0.4, h * 0.06);   // red headband
  if (raiseSpoon) drawItem('it_ladle', cxp + h * 0.22, cyp - h * 1.25 - Math.abs(Math.sin(t * 5)) * h * 0.06, h * 0.75, -0.25 + Math.sin(t * 5) * 0.1);
  if (t > 4.4 && t < 6.2) { const bang = Math.abs(Math.sin((t - 4.4) * 9)); drawItem('it_pot', cxp + h * 0.55, cyp - h * 0.55, h * 0.42, 0.3); drawItem('it_ladle', cxp + h * 0.4, cyp - h * 0.7 - bang * h * 0.15, h * 0.5, -0.9 + bang * 0.8); pop(rt('ก๊ง!'), cxp + h * 0.7, cyp - h * 1.05, 4.45, t, '#ffd84a', 22); pop(rt('ก๊ง!'), cxp + h * 0.85, cyp - h * 0.8, 4.75, t, '#ffd84a', 20); }
  // crowd: tired ducks lying around at first, then everyone runs in to line up
  const crowd = R.crowd.slice().sort((a, b) => a.oy - b.oy);
  for (const c of crowd) {
    const tx = W * c.ox, ty = H * c.oy, dh = h * (0.78 + c.row * 0.07);
    let x = tx, y = ty, i = 0, flip = true, jump = 0, sx = 1, sy = 1;
    if (t < 4.6) { x = W * (0.35 + ((c.col * 0.23 + c.row * 0.37) % 0.6)); y = H * (0.6 + ((c.col * 0.13 + c.row * 0.21) % 0.3)); i = c.sleepy ? 11 : 7; flip = c.col % 2 === 0; }
    else if (t < c.in + 0.9) { const u = easeOut(seg(t, c.in, c.in + 0.9)); const sx0 = c.fromLeft ? -0.1 : 1.1; x = W * (sx0 + (c.ox - sx0) * u); y = ty; i = c.sleepy && t < c.in ? 11 : u < 1 ? (Math.floor(t * 8) % 2 ? 6 : 1) : 0; flip = !c.fromLeft || u >= 1; jump = u < 1 ? Math.abs(Math.sin(t * 14)) * dh * 0.06 : 0; if (c.sleepy && t < c.in) { x = W * 0.42; y = H * 0.84; i = 11; } }
    else if (t < 13.4) { i = 0; }
    else if (t < 17.4) { i = 3; sx = 1 + Math.sin((t + c.ph) * 30) * 0.03; }                                            // shiver
    else if (t < c.raise) { i = 0; }
    else { i = (Math.floor((t + c.ph) * 3) % 2) ? 6 : 2; jump = Math.abs(Math.sin((t - c.raise) * 6)) * dh * 0.12; }
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, y + 2, dh * 0.24, dh * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    duck(i, x, y - jump, dh, flip, 0, sx, sy);
    if (t >= c.raise && t < 31.6) { const wob = Math.sin((t + c.ph) * 6) * 0.15; drawItem(c.wpn, x + (flip ? -1 : 1) * dh * 0.12, y - jump - dh * 1.15, dh * 0.55, wob + (c.wpn === 'it_chili' ? 0.5 : 0)); pop(c.sleepy ? rt('พร้อม!') : rt('ก๊าบ!'), x, y - dh * 1.5, c.raise, t, c.sleepy ? '#ffd84a' : '#fff', c.sleepy ? 20 : 15); }
    if (t > 13.4 && t < 17.4 && (c.col + c.row) % 3 === 0) pop('💦', x + dh * 0.2, y - dh * 0.9, 13.6 + c.col * 0.1, t, '#fff', 16);
    if (t < 4.2 && !c.sleepy && (c.col + c.row) % 2 === 0) pop('💫', x, y - dh * 0.7, (Math.floor(t) + c.ph % 1), t, '#fff', 14);
  }
  // shot 7: ducks march out through the open gate
  if (t >= SHOTS[7]) {
    for (let k = 0; k < 10; k++) { const u = seg(t, 32 + k * 0.18, 34.5 + k * 0.18); if (u <= 0 || u >= 1) continue; const x = W * (0.2 + k * 0.06) + (W / 2 - W * (0.2 + k * 0.06)) * u, y = H * 0.8 - (H * 0.8 - (wallTop + wallH)) * u, s = h * (0.8 - u * 0.45); duck(Math.floor(t * 8 + k) % 2 ? 6 : 1, x, y - Math.abs(Math.sin(t * 12 + k)) * 4, s, x > W / 2); }
  }
  ctx.restore();
  // ---- overlays (screen space) ----
  if (R.flash > 0) { ctx.fillStyle = `rgba(255,200,90,${R.flash})`; ctx.fillRect(0, 0, W, H); }
  if (t > 13.4 && t < 17.4) { // manga speed lines behind the shout
    ctx.save(); ctx.globalAlpha = 0.35 * (1 - seg(t, 16.6, 17.4)); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2 + t * 0.4, r0 = Math.min(W, H) * 0.42; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, H * 0.45 + Math.sin(a) * r0); ctx.lineTo(W / 2 + Math.cos(a) * r0 * 2, H * 0.45 + Math.sin(a) * r0 * 2); ctx.stroke(); }
    ctx.restore();
  }
  const fadeIn = 1 - seg(t, 0, 0.6), sp = (a, b) => Math.min(seg(t, a, a + 0.3), 1 - seg(t, b - 0.3, b));
  const cs = (() => { const z = zoom; return { x: (chief.x - fx) * z + W / 2, y: (standY - h * 1.2 - fy) * z + H / 2 }; })();
  caption(rt("15 วันแล้ว… ที่แมวบุกเมืองเราทุกคืน"), sp(0.4, 4.2));
  speech(rt("ทุกตัว! มารวมกันตรงนี้เดี๋ยวนี้!!"), cs.x + 30, cs.y, rt("หัวหน้าเป็ด"), true, sp(5.2, 8.6));
  speech(rt("เราโดนบุกมา 15 วันเต็ม…\nไข่ทองคำเกือบโดนเอาไปทำไข่เจียว!"), cs.x + 30, cs.y - 10, rt("หัวหน้าเป็ด"), true, sp(9.0, 13.4));
  speech(rt("พอกันที!!\nเราจะไม่ทนอีกต่อไป!"), cs.x + 30, cs.y - 10, rt("หัวหน้าเป็ด"), true, sp(13.5, 17.4));
  speech(rt("คราวนี้… เราจะบุกบ้าง!!\nใครพร้อม ยกมือขึ้น!"), cs.x + 40, cs.y - 20, rt("หัวหน้าเป็ด"), true, sp(17.6, 22.6));
  if (t >= SHOTS[6] && t < SHOTS[7]) { const sx = (W * 0.86 - fx) * zoom + W / 2, sy = (H * 0.6 - h * 1.3 - fy) * zoom + H / 2; speech(rt("(งัวเงีย) …ไปกันหมดเลยเหรอ?\nแล้วใครจะพัดให้ฉันล่ะ…"), sx - 30, sy, rt("Serจ่อย"), false, sp(27.8, 31.6)); }
  if (t >= SHOTS[7] + 0.3) {
    const u = seg(t, 31.9, 32.4), s = 0.4 + 0.6 * easeOut(u) + Math.sin(u * Math.PI) * 0.15;
    ctx.save(); ctx.globalAlpha = u; ctx.translate(W / 2, H * 0.24); ctx.scale(s, s);
    ctx.font = `900 ${Math.round(Math.min(W / 9, 46))}px Mitr,system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = 10; ctx.strokeStyle = '#7a3f00'; ctx.strokeText(rt("เหล่าเป็ด… ออกศึก!"), 0, 0); ctx.fillStyle = '#ffd84a'; ctx.fillText(rt("เหล่าเป็ด… ออกศึก!"), 0, 0); ctx.restore();
  }
  // letterbox bars + progress + tap hint
  const bar = H * 0.06; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar * 0.6); ctx.fillRect(0, H - bar, W, bar);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(20, H - 14, W - 40, 3); ctx.fillStyle = '#ffd84a'; ctx.fillRect(20, H - 14, (W - 40) * Math.min(1, t / END), 3);
  ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 4); ctx.fillStyle = '#fff'; ctx.font = '700 12px Mitr,system-ui'; ctx.textAlign = 'center'; ctx.fillText(rt("แตะเพื่อไปต่อ"), W / 2, H - bar + 18); ctx.globalAlpha = 1;
  fade(fadeIn + seg(t, END - 0.8, END));
}
window.MoltRally = { start, update, draw, get on() { return !!R; }, skip: finish };
})();
