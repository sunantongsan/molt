// MOLT — night defense: cats attack the duck base from every side.
// Shares globals with index.html (ctx, W, H, IMG, ready, drawFrame, drawAt, roundRect, SFX, save, persist, state)
// and base.js (B, ROOM_TYPES, roomsOf, workersIn, capOf, toast, renderBaseHud, enterBase).
"use strict";

// ---------- weapons ----------
const WEAPONS = [
  { id: 'bow',    name: 'ธนูไม้',     icon: '🏹', dmg: 1,   rate: 1.3,  range: 6.5, speed: 13, craft: null },
  { id: 'xbow',   name: 'หน้าไม้',    icon: '🎯', dmg: 3,   rate: 0.8,  range: 8,   speed: 18, craft: { mat: 60,  coins: 0 } },
  { id: 'fire',   name: 'ธนูไฟ',      icon: '🔥', dmg: 2,   rate: 1.1,  range: 7,   speed: 13, splash: 1.0, craft: { mat: 150, coins: 80 } },
  { id: 'triple', name: 'ธนูสามดอก', icon: '🔱', dmg: 1.6, rate: 1.0,  range: 6.5, speed: 14, multi: 3, craft: { mat: 260, coins: 180 } },
  { id: 'cannon', name: 'ปืนใหญ่ไม้', icon: '💣', dmg: 9,   rate: 0.33, range: 9,   speed: 9,  splash: 1.8, arc: true, craft: { mat: 450, coins: 380 } },
];
const WEAPON = Object.fromEntries(WEAPONS.map(w => [w.id, w]));
if (!B.weapons) B.weapons = { bow: 0, xbow: 0, fire: 0, triple: 0, cannon: 0 };
if (!B.wlv) B.wlv = { bow: 1, xbow: 1, fire: 1, triple: 1, cannon: 1 };
if (!B.def) B.def = { wall: 1, bomb: 1 };
if (!B.day) B.day = 1;
if (!B.nextAttack) B.nextAttack = Date.now() + 150 * 1000;
function wDmg(id) { return WEAPON[id].dmg * (1 + (B.wlv[id] - 1) * 0.3); }
function wUpCost(id) { const l = B.wlv[id], base = WEAPON[id].craft ? WEAPON[id].craft.mat : 40; return { mat: Math.round(base * 0.6 * Math.pow(l, 1.4) + 30), coins: 25 * l }; }
function wallMax() { return 30 + (B.def.wall - 1) * 18; }
function bombDmg() { return 6 + (B.def.bomb - 1) * 4; }
// give the best weapons to the ducks first; everyone else keeps the wooden bow
function loadout(n) {
  const out = [];
  for (let i = WEAPONS.length - 1; i >= 1 && out.length < n; i--) {
    for (let k = 0; k < B.weapons[WEAPONS[i].id] && out.length < n; k++) out.push(WEAPONS[i].id);
  }
  while (out.length < n) out.push('bow');
  return out;
}

// ---------- arena ----------
const RING = 4.4, DUCK_R = 3.45;
let D = null;   // current defense run
let dk = 30;    // px per meter
function dproj(x, y) { return { x: W / 2 + x * dk, y: H * 0.47 + y * dk * 0.62 }; }
function dinv(sx, sy) { return { x: (sx - W / 2) / dk, y: (sy - H * 0.47) / (dk * 0.62) }; }

function startDefense(auto) {
  SFX.init();
  dk = Math.min(W / 11.5, H / 15);
  const ducks = B.ducks.slice();
  const eat = ducks.length * 3;
  const hungry = B.food < eat;
  B.food = Math.max(0, B.food - eat);
  const night = B.day;
  const weapons = loadout(ducks.length);
  D = {
    night, hungry, t: 0, over: false, result: null,
    baseHp: 20, baseMax: 20,
    bombCd: 0, loot: { mat: 0, coins: 0, food: 0 },
    walls: Array.from({ length: 8 }, (_, i) => ({ a: i * Math.PI / 4, hp: wallMax(), max: wallMax(), hit: 0 })),
    ducks: ducks.map((d, i) => {
      const a = (i + 0.5) / ducks.length * Math.PI * 2;
      return { id: d.id, x: Math.cos(a) * DUCK_R, y: Math.sin(a) * DUCK_R, hp: 6, max: 6, cd: Math.random(), w: weapons[i], aimDx: 0, aimDy: -1, shootT: 0, dead: false };
    }),
    cats: [], shots: [], fx: [], floats: [],
    queue: buildWave(night), spawnT: 1.5, banner: 3,
  };
  state = 'defense';
  hide('baseUi'); hide('menu'); hide('result'); show('defUi');
  $('defHint').classList.remove('hidden');
  setTimeout(() => $('defHint').classList.add('hidden'), 4500);
  if (hungry) toast('อาหารไม่พอ! เป็ดหิว ยิงเบาลง');
  else if (auto) toast('แมวบุกฐานแล้ว!');
  SFX.play('gateBad');
}
function buildWave(n) {
  // groups of cats arriving from different sides over time
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
  D.cats.push({
    x: Math.cos(c.a) * rx, y: Math.sin(c.a) * ry, hp: c.hp, max: c.hp, boss: c.boss,
    v: c.boss ? 0.7 : 0.9 + Math.random() * 0.5, st: 'walk', atk: 0, target: null, ph: Math.random() * 9, hitT: 0,
  });
}

// ---------- update ----------
function wallFor(c) {
  let a = Math.atan2(c.y, c.x); if (a < 0) a += Math.PI * 2;
  return D.walls[Math.round(a / (Math.PI / 4)) % 8];
}
function defenseUpdate(dt) {
  if (!D) return;
  D.t += dt; D.banner -= dt;
  if (D.over) { D.overT += dt; if (D.overT > 1.6 && !D.shown) showDefenseResult(); stepFx(dt); return; }
  // spawn
  D.spawnT -= dt;
  while (D.queue.length && D.queue[0].t <= D.t - 1.5) spawnCat(D.queue.shift());
  if (D.bombCd > 0) D.bombCd -= dt;
  const mult = D.hungry ? 0.6 : 1;
  // cats
  for (const c of D.cats) {
    if (c.hp <= 0) continue;
    c.hitT = Math.max(0, c.hitT - dt);
    const dist = Math.hypot(c.x, c.y);
    const wall = wallFor(c);
    if (c.st === 'walk') {
      let tx = -c.x / dist, ty = -c.y / dist;
      if (dist <= RING + 0.5 && wall.hp > 0) { c.st = 'wall'; c.atk = 0; }
      else if (dist <= RING && wall.hp <= 0) {
        // breached: go for the nearest duck, else the base itself
        const d = nearestDuck(c.x, c.y);
        if (d && Math.hypot(d.x - c.x, d.y - c.y) < 0.7) { c.st = 'duck'; c.target = d; c.atk = 0; }
        else if (d) { const dd = Math.hypot(d.x - c.x, d.y - c.y); tx = (d.x - c.x) / dd; ty = (d.y - c.y) / dd; }
        if (dist < 1.6) { c.st = 'base'; c.atk = 0; }
      }
      if (c.st === 'walk') { c.x += tx * c.v * dt; c.y += ty * c.v * dt; }
    } else if (c.st === 'wall') {
      if (wall.hp <= 0) { c.st = 'walk'; continue; }
      c.atk += dt;
      if (c.atk > 0.9) { c.atk = 0; wall.hp -= c.boss ? 6 : 1; wall.hit = 0.15; SFX.play('wood'); if (wall.hp <= 0) { wall.hp = 0; SFX.play('break'); addDFx('ring', wall, '#ffcf8a'); toast('ไม้กั้นพัง! แตะเพื่อซ่อม'); } }
    } else if (c.st === 'duck') {
      const d = c.target;
      if (!d || d.dead) { c.st = 'walk'; continue; }
      c.atk += dt;
      if (c.atk > 0.9) { c.atk = 0; d.hp -= c.boss ? 4 : 1; SFX.play('clash'); addDFx('slash', d, '#fff'); if (d.hp <= 0) killDuck(d); }
    } else if (c.st === 'base') {
      c.atk += dt;
      if (c.atk > 1) {
        c.atk = 0; D.baseHp -= c.boss ? 4 : 1; SFX.play('hit');
        const steal = Math.min(B.food, 4); B.food -= steal;
        D.floats.push({ x: c.x, y: c.y, t: 0, text: steal ? `-${steal}🍗` : '-1❤️', color: '#ff7a6a' });
        if (D.baseHp <= 0) endDefense(false);
      }
    }
  }
  // ducks shoot
  for (const d of D.ducks) {
    if (d.dead) continue;
    d.cd -= dt; d.shootT = Math.max(0, d.shootT - dt);
    const W0 = WEAPON[d.w];
    if (d.cd > 0) continue;
    const t = nearestCat(d.x, d.y, W0.range);
    if (!t) continue;
    d.cd = 1 / W0.rate;
    d.aimDx = t.x - d.x; d.aimDy = t.y - d.y; d.shootT = 0.3;
    const n = W0.multi || 1;
    for (let k = 0; k < n; k++) {
      const spread = n > 1 ? (k - (n - 1) / 2) * 0.22 : 0;
      const ang = Math.atan2(t.y - d.y, t.x - d.x) + spread;
      const dist = Math.hypot(t.x - d.x, t.y - d.y);
      D.shots.push({ x: d.x, y: d.y, sx: d.x, sy: d.y, tx: d.x + Math.cos(ang) * dist, ty: d.y + Math.sin(ang) * dist, target: n > 1 ? null : t, w: d.w, dmg: wDmg(d.w) * mult, t: 0, dur: dist / W0.speed });
    }
    SFX.play(d.w === 'cannon' ? 'wood' : 'shoot');
  }
  // projectiles
  for (const s of D.shots) {
    s.t += dt;
    if (s.bomb) { const k = Math.min(1, s.t / s.dur); s.x = s.sx + (s.tx - s.sx) * k; s.y = s.sy + (s.ty - s.sy) * k; continue; }
    if (s.target && s.target.hp > 0) { s.tx = s.target.x; s.ty = s.target.y; }
    const k = Math.min(1, s.t / s.dur);
    s.x = s.sx + (s.tx - s.sx) * k; s.y = s.sy + (s.ty - s.sy) * k;
    if (k >= 1) {
      s.done = true;
      const W0 = WEAPON[s.w];
      if (W0.splash) {
        for (const c of D.cats) if (c.hp > 0 && Math.hypot(c.x - s.x, c.y - s.y) < W0.splash) hurtCat(c, s.dmg, s.w);
        addDFx(s.w === 'cannon' ? 'boom' : 'fire', s, s.w === 'cannon' ? '#ffb347' : '#ff7a2a');
        if (s.w === 'cannon') { SFX.play('break'); D.shake = 0.25; }
      } else {
        const c = s.target && s.target.hp > 0 ? s.target : D.cats.find(c => c.hp > 0 && Math.hypot(c.x - s.x, c.y - s.y) < 0.55);
        if (c) hurtCat(c, s.dmg, s.w);
      }
    }
  }
  D.shots = D.shots.filter(s => !s.done);
  D.cats = D.cats.filter(c => c.hp > 0 || (c.deadT = (c.deadT || 0) + dt) < 0.6);
  stepFx(dt);
  // win / lose
  if (D.ducks.every(d => d.dead)) endDefense(false);
  else if (!D.queue.length && !D.cats.some(c => c.hp > 0)) endDefense(true);
}
function stepFx(dt) {
  for (const f of D.fx) f.t += dt;
  D.fx = D.fx.filter(f => f.t < 0.5);
  for (const f of D.floats) f.t += dt;
  D.floats = D.floats.filter(f => f.t < 1.1);
  for (const w of D.walls) w.hit = Math.max(0, w.hit - dt);
  D.shake = Math.max(0, (D.shake || 0) - dt);
}
function hurtCat(c, dmg, w) {
  if (c.hp <= 0) return;
  c.hp -= dmg; c.hitT = 0.1;
  D.floats.push({ x: c.x, y: c.y, t: 0, text: '-' + (Math.round(dmg * 10) / 10), color: '#fff', small: true });
  addDFx('spark', c, '#fff3b0');
  SFX.play('hit');
  if (c.hp <= 0) {
    SFX.play(Math.random() < 0.3 ? 'meow' : 'hit');
    // loot drops
    const m = c.boss ? 60 : (Math.random() < 0.35 ? 2 + Math.floor(D.night / 2) : 0), co = c.boss ? 80 : (Math.random() < 0.25 ? 3 : 0);
    if (m) { D.loot.mat += m; D.floats.push({ x: c.x, y: c.y - 0.6, t: 0, text: '+' + m + '⚙️', color: '#b8ff8a' }); }
    if (co) { D.loot.coins += co; D.floats.push({ x: c.x + 0.4, y: c.y - 0.9, t: 0, text: '+' + co + '🪙', color: '#ffd84a' }); }
  }
}
function nearestCat(x, y, r) {
  let best = null, bd = r;
  for (const c of D.cats) { if (c.hp <= 0) continue; const d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; best = c; } }
  return best;
}
function nearestDuck(x, y) {
  let best = null, bd = 1e9;
  for (const d of D.ducks) { if (d.dead) continue; const k = Math.hypot(d.x - x, d.y - y); if (k < bd) { bd = k; best = d; } }
  return best;
}
function killDuck(d) {
  d.dead = true; d.deadT = 0; SFX.play('quack');
  D.floats.push({ x: d.x, y: d.y, t: 0, text: 'เป็ดล้ม!', color: '#ff7a6a' });
}
function addDFx(type, at, color) { D.fx.push({ type, x: at.x === undefined ? Math.cos(at.a) * RING : at.x, y: at.y === undefined ? Math.sin(at.a) * RING : at.y, t: 0, color }); }

function endDefense(won) {
  if (D.over) return;
  D.over = true; D.overT = 0; D.result = won;
  const lost = D.ducks.filter(d => d.dead).map(d => d.id);
  B.ducks = B.ducks.filter(d => !lost.includes(d.id));
  if (!B.ducks.length) B.ducks.push({ id: B.nextId++, slot: roomsOf('bedroom')[0] ? roomsOf('bedroom')[0].slot : 0 });
  D.lost = lost.length;
  const cap = capOf();
  if (won) {
    D.loot.mat += 20 + D.night * 8; D.loot.coins += 15 + D.night * 10;
    B.day += 1;
    SFX.play('win');
  } else {
    D.penalty = { food: Math.round(B.food * 0.3), mat: Math.round(B.mat * 0.3) };
    B.food -= D.penalty.food; B.mat -= D.penalty.mat;
    SFX.play('lose');
  }
  B.mat = Math.min(cap, B.mat + D.loot.mat); save.coins += D.loot.coins;
  B.nextAttack = Date.now() + 150 * 1000;
  persist();
}
function showDefenseResult() {
  D.shown = true;
  hide('defUi');
  $('rTitle').textContent = D.result ? `รอดคืนที่ ${D.night}! 🛡️` : 'ฐานแตก!';
  $('rTitle').style.color = D.result ? '#ffd84a' : '#ff7a7a';
  let info = D.result ? `ได้ ⚙️${D.loot.mat}` : `เสียอาหาร 🍗${D.penalty.food} วัสดุ ⚙️${D.penalty.mat}`;
  if (D.lost) info += ` • เป็ดล้มไป ${D.lost} ตัว`;
  $('rInfo').textContent = info;
  $('rCoins').textContent = D.loot.coins;
  show('result');
  state = 'result';
}

// ---------- input: tap ground = bomb, tap broken/damaged wall = repair ----------
cv.addEventListener('pointerdown', e => {
  if (state !== 'defense' || !D || D.over) return;
  const p = dinv(e.clientX, e.clientY);
  // repair?
  for (const w of D.walls) {
    const wx = Math.cos(w.a) * RING, wy = Math.sin(w.a) * RING;
    if (Math.hypot(p.x - wx, p.y - wy) < 0.9 && w.hp < w.max) {
      const cost = 8 + Math.round(B.def.wall * 2);
      if (B.mat < cost) { toast(`วัสดุไม่พอซ่อม (⚙️${cost})`); SFX.play('gateBad'); return; }
      B.mat -= cost; w.hp = Math.min(w.max, w.hp + Math.ceil(w.max * 0.5)); SFX.play('plus');
      D.floats.push({ x: wx, y: wy, t: 0, text: `ซ่อม -${cost}⚙️`, color: '#b8ff8a' });
      return;
    }
  }
  if (D.bombCd > 0) return;
  D.bombCd = 7;
  D.shots.push({ x: 0, y: 0, sx: 0, sy: 0, tx: p.x, ty: p.y, w: 'bomb', dmg: bombDmg(), t: 0, dur: 0.45, bomb: true });
});
// bombs reuse projectile flow; resolve them here
const _origHurt = hurtCat;
function resolveBombs() {
  for (const s of D.shots) if (s.bomb && s.t >= s.dur && !s.done) {
    s.done = true;
    for (const c of D.cats) if (c.hp > 0 && Math.hypot(c.x - s.tx, c.y - s.ty) < 1.9) hurtCat(c, s.dmg, 'bomb');
    D.fx.push({ type: 'boom', x: s.tx, y: s.ty, t: 0, color: '#ffb347' }); D.shake = 0.35; SFX.play('break');
  }
}
WEAPON.bomb = { speed: 1, range: 0 };

// ---------- drawing ----------
function defenseDraw() {
  if (!D) return;
  ctx.save();
  if (D.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * D.shake * 3, (Math.random() - 0.5) * 10 * D.shake * 3);
  // night ground
  const g = ctx.createRadialGradient(W / 2, H * 0.47, 10, W / 2, H * 0.47, Math.max(W, H) * 0.7);
  g.addColorStop(0, '#5a7a3a'); g.addColorStop(0.5, '#3a5228'); g.addColorStop(1, '#172414');
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
  // dirt yard
  const c0 = dproj(0, 0);
  ctx.fillStyle = 'rgba(150,120,80,.55)';
  ctx.beginPath(); ctx.ellipse(c0.x, c0.y, (RING + 0.6) * dk, (RING + 0.6) * dk * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  if (ready(IMG.floor)) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(c0.x, c0.y, (RING - 0.2) * dk, (RING - 0.2) * dk * 0.62, 0, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = 0.5; const s = dk * 2.2;
    for (let x = -RING; x < RING; x += 2.2) for (let y = -RING; y < RING; y += 2.2 / 0.62 * 0.62) { const p = dproj(x, y); ctx.drawImage(IMG.floor, p.x, p.y, s, s * 0.62); }
    ctx.restore();
  }
  // everything depth-sorted by y
  const list = [];
  // base (four rooms) at the centre
  list.push([0.1, drawDefBase]);
  for (const w of D.walls) list.push([Math.sin(w.a) * RING, () => drawWall(w)]);
  for (const d of D.ducks) list.push([d.y, () => drawDefDuck(d)]);
  for (const c of D.cats) list.push([c.y, () => drawDefCat(c)]);
  list.sort((a, b) => a[0] - b[0]);
  for (const it of list) it[1]();
  for (const s of D.shots) drawShot(s);
  for (const f of D.fx) drawDFx(f);
  for (const f of D.floats) {
    const p = dproj(f.x, f.y); const a = 1 - f.t / 1.1;
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = `900 ${f.small ? 13 : 17}px system-ui,sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.5)';
    const y = p.y - dk * 1.3 - f.t * 30;
    ctx.strokeText(f.text, p.x, y); ctx.fillStyle = f.color; ctx.fillText(f.text, p.x, y);
    ctx.globalAlpha = 1;
  }
  // darkness vignette (it's night)
  const v = ctx.createRadialGradient(W / 2, H * 0.47, Math.min(W, H) * 0.3, W / 2, H * 0.47, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(10,15,40,0)'); v.addColorStop(1, 'rgba(10,15,40,.55)');
  ctx.fillStyle = v; ctx.fillRect(-20, -20, W + 40, H + 40);
  ctx.restore();
  // HUD
  drawDefHud();
}
function drawDefBase() {
  // 2x2 rooms as one compound
  const keys = ['room_kitchen', 'room_workshop', 'room_bedroom', 'room_armory'];
  const sc = (2 * 2.25 * dk) / (4 * 318);
  const off = [[0, -1], [-1, 0], [1, 0], [0, 1]];
  const c0 = dproj(0, 0);
  off.forEach((o, i) => {
    const img = IMG[keys[i]]; if (!ready(img)) return;
    const cx = c0.x + o[0] * 318 * sc, cy = c0.y + o[1] * 188 * sc - 0 ;
    ctx.drawImage(img, cx - 320 * sc, cy - 300 * sc, img.naturalWidth * sc, img.naturalHeight * sc);
  });
  // base HP bar
  const bw = 120, y = c0.y - 300 * sc * 1.1 - 10;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; roundRect(c0.x - bw / 2, y, bw, 10, 5); ctx.fill();
  ctx.fillStyle = '#5fe06a'; roundRect(c0.x - bw / 2 + 2, y + 2, (bw - 4) * Math.max(0, D.baseHp / D.baseMax), 6, 3); ctx.fill();
}
function drawWall(w) {
  const x = Math.cos(w.a) * RING, y = Math.sin(w.a) * RING, p = dproj(x, y);
  const wd = dk * 2.0;
  if (w.hp > 0 && ready(IMG.barrier)) {
    ctx.save(); ctx.translate(p.x + (w.hit > 0 ? Math.sin(w.hit * 90) * 3 : 0), p.y);
    if (Math.cos(w.a) < -0.2) ctx.scale(-1, 1);
    ctx.globalAlpha = 0.5 + 0.5 * w.hp / w.max;
    drawAt(IMG.barrier, 0, wd * 0.18, wd);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(90,60,30,.6)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, wd * 0.4, wd * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.font = '900 12px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffcf8a'; ctx.fillText('🔧 แตะซ่อม', p.x, p.y - 4);
  }
  if (w.hp < w.max && w.hp > 0) {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(p.x - 18, p.y - wd * 0.62, 36, 4);
    ctx.fillStyle = '#ffb347'; ctx.fillRect(p.x - 18, p.y - wd * 0.62, 36 * w.hp / w.max, 4);
  }
}
function drawDefDuck(d) {
  const p = dproj(d.x, d.y), h = dk * 1.15;
  if (d.dead) {
    d.deadT = (d.deadT || 0) + 1 / 60;
    if (ready(IMG.duck_die)) { ctx.globalAlpha = Math.max(0.25, 1 - d.deadT); drawFrame('duck_die', 2, p.x, p.y, h); ctx.globalAlpha = 1; }
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.22, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  const t = performance.now() / 1000 + d.id;
  const flip = d.aimDx < 0;
  // aim pose: back view when shooting up the screen, front view (bow drawn) when shooting down
  const k = d.shootT > 0 ? Math.min(3, Math.floor((0.3 - d.shootT) / 0.3 * 4)) : 0;
  if (d.aimDy < 0 && ready(IMG.duck_shoot)) drawFrame('duck_shoot', d.shootT > 0 ? 1 + k % 3 : 0, p.x, p.y, h, flip);
  else if (ready(IMG.duck_shoot_front)) drawFrame('duck_shoot_front', d.shootT > 0 ? k : 0, p.x, p.y, h, flip);
  else if (ready(IMG.duck_idle)) drawFrame('duck_idle', Math.floor(t * 4), p.x, p.y, h, flip);
  // weapon badge + hp
  ctx.font = `${Math.round(h * 0.3)}px system-ui`; ctx.textAlign = 'center';
  ctx.fillText(WEAPON[d.w].icon, p.x + h * 0.32, p.y - h * 0.82);
  if (d.hp < d.max) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(p.x - 12, p.y - h * 1.05, 24, 3); ctx.fillStyle = '#5fe06a'; ctx.fillRect(p.x - 12, p.y - h * 1.05, 24 * d.hp / d.max, 3); }
}
function drawDefCat(c) {
  const p = dproj(c.x, c.y);
  const h = dk * (c.boss ? 2.8 : 1.1);
  ctx.globalAlpha = c.hp > 0 ? 1 : Math.max(0, 1 - (c.deadT || 0) / 0.6);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.25, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  const t = performance.now() / 1000 + c.ph;
  const flip = c.x > 0;
  let x = p.x + (c.hitT > 0 ? Math.sin(c.hitT * 120) * 3 : 0);
  if (c.hp <= 0) { ctx.save(); ctx.translate(x, p.y); ctx.rotate((flip ? -1 : 1) * Math.min(1.4, (c.deadT || 0) * 5)); x = 0; }
  const py = c.hp <= 0 ? 0 : p.y;
  if (c.boss && ready(IMG.boss)) {
    const atk = c.st !== 'walk';
    ctx.save(); ctx.translate(x, py); ctx.rotate(atk ? Math.sin(c.atk / 0.9 * Math.PI * 2) * 0.25 : Math.sin(t * 6) * 0.06);
    drawAt(IMG.boss, 0, 0, h * IMG.boss.naturalWidth / IMG.boss.naturalHeight); ctx.restore();
  } else if (c.y > 0.3 && c.hp > 0 && ready(IMG.cat_back)) {
    // cats below the base walk up the screen: show their backs
    const atk = c.st !== 'walk', k = c.atk / 0.9;
    const lunge = atk && k > 0.55 && k < 0.8 ? -h * 0.08 : 0;
    drawFrame('cat_back', atk ? (k < 0.55 ? 0 : 3) : Math.floor(t * 9) % 6, x, py + lunge - (atk ? 0 : Math.abs(Math.sin(t * 7)) * h * 0.05), h, !flip);
  } else if (ready(IMG.cat)) {
    if (c.st !== 'walk' && c.hp > 0) { const k = c.atk / 0.9; drawFrame('cat', k < 0.5 ? 2 : k < 0.75 ? 3 : 4, x, py, h, flip); }
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
  const lift = (s.bomb || W0.arc) ? Math.sin(k * Math.PI) * dk * 2.2 : dk * 0.6;
  const p = dproj(s.x, s.y), y = p.y - lift;
  if (s.bomb || s.w === 'cannon') {
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(p.x, y, s.bomb ? 6 : 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,60,.8)'; ctx.beginPath(); ctx.arc(p.x + 3, y - 4, 2.5, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const ang = Math.atan2((s.ty - s.sy) * 0.62, s.tx - s.sx);
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
function drawDFx(f) {
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
  } else if (f.type === 'slash') {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * (1 - k); ctx.beginPath(); ctx.arc(p.x, p.y - dk * 0.6, dk * 0.5, -2.4, -2.4 + 0.5 + k * 1.8); ctx.stroke();
  } else {
    const r = dk * (0.15 + k * 0.4), cy = p.y - dk * 0.6;
    const g = ctx.createRadialGradient(p.x, cy, 0, p.x, cy, r);
    g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, cy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function drawDefHud() {
  const alive = D.cats.filter(c => c.hp > 0).length + D.queue.length;
  ctx.font = '900 18px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
  const t1 = `คืนที่ ${D.night}  •  🐱 เหลือ ${alive}`;
  ctx.strokeText(t1, W / 2, 16); ctx.fillStyle = '#fff'; ctx.fillText(t1, W / 2, 16);
  const t2 = `🏠 ${Math.max(0, D.baseHp)}/${D.baseMax}   ⚙️ ${Math.floor(B.mat)}   🦆 ${D.ducks.filter(d => !d.dead).length}`;
  ctx.font = '800 14px system-ui,sans-serif'; ctx.strokeText(t2, W / 2, 40); ctx.fillStyle = '#ffd84a'; ctx.fillText(t2, W / 2, 40);
  // bomb cooldown
  const bx = W - 46, by = H - 60, r = 28;
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
  if (D.bombCd > 0) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - D.bombCd / 7)); ctx.fill(); }
  ctx.font = '24px system-ui'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('💣', bx, by + 1);
  if (D.banner > 0) {
    ctx.globalAlpha = Math.min(1, D.banner);
    ctx.font = '900 30px system-ui,sans-serif'; ctx.textBaseline = 'middle'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(80,0,0,.75)';
    const txt = D.night % 5 === 0 ? 'ราชาแมวมาเอง!' : 'แมวบุกรอบทิศ!';
    ctx.strokeText(txt, W / 2, H * 0.2); ctx.fillStyle = '#ff6a5a'; ctx.fillText(txt, W / 2, H * 0.2);
    ctx.globalAlpha = 1;
  }
}

// ---------- armory: craft and upgrade weapons ----------
function armorySheet(body) {
  const head = document.createElement('div'); head.className = 'sinfo';
  head.textContent = `อาวุธที่สะสม — เป็ดทุกตัวออกป้องกันฐาน อาวุธดีสุดแจกก่อน (ทั้งหมด ${B.ducks.length} ตัว)`;
  body.appendChild(head);
  for (const w of WEAPONS) {
    const lv = B.wlv[w.id], owned = w.craft ? B.weapons[w.id] : '∞';
    const row = document.createElement('div'); row.className = 'wrow';
    row.innerHTML = `<div class="wname">${w.icon} <b>${w.name}</b> <span>Lv.${lv} • มี ${owned}</span><small>ดาเมจ ${wDmg(w.id).toFixed(1)} • ยิง ${w.rate}/วิ • ระยะ ${w.range}${w.splash ? ' • ระเบิด' : ''}${w.multi ? ' • 3 ดอก' : ''}</small></div>`;
    const bx = document.createElement('div'); bx.className = 'wbtns';
    if (w.craft) {
      const c = w.craft;
      bx.appendChild(btn('สร้าง', `⚙️${c.mat}${c.coins ? ' 🪙' + c.coins : ''}`, B.mat >= c.mat && save.coins >= c.coins, () => {
        B.mat -= c.mat; save.coins -= c.coins; B.weapons[w.id]++; SFX.play('gateGood'); toast(`ได้${w.name}!`);
      }));
    }
    const u = wUpCost(w.id);
    bx.appendChild(btn('อัปเกรด', `⚙️${u.mat} 🪙${u.coins}`, lv < 10 && B.mat >= u.mat && save.coins >= u.coins, () => {
      B.mat -= u.mat; save.coins -= u.coins; B.wlv[w.id]++; SFX.play('gateGood');
    }));
    row.appendChild(bx); body.appendChild(row);
  }
  const wc = { mat: 30 * B.def.wall, coins: 20 * B.def.wall }, bc = { mat: 40 * B.def.bomb, coins: 30 * B.def.bomb };
  body.appendChild(btn(`🪵 เสริมไม้กั้น Lv.${B.def.wall}`, `ทน ${wallMax()} • ⚙️${wc.mat} 🪙${wc.coins}`, B.mat >= wc.mat && save.coins >= wc.coins, () => { B.mat -= wc.mat; save.coins -= wc.coins; B.def.wall++; }));
  body.appendChild(btn(`💣 ระเบิดมือ Lv.${B.def.bomb}`, `แรง ${bombDmg()} • ⚙️${bc.mat} 🪙${bc.coins}`, B.mat >= bc.mat && save.coins >= bc.coins, () => { B.mat -= bc.mat; save.coins -= bc.coins; B.def.bomb++; }));
}

// ---------- hooks ----------
const _defUpdate = defenseUpdate;
defenseUpdate = function (dt) { _defUpdate(dt); if (D) resolveBombs(); };
$('defBtn').onclick = () => { SFX.init(); SFX.play('click'); startDefense(false); };
