// MOLT — duck survivor base (Zero City style). Loaded after the main game script and
// shares its globals (ctx, W, H, IMG, ready, drawFrame, SFX, save, persist, state...).
"use strict";

const ROOM_TYPES = {
  kitchen:  { name: 'ห้องครัว',    icon: '🍗', img: 'room_kitchen',  work: 'duck_cook',   slots: 3, desc: 'ผลิตอาหาร', cost: 40 },
  workshop: { name: 'โรงงาน',      icon: '⚙️', img: 'room_workshop', work: 'duck_hammer', slots: 3, desc: 'ผลิตวัสดุ', cost: 30 },
  bedroom:  { name: 'ห้องนอน',     icon: '🛏️', img: 'room_bedroom',  work: 'duck_sleep',  slots: 0, desc: 'ที่พักเป็ด เพิ่มจำนวนเป็ดได้', cost: 60 },
  armory:   { name: 'คลังอาวุธ',   icon: '🏹', img: 'room_armory',   work: 'duck_shoot',  slots: 3, desc: 'ฝึกทหาร เพิ่มทัพตอนออกรบ', cost: 80 },
  storage:  { name: 'โกดัง',       icon: '📦', img: 'room_storage',  work: 'duck_idle',   slots: 0, desc: 'เพิ่มที่เก็บอาหารและวัสดุ', cost: 50 },
};
const BASE_COLS = 2, BASE_ROWS = 4;           // 8 building plots
const ROOM_HW = 318, ROOM_HH = 188;           // half size of a room's floor diamond (image px)
const ROOM_IMG_CX = 320, ROOM_IMG_CY = 300;   // floor centre inside the room image
const DUCK_H = 112;

// ---------- save ----------
function freshBase() {
  return {
    food: 60, mat: 40, last: Date.now(), nextId: 5,
    rooms: [
      { slot: 0, type: 'kitchen', lvl: 1 },
      { slot: 1, type: 'bedroom', lvl: 1 },
      { slot: 2, type: 'workshop', lvl: 1 },
      { slot: 3, type: 'armory', lvl: 1 },
    ],
    ducks: [{ id: 1, slot: 0 }, { id: 2, slot: 2 }, { id: 3, slot: 1 }, { id: 4, slot: 1 }],
  };
}
if (!save.base || !Array.isArray(save.base.rooms)) save.base = freshBase();
const B = save.base;

function roomAt(slot) { return B.rooms.find(r => r.slot === slot); }
function roomsOf(type) { return B.rooms.filter(r => r.type === type); }
function capOf() { return 150 + roomsOf('storage').reduce((a, r) => a + 150 + r.lvl * 120, 0) + roomsOf('kitchen').length * 20; }
function popCap() { return roomsOf('bedroom').reduce((a, r) => a + 2 + r.lvl * 2, 0); }
function workersIn(slot) { return B.ducks.filter(d => d.slot === slot); }
function rate(r) {
  const n = workersIn(r.slot).length;
  if (r.type === 'kitchen') return n * 0.22 * (1 + (r.lvl - 1) * 0.6);
  if (r.type === 'workshop') return n * 0.18 * (1 + (r.lvl - 1) * 0.6);
  return 0;
}
function armyBonus() {
  return roomsOf('armory').reduce((a, r) => a + workersIn(r.slot).length * (2 + r.lvl) + r.lvl * 2, 0);
}
function upgradeCost(r) { return { mat: Math.round(45 * Math.pow(r.lvl, 1.55)), coins: 30 * r.lvl }; }
function buildCost(type) { return Math.round(ROOM_TYPES[type].cost * Math.pow(1.6, roomsOf(type).length)); }
function raidFood(l) { return 10 + Math.floor(l / 3) * 2; }

// production, also used for offline progress
function produce(sec) {
  const cap = capOf();
  for (const r of B.rooms) {
    const g = rate(r) * sec;
    if (!g) continue;
    if (r.type === 'kitchen') B.food = Math.min(cap, B.food + g);
    else B.mat = Math.min(cap, B.mat + g);
    r.acc = (r.acc || 0) + g;
  }
}
(function offline() {
  const sec = Math.min(8 * 3600, Math.max(0, (Date.now() - (B.last || Date.now())) / 1000));
  if (sec > 5) { produce(sec); for (const r of B.rooms) r.acc = 0; B.offline = Math.round(sec); }
  B.last = Date.now();
})();

// ---------- world layout ----------
// rooms zig-zag down the screen (each shares a wall with the next) — fits a portrait phone
function slotCenter(slot) {
  return { x: (slot % 2) * ROOM_HW - ROOM_HW / 2, y: slot * ROOM_HH };
}
function inDiamond(px, py, slot) {
  const c = slotCenter(slot);
  return Math.abs(px - c.x) / ROOM_HW + Math.abs(py - c.y) / ROOM_HH <= 1;
}
// spots on the floor for workers / sleepers
const WORK_SPOTS = [[0, 10], [-120, 40], [120, 40]];
const SLEEP_SPOTS = [[-130, -20], [10, 50], [140, -10], [-60, 95], [80, 110], [-10, -60], [170, 70], [-170, 60]];
function spotFor(d) {
  const c = slotCenter(d.slot), r = roomAt(d.slot);
  const mates = workersIn(d.slot), k = Math.max(0, mates.indexOf(d));
  const s = r && r.type === 'bedroom' ? SLEEP_SPOTS[k % SLEEP_SPOTS.length] : WORK_SPOTS[k % WORK_SPOTS.length];
  return { x: c.x + s[0], y: c.y + s[1] };
}

// ---------- camera ----------
const cam = { x: 0, y: ROOM_HH * 1.8, z: 0.3 };
function fitCam() { cam.z = Math.max(0.2, Math.min(0.9, W / 1020)); }
function clampCam() {
  cam.x = Math.max(-ROOM_HW * 1.5, Math.min(ROOM_HW * 1.5, cam.x));
  cam.y = Math.max(-ROOM_HH, Math.min(ROOM_HH * (BASE_COLS * BASE_ROWS), cam.y));
}
fitCam(); window.addEventListener('resize', fitCam);
function w2s(x, y) { return { x: (x - cam.x) * cam.z + W / 2, y: (y - cam.y) * cam.z + H * 0.5 }; }
function s2w(x, y) { return { x: (x - W / 2) / cam.z + cam.x, y: (y - H * 0.5) / cam.z + cam.y }; }

// ---------- ducks (runtime) ----------
const walkers = new Map();   // id -> {x,y}
function duckPos(d) {
  let w = walkers.get(d.id);
  if (!w) { const s = spotFor(d); w = { x: s.x, y: s.y, flip: Math.random() < 0.5 }; walkers.set(d.id, w); }
  return w;
}
const pops = [];   // floating "+1 🍗"

function baseUpdate(dt) {
  produce(dt);
  B.last = Date.now();
  for (const r of B.rooms) {
    if ((r.acc || 0) >= 1) {
      const n = Math.floor(r.acc); r.acc -= n;
      const c = slotCenter(r.slot);
      pops.push({ x: c.x + (Math.random() - 0.5) * 120, y: c.y - 120, t: 0, text: '+' + n + ' ' + ROOM_TYPES[r.type].icon });
    }
  }
  for (const p of pops) p.t += dt;
  while (pops.length && pops[0].t > 1.4) pops.shift();
  for (const d of B.ducks) {
    const w = duckPos(d), s = spotFor(d);
    const dx = s.x - w.x, dy = s.y - w.y, dist = Math.hypot(dx, dy);
    if (dist > 4) {
      const v = Math.min(dist, 260 * dt);
      w.x += dx / dist * v; w.y += dy / dist * v;
      w.walking = true; w.dx = dx; w.dy = dy;
    } else { w.walking = false; w.x = s.x; w.y = s.y; }
  }
  if (typeof startDefense === 'function' && Date.now() >= B.nextAttack && state === 'base') { closeSheet(); startDefense(true); return; }
  baseTimer += dt;
  if (baseTimer > 1) { baseTimer = 0; persist(); renderBaseHud(); }
}
let baseTimer = 0;

// ---------- drawing ----------
function drawDiamond(c, fill, stroke) {
  const a = w2s(c.x, c.y - ROOM_HH), b = w2s(c.x + ROOM_HW, c.y), d = w2s(c.x, c.y + ROOM_HH), e = w2s(c.x - ROOM_HW, c.y);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]); }
}
function drawDuck(d) {
  const w = duckPos(d), r = roomAt(d.slot), p = w2s(w.x, w.y);
  const h = DUCK_H * cam.z, t = performance.now() / 1000 + d.id * 0.37;
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.22, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  if (w.walking) {
    const back = w.dy < 0, name = back ? 'duck_walk_back' : 'duck_walk_front';
    if (ready(IMG[name])) drawFrame(name, Math.floor(t * 10), p.x, p.y, h, w.dx < 0);
    return;
  }
  const anim = r ? ROOM_TYPES[r.type].work : 'duck_idle';
  if (anim === 'duck_sleep' && ready(IMG.duck_sleep)) drawFrame('duck_sleep', Math.floor(t * 1.2), p.x, p.y + h * 0.1, h * 0.95, d.id % 2 === 0);
  else if ((anim === 'duck_cook' || anim === 'duck_hammer') && ready(IMG[anim])) drawFrame(anim, Math.floor(t * 6), p.x + h * 0.2, p.y, h * 1.12, false);
  else if (anim === 'duck_shoot' && ready(IMG.duck_shoot)) drawFrame('duck_shoot', Math.floor(t * 5), p.x, p.y, h);
  else if (ready(IMG.duck_idle)) drawFrame('duck_idle', Math.floor(t * 4), p.x, p.y, h, w.flip);
}
function drawBase() {
  // ground
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#5f7d3a'); g.addColorStop(1, '#3d5a26');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // fence/yard outline around all plots
  ctx.save(); ctx.globalAlpha = 0.25;
  for (let s = 0; s < BASE_COLS * BASE_ROWS; s++) drawDiamond(slotCenter(s), '#2e4420');
  ctx.restore();
  // plots back-to-front
  const order = [];
  for (let s = 0; s < BASE_COLS * BASE_ROWS; s++) order.push(s);
  order.sort((a, b) => slotCenter(a).y - slotCenter(b).y);
  for (const s of order) {
    const c = slotCenter(s), r = roomAt(s);
    if (!r) {
      drawDiamond(c, 'rgba(120,90,50,.45)', 'rgba(255,255,255,.55)');
      const p = w2s(c.x, c.y);
      ctx.font = `900 ${Math.max(14, 46 * cam.z)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText('＋ สร้าง', p.x, p.y);
      continue;
    }
    const img = IMG[ROOM_TYPES[r.type].img];
    if (ready(img)) {
      const p = w2s(c.x - ROOM_IMG_CX, c.y - ROOM_IMG_CY);
      ctx.drawImage(img, p.x, p.y, img.naturalWidth * cam.z, img.naturalHeight * cam.z);
    } else drawDiamond(c, '#8a6a40');
    if (bsel === s) { ctx.save(); ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 150) * 0.2; drawDiamond(c, null, '#ffd84a'); ctx.restore(); }
    // ducks of this room, back to front
    const here = B.ducks.filter(d => { const w = duckPos(d); return !w.walking && d.slot === s; });
    here.sort((a, b) => duckPos(a).y - duckPos(b).y).forEach(drawDuck);
    // label
    const side = s % 2 ? 1 : -1;
    const lp = w2s(c.x + side * ROOM_HW * 0.62, c.y + ROOM_HH * 0.3);
    const txt = `${ROOM_TYPES[r.type].icon} ${ROOM_TYPES[r.type].name} Lv.${r.lvl}`;
    ctx.font = `800 ${Math.max(11, 30 * cam.z)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const tw = ctx.measureText(txt).width + 12;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; roundRect(lp.x - tw / 2, lp.y - 2, tw, Math.max(15, 38 * cam.z), 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, lp.x, lp.y + 1);
  }
  // walking ducks on top
  B.ducks.filter(d => duckPos(d).walking).sort((a, b) => duckPos(a).y - duckPos(b).y).forEach(drawDuck);
  // production pops
  for (const p of pops) {
    const s = w2s(p.x, p.y - p.t * 90);
    ctx.globalAlpha = Math.max(0, 1 - p.t / 1.4);
    ctx.font = `900 ${Math.max(14, 40 * cam.z)}px system-ui,sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.strokeText(p.text, s.x, s.y);
    ctx.fillStyle = '#b8ff8a'; ctx.fillText(p.text, s.x, s.y);
    ctx.globalAlpha = 1;
  }
}

// ---------- input: pan, pinch, tap ----------
let bsel = -1;
const ptrs = new Map();
let panStart = null, moved = 0, pinch0 = 0, zoom0 = 1;
cv.addEventListener('pointerdown', e => {
  if (state !== 'base') return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  moved = 0;
  if (ptrs.size === 1) panStart = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = cam.z; }
});
window.addEventListener('pointermove', e => {
  if (state !== 'base' || !ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    cam.z = Math.max(0.15, Math.min(1.2, zoom0 * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch0)));
    moved = 99;
  } else if (panStart) {
    const dx = e.clientX - panStart.x, dy = e.clientY - panStart.y;
    moved = Math.max(moved, Math.hypot(dx, dy));
    cam.x = panStart.cx - dx / cam.z; cam.y = panStart.cy - dy / cam.z; clampCam();
  }
});
function endPtr(e) {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (state === 'base' && ptrs.size === 0 && moved < 8) tapBase(e.clientX, e.clientY);
  if (ptrs.size === 0) panStart = null;
}
window.addEventListener('pointerup', endPtr);
window.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); panStart = null; });
cv.addEventListener('wheel', e => { if (state === 'base') { cam.z = Math.max(0.15, Math.min(1.2, cam.z * (e.deltaY < 0 ? 1.1 : 0.9))); e.preventDefault(); } }, { passive: false });

function tapBase(x, y) {
  const w = s2w(x, y);
  for (let s = BASE_COLS * BASE_ROWS - 1; s >= 0; s--) {
    if (inDiamond(w.x, w.y, s)) { SFX.init(); SFX.play('click'); bsel = s; openSheet(s); return; }
  }
  closeSheet();
}

// ---------- UI ----------
const $ = id => document.getElementById(id);
function fmt(n) { return Math.floor(n).toLocaleString(); }
function renderBaseHud() {
  const cap = capOf();
  $('bFood').textContent = fmt(B.food) + '/' + cap;
  $('bMat').textContent = fmt(B.mat) + '/' + cap;
  $('bCoin').textContent = fmt(save.coins);
  $('bPop').textContent = B.ducks.length + '/' + popCap();
  const left = Math.max(0, Math.round((B.nextAttack - Date.now()) / 1000));
  $('defSub').textContent = `คืนที่ ${B.day} • แมวบุกใน ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  $('raidSub').textContent = `บุกปราสาทแมว • ใช้ 🍗${raidFood(save.level)}`;
  if (bsel >= 0 && !$('sheet').classList.contains('hidden')) openSheet(bsel, true);
  else if (shopOpen) { const st = $('sheet').scrollTop; openShop(); $('sheet').scrollTop = st; }
}
let shopOpen = false;
function closeSheet() { bsel = -1; shopOpen = false; $('sheet').classList.add('hidden'); }
function openShop() {
  bsel = -1; shopOpen = true;
  const body = $('sheetBody'); body.innerHTML = '';
  $('sheetTitle').textContent = '🏹 ร้านอาวุธ';
  armorySheet(body);
  $('sheet').classList.remove('hidden');
}
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hidden'), 1800);
}
function btn(label, sub, ok, fn) {
  const b = document.createElement('button');
  b.className = 'sbtn' + (ok ? '' : ' off');
  b.innerHTML = `<b>${label}</b>${sub ? `<small>${sub}</small>` : ''}`;
  b.onclick = e => { e.stopPropagation(); if (!ok) { SFX.play('gateBad'); return; } SFX.play('click'); const st = $('sheet').scrollTop; fn(); renderBaseHud(); persist(); $('sheet').scrollTop = st; };
  return b;
}
function freeDuck() {
  // a duck resting in a bedroom is free to be assigned
  return B.ducks.find(d => { const r = roomAt(d.slot); return r && r.type === 'bedroom'; });
}
function bedroomWithSpace() {
  return roomsOf('bedroom')[0];
}
function openSheet(s, refresh) {
  const sh = $('sheet'), body = $('sheetBody'), r = roomAt(s);
  body.innerHTML = '';
  if (!r) {
    $('sheetTitle').textContent = 'สร้างห้องใหม่';
    for (const [k, T] of Object.entries(ROOM_TYPES)) {
      const c = buildCost(k);
      body.appendChild(btn(`${T.icon} ${T.name}`, `${T.desc} • ⚙️${c}`, B.mat >= c, () => {
        B.mat -= c; B.rooms.push({ slot: s, type: k, lvl: 1 }); SFX.play('gateGood');
        toast(`สร้าง${T.name}แล้ว!`); openSheet(s);
      }));
    }
  } else {
    const T = ROOM_TYPES[r.type], n = workersIn(s).length, uc = upgradeCost(r);
    $('sheetTitle').textContent = `${T.icon} ${T.name} Lv.${r.lvl}`;
    const info = document.createElement('div'); info.className = 'sinfo';
    if (r.type === 'kitchen' || r.type === 'workshop') info.textContent = `${T.desc} • คนงาน ${n}/${T.slots} • ${(rate(r) * 60).toFixed(0)} ${T.icon}/นาที`;
    else if (r.type === 'armory') info.textContent = `${T.desc} • ทหารฝึก ${n}/${T.slots} • ออกรบได้ทัพเสริม +${armyBonus()}`;
    else if (r.type === 'bedroom') info.textContent = `${T.desc} • เป็ดทั้งฐาน ${B.ducks.length}/${popCap()} • นอนพักอยู่ ${n} ตัว`;
    else info.textContent = `${T.desc} • ความจุตอนนี้ ${capOf()}`;
    body.appendChild(info);
    if (T.slots) {
      const fd = freeDuck();
      body.appendChild(btn('➕ ส่งเป็ดมาทำงาน', fd ? 'ดึงเป็ดที่นอนพักอยู่' : 'ไม่มีเป็ดว่าง', !!fd && n < T.slots, () => { fd.slot = s; }));
      body.appendChild(btn('➖ ให้เป็ดไปพัก', 'กลับห้องนอน', n > 0 && !!bedroomWithSpace(), () => { workersIn(s)[n - 1].slot = bedroomWithSpace().slot; }));
    }
    if (r.type === 'armory' && typeof armorySheet === 'function') armorySheet(body);
    if (r.type === 'bedroom') {
      const cost = 25 + B.ducks.length * 8;
      body.appendChild(btn('🐤 รับเป็ดใหม่', `🍗${cost}`, B.food >= cost && B.ducks.length < popCap(), () => {
        B.food -= cost; B.ducks.push({ id: B.nextId++, slot: s }); SFX.play('quack'); toast('มีเป็ดตัวใหม่มาอยู่ฐาน!');
      }));
    }
    body.appendChild(btn('⬆️ อัปเกรด', `⚙️${uc.mat} 🪙${uc.coins}`, r.lvl < 10 && B.mat >= uc.mat && save.coins >= uc.coins, () => {
      B.mat -= uc.mat; save.coins -= uc.coins; r.lvl++; SFX.play('gateGood'); toast(`${T.name} Lv.${r.lvl}!`);
    }));
  }
  sh.classList.remove('hidden');
}

// ---------- flow between base and raids ----------
function enterBase() {
  if (typeof D !== 'undefined') D = null;
  state = 'base';
  hide('menu'); hide('result'); show('baseUi');
  closeSheet();
  renderBaseHud();
  if (B.offline) { toast(`ระหว่างที่ไม่อยู่ เป็ดทำงานไป ${Math.round(B.offline / 60)} นาที`); B.offline = 0; }
}
function openRaid() {
  SFX.init(); SFX.play('click');
  hide('baseUi'); closeSheet();
  if (typeof D !== 'undefined') D = null;
  state = 'menu'; bsel = -1;
  renderMenu(); preview(); show('menu');
}
$('raidBtn').onclick = openRaid;
$('homeBtn').onclick = () => { SFX.play('click'); enterBase(); };
$('sheetClose').onclick = closeSheet;
$('shopBtn').onclick = () => { SFX.init(); SFX.play('click'); openShop(); };

enterBase();
