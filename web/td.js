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
  { id: 'bow',    name: 'ตะเกียบพุ่ง',  icon: '🥢', dmg: 1,   rate: 1.3,  range: 6.5, speed: 13, cost: 0 },
  { id: 'xbow',   name: 'ส้อมยักษ์',   icon: '🍴', dmg: 3,   rate: 0.8,  range: 8,   speed: 18, cost: 150 },
  { id: 'fire',   name: 'ซอสพริก',     icon: '🌶️', dmg: 2,   rate: 1.1,  range: 7,   speed: 13, splash: 1.0, cost: 300 },
  { id: 'ice',    name: 'ไอติมแท่ง',   icon: '🍧', dmg: 1.4, rate: 1.1,  range: 7,   speed: 14, cost: 400 },
  { id: 'triple', name: 'ตะเกียบทั้งกำ', icon: '🥢', dmg: 1.6, rate: 1.0,  range: 6.5, speed: 14, multi: 3, cost: 500 },
  { id: 'storm',  name: 'ตะกร้อไฟฟ้า', icon: '⚡', dmg: 2.2, rate: 0.9,  range: 7.5, speed: 22, chain: 2, cost: 650 },
  { id: 'cannon', name: 'หม้อหุงข้าว', icon: '🍙', dmg: 9,   rate: 0.33, range: 9,   speed: 9,  splash: 1.8, arc: true, cost: 800 },
];
const WEAPON = Object.fromEntries(WEAPONS.map(w => [w.id, w]));
// kitchen look: what each duck holds, and what flies through the air
const HELD = { bow: 'it_chopsticks', xbow: 'it_fork', fire: 'it_sauce', ice: 'it_icepop', triple: 'it_chopsticks', storm: 'it_whisk', cannon: 'it_ricecooker' };
const AMMO = { bow: 'it_chopsticks', xbow: 'it_fork', fire: 'it_chili', ice: 'it_icepop', triple: 'it_chopsticks', storm: 'it_whisk', cannon: 'it_riceball' };
// platform looks by level tier: crates -> table & chairs -> cupboard tower -> golden stove fort
const PLAT_NAME = ['ลังผัก', 'โต๊ะซ้อนเก้าอี้', 'หอตู้กับข้าว', 'ป้อมเตาแก๊สทองคำ'];
const PLAT_SKILL = ['', 'ยิงเร็วขึ้น 15%', 'ยิงเร็วขึ้น 30%', 'ยิงเร็วขึ้น 45% + ฝนตะเกียบทุก 6 วิ'];
// draw a kitchen item centred at (x, y)
function drawItem(name, x, y, size, rot, flip) {
  const img = IMG[name]; if (!ready(img)) return false;
  const s = size / Math.max(img.naturalWidth, img.naturalHeight);
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -img.naturalWidth * s / 2, -img.naturalHeight * s / 2, img.naturalWidth * s, img.naturalHeight * s);
  ctx.restore(); return true;
}
// level look: 0 = Lv1-3, 1 = Lv4-6, 2 = Lv7-9, 3 = Lv10
function tierOf(lvl) { return lvl >= 10 ? 3 : lvl >= 7 ? 2 : lvl >= 4 ? 1 : 0; }
const TIER_COL = ['#8a8f99', '#3fb24f', '#4a8cff', '#c06bff'];
const TIER_GLOW = [null, '#a6ff9a', '#9fd0ff', '#ffd84a'];
const WCOL = { bow: '#ffe27a', xbow: '#d8f4ff', fire: '#ff8a2a', ice: '#9fe8ff', triple: '#ffe27a', storm: '#c8b6ff', cannon: '#ffb347' };
// special powers unlocked at Lv5 and Lv10
const PERKS = {
  bow:    ['พุ่งทีละ 2 คู่', 'จิ้มคริติคอล 25% (x2)'],
  xbow:   ['แทงแมวกระเด็นถอยหลัง', 'คริติคอล 30% (x2.5)'],
  fire:   ['เผ็ดไหม้ต่อเนื่อง', 'สาดวงกว้าง'],
  ice:    ['เย็นเจี๊ยบเป็นวง', 'แช่แข็งจนหยุดนิ่ง'],
  triple: ['พุ่งทีละ 5 คู่', 'พุ่งทีละ 7 คู่'],
  storm:  ['ไฟช็อตกระโดด 4 ตัว', 'ไฟช็อตกระโดด 6 ตัว'],
  cannon: ['ข้าวเหนียวติดหนึบจนมึน', 'ข้าวเหนียวลูกยักษ์ + มึนนาน'],
};
function perkLv(p) { return p.lvl >= 10 ? 2 : p.lvl >= 5 ? 1 : 0; }
WEAPON.bomb = { speed: 1, range: 0 };

// ---------- save ----------
const SLOTS = 8, PLAT_R = 2.75, RING = 4.4, HOUSE_R = 1.2;
if (!save.td) save.td = {
  wave: 1, house: 1, fence: 1, bomb: 1,
  plats: [{ slot: 2, w: 'bow', lvl: 1 }, { slot: 6, w: 'bow', lvl: 1 }],
};
const T = save.td;
// leader duck upgrades (ladle damage, speed, coin magnet) and coins already paid into each buy pad
if (!T.lead) T.lead = { atk: 1, spd: 1, mag: 1 };
if (!T.pads) T.pads = {};
const LEAD_R = RING + 2.2;           // how far outside the fence the leader may wander
function leadSpeed() { return 3.2 + (T.lead.spd - 1) * 0.35; }
function leadMag() { return 0.9 + (T.lead.mag - 1) * 0.35; }
function leadDmg() { return 1 + (T.lead.atk - 1) * 0.8; }
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
// camera: zoomed in, pans sideways (and a little up/down) to follow the leader duck
let camX = 0, camY = 0;
function dproj(x, y) { return { x: W / 2 + (x - camX) * dk, y: H * 0.45 + (y - camY) * dk * 0.62 }; }
function dinv(sx, sy) { return { x: (sx - W / 2) / dk + camX, y: (sy - H * 0.45) / (dk * 0.62) + camY }; }
function camFollow(dt) {
  const L = D.lead, mx = Math.max(0, LEAD_R + 0.6 - W / 2 / dk), my = Math.max(0, (LEAD_R + 0.8) - H * 0.4 / (dk * 0.62));
  const tx = Math.max(-mx, Math.min(mx, L.x)), ty = Math.max(-my, Math.min(my, L.y * 0.6));
  const k = Math.min(1, dt * 4); camX += (tx - camX) * k; camY += (ty - camY) * k;
}

function freshField() {
  dk = Math.min(W / 8.5, H / 13);
  D = {
    phase: 'build', t: 0, houseHp: houseMax(), houseMax: houseMax(), bombCd: 0, shake: 0,
    walls: Array.from({ length: 8 }, (_, i) => ({ a: i * Math.PI / 4, hp: wallMax(), max: wallMax(), hit: 0 })),
    shooters: new Map(),   // slot -> {cd, aimDx, aimDy, shootT}
    cats: [], shots: [], fx: [], floats: [], queue: [], banner: 0, killed: 0, earned: 0,
    parts: [], coins: [], revived: false, hudPulse: 0, seen: {}, bolts: [],
    drops: [],                                   // coins lying on the ground for the leader to pick up
    lead: { x: 0, y: 1.6, face: 1, walkT: 0, moving: false, atkCd: 0, swingT: 0, hurtT: 0, happyT: 0 },
    joy: null,                                   // {sx, sy, x, y} while a finger is dragging
    padT: 0,
  };
}
function shooter(s) {
  let o = D.shooters.get(s);
  if (!o) { o = { cd: Math.random() * 0.5, aimDx: 0, aimDy: 1, shootT: 0, arrive: 0 }; D.shooters.set(s, o); }
  return o;
}
function enterTD() {
  if (!D || D.phase === 'over') freshField();
  if (D.phase === 'lost') resetWave();
  state = 'td';
  hide('menu'); hide('result'); show('tdUi');
  closeSheet(); renderTdHud();
}
function startWave() {
  if (D.phase !== 'build') return;
  SFX.init(); SFX.play('horn');
  closeSheet();
  D.phase = 'wave'; D.t = 0; D.banner = 2.5; D.bossBanner = false; D.killed = 0; D.earned = 0; D.revived = false;
  D.queue = buildWave(T.wave);
  D.total = D.queue.length;
  renderTdHud();
}
function buildWave(n) {
  const q = [];
  const groups = 3 + Math.floor(n * 0.8);
  let t = 0;
  for (let g = 0; g < groups; g++) {
    let side = Math.random() * Math.PI * 2;
    // no groups straight from the bottom yet: our cat art has no back view, so they'd look like they walk backwards
    if (Math.sin(side) > 0.7) side += (Math.cos(side) >= 0 ? -1 : 1) * 0.8;
    const size = 3 + Math.floor(n * 1.2 + Math.random() * 3);
    // from wave 3 some groups are ninja cats (fast), from wave 6 steel tank cats (tough)
    const r = Math.random();
    const kind = n >= 6 && r < 0.25 ? 'tank' : n >= 3 && r < 0.55 ? 'ninja' : 'cat';
    const cnt = kind === 'tank' ? Math.max(2, Math.ceil(size / 3)) : size;
    for (let i = 0; i < cnt; i++) q.push({ t: t + i * (kind === 'ninja' ? 0.22 : 0.35), a: side + (Math.random() - 0.5) * 0.7, hp: 2 + Math.floor(n / 2), boss: false, kind });
    t += Math.max(3.5, 8 - n * 0.3);
  }
  if (n % 5 === 0) q.push({ t: t + 2, a: Math.random() * Math.PI * 2, hp: 60 + n * 18, boss: true });
  return q;
}
function spawnCatOrig(c) {
  const rx = Math.max(W / 2 / dk + 1, RING + 4), ry = Math.max(RING + 4, Math.min(H * 0.55 / (dk * 0.62) + 1, RING + 7));
  const kind = c.kind || 'cat';
  const hp = kind === 'ninja' ? Math.max(1, Math.round(c.hp * 0.6)) : kind === 'tank' ? c.hp * 3 + 4 : c.hp;
  const v = c.boss ? 0.7 : kind === 'ninja' ? 1.8 + Math.random() * 0.5 : kind === 'tank' ? 0.55 + Math.random() * 0.15 : 0.9 + Math.random() * 0.5;
  D.cats.push({ x: Math.cos(c.a) * rx, y: Math.sin(c.a) * ry, hp, max: hp, boss: c.boss, kind,
    v, st: 'walk', atk: 0, ph: Math.random() * 9, hitT: 0, slow: 0, stun: 0, burn: 0 });
  if (!c.boss && kind !== 'cat' && !D.seen[kind]) {
    D.seen[kind] = true;
    toast(kind === 'ninja' ? '🥷 แมวนินจามาแล้ว! วิ่งเร็วมาก' : '🛡️ แมวเกราะเหล็กมาแล้ว! ทนมาก ใช้อาวุธแรงๆ');
  }
}
function spawnCat(c) {
  spawnCatOrig(c);
  if (c.boss) { SFX.play('bossRoar'); D.banner = 2.2; D.bossBanner = true; }
}
function wallFor(c) {
  let a = Math.atan2(c.y, c.x); if (a < 0) a += Math.PI * 2;
  return D.walls[Math.round(a / (Math.PI / 4)) % 8];
}

// ---------- update ----------
function tdUpdate(dt) {
  if (!D) return;
  fitField();
  D.t += dt; D.banner -= dt;
  for (const p of T.plats) { const o = shooter(p.slot); o.arrive = Math.max(0, o.arrive - dt); }
  if (D.phase === 'wave' || D.phase === 'build') leadUpdate(dt);
  camFollow(dt);
  if (D.phase === 'wave') {
    while (D.queue.length && D.queue[0].t <= D.t - 1.2) spawnCat(D.queue.shift());
    if (D.bombCd > 0) D.bombCd -= dt;
    for (const c of D.cats) {
      if (c.hp <= 0) continue;
      c.hitT = Math.max(0, c.hitT - dt);
      if (c.burn > 0) { c.burn -= dt; c.burnTick = (c.burnTick || 0) + dt; if (c.burnTick > 0.5) { c.burnTick = 0; hurtCat(c, c.burnDps * 0.5, 'burn'); if (c.hp <= 0) continue; } }
      if (c.stun > 0) { c.stun -= dt; continue; }
      if (c.slow > 0) c.slow -= dt;
      const sdt = c.slow > 0 ? dt * (c.freeze ? 0 : 0.5) : dt;
      if (c.slow <= 0) c.freeze = false;
      const dist = Math.hypot(c.x, c.y), wall = wallFor(c);
      if (c.st === 'walk') {
        if (dist <= RING + 0.5 && wall.hp > 0) { c.st = 'wall'; c.atk = 0; }
        else if (dist <= HOUSE_R + 0.5) { c.st = 'house'; c.atk = 0; }
        else {
          c.x -= c.x / dist * c.v * sdt; c.y -= c.y / dist * c.v * sdt;
          if (c.boss) { c.step = (c.step || 0) + dt; if (c.step > 0.55) { c.step = 0; SFX.play('bossStep'); D.shake = Math.max(D.shake, 0.08); } }
        }
      } else {
        // attacking the fence or the house; bosses swing slower but slam hard
        const period = c.boss ? BOSS_PERIOD : 0.9, hitAt = c.boss ? BOSS_PERIOD * 0.8 : 0.9;
        if (c.st === 'wall' && wall.hp <= 0) { c.st = 'walk'; c.atk = 0; continue; }
        const before = c.atk; c.atk += sdt;
        if (before < hitAt && c.atk >= hitAt) {
          if (c.boss) bossSlam(c);
          if (c.st === 'wall') {
            wall.hp -= c.boss ? 8 : 1; wall.hit = 0.2; SFX.play(c.boss ? 'crack' : 'wood');
            for (let i = 0; i < (c.boss ? 10 : 2); i++) splinter(Math.cos(wall.a) * RING, Math.sin(wall.a) * RING);
            if (wall.hp <= 0) { wall.hp = 0; SFX.play('crack'); addFx('ring', Math.cos(wall.a) * RING, Math.sin(wall.a) * RING, '#ffcf8a'); for (let i = 0; i < 14; i++) splinter(Math.cos(wall.a) * RING, Math.sin(wall.a) * RING); toast('รั้วพัง! พาเป็ดหัวหน้าไปยืนวงกลม 🔧 เพื่อซ่อม'); }
          } else {
            D.houseHp -= c.boss ? 4 : 1; D.shake = Math.max(D.shake, 0.15); SFX.play('hit');
            D.floats.push({ x: c.x, y: c.y, t: 0, text: c.boss ? '-4❤️' : '-1❤️', color: '#ff7a6a' });
            if (D.houseHp <= 0) endWave(false);
          }
        }
        if (c.atk >= period) c.atk = 0;
      }
    }
    // ducks on platforms shoot
    for (const p of T.plats) {
      const o = shooter(p.slot), W0 = WEAPON[p.w], pos = platPos(p.slot);
      o.cd -= dt; o.shootT = Math.max(0, o.shootT - dt);
      const tier = tierOf(p.lvl);
      if (tier >= 3 && o.arrive <= 0 && (o.rain = (o.rain || 0) - dt) <= 0) {
        const rt = nearestCat(pos.x, pos.y, W0.range + 2);
        if (rt) {
          o.rain = 6; SFX.play('shoot');
          for (let i = 0; i < 9; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * 1.3, tx = rt.x + Math.cos(a) * r, ty = rt.y + Math.sin(a) * r;
            D.shots.push({ x: tx, y: ty, sx: tx, sy: ty, tx, ty, w: 'bow', dmg: wDmg(p) * 0.9, t: -i * 0.06, dur: 0.5, rain: true, tier }); }
        }
      }
      if (o.cd > 0 || o.arrive > 0) continue;
      const t = nearestCat(pos.x, pos.y, W0.range);
      if (!t) continue;
      o.cd = 1 / (W0.rate * (1 + tier * 0.15)); o.aimDx = t.x - pos.x; o.aimDy = t.y - pos.y; o.shootT = 0.3;
      const pk = perkLv(p);
      const n = p.w === 'triple' ? [3, 5, 7][pk] : p.w === 'bow' && pk >= 1 ? 2 : (W0.multi || 1);
      for (let k = 0; k < n; k++) {
        const spread = n > 1 ? (k - (n - 1) / 2) * (p.w === 'bow' ? 0.08 : 0.22) : 0;
        const ang = Math.atan2(t.y - pos.y, t.x - pos.x) + spread, dist = Math.hypot(t.x - pos.x, t.y - pos.y);
        D.shots.push({ x: pos.x, y: pos.y, sx: pos.x, sy: pos.y, tx: pos.x + Math.cos(ang) * dist, ty: pos.y + Math.sin(ang) * dist,
          target: n > 1 && p.w !== 'bow' ? null : t, w: p.w, dmg: wDmg(p), t: 0, dur: dist / W0.speed, high: true, pk, tier, h0: o.topH || PLAT_H });
      }
      SFX.play(p.w === 'cannon' ? 'cannon' : p.w === 'xbow' ? 'xbow' : p.w === 'fire' ? 'fire' : p.w === 'storm' ? 'zap' : p.w === 'ice' ? 'ice' : 'shoot');
      if (p.w === 'cannon') { D.shake = Math.max(D.shake, 0.06); o.flash = 0.15; }
    }
  }
  // projectiles + bombs
  for (const s of D.shots) {
    s.t += dt;
    if (s.rain) {
      if (s.t >= s.dur) { s.done = true; for (const c of D.cats) if (c.hp > 0 && Math.hypot(c.x - s.tx, c.y - s.ty) < 0.6) hurtCat(c, s.dmg); addFx('spark', s.tx, s.ty, '#ffe680'); }
      continue;
    }
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
    impact(s);
  }
  D.shots = D.shots.filter(s => !s.done);
  D.cats = D.cats.filter(c => c.hp > 0 || (c.deadT = (c.deadT || 0) + dt) < (c.boss ? 2.2 : 0.6));
  for (const p of D.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.h += p.vh * dt; p.vh -= 14 * dt; p.t += dt; if (p.h < 0) { p.h = 0; p.vh *= -0.3; p.vx *= 0.6; p.vy *= 0.6; } }
  D.parts = D.parts.filter(p => p.t < p.life);
  for (const b of D.bolts) b.t += dt;
  D.bolts = D.bolts.filter(b => b.t < 0.25);
  for (const c of D.coins) c.t += dt;
  const arrived = D.coins.filter(c => c.t >= c.dur);
  if (arrived.length) { SFX.play('coin'); D.hudPulse = 0.25; }
  D.coins = D.coins.filter(c => c.t < c.dur);
  D.hudPulse = Math.max(0, D.hudPulse - dt);
  for (const p of T.plats) { const o = shooter(p.slot); if (o.flash > 0) o.flash -= dt; }
  for (const f of D.fx) f.t += dt;
  D.fx = D.fx.filter(f => f.t < 0.5);
  D.fx.forEach(f => { if ((f.type === 'dust' || f.type === 'shock') && f.t > 0.45) f.t = 0.5; });
  for (const f of D.floats) f.t += dt;
  D.floats = D.floats.filter(f => f.t < 1.1);
  for (const w of D.walls) w.hit = Math.max(0, w.hit - dt);
  D.shake = Math.max(0, D.shake - dt);
  if (D.phase === 'wave' && !D.queue.length && !D.cats.some(c => c.hp > 0)) endWave(true);
  if ((tdTick += dt) > 0.5) { tdTick = 0; renderTdHud(); }
}
let tdTick = 0;
function hurtCat(c, dmg, src) {
  if (c.hp <= 0) return;
  if (c.kind === 'tank' && src !== 'burn') dmg *= 0.7;
  c.hp -= dmg; c.hitT = 0.12;
  D.floats.push({ x: c.x, y: c.y, t: 0, text: '-' + (Math.round(dmg * 10) / 10), color: '#fff', small: true });
  addFx('spark', c.x, c.y, '#fff3b0'); SFX.play('hit');
  if (c.hp > 0 && Math.random() < 0.25) SFX.play('catHurt');
  if (c.hp <= 0) {
    D.killed++; c.deadT = 0;
    if (c.boss) {
      SFX.play('bossDie'); D.shake = 0.6;
      addFx('ring', c.x, c.y, '#ffd84a'); addFx('boom', c.x, c.y, '#ffd84a');
      for (let i = 0; i < 40; i++) confetti(c.x, c.y);
    } else {
      SFX.play('catDie'); SFX.play('poof');
      addFx('poof', c.x, c.y, '#ffffff');
      for (let i = 0; i < 3; i++) D.parts.push({ x: c.x, y: c.y, h: 1.0, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 1.2, vh: 3 + Math.random() * 2, t: 0, life: 0.7, kind: 'star' });
    }
    const co = c.boss ? 150 : c.kind === 'tank' ? 6 + Math.floor(T.wave / 2) : (Math.random() < 0.7 ? 2 + Math.floor(T.wave / 2) : 0);
    if (co) dropCoins(c.x, c.y, co);
    // the cat's pot helmet goes flying
    if (!c.boss) D.parts.push({ x: c.x, y: c.y, h: 1.0, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 2, vh: 5 + Math.random() * 2, t: 0, life: 0.9, kind: 'item', img: c.kind === 'tank' ? 'it_steamer' : c.kind === 'ninja' ? 'it_ladle' : 'it_pot', r: 0 });
  }
}
function nearestCat(x, y, r) {
  let best = null, bd = r;
  for (const c of D.cats) { if (c.hp <= 0) continue; const d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; best = c; } }
  return best;
}
function addFx(type, x, y, color, size) { D.fx.push({ type, x, y, t: 0, color, size: size || 1 }); }
function impact(s) {
  const W0 = WEAPON[s.w], pk = s.pk || 0, big = 1 + (s.tier || 0) * 0.25;
  const near = r => D.cats.filter(c => c.hp > 0 && Math.hypot(c.x - s.x, c.y - s.y) < r);
  const direct = () => s.target && s.target.hp > 0 ? s.target : D.cats.find(c => c.hp > 0 && Math.hypot(c.x - s.x, c.y - s.y) < 0.55);
  if (s.w === 'cannon') {
    const r = pk >= 2 ? 2.6 : W0.splash;
    for (const c of near(r)) { hurtCat(c, s.dmg); if (pk >= 1 && !c.boss) c.stun = Math.max(c.stun, pk >= 2 ? 1.4 : 0.8); }
    addFx('boom', s.x, s.y, s.tier >= 3 ? '#ffe680' : '#ffb347', big * (pk >= 2 ? 1.35 : 1));
    if (s.tier >= 2) addFx('shock', s.x, s.y, '#ffd59a', 0.6);
    SFX.play('break'); D.shake = 0.25;
  } else if (s.w === 'fire') {
    const r = pk >= 2 ? 1.7 : W0.splash;
    for (const c of near(r)) { hurtCat(c, s.dmg); if (pk >= 1) { c.burn = 2.5; c.burnDps = s.dmg * 0.5; } }
    addFx('fire', s.x, s.y, s.tier >= 3 ? '#ffd84a' : '#ff7a2a', big * (pk >= 2 ? 1.5 : 1));
  } else if (s.w === 'ice') {
    const hits = pk >= 1 ? near(1.2) : [direct()].filter(Boolean);
    for (const c of hits) { hurtCat(c, s.dmg); c.slow = Math.max(c.slow, 2.2); if (pk >= 2 && !c.boss) { c.freeze = true; c.slow = Math.max(c.slow, 1.2); } }
    addFx('frost', s.x, s.y, '#bff4ff', big * (pk >= 1 ? 1.4 : 0.8));
  } else if (s.w === 'storm') {
    let c = direct(); const hitSet = new Set(); let from = { x: s.x, y: s.y };
    const jumps = [2, 4, 6][pk];
    for (let j = 0; c && j <= jumps; j++) {
      hitSet.add(c); hurtCat(c, s.dmg * (j ? 0.7 : 1));
      D.bolts.push({ x1: from.x, y1: from.y, x2: c.x, y2: c.y, t: 0, tier: s.tier || 0 });
      from = c;
      c = D.cats.filter(o => o.hp > 0 && !hitSet.has(o) && Math.hypot(o.x - from.x, o.y - from.y) < 2.6).sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
    }
  } else {
    const c = direct();
    if (c) {
      let dmg = s.dmg;
      const critP = s.w === 'bow' && pk >= 2 ? 0.25 : s.w === 'xbow' && pk >= 2 ? 0.3 : 0;
      if (critP && Math.random() < critP) { dmg *= s.w === 'xbow' ? 2.5 : 2; D.floats.push({ x: c.x, y: c.y - 0.5, t: 0, text: 'CRIT!', color: '#ffd84a' }); addFx('ring', c.x, c.y, '#ffd84a'); }
      hurtCat(c, dmg);
      if (s.w === 'xbow' && pk >= 1 && !c.boss && c.kind !== 'tank') { const d = Math.hypot(c.x, c.y) || 1; c.x += c.x / d * 0.45; c.y += c.y / d * 0.45; if (c.st === 'wall') c.st = 'walk'; }
      if ((s.tier || 0) >= 1) addFx('spark', c.x, c.y, TIER_GLOW[s.tier], big);
    }
  }
}
const BOSS_PERIOD = 1.5;
function splinter(x, y) {
  D.parts.push({ x, y, h: 0.6, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 3, vh: 2 + Math.random() * 4, t: 0, life: 0.9, kind: 'wood', r: Math.random() * 6 });
}
function confetti(x, y) {
  D.parts.push({ x, y, h: 1.5, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 4, vh: 4 + Math.random() * 5, t: 0, life: 1.4, kind: 'confetti', col: ['#ffd84a', '#ff6a5a', '#5ab0ff', '#7dff8a', '#ffffff'][Math.floor(Math.random() * 5)], r: Math.random() * 6 });
}
function bossSlam(c) {
  const ix = c.x * 0.8, iy = c.y * 0.8;
  SFX.play('slam'); D.shake = 0.55;
  addFx('shock', ix, iy, '#ffe2a8'); addFx('shock2', ix, iy, '#ffffff'); addFx('dust', ix, iy, '#d9c49a');
  for (let i = 0; i < 16; i++) D.parts.push({ x: ix, y: iy, h: 0.1, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 4, vh: 3 + Math.random() * 4, t: 0, life: 0.9, kind: 'rock', r: Math.random() * 6 });
}
function flyCoin(x, y, delay) {
  const p = dproj(x, y);
  const el = $('tdCoins').getBoundingClientRect();
  D.coins.push({ sx: p.x + (Math.random() - 0.5) * 20, sy: p.y - dk * 0.8, tx: el.left + 4, ty: el.top + el.height / 2, t: -delay, dur: 0.75 + Math.random() * 0.2, wob: (Math.random() - 0.5) * 120 });
}
function endWave(won) {
  if (D.phase !== 'wave') return;
  if (!won) {
    // keep the fight frozen so a rewarded ad can revive it
    D.phase = 'lost'; D.shots = [];
    collectAll(); persist();
    SFX.play('lose');
    showWaveResult(false, 0);
    return;
  }
  D.phase = 'build';
  D.cats = []; D.shots = []; D.queue = [];
  collectAll();
  if (won) {
    for (let i = 0; i < 50; i++) confetti((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
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
  const earned = D.earned;
  $('rTitle').textContent = won ? `ผ่านคลื่นที่ ${T.wave}! 🛡️` : 'บ้านพัง! 😿';
  $('rTitle').style.color = won ? '#ffd84a' : '#ff7a7a';
  $('rInfo').textContent = won ? `ล้มแมว ${D.killed} ตัว • โบนัส 🪙${bonus}` : `ล้มแมวได้ ${D.killed} ตัว • ยังเหลือแมวอีก ${D.cats.filter(c => c.hp > 0).length + D.queue.length} ตัว`;
  $('rCoins').textContent = earned;
  const ab = $('adBtn'), nx = $('next');
  ab.classList.remove('hidden');
  if (won) {
    ab.innerHTML = `🎬 ดูโฆษณา รับ x3<small>+🪙${earned * 2} เพิ่ม</small>`;
    ab.onclick = () => Ads.show(ok => {
      if (!ok) return;
      save.coins += earned * 2; persist(); SFX.play('reward');
      $('rCoins').textContent = earned * 3; ab.classList.add('hidden');
      toast(`ได้เหรียญ x3! +🪙${earned * 2}`); renderTdHud();
    });
    nx.textContent = `▶ ไปคลื่นที่ ${T.wave + 1}`;
    nx.onclick = () => { hide('result'); enterTD(); };
  } else {
    ab.classList.toggle('hidden', D.revived);
    ab.innerHTML = '🎬 ดูโฆษณา สู้ต่อ!<small>ซ่อมบ้านกับรั้วเต็ม แล้วสู้คลื่นนี้ต่อ</small>';
    ab.onclick = () => Ads.show(ok => { if (ok) revive(); });
    nx.textContent = '🔁 เริ่มคลื่นนี้ใหม่';
    nx.onclick = () => { hide('result'); resetWave(); enterTD(); };
  }
  hide('tdUi'); show('result'); state = 'tdresult';
}
function revive() {
  SFX.play('reward');
  D.revived = true; D.phase = 'wave';
  D.houseHp = D.houseMax = houseMax();
  for (const w of D.walls) w.hp = w.max = wallMax();
  // knock every cat back out past the fence
  for (const c of D.cats) {
    if (c.hp <= 0) continue;
    const d = Math.hypot(c.x, c.y) || 1, r = RING + 2.2;
    c.x = c.x / d * r; c.y = c.y / d * r; c.st = 'walk'; c.atk = 0;
  }
  addFx('shock', 0, 0, '#bfe6ff'); addFx('shock2', 0, 0, '#ffffff'); D.shake = 0.3;
  hide('result'); show('tdUi'); state = 'td';
  toast('สู้ต่อ! บ้านและรั้วซ่อมเต็มแล้ว');
}
function resetWave() {
  D.phase = 'build'; D.cats = []; D.shots = []; D.queue = [];
  D.houseHp = D.houseMax = houseMax();
  for (const w of D.walls) w.hp = w.max = wallMax();
  persist(); renderTdHud();
}

// ---------- input ----------
// drag anywhere = move the leader duck (virtual joystick); a quick tap keeps the old tap actions
cv.addEventListener('pointerdown', e => {
  if (state !== 'td' || !D) return;
  SFX.init();
  D.joy = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), moved: false };
});
cv.addEventListener('pointermove', e => {
  if (!D || !D.joy || D.joy.id !== e.pointerId) return;
  D.joy.x = e.clientX; D.joy.y = e.clientY;
  if (Math.hypot(D.joy.x - D.joy.sx, D.joy.y - D.joy.sy) > 12) D.joy.moved = true;
});
function joyEnd(e) {
  if (!D || !D.joy || D.joy.id !== e.pointerId) return;
  const j = D.joy; D.joy = null;
  if (!j.moved && performance.now() - j.t0 < 350 && state === 'td') tapField(j.sx, j.sy);
}
cv.addEventListener('pointerup', joyEnd);
cv.addEventListener('pointercancel', joyEnd);
function tapField(cx, cy) {
  const p = dinv(cx, cy);
  // platforms (drawn raised, so test a little above the ground point too)
  for (let s = 0; s < SLOTS; s++) {
    const q = platPos(s);
    if (Math.hypot(p.x - q.x, p.y - q.y) < 0.75 || Math.hypot(p.x - q.x, p.y + 1.2 - q.y) < 0.75) { SFX.play('click'); openSlot(s); return; }
  }
  if (Math.hypot(p.x, p.y + 0.6) < HOUSE_R + 0.3) { SFX.play('click'); openHouse(); return; }
  closeSheet();
  if (D.phase !== 'wave' || D.bombCd > 0) return;
  D.bombCd = 7;
  D.shots.push({ x: 0, y: 0, sx: 0, sy: -0.8, tx: p.x, ty: p.y, w: 'bomb', dmg: bombDmg(), t: 0, dur: 0.45, bomb: true });
}

// ---------- leader duck, coin drops and buy pads ----------
function padList() {
  const L = [];
  for (let s = 0; s < SLOTS; s++) {
    const a = s / SLOTS * Math.PI * 2 + Math.PI / SLOTS, pl = platAt(s), r = !pl ? PLAT_R : 3.5;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (!pl) L.push({ id: 'b' + s, x, y, icon: '🪵', label: 'สร้างแท่น', cost: buildCost(), apply: () => {
      T.plats.push({ slot: s, w: 'bow', lvl: 1 }); shooter(s).arrive = 1; SFX.play('quack'); toast('เป็ดขึ้นแท่นแล้ว! 🦆');
    } });
    else if (pl.lvl < 10) L.push({ id: 'u' + s, x, y, icon: WEAPON[pl.w].icon, label: `Lv.${pl.lvl + 1}`, cost: lvlCost(pl), apply: () => {
      const before = tierOf(pl.lvl); pl.lvl++; const after = tierOf(pl.lvl);
      if (after > before) { toast(`แท่นใหม่: ${PLAT_NAME[after]}! ${PLAT_SKILL[after]}`); const q = platPos(s); for (let i = 0; i < 30; i++) confetti(q.x, q.y); addFx('ring', q.x, q.y, '#ffd84a'); SFX.play('win'); }
    } });
  }
  L.push({ id: 'house', x: 0, y: 2.35, icon: '🏠', label: `บ้าน Lv.${T.house + 1}`, cost: 80 * T.house, apply: () => { T.house++; D.houseHp = D.houseMax = houseMax(); } });
  for (const w of D.walls) if (w.hp < w.max) {
    const cost = Math.max(5, Math.round((20 + T.fence * 6) * (1 - w.hp / w.max)));
    L.push({ id: 'w' + Math.round(w.a * 100), x: Math.cos(w.a) * (RING - 0.75), y: Math.sin(w.a) * (RING - 0.75), icon: '🔧', label: 'ซ่อมรั้ว', cost, small: true, apply: () => { w.hp = w.max; SFX.play('plus'); } });
  }
  return L;
}
function dropCoins(x, y, total) {
  const n = Math.min(12, Math.max(1, Math.round(total / 3))), v = total / n;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 1.4;
    D.drops.push({ x, y, h: 0.8, vh: 3 + Math.random() * 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, v, t: 0, pull: false });
  }
}
function collectAll() {
  let sum = 0;
  for (const d of D.drops) { sum += d.v; if (Math.random() < 0.4) flyCoin(d.x, d.y, Math.random() * 0.3); }
  D.drops = [];
  if (sum > 0) { sum = Math.round(sum); save.coins += sum; D.earned += sum; }
}
function leadUpdate(dt) {
  const L = D.lead;
  L.atkCd -= dt; L.swingT = Math.max(0, L.swingT - dt); L.hurtT = Math.max(0, L.hurtT - dt); L.happyT = Math.max(0, L.happyT - dt);
  L.moving = false;
  if (D.joy && D.joy.moved && L.hurtT < 0.6) {
    let dx = D.joy.x - D.joy.sx, dy = (D.joy.y - D.joy.sy) / 0.62;
    const len = Math.hypot(dx, dy);
    if (len > 4) {
      const sp = leadSpeed() * Math.min(1, len / 45);
      L.x += dx / len * sp * dt; L.y += dy / len * sp * dt;
      L.moving = true; L.walkT += dt * (4 + sp * 1.5);
      if (Math.abs(dx) > 3) L.face = dx > 0 ? 1 : -1;
    }
  }
  // stay in the yard, and walk around the house rather than through it
  let d = Math.hypot(L.x, L.y);
  if (d > LEAD_R) { L.x *= LEAD_R / d; L.y *= LEAD_R / d; }
  d = Math.hypot(L.x, L.y);
  if (d < HOUSE_R + 0.35) { const k = (HOUSE_R + 0.35) / (d || 1); L.x = (L.x || 0.01) * k; L.y = (L.y || 0.01) * k; }
  // bonk nearby cats with the ladle
  if (D.phase === 'wave' && L.atkCd <= 0) {
    const t = nearestCat(L.x, L.y, 1.05);
    if (t) {
      L.atkCd = 0.55; L.swingT = 0.3; L.face = t.x > L.x ? 1 : -1;
      hurtCat(t, leadDmg(), 'lead'); SFX.play('wood');
      if (!t.boss && t.kind !== 'tank' && t.hp > 0) { const k = Math.hypot(t.x - L.x, t.y - L.y) || 1; t.x += (t.x - L.x) / k * 0.25; t.y += (t.y - L.y) / k * 0.25; }
    }
  }
  // cats bump the leader back toward the house
  if (D.phase === 'wave' && L.hurtT <= 0) for (const c of D.cats) {
    if (c.hp <= 0 || Math.hypot(c.x - L.x, c.y - L.y) > (c.boss ? 1.1 : 0.5)) continue;
    L.hurtT = 1.0; SFX.play('quack');
    const k = Math.hypot(L.x, L.y) || 1; L.x -= L.x / k * 0.9; L.y -= L.y / k * 0.9;
    D.floats.push({ x: L.x, y: L.y, t: 0, text: 'โอ๊ย!', color: '#ffb0a0' });
    break;
  }
  // coins: fall, bounce, then fly to the leader when close
  const mag = leadMag();
  let got = 0;
  for (const c of D.drops) {
    c.t += dt;
    if (c.h > 0 || c.vh > 0) { c.x += c.vx * dt; c.y += c.vy * dt; c.h += c.vh * dt; c.vh -= 14 * dt; if (c.h <= 0) { c.h = 0; c.vh = Math.abs(c.vh) > 1.5 ? -c.vh * 0.35 : 0; c.vx *= 0.4; c.vy *= 0.4; } }
    const dl = Math.hypot(L.x - c.x, L.y - c.y);
    if (c.t > 0.35 && dl < mag) c.pull = true;
    if (c.pull) { const sp = 9 * dt; if (dl < sp + 0.15) { c.got = true; got += c.v; } else { c.x += (L.x - c.x) / dl * sp; c.y += (L.y - c.y) / dl * sp; } }
  }
  if (got) {
    got = Math.round(got); save.coins += got; D.earned += got; D.hudPulse = 0.2;
    D.drops = D.drops.filter(c => !c.got);
    if ((D.coinSfx = (D.coinSfx || 0) - 1) <= 0) { SFX.play('coin'); D.coinSfx = 2; }
    D.floats.push({ x: L.x, y: L.y - 0.3, t: 0, text: '+' + got, color: '#ffd84a', small: true });
  }
  // stand on a pad to pour coins into it
  const prev = D.pad ? D.pad.id : null;
  D.pad = null;
  D.padT -= dt;
  for (const pd of padList()) {
    if (Math.hypot(L.x - pd.x, L.y - pd.y) > 0.55) continue;
    D.pad = pd;
    if (pd.id !== prev) { D.padWait = 0.3; D.padDone = false; }
    if ((D.padWait -= dt) > 0 || D.padDone || D.padT > 0) break;
    D.padT = 0.06;
    const paid = T.pads[pd.id] || 0, need = pd.cost - paid;
    if (need <= 0 || save.coins < 1) break;
    const chunk = Math.min(need, Math.floor(save.coins), Math.max(1, Math.ceil(pd.cost / 18)));
    save.coins -= chunk; T.pads[pd.id] = paid + chunk;
    D.flow = { x: pd.x, y: pd.y, t: 0.15 };
    if (Math.random() < 0.5) SFX.play('click');
    if (T.pads[pd.id] >= pd.cost) {
      T.pads[pd.id] = 0; pd.apply(); L.happyT = 0.8; SFX.play('gateGood'); D.padDone = true;
      addFx('ring', pd.x, pd.y, '#ffd84a'); persist(); renderTdHud();
    }
    break;
  }
  if (D.flow) { D.flow.t -= dt; if (D.flow.t <= 0) D.flow = null; }
}

// ---------- sheets ----------
let sheetFor = null;
function closeSheet() { sheetFor = null; $('sheet').classList.add('hidden'); }
function refreshSheet() { if (!sheetFor) return; if (sheetFor === 'house') openHouse(); else openSlot(sheetFor.slot); }
function openSlot(s) {
  sheetFor = { slot: s };
  const body = $('sheetBody'); body.innerHTML = '';
  const p = platAt(s);
  if (!p) {
    $('sheetTitle').textContent = '🪵 สร้างแท่นยิง';
    const info = document.createElement('div'); info.className = 'sinfo';
    info.innerHTML = `ลากนิ้วพาเป็ดหัวหน้า 🦆 ไปยืนบน<b>วงกลม 🪵</b> ข้างจุดนี้ เหรียญจะไหลเข้าไปจนครบ 🪙${buildCost()} แล้วแท่นจะสร้างเอง`;
    body.appendChild(info);
  } else {
    const W0 = WEAPON[p.w];
    $('sheetTitle').textContent = `${W0.icon} ${PLAT_NAME[tierOf(p.lvl)]} • ${W0.name} Lv.${p.lvl}`;
    const info = document.createElement('div'); info.className = 'sinfo';
    info.innerHTML = `🪙 <b>${Math.floor(save.coins).toLocaleString()}</b> • ดาเมจ ${wDmg(p).toFixed(1)} • ยิง ${W0.rate}/วิ • ระยะ ${W0.range}${W0.splash ? ' • ระเบิด' : ''}${W0.multi ? ' • 3 ดอก' : ''}`;
    body.appendChild(info);
    const pk = PERKS[p.w], perk = document.createElement('div'); perk.className = 'sinfo';
    perk.innerHTML = `⭐ Lv.5: ${pk[0]} ${p.lvl >= 5 ? '✅' : '🔒'}<br>🌟 Lv.10: ${pk[1]} ${p.lvl >= 10 ? '✅' : '🔒'}<br><small>เลเวล 4, 7, 10 เอฟเฟกต์ยิงจะสวยขึ้น</small>`;
    body.appendChild(perk);
    const up = document.createElement('div'); up.className = 'sinfo';
    up.innerHTML = p.lvl < 10 ? `⬆️ อัปเกรด: พาเป็ดหัวหน้าไปยืนบนวงกลม ${W0.icon} ข้างแท่น (🪙${lvlCost(p)})<br>🏗️ แท่นเปลี่ยนร่างที่ Lv.4, 7, 10: ${PLAT_NAME.slice(1).join(' → ')}${tierOf(p.lvl) ? `<br>✨ ตอนนี้: ${PLAT_SKILL[tierOf(p.lvl)]}` : ''}` : '⭐ เลเวลเต็มแล้ว! ' + PLAT_SKILL[3];
    body.appendChild(up);
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
  const fc = 50 * T.fence, bc = 60 * T.bomb;
  const lh = document.createElement('div'); lh.className = 'sinfo'; lh.innerHTML = '🦆 <b>เป็ดหัวหน้า</b> (ลากนิ้วบนจอเพื่อเดิน เก็บเหรียญ และฟาดแมวด้วยทัพพี)'; body.appendChild(lh);
  const la = 70 * T.lead.atk, ls = 60 * T.lead.spd, lm = 50 * T.lead.mag;
  body.appendChild(btn(`🥄 ทัพพี Lv.${T.lead.atk}${T.lead.atk >= 5 ? ' → กระทะ' : ''}`, `ฟาดแรง ${leadDmg().toFixed(1)} • 🪙${la}`, save.coins >= la, () => { save.coins -= la; T.lead.atk++; if (T.lead.atk === 5) toast('ได้กระทะ! ฟาดแรงขึ้น 🍳'); }));
  body.appendChild(btn(`👟 วิ่งไว Lv.${T.lead.spd}`, `ความเร็ว ${leadSpeed().toFixed(1)} • 🪙${ls}`, save.coins >= ls, () => { save.coins -= ls; T.lead.spd++; }));
  body.appendChild(btn(`🧲 ดูดเหรียญ Lv.${T.lead.mag}`, `ระยะ ${leadMag().toFixed(1)} • 🪙${lm}`, save.coins >= lm, () => { save.coins -= lm; T.lead.mag++; }));
  const hh = document.createElement('div'); hh.className = 'sinfo'; hh.style.marginTop = '10px'; hh.textContent = `🏠 เสริมบ้าน (ทน ${houseMax()}): ไปยืนบนวงกลม 🏠 หน้าบ้าน`; body.appendChild(hh);
  body.appendChild(btn(`🪵 เสริมรั้ว Lv.${T.fence}`, `ทน ${wallMax()}${T.fence < 6 ? ` • Lv.${T.fence < 3 ? 3 : 6} เปลี่ยนรั้ว` : ""} • 🪙${fc}`, save.coins >= fc, () => { save.coins -= fc; T.fence++; for (const w of D.walls) { w.max = wallMax(); w.hp = Math.max(w.hp, Math.min(w.max, w.hp + 18)); } }));
  body.appendChild(btn(`🌶️ ระเบิดพริก Lv.${T.bomb}`, `แรง ${bombDmg()} • 🪙${bc}`, save.coins >= bc, () => { save.coins -= bc; T.bomb++; }));
  const rp = document.createElement('button'); rp.className = 'sbtn'; rp.style.background = '#6d8fc9'; rp.style.boxShadow = '0 4px 0 #3f62a3';
  rp.innerHTML = '<b>🎬 ดูเรื่องราวตอนต้นอีกครั้ง</b>'; rp.onclick = () => { closeSheet(); playIntro(); }; body.appendChild(rp);
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
function fitField() { if (W > 0 && H > 0) dk = Math.min(W / 8.5, H / 13); }
function tdDraw() {
  if (!D) return;
  fitField();
  ctx.save();
  if (D.shake > 0) ctx.translate((Math.random() - 0.5) * 30 * D.shake, (Math.random() - 0.5) * 30 * D.shake);
  if (ready(IMG.grass)) {
    if (!tdDraw.pat) { tdDraw.pat = ctx.createPattern(IMG.grass, 'repeat'); }
    try { tdDraw.pat.setTransform(new DOMMatrix().translate(-camX * dk, -camY * dk * 0.62).scale(Math.max(0.6, dk / 40))); } catch (e) {}
    ctx.fillStyle = tdDraw.pat; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.fillStyle = 'rgba(70,120,40,.28)'; ctx.fillRect(-20, -20, W + 40, H + 40);
    const v = ctx.createRadialGradient(W / 2, H * 0.47, Math.min(W, H) * 0.35, W / 2, H * 0.47, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,30,0,0)'); v.addColorStop(1, 'rgba(0,30,0,.35)');
    ctx.fillStyle = v; ctx.fillRect(-20, -20, W + 40, H + 40);
  } else {
    const g = ctx.createRadialGradient(W / 2, H * 0.47, 10, W / 2, H * 0.47, Math.max(W, H) * 0.7);
    g.addColorStop(0, '#8ccf5a'); g.addColorStop(0.55, '#5fa73c'); g.addColorStop(1, '#2f6a22');
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
  }
  // little flowers / grass tufts for a cartoon look
  // scattered flowers and grass tufts (stable pseudo-random positions)
  for (let i = 0; i < (ready(IMG.grass) ? 0 : 46); i++) {
    const rx = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1, ry = Math.abs(Math.sin(i * 78.233) * 12345.678) % 1;
    const x = rx * W, y = ry * H;
    if (i % 3 === 0) { ctx.fillStyle = ['#fff6a8', '#ffffff', '#ffb3c7'][i % 9 / 3 | 0]; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.57) * 3, y + Math.sin(k * 1.57) * 2, 2.2, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#ffb000'; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.strokeStyle = 'rgba(40,110,30,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 6, y - 7); ctx.moveTo(x, y); ctx.lineTo(x, y - 9); ctx.moveTo(x + 4, y); ctx.lineTo(x + 6, y - 7); ctx.stroke(); }
  }
  const c0 = dproj(0, 0);
  const yard = ctx.createRadialGradient(c0.x, c0.y, 0, c0.x, c0.y, (RING + 0.9) * dk);
  yard.addColorStop(0, 'rgba(240,215,160,.95)'); yard.addColorStop(0.8, 'rgba(225,195,135,.9)'); yard.addColorStop(1, 'rgba(225,195,135,0)');
  ctx.save(); ctx.translate(c0.x, c0.y); ctx.scale(1, 0.62); ctx.translate(-c0.x, -c0.y);
  ctx.fillStyle = yard; ctx.beginPath(); ctx.arc(c0.x, c0.y, (RING + 0.9) * dk, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(150,205,95,.55)'; ctx.beginPath(); ctx.arc(c0.x, c0.y, (RING - 0.6) * dk, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // range hint for the selected platform
  if (sheetFor && sheetFor.slot !== undefined && platAt(sheetFor.slot)) {
    const p = platAt(sheetFor.slot), q = platPos(p.slot), s = dproj(q.x, q.y), r = WEAPON[p.w].range;
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(s.x, s.y, r * dk, r * dk * 0.62, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  drawPads();
  const list = [[0, drawHouse]];
  for (const c of D.drops) list.push([c.y, () => drawDrop(c)]);
  list.push([D.lead.y, drawLeader]);
  for (const w of D.walls) list.push([Math.sin(w.a) * RING, () => drawFence(w)]);
  for (let s = 0; s < SLOTS; s++) { const q = platPos(s); list.push([q.y, () => drawPlatform(s)]); }
  for (const c of D.cats) list.push([c.y, () => drawCat(c)]);
  list.sort((a, b) => a[0] - b[0]);
  for (const it of list) it[1]();
  drawPads(true);
  for (const s of D.shots) drawShot(s);
  for (const f of D.fx) drawFx(f);
  for (const b of D.bolts) {
    const a = dproj(b.x1, b.y1), c = dproj(b.x2, b.y2), y1 = a.y - dk * 0.6, y2 = c.y - dk * 0.6;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - b.t / 0.25;
    for (const [col, w] of [[b.tier >= 2 ? '#ffe680' : '#9b7bff', 6 + b.tier * 2], ['#ffffff', 2]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(a.x, y1);
      for (let i = 1; i < 6; i++) { const k = i / 6; ctx.lineTo(a.x + (c.x - a.x) * k + (Math.random() - 0.5) * 14, y1 + (y2 - y1) * k + (Math.random() - 0.5) * 14); }
      ctx.lineTo(c.x, y2); ctx.stroke();
    }
    ctx.restore();
  }
  for (const p of D.parts) {
    const q = dproj(p.x, p.y), y = q.y - p.h * dk, a = Math.min(1, (p.life - p.t) * 3);
    ctx.globalAlpha = Math.max(0, a);
    if (p.kind === 'star') { ctx.font = `${Math.round(dk * 0.4)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('⭐', q.x, y); }
    else if (p.kind === 'item') drawItem(p.img, q.x, y, dk * 0.55, p.t * 12);
    else {
      ctx.save(); ctx.translate(q.x, y); ctx.rotate(p.r + p.t * 8);
      ctx.fillStyle = p.kind === 'wood' ? '#d9b98a' : p.kind === 'rock' ? '#a99878' : p.col;
      const w = p.kind === 'confetti' ? 7 : 6, h = p.kind === 'confetti' ? 4 : p.kind === 'wood' ? 3 : 5;
      ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
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
  // coins flying into the purse
  for (const c of D.coins) {
    if (c.t < 0) continue;
    const k = Math.min(1, c.t / c.dur), e = k * k;
    const x = c.sx + (c.tx - c.sx) * e + Math.sin(k * Math.PI) * c.wob;
    const y = c.sy + (c.ty - c.sy) * e - Math.sin(k * Math.PI) * 80;
    ctx.font = `${Math.round(16 + 6 * (1 - k))}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🪙', x, y); ctx.textBaseline = 'alphabetic';
  }
  const pill = $('tdCoins').parentElement;
  pill.style.transform = D.hudPulse > 0 ? `scale(${1 + D.hudPulse})` : '';
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
const PICKETS = ['fence_picket1', 'fence_picket2', 'fence_picket4', 'fence_picket2', 'fence_picket1', 'fence_picket2'];
function drawRail(pts, f, hgt, shakeX) {
  // soft pastel plank, same colours as the fence art: dark rim then light face
  for (const [col, wdt] of [['#b9a68c', 0.24], ['#efe4cf', 0.17]]) {
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, dk * wdt); ctx.lineCap = 'round';
    ctx.beginPath(); pts.forEach((q, i) => { const x = q.p.x + shakeX, y = q.p.y - hgt * f; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
  }
}
function drawFence(w) {
  const span = Math.PI / 4 * 0.98, n = 5, hgt = dk * 1.2;
  const shakeX = w.hit > 0 ? Math.sin(w.hit * 90) * 3 : 0;
  const ratio = w.hp / w.max;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = w.a - span / 2 + span * (i + 0.5) / n;
    pts.push({ a, p: dproj(Math.cos(a) * RING, Math.sin(a) * RING) });
  }
  const c = dproj(Math.cos(w.a) * RING, Math.sin(w.a) * RING);
  // grassy base patch like the art
  if (w.hp <= 0) {
  ctx.fillStyle = '#a8cf55'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 2, dk * 1.35, dk * 0.42, Math.atan2(pts[n - 1].p.y - pts[0].p.y, pts[n - 1].p.x - pts[0].p.x), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#86b83c'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 5, dk * 1.2, dk * 0.3, Math.atan2(pts[n - 1].p.y - pts[0].p.y, pts[n - 1].p.x - pts[0].p.x), 0, Math.PI); ctx.fill();
  }
  if (w.hp <= 0) {
    pts.forEach((q, i) => {
      if (i % 2 === 0 && ready(IMG.fence_stump)) drawAt(IMG.fence_stump, q.p.x, q.p.y + 2, dk * 0.42);
    });
    if (ready(IMG.fence_plank)) { ctx.save(); ctx.translate(c.x + dk * 0.2, c.y + dk * 0.1); ctx.rotate((w.a * 7) % 0.6 - 0.3); drawAt(IMG.fence_plank, 0, dk * 0.35, dk * 1.3); ctx.restore(); }
    ctx.font = '900 12px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.strokeText('🔧 พาเป็ดมาซ่อม', c.x, c.y - hgt * 0.55); ctx.fillStyle = '#ffe2a8'; ctx.fillText('🔧 พาเป็ดมาซ่อม', c.x, c.y - hgt * 0.55);
    return;
  }
  const fimg = IMG[T.fence >= 6 ? 'k_fence3' : T.fence >= 3 ? 'k_fence2' : 'k_fence1'];
  if (ready(fimg)) {
    // kitchen fence: two pieces per side (bamboo -> cutting boards -> stacked pots as the fence levels up)
    const tilt = ratio < 0.5 ? Math.sin(w.a * 5) * 0.12 * (1 - ratio * 2) : 0;
    for (const f of [0.27, 0.73]) {
      const a = w.a - span / 2 + span * f, q = dproj(Math.cos(a) * RING, Math.sin(a) * RING);
      ctx.save(); ctx.translate(q.x + shakeX, q.y + dk * 0.15); ctx.rotate(tilt);
      if ((Math.cos(a) > 0) !== (f > 0.5)) ctx.scale(-1, 1);
      drawAt(fimg, 0, 0, dk * 1.75); ctx.restore();
    }
    if (w.hp < w.max) {
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(c.x - 18, c.y - hgt * 1.3 - 6, 36, 4);
      ctx.fillStyle = ratio > 0.5 ? '#7dde5a' : '#ffb347'; ctx.fillRect(c.x - 18, c.y - hgt * 1.3 - 6, 36 * ratio, 4);
    }
    return;
  }
  if (ready(IMG.fence_seg)) {
    // straight fence section, sheared so its pickets stay upright and its base follows this side of the ring
    const S = { lx: 103, ly: 265, rx: 530, ry: 461, ph: 263 };
    const a0 = w.a - span / 2, a1 = w.a + span / 2;
    const P0 = dproj(Math.cos(a0) * RING, Math.sin(a0) * RING), P1 = dproj(Math.cos(a1) * RING, Math.sin(a1) * RING);
    const bw = S.rx - S.lx, k0 = (S.ry - S.ly) / bw, d = hgt * 1.25 / S.ph;
    // left/right sides run almost straight up the screen; keep a minimum width so the pickets don't collapse
    const rawX = (P1.x - P0.x) / bw, minX = d * 0.75;
    const ax = Math.abs(rawX) < minX ? (Math.sign(rawX) || 1) * minX * (Math.sin(w.a) >= 0 ? 1 : 1) : rawX;
    const by = (P1.y - P0.y) / bw - d * k0;
    const cx = (S.lx + S.rx) / 2, cy = (S.ly + S.ry) / 2;
    const tilt = ratio < 0.5 ? Math.sin(w.a * 5) * 0.06 * (1 - ratio * 2) : 0;
    ctx.save();
    ctx.translate(c.x + shakeX, c.y + 2);
    ctx.transform(ax, by, tilt * ax, d, 0, 0);
    ctx.drawImage(IMG.fence_seg, -cx, -cy);
    ctx.restore();
    if (w.hp < w.max) {
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(c.x - 18, c.y - hgt * 1.3 - 6, 36, 4);
      ctx.fillStyle = ratio > 0.5 ? '#7dde5a' : '#ffb347'; ctx.fillRect(c.x - 18, c.y - hgt * 1.3 - 6, 36 * ratio, 4);
    }
    return;
  }
  const lean = i => ratio < 0.5 ? ((i * 53 % 7) - 3) * 0.05 * (1 - ratio * 2) : 0;
  drawRail(pts, 0.33, hgt, shakeX);
  drawRail(pts, 0.64, hgt, shakeX);
  pts.forEach((q, i) => {
    const key = PICKETS[(i + Math.round(w.a * 4)) % PICKETS.length], img = IMG[key];
    ctx.save(); ctx.translate(q.p.x + shakeX, q.p.y); ctx.rotate(lean(i));
    if (ready(img)) drawAt(img, 0, 3, hgt * img.naturalWidth / img.naturalHeight * (1.35 + (i % 2) * 0.1));
    ctx.restore();
  });
  // a little flower now and then
  ctx.font = `${Math.round(dk * 0.28)}px system-ui`; ctx.textAlign = 'center';
  if (Math.round(w.a * 10) % 2 === 0) ctx.fillText('🌼', pts[1].p.x + 6, pts[1].p.y + 4);
  if (w.hp < w.max) {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(c.x - 18, c.y - hgt - 12, 36, 4);
    ctx.fillStyle = ratio > 0.5 ? '#7dde5a' : '#ffb347'; ctx.fillRect(c.x - 18, c.y - hgt - 12, 36 * ratio, 4);
  }
}
const PLAT_H = 1.25;  // how high the duck stands (meters, drawn upward)
const PLAT_W = 1.55, PLAT_DECK = 0.30;   // platform sprite width (m) and deck centre as a fraction of its height
function drawPlatform(s) {
  const q = platPos(s), p = dproj(q.x, q.y), pl = platAt(s), k = dk;
  if (!pl) return;
  if (!pl) {
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, k * 0.6, k * 0.36, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = `900 ${Math.round(k * 0.55)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+', p.x, p.y); ctx.textBaseline = 'alphabetic';
    return;
  }
  let top = p.y - PLAT_H * k;
  const kimg = IMG['k_plat' + (tierOf(pl.lvl) + 1)];
  if (ready(kimg)) {
    const ti = tierOf(pl.lvl), pw = k * [1.45, 1.25, 1.35, 1.35][ti];
    const ph = drawAt(kimg, p.x, p.y + k * 0.25, pw);
    top = p.y + k * 0.25 - ph * (1 - [0.12, 0.04, 0.1, 0.12][ti]);
  } else if (ready(IMG.platform)) {
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
  // glowing aura on the deck that grows with the weapon level
  const tr = tierOf(pl.lvl);
  if (tr > 0) {
    const tt = performance.now() / 1000 + s;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const ar = k * (0.55 + tr * 0.12) * (1 + Math.sin(tt * 3) * 0.06);
    const gg = ctx.createRadialGradient(p.x, top, 0, p.x, top, ar);
    gg.addColorStop(0, WCOL[pl.w]); gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.25 + tr * 0.15; ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(p.x, top, ar, ar * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    if (tr >= 2) for (let i = 0; i < 3 + tr; i++) {
      const a = tt * 1.5 + i / (3 + tr) * Math.PI * 2, py2 = top - ((tt * 0.6 + i * 0.3) % 1) * k * 1.4;
      ctx.globalAlpha = 0.8; ctx.fillStyle = tr >= 3 ? '#ffe680' : WCOL[pl.w];
      ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * k * 0.45, py2, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  // the duck archer on top (hops up from the house when the platform is new)
  const o = shooter(s), h = k * 1.1, flip = o.aimDx < 0;
  o.topH = (p.y - top) / k + 0.5;
  const hop = o.arrive > 0 ? Math.sin(o.arrive * Math.PI) * k * 0.8 : 0;
  const fk = o.shootT > 0 ? Math.min(3, Math.floor((0.3 - o.shootT) / 0.3 * 4)) : 0;
  const dy = top + k * 0.05 - hop;
  if (ready(IMG.k_duck_act)) {
    // kitchen duck: wind up, throw, then idle; holds its weapon; dresses up with the platform tier
    const tr2 = tierOf(pl.lvl), fw = h * 0.75;
    ctx.save(); ctx.translate(p.x, dy); if (flip) ctx.scale(-1, 1);
    if (o.shootT > 0) drawFrame('k_duck_act', o.shootT > 0.15 ? 0 : 1, 0, 0, h, false);
    else drawFrame('k_duck_walk', 1, 0, Math.sin(performance.now() / 300 + s) * 1.5, h, false);
    if (tr2 >= 1) drawItem('it_apron', fw * 0.08, -h * 0.33, h * 0.4);
    if (tr2 >= 2) drawItem('it_chefhat', fw * 0.02, -h * 0.98, h * (tr2 >= 3 ? 0.48 : 0.4));
    const hi = HELD[pl.w], thr = o.shootT > 0 && o.shootT <= 0.15;
    if (!thr) drawItem(hi, fw * 0.4, -h * 0.52, h * (pl.w === 'cannon' ? 0.5 : 0.48), o.shootT > 0.15 ? -1.0 : 0.4);
    ctx.restore();
  }
  else {
  const cannonFront = pl.w === 'cannon' && o.aimDy >= 0 && ready(IMG.duck_cannon_front);
  if (cannonFront) {
    // front view: the sprite fires toward bottom-left, mirror it for bottom-right targets
    drawFrame('duck_cannon_front', o.shootT > 0 ? fk : 3, p.x, dy, h * 1.1, o.aimDx > 0);
  } else if (pl.w === 'cannon' && ready(IMG.duck_cannon)) {
    drawFrame('duck_cannon', o.shootT > 0 ? fk : 3, p.x, dy, h * 1.05, flip);
    if (o.flash > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.flash / 0.15;
      const mx = p.x + (flip ? -1 : 1) * h * 0.55, my = dy - h * 0.45;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, h * 0.6);
      g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, '#ffb347'); g.addColorStop(1, 'rgba(255,100,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, my, h * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  } else if (pl.w === 'xbow' && o.aimDy < 0 && ready(IMG.duck_xbow)) drawFrame('duck_xbow', o.shootT > 0 ? fk : 0, p.x, dy, h, flip);
  else if (o.aimDy < 0 && ready(IMG.duck_shoot)) drawFrame('duck_shoot', o.shootT > 0 ? 1 + fk % 3 : 0, p.x, dy, h, flip);
  else if (ready(IMG.duck_shoot_front)) drawFrame('duck_shoot_front', o.shootT > 0 ? fk : 0, p.x, dy, h, flip);
  }
  if (pl.w === 'fire' || pl.w === 'triple' || pl.w === 'ice' || pl.w === 'storm') {
    // glowing arrow tip so fire / triple bows look different from the wooden bow
    const t = performance.now() / 1000 + s;
    const gx = p.x + (flip ? -1 : 1) * h * 0.3, gy = dy - h * 0.55, r = h * (0.18 + Math.sin(t * 12) * 0.04);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    g.addColorStop(0, pl.w === 'fire' ? '#fff0a0' : '#e0f6ff'); g.addColorStop(0.5, pl.w === 'fire' ? '#ff7a1a' : pl.w === 'storm' ? '#9b7bff' : pl.w === 'ice' ? '#7fe0ff' : '#6ad0ff'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  // weapon + level badge, coloured by level tier, with stars
  const tier = tierOf(pl.lvl);
  ctx.font = `900 ${Math.round(k * 0.32)}px system-ui,sans-serif`; ctx.textAlign = 'center';
  const badge = `${WEAPON[pl.w].icon}${pl.lvl}${'★'.repeat(tier)}`;
  const bw = ctx.measureText(badge).width + 10;
  ctx.fillStyle = tier ? TIER_COL[tier] : 'rgba(0,0,0,.55)'; roundRect(p.x - bw / 2, dy - h * 1.15, bw, k * 0.42, 6); ctx.fill();
  if (tier >= 3) { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.fillText(badge, p.x, dy - h * 1.15 + k * 0.32);
}
function catImg(c) { return c.kind === 'ninja' ? 'cat_ninja' : c.kind === 'tank' ? 'cat_tank' : 'cat'; }
function drawCat(c) {
  const p = dproj(c.x, c.y), h = dk * (c.boss ? 2.8 : c.kind === 'tank' ? 1.45 : c.kind === 'ninja' ? 1.0 : 1.1);
  if (c.kind === 'ninja' && c.hp > 0 && c.st === 'walk') {
    // speed streaks behind ninja cats
    ctx.strokeStyle = 'rgba(200,170,255,.45)'; ctx.lineWidth = 2;
    const d = Math.hypot(c.x, c.y) || 1, bx = c.x / d, by = c.y / d;
    for (let i = 0; i < 3; i++) { const q = dproj(c.x + bx * (0.3 + i * 0.15), c.y + by * (0.3 + i * 0.15)); ctx.beginPath(); ctx.moveTo(q.x - 4, q.y - h * (0.3 + i * 0.2)); ctx.lineTo(q.x + 4, q.y - h * (0.3 + i * 0.2)); ctx.stroke(); }
  }
  ctx.globalAlpha = c.hp > 0 || c.boss ? 1 : Math.max(0, 1 - (c.deadT || 0) / 0.6);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.25, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  const t = performance.now() / 1000 + c.ph, flip = c.x > 0;
  let x = p.x + (c.hitT > 0 ? Math.sin(c.hitT * 120) * 3 : 0);
  const KC = ready(IMG.k_cat_walk) && ready(IMG.k_cat_act);
  if (c.hp <= 0 && !KC) { ctx.save(); ctx.translate(x, p.y); ctx.rotate((flip ? -1 : 1) * Math.min(1.4, (c.deadT || 0) * 5)); x = 0; }
  const py = c.hp <= 0 && !KC ? 0 : p.y, atk = c.st !== 'walk' && c.hp > 0, k = c.atk / 0.9;
  if (KC) {
    if (c.hp <= 0) ctx.globalAlpha = Math.max(0, 1 - Math.max(0, (c.deadT || 0) - (c.boss ? 1.6 : 0.25)) / 0.4);
    drawKitchenCat(c, x, py, h, atk, k, t);
  } else if (c.boss && ready(IMG.boss_walk)) {
    const bh = h * 1.05;
    if (c.hp <= 0 && ready(IMG.boss_die)) {
      ctx.restore(); // undo the generic death spin for the boss
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, (c.deadT || 0) - 1.6) / 0.6);
      drawFrame('boss_die', Math.min(2, Math.floor((c.deadT || 0) / 0.35)), p.x, p.y, bh * 0.95, flip);
      ctx.globalAlpha = 1;
      return;
    }
    if (atk && ready(IMG.boss_attack)) {
      const kb = c.atk / BOSS_PERIOD;
      const fr = kb < 0.45 ? 0 : kb < 0.65 ? 1 : kb < 0.8 ? 2 : 3;
      drawFrame('boss_attack', fr, x, py, bh * 1.1, flip);
    } else {
      const back = c.y > 0.3 && ready(IMG.boss_walk_back);
      drawFrame(back ? 'boss_walk_back' : 'boss_walk', Math.floor(t * 7) % 6, x, py - Math.abs(Math.sin(t * 5.7)) * bh * 0.03, bh, back ? !flip : flip);
    }
    if (c.hitT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, py - bh * 0.5, bh * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  } else if (c.boss && ready(IMG.boss)) {
    ctx.save(); ctx.translate(x, py); ctx.rotate(atk ? Math.sin(k * Math.PI * 2) * 0.25 : Math.sin(t * 6) * 0.06);
    drawAt(IMG.boss, 0, 0, h * IMG.boss.naturalWidth / IMG.boss.naturalHeight); ctx.restore();
  } else if (c.y > 0.3 && c.hp > 0 && ready(IMG[catImg(c) + '_back'])) {
    const lunge = atk && k > 0.55 && k < 0.8 ? -h * 0.08 : 0;
    drawFrame(catImg(c) + '_back', atk ? (k < 0.55 ? 0 : 3) : Math.floor(t * 9) % 6, x, py + lunge - (atk ? 0 : Math.abs(Math.sin(t * 7)) * h * 0.05), h, !flip);
  } else if (ready(IMG.cat)) {
    const ci = ready(IMG[catImg(c)]) ? catImg(c) : 'cat';
    if (atk) drawFrame(ci, k < 0.5 ? 2 : k < 0.75 ? 3 : 4, x, py, h, flip);
    else drawFrame(ci, [0, 1, 5, 1][Math.floor(t * (c.kind === 'ninja' ? 14 : 8)) % 4], x, py - Math.abs(Math.sin(t * 7)) * h * 0.06, h, flip);
  }
  if (c.hp > 0 && (c.slow > 0 || c.burn > 0 || c.stun > 0)) {
    ctx.save();
    if (c.slow > 0) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = c.freeze ? 0.5 : 0.3; ctx.fillStyle = '#7fd8ff';
      ctx.beginPath(); ctx.ellipse(x, py - h * 0.45, h * 0.32, h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      if (c.freeze) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.85; ctx.font = `${Math.round(h * 0.3)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('🧊', x, py - h * 1.05); }
    }
    if (c.burn > 0) { ctx.globalAlpha = 0.9; ctx.font = `${Math.round(h * 0.28)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('🔥', x + Math.sin(performance.now() / 90) * 3, py - h * 0.95); }
    if (c.stun > 0) { ctx.globalAlpha = 1; ctx.font = `${Math.round(h * 0.25)}px system-ui`; ctx.textAlign = 'center'; const a = performance.now() / 200; ctx.fillText('💫', x + Math.cos(a) * h * 0.2, py - h * 1.05); }
    ctx.restore();
  }
  if (!c.boss && c.hitT > 0 && c.hp > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, py - h * 0.5, h * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  if (c.hp <= 0 && !KC) ctx.restore();
  ctx.globalAlpha = 1;
  if (c.hp > 0 && c.hp < c.max) {
    const bw = c.boss ? 70 : 22;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(p.x - bw / 2, p.y - h * 1.05, bw, c.boss ? 6 : 3);
    ctx.fillStyle = '#ff4a3a'; ctx.fillRect(p.x - bw / 2, p.y - h * 1.05, bw * c.hp / c.max, c.boss ? 6 : 3);
  }
}
function drawKitchenCat(c, x, py, h, atk, kk, t) {
  // the kitchen cat sprites face RIGHT; cats on the right side walk left, so mirror those
  const flip = c.x > 0, w = h * 0.76, dead = c.hp <= 0;
  let img = 'k_cat_walk', fr = Math.floor(t * (c.kind === 'ninja' ? 12 : 7)) % 4, bob = Math.abs(Math.sin(t * 7)) * h * 0.04;
  let swing = -1;
  if (dead) { img = 'k_cat_act'; fr = 3; bob = 0; }
  else if (atk) { const kb = c.boss ? c.atk / BOSS_PERIOD : kk; img = 'k_cat_act'; fr = kb < 0.55 ? 0 : 1; swing = fr; bob = 0; }
  else if (c.hitT > 0 || c.stun > 0) { img = 'k_cat_act'; fr = 2; bob = 0; }
  ctx.save(); ctx.translate(x, py - bob); if (flip) ctx.scale(-1, 1);
  drawFrame(img, fr, 0, 0, h, false);
  if (!dead) {
    // headgear (front of the face is +x)
    if (c.boss) drawItem('it_chefhat', w * 0.02, -h * 0.97, h * 0.5);
    else if (c.kind === 'tank') drawItem('it_steamer', w * 0.02, -h * 0.88, h * 0.5);
    else if (c.kind === 'ninja') { ctx.fillStyle = '#d8352a'; ctx.fillRect(-w * 0.36, -h * 0.82, w * 0.72, h * 0.07); ctx.beginPath(); ctx.moveTo(-w * 0.34, -h * 0.8); ctx.lineTo(-w * 0.52, -h * 0.86 + Math.sin(t * 15) * h * 0.04); ctx.lineTo(-w * 0.5, -h * 0.74); ctx.fill(); }
    else drawItem('it_pot', w * 0.02, -h * 0.9, h * 0.5, 0.06);
    // weapon in the front paw
    const wpn = c.boss || c.kind === 'tank' ? 'it_pan' : c.kind === 'ninja' ? 'it_ladle' : 'it_spatula';
    const ws = h * (c.boss ? 0.55 : c.kind === 'tank' ? 0.5 : 0.45);
    if (c.kind === 'tank' && !c.boss && !atk) drawItem(wpn, w * 0.3, -h * 0.4, ws, 0);          // frying-pan shield in front
    else if (swing === 1) drawItem(wpn, w * 0.5, -h * 0.5, ws, 1.9);                               // smack!
    else if (swing === 0) drawItem(wpn, -w * 0.3, -h * 0.88, ws, -0.7);                            // wind up behind the head
    else drawItem(wpn, w * 0.36, -h * 0.5, ws, 0.3 + Math.sin(t * 7) * 0.12);
  }
  ctx.restore();
}
function drawShot(s) {
  const k = Math.min(1, s.t / s.dur);
  const W0 = WEAPON[s.w] || {};
  // arrows leave from the raised platform and drop toward the target
  const base = s.high ? (s.h0 || PLAT_H + 0.55) * (1 - k) + 0.5 * k : 0.6;
  const lift = (s.bomb || W0.arc) ? Math.sin(k * Math.PI) * dk * 2.2 + dk * base * (1 - k) : dk * base;
  const p = dproj(s.x, s.y), y = p.y - lift;
  if (s.rain) {
    if (s.t < 0) return;
    const q = dproj(s.tx, s.ty), kk = Math.min(1, s.t / s.dur);
    drawItem('it_chopsticks', q.x, q.y - (1 - kk) * dk * 5 - dk * 0.3, dk * 0.5, 2.35);
    return;
  }
  if (s.bomb) { drawItem('it_chili', p.x, y, dk * 0.5, s.t * 14) || (ctx.fillStyle = '#d33', ctx.fillRect(p.x - 4, y - 4, 8, 8)); return; }
  if (AMMO[s.w] && ready(IMG[AMMO[s.w]])) {
    const ang = Math.atan2((s.ty - s.sy) * 0.62, s.tx - s.sx), tier = s.tier || 0;
    if (tier >= 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(p.x, y, 0, p.x, y, dk * 0.35 * (1 + tier * 0.2)); gg.addColorStop(0, TIER_GLOW[tier]); gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p.x, y, dk * 0.35 * (1 + tier * 0.2), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    const spin = s.w === 'cannon' || s.w === 'fire' || s.w === 'storm' ? s.t * 12 : ang + Math.PI * 0.25;
    drawItem(AMMO[s.w], p.x, y, dk * (s.w === 'cannon' ? 0.45 : 0.42) * (1 + tier * 0.12), spin);
    return;
  }
  if (s.bomb || s.w === 'cannon') {
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(p.x, y, s.bomb ? 6 : 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,60,.8)'; ctx.beginPath(); ctx.arc(p.x + 3, y - 4, 2.5, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const ang = Math.atan2((s.ty - s.sy) * 0.62 + (s.high ? dk * 0.05 : 0), s.tx - s.sx);
  const tier = s.tier || 0, sz = 1 + tier * 0.22;
  const len = (s.w === 'xbow' ? 16 : 13) * sz;
  const col = tier >= 3 ? '#fff2a8' : WCOL[s.w] || '#ffe27a';
  ctx.save(); ctx.translate(p.x, y); ctx.rotate(ang);
  ctx.globalCompositeOperation = 'lighter';
  if (tier >= 1) {
    // brighter, longer glowing trail at higher levels
    const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 8 * sz);
    gg.addColorStop(0, TIER_GLOW[tier]); gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, 8 * sz, 0, Math.PI * 2); ctx.fill();
  }
  const g = ctx.createLinearGradient(-len * (2 + tier), 0, 0, 0); g.addColorStop(0, 'rgba(255,220,120,0)'); g.addColorStop(1, col);
  ctx.strokeStyle = g; ctx.lineWidth = (s.w === 'fire' ? 5 : s.w === 'storm' ? 4 : 3) * sz; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-len * (2 + tier), 0); ctx.lineTo(0, 0); ctx.stroke();
  if (tier >= 3) for (let i = 0; i < 3; i++) { ctx.fillStyle = '#fff6c0'; ctx.fillRect(-len * (1 + i * 0.9) + Math.sin(s.t * 40 + i) * 2, Math.cos(s.t * 37 + i) * 4, 2, 2); }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#6b3f1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke();
  ctx.fillStyle = '#eef'; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-2, -3); ctx.lineTo(-2, 3); ctx.fill();
  ctx.restore();
}
function drawFx(f) {
  const p = dproj(f.x, f.y), k = f.t / 0.5;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k;
  if (f.type === 'frost') {
    const r = dk * 1.1 * (f.size || 1) * (0.3 + k);
    ctx.fillStyle = 'rgba(160,230,255,.35)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(p.x, p.y - dk * 0.4); ctx.lineTo(p.x + Math.cos(an) * r * 0.8, p.y - dk * 0.4 + Math.sin(an) * r * 0.5); ctx.stroke(); }
  } else if (f.type === 'shock' || f.type === 'shock2') {
    const big = f.type === 'shock' ? 3.2 : 2.2, r = dk * big * (0.2 + k);
    ctx.strokeStyle = f.color; ctx.lineWidth = (f.type === 'shock' ? 8 : 4) * (1 - k);
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (f.type === 'dust' || f.type === 'poof') {
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = (1 - k) * (f.type === 'dust' ? 0.7 : 0.85);
    const n = f.type === 'dust' ? 9 : 6, base = dk * (f.type === 'dust' ? 1.6 : 0.5);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + f.x, rr = base * (0.4 + k * 0.9);
      const cx = p.x + Math.cos(a) * rr, cy = p.y - dk * (f.type === 'poof' ? 0.5 : 0.1) + Math.sin(a) * rr * 0.5 - k * dk * 0.4;
      ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(cx, cy, dk * (f.type === 'dust' ? 0.45 : 0.22) * (0.6 + k * 0.6), 0, Math.PI * 2); ctx.fill();
    }
  } else if (f.type === 'boom' || f.type === 'fire') {
    const r = dk * (f.type === 'boom' ? 1.9 : 1.0) * (0.3 + k) * (f.size || 1);
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
function drawPads(top) {
  const now = performance.now() / 1000;
  for (const pd of padList()) {
    const p = dproj(pd.x, pd.y), on = D.pad && D.pad.id === pd.id, r = dk * (pd.small ? 0.42 : 0.5);
    ctx.globalAlpha = on || Math.hypot(D.lead.x - pd.x, D.lead.y - pd.y) < 3 ? 1 : 0.6;
    if (top) {
      const paid = T.pads[pd.id] || 0, afford = save.coins + paid >= pd.cost;
      ctx.textAlign = 'center'; ctx.font = `${Math.round(dk * 0.32)}px system-ui`; ctx.fillText(pd.icon, p.x, p.y + dk * 0.04);
      ctx.font = `900 ${Math.round(Math.max(10, dk * 0.24))}px system-ui,sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.65)';
      const txt = `🪙${Math.max(0, pd.cost - paid)}`;
      ctx.strokeText(txt, p.x, p.y + r * 0.62 + dk * 0.26); ctx.fillStyle = afford ? '#ffe680' : '#fff'; ctx.fillText(txt, p.x, p.y + r * 0.62 + dk * 0.26);
      if (on) { ctx.strokeText(pd.label, p.x, p.y - r * 0.62 - 4); ctx.fillStyle = '#fff'; ctx.fillText(pd.label, p.x, p.y - r * 0.62 - 4); }
      ctx.globalAlpha = 1;
      continue;
    }
    const paid = T.pads[pd.id] || 0, k = Math.min(1, paid / pd.cost), afford = save.coins + paid >= pd.cost;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.62);
    ctx.fillStyle = on ? 'rgba(255,230,120,.45)' : 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    if (k > 0) { ctx.fillStyle = 'rgba(255,210,60,.85)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = afford ? '#ffe680' : 'rgba(255,255,255,.7)'; ctx.lineWidth = on ? 4 : 2.5;
    if (!on) ctx.setLineDash([6, 5]); ctx.lineDashOffset = -now * 12;
    ctx.beginPath(); ctx.arc(0, 0, r * (on ? 1 + Math.sin(now * 10) * 0.05 : 1), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  if (!top) return;
  // coins pouring from the leader into the pad
  if (D.flow) {
    const a = dproj(D.lead.x, D.lead.y), b = dproj(D.flow.x, D.flow.y);
    for (let i = 0; i < 3; i++) { const k = (performance.now() / 300 + i / 3) % 1; drawItem('it_coin', a.x + (b.x - a.x) * k, a.y - dk * 0.9 + (b.y - a.y + dk * 0.9) * k - Math.sin(k * Math.PI) * dk * 0.6, dk * 0.28); }
  }
}
function drawDrop(c) {
  const p = dproj(c.x, c.y), sz = dk * 0.32, spin = Math.abs(Math.cos(c.t * 5 + c.x * 3));
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, sz * 0.4, sz * 0.15, 0, 0, Math.PI * 2); ctx.fill();
  const y = p.y - sz * 0.5 - c.h * dk - (c.h <= 0 ? Math.abs(Math.sin(c.t * 4 + c.x)) * dk * 0.08 : 0);
  ctx.save(); ctx.translate(p.x, y); ctx.scale(0.35 + spin * 0.65, 1);
  if (!drawItem('it_coin', 0, 0, sz)) { ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(0, 0, sz / 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function drawLeader() {
  const L = D.lead, p = dproj(L.x, L.y), h = dk * 1.15, w = h * 0.75, flip = L.face < 0;
  const blink = L.hurtT > 0 && Math.floor(L.hurtT * 12) % 2;
  // magnet range + gold ring so the player can always spot the leader
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.62);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(0, 0, h * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,80,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, h * 0.34, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  if (blink) return;
  const hop = L.happyT > 0 ? Math.abs(Math.sin(L.happyT * 12)) * h * 0.18 : L.moving ? Math.abs(Math.sin(L.walkT * 2)) * h * 0.04 : 0;
  let img = 'k_duck_walk', fr = L.moving ? Math.floor(L.walkT) % 4 : 1;
  if (L.hurtT > 0.5) { img = 'k_duck_act'; fr = 2; }
  else if (L.swingT > 0) { img = 'k_duck_act'; fr = L.swingT > 0.18 ? 0 : 1; }
  else if (L.happyT > 0) { img = 'k_duck_act'; fr = 3; }
  if (!ready(IMG[img])) return;
  ctx.save(); ctx.translate(p.x, p.y - hop); if (flip) ctx.scale(-1, 1);
  const lean = L.moving ? Math.sin(L.walkT * Math.PI / 2) * 0.06 : 0; ctx.rotate(lean);
  drawFrame(img, fr, 0, 0, h, false);
  drawItem('it_apron', w * 0.08, -h * 0.33, h * 0.42);
  if (T.lead.atk + T.lead.spd + T.lead.mag >= 8) drawItem('it_chefhat', w * 0.02, -h * 0.98, h * 0.42);
  // ladle (or frying pan once upgraded) in the front wing
  const big = T.lead.atk >= 5, sw = L.swingT > 0 ? (L.swingT > 0.18 ? -1.3 : 1.1) : 0.35 + Math.sin(L.walkT * 2) * 0.1;
  drawItem(big ? 'it_pan' : 'it_ladle', w * 0.42, -h * 0.5, h * (big ? 0.5 : 0.55), sw, false);
  ctx.restore();
}
function drawTdHud() {
  if (D.joy && D.joy.moved) {
    const j = D.joy, dx = j.x - j.sx, dy = j.y - j.sy, l = Math.hypot(dx, dy), m = Math.min(l, 45);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(j.sx, j.sy, 48, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(j.sx + (l ? dx / l * m : 0), j.sy + (l ? dy / l * m : 0), 20, 0, Math.PI * 2); ctx.fill();
  } else if (!save.td.walked) {
    // first-time hint until the player drags once
    const p = dproj(D.lead.x, D.lead.y), b = Math.sin(performance.now() / 250) * 6;
    ctx.font = '900 14px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    const tx = '👆 ลากนิ้วเพื่อเดิน'; ctx.strokeText(tx, p.x, p.y + dk * 0.9 + b); ctx.fillStyle = '#fff'; ctx.fillText(tx, p.x, p.y + dk * 0.9 + b);
  }
  if (D.joy && D.joy.moved && !save.td.walked) { save.td.walked = true; persist(); }
  if (D.phase === 'wave') {
    const alive = D.cats.filter(c => c.hp > 0).length + D.queue.length;
    ctx.font = '900 16px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    const t1 = `🐱 เหลือ ${alive}`;
    ctx.strokeText(t1, W / 2, 62); ctx.fillStyle = '#fff'; ctx.fillText(t1, W / 2, 62);
    const bx = W - 46, by = H - 60, r = 28;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
    if (D.bombCd > 0) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - D.bombCd / 7)); ctx.fill(); }
    ctx.font = '24px system-ui'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('🌶️', bx, by + 1);
    ctx.textBaseline = 'alphabetic';
  }
  if (D.banner > 0) {
    ctx.globalAlpha = Math.min(1, D.banner);
    ctx.font = '900 30px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(80,0,0,.75)';
    const txt = D.bossBanner ? 'ราชาแมวมาแล้ว!! 👑' : 'แมวบุกรอบทิศ!';
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
