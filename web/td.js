// MOLT — duck house defense. A little duck house in the middle, a fence around it and
// wooden shooting platforms you build for duck archers. Cats come in waves from every side.
// Shares globals with index.html (ctx, W, H, IMG, ready, drawFrame, drawAt, roundRect, SFX, save, persist, state...).
"use strict";

const $ = id => document.getElementById(id);
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hidden'), 1900);
}
function btn(label, sub, ok, fn) {
  const b = document.createElement('button');
  b.className = 'sbtn' + (ok ? '' : ' off');
  b.innerHTML = `<b>${label}</b>${sub ? `<small>${sub}</small>` : ''}`;
  b.onclick = e => {
    e.stopPropagation();
    if (!ok) { SFX.play('gateBad'); return; }
    SFX.play('click'); const st = $('sheet').scrollTop; fn(); persist(); refreshSheet(); $('sheet').scrollTop = st; renderTdHud();
  };
  return b;
}

// ---------- weapons ----------
const WEAPONS = [
  { id: 'bow',    name: 'ธนูไม้',     icon: '🏹', dmg: 1,   rate: 1.3,  range: 6.5, speed: 13, cost: 0 },
  { id: 'xbow',   name: 'หน้าไม้',    icon: '🎯', dmg: 3,   rate: 0.8,  range: 8,   speed: 18, cost: 150 },
  { id: 'fire',   name: 'ธนูไฟ',      icon: '🔥', dmg: 2,   rate: 1.1,  range: 7,   speed: 13, splash: 1.0, cost: 300 },
  { id: 'triple', name: 'ธนูสามดอก', icon: '🔱', dmg: 1.6, rate: 1.0,  range: 6.5, speed: 14, multi: 3, cost: 500 },
  { id: 'cannon', name: 'ปืนใหญ่ไม้', icon: '💣', dmg: 9,   rate: 0.33, range: 9,   speed: 9,  splash: 1.8, arc: true, cost: 800 },
];
const WEAPON = Object.fromEntries(WEAPONS.map(w => [w.id, w]));
WEAPON.bomb = { speed: 1, range: 0 };

// ---------- save ----------
const SLOTS = 8, PLAT_R = 2.75, RING = 4.4, HOUSE_R = 1.2;
if (!save.td) save.td = {
  wave: 1, house: 1, fence: 1, bomb: 1,
  plats: [{ slot: 2, w: 'bow', lvl: 1 }, { slot: 6, w: 'bow', lvl: 1 }],
};
const T = save.td;
function platAt(s) { return T.plats.find(p => p.slot === s); }
function platPos(s) { const a = s / SLOTS * Math.PI * 2 + Math.PI / SLOTS; return { x: Math.cos(a) * PLAT_R, y: Math.sin(a) * PLAT_R }; }
function wDmg(p) { return WEAPON[p.w].dmg * (1 + (p.lvl - 1) * 0.35); }
function lvlCost(p) { const tier = WEAPONS.findIndex(w => w.id === p.w); return Math.round(40 * Math.pow(p.lvl, 1.5) * (1 + tier * 0.4)); }
function buildCost() { return Math.round(60 * Math.pow(1.55, Math.max(0, T.plats.length - 2))); }
function houseMax() { return 20 + (T.house - 1) * 12; }
function wallMax() { return 30 + (T.fence - 1) * 18; }
function bombDmg() { return 6 + (T.bomb - 1) * 4; }

// ---------- arena ----------
let D = null;
let dk = 30;
function dproj(x, y) { return { x: W / 2 + x * dk, y: H * 0.47 + y * dk * 0.62 }; }
function dinv(sx, sy) { return { x: (sx - W / 2) / dk, y: (sy - H * 0.47) / (dk * 0.62) }; }

function freshField() {
  dk = Math.min(W / 11.5, H / 15);
  D = {
    phase: 'build', t: 0, houseHp: houseMax(), houseMax: houseMax(), bombCd: 0, shake: 0,
    walls: Array.from({ length: 8 }, (_, i) => ({ a: i * Math.PI / 4, hp: wallMax(), max: wallMax(), hit: 0 })),
    shooters: new Map(),   // slot -> {cd, aimDx, aimDy, shootT}
    cats: [], shots: [], fx: [], floats: [], queue: [], banner: 0, killed: 0, earned: 0,
  };
}
function shooter(s) {
  let o = D.shooters.get(s);
  if (!o) { o = { cd: Math.random() * 0.5, aimDx: 0, aimDy: 1, shootT: 0, arrive: 0 }; D.shooters.set(s, o); }
  return o;
}
function enterTD() {
  if (!D || D.phase === 'over') freshField();
  state = 'td';
  hide('menu'); hide('result'); show('tdUi');
  closeSheet(); renderTdHud();
}
function startWave() {
  if (D.phase !== 'build') return;
  SFX.init(); SFX.play('gateBad');
  closeSheet();
  D.phase = 'wave'; D.t = 0; D.banner = 2.5; D.killed = 0; D.earned = 0;
  D.queue = buildWave(T.wave);
  D.total = D.queue.length;
  renderTdHud();
}
function buildWave(n) {
  const q = [];
  const groups = 3 + Math.floor(n * 0.8);
  let t = 0;
  for (let g = 0; g < groups; g++) {
    const side = Math.random() * Math.PI * 2;
    const size = 3 + Math.floor(n * 1.2 + Math.random() * 3);
    for (let i = 0; i < size; i++) q.push({ t: t + i * 0.35, a: side + (Math.random() - 0.5) * 0.7, hp: 2 + Math.floor(n / 2), boss: false });
    t += Math.max(3.5, 8 - n * 0.3);
  }
  if (n % 5 === 0) q.push({ t: t + 2, a: Math.random() * Math.PI * 2, hp: 60 + n * 18, boss: true });
  return q;
}
function spawnCat(c) {
  const rx = W / 2 / dk + 1, ry = H * 0.53 / (dk * 0.62) + 1;
  D.cats.push({ x: Math.cos(c.a) * rx, y: Math.sin(c.a) * ry, hp: c.hp, max: c.hp, boss: c.boss,
    v: c.boss ? 0.7 : 0.9 + Math.random() * 0.5, st: 'walk', atk: 0, ph: Math.random() * 9, hitT: 0 });
}
function wallFor(c) {
  let a = Math.atan2(c.y, c.x); if (a < 0) a += Math.PI * 2;
  return D.walls[Math.round(a / (Math.PI / 4)) % 8];
}

// ---------- update ----------
function tdUpdate(dt) {
  if (!D) return;
  D.t += dt; D.banner -= dt;
  for (const p of T.plats) { const o = shooter(p.slot); o.arrive = Math.max(0, o.arrive - dt); }
  if (D.phase === 'wave') {
    while (D.queue.length && D.queue[0].t <= D.t - 1.2) spawnCat(D.queue.shift());
    if (D.bombCd > 0) D.bombCd -= dt;
    for (const c of D.cats) {
      if (c.hp <= 0) continue;
      c.hitT = Math.max(0, c.hitT - dt);
      const dist = Math.hypot(c.x, c.y), wall = wallFor(c);
      if (c.st === 'walk') {
        if (dist <= RING + 0.5 && wall.hp > 0) { c.st = 'wall'; c.atk = 0; }
        else if (dist <= HOUSE_R + 0.5) { c.st = 'house'; c.atk = 0; }
        else { c.x -= c.x / dist * c.v * dt; c.y -= c.y / dist * c.v * dt; }
      } else if (c.st === 'wall') {
        if (wall.hp <= 0) { c.st = 'walk'; continue; }
        c.atk += dt;
        if (c.atk > 0.9) {
          c.atk = 0; wall.hp -= c.boss ? 6 : 1; wall.hit = 0.15; SFX.play('wood');
          if (wall.hp <= 0) { wall.hp = 0; SFX.play('break'); addFx('ring', Math.cos(wall.a) * RING, Math.sin(wall.a) * RING, '#ffcf8a'); toast('รั้วพัง! แตะรั้วเพื่อซ่อม'); }
        }
      } else if (c.st === 'house') {
        c.atk += dt;
        if (c.atk > 1) {
          c.atk = 0; D.houseHp -= c.boss ? 4 : 1; D.shake = 0.15; SFX.play('hit');
          D.floats.push({ x: c.x, y: c.y, t: 0, text: '-1❤️', color: '#ff7a6a' });
          if (D.houseHp <= 0) endWave(false);
        }
      }
    }
    // ducks on platforms shoot
    for (const p of T.plats) {
      const o = shooter(p.slot), W0 = WEAPON[p.w], pos = platPos(p.slot);
      o.cd -= dt; o.shootT = Math.max(0, o.shootT - dt);
      if (o.cd > 0 || o.arrive > 0) continue;
      const t = nearestCat(pos.x, pos.y, W0.range);
      if (!t) continue;
      o.cd = 1 / W0.rate; o.aimDx = t.x - pos.x; o.aimDy = t.y - pos.y; o.shootT = 0.3;
      const n = W0.multi || 1;
      for (let k = 0; k < n; k++) {
        const spread = n > 1 ? (k - (n - 1) / 2) * 0.22 : 0;
        const ang = Math.atan2(t.y - pos.y, t.x - pos.x) + spread, dist = Math.hypot(t.x - pos.x, t.y - pos.y);
        D.shots.push({ x: pos.x, y: pos.y, sx: pos.x, sy: pos.y, tx: pos.x + Math.cos(ang) * dist, ty: pos.y + Math.sin(ang) * dist,
          target: n > 1 ? null : t, w: p.w, dmg: wDmg(p), t: 0, dur: dist / W0.speed, high: true });
      }
      SFX.play(p.w === 'cannon' ? 'wood' : 'shoot');
    }
  }
  // projectiles + bombs
  for (const s of D.shots) {
    s.t += dt;
    if (!s.bomb && s.target && s.target.hp > 0) { s.tx = s.target.x; s.ty = s.target.y; }
    const k = Math.min(1, s.t / s.dur);
    s.x = s.sx + (s.tx - s.sx) * k; s.y = s.sy + (s.ty - s.sy) * k;
    if (k < 1) continue;
    s.done = true;
    if (s.bomb) {
      for (const c of D.cats) if (c.hp > 0 && Math.hypot(c.x - s.tx, c.y - s.ty) < 1.9) hurtCat(c, s.dmg);
      addFx('boom', s.tx, s.ty, '#ffb347'); D.shake = 0.35; SFX.play('break');
      continue;
    }
    const W0 = WEAPON[s.w];
    if (W0.splash) {
      for (const c of D.cats) if (c.hp > 0 && Math.hypot(c.x - s.x, c.y - s.y) < W0.splash) hurtCat(c, s.dmg);
      addFx(s.w === 'cannon' ? 'boom' : 'fire', s.x, s.y, s.w === 'cannon' ? '#ffb347' : '#ff7a2a');
      if (s.w === 'cannon') { SFX.play('break'); D.shake = 0.25; }
    } else {
      const c = s.target && s.target.hp > 0 ? s.target : D.cats.find(c => c.hp > 0 && Math.hypot(c.x - s.x, c.y - s.y) < 0.55);
      if (c) hurtCat(c, s.dmg);
    }
  }
  D.shots = D.shots.filter(s => !s.done);
  D.cats = D.cats.filter(c => c.hp > 0 || (c.deadT = (c.deadT || 0) + dt) < 0.6);
  for (const f of D.fx) f.t += dt;
  D.fx = D.fx.filter(f => f.t < 0.5);
  for (const f of D.floats) f.t += dt;
  D.floats = D.floats.filter(f => f.t < 1.1);
  for (const w of D.walls) w.hit = Math.max(0, w.hit - dt);
  D.shake = Math.max(0, D.shake - dt);
  if (D.phase === 'wave' && !D.queue.length && !D.cats.some(c => c.hp > 0)) endWave(true);
  if ((tdTick += dt) > 0.5) { tdTick = 0; renderTdHud(); }
}
let tdTick = 0;
function hurtCat(c, dmg) {
  if (c.hp <= 0) return;
  c.hp -= dmg; c.hitT = 0.1;
  D.floats.push({ x: c.x, y: c.y, t: 0, text: '-' + (Math.round(dmg * 10) / 10), color: '#fff', small: true });
  addFx('spark', c.x, c.y, '#fff3b0'); SFX.play('hit');
  if (c.hp <= 0) {
    D.killed++;
    SFX.play(Math.random() < 0.3 ? 'meow' : 'hit');
    const co = c.boss ? 150 : (Math.random() < 0.5 ? 2 + Math.floor(T.wave / 2) : 0);
    if (co) { save.coins += co; D.earned += co; D.floats.push({ x: c.x, y: c.y - 0.6, t: 0, text: '+' + co + '🪙', color: '#ffd84a' }); }
  }
}
function nearestCat(x, y, r) {
  let best = null, bd = r;
  for (const c of D.cats) { if (c.hp <= 0) continue; const d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; best = c; } }
  return best;
}
function addFx(type, x, y, color) { D.fx.push({ type, x, y, t: 0, color }); }
function endWave(won) {
  if (D.phase !== 'wave') return;
  D.phase = 'build';
  D.cats = []; D.shots = []; D.queue = [];
  if (won) {
    const bonus = 40 + T.wave * 15;
    save.coins += bonus; D.earned += bonus;
    SFX.play('win');
    showWaveResult(true, bonus);
    T.wave++;
  } else {
    SFX.play('lose');
    showWaveResult(false, 0);
  }
  // fence and house are patched up between waves
  D.houseHp = D.houseMax = houseMax();
  for (const w of D.walls) w.hp = w.max = wallMax();
  persist(); renderTdHud();
}
function showWaveResult(won, bonus) {
  $('rTitle').textContent = won ? `ผ่านคลื่นที่ ${T.wave}! 🛡️` : 'บ้านพัง! 😿';
  $('rTitle').style.color = won ? '#ffd84a' : '#ff7a7a';
  $('rInfo').textContent = won ? `ล้มแมว ${D.killed} ตัว • โบนัส 🪙${bonus}` : `ล้มแมวได้ ${D.killed} ตัว • สร้างนั่งร้านหรืออัปเกรดแล้วลองใหม่`;
  $('rCoins').textContent = D.earned;
  $('next').textContent = won ? '🦆 กลับบ้านเป็ด' : '🔁 เตรียมตัวใหม่';
  hide('tdUi'); show('result'); state = 'tdresult';
}

// ---------- input ----------
cv.addEventListener('pointerdown', e => {
  if (state !== 'td' || !D) return;
  const p = dinv(e.clientX, e.clientY);
  // platforms (drawn raised, so test a little above the ground point too)
  for (let s = 0; s < SLOTS; s++) {
    const q = platPos(s);
    if (Math.hypot(p.x - q.x, p.y - q.y) < 0.75 || Math.hypot(p.x - q.x, p.y + 1.2 - q.y) < 0.75) { SFX.init(); SFX.play('click'); openSlot(s); return; }
  }
  if (Math.hypot(p.x, p.y + 0.6) < HOUSE_R + 0.3) { SFX.init(); SFX.play('click'); openHouse(); return; }
  for (const w of D.walls) {
    const wx = Math.cos(w.a) * RING, wy = Math.sin(w.a) * RING;
    if (Math.hypot(p.x - wx, p.y - wy) < 0.9 && w.hp < w.max) {
      const cost = 10 + T.fence * 3;
      if (save.coins < cost) { toast(`เหรียญไม่พอซ่อม (🪙${cost})`); SFX.play('gateBad'); return; }
      save.coins -= cost; w.hp = Math.min(w.max, w.hp + Math.ceil(w.max * 0.5)); SFX.play('plus');
      D.floats.push({ x: wx, y: wy, t: 0, text: `ซ่อม -${cost}🪙`, color: '#b8ff8a' });
      return;
    }
  }
  closeSheet();
  if (D.phase !== 'wave' || D.bombCd > 0) return;
  D.bombCd = 7;
  D.shots.push({ x: 0, y: 0, sx: 0, sy: -0.8, tx: p.x, ty: p.y, w: 'bomb', dmg: bombDmg(), t: 0, dur: 0.45, bomb: true });
});

// ---------- sheets ----------
let sheetFor = null;
function closeSheet() { sheetFor = null; $('sheet').classList.add('hidden'); }
function refreshSheet() { if (!sheetFor) return; if (sheetFor === 'house') openHouse(); else openSlot(sheetFor.slot); }
function openSlot(s) {
  sheetFor = { slot: s };
  const body = $('sheetBody'); body.innerHTML = '';
  const p = platAt(s);
  if (!p) {
    $('sheetTitle').textContent = '🪵 สร้างนั่งร้าน';
    const info = document.createElement('div'); info.className = 'sinfo';
    info.textContent = 'สร้างนั่งร้านให้เป็ดออกจากบ้านมายืนยิงแมว (เริ่มด้วยธนูไม้)';
    body.appendChild(info);
    const c = buildCost();
    body.appendChild(btn('สร้างนั่งร้าน', `🪙${c}`, save.coins >= c, () => {
      save.coins -= c; T.plats.push({ slot: s, w: 'bow', lvl: 1 }); shooter(s).arrive = 1; SFX.play('quack'); toast('เป็ดขึ้นนั่งร้านแล้ว!');
    }));
  } else {
    const W0 = WEAPON[p.w];
    $('sheetTitle').textContent = `${W0.icon} นั่งร้าน • ${W0.name} Lv.${p.lvl}`;
    const info = document.createElement('div'); info.className = 'sinfo';
    info.innerHTML = `🪙 <b>${Math.floor(save.coins).toLocaleString()}</b> • ดาเมจ ${wDmg(p).toFixed(1)} • ยิง ${W0.rate}/วิ • ระยะ ${W0.range}${W0.splash ? ' • ระเบิด' : ''}${W0.multi ? ' • 3 ดอก' : ''}`;
    body.appendChild(info);
    const lc = lvlCost(p);
    body.appendChild(btn(p.lvl < 10 ? `⬆️ อัปเกรด → Lv.${p.lvl + 1}` : '⬆️ เลเวลเต็ม', p.lvl < 10 ? `🪙${lc}` : '', p.lvl < 10 && save.coins >= lc, () => { save.coins -= lc; p.lvl++; SFX.play('gateGood'); }));
    const head = document.createElement('div'); head.className = 'sinfo'; head.style.marginTop = '10px';
    head.textContent = 'เปลี่ยนอาวุธ (เลเวลยังอยู่เหมือนเดิม)';
    body.appendChild(head);
    for (const w of WEAPONS) {
      if (w.id === p.w) continue;
      const better = WEAPONS.indexOf(w) > WEAPONS.indexOf(W0);
      body.appendChild(btn(`${w.icon} ${w.name}`, `ดาเมจ ${w.dmg} • ยิง ${w.rate}/วิ${w.splash ? ' • ระเบิด' : ''}${w.multi ? ' • 3 ดอก' : ''} • 🪙${w.cost}`, save.coins >= w.cost, () => {
        save.coins -= w.cost; p.w = w.id; SFX.play(better ? 'gateGood' : 'click'); toast(`เปลี่ยนเป็น${w.name}!`);
      }));
    }
  }
  $('sheet').classList.remove('hidden');
}
function openHouse() {
  sheetFor = 'house';
  const body = $('sheetBody'); body.innerHTML = '';
  $('sheetTitle').textContent = '🏠 บ้านเป็ด';
  const info = document.createElement('div'); info.className = 'sinfo';
  info.innerHTML = `🪙 <b>${Math.floor(save.coins).toLocaleString()}</b> • เป็ดยิง ${T.plats.length} ตัว • คลื่นถัดไป ${T.wave}`;
  body.appendChild(info);
  const hc = 80 * T.house, fc = 50 * T.fence, bc = 60 * T.bomb;
  body.appendChild(btn(`🏠 เสริมบ้าน Lv.${T.house}`, `ทน ${houseMax()} • 🪙${hc}`, save.coins >= hc, () => { save.coins -= hc; T.house++; D.houseHp = D.houseMax = houseMax(); }));
  body.appendChild(btn(`🪵 เสริมรั้ว Lv.${T.fence}`, `ทน ${wallMax()} • 🪙${fc}`, save.coins >= fc, () => { save.coins -= fc; T.fence++; for (const w of D.walls) { w.max = wallMax(); w.hp = Math.max(w.hp, Math.min(w.max, w.hp + 18)); } }));
  body.appendChild(btn(`💣 ระเบิดมือ Lv.${T.bomb}`, `แรง ${bombDmg()} • 🪙${bc}`, save.coins >= bc, () => { save.coins -= bc; T.bomb++; }));
  $('sheet').classList.remove('hidden');
}
function renderTdHud() {
  if (!D) return;
  $('tdCoins').textContent = Math.floor(save.coins).toLocaleString();
  $('tdWave').textContent = T.wave;
  $('waveBtn').classList.toggle('hidden', D.phase !== 'build');
  $('waveBtn').textContent = `▶ เริ่มคลื่นที่ ${T.wave}${T.wave % 5 === 0 ? ' 👑' : ''}`;
}

// ---------- drawing ----------
function tdDraw() {
  if (!D) return;
  ctx.save();
  if (D.shake > 0) ctx.translate((Math.random() - 0.5) * 30 * D.shake, (Math.random() - 0.5) * 30 * D.shake);
  const g = ctx.createRadialGradient(W / 2, H * 0.47, 10, W / 2, H * 0.47, Math.max(W, H) * 0.7);
  g.addColorStop(0, '#8ccf5a'); g.addColorStop(0.55, '#5fa73c'); g.addColorStop(1, '#2f6a22');
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
  // little flowers / grass tufts for a cartoon look
  // scattered flowers and grass tufts (stable pseudo-random positions)
  for (let i = 0; i < 46; i++) {
    const rx = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1, ry = Math.abs(Math.sin(i * 78.233) * 12345.678) % 1;
    const x = rx * W, y = ry * H;
    if (i % 3 === 0) { ctx.fillStyle = ['#fff6a8', '#ffffff', '#ffb3c7'][i % 9 / 3 | 0]; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.57) * 3, y + Math.sin(k * 1.57) * 2, 2.2, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#ffb000'; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.strokeStyle = 'rgba(40,110,30,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 6, y - 7); ctx.moveTo(x, y); ctx.lineTo(x, y - 9); ctx.moveTo(x + 4, y); ctx.lineTo(x + 6, y - 7); ctx.stroke(); }
  }
  const c0 = dproj(0, 0);
  ctx.fillStyle = 'rgba(210,180,120,.75)';
  ctx.beginPath(); ctx.ellipse(c0.x, c0.y, (RING + 0.5) * dk, (RING + 0.5) * dk * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(160,210,110,.6)';
  ctx.beginPath(); ctx.ellipse(c0.x, c0.y, (RING - 0.4) * dk, (RING - 0.4) * dk * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  // range hint for the selected platform
  if (sheetFor && sheetFor.slot !== undefined && platAt(sheetFor.slot)) {
    const p = platAt(sheetFor.slot), q = platPos(p.slot), s = dproj(q.x, q.y), r = WEAPON[p.w].range;
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(s.x, s.y, r * dk, r * dk * 0.62, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  const list = [[0, drawHouse]];
  for (const w of D.walls) list.push([Math.sin(w.a) * RING, () => drawFence(w)]);
  for (let s = 0; s < SLOTS; s++) { const q = platPos(s); list.push([q.y, () => drawPlatform(s)]); }
  for (const c of D.cats) list.push([c.y, () => drawCat(c)]);
  list.sort((a, b) => a[0] - b[0]);
  for (const it of list) it[1]();
  for (const s of D.shots) drawShot(s);
  for (const f of D.fx) drawFx(f);
  for (const f of D.floats) {
    const p = dproj(f.x, f.y), a = 1 - f.t / 1.1;
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = `900 ${f.small ? 13 : 17}px system-ui,sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.5)';
    const y = p.y - dk * 1.3 - f.t * 30;
    ctx.strokeText(f.text, p.x, y); ctx.fillStyle = f.color; ctx.fillText(f.text, p.x, y);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  drawTdHud();
}
let houseTop = 0;
function drawHouse() {
  const p = dproj(0, 0), s = dk;
  if (ready(IMG.duckhouse)) {
    houseTop = p.y + s * 0.9 - drawAt(IMG.duckhouse, p.x, p.y + s * 0.9, s * 3.0);
  } else {
    // cartoon placeholder: round yellow house, orange dome roof, duck on top
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + s * 0.25, s * 1.35, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(p.x, p.y + s * 0.2, s * 1.1, s * 0.5, 0, 0, Math.PI); ctx.fill();
    ctx.fillRect(p.x - s * 1.1, p.y - s * 0.6, s * 2.2, s * 0.8);
    ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.ellipse(p.x, p.y - s * 0.6, s * 1.1, s * 0.48, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a9be0'; roundRect(p.x - s * 0.22, p.y - s * 0.25, s * 0.44, s * 0.6, s * 0.2); ctx.fill();
    ctx.fillStyle = '#bfe6ff'; ctx.beginPath(); ctx.arc(p.x - s * 0.65, p.y - s * 0.15, s * 0.15, 0, Math.PI * 2); ctx.arc(p.x + s * 0.65, p.y - s * 0.15, s * 0.15, 0, Math.PI * 2); ctx.fill();
    const rg = ctx.createLinearGradient(0, p.y - s * 1.9, 0, p.y - s * 0.6);
    rg.addColorStop(0, '#ffa04a'); rg.addColorStop(1, '#e26a1a');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(p.x, p.y - s * 0.65, s * 1.3, s * 1.15, 0, Math.PI, 0); ctx.fill();
    // rubber duck on the roof
    const dy = p.y - s * 1.9 + Math.sin(performance.now() / 400) * 2;
    ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.ellipse(p.x, dy + s * 0.18, s * 0.42, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x - s * 0.08, dy - s * 0.12, s * 0.24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8a1a'; ctx.beginPath(); ctx.ellipse(p.x - s * 0.33, dy - s * 0.07, s * 0.14, s * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(p.x - s * 0.14, dy - s * 0.17, s * 0.04, 0, Math.PI * 2); ctx.fill();
  }
  // sleeping ducks inside
  const t = performance.now() / 1000;
  ctx.font = `900 ${Math.round(s * 0.5)}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2); ctx.fillText('z', p.x + s * 1.15, p.y - s * 0.9 - (t * 10 % 12)); ctx.fillText('z', p.x + s * 1.4, p.y - s * 1.3 - ((t * 10 + 6) % 12)); ctx.globalAlpha = 1;
  // house HP
  const bw = 90, y = (ready(IMG.duckhouse) ? houseTop : p.y - s * 2.3) - 14;
  ctx.fillStyle = 'rgba(0,0,0,.5)'; roundRect(p.x - bw / 2, y, bw, 9, 4.5); ctx.fill();
  ctx.fillStyle = '#5fe06a'; roundRect(p.x - bw / 2 + 2, y + 2, (bw - 4) * Math.max(0, D.houseHp / D.houseMax), 5, 2.5); ctx.fill();
}
function drawFence(w) {
  const x = Math.cos(w.a) * RING, y = Math.sin(w.a) * RING, p = dproj(x, y), wd = dk * 2.0;
  if (w.hp > 0 && ready(IMG.barrier)) {
    ctx.save(); ctx.translate(p.x + (w.hit > 0 ? Math.sin(w.hit * 90) * 3 : 0), p.y);
    if (Math.cos(w.a) < -0.2) ctx.scale(-1, 1);
    ctx.globalAlpha = 0.55 + 0.45 * w.hp / w.max;
    drawAt(IMG.barrier, 0, wd * 0.18, wd);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(90,60,30,.6)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, wd * 0.4, wd * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.font = '900 12px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe2a8'; ctx.fillText('🔧 แตะซ่อม', p.x, p.y - 4);
  }
  if (w.hp < w.max && w.hp > 0) {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(p.x - 18, p.y - wd * 0.62, 36, 4);
    ctx.fillStyle = '#ffb347'; ctx.fillRect(p.x - 18, p.y - wd * 0.62, 36 * w.hp / w.max, 4);
  }
}
const PLAT_H = 1.25;  // how high the duck stands (meters, drawn upward)
const PLAT_W = 1.55, PLAT_DECK = 0.30;   // platform sprite width (m) and deck centre as a fraction of its height
function drawPlatform(s) {
  const q = platPos(s), p = dproj(q.x, q.y), pl = platAt(s), k = dk;
  if (!pl) {
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, k * 0.6, k * 0.36, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = `900 ${Math.round(k * 0.55)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+', p.x, p.y); ctx.textBaseline = 'alphabetic';
    return;
  }
  let top = p.y - PLAT_H * k;
  if (ready(IMG.platform)) {
    const ph = drawAt(IMG.platform, p.x, p.y + k * 0.2, k * PLAT_W);
    top = p.y + k * 0.2 - ph * (1 - PLAT_DECK);
  }
  else {
    // wooden scaffold: four legs, cross braces, plank deck
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, k * 0.62, k * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = Math.max(2, k * 0.09);
    for (const dx of [-0.45, 0.45]) { ctx.beginPath(); ctx.moveTo(p.x + dx * k, p.y); ctx.lineTo(p.x + dx * k * 0.85, top); ctx.stroke(); }
    ctx.lineWidth = Math.max(1.5, k * 0.05);
    ctx.beginPath(); ctx.moveTo(p.x - 0.45 * k, p.y - 0.05 * k); ctx.lineTo(p.x + 0.4 * k, top + 0.1 * k); ctx.moveTo(p.x + 0.45 * k, p.y - 0.05 * k); ctx.lineTo(p.x - 0.4 * k, top + 0.1 * k); ctx.stroke();
    ctx.fillStyle = '#c98a4a'; ctx.beginPath(); ctx.ellipse(p.x, top, k * 0.62, k * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(p.x + i * k * 0.2, top - k * 0.27); ctx.lineTo(p.x + i * k * 0.2, top + k * 0.27); ctx.stroke(); }
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, top, k * 0.62, k * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // the duck archer on top (hops up from the house when the platform is new)
  const o = shooter(s), h = k * 1.1, flip = o.aimDx < 0;
  const hop = o.arrive > 0 ? Math.sin(o.arrive * Math.PI) * k * 0.8 : 0;
  const fk = o.shootT > 0 ? Math.min(3, Math.floor((0.3 - o.shootT) / 0.3 * 4)) : 0;
  const dy = top + k * 0.05 - hop;
  if (o.aimDy < 0 && ready(IMG.duck_shoot)) drawFrame('duck_shoot', o.shootT > 0 ? 1 + fk % 3 : 0, p.x, dy, h, flip);
  else if (ready(IMG.duck_shoot_front)) drawFrame('duck_shoot_front', o.shootT > 0 ? fk : 0, p.x, dy, h, flip);
  // weapon + level badge
  ctx.font = `900 ${Math.round(k * 0.32)}px system-ui,sans-serif`; ctx.textAlign = 'center';
  const badge = `${WEAPON[pl.w].icon}${pl.lvl}`;
  const bw = ctx.measureText(badge).width + 8;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; roundRect(p.x - bw / 2, dy - h * 1.15, bw, k * 0.42, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText(badge, p.x, dy - h * 1.15 + k * 0.32);
}
function drawCat(c) {
  const p = dproj(c.x, c.y), h = dk * (c.boss ? 2.8 : 1.1);
  ctx.globalAlpha = c.hp > 0 ? 1 : Math.max(0, 1 - (c.deadT || 0) / 0.6);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.25, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  const t = performance.now() / 1000 + c.ph, flip = c.x > 0;
  let x = p.x + (c.hitT > 0 ? Math.sin(c.hitT * 120) * 3 : 0);
  if (c.hp <= 0) { ctx.save(); ctx.translate(x, p.y); ctx.rotate((flip ? -1 : 1) * Math.min(1.4, (c.deadT || 0) * 5)); x = 0; }
  const py = c.hp <= 0 ? 0 : p.y, atk = c.st !== 'walk' && c.hp > 0, k = c.atk / 0.9;
  if (c.boss && ready(IMG.boss)) {
    ctx.save(); ctx.translate(x, py); ctx.rotate(atk ? Math.sin(k * Math.PI * 2) * 0.25 : Math.sin(t * 6) * 0.06);
    drawAt(IMG.boss, 0, 0, h * IMG.boss.naturalWidth / IMG.boss.naturalHeight); ctx.restore();
  } else if (c.y > 0.3 && c.hp > 0 && ready(IMG.cat_back)) {
    const lunge = atk && k > 0.55 && k < 0.8 ? -h * 0.08 : 0;
    drawFrame('cat_back', atk ? (k < 0.55 ? 0 : 3) : Math.floor(t * 9) % 6, x, py + lunge - (atk ? 0 : Math.abs(Math.sin(t * 7)) * h * 0.05), h, !flip);
  } else if (ready(IMG.cat)) {
    if (atk) drawFrame('cat', k < 0.5 ? 2 : k < 0.75 ? 3 : 4, x, py, h, flip);
    else drawFrame('cat', [0, 1, 5, 1][Math.floor(t * 8) % 4], x, py - Math.abs(Math.sin(t * 7)) * h * 0.06, h, flip);
  }
  if (c.hp <= 0) ctx.restore();
  ctx.globalAlpha = 1;
  if (c.hp > 0 && c.hp < c.max) {
    const bw = c.boss ? 70 : 22;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(p.x - bw / 2, p.y - h * 1.05, bw, c.boss ? 6 : 3);
    ctx.fillStyle = '#ff4a3a'; ctx.fillRect(p.x - bw / 2, p.y - h * 1.05, bw * c.hp / c.max, c.boss ? 6 : 3);
  }
}
function drawShot(s) {
  const k = Math.min(1, s.t / s.dur);
  const W0 = WEAPON[s.w] || {};
  // arrows leave from the raised platform and drop toward the target
  const base = s.high ? (PLAT_H + 0.55) * (1 - k) + 0.5 * k : 0.6;
  const lift = (s.bomb || W0.arc) ? Math.sin(k * Math.PI) * dk * 2.2 + dk * base * (1 - k) : dk * base;
  const p = dproj(s.x, s.y), y = p.y - lift;
  if (s.bomb || s.w === 'cannon') {
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(p.x, y, s.bomb ? 6 : 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,60,.8)'; ctx.beginPath(); ctx.arc(p.x + 3, y - 4, 2.5, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const ang = Math.atan2((s.ty - s.sy) * 0.62 + (s.high ? dk * 0.05 : 0), s.tx - s.sx);
  const len = s.w === 'xbow' ? 16 : 13;
  const col = s.w === 'fire' ? '#ff8a2a' : s.w === 'xbow' ? '#d8f4ff' : '#ffe27a';
  ctx.save(); ctx.translate(p.x, y); ctx.rotate(ang);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(-len * 2, 0, 0, 0); g.addColorStop(0, 'rgba(255,220,120,0)'); g.addColorStop(1, col);
  ctx.strokeStyle = g; ctx.lineWidth = s.w === 'fire' ? 5 : 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-len * 2, 0); ctx.lineTo(0, 0); ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#6b3f1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke();
  ctx.fillStyle = '#eef'; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-2, -3); ctx.lineTo(-2, 3); ctx.fill();
  ctx.restore();
}
function drawFx(f) {
  const p = dproj(f.x, f.y), k = f.t / 0.5;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k;
  if (f.type === 'boom' || f.type === 'fire') {
    const r = dk * (f.type === 'boom' ? 1.9 : 1.0) * (0.3 + k);
    const g = ctx.createRadialGradient(p.x, p.y - 6, 0, p.x, p.y - 6, r);
    g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, f.color); g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y - 6, r, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
  } else if (f.type === 'ring') {
    ctx.strokeStyle = f.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, dk * (0.3 + k), dk * (0.3 + k) * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    const r = dk * (0.15 + k * 0.4), cy = p.y - dk * 0.6;
    const g = ctx.createRadialGradient(p.x, cy, 0, p.x, cy, r);
    g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, cy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function drawTdHud() {
  if (D.phase === 'wave') {
    const alive = D.cats.filter(c => c.hp > 0).length + D.queue.length;
    ctx.font = '900 16px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    const t1 = `🐱 เหลือ ${alive}`;
    ctx.strokeText(t1, W / 2, 62); ctx.fillStyle = '#fff'; ctx.fillText(t1, W / 2, 62);
    const bx = W - 46, by = H - 60, r = 28;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
    if (D.bombCd > 0) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - D.bombCd / 7)); ctx.fill(); }
    ctx.font = '24px system-ui'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('💣', bx, by + 1);
    ctx.textBaseline = 'alphabetic';
  }
  if (D.banner > 0) {
    ctx.globalAlpha = Math.min(1, D.banner);
    ctx.font = '900 30px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(80,0,0,.75)';
    const txt = T.wave % 5 === 0 ? 'ราชาแมวมาเอง!' : 'แมวบุกรอบทิศ!';
    ctx.strokeText(txt, W / 2, H * 0.2); ctx.fillStyle = '#ff6a5a'; ctx.fillText(txt, W / 2, H * 0.2);
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
  }
}

// ---------- buttons ----------
$('waveBtn').onclick = e => { e.stopPropagation(); startWave(); };
$('houseBtn').onclick = e => { e.stopPropagation(); SFX.init(); SFX.play('click'); openHouse(); };
$('sheetClose').onclick = closeSheet;
$('raidBtn').onclick = () => {
  if (D && D.phase === 'wave') { toast('สู้คลื่นนี้ให้จบก่อน'); return; }
  SFX.init(); SFX.play('click'); closeSheet(); hide('tdUi');
  state = 'menu'; renderMenu(); preview(); show('menu');
};
$('homeBtn').onclick = () => { SFX.play('click'); enterTD(); };
freshField();
enterTD();
