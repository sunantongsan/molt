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
  { id: 'egg',    name: 'ไข่ดาวแฟลช',   icon: '🥚', dmg: 1.2, rate: 0.55, range: 7, speed: 9, splash: 1.5, arc: true, cost: 550 },
  { id: 'coffee', name: 'เป็ดชงกาแฟ',   icon: '☕', dmg: 0, rate: 0, range: 0, speed: 1, support: true, cost: 600 },
  { id: 'storm',  name: 'ตะกร้อไฟฟ้า', icon: '⚡', dmg: 2.2, rate: 0.9,  range: 7.5, speed: 22, chain: 2, cost: 650 },
  { id: 'pan',    name: 'กระทะบูมเมอแรง', icon: '🍳', dmg: 2.4, rate: 0.7, range: 7, speed: 9, pierce: true, cost: 750 },
  { id: 'cannon', name: 'หม้อหุงข้าว', icon: '🍙', dmg: 9,   rate: 0.33, range: 9,   speed: 9,  splash: 1.8, arc: true, cost: 800 },
  { id: 'stove',  name: 'เตาพ่นไฟ',     icon: '🔥', dmg: 0.55, rate: 6, range: 3.2, speed: 6, splash: 0.7, cost: 850 },
  { id: 'fish',   name: 'น้ำปลาพิษ',     icon: '🐟', dmg: 1.2, rate: 0.45, range: 7, speed: 8, arc: true, pool: true, cost: 900 },
  { id: 'melon',  name: 'แตงโมระเบิด',  icon: '🍉', dmg: 7, rate: 0.4, range: 8, speed: 7, splash: 1.6, arc: true, cost: 1000 },
  { id: 'roller', name: 'ไม้นวดแป้งกลิ้ง', icon: '🪵', dmg: 3, rate: 0.35, range: 9, speed: 6, pierce: true, cost: 1100 },
];
for (const w of WEAPONS) { w.range *= 1.8; w.speed *= 1.6; }   // long lane: throw far
const WEAPON = Object.fromEntries(WEAPONS.map(w => [w.id, w]));
// kitchen look: what each duck holds, and what flies through the air
const HELD = { camp: null, egg: null, coffee: 'it_soup', stove: null, fish: 'it_sauce', roller: null, pan: 'it_pan', melon: null, bow: 'it_chopsticks', xbow: 'it_fork', fire: 'it_sauce', ice: 'it_icepop', triple: 'it_chopsticks', storm: 'it_whisk', cannon: 'it_ricecooker' };
const AMMO = { pan: 'it_pan', bow: 'it_chopsticks', xbow: 'it_fork', fire: 'it_chili', ice: 'it_icepop', triple: 'it_chopsticks', storm: 'it_whisk', cannon: 'it_riceball' };
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
const WCOL = { camp: '#8a9a6a', egg: '#fff6c0', coffee: '#c08a5a', stove: '#ff8a2a', fish: '#9be36a', roller: '#e0b07a', pan: '#e6e6f5', melon: '#ff5a6a', seed: '#ff5a6a', bow: '#ffe27a', xbow: '#d8f4ff', fire: '#ff8a2a', ice: '#9fe8ff', triple: '#ffe27a', storm: '#c8b6ff', cannon: '#ffb347' };
// special powers unlocked at Lv5 and Lv10
const PERKS = {
  bow:    ['พุ่งทีละ 2 คู่', 'จิ้มคริติคอล 25% (x2)'],
  xbow:   ['แทงแมวกระเด็นถอยหลัง', 'คริติคอล 30% (x2.5)'],
  fire:   ['เผ็ดไหม้ต่อเนื่อง', 'สาดวงกว้าง'],
  ice:    ['เย็นเจี๊ยบเป็นวง', 'แช่แข็งจนหยุดนิ่ง'],
  triple: ['พุ่งทีละ 5 คู่', 'พุ่งทีละ 7 คู่'],
  storm:  ['ไฟช็อตกระโดด 4 ตัว', 'ไฟช็อตกระโดด 6 ตัว'],
  cannon: ['ข้าวเหนียวติดหนึบจนมึน', 'ข้าวเหนียวลูกยักษ์ + มึนนาน'],
  pan:    ['บินกลับมาตีซ้ำขากลับ', 'กระทะยักษ์ แรง x1.5'],
  melon:  ['แตกเป็นเมล็ดระเบิด 3 ลูก', 'เมล็ด 6 ลูก + น้ำแตงโมลื่นทำแมวช้า'],
  egg:    ['แฟลชนานขึ้น (มึน 1.6 วิ)', 'แฟลชวงยักษ์'],
  coffee: ['แท่นข้างๆ ยิงเร็วขึ้น 45%', 'เร็วขึ้น 60% + สาดกาแฟร้อนใส่แมว'],
  stove:  ['ไฟกว้างเป็นกรวย 3 สาย', 'ไฟสีฟ้า ร้อนกว่า x1.5'],
  fish:   ['แอ่งใหญ่ขึ้น อยู่นานขึ้น', 'กลิ่นแรง! แมวในแอ่งเดินช้า'],
  roller: ['ไม้ใหญ่ขึ้น กวาดกว้าง', 'กลิ้งทีละ 2 อัน'],
};
function perkLv(p) { return p.lvl >= 10 ? 2 : p.lvl >= 5 ? 1 : 0; }
WEAPON.bomb = { speed: 1, range: 0 };

// ---------- save ----------
// lane layout (like a zombie-defense game): y grows downward on screen
const SLOTS = 5, SLOT_X = [-3.6, -1.8, 0, 1.8, 3.6], PLAT_Y = 1.0, FENCE_Y = 0, HOUSE_Y = 5.0, HOUSE_R = 1.0;
const NWALL = 5, WALL_W = 1.84, FIELD_X = 4.5, SPAWN_Y = -21;
const RING = 4.4, PLAT_R = 2.75;   // old ring sizes, only used by leftover fallback drawing
function wallX(i) { return (i - (NWALL - 1) / 2) * WALL_W; }
if (!save.td) save.td = {
  wave: 1, house: 1, fence: 1, bomb: 1,
  plats: [{ slot: 2, w: 'bow', lvl: 1 }, { slot: 6, w: 'bow', lvl: 1 }],
};
const T = save.td;
// leader duck upgrades (ladle damage, speed, coin magnet) and coins already paid into each buy pad
if (!T.lead) T.lead = { atk: 1, spd: 1, mag: 1 };
if (!T.pads) T.pads = {};
if (T.traps === undefined) T.traps = 2;
if (!T.camps) T.camps = [null, null];
const LEAD_R = RING + 2.2;
function leadSpeed() { return 3.2 + (T.lead.spd - 1) * 0.35; }
function leadMag() { return 0.9 + (T.lead.mag - 1) * 0.35; }
function leadDmg() { return 1 + (T.lead.atk - 1) * 0.8; }
function platAt(s) { return T.plats.find(p => p.slot === s); }
function platPos(s) { return { x: SLOT_X[s] || 0, y: PLAT_Y }; }
// two tent spots for the duck soldiers, on the open floor either side of the house
const CAMP_POS = [{ x: -2.55, y: HOUSE_Y - 1.05 }, { x: 2.55, y: HOUSE_Y - 1.05 }];
for (const p of T.plats.filter(p => p.w === 'camp')) { const i = T.camps.findIndex(c => !c); if (i >= 0) T.camps[i] = { lvl: p.lvl }; }
T.plats = T.plats.filter(p => p.w !== 'camp');
// old saves had 8 ring slots: keep the best platforms and give them the new row slots
if (T.plats.some(p => p.slot >= SLOTS) || T.plats.length > SLOTS) {
  T.plats.sort((a, b) => b.lvl - a.lvl); T.plats = T.plats.slice(0, SLOTS); T.plats.forEach((p, i) => p.slot = i); T.pads = {};
}
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
function baseY() { return H - 150 - (HOUSE_Y + 0.6) * dk * 0.62; }
function dproj(x, y) { return { x: W / 2 + (x - camX) * dk, y: baseY() + (y - camY) * dk * 0.62 }; }
function dinv(sx, sy) { return { x: (sx - W / 2) / dk + camX, y: (sy - baseY()) / (dk * 0.62) + camY }; }
function camFollow(dt) { camX = 0; camY = 0; }
function camFollowOld(dt) {
  const L = D.lead, mx = Math.max(0, LEAD_R + 0.6 - W / 2 / dk), my = Math.max(0, (LEAD_R + 0.8) - H * 0.4 / (dk * 0.62));
  const tx = Math.max(-mx, Math.min(mx, L.x)), ty = Math.max(-my, Math.min(my, L.y * 0.6));
  const k = Math.min(1, dt * 4); camX += (tx - camX) * k; camY += (ty - camY) * k;
}

function freshField() {
  dk = Math.min(W / 9.6, H / 15);
  D = {
    phase: 'build', t: 0, houseHp: houseMax(), houseMax: houseMax(), bombCd: 0, shake: 0,
    walls: Array.from({ length: NWALL }, (_, i) => ({ i, x: wallX(i), a: i, hp: wallMax(), max: wallMax(), hit: 0 })),
    shooters: new Map(),   // slot -> {cd, aimDx, aimDy, shootT}
    cats: [], shots: [], fx: [], floats: [], queue: [], banner: 0, killed: 0, earned: 0,
    parts: [], coins: [], revived: false, hudPulse: 0, seen: {}, bolts: [],
    drops: [], pools: [], traps: [], troops: [], campT: {}, trapMode: false,                                   // coins lying on the ground for the leader to pick up
    lead: { x: -1.8, y: 3.4, face: 1, walkT: 0, moving: false, atkCd: 0, swingT: 0, hurtT: 0, happyT: 0 },
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
  D.phase = 'wave'; D.t = 0; D.banner = 2.5; D.bossBanner = false; D.bannerTxt = null; D.eshots = []; D.slowT = 0; D.killed = 0; D.earned = 0; D.revived = false;
  D.queue = buildWave(T.wave);
  D.total = D.queue.length;
  // new faces today? the cat king shows them off first
  if (!save.seenKinds) save.seenKinds = [];
  const fresh = [];
  for (const e of D.queue) { const k = e.boss ? 'boss' : e.kind || 'cat'; if (!save.seenKinds.includes(k) && !fresh.includes(k)) fresh.push(k); }
  if (fresh.length) { D.phase = 'intro'; D.intro = { list: fresh, i: 0, t: 0 }; D.banner = 0; SFX.play('bossRoar'); }
  renderTdHud();
}
const INTRO_LINES = {
  cat:    ['ทหารหม้อ', 'ฮ่าๆๆ เป็ดน้อย! เจอกองทัพหม้อของข้าซะ!'],
  tray:   ['แมวหมวกถาด', 'หมวกถาดกับฝาหม้อ! ของที่เจ้าโยนลงมาจากฟ้าเด้งหมด!'],
  ninja:  ['นินจาผ้าแดง', 'นินจาของข้าวิ่งเร็วกว่าตะเกียบเจ้าซะอีก!'],
  knight: ['อัศวินแดง', 'อัศวินแดงของข้ามีโล่ด้วยนะ จะปาอะไรก็ปามา!'],
  cart:   ['รถยิงพริก', 'รถยิงพริก! จะยิงลูกน้องข้าข้ามรั้วไปถึงบ้านเจ้าเลย!'],
  tank:   ['เกราะซึ้งนึ่ง', 'เกราะซึ้งนึ่ง! ทนยิ่งกว่าหม้อหุงข้าวของเจ้าอีก!'],
  shadow: ['นินจาเงา', 'นินจาเงา... เจ้าจะไม่มีวันปาโดนมันหรอก!'],
  healer: ['พ่อครัวต้มยำ', 'ต้มยำร้อนๆ! ลูกน้องข้าจะไม่มีวันหมดแรง!'],
  steel:  ['เกราะเหล็กล้วน', 'เกราะเหล็กทั้งตัว! ไหนลองปามาสิ ฮ่าๆ!'],
  glider: ['ร่มฝาชี', 'ร่มฝาชี! กระโดดข้ามรั้วเจ้าได้สบายๆ!'],
  pitcher: ['แมวปาลูกชิ้น', 'มือปาลูกชิ้นของข้า! ปาโดนหัวเป็ดทีเดียวมึนเลย!'],
  boxer:  ['แมวนักมวย', 'นักมวยถุงมือร้อน! หมัดเดียวรั้วกระจุย!'],
  chief:  ['รองหัวหน้า แมวเชฟ', 'มือขวาของข้า! กระทะเขาฟาดทีเดียวรั้วพัง!'],
  boss:   ['ราชาแมว', 'ข้าเอง! ราชาแมว!! วันนี้ข้าจะลงสนามเองโว้ย!!'],
};
function catIntroNext() {
  const I = D.intro; if (!I) return;
  const line = INTRO_LINES[I.list[I.i]] || ['', ''];
  if (I.t < line[1].length / 26 + 0.3) { I.t = line[1].length / 26 + 0.3; return; }   // finish typing first
  if (!save.seenKinds.includes(I.list[I.i])) save.seenKinds.push(I.list[I.i]);
  I.i++; I.t = 0; SFX.play('click');
  if (I.i >= I.list.length) { D.intro = null; D.phase = 'wave'; D.t = 0; D.banner = 2.5; SFX.play('horn'); persist(); renderTdHud(); }
  else SFX.play('bossRoar');
}
function catIntroUpdate(dt) {
  const I = D.intro; if (!I) return;
  const prev = I.t; I.t += dt;
  if (prev < 0.9 && I.t >= 0.9) SFX.play('quack');
  const line = INTRO_LINES[I.list[I.i]] || ['', ''];
  if (I.t > line[1].length / 26 + 3.2) catIntroNext();
}
function drawCatIntro() {
  const I = D.intro; if (!I) return;
  const kind = I.list[I.i], line = INTRO_LINES[kind] || [kind, ''], t = I.t, now = performance.now() / 1000;
  const fade = Math.min(1, t * 4);
  ctx.save();
  // dark stage with letterbox bars
  ctx.globalAlpha = 0.72 * fade; ctx.fillStyle = '#1a1020'; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1; ctx.fillStyle = '#000'; const bar = H * 0.09 * Math.min(1, t * 3); ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
  // spotlight on the new cat
  const cx = W * 0.68, cy = H * 0.5, sh = Math.min(W, H) * 0.32;
  const sp = ctx.createRadialGradient(cx, cy - sh * 0.4, 10, cx, cy - sh * 0.4, sh * 1.2); sp.addColorStop(0, 'rgba(255,240,180,.45)'); sp.addColorStop(1, 'rgba(255,240,180,0)');
  ctx.fillStyle = sp; ctx.beginPath(); ctx.arc(cx, cy - sh * 0.4, sh * 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,180,.25)'; ctx.beginPath(); ctx.ellipse(cx, cy + 4, sh * 0.5, sh * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  // the new cat slides in and poses
  const inK = Math.min(1, t / 0.5), ex = cx + (1 - inK) * W * 0.5, pose = Math.abs(Math.sin(now * 3)) * 6;
  const fake = { kind, gear: kind === 'boss' ? null : catGear(kind === 'boss' ? 'cat' : kind), hp: 1, max: 1, st: 'walk', mx: 0, my: 1, ph: 0, hitT: 0, stun: 0, atk: 0, x: 0, y: 0, trayHp: kind === 'tray' ? 4 : 0, boss: kind === 'boss' };
  if (!I.gear || I.gearFor !== kind) { I.gear = fake.gear; I.gearFor = kind; } fake.gear = I.gear;
  if (kind === 'boss') { if (ready(IMG.k_king_act)) drawFrame('k_king_act', Math.floor(now * 3) % 2, ex, cy - pose, sh * 1.4, false); else if (ready(IMG.boss_attack)) drawFrame('boss_attack', Math.floor(now * 3) % 2, ex, cy - pose, sh * 1.4, true); }
  else if (kind === 'cart') drawCart(fake, { x: ex, y: cy - pose }, sh * 0.9);
  else if (OLD_IMG[kind]) drawFrame(OLD_IMG[kind], Math.floor(now * 6) % 4, ex, cy - pose, sh * 0.85, false);
  else drawKitchenCat(fake, ex, cy - pose, sh * (kind === 'chief' ? 1.0 : 0.85), false, 0, now);
  // name card
  if (t > 0.4) {
    const pop = Math.min(1, (t - 0.4) * 5);
    ctx.save(); ctx.translate(cx, cy + sh * 0.32); ctx.scale(pop, pop);
    ctx.font = '900 20px Mitr,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(line[0]).width + 30;
    ctx.fillStyle = '#d8352a'; roundRect(-tw / 2, -18, tw, 36, 10); ctx.fill(); ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(line[0], 0, 1);
    ctx.font = '800 11px Mitr,system-ui,sans-serif'; ctx.fillStyle = '#ffd84a'; ctx.fillText(kind === 'boss' ? '👑 บอส' : kind === 'chief' ? '⭐ รองหัวหน้า' : '🆕 ศัตรูใหม่', 0, -28);
    ctx.restore();
  }
  // the cat king on the left, bouncing as he gloats (when he is not the one on show)
  const kx = W * 0.2, ky = H * 0.42, talk = Math.abs(Math.sin(now * 9)) * 4;
  const KW = ready(IMG.k_king_walk) ? 'k_king_walk' : 'boss_walk';
  if (kind !== 'boss' && ready(IMG[KW])) { ctx.save(); ctx.translate(kx, ky); ctx.scale(1 + talk * 0.004, 1 - talk * 0.004); drawFrame(KW, 0, 0, 0, sh * 0.95, false); ctx.restore(); }
  // speech bubble with typed text
  const shown = line[1].slice(0, Math.floor(t * 26)), bx = W * 0.05, by = H * 0.13, bw = W * 0.9;
  ctx.font = '800 17px Mitr,system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const lines = []; let cur = '';
  for (const ch of shown) { if (ctx.measureText(cur + ch).width > bw - 28) { lines.push(cur); cur = ''; } cur += ch; } lines.push(cur);
  const bh = 22 + Math.max(2, lines.length) * 24;
  ctx.fillStyle = '#fffaf0'; roundRect(bx, by, bw, bh, 16); ctx.fill(); ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx + bw * 0.18, by + bh - 1); ctx.lineTo(bx + bw * 0.14, by + bh + 22); ctx.lineTo(bx + bw * 0.28, by + bh - 1); ctx.closePath(); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a2a1a'; lines.forEach((l, i) => ctx.fillText(l, bx + 14, by + 12 + i * 24));
  ctx.font = '900 12px Mitr,system-ui,sans-serif'; ctx.fillStyle = '#d8352a'; ctx.fillText('ราชาแมว:', bx + 14, by - 16);
  // a scared duck at the bottom
  if (t > 0.9 && ready(IMG.k_duck_act)) {
    const dx = W * 0.22 + Math.sin(now * 40) * 2, dy = H * 0.82;
    drawFrame('k_duck_act', 2, dx, dy, sh * 0.6, false);
    // (the scared duck just quacks: sound, no text)
  }
  // footer
  ctx.font = '700 12px Mitr,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.fillText(`แตะเพื่อไปต่อ  ${I.i + 1}/${I.list.length}`, W / 2, H - bar / 2);
  ctx.restore();
}
// enemy roster: new kinds join as the waves go on (kitchen cats + the old armoured cats)
const CAT_KINDS = {
  cat:    { from: 1, w: 10, hp: 1,   v: 1,    size: 1.1,  name: 'แมวหม้อ' },
  ninja:  { from: 3, w: 5,  hp: 0.6, v: 1.9,  size: 1.0,  name: '🥷 แมวนินจาผ้าแดงมาแล้ว! วิ่งเร็วมาก' },
  knight: { from: 4, w: 5,  hp: 1.8, v: 0.9,  size: 1.15, name: '⚔️ แมวอัศวินแดงมาแล้ว! มีโล่กันดาเมจนิดหน่อย' },
  tank:   { from: 6, w: 3,  hp: 3.2, v: 0.6,  size: 1.4,  name: '🛡️ แมวเกราะซึ้งนึ่งมาแล้ว! ทนมาก ใช้อาวุธแรงๆ' },
  shadow: { from: 7, w: 3,  hp: 0.8, v: 2.4,  size: 1.0,  name: '🗡️ แมวนินจาเงามาแล้ว! เร็วที่สุด หลบได้บางที' },
  steel:  { from: 9, w: 2,  hp: 5,   v: 0.5,  size: 1.45, name: '🪖 แมวเกราะเหล็กมาแล้ว! ทนสุดๆ ใช้หม้อหุงข้าว/ไฟช็อต' },
  tray:   { from: 2, w: 4,  hp: 1.2, v: 0.95, size: 1.1,  name: '🍽️ แมวถือถาดมาแล้ว! ถาดกันของที่ปาได้ 4 ที' },
  cart:   { from: 5, w: 2,  hp: 4,   v: 0.45, size: 1.7,  name: '🌶️ รถยิงพริกมาแล้ว! ยิงหินใส่รั้ว บางทียิงแมวข้ามรั้วมาเลย!' },
  healer: { from: 8, w: 2,  hp: 1.4, v: 0.85, size: 1.1,  name: '🍜 แมวพ่อครัวต้มยำมาแล้ว! ป้อนต้มยำฮีลเพื่อน รีบล้มก่อน' },
  pitcher: { from: 6, w: 2, hp: 1.1, v: 0.9, size: 1.05, name: 'แมวปาลูกชิ้น' },
  boxer:  { from: 7, w: 2,  hp: 2,   v: 1.0,  size: 1.15, name: 'แมวนักมวย' },
  glider: { from: 10, w: 3, hp: 1,   v: 1.05, size: 1.05, name: '🪂 แมวร่มกระชอนมาแล้ว! กระโดดข้ามรั้วได้' },
};
const OLD_IMG = { knight: 'k_knight', shadow: 'k_shadow', steel: 'k_steel' };
// what each kitchen cat wears and swings (the plain cats get a random silly outfit)
const HATS = ['it_pot', 'it_pot', 'it_colander', 'it_mortar'];
const WPNS = ['it_spatula', 'it_spatula', 'it_pestle', 'it_ladle'];
function catGear(kind) {
  const r = a => a[Math.floor(Math.random() * a.length)];
  if (kind === 'chief') return { hat: 'it_chefhat', wpn: 'it_pan' };
  if (kind === 'tank') return { hat: 'it_steamer', wpn: 'it_pan' };
  if (kind === 'ninja') return { hat: 'band', wpn: 'it_skewer' };
  if (kind === 'tray') return { hat: r(['tray', 'lid']), wpn: 'it_fork' };
  if (kind === 'healer') return { hat: 'it_chefhat', wpn: 'it_soup', apron: true };
  if (kind === 'glider') return { hat: 'it_foodcover', wpn: 'it_spatula' };
  if (kind === 'boxer') return { hat: 'band', wpn: 'it_mitt', mitts: true };
  if (kind === 'pitcher') return { hat: r(['it_pot', 'it_mortar']), wpn: 'it_skewer' };
  return { hat: r(HATS), wpn: r(WPNS) };
}
function drawHat(hat, x, y, size, rot) {
  if (hat === 'tray' || hat === 'lid') {
    // a flat tray / pot lid lying on the head: squash the front-view picture into an ellipse
    ctx.save(); ctx.translate(x, y + size * 0.22); ctx.rotate(rot || 0); ctx.scale(1, 0.36);
    drawItem(hat === 'tray' ? 'it_tray' : 'it_lid', 0, 0, size * 1.25); ctx.restore(); return;
  }
  if (hat === 'it_mortar') { drawItem('it_mortar', x, y + size * 0.12, size * 0.95, Math.PI + (rot || 0)); return; }   // upside-down mortar helmet
  if (hat === 'it_foodcover') { drawItem('it_foodcover', x, y + size * 0.05, size * 1.05, rot); return; }
  drawItem(hat, x, y, size, rot);
}
function pickKind(n) {
  const list = Object.entries(CAT_KINDS).filter(([, k]) => n >= k.from);
  let r = Math.random() * list.reduce((a, [, k]) => a + k.w, 0);
  for (const [id, k] of list) if ((r -= k.w) <= 0) return id;
  return 'cat';
}
const PATTERNS = {
  blob:   { from: 1, w: 6 },
  row:    { from: 2, w: 3, name: '➖ แมวเรียงหน้ากระดาน!' },
  column: { from: 2, w: 3, name: '⬇️ แมวเดินแถวเรียงหนึ่ง!' },
  zigzag: { from: 3, w: 2, name: '〰️ แมวเดินส่ายหลบ!' },
  v:      { from: 4, w: 2, name: '🔻 แมวจัดทัพรูปตัววี!' },
  flank:  { from: 5, w: 2, name: '↔️ แมวตีขนาบสองข้าง!' },
  rush:   { from: 6, w: 2, name: '💨 แมวบุกตะลุย!!' },
};
function pickPattern(n) {
  const list = Object.entries(PATTERNS).filter(([, p]) => n >= p.from);
  let r = Math.random() * list.reduce((a, [, p]) => a + p.w, 0);
  for (const [id, p] of list) if ((r -= p.w) <= 0) return id;
  return 'blob';
}
function buildWave(n) {
  const q = [];
  const groups = 4 + Math.floor(n * 1.0);
  const clampX = x => Math.max(-FIELD_X + 0.3, Math.min(FIELD_X - 0.3, x));
  let t = 0;
  for (let g = 0; g < groups; g++) {
    const side = (Math.random() * 2 - 1) * (FIELD_X - 0.8);      // group's x across the top
    const size = 4 + Math.floor(n * 1.6 + Math.random() * 4);
    let kind = pickKind(n);
    const pat = kind === 'cart' ? 'blob' : pickPattern(n);
    if (pat === 'rush' && CAT_KINDS[kind].v < 1) kind = Math.random() < 0.5 ? 'ninja' : 'cat';
    const K = CAT_KINDS[kind], hp = 2 + Math.floor(n / 2);
    let cnt = kind === 'cart' ? 1 : K.hp >= 3 ? Math.max(2, Math.ceil(size / 3)) : K.hp >= 1.5 ? Math.ceil(size * 0.6) : size;
    if (pat === 'rush') cnt = Math.ceil(cnt * 1.3);
    for (let i = 0; i < cnt; i++) {
      const e = { t: t + i * (K.v > 1.5 ? 0.22 : 0.35), a: clampX(side + (Math.random() - 0.5) * 2.2), hp, boss: false, kind, pat: i === 0 ? pat : null };
      const mid = (cnt - 1) / 2;
      if (pat === 'row') { e.t = t + Math.random() * 0.1; e.a = clampX(-FIELD_X + 0.5 + (2 * FIELD_X - 1) * (cnt > 1 ? i / (cnt - 1) : 0.5)); e.dy = (i % 2) * 0.5; }
      else if (pat === 'column') { e.t = t + i * 0.3; e.a = clampX(side); }
      else if (pat === 'zigzag') e.zig = 1;
      else if (pat === 'v') { e.t = t; e.a = clampX(side * 0.5 + (i - mid) * 0.55); e.dy = Math.abs(i - mid) * 0.7; }
      else if (pat === 'flank') { const L = i % 2 === 0; e.a = L ? -FIELD_X + 0.6 : FIELD_X - 0.6; e.t = t + Math.floor(i / 2) * 0.32; }
      else if (pat === 'rush') { e.t = t + i * 0.12; e.rush = true; }
      q.push(e);
    }
    t += Math.max(2.6, 6.5 - n * 0.25);
  }
  // the cat king shows up whenever he likes in boss waves (even first!), sometimes as a surprise in other waves
  if (n % 5 === 0) {
    q.push({ t: Math.random() * t, a: (Math.random() - 0.5) * 4, hp: 60 + n * 18, boss: true });
    if (n >= 15) q.push({ t: Math.random() * t, a: (Math.random() - 0.5) * 4, hp: 60 + n * 14, boss: true });
  } else {
    if (n >= 3) q.push({ t: Math.random() * t, a: (Math.random() - 0.5) * 4, hp: 18 + n * 7, boss: false, kind: 'chief' });
    if (n >= 8 && Math.random() < 0.15) q.push({ t: Math.random() * t, a: (Math.random() - 0.5) * 4, hp: 40 + n * 12, boss: true });
  }
  q.sort((x, y) => x.t - y.t);
  return q;
}
function spawnCatOrig(c) {
  const topY = Math.min(-8, dinv(0, 40).y - 1.2);
  const kind = c.kind || 'cat';
  const K = CAT_KINDS[kind];
  const hp = c.boss || kind === 'chief' ? c.hp : Math.max(1, Math.round(c.hp * K.hp + (K.hp >= 3 ? 4 : 0)));
  const v = 1.7 * (c.rush ? 1.45 : 1) * (c.boss ? 0.7 : kind === 'chief' ? 0.75 : K.v * (0.85 + Math.random() * 0.35));
  if (c.pat && PATTERNS[c.pat] && PATTERNS[c.pat].name && !D.seen['p_' + c.pat]) { D.seen['p_' + c.pat] = true; toast(PATTERNS[c.pat].name); }
  D.cats.push({ zig: c.zig || 0, gear: catGear(kind), trayHp: kind === 'tray' ? 4 : 0, coward: !c.boss && kind !== 'chief' && kind !== 'cart' && Math.random() < 0.015, x: c.a, y: topY - (c.dy || 0) - Math.random() * 0.6, sway: Math.random() * 9, hp, max: hp, boss: c.boss, kind,
    v, st: 'walk', atk: 0, ph: Math.random() * 9, hitT: 0, slow: 0, stun: 0, burn: 0 });
  if (kind === 'chief') SFX.play('bossRoar');
}
function spawnCat(c) {
  spawnCatOrig(c);
  if (c.boss) { SFX.play('bossRoar'); D.banner = 2.2; D.bossBanner = true; D.bannerTxt = null; D.zoomT = 1.2; D.shake = Math.max(D.shake, 0.4); }
}
function wallFor(c) {
  return D.walls[Math.max(0, Math.min(NWALL - 1, Math.round(c.x / WALL_W + (NWALL - 1) / 2)))];
}
const HOUSE_TY = HOUSE_Y - 0.9;    // where cats stand to hit the house

// ---------- update ----------
function tdUpdate(dt) {
  if (!D) return;
  fitField();
  // slow motion after a big kill
  if (D.slowT > 0) { D.slowT -= dt; dt *= D.slowT > 0.25 ? 0.22 : 0.6; }
  if (D.phase === 'intro') { catIntroUpdate(dt); return; }
  if (D.hitStop > 0) { D.hitStop -= dt; return; }
  if (D.zoomT > 0) D.zoomT -= dt;
  if (D.flinchT > 0) D.flinchT -= dt;
  D.t += dt; D.banner -= dt;
  for (const p of T.plats) { const o = shooter(p.slot); o.arrive = Math.max(0, o.arrive - dt); }
  if (D.phase === 'wave' || D.phase === 'build' || D.phase === 'victory') leadUpdate(dt);
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
      const wall = wallFor(c), past = c.y > FENCE_Y - 0.2;
      if (c.st === 'flee') {
        // run back up the lane fast, then turn around and come again
        c.fleeT += dt; c.y -= c.v * 3.2 * sdt; c.mx = 0; c.my = -1;
        // weave and shove through the crowd on the way out
        c.x += Math.sin(c.fleeT * 11) * 2.2 * sdt;
        for (const o of D.cats) if (o !== c && o.hp > 0 && o.st !== 'flee' && Math.abs(o.x - c.x) < 0.5 && Math.abs(o.y - c.y) < 0.45) {
          const side = o.x >= c.x ? 1 : -1; o.x += side * 0.45; o.hitT = 0.15; o.y += 0.1;
          if (!o.shoved && Math.random() < 0.35) { o.shoved = true; SFX.play('catHurt'); }
        }
        if (c.y < dinv(0, 40).y - 0.5) { c.st = 'walk'; SFX.play('meow'); }
        continue;
      }
      // soup cook: feeds tom yum to friends nearby
      if (c.kind === 'healer') {
        c.healT = (c.healT === undefined ? 2 : c.healT) - sdt;
        if (c.healT <= 0) { c.healT = 2.2; let n = 0;
          for (const o of D.cats) if (o !== c && o.hp > 0 && o.hp < o.max && !o.boss && Math.hypot(o.x - c.x, o.y - c.y) < 2.4) { const add = Math.max(1, Math.round(o.max * 0.2)); o.hp = Math.min(o.max, o.hp + add); n++; D.floats.push({ x: o.x, y: o.y - 0.4, t: 0, text: '+' + add, color: '#7dff8a', small: true }); }
          if (n) addFx('ring', c.x, c.y, '#7dff8a'); }
      }
      if (c.st === 'jump') {
        // glider hops over the fence under its colander
        c.jt += sdt; const u = Math.min(1, c.jt / 0.9);
        c.y = c.jy0 + (FENCE_Y + 0.9 - c.jy0) * u; c.jh = Math.sin(u * Math.PI) * 1.8; c.mx = 0; c.my = 1;
        if (u >= 1) { c.st = 'walk'; c.jumped = true; c.jh = 0; addFx('poof', c.x, c.y, '#ffffff'); }
        continue;
      }
      if (c.st === 'pitch') {
        c.fireT -= sdt; c.mx = 0; c.my = 1;
        if (c.fireT <= 0) { c.fireT = 2.4 + Math.random(); c.atk = 0.6; pitchSkewer(c); }
        c.atk = Math.max(0, (c.atk || 0) - sdt);
        continue;
      }
      if (c.st === 'siege') {
        // catapult cart: lob rocks / chillies at the fence or house, sometimes a whole cat over the fence
        c.fireT -= sdt; c.recoil = Math.max(0, (c.recoil || 0) - dt);
        if (c.fireT <= 0) { c.fireT = 3 + Math.random() * 1.5; c.recoil = 0.35; cartFire(c); }
        continue;
      }
      if (c.st === 'walk') {
        if (c.kind === 'glider' && !c.jumped && !past && c.y >= FENCE_Y - 0.75) { c.st = 'jump'; c.jt = 0; c.jy0 = c.y; SFX.play('meow'); continue; }
        if (c.kind === 'cart' && c.y >= -6.5) { c.st = 'siege'; c.fireT = 1.2; continue; }
        if (c.kind === 'pitcher' && c.y >= -5) { c.st = 'pitch'; c.fireT = 0.8; continue; }
        // a duck soldier in the way: stop and fight it
        const foe = !c.boss && c.kind !== 'cart' ? troopNear(c.x, c.y, 0.7) : null;
        c.fighting = !!foe;
        if (foe) { c.mx = (foe.x - c.x) * 0.1; c.my = 1; c.atk = (c.atk || 0) + sdt; if (c.atk >= 0.9) { c.atk = 0; foe.hp -= c.kind === 'boxer' || c.kind === 'chief' ? 2 : 1; foe.hitT = 0.2; SFX.play('hit'); } continue; }
        // a mackerel trap nearby: cats can't resist
        const bait = !c.boss && c.kind !== 'cart' && c.kind !== 'chief' ? trapNear(c.x, c.y, 3.6) : null;
        if (bait) {
          const dx = bait.x - c.x, dy = bait.y - c.y, dd = Math.hypot(dx, dy);
          c.lured = true;
          if (dd > 0.45) { c.x += dx / dd * c.v * 1.4 * sdt; c.y += dy / dd * c.v * 1.4 * sdt; c.mx = dx / dd; c.my = dy / dd; }
          else { c.mx = 0; c.my = 1; }
          continue;
        }
        c.lured = false;
        const hx = 0, hy = HOUSE_TY, dh = Math.hypot(c.x - hx, c.y - hy);
        if (!past && c.y >= FENCE_Y - 0.55 && wall.hp > 0) { c.st = 'wall'; c.atk = 0; }
        else if (past && dh <= HOUSE_R + 0.3) { c.st = 'house'; c.atk = 0; }
        else {
          // straight down the lane; once through a hole in the fence, head for the house
          let mx = Math.sin(D.t * (c.zig ? 2.4 : 1.3) + c.sway) * (c.zig ? 0.9 : 0.12), my = 1;
          if (past) { mx = (hx - c.x) / dh; my = (hy - c.y) / dh; }
          c.x += mx * c.v * sdt; c.y += my * c.v * sdt; c.mx = mx; c.my = my;
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
            wall.hp -= c.boss ? 8 : c.kind === 'chief' || c.kind === 'boxer' ? 3 : 1; wall.hit = 0.2; SFX.play(c.boss ? 'crack' : Math.random() < 0.5 ? 'hit' : 'wood');
            for (let i = 0; i < (c.boss ? 10 : 2); i++) splinter(wall.x, FENCE_Y);
            if (wall.hp <= 0) { wall.hp = 0; SFX.play('crack'); addFx('ring', wall.x, FENCE_Y, '#ffcf8a'); for (let i = 0; i < 14; i++) splinter(wall.x, FENCE_Y); toast('รั้วพัง! พาเป็ดหัวหน้าไปยืนวงกลม 🔧 เพื่อซ่อม'); }
          } else {
            D.houseHp -= c.boss ? 4 : c.kind === 'chief' ? 2 : 1; D.flinchT = 0.35; D.shake = Math.max(D.shake, 0.15); SFX.play('hit');
            D.floats.push({ x: c.x, y: c.y, t: 0, text: c.boss ? '-4❤️' : '-1❤️', color: '#ff7a6a' });
            if (D.houseHp <= 0) startDefeat();
          }
        }
        if (c.atk >= period) c.atk = 0;
      }
    }
    trapUpdate(dt); troopUpdate(dt);
    // enemy catapult shots in flight
    for (const e of D.eshots || []) {
      e.t += dt; if (e.t < e.dur) continue; e.done = true;
      if (e.type === 'skewer') {
        if (e.troop) { if (e.troop.hp > 0) { e.troop.hp -= 2; e.troop.hitT = 0.25; SFX.play('quack'); } }
        else if (platAt(e.slot)) { const o = shooter(e.slot); o.stunT = 1.5; SFX.play('quack'); burst(e.tx, e.ty, ['#c8a060', '#ffffff'], 5, 2, 1); }
        continue;
      }
      if (e.type === 'cat') {
        spawnCatOrig({ a: e.tx, hp: 2 + Math.floor(T.wave / 2), kind: 'cat' });
        const nc = D.cats[D.cats.length - 1]; nc.y = e.ty; nc.mx = 0; nc.my = 1; nc.coward = false; nc.stun = 0.5;
        addFx('dust', e.tx, e.ty, '#d9c49a'); SFX.play('thud'); SFX.play('meow');
      } else if (e.wall && e.wall.hp > 0) {
        e.wall.hp = Math.max(0, e.wall.hp - 2); e.wall.hit = 0.2; SFX.play('crack');
        for (let i = 0; i < 5; i++) splinter(e.tx, e.ty);
        addFx(e.type === 'chili' ? 'fire' : 'dust', e.tx, e.ty, e.type === 'chili' ? '#ff5a2a' : '#c8b89a');
        if (e.wall.hp <= 0) toast('รั้วพังเพราะรถยิงพริก! 🔧');
      } else {
        D.houseHp -= 1; D.shake = Math.max(D.shake, 0.2); SFX.play('hit');
        addFx(e.type === 'chili' ? 'fire' : 'dust', e.tx, e.ty, '#ff7a3a');
        D.floats.push({ x: e.tx, y: e.ty, t: 0, text: '-1❤️', color: '#ff7a6a' });
        if (D.houseHp <= 0) { startDefeat(); break; }
      }
    }
    if (D.eshots) D.eshots = D.eshots.filter(e => !e.done);
    // ducks on platforms shoot
    for (const p of T.plats) {
      const o = shooter(p.slot), W0 = WEAPON[p.w], pos = platPos(p.slot);
      o.cd -= dt; o.shootT = Math.max(0, o.shootT - dt);
      if (o.stunT > 0) { o.stunT -= dt; continue; }
      const tier = tierOf(p.lvl);
      if (tier >= 3 && o.arrive <= 0 && (o.rain = (o.rain || 0) - dt) <= 0) {
        const rt = nearestCat(pos.x, pos.y, W0.range + 2);
        if (rt) {
          o.rain = 6; SFX.play('shoot');
          for (let i = 0; i < 9; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * 1.3, tx = rt.x + Math.cos(a) * r, ty = rt.y + Math.sin(a) * r;
            D.shots.push({ x: tx, y: ty, sx: tx, sy: ty, tx, ty, w: 'bow', dmg: wDmg(p) * 0.9, t: -i * 0.06, dur: 0.5, rain: true, tier }); }
        }
      }
      if (W0.support) {
        // coffee duck: brews for the neighbours; at Lv.10 also splashes hot coffee now and then
        if (perkLv(p) >= 2 && o.cd <= 0) { const t2 = nearestCat(pos.x, pos.y, 9); if (t2) { o.cd = 2; o.shootT = 0.3; o.aimDx = t2.x - pos.x; o.aimDy = t2.y - pos.y;
          D.shots.push({ x: pos.x, y: pos.y, sx: pos.x, sy: pos.y, tx: t2.x, ty: t2.y, w: 'coffee', dmg: 3 + p.lvl * 0.4, t: 0, dur: 0.6, high: true, tier, h0: o.topH || PLAT_H }); } }
        continue;
      }
      if (o.cd > 0 || o.arrive > 0) continue;
      const t = nearestCat(pos.x, pos.y, W0.range);
      if (!t) continue;
      o.cd = 1 / (W0.rate * (1 + tier * 0.15) * coffeeBuff(p.slot)); o.aimDx = t.x - pos.x; o.aimDy = t.y - pos.y; o.shootT = 0.3;
      const pk = perkLv(p);
      const n = p.w === 'triple' ? [3, 5, 7][pk] : p.w === 'bow' && pk >= 1 ? 2 : (W0.multi || 1);
      if (p.w === 'stove') {
        // a cone of flame puffs
        const ang = Math.atan2(t.y - pos.y, t.x - pos.x), R = W0.range, nn = perkLv(p) >= 1 ? 3 : 1;
        for (let k = 0; k < nn; k++) { const a = ang + (k - (nn - 1) / 2) * 0.28 + (Math.random() - 0.5) * 0.12;
          D.shots.push({ flame: true, w: 'stove', x: pos.x, y: pos.y, sx: pos.x, sy: pos.y, tx: pos.x + Math.cos(a) * R, ty: pos.y + Math.sin(a) * R, t: 0, dur: R / W0.speed,
            dmg: wDmg(p) * (perkLv(p) >= 2 ? 1.5 : 1), blue: perkLv(p) >= 2, hit: new Set(), tier, h0: o.topH || PLAT_H }); }
        if (Math.random() < 0.15) SFX.play('fire');
        continue;
      }
      if (p.w === 'roller') {
        // rolls straight up the lane, flattening everything in its path
        const nn = perkLv(p) >= 2 ? 2 : 1;
        for (let k = 0; k < nn; k++) { const x0 = pos.x + (nn > 1 ? (k - 0.5) * 1.2 : 0);
          D.shots.push({ roll: true, w: 'roller', x: x0, y: FENCE_Y - 0.6, sx: x0, sy: FENCE_Y - 0.6, tx: x0, ty: FENCE_Y - 0.6 - W0.range, t: -k * 0.15, dur: W0.range / W0.speed,
            dmg: wDmg(p), wide: perkLv(p) >= 1 ? 1.15 : 0.75, hit: new Set(), tier }); }
        SFX.play('wood'); continue;
      }
      if (p.w === 'pan') {
        const ang = Math.atan2(t.y - pos.y, t.x - pos.x), R = W0.range;
        D.shots.push({ pan: true, w: 'pan', x: pos.x, y: pos.y, sx: pos.x, sy: pos.y, tx: pos.x + Math.cos(ang) * R, ty: pos.y + Math.sin(ang) * R,
          t: 0, dur: R / W0.speed, back: pk >= 1, dmg: wDmg(p) * (pk >= 2 ? 1.5 : 1), big: pk >= 2, hit: new Set(), tier, h0: o.topH || PLAT_H });
        SFX.play('xbow'); continue;
      }
      for (let k = 0; k < n; k++) {
        const spread = n > 1 ? (k - (n - 1) / 2) * (p.w === 'bow' ? 0.08 : 0.22) : 0;
        const ang = Math.atan2(t.y - pos.y, t.x - pos.x) + spread, dist = Math.hypot(t.x - pos.x, t.y - pos.y);
        D.shots.push({ x: pos.x, y: pos.y, sx: pos.x, sy: pos.y, tx: pos.x + Math.cos(ang) * dist, ty: pos.y + Math.sin(ang) * dist,
          target: n > 1 && p.w !== 'bow' ? null : t, w: p.w, dmg: wDmg(p), t: 0, dur: dist / W0.speed, high: true, pk, tier, h0: o.topH || PLAT_H });
      }
      SFX.play(p.w === 'cannon' || p.w === 'melon' ? 'cannon' : p.w === 'xbow' ? 'xbow' : p.w === 'fire' ? 'fire' : p.w === 'storm' ? 'zap' : p.w === 'ice' ? 'ice' : 'shoot');
      if (p.w === 'cannon' || p.w === 'melon') { D.shake = Math.max(D.shake, 0.06); o.flash = 0.15; }
    }
  }
  // fish-sauce puddles: hurt (and maybe slow) cats standing in them
  for (const pl of D.pools) {
    pl.t += dt; pl.tick += dt;
    if (pl.tick >= 0.5) { pl.tick = 0; for (const c of D.cats) if (c.hp > 0 && Math.hypot(c.x - pl.x, (c.y - pl.y) * 1.2) < pl.r) { hurtCat(c, pl.dps * 0.5, 'burn'); if (pl.slow) c.slow = Math.max(c.slow, 0.6); } }
  }
  D.pools = D.pools.filter(pl => pl.t < pl.life);
  // projectiles + bombs
  for (const s of D.shots) {
    s.t += dt;
    if (s.rain) {
      if (s.t >= s.dur) { s.done = true; for (const c of D.cats) if (c.hp > 0 && Math.hypot(c.x - s.tx, c.y - s.ty) < 0.6) hurtCat(c, s.dmg); addFx('spark', s.tx, s.ty, '#ffe680'); }
      continue;
    }
    if (s.flame || s.roll) {
      if (s.t < 0) continue;
      const u = Math.min(1, s.t / s.dur);
      s.x = s.sx + (s.tx - s.sx) * u; s.y = s.sy + (s.ty - s.sy) * u;
      const rad = s.flame ? 0.35 + u * 0.55 : s.wide;
      for (const c of D.cats) if (c.hp > 0 && !s.hit.has(c) && Math.abs(c.x - s.x) < rad && Math.abs(c.y - s.y) < (s.flame ? rad : 0.5)) {
        s.hit.add(c); hurtCat(c, s.dmg);
        if (s.flame) { c.burn = Math.max(c.burn, 1.5); c.burnDps = Math.max(c.burnDps || 0, s.dmg * 0.6); }
        else { if (!c.boss && c.kind !== 'steel') { c.y -= 0.55; if (c.st === 'wall') c.st = 'walk'; c.stun = Math.max(c.stun, 0.3); } burst(c.x, c.y, HIT_COLS.roller, 5, 3, 1); SFX.play('bonk'); }
      }
      if (u >= 1) s.done = true;
      continue;
    }
    if (s.pan) {
      // out to full range and (with the perk) back again, smacking every cat it passes
      const tot = s.back ? s.dur * 2 : s.dur, u = Math.min(1, s.t / tot);
      const k1 = s.back ? (u < 0.5 ? Math.sin(u * Math.PI) : Math.sin(u * Math.PI)) : 1 - (1 - u) * (1 - u);
      if (s.back && u >= 0.5 && !s.turned) { s.turned = true; s.hit = new Set(); }
      s.x = s.sx + (s.tx - s.sx) * k1; s.y = s.sy + (s.ty - s.sy) * k1;
      for (const c of D.cats) if (c.hp > 0 && !s.hit.has(c) && Math.hypot(c.x - s.x, c.y - s.y) < (s.big ? 0.85 : 0.6)) {
        s.hit.add(c); hurtCat(c, s.dmg); burst(c.x, c.y, ['#ffffff', '#c8c8dc', '#ffe680'], 6, 3, 1);
        SFX.play('clang');
      }
      if (u >= 1) s.done = true;
      continue;
    }
    if (!s.bomb && s.target && s.target.hp > 0) { s.tx = s.target.x; s.ty = s.target.y; }
    const k = Math.max(0, Math.min(1, s.t / s.dur));
    s.x = s.sx + (s.tx - s.sx) * k; s.y = s.sy + (s.ty - s.sy) * k;
    if (k < 1) continue;
    s.done = true;
    if (s.bomb) {
      for (const c of D.cats) if (c.hp > 0 && Math.hypot(c.x - s.tx, c.y - s.ty) < 1.9) hurtCat(c, s.dmg, 'arc');
      addFx('boom', s.tx, s.ty, '#ffb347'); D.shake = 0.35; SFX.play('break');
      continue;
    }
    impact(s);
  }
  D.shots = D.shots.filter(s => !s.done);
  for (const c of D.cats) if (c.hp <= 0 && (c.boss || c.kind === 'chief') && (c.deadT || 0) > 1.3) {
    c.y -= 0.75 * dt; c.x += Math.sin((c.deadT || 0) * 3) * 0.2 * dt;
    if (Math.random() < dt * 0.6) SFX.play('catScared');
  }
  for (const c of D.cats) { if (c.squash) c.squash = Math.max(0, c.squash - dt * 6); if (c.fly) { c.fly.t += dt; } }
  D.cats = D.cats.filter(c => c.hp > 0 || (c.deadT = (c.deadT || 0) + dt) < ((c.boss || c.kind === 'chief') ? (c.y > dinv(0, 30).y ? 99 : 0) : 0.6));
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
  D.fx = D.fx.filter(f => f.t < (f.life || 0.5));
  D.fx.forEach(f => { if ((f.type === 'dust' || f.type === 'shock') && f.t > 0.45) f.t = 0.5; });
  for (const f of D.floats) f.t += dt;
  D.floats = D.floats.filter(f => f.t < 1.1);
  for (const w of D.walls) w.hit = Math.max(0, w.hit - dt);
  D.shake = Math.max(0, D.shake - dt);
  if (D.phase === 'wave' && !D.queue.length && !D.cats.some(c => c.hp > 0)) startVictory();
  if (D.phase === 'victory') victoryUpdate(dt);
  if (D.phase === 'defeat') defeatUpdate(dt);
  if ((tdTick += dt) > 0.5) { tdTick = 0; renderTdHud(); }
}
let tdTick = 0;
function hurtCat(c, dmg, src) {
  if (c.hp <= 0) return;
  if (src !== 'burn') dmg *= c.kind === 'tank' ? 0.7 : c.kind === 'steel' ? 0.6 : c.kind === 'knight' ? 0.85 : 1;
  if (c.trayHp > 0 && src === 'arc') {
    dmg *= 0.25; c.trayHp--; SFX.play(c.trayHp ? 'tray' : 'clang');
    burst(c.x, c.y, ['#dfe6f0', '#ffffff'], 4, 2.5, 1, 'shard');
  }
  if (c.kind === 'shadow' && src !== 'burn' && src !== 'lead' && Math.random() < 0.2) { SFX.play('shoot'); addFx('poof', c.x, c.y, '#c8b6ff'); return; }
  c.hp -= dmg; c.hitT = 0.12;
  const big = dmg >= 5;
  D.floats.push({ x: c.x + (Math.random() - 0.5) * 0.4, y: c.y, t: 0, text: String(Math.round(dmg * 10) / 10), color: big ? '#ffe14a' : '#fff', small: !big, pop: true, big });
  c.squash = 1;                                                    // squish the cat on every hit
  if (dmg >= 8) D.hitStop = Math.max(D.hitStop || 0, 0.045);
  addFx('spark', c.x, c.y, '#fff3b0'); SFX.play('hit');
  if (c.hp > 0 && Math.random() < 0.25) SFX.play('catHurt');
  if (c.hp <= 0) {
    D.killed++; c.deadT = 0;
    if (!c.boss && c.kind !== 'chief' && c.kind !== 'cart' && Math.random() < 0.55) c.fly = { t: 0, vx: (Math.random() - 0.5) * 6, vh: 7 + Math.random() * 4, spin: (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 8) };
    // nearby duck archers cheer
    for (const p of T.plats) { const q = platPos(p.slot); if (Math.hypot(q.x - c.x, q.y - c.y) < 9 && Math.random() < 0.35) shooter(p.slot).cheer = 0.5; }
    if (c.boss) {
      SFX.play('bossDie'); D.shake = 0.6; D.slowT = 1.8; D.flashT = 0.35;
      D.banner = 2.2; D.bannerTxt = 'ราชาแมวล้มแล้ว!! 🎉';
      addFx('ring', c.x, c.y, '#ffd84a'); addFx('boom', c.x, c.y, '#ffd84a');
      for (let i = 0; i < 40; i++) confetti(c.x, c.y);
    } else {
      SFX.play('catDie'); SFX.play('poof');
      addFx('poof', c.x, c.y, '#ffffff');
      for (let i = 0; i < 3; i++) D.parts.push({ x: c.x, y: c.y, h: 1.0, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 1.2, vh: 3 + Math.random() * 2, t: 0, life: 0.7, kind: 'star' });
    }
    const co = c.boss ? 150 : c.kind === 'chief' ? 40 + T.wave * 3 : c.kind === 'tank' || c.kind === 'steel' ? 6 + Math.floor(T.wave / 2) : c.kind === 'knight' ? 3 + Math.floor(T.wave / 2) : (Math.random() < 0.7 ? 2 + Math.floor(T.wave / 2) : 0);
    if (co) {
      save.coins += co; D.earned += co;
      D.floats.push({ x: c.x, y: c.y - 0.6, t: 0, text: '+' + co + '🪙', color: '#ffd84a' });
      const n = c.boss ? 14 : Math.min(4, 1 + Math.floor(co / 3));
      for (let i = 0; i < n; i++) flyCoin(c.x, c.y, i * 0.05);
    }
    // a cowardly cat that sees a friend fall nearby turns tail and runs
    if (!c.boss) for (const o of D.cats) {
      if (o.hp > 0 && o.coward && !o.fled && o.st === 'walk' && Math.hypot(o.x - c.x, o.y - c.y) < 3.5 && o.y > FENCE_Y - 3 && o.y < FENCE_Y) {
        o.st = 'flee'; o.fled = true; o.fleeT = 0;
        SFX.play('catScared');
      }
    }
    // the cat's pot helmet goes flying
    if (!c.boss && !OLD_IMG[c.kind] && c.kind !== 'cart') D.parts.push({ x: c.x, y: c.y, h: 1.0, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 2, vh: 5 + Math.random() * 2, t: 0, life: 0.9, kind: 'item', img: c.gear && c.gear.hat.startsWith('it_') ? c.gear.hat : 'it_pot', r: 0 });
    if (c.kind === 'chief') { D.shake = 0.35; D.slowT = 0.7; addFx('ring', c.x, c.y, '#ffd84a'); for (let i = 0; i < 20; i++) confetti(c.x, c.y); }
  }
}
function nearestCat(x, y, r) {
  let best = null, bd = r;
  for (const c of D.cats) { if (c.hp <= 0) continue; const d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; best = c; } }
  return best;
}
function addFx(type, x, y, color, size) { D.fx.push({ type, x, y, t: 0, color, size: size || 1 }); }
// little bursts of coloured bits for juicy hits
function burst(x, y, cols, n, sp, size, kind) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = sp * (0.4 + Math.random() * 0.8);
    D.parts.push({ x, y, h: 0.5 + Math.random() * 0.4, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, vh: 2 + Math.random() * 3, t: 0, life: 0.5 + Math.random() * 0.4,
      kind: kind || 'dot', col: cols[i % cols.length], sz: (size || 1) * (2 + Math.random() * 2.5), r: Math.random() * 6 });
  }
}
const HIT_COLS = { egg: ['#ffffff', '#ffd23a'], stove: ['#ff6a1a', '#ffd04a', '#ff3a1a'], fish: ['#7a5a2a', '#9be36a'], roller: ['#e0b07a', '#fff3d0'], coffee: ['#7a4a2a', '#c08a5a'], bow: ['#e8c48a', '#fff3b0'], triple: ['#e8c48a', '#fff3b0'], xbow: ['#dfe6f0', '#ffffff'], fire: ['#ff3a1a', '#ff8a2a', '#ffd04a'],
  ice: ['#bff4ff', '#ffffff', '#7fd8ff'], storm: ['#c8b6ff', '#fff6a0', '#ffffff'], cannon: ['#ffffff', '#f4f0e0'], melon: ['#ff4a5a', '#3fa24a', '#2a1a1a'], seed: ['#ff4a5a', '#2a1a1a'] };
function cartFire(c) {
  const r = Math.random(), sx = c.x, sy = c.y;
  if (r < 0.25) {
    const tx = (Math.random() * 2 - 1) * (FIELD_X - 1), ty = 2.4 + Math.random() * 1.2;
    D.eshots.push({ type: 'cat', sx, sy, tx, ty, t: 0, dur: 1.4 });
    SFX.play('catScared');
  } else if (r < 0.45) {
    D.eshots.push({ type: Math.random() < 0.5 ? 'chili' : 'rock', sx, sy, tx: (Math.random() - 0.5) * 1.6, ty: HOUSE_Y - 1, t: 0, dur: 1.5 });
  } else {
    const alive = D.walls.filter(w => w.hp > 0), w = alive.length ? alive[Math.floor(Math.random() * alive.length)] : null;
    if (w) D.eshots.push({ type: Math.random() < 0.5 ? 'chili' : 'rock', wall: w, sx, sy, tx: w.x + (Math.random() - 0.5) * 0.8, ty: FENCE_Y, t: 0, dur: 1.1 });
    else D.eshots.push({ type: 'rock', sx, sy, tx: 0, ty: HOUSE_Y - 1, t: 0, dur: 1.5 });
  }
  SFX.play('cannon');
}
function trapNear(x, y, r) {
  let best = null, bd = r;
  for (const t of D.traps || []) { const d = Math.hypot(t.x - x, t.y - y); if (d < bd) { bd = d; best = t; } }
  return best;
}
function troopNear(x, y, r) {
  let best = null, bd = r;
  for (const t of D.troops || []) { if (t.hp <= 0 || t.st !== 'fight') continue; const d = Math.hypot(t.x - x, t.y - y); if (d < bd) { bd = d; best = t; } }
  return best;
}
function pitchSkewer(c) {
  // aim at a duck soldier outside if there is one, otherwise at a duck archer on its platform
  const outside = (D.troops || []).filter(t => t.hp > 0 && t.st === 'fight');
  if (outside.length && Math.random() < 0.6) { const t = outside[Math.floor(Math.random() * outside.length)]; D.eshots.push({ type: 'skewer', troop: t, sx: c.x, sy: c.y, tx: t.x, ty: t.y, t: 0, dur: 0.7 }); }
  else if (T.plats.length) { const p = T.plats[Math.floor(Math.random() * T.plats.length)], q = platPos(p.slot); D.eshots.push({ type: 'skewer', slot: p.slot, sx: c.x, sy: c.y, tx: q.x, ty: q.y, t: 0, dur: 0.9 }); }
  else return;
  SFX.play('shoot');
}
function placeTrap(x, y) {
  if ((T.traps || 0) <= 0) { toast('กับดักปลาทูหมดแล้ว ซื้อเพิ่มที่บ้าน 🏠'); SFX.play('gateBad'); return; }
  T.traps--; persist();
  D.traps.push({ x, y, t: 0, fuse: 6 });
  SFX.play('thud'); addFx('dust', x, y, '#d9c49a');
}
function trapUpdate(dt) {
  for (const tr of D.traps) {
    tr.t += dt;
    const around = D.cats.filter(c => c.hp > 0 && Math.hypot(c.x - tr.x, c.y - tr.y) < 0.8).length;
    if (around) SFX.play('purr');   // happy cats munching the mackerel
    if (around >= 3 || tr.t >= tr.fuse) {
      tr.done = true;
      const dmg = 10 + T.wave * 1.6;
      for (const c of D.cats) if (c.hp > 0 && Math.hypot(c.x - tr.x, c.y - tr.y) < 2.1) { hurtCat(c, c.boss ? dmg * 0.5 : dmg); if (!c.boss) c.stun = Math.max(c.stun, 0.8); }
      addFx('boom', tr.x, tr.y, '#ffb347', 1.6); addFx('shock', tr.x, tr.y, '#ffe2a8'); D.shake = Math.max(D.shake, 0.35);
      burst(tr.x, tr.y, ['#c8a060', '#8a9aa8', '#ffcf6a'], 16, 4.5, 1.3);
      SFX.play('break'); SFX.play('catScared');
    }
  }
  D.traps = D.traps.filter(t => !t.done);
}
// duck soldiers: march from their tent to the fence, hop over, then fight cats up close
function troopUpdate(dt) {
  T.camps.forEach((cm, i) => {
    if (!cm) return;
    const want = 2 + (cm.lvl >= 5 ? 1 : 0) + (cm.lvl >= 10 ? 1 : 0), mine = D.troops.filter(t => t.camp === i);
    if (mine.length < want && (D.campT[i] = (D.campT[i] || 0) - dt) <= 0) {
      D.campT[i] = 1.2; const cp = CAMP_POS[i];
      D.troops.push({ camp: i, x: cp.x + (Math.random() - 0.5) * 0.5, y: cp.y + 0.2, hp: 5 + cm.lvl * 1.6, max: 5 + cm.lvl * 1.6, dmg: 1 + cm.lvl * 0.45, lvl: cm.lvl,
        st: 'march', gx: Math.max(-FIELD_X + 0.6, Math.min(FIELD_X - 0.6, cp.x * 0.8 + (Math.random() - 0.5) * 2)), hop: 0, atkT: 0.3, ph: 0, walkT: 0, hitT: 0, face: 1, lunge: 0 });
      SFX.play('quack');
    }
  });
  for (const t of D.troops) {
    t.hitT = Math.max(0, t.hitT - dt);
    if (t.hp <= 0 && t.st !== 'down') { t.st = 'down'; t.down = 0; SFX.play('quack'); }
    if (t.st === 'down') {
      // beaten: tumble back to the tent, rest, then come out again
      t.down += dt; const cp = CAMP_POS[t.camp];
      if (t.y < FENCE_Y + 0.4) { t.y += dt * 3; t.hopLift = Math.sin(Math.min(1, (t.y - (FENCE_Y - 0.9)) / 1.3) * Math.PI) * 1.2; }
      else { t.hopLift = 0; t.x += (cp.x - t.x) * Math.min(1, dt * 2); t.y += (cp.y + 0.2 - t.y) * Math.min(1, dt * 2); }
      if (t.down > 4.5) t.gone = true;
      continue;
    }
    if (t.st === 'march') {
      // walk up the kitchen floor to the fence
      const ty = FENCE_Y + 0.75, dx = t.gx - t.x, dy = ty - t.y, d = Math.hypot(dx, dy);
      if (d > 0.1) { t.x += dx / d * 2.6 * dt; t.y += dy / d * 2.6 * dt; t.walkT += dt * 9; t.face = dx >= 0 ? 1 : -1; }
      else { t.st = 'hop'; t.hop = 0; SFX.play('shoot'); }
      continue;
    }
    if (t.st === 'hop') {
      t.hop = Math.min(1, t.hop + dt * 1.6);
      t.y = FENCE_Y + 0.75 + (FENCE_Y - 0.9 - (FENCE_Y + 0.75)) * t.hop; t.hopLift = Math.sin(t.hop * Math.PI) * 1.5;
      if (t.hop >= 1) { t.st = 'fight'; t.hopLift = 0; addFx('dust', t.x, t.y, '#d9c49a'); }
      continue;
    }
    // fight: pitchers first, then the nearest cat on the lawn
    let target = null, bd = 7;
    for (const c of D.cats) { if (c.hp <= 0 || c.y > FENCE_Y + 0.2) continue; const d = Math.hypot(c.x - t.x, c.y - t.y) - (c.kind === 'pitcher' ? 2.5 : 0); if (d < bd) { bd = d; target = c; } }
    t.lunge = Math.max(0, t.lunge - dt * 4);
    if (target) {
      // stand just below the cat (between it and the fence), slightly to one side
      const side = t.x <= target.x ? -1 : 1, sx = target.x + side * 0.25, sy = target.y + 0.55;
      const dx = sx - t.x, dy = sy - t.y, d = Math.hypot(dx, dy);
      t.face = target.x >= t.x ? 1 : -1;
      if (d > 0.12 && t.ph === 0) { const sp = Math.min(d, 2.4 * dt); t.x += dx / d * sp; t.y += dy / d * sp; t.walkT += dt * 9; }
      // attack cycle: wind up -> lunge & smack -> recover
      if (d < 0.5) {
        t.atkT -= dt;
        if (t.ph === 0 && t.atkT <= 0) { t.ph = 1; t.atkT = 0.22; }                          // wind up
        else if (t.ph === 1 && t.atkT <= 0) {                                                 // smack
          t.ph = 2; t.atkT = 0.14; t.lunge = 1;
          hurtCat(target, t.dmg, 'lead'); SFX.play('bonk');
          if (!target.boss && target.kind !== 'steel' && target.kind !== 'cart') target.y -= 0.12;
          addFx('spark', target.x, target.y, '#ffffff', 1.1);
        } else if (t.ph === 2 && t.atkT <= 0) { t.ph = 0; t.atkT = 0.35 + Math.random() * 0.15; }   // recover
      } else if (t.ph !== 0 && t.atkT <= 0) t.ph = 0;
    } else {
      t.ph = 0;
      // guard spot on the lawn just outside the fence
      const gx = t.gx, gy = FENCE_Y - 1.3, d = Math.hypot(gx - t.x, gy - t.y);
      if (d > 0.2) { t.x += (gx - t.x) / d * 1.6 * dt; t.y += (gy - t.y) / d * 1.6 * dt; t.walkT += dt * 7; }
    }
    t.y = Math.min(t.y, FENCE_Y - 0.5);
  }
  // keep soldiers from standing inside each other
  for (let i = 0; i < D.troops.length; i++) for (let j = i + 1; j < D.troops.length; j++) {
    const a = D.troops[i], b2 = D.troops[j]; if (a.st !== 'fight' || b2.st !== 'fight') continue;
    const dx = b2.x - a.x, dy = b2.y - a.y, d = Math.hypot(dx, dy) || 0.01;
    if (d < 0.45) { const k = (0.45 - d) / 2; a.x -= dx / d * k; a.y -= dy / d * k; b2.x += dx / d * k; b2.y += dy / d * k; }
  }
  D.troops = D.troops.filter(t => !t.gone);
}
function drawTroop(t) {
  const p = dproj(t.x, t.y), h = dk * 0.85, w = h * 0.75, lift = (t.hopLift || 0) * dk;
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.25, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  const lx = t.lunge * h * 0.22 * t.face, ly = -t.lunge * h * 0.12;     // lean into the hit
  ctx.save(); ctx.translate(p.x + lx + (t.hitT > 0 ? Math.sin(t.hitT * 90) * 2 : 0), p.y - lift + ly);
  if (t.st === 'down') { ctx.rotate(t.down * 9); ctx.globalAlpha = 0.9; }
  if (t.face < 0) ctx.scale(-1, 1);
  const weapon = t.lvl >= 10 ? 'it_pan' : 'it_ladle';
  if (t.st === 'down') { drawFrame('k_duck_act', 2, 0, h * 0.5, h, false); ctx.restore(); return; }
  if (t.ph === 1) {
    ctx.rotate(-0.12);                                                     // lean back, weapon high behind the head
    drawItem(weapon, -w * 0.2, -h * 1.0, h * 0.55, -0.9);
    drawFrame('k_duck_act', 0, 0, 0, h, false);
  } else if (t.ph === 2) {
    ctx.rotate(0.15);
    drawFrame('k_duck_act', 1, 0, 0, h, false);
    drawItem(weapon, w * 0.6, -h * 0.55, h * 0.55, 1.6);                   // weapon swung down onto the cat
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w * 0.1, -h * 0.7, h * 0.6, -1.4, 0.4); ctx.stroke();
  } else {
    const moving = t.st !== 'fight' || t.walkT % 4 !== 0;
    drawFrame('k_duck_walk', moving ? Math.floor(t.walkT) % 4 : 1, 0, 0, h, false);
    drawItem(weapon, w * 0.42, -h * 0.55, h * 0.5, 0.5);
  }
  drawItem('it_pot', w * 0.04, -h * 0.95, h * 0.42, 0.1);                 // pot helmet
  ctx.restore();
  if (t.hp > 0 && t.hp < t.max) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(p.x - 12, p.y - h * 1.15, 24, 3); ctx.fillStyle = '#5fe06a'; ctx.fillRect(p.x - 12, p.y - h * 1.15, 24 * t.hp / t.max, 3); }
}
function drawCamp(i) {
  const cm = T.camps[i]; if (!cm) return;
  const cp = CAMP_POS[i], p = dproj(cp.x, cp.y), sz = dk * (1.45 + Math.min(3, Math.floor(cm.lvl / 4)) * 0.12);
  if (!drawItem('it_tent', p.x, p.y - sz * 0.38, sz)) { ctx.font = `${sz * 0.6}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('⛺', p.x, p.y); }
}
function drawTrap(tr) {
  const p = dproj(tr.x, tr.y), k = tr.t / tr.fuse, sz = dk * 0.95 * (1 + Math.sin(tr.t * (6 + k * 20)) * 0.04 * k);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, sz * 0.45, sz * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  if (!drawItem('it_fishtrap', p.x, p.y - sz * 0.35, sz)) { ctx.font = `${sz * 0.6}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('🐟', p.x, p.y); }
  // fuse spark + smell lines that pull the cats in
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ffd04a';
  ctx.beginPath(); ctx.arc(p.x + sz * 0.22, p.y - sz * 0.78, 3 + Math.random() * 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const yy = p.y - sz * (0.9 + ((tr.t * 0.8 + i / 3) % 1) * 0.9), xx = p.x + (i - 1) * sz * 0.25; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx + 6, yy - 8, xx, yy - 16); ctx.stroke(); }
}
function coffeeBuff(slot) {
  let b = 1;
  for (const q of T.plats) if (q.w === 'coffee' && Math.abs(q.slot - slot) === 1) b = Math.max(b, 1 + [0.3, 0.45, 0.6][perkLv(q)]);
  return b;
}
function impact(s) {
  const W0 = WEAPON[s.w] || { splash: 0.8 }, pk = s.pk || 0, big = 1 + (s.tier || 0) * 0.25;
  const arcSrc = W0.arc || s.w === 'seed' ? 'arc' : undefined;   // lobbed things land on hats (trays/lids block them)
  burst(s.x, s.y, HIT_COLS[s.w] || ['#fff'], 5 + (s.tier || 0) * 3 + (s.w === 'melon' ? 14 : s.w === 'cannon' ? 6 : 0), s.w === 'melon' ? 4 : 2.5, s.w === 'melon' ? 1.4 : 1, s.w === 'ice' ? 'shard' : 'dot');
  if (s.w === 'egg') {
    const r = (pk >= 2 ? 2.3 : 1.5) * (1 + (s.tier || 0) * 0.08);
    for (const c of D.cats.filter(c => c.hp > 0 && Math.hypot(c.x - s.x, c.y - s.y) < r)) { hurtCat(c, s.dmg, arcSrc); if (!c.boss) c.stun = Math.max(c.stun, pk >= 1 ? 1.6 : 1.0); }
    addFx('flash', s.x, s.y, '#fff6c0', r); addFx('egg', s.x, s.y, '#ffffff'); SFX.play('break');
    return;
  }
  if (s.w === 'fish') {
    D.pools.push({ x: s.x, y: s.y, r: (pk >= 1 ? 1.5 : 1.1) * (1 + (s.tier || 0) * 0.08), t: 0, life: pk >= 1 ? 6 : 4, dps: s.dmg, slow: pk >= 2, tick: 0 });
    addFx('splat', s.x, s.y, '#7a5a2a', 0.8); SFX.play('break');
    return;
  }
  if (s.w === 'coffee') {
    for (const c of D.cats.filter(c => c.hp > 0 && Math.hypot(c.x - s.x, c.y - s.y) < 1.1)) { hurtCat(c, s.dmg, arcSrc); c.burn = 2; c.burnDps = s.dmg * 0.3; }
    addFx('splat', s.x, s.y, '#6a3a1a', 0.7); return;
  }
  if (s.w === 'melon' || s.w === 'seed') {
    const r = s.w === 'seed' ? 0.85 : W0.splash * (1 + (s.tier || 0) * 0.1);
    for (const c of D.cats.filter(c => c.hp > 0 && Math.hypot(c.x - s.x, c.y - s.y) < r)) { hurtCat(c, s.dmg, arcSrc); if (pk >= 2) c.slow = Math.max(c.slow, 1.6); }
    addFx('boom', s.x, s.y, '#ff5a6a', s.w === 'seed' ? 0.5 : big * 1.2); SFX.play('squish'); addFx('splat', s.x, s.y, '#ff4a5a', s.w === 'seed' ? 0.5 : 1);
    if (s.w === 'melon') {
      SFX.play('break'); D.shake = Math.max(D.shake, 0.22);
      const nSeed = pk >= 2 ? 6 : pk >= 1 ? 3 : 0;
      for (let i = 0; i < nSeed; i++) { const a = Math.random() * Math.PI * 2, d = 1 + Math.random() * 1.6, tx = s.x + Math.cos(a) * d, ty = s.y + Math.sin(a) * d;
        D.shots.push({ x: s.x, y: s.y, sx: s.x, sy: s.y, tx, ty, w: 'seed', dmg: s.dmg * 0.35, t: -i * 0.04, dur: 0.45, pk, tier: s.tier }); }
    }
    return;
  }
  const near = r => D.cats.filter(c => c.hp > 0 && Math.hypot(c.x - s.x, c.y - s.y) < r);
  const direct = () => s.target && s.target.hp > 0 ? s.target : D.cats.find(c => c.hp > 0 && Math.hypot(c.x - s.x, c.y - s.y) < 0.55);
  if (s.w === 'cannon') {
    const r = pk >= 2 ? 2.6 : W0.splash;
    for (const c of near(r)) { hurtCat(c, s.dmg, arcSrc); if (pk >= 1 && !c.boss) c.stun = Math.max(c.stun, pk >= 2 ? 1.4 : 0.8); }
    addFx('boom', s.x, s.y, s.tier >= 3 ? '#ffe680' : '#ffb347', big * (pk >= 2 ? 1.35 : 1));
    if (s.tier >= 2) addFx('shock', s.x, s.y, '#ffd59a', 0.6);
    SFX.play('break'); D.shake = 0.25;
  } else if (s.w === 'fire') {
    const r = pk >= 2 ? 1.7 : W0.splash;
    for (const c of near(r)) { hurtCat(c, s.dmg, arcSrc); if (pk >= 1) { c.burn = 2.5; c.burnDps = s.dmg * 0.5; } }
    addFx('fire', s.x, s.y, s.tier >= 3 ? '#ffd84a' : '#ff7a2a', big * (pk >= 2 ? 1.5 : 1));
  } else if (s.w === 'ice') {
    const hits = pk >= 1 ? near(1.2) : [direct()].filter(Boolean);
    for (const c of hits) { hurtCat(c, s.dmg, arcSrc); c.slow = Math.max(c.slow, 2.2); if (pk >= 2 && !c.boss) { c.freeze = true; c.slow = Math.max(c.slow, 1.2); } }
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
      if (s.w === 'xbow' && pk >= 1 && !c.boss && c.kind !== 'tank') { c.y -= 0.6; if (c.st === 'wall') c.st = 'walk'; }
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
  const ix = c.x, iy = c.y + 0.6;
  SFX.play('slam'); D.shake = 0.55; D.hitStop = 0.08;
  addFx('shock', ix, iy, '#ffe2a8'); addFx('shock2', ix, iy, '#ffffff'); addFx('dust', ix, iy, '#d9c49a');
  for (let i = 0; i < 16; i++) D.parts.push({ x: ix, y: iy, h: 0.1, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 4, vh: 3 + Math.random() * 4, t: 0, life: 0.9, kind: 'rock', r: Math.random() * 6 });
}
function flyCoin(x, y, delay) {
  const p = dproj(x, y);
  const el = $('tdCoins').getBoundingClientRect();
  D.coins.push({ sx: p.x + (Math.random() - 0.5) * 20, sy: p.y - dk * 0.8, tx: el.left + 4, ty: el.top + el.height / 2, t: -delay, dur: 0.75 + Math.random() * 0.2, wob: (Math.random() - 0.5) * 120 });
}
// ---------- end-of-wave show ----------
function waveStars() { const r = D.houseHp / D.houseMax; return r >= 0.8 ? 3 : r >= 0.4 ? 2 : 1; }
function startVictory() {
  D.phase = 'victory'; D.vicT = 0; D.vicStars = waveStars(); D.vicShown = 0; D.fwT = 0;
  D.shots = []; D.eshots = [];
}
function victoryUpdate(dt) {
  // timeline: let the slow-mo / last kill play out, then cheer, fireworks and stars, then the result panel
  const real = dt; D.vicT += real;
  const T0 = D.slowT > 0 ? 99 : 0;   // wait while still in slow motion
  if (D.slowT > 0) { D.vicT = Math.min(D.vicT, 0.3); return; }
  if (D.vicT > 0.6 && !D.cheered) {
    D.cheered = true; SFX.play('win'); D.banner = 3; D.bannerTxt = `ชนะแล้ว!! วันที่ ${T.wave} 🎉`;
    D.lead.happyT = 2.5;
    for (let i = 0; i < 60; i++) confetti((Math.random() - 0.5) * 8, FENCE_Y - Math.random() * 6);
  }
  if (D.vicT > 0.6 && D.vicT < 3.4 && (D.fwT -= real) <= 0) {
    D.fwT = 0.22 + Math.random() * 0.2;
    D.fx.push({ type: 'fw', x: (Math.random() - 0.5) * 8, y: -3 - Math.random() * 9, t: 0, life: 1.1, color: ['#ffd84a', '#ff6a8a', '#6ad0ff', '#9bff7a', '#ffffff', '#c89bff'][Math.floor(Math.random() * 6)], size: 0.8 + Math.random() * 0.6 });
    if (Math.random() < 0.6) SFX.play('poof');
  }
  for (let i = 1; i <= 3; i++) if (D.vicT > 1.2 + i * 0.4 && D.vicShown < i) { D.vicShown = i; SFX.play(i <= D.vicStars ? 'gateGood' : 'click'); D.shake = i <= D.vicStars ? 0.12 : 0; }
  if (D.vicT > 4.2) { D.phase = 'wave'; D.cheered = false; endWave(true); }
}
function startDefeat() {
  if (D.phase !== 'wave') return;
  D.phase = 'defeat'; D.defT = 0; D.shake = 0.6; SFX.play('crack');
  D.banner = 2.5; D.bannerTxt = 'บ้านพังแล้ว!! 😿';
}
function defeatUpdate(dt) {
  D.defT += dt;
  if (Math.random() < dt * 14) addFx('dust', (Math.random() - 0.5) * 2.4, HOUSE_Y - 1 - Math.random(), '#9a9080');
  // the cats dance around
  for (const c of D.cats) if (c.hp > 0) { c.hitT = 0; c.dance = (c.dance || 0) + dt; }
  if (D.defT > 2) { D.phase = 'wave'; endWave(false); }
}
function drawFirework(f) {
  const p = dproj(f.x, f.y), k = f.t / f.life, r = dk * 2.2 * f.size * Math.sqrt(k), n = 18;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (k < 0.15) { ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, dk * 0.3 * (1 - k / 0.15), 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = Math.max(0, 1 - k);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.85 + k * k * dk * 1.2;
    ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(x, y, 2.6 * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = f.color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(p.x + Math.cos(a) * r * 0.75, p.y + Math.sin(a) * r * 0.64 + k * k * dk); ctx.stroke();
  }
  ctx.restore();
}
function drawVictoryStars() {
  if (D.phase !== 'victory' || !D.vicShown) return;
  const cx = W / 2, cy = H * 0.38, gap = 74;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 1; i <= 3; i++) {
    if (D.vicShown < i) continue;
    const age = D.vicT - (1.2 + i * 0.4), pop = age < 0.25 ? 0.4 + age / 0.25 * 0.9 : Math.max(1, 1.3 - (age - 0.25) * 1.2);
    const x = cx + (i - 2) * gap, y = cy + (i === 2 ? -14 : 0), on = i <= D.vicStars;
    ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop); ctx.rotate((i - 2) * 0.15);
    if (on) { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 46); g.addColorStop(0, 'rgba(255,230,120,.7)'); g.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill(); }
    ctx.font = `${on ? 56 : 48}px system-ui`; ctx.globalAlpha = on ? 1 : 0.45; ctx.fillText(on ? '⭐' : '☆', 0, 0);
    ctx.restore();
  }
  if (D.vicShown >= 3) {
    ctx.font = '900 18px Mitr,system-ui,sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    const tx = `ล้มแมว ${D.killed} ตัว • 🪙 +${Math.floor(D.earned)}`;
    ctx.strokeText(tx, cx, cy + 56); ctx.fillStyle = '#fff'; ctx.fillText(tx, cx, cy + 56);
    ctx.font = '700 12px Mitr,system-ui,sans-serif'; ctx.globalAlpha = 0.8 + Math.sin(performance.now() / 200) * 0.2;
    ctx.strokeText('แตะเพื่อไปต่อ', cx, cy + 82); ctx.fillText('แตะเพื่อไปต่อ', cx, cy + 82);
  }
  ctx.restore();
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
  D.cats = []; D.shots = []; D.queue = []; D.pools = []; D.eshots = []; D.traps = []; D.troops = []; D.trapMode = false;
  collectAll();
  if (won) {
    for (let i = 0; i < 50; i++) confetti((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
    const st = D.vicStars || 3, bonus = Math.round((40 + T.wave * 15) * (0.6 + st * 0.2));
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
  $('rTitle').textContent = won ? `ผ่านวันที่ ${T.wave}! ${'⭐'.repeat(D.vicStars || 3)}` : 'บ้านพัง! 😿';
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
    nx.textContent = `▶ ไปวันที่ ${T.wave + 1}`;
    nx.onclick = () => { hide('result'); enterTD(); };
  } else {
    ab.classList.toggle('hidden', D.revived);
    ab.innerHTML = '🎬 ดูโฆษณา สู้ต่อ!<small>ซ่อมบ้านกับรั้วเต็ม แล้วสู้วันนี้ต่อ</small>';
    ab.onclick = () => Ads.show(ok => { if (ok) revive(); });
    nx.textContent = '🔁 เริ่มวันนี้ใหม่';
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
    c.y = Math.min(c.y, FENCE_Y - 3); c.st = 'walk'; c.atk = 0; c.dance = 0;
  }
  addFx('shock', 0, FENCE_Y, '#bfe6ff'); addFx('shock2', 0, FENCE_Y, '#ffffff'); D.shake = 0.3;
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
  if (D.phase === 'intro') { catIntroNext(); return; }
  if (D.phase === 'victory') { if (D.vicT > 1.5 && D.slowT <= 0) { D.vicT = 99; } return; }
  if (D.phase === 'defeat') return;
  if (D.phase === 'wave' && Math.hypot(cx - (W - 46), cy - (H - 128)) < 32) { D.trapMode = !D.trapMode; SFX.play('click'); return; }
  if (D.trapMode && D.phase === 'wave') {
    const q = dinv(cx, cy); D.trapMode = false;
    if (q.y < FENCE_Y - 0.6) placeTrap(Math.max(-FIELD_X + 0.4, Math.min(FIELD_X - 0.4, q.x)), q.y);
    else toast('วางกับดักได้แค่หน้ารั้ว (ฝั่งแมว)');
    return;
  }
  const p = dinv(cx, cy);
  // buy / upgrade circles: the leader walks over and pays by himself
  { let best = null, bd = 0.7;
    for (const pd of padList()) { const d = Math.hypot(p.x - pd.x, (p.y - pd.y) * 1.2); if (d < bd) { bd = d; best = pd; } }
    if (best) {
      SFX.play('click'); closeSheet();
      D.lead.goal = { id: best.id, x: best.x, y: best.y, fresh: true }; D.padLock = null;
      if (save.coins < 1 && (T.pads[best.id] || 0) < best.cost) toast('เหรียญไม่พอ 🪙 ล้มแมวเพิ่มก่อนนะ');
      if (!save.td.walked) { save.td.walked = true; persist(); }
      return;
    } }
  // platforms (drawn raised, so test a little above the ground point too)
  for (let s = 0; s < SLOTS; s++) {
    const q = platPos(s);
    if (Math.hypot(p.x - q.x, p.y - q.y) < 0.75 || Math.hypot(p.x - q.x, p.y + 1.2 - q.y) < 0.75) { SFX.play('click'); openSlot(s); return; }
  }
  if (Math.hypot(p.x, p.y - HOUSE_Y + 0.8) < HOUSE_R + 0.3) { SFX.play('click'); openHouse(); return; }
  closeSheet();
  if (D.phase !== 'wave' || D.bombCd > 0) return;
  D.bombCd = 7;
  D.shots.push({ x: 0, y: 0, sx: 0, sy: -0.8, tx: p.x, ty: p.y, w: 'bomb', dmg: bombDmg(), t: 0, dur: 0.45, bomb: true });
}

// ---------- leader duck, coin drops and buy pads ----------
function padList() {
  const L = [];
  for (let s = 0; s < SLOTS; s++) {
    const pl = platAt(s), x = SLOT_X[s], y = pl ? PLAT_Y + 1.1 : PLAT_Y;
    if (!pl) L.push({ id: 'b' + s, x, y, icon: '🪵', label: 'สร้างแท่น', cost: buildCost(), apply: () => {
      T.plats.push({ slot: s, w: 'bow', lvl: 1 }); shooter(s).arrive = 1; SFX.play('quack'); toast('เป็ดขึ้นแท่นแล้ว! 🦆');
    } });
    else if (pl.lvl < 10) L.push({ id: 'u' + s, x, y, icon: WEAPON[pl.w].icon, label: `Lv.${pl.lvl + 1}`, cost: lvlCost(pl), apply: () => {
      const before = tierOf(pl.lvl); pl.lvl++; const after = tierOf(pl.lvl);
      if (after > before) { toast(`แท่นใหม่: ${PLAT_NAME[after]}! ${PLAT_SKILL[after]}`); const q = platPos(s); for (let i = 0; i < 30; i++) confetti(q.x, q.y); addFx('ring', q.x, q.y, '#ffd84a'); SFX.play('win'); }
    } });
  }
  CAMP_POS.forEach((cp, i) => {
    const cm = T.camps[i], x = cp.x, y = cp.y + 1.05;
    if (!cm) L.push({ id: 'cb' + i, x, y, icon: '⛺', label: 'ค่ายเป็ดทหาร', cost: 500, apply: () => { T.camps[i] = { lvl: 1 }; toast('ตั้งค่ายแล้ว! เป็ดทหารพร้อมออกรบ 🪖'); SFX.play('quack'); } });
    else if (cm.lvl < 10) L.push({ id: 'cu' + i, x, y, icon: '🪖', label: `ค่าย Lv.${cm.lvl + 1}`, cost: Math.round(55 * Math.pow(cm.lvl, 1.5) * 1.4), apply: () => { cm.lvl++; if (cm.lvl === 5 || cm.lvl === 10) toast(cm.lvl === 5 ? 'ค่ายได้เป็ดทหารเพิ่ม 1 ตัว!' : 'เป็ดทหารได้กระทะ + เพิ่มอีกตัว!'); } });
  });
  L.push({ id: 'house', x: 1.2, y: HOUSE_Y + 0.55, icon: '🏠', label: `บ้าน Lv.${T.house + 1}`, cost: 80 * T.house, apply: () => { T.house++; D.houseHp = D.houseMax = houseMax(); } });
  for (const w of D.walls) if (w.hp < w.max) {
    const cost = Math.max(5, Math.round((20 + T.fence * 6) * (1 - w.hp / w.max)));
    L.push({ id: 'w' + w.i, x: w.x, y: FENCE_Y + 0.85, icon: '🔧', label: 'ซ่อมรั้ว', cost, small: true, apply: () => { w.hp = w.max; SFX.play('plus'); } });
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
  if (D.joy && D.joy.moved) L.goal = null;           // dragging takes over again
  if (L.goal && !D.joy && L.hurtT < 0.6) {
    // auto-walk to the tapped circle, stepping around the house
    let tx = L.goal.x, ty = L.goal.y;
    const hcx = 0, hcy = HOUSE_Y - 0.5, rr = HOUSE_R + 0.45;
    const sx = tx - L.x, sy = ty - L.y, sl = Math.hypot(sx, sy) || 1;
    const u = Math.max(0, Math.min(1, ((hcx - L.x) * sx + (hcy - L.y) * sy) / (sl * sl)));
    const qx = L.x + sx * u, qy = L.y + sy * u;
    if (Math.hypot(qx - hcx, (qy - hcy) * 1.4) < rr) {
      // blocked by the house: slide round it along the tangent, toward the target's side
      const rx = L.x - hcx, ry = L.y - hcy, rl = Math.hypot(rx, ry) || 1;
      const cr = rx * (ty - hcy) - ry * (tx - hcx), sg = cr >= 0 ? 1 : -1;
      tx = L.x - ry / rl * sg + rx / rl * 0.25; ty = L.y + rx / rl * sg + ry / rl * 0.25;
    }
    const dx = tx - L.x, dy = ty - L.y, len = Math.hypot(dx, dy);
    if (len > 0.08) {
      const sp = leadSpeed() * 1.1, st = Math.min(len, sp * dt);
      L.x += dx / len * st; L.y += dy / len * st;
      L.moving = true; L.walkT += dt * (4 + sp * 1.5);
      if (Math.abs(dx) > 0.05) L.face = dx > 0 ? 1 : -1;
    }
    // finished: pad bought (it disappears / changes id) or paid in full, or out of coins
    const still = padList().find(q => q.id === L.goal.id);
    if (!still || L.goal.fresh === false || (Math.hypot(L.x - L.goal.x, L.y - L.goal.y) < 0.3 && (D.padDone || save.coins < 1) && (D.padWait || 0) <= 0)) L.goal = null;
  } else if (D.joy && D.joy.moved && L.hurtT < 0.6) {
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
  L.x = Math.max(-FIELD_X + 0.2, Math.min(FIELD_X - 0.2, L.x)); L.y = Math.max(FENCE_Y + 0.55, Math.min(HOUSE_Y + 0.6, L.y));
  { const hx = L.x, hy = L.y - (HOUSE_Y - 0.5), d = Math.hypot(hx, hy * 1.4), r = HOUSE_R + 0.15;
    if (d < r) { const k = r / (d || 1); L.x = (hx || 0.01) * k; L.y = HOUSE_Y - 0.5 + hy * k; } }
  // bonk nearby cats with the ladle
  if (D.phase === 'wave' && L.atkCd <= 0) {
    const t = nearestCat(L.x, L.y, 1.05);
    if (t) {
      L.atkCd = 0.55; L.swingT = 0.3; L.face = t.x > L.x ? 1 : -1;
      hurtCat(t, leadDmg(), 'lead'); SFX.play('bonk');
      if (!t.boss && t.kind !== 'tank' && t.hp > 0) { const k = Math.hypot(t.x - L.x, t.y - L.y) || 1; t.x += (t.x - L.x) / k * 0.25; t.y += (t.y - L.y) / k * 0.25; }
    }
  }
  // cats bump the leader back toward the house
  if (D.phase === 'wave' && L.hurtT <= 0) for (const c of D.cats) {
    if (c.hp <= 0 || Math.hypot(c.x - L.x, c.y - L.y) > (c.boss ? 1.1 : 0.5)) continue;
    L.hurtT = 1.0; SFX.play('quack');
    L.y = Math.min(HOUSE_Y + 1.0, L.y + 0.9);
    SFX.play('thud');
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
  if (D.padLock && Math.hypot(L.x - D.padLock.x, L.y - D.padLock.y) > 0.7) D.padLock = null;
  for (const pd of padList()) {
    if (Math.hypot(L.x - pd.x, L.y - pd.y) > 0.55) continue;
    if (L.goal && L.goal.id !== pd.id) continue;          // walking past other circles: don't pay into them
    if (D.padLock && !(L.goal && L.goal.fresh)) break;
    D.pad = pd;
    if (pd.id !== prev) { D.padWait = L.goal ? 0.05 : 0.3; D.padDone = false; }
    if ((D.padWait -= dt) > 0 || D.padDone || D.padT > 0) break;
    D.padT = 0.06;
    const paid = T.pads[pd.id] || 0, need = pd.cost - paid;
    if (need <= 0 || save.coins < 1) break;
    const chunk = Math.min(need, Math.floor(save.coins), Math.max(1, Math.ceil(pd.cost / 18)));
    save.coins -= chunk; T.pads[pd.id] = paid + chunk;
    D.flow = { x: pd.x, y: pd.y, t: 0.15 };
    if (Math.random() < 0.5) SFX.play('click');
    if (T.pads[pd.id] >= pd.cost) {
      T.pads[pd.id] = 0; pd.apply(); L.happyT = 0.8; D.padLock = { x: pd.x, y: pd.y }; if (L.goal) L.goal.fresh = false; SFX.play('gateGood'); D.padDone = true;
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
    info.innerHTML = `แตะ<b>วงกลม 🪵</b> ข้างจุดนี้ เป็ดหัวหน้า 🦆 จะเดินไปจ่ายเหรียญให้เองจนครบ 🪙${buildCost()} แล้วแท่นจะสร้างเอง`;
    body.appendChild(info);
  } else {
    const W0 = WEAPON[p.w];
    $('sheetTitle').textContent = `${W0.icon} ${PLAT_NAME[tierOf(p.lvl)]} • ${W0.name} Lv.${p.lvl}`;
    const info = document.createElement('div'); info.className = 'sinfo';
    info.innerHTML = `🪙 <b>${Math.floor(save.coins).toLocaleString()}</b> • ดาเมจ ${wDmg(p).toFixed(1)} • ยิง ${W0.rate}/วิ • ระยะ ${Math.round(W0.range)}${W0.splash ? ' • ระเบิด' : ''}${W0.multi ? ' • 3 ดอก' : ''}`;
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
  info.innerHTML = `🪙 <b>${Math.floor(save.coins).toLocaleString()}</b> • เป็ดยิง ${T.plats.length} ตัว • วันถัดไป ${T.wave}`;
  body.appendChild(info);
  const fc = 50 * T.fence, bc = 60 * T.bomb;
  const lh = document.createElement('div'); lh.className = 'sinfo'; lh.innerHTML = '🦆 <b>เป็ดหัวหน้า</b> (แตะวงกลมซื้อของ เป็ดจะเดินไปจ่ายเอง ลากนิ้วก็ยังบังคับเดินได้ และฟาดแมวด้วยทัพพี)'; body.appendChild(lh);
  const la = 70 * T.lead.atk, ls = 60 * T.lead.spd, lm = 50 * T.lead.mag;
  body.appendChild(btn(`🥄 ทัพพี Lv.${T.lead.atk}${T.lead.atk >= 5 ? ' → กระทะ' : ''}`, `ฟาดแรง ${leadDmg().toFixed(1)} • 🪙${la}`, save.coins >= la, () => { save.coins -= la; T.lead.atk++; if (T.lead.atk === 5) toast('ได้กระทะ! ฟาดแรงขึ้น 🍳'); }));
  body.appendChild(btn(`👟 วิ่งไว Lv.${T.lead.spd}`, `ความเร็ว ${leadSpeed().toFixed(1)} • 🪙${ls}`, save.coins >= ls, () => { save.coins -= ls; T.lead.spd++; }));
  const hh = document.createElement('div'); hh.className = 'sinfo'; hh.style.marginTop = '10px'; hh.textContent = `🏠 เสริมบ้าน (ทน ${houseMax()}): ไปยืนบนวงกลม 🏠 หน้าบ้าน`; body.appendChild(hh);
  body.appendChild(btn(`🪵 เสริมรั้ว Lv.${T.fence}`, `ทน ${wallMax()}${T.fence < 6 ? ` • Lv.${T.fence < 3 ? 3 : 6} เปลี่ยนรั้ว` : ""} • 🪙${fc}`, save.coins >= fc, () => { save.coins -= fc; T.fence++; for (const w of D.walls) { w.max = wallMax(); w.hp = Math.max(w.hp, Math.min(w.max, w.hp + 18)); } }));
  body.appendChild(btn(`🐟 กับดักปลาทูระเบิด (มี ${T.traps})`, `ซื้อเพิ่ม 1 อัน • 🪙120`, save.coins >= 120, () => { save.coins -= 120; T.traps++; }));
  body.appendChild(btn(`🌶️ ระเบิดพริก Lv.${T.bomb}`, `แรง ${bombDmg()} • 🪙${bc}`, save.coins >= bc, () => { save.coins -= bc; T.bomb++; }));
  const rp = document.createElement('button'); rp.className = 'sbtn'; rp.style.background = '#6d8fc9'; rp.style.boxShadow = '0 4px 0 #3f62a3';
  rp.innerHTML = '<b>🎬 ดูเรื่องราวตอนต้นอีกครั้ง</b>'; rp.onclick = () => { closeSheet(); playIntro(); }; body.appendChild(rp);
  const ver = document.createElement('div'); ver.className = 'sinfo'; ver.style.opacity = '.7'; ver.textContent = `เกม ${gameVersion()} • อัปเดตอัตโนมัติเมื่อมีแพตใหม่`; body.appendChild(ver);
  $('sheet').classList.remove('hidden');
}
function renderTdHud() {
  if (!D) return;
  $('tdCoins').textContent = Math.floor(save.coins).toLocaleString();
  $('tdWave').textContent = T.wave;
  $('waveBtn').classList.toggle('hidden', D.phase !== 'build');
  for (const id of ['raidBtn', 'houseBtn', 'helpBtn']) { const el = $(id); if (el) el.style.visibility = D.phase === 'intro' ? 'hidden' : ''; }
  $('waveBtn').textContent = `▶ เริ่มวันที่ ${T.wave}${T.wave % 5 === 0 ? ' 👑' : ''}`;
}

// ---------- drawing ----------
function fitField() { if (W > 0 && H > 0) dk = Math.min(W / 9.6, H / 15); }
function tdDraw() {
  if (!D) return;
  fitField();
  ctx.save();
  if (D.shake > 0) ctx.translate((Math.random() - 0.5) * 30 * D.shake, (Math.random() - 0.5) * 30 * D.shake);
  if (D.zoomT > 0) { const z = 1 + Math.sin(Math.min(1, D.zoomT / 1.2) * Math.PI) * 0.07, cy = H * 0.35; ctx.translate(W / 2, cy); ctx.scale(z, z); ctx.translate(-W / 2, -cy); }
  // background is painted once into an offscreen canvas (no tiles, so no seams), then copied every frame
  const bg = getBg();
  if (bg) ctx.drawImage(bg, 0, 0, W, H);
  // range hint for the selected platform
  if (sheetFor && sheetFor.slot !== undefined && platAt(sheetFor.slot)) {
    const p = platAt(sheetFor.slot), q = platPos(p.slot), s = dproj(q.x, q.y), r = WEAPON[p.w].range;
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(s.x, s.y, r * dk, r * dk * 0.62, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  drawPads();
  for (const pl of D.pools) drawPool(pl);
  const list = [[HOUSE_Y, drawHouse]];
  for (const c of D.drops) list.push([c.y, () => drawDrop(c)]);
  for (const tr of D.traps || []) list.push([tr.y, () => drawTrap(tr)]);
  for (const tp of D.troops || []) list.push([tp.y, () => drawTroop(tp)]);
  for (let i = 0; i < CAMP_POS.length; i++) list.push([CAMP_POS[i].y, () => drawCamp(i)]);
  list.push([D.lead.y, drawLeader]);
  for (const w of D.walls) list.push([FENCE_Y, () => drawFence(w)]);
  for (let s = 0; s < SLOTS; s++) { const q = platPos(s); list.push([q.y, () => drawPlatform(s)]); }
  for (const c of D.cats) list.push([c.y, () => drawCat(c)]);
  list.sort((a, b) => a[0] - b[0]);
  for (const it of list) it[1]();
  drawPads(true);
  for (const e of D.eshots || []) drawEShot(e);
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
    else if (p.kind === 'dot') { ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(q.x, y, p.sz * (1 - p.t / p.life * 0.5), 0, Math.PI * 2); ctx.fill(); }
    else if (p.kind === 'shard') { ctx.save(); ctx.translate(q.x, y); ctx.rotate(p.r + p.t * 10); ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(0, -p.sz * 1.4); ctx.lineTo(p.sz * 0.6, 0); ctx.lineTo(0, p.sz * 1.4); ctx.lineTo(-p.sz * 0.6, 0); ctx.fill(); ctx.restore(); }
    else {
      ctx.save(); ctx.translate(q.x, y); ctx.rotate(p.r + p.t * 8);
      ctx.fillStyle = p.kind === 'wood' ? '#d9b98a' : p.kind === 'rock' ? '#a99878' : p.col;
      const w = p.kind === 'confetti' ? 7 : 6, h = p.kind === 'confetti' ? 4 : p.kind === 'wood' ? 3 : 5;
      ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  for (const f of D.floats) {
    const p = dproj(f.x, f.y), a = 1 - Math.max(0, f.t - 0.6) / 0.5;
    ctx.globalAlpha = Math.max(0, a);
    // pop: overshoot then settle, rise with ease-out
    const pop = f.pop ? (f.t < 0.12 ? 0.4 + f.t / 0.12 * 1.0 : Math.max(1, 1.4 - (f.t - 0.12) * 3)) : 1;
    const size = (f.big ? 21 : f.small ? 14 : 17) * pop;
    ctx.font = `900 ${Math.round(size)}px Mitr,system-ui,sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = f.big ? 5 : 3.5; ctx.strokeStyle = f.big ? '#7a2a00' : 'rgba(0,0,0,.6)'; ctx.lineJoin = 'round';
    const y = p.y - dk * 1.25 - (1 - Math.pow(1 - Math.min(1, f.t / 1.1), 3)) * 36;
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
// ---------- painted background: soft garden lawn for the cats, checkered kitchen floor for the ducks ----------
let bgCache = null;
function getBg() {
  const key = `${W}x${H}x${dk.toFixed(2)}x${ready(IMG.bg_lane) ? 1 : 0}`;
  if (bgCache && bgCache.key === key) return bgCache.cv;
  if (!(W > 0 && H > 0)) return null;
  const sc = Math.min(window.devicePixelRatio || 1, 2), cv2 = document.createElement('canvas');
  cv2.width = Math.round(W * sc); cv2.height = Math.round(H * sc);
  const g = cv2.getContext('2d'); g.scale(sc, sc);
  const fy = dproj(0, FENCE_Y).y, bi = IMG.bg_lane;
  if (ready(bi)) {
    // painted lawn + kitchen floor; the grass/tile edge (64.1% down the image) sits on the fence line
    const iw = bi.naturalWidth, ih = bi.naturalHeight, E = 0.641;
    const s2 = Math.max(W / iw, (H - fy) / (ih * (1 - E)), fy / (ih * E));
    const dw = iw * s2, dh = ih * s2;
    g.drawImage(bi, (W - dw) / 2, fy - E * dh, dw, dh);
  } else {
    let seed = 1234567; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    // lawn
    const lg = g.createLinearGradient(0, 0, 0, fy);
    lg.addColorStop(0, '#93d466'); lg.addColorStop(1, '#78c04e');
    g.fillStyle = lg; g.fillRect(0, 0, W, fy + 4);
    // soft patches of lighter / darker grass
    for (let i = 0; i < 40; i++) {
      const x = rnd() * W, y = rnd() * fy, r = 30 + rnd() * 70;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      const c = rnd() < 0.5 ? '160,220,110' : '90,165,60';
      rg.addColorStop(0, `rgba(${c},.35)`); rg.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = rg; g.beginPath(); g.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2); g.fill();
    }
    // grass tufts
    for (let i = 0; i < 170; i++) {
      const x = rnd() * W, y = rnd() * fy, s2 = 3 + rnd() * 4;
      g.strokeStyle = rnd() < 0.5 ? 'rgba(60,130,40,.55)' : 'rgba(170,230,120,.7)'; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - s2, y); g.quadraticCurveTo(x - s2, y - s2, x - s2 * 1.6, y - s2 * 2);
      g.moveTo(x, y); g.lineTo(x, y - s2 * 2.4); g.moveTo(x + s2, y); g.quadraticCurveTo(x + s2, y - s2, x + s2 * 1.6, y - s2 * 2); g.stroke();
    }
    // pebbles and little flowers
    for (let i = 0; i < 16; i++) { const x = rnd() * W, y = rnd() * fy, r = 3 + rnd() * 5;
      g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(x + 1, y + 2, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#cfc8b8'; g.beginPath(); g.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ebe6da'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.2, r * 0.4, r * 0.25, 0, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 34; i++) { const x = rnd() * W, y = rnd() * fy, col = ['#ffffff', '#fff3a0', '#ffb7c9', '#ffd08a'][Math.floor(rnd() * 4)];
      g.fillStyle = col; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 2.2, 2.3, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#ffb000'; g.beginPath(); g.arc(x, y, 1.8, 0, Math.PI * 2); g.fill(); }
    // gentle shade at the top and the sides
    const vg = g.createLinearGradient(0, 0, 0, fy * 0.35); vg.addColorStop(0, 'rgba(20,60,10,.25)'); vg.addColorStop(1, 'rgba(20,60,10,0)');
    g.fillStyle = vg; g.fillRect(0, 0, W, fy * 0.35);
    for (const [x0, x1] of [[0, W * 0.12], [W, W * 0.88]]) { const sg = g.createLinearGradient(x0, 0, x1, 0); sg.addColorStop(0, 'rgba(20,60,10,.22)'); sg.addColorStop(1, 'rgba(20,60,10,0)'); g.fillStyle = sg; g.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), fy); }
    // kitchen floor (checkered tiles) behind the fence
    const ty0 = fy - dk * 0.15, tw = dk * 0.95, th = tw * 0.62;
    g.fillStyle = '#efe0c2'; g.fillRect(0, ty0, W, H - ty0);
    const cols = Math.ceil(W / tw) + 2, rows = Math.ceil((H - ty0) / th) + 1, ox = (W / 2) % tw - tw;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if ((r + c) % 2) continue;
      g.fillStyle = '#e6c493'; g.fillRect(ox + c * tw, ty0 + r * th, tw, th);
    }
    g.strokeStyle = 'rgba(150,110,70,.25)'; g.lineWidth = 1;
    for (let r = 0; r <= rows; r++) { g.beginPath(); g.moveTo(0, ty0 + r * th); g.lineTo(W, ty0 + r * th); g.stroke(); }
    for (let c = 0; c <= cols; c++) { g.beginPath(); g.moveTo(ox + c * tw, ty0); g.lineTo(ox + c * tw, H); g.stroke(); }
    // soft light in the middle of the floor, shadow under the fence
    const fl = g.createRadialGradient(W / 2, H * 0.88, 10, W / 2, H * 0.88, W * 0.8); fl.addColorStop(0, 'rgba(255,250,230,.35)'); fl.addColorStop(1, 'rgba(255,250,230,0)');
    g.fillStyle = fl; g.fillRect(0, ty0, W, H - ty0);
    const sh = g.createLinearGradient(0, ty0, 0, ty0 + dk * 0.9); sh.addColorStop(0, 'rgba(60,40,20,.35)'); sh.addColorStop(1, 'rgba(60,40,20,0)');
    g.fillStyle = sh; g.fillRect(0, ty0, W, dk * 0.9);

  }
  // a little round rug in front of the house
  const hp = dproj(0, HOUSE_Y - 0.1);
  g.fillStyle = 'rgba(0,0,0,.08)'; g.beginPath(); g.ellipse(hp.x, hp.y + 3, dk * 1.55, dk * 0.6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#d9584a'; g.beginPath(); g.ellipse(hp.x, hp.y, dk * 1.5, dk * 0.56, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fff3d6'; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath(); g.ellipse(hp.x, hp.y, dk * 1.3, dk * 0.46, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  bgCache = { key, cv: cv2 };
  return cv2;
}
let houseTop = 0;
function drawHouse() {
  const p = dproj(0, HOUSE_Y - 0.6), s = dk * 0.6;
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
  const c = dproj(w.x, FENCE_Y), ratio = w.hp / w.max, hgt = dk * 1.2;
  const shakeX = w.hit > 0 ? Math.sin(w.hit * 90) * 3 : 0;
  if (w.hp <= 0) {
    for (const f of [-0.3, 0.05, 0.35]) if (ready(IMG.fence_stump)) drawAt(IMG.fence_stump, c.x + f * dk * WALL_W, c.y + 2, dk * 0.42);
    ctx.font = '900 12px Mitr,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.strokeText('🔧 พาเป็ดมาซ่อม', c.x, c.y - hgt * 0.4); ctx.fillStyle = '#ffe2a8'; ctx.fillText('🔧 พาเป็ดมาซ่อม', c.x, c.y - hgt * 0.4);
    return;
  }
  const fimg = IMG[T.fence >= 6 ? 'k_fence3' : T.fence >= 3 ? 'k_fence2' : 'k_fence1'];
  if (ready(fimg)) {
    const tilt = ratio < 0.5 ? Math.sin(w.i * 5) * 0.1 * (1 - ratio * 2) : 0;
    ctx.save(); ctx.translate(c.x + shakeX, c.y + dk * 0.2); ctx.rotate(tilt); if (w.i % 2) ctx.scale(-1, 1);
    drawAt(fimg, 0, 0, dk * WALL_W * 1.12); ctx.restore();
  }
  if (w.hp < w.max) {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(c.x - 18, c.y - hgt * 1.25, 36, 4);
    ctx.fillStyle = ratio > 0.5 ? '#7dde5a' : '#ffb347'; ctx.fillRect(c.x - 18, c.y - hgt * 1.25, 36 * ratio, 4);
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
  const o = shooter(s), h = k * 1.1;
  if (D.phase !== 'wave' && Math.random() < 0.004) o.aimDx = -o.aimDx || 1;   // idle: look the other way now and then
  const flip = o.aimDx < 0;
  o.topH = (p.y - top) / k + 0.5;
  const hop = o.arrive > 0 ? Math.sin(o.arrive * Math.PI) * k * 0.8 : 0;
  const fk = o.shootT > 0 ? Math.min(3, Math.floor((0.3 - o.shootT) / 0.3 * 4)) : 0;
  const dy = top + k * 0.05 - hop;
  if (ready(IMG.k_duck_act)) {
    // kitchen duck: wind up, throw, then idle; holds its weapon; dresses up with the platform tier
    const tr2 = tierOf(pl.lvl), fw = h * 0.75;
    ctx.save(); ctx.translate(p.x, dy); if (flip) ctx.scale(-1, 1);
    if (o.cheer > 0) { o.cheer -= 1 / 60; drawFrame('k_duck_act', 3, 0, -Math.sin((0.5 - o.cheer) / 0.5 * Math.PI) * h * 0.22, h, false); }
    else if (D.flinchT > 0) drawFrame('k_duck_act', 2, Math.sin(performance.now() / 25) * 2, 0, h, false);
    else if (o.stunT > 0) { drawFrame('k_duck_act', 2, 0, 0, h, false); ctx.font = `${Math.round(h * 0.3)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('💫', Math.cos(performance.now() / 150) * h * 0.2, -h * 1.05); }
    else if (D.phase === 'victory' && D.cheered) { const hp2 = Math.abs(Math.sin(performance.now() / 160 + s)) * h * 0.25; drawFrame('k_duck_act', 3, 0, -hp2, h, false); }
    else if (o.shootT > 0) drawFrame('k_duck_act', o.shootT > 0.15 ? 0 : 1, 0, 0, h, false);
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
  if (pl.w === 'coffee') {
    const tt = performance.now() / 1000;
    ctx.save();
    for (let i = 0; i < 4; i++) { const k2 = (tt * 0.6 + i / 4) % 1; ctx.globalAlpha = (1 - k2) * 0.6; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(p.x + Math.sin(tt * 2 + i) * k * 0.2, dy - h * 0.9 - k2 * k * 1.2, 3 + k2 * 6, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  // weapon + level badge, coloured by level tier, with stars
  // (no badge over the duck any more: it hid the face. Level and weapon show on the pad and in the sheet)
}
function catImg(c) { return OLD_IMG[c.kind] || 'cat'; }
function drawCat(c) {
  const p = dproj(c.x, c.y), h = dk * (c.boss ? 2.8 : c.kind === 'chief' ? 1.75 : (CAT_KINDS[c.kind] || CAT_KINDS.cat).size);
  if ((c.kind === 'ninja' || c.kind === 'shadow') && c.hp > 0 && c.st === 'walk') {
    // speed streaks behind ninja cats
    ctx.strokeStyle = 'rgba(200,170,255,.45)'; ctx.lineWidth = 2;
    const bx = -(c.mx || 0), by = -(c.my === undefined ? 1 : c.my);
    for (let i = 0; i < 3; i++) { const q = dproj(c.x + bx * (0.3 + i * 0.15), c.y + by * (0.3 + i * 0.15)); ctx.beginPath(); ctx.moveTo(q.x - 4, q.y - h * (0.3 + i * 0.2)); ctx.lineTo(q.x + 4, q.y - h * (0.3 + i * 0.2)); ctx.stroke(); }
  }
  ctx.globalAlpha = c.hp > 0 || c.boss ? 1 : Math.max(0, 1 - (c.deadT || 0) / 0.6);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.25, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  const t = performance.now() / 1000 + c.ph;
  // facing for the side-view sprites: only turn when really walking sideways (no jitter from the sway)
  if (c.faceL === undefined) c.faceL = c.x > 0;
  if ((c.mx || 0) < -0.4) c.faceL = true; else if ((c.mx || 0) > 0.4) c.faceL = false;
  const flip = c.faceL;
  let x = p.x + (c.hitT > 0 ? Math.sin(c.hitT * 120) * 3 : 0);
  if (c.kind === 'cart') { drawCart(c, p, h); return; }
  if (c.fly && c.hp <= 0) {
    // knocked flying: arc up and away, spinning, shrinking into the distance
    const f = c.fly, h2 = f.vh * f.t - 9 * f.t * f.t, sc = Math.max(0.2, 1 - f.t * 0.6);
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, f.t - 0.45) / 0.2);
    ctx.translate(p.x + f.vx * f.t * dk, p.y - Math.max(0, h2) * dk - h * 0.4); ctx.rotate(f.t * f.spin); ctx.scale(sc, sc);
    const im = OLD_IMG[c.kind] ? OLD_IMG[c.kind] : 'k_cat_act';
    if (ready(IMG[im])) drawFrame(im, OLD_IMG[c.kind] ? 1 : 2, 0, h * 0.5, h, false);
    ctx.restore(); ctx.globalAlpha = 1;
    if (f.t > 0.5 && !f.poofed) { f.poofed = true; }
    return;
  }
  const KC = !c.boss && !OLD_IMG[c.kind] && ready(IMG.k_cat_walk) && ready(IMG.k_cat_act);
  if (c.hp <= 0 && !KC) { ctx.save(); ctx.translate(x, p.y); ctx.rotate((flip ? -1 : 1) * Math.min(1.4, (c.deadT || 0) * 5)); x = 0; }
  const py = c.hp <= 0 && !KC ? 0 : p.y, atk = (c.fighting || c.st !== 'walk') && c.st !== 'flee' && c.st !== 'jump' && c.hp > 0, k = (c.atk || 0) / 0.9;
  if (KC) {
    if (c.hp <= 0 && c.kind !== 'chief') ctx.globalAlpha = Math.max(0, 1 - Math.max(0, (c.deadT || 0) - 0.25) / 0.4);
    drawKitchenCat(c, x, py, h, atk, k, t);
  } else if (c.boss && ready(IMG.k_king_walk) && ready(IMG.k_king_act)) {
    const bh = h * 1.1;
    if (c.hp <= 0) {
      ctx.restore(); ctx.globalAlpha = 1;
      const dt2 = c.deadT || 0;
      if (dt2 < 1.3) {
        // knocked down: sits dizzy, wobbling, stars circling
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(dt2 * 9) * 0.06); drawFrame('k_king_act', 2, 0, 0, bh * 0.9, flip); ctx.restore();
      } else {
        // limps away, back turned, little hops, sweat drop
        ctx.save(); ctx.translate(p.x, p.y - Math.abs(Math.sin(dt2 * 7)) * bh * 0.04); ctx.rotate(Math.sin(dt2 * 7) * 0.08);
        drawFrame('k_king_act', 3, 0, 0, bh * 0.95, Math.floor(dt2 * 3.5) % 2 === 1); ctx.restore();
        ctx.font = `${Math.round(bh * 0.18)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('💦', p.x + bh * 0.28, p.y - bh * 0.85 + Math.sin(dt2 * 12) * 3);
      }
      ctx.font = `${Math.round(bh * 0.16)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('💫', p.x + Math.cos(dt2 * 5) * bh * 0.18, p.y - bh * 0.98);
      return;
    }
    if (atk) {
      const kb = c.atk / BOSS_PERIOD, up = kb < 0.55;
      const sq = up ? 1 + kb * 0.08 : 1 - Math.max(0, 0.25 - (kb - 0.55)) * 0.4;
      ctx.save(); ctx.translate(x, py); ctx.scale(2 - sq, sq); drawFrame('k_king_act', up ? 0 : 1, 0, 0, bh * 1.08, flip); ctx.restore();
    } else {
      const wf = [0, 1, 2, 3][Math.floor(t * 6) % 4], bob = Math.abs(Math.sin(t * 6 * Math.PI / 2)) * bh * 0.03;
      ctx.save(); ctx.translate(x, py - bob); ctx.rotate(Math.sin(t * 3 * Math.PI) * 0.03); drawFrame('k_king_walk', wf, 0, 0, bh, false); ctx.restore();
    }
    if (c.hitT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, py - bh * 0.5, bh * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  } else if (c.boss && ready(IMG.boss_walk)) {
    const bh = h * 1.05;
    if (c.hp <= 0 && ready(IMG.boss_die)) {
      ctx.restore(); // undo the generic death spin for the boss
      ctx.globalAlpha = 1;
      const dt2 = c.deadT || 0;
      if (dt2 < 1.3 || !ready(IMG.boss_walk_back)) drawFrame('boss_die', Math.min(2, Math.floor(dt2 / 0.35)), p.x, p.y, bh * 0.95, flip);
      else {
        // limping / crawling away, hunched over, with a sweat drop
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(dt2 * 6) * 0.12); ctx.scale(1, 0.82);
        drawFrame('boss_walk_back', Math.floor(dt2 * 4) % 6, 0, 0, bh * 0.9, false); ctx.restore();
        ctx.font = `${Math.round(bh * 0.18)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('💦', p.x + bh * 0.25, p.y - bh * 0.85 + Math.sin(dt2 * 12) * 3);
        ctx.fillText('💫', p.x + Math.cos(dt2 * 5) * bh * 0.15, p.y - bh * 0.95);
      }
      return;
    }
    if (atk && ready(IMG.boss_attack)) {
      const kb = c.atk / BOSS_PERIOD;
      const fr = kb < 0.45 ? 0 : kb < 0.65 ? 1 : kb < 0.8 ? 2 : 3;
      drawFrame('boss_attack', fr, x, py, bh * 1.1, flip);
    } else {
      const back = (c.my || 1) < -0.3 && ready(IMG.boss_walk_back);
      drawFrame(back ? 'boss_walk_back' : 'boss_walk', Math.floor(t * 7) % 6, x, py - Math.abs(Math.sin(t * 5.7)) * bh * 0.03, bh, back ? !flip : flip);
    }
    if (c.hitT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, py - bh * 0.5, bh * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  } else if (c.boss && ready(IMG.boss)) {
    ctx.save(); ctx.translate(x, py); ctx.rotate(atk ? Math.sin(k * Math.PI * 2) * 0.25 : Math.sin(t * 6) * 0.06);
    drawAt(IMG.boss, 0, 0, h * IMG.boss.naturalWidth / IMG.boss.naturalHeight); ctx.restore();
  } else if (OLD_IMG[c.kind] && ready(IMG[OLD_IMG[c.kind]])) {
    // redesigned front-walking cats: code-driven lunge for the attack
    const ci = OLD_IMG[c.kind], wf = Math.floor(t * (c.kind === 'shadow' ? 12 : 8)) % 4;
    if (atk) {
      const wind = k < 0.5 ? k / 0.5 : 0, hit = k >= 0.5 && k < 0.75 ? 1 - Math.abs(k - 0.62) / 0.13 : 0;
      ctx.save(); ctx.translate(x, py + hit * h * 0.1); ctx.scale(1 + wind * 0.08 - hit * 0.05, 1 - wind * 0.1 + hit * 0.12);
      ctx.rotate((flip ? 1 : -1) * (wind * 0.12 - hit * 0.2));
      drawFrame(ci, k < 0.5 ? 1 : 2, 0, 0, h, flip); ctx.restore();
    } else if (c.st === 'flee') {
      ctx.save(); ctx.translate(x, py - Math.abs(Math.sin(t * 9)) * h * 0.06); ctx.scale(1, 0.95); drawFrame(ci, Math.floor(t * 14) % 4, 0, 0, h, !flip); ctx.restore();
    } else drawFrame(ci, wf, x, py - Math.abs(Math.sin(t * 7)) * h * 0.05, h, false);
  } else if (c.st === 'flee' && c.hp > 0 && ready(IMG[catImg(c) + '_back'])) {
    const lunge = atk && k > 0.55 && k < 0.8 ? -h * 0.08 : 0;
    drawFrame(catImg(c) + '_back', atk ? (k < 0.55 ? 0 : 3) : Math.floor(t * 9) % 6, x, py + lunge - (atk ? 0 : Math.abs(Math.sin(t * 7)) * h * 0.05), h, !flip);
  } else if (ready(IMG.cat)) {
    const ci = ready(IMG[catImg(c)]) ? catImg(c) : 'cat';
    if (atk) drawFrame(ci, k < 0.5 ? 2 : k < 0.75 ? 3 : 4, x, py, h, flip);
    else drawFrame(ci, [0, 1, 5, 1][Math.floor(t * (c.kind === 'shadow' ? 14 : 8)) % 4], x, py - Math.abs(Math.sin(t * 7)) * h * 0.06, h, flip);
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
    const big = c.boss || c.kind === 'chief', bw = c.boss ? 70 : big ? 46 : 22;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(p.x - bw / 2, p.y - h * 1.05, bw, big ? 6 : 3);
    ctx.fillStyle = c.kind === 'chief' ? '#ffb02a' : '#ff4a3a'; ctx.fillRect(p.x - bw / 2, p.y - h * 1.05, bw * c.hp / c.max, big ? 6 : 3);
  }
}
function drawCart(c, p, h) {
  const t = performance.now() / 1000 + c.ph, dead = c.hp <= 0;
  ctx.save(); ctx.globalAlpha = dead ? Math.max(0, 1 - (c.deadT || 0) / 0.6) : 1;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.55, h * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  const bob = c.st === 'walk' ? Math.abs(Math.sin(t * 6)) * h * 0.03 : 0, rec = (c.recoil || 0) / 0.35;
  ctx.translate(p.x + (c.hitT > 0 ? Math.sin(c.hitT * 120) * 3 : 0), p.y - bob); ctx.rotate(-rec * 0.12);
  if (ready(IMG.k_cart)) drawAt(IMG.k_cart, 0, 0, h * 1.25);
  else { ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-h * 0.5, -h * 0.5, h, h * 0.4); }
  // two little cats pushing it
  if (!dead && ready(IMG.k_cat_back)) { for (const sx of [-0.32, 0.32]) drawFrame('k_cat_back', Math.floor(t * 7 + sx * 4) % 4, sx * h, -h * 0.02 + h * 0.15, h * 0.5, false); }
  ctx.restore();
  if (c.hp > 0 && c.hp < c.max) { const bw = 40; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(p.x - bw / 2, p.y - h * 0.95, bw, 4); ctx.fillStyle = '#ff4a3a'; ctx.fillRect(p.x - bw / 2, p.y - h * 0.95, bw * c.hp / c.max, 4); }
}
function drawEShot(e) {
  const u = Math.min(1, e.t / e.dur), x = e.sx + (e.tx - e.sx) * u, y = e.sy + (e.ty - e.sy) * u;
  const q = dproj(x, y), lift = Math.sin(u * Math.PI) * dk * (e.type === 'cat' ? 5 : e.type === 'skewer' ? 1.6 : 3.5) + dk * 0.8 * (1 - u) + (e.type === 'skewer' ? dk * 1.4 * u : 0);
  // landing marker so the player can see it coming
  const m = dproj(e.tx, e.ty); ctx.save(); ctx.globalAlpha = 0.35 + u * 0.4; ctx.strokeStyle = '#ff4a3a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(m.x, m.y, dk * 0.45 * (1.4 - u * 0.5), dk * 0.28 * (1.4 - u * 0.5), 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(q.x, q.y, dk * 0.2, dk * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  const yy = q.y - lift;
  if (e.type === 'cat' && ready(IMG.k_cat_act)) { ctx.save(); ctx.translate(q.x, yy); ctx.rotate(e.t * 9); drawFrame('k_cat_act', 2, 0, dk * 0.4, dk * 0.8, false); ctx.restore(); }
  else if (e.type === 'chili') drawItem('it_chili', q.x, yy, dk * 0.5, e.t * 10);
  else if (e.type === 'skewer') drawItem('it_skewer', q.x, yy, dk * 0.55, e.t * 14);
  else { ctx.fillStyle = '#8f8a80'; ctx.beginPath(); ctx.arc(q.x, yy, dk * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#3a3630'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#b8b2a6'; ctx.beginPath(); ctx.arc(q.x - dk * 0.06, yy - dk * 0.06, dk * 0.07, 0, Math.PI * 2); ctx.fill(); }
}
function drawKitchenCat(c, x, py, h, atk, kk, t) {
  const cb = c.kind === 'chief', G = c.gear || catGear(c.kind);
  // glider in the air: lift it up and open the colander parachute
  const jh = c.jh || 0;
  if (jh > 0) py -= jh * dk;
  // the kitchen cat sprites face RIGHT; cats on the right side walk left, so mirror those
  const flee = c.st === 'flee', flip = (c.mx || 0) < 0, w = h * 0.76, dead = c.hp <= 0;
  let img = 'k_cat_walk', fr = Math.floor(t * (flee ? 16 : c.kind === 'ninja' ? 12 : 7)) % 4, bob = Math.abs(Math.sin(t * 7)) * h * 0.04;
  let swing = -1, view = 'side';
  // walking mostly up or down the screen: show the cat from the back or the front
  let lunge = 0, swingA = null;
  if (!dead) {
    const my = c.my === undefined ? 1 : c.my, mx = c.mx || 0;
    if (atk || c.hitT > 0 || c.stun > 0 || Math.abs(my) * 0.8 > Math.abs(mx)) { view = !atk && my < 0 ? 'back' : 'front'; img = view === 'back' ? 'k_cat_back' : 'k_cat_front'; if (!ready(IMG[img])) { img = 'k_cat_walk'; view = 'side'; } }
    if (view !== 'side' && (atk || c.hitT > 0 || c.stun > 0)) {
      fr = 1; bob = 0;
      // attack from the front with code only: lean back while raising the weapon, then lunge down and smack
      if (atk) { const kb = kk; if (kb < 0.6) { lunge = -h * 0.05 * (kb / 0.6); swingA = -0.5 - kb; } else { const q = Math.min(1, (kb - 0.6) / 0.15); lunge = h * 0.1 * q; swingA = -1.1 + q * 3.2; } }
    }
  }
  if (dead && cb && (c.deadT || 0) > 1.3 && ready(IMG.k_cat_back)) {
    // the sous-chef limps away, hat gone, sweating
    const dt2 = c.deadT;
    ctx.save(); ctx.translate(x, py); ctx.rotate(Math.sin(dt2 * 6) * 0.15); ctx.scale(1, 0.85);
    drawFrame('k_cat_back', Math.floor(dt2 * 5) % 4, 0, 0, h, false); ctx.restore();
    ctx.font = `${Math.round(h * 0.25)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('💦', x + h * 0.3, py - h + Math.sin(dt2 * 12) * 3);
    return;
  }
  if (dead) { img = 'k_cat_act'; fr = 3; bob = 0; }
  else if (view !== 'side') {}
  else if (atk) { const kb = kk; img = 'k_cat_act'; fr = kb < 0.55 ? 0 : 1; swing = fr; bob = 0; }
  else if (c.hitT > 0 || c.stun > 0) { img = 'k_cat_act'; fr = 2; bob = 0; }
  if (flee && !dead) { ctx.font = `${Math.round(h * 0.3)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('💦', x + h * 0.3, py - h * 1.0 + Math.sin(t * 20) * 3); }
  if (view !== 'side') {
    // front / back views are symmetric: no mirroring, gear centred
    const fw = h * 0.7, tk = c.kind === 'tank', wpn = G.wpn;
    const ws = h * (cb ? 0.55 : tk ? 0.5 : 0.45), sw = Math.sin(t * 7) * 0.12;
    if (c.dance) bob += Math.abs(Math.sin(c.dance * 10 + c.ph)) * h * 0.15;
  ctx.save(); ctx.translate(x, py - bob + lunge);
    { // squash & stretch: stretch on the way up of each step, squash when hit
      const sq = c.squash || 0, step = !dead && !atk && c.st === 'walk' ? Math.sin(t * 14) * 0.04 : 0;
      ctx.scale(1 + sq * 0.22 - step, 1 - sq * 0.2 + step);
    }
    if (lunge < 0) ctx.scale(1, 1 + lunge / h * 0.6); else if (lunge > 0) ctx.scale(1 + lunge / h * 0.5, 1 - lunge / h * 0.4);
    if (view === 'back') drawItem(wpn, -fw * 0.48, -h * 0.5, ws, -0.4 + sw);       // weapon peeks out at the side
    drawFrame(img, fr, 0, 0, h, false);
    if (jh > 0) drawItem('it_foodcover', 0, -h * 1.45, h * 1.1);
    else if (cb) drawItem('it_chefhat', 0, -h * 0.97, h * 0.5);
    else if (tk) drawItem('it_steamer', 0, -h * 0.9, h * 0.52);
    else if (c.kind === 'ninja') {
      ctx.fillStyle = '#d8352a'; ctx.fillRect(-fw * 0.42, -h * (view === 'back' ? 0.78 : 0.8), fw * 0.84, h * 0.07);
      if (view === 'back') { ctx.beginPath(); ctx.moveTo(-fw * 0.04, -h * 0.75); ctx.lineTo(-fw * 0.16 + Math.sin(t * 15) * fw * 0.05, -h * 0.58); ctx.lineTo(fw * 0.02, -h * 0.6); ctx.lineTo(fw * 0.16 + Math.sin(t * 13) * fw * 0.05, -h * 0.58); ctx.lineTo(fw * 0.04, -h * 0.75); ctx.fill(); }
    }
    else drawHat(G.hat, 0, -h * 0.92, h * 0.52);
    if (G.apron && view === 'front') drawItem('it_catapron', 0, -h * 0.36, h * 0.5);
    if (G.mitts && view === 'front') {
      // boxing with oven mitts: jab left / right while attacking
      const jab = swingA !== null ? Math.max(0, Math.sin(swingA * 2)) : 0;
      drawItem('it_mitt', -fw * 0.48, -h * 0.5 + jab * h * 0.12, h * 0.4, -0.3);
      drawItem('it_mitt', fw * 0.48, -h * 0.5 - jab * h * 0.12 + (swingA !== null ? h * 0.1 : 0), h * 0.4, 0.3);
    } else if (view === 'front') {
      if (swingA !== null && !(tk && !cb)) drawItem(wpn, fw * 0.45 + Math.sin(swingA) * fw * 0.2, -h * 0.55 - Math.cos(swingA) * h * 0.25, ws * 1.1, swingA);
      else if (tk && !cb) drawItem(wpn, 0, -h * 0.38 + (swingA !== null ? lunge * 0.5 : 0), ws);
      else drawItem(wpn, fw * 0.5, -h * 0.45, ws, 0.3 + sw);
    }
    else if (tk && !cb) drawItem(wpn, 0, -h * 0.45, ws * 0.9);                  // pan strapped to the back
    ctx.restore();
    return;
  }
  ctx.save(); ctx.translate(x, py - bob); if (flip) ctx.scale(-1, 1);
  if (c.squash) ctx.scale(1 + c.squash * 0.22, 1 - c.squash * 0.2);
  drawFrame(img, fr, 0, 0, h, false);
  if (!dead) {
    // headgear (front of the face is +x)
    if (cb) drawItem('it_chefhat', w * 0.02, -h * 0.97, h * 0.5);
    else if (c.kind === 'tank') drawItem('it_steamer', w * 0.02, -h * 0.88, h * 0.5);
    else if (c.kind === 'ninja') { ctx.fillStyle = '#d8352a'; ctx.fillRect(-w * 0.36, -h * 0.82, w * 0.72, h * 0.07); ctx.beginPath(); ctx.moveTo(-w * 0.34, -h * 0.8); ctx.lineTo(-w * 0.52, -h * 0.86 + Math.sin(t * 15) * h * 0.04); ctx.lineTo(-w * 0.5, -h * 0.74); ctx.fill(); }
    else drawHat(G.hat, w * 0.02, -h * 0.9, h * 0.5, 0.06);
    // weapon in the front paw
    const wpn = G.wpn;
    const ws = h * (cb ? 0.55 : c.kind === 'tank' ? 0.5 : 0.45);
    if (c.kind === 'tank' && !cb && !atk) drawItem(wpn, w * 0.3, -h * 0.4, ws, 0);          // frying-pan shield in front
    else if (swing === 1) drawItem(wpn, w * 0.5, -h * 0.5, ws, 1.9);                               // smack!
    else if (swing === 0) drawItem(wpn, -w * 0.3, -h * 0.88, ws, -0.7);                            // wind up behind the head
    else drawItem(wpn, w * 0.36, -h * 0.5, ws, 0.3 + Math.sin(t * 7) * 0.12);
  }
  ctx.restore();
}
// screen position of a shot at time tt (used for trails)
function shotScreen(s, tt) {
  if (tt < 0) return null;
  if (s.pan) {
    const tot = s.back ? s.dur * 2 : s.dur, u = Math.min(1, tt / tot), k1 = s.back ? Math.sin(u * Math.PI) : 1 - (1 - u) * (1 - u);
    const q = dproj(s.sx + (s.tx - s.sx) * k1, s.sy + (s.ty - s.sy) * k1); return { x: q.x, y: q.y - dk * 0.9 };
  }
  if (s.rain) return null;
  const k = Math.min(1, tt / s.dur), W0 = WEAPON[s.w] || {};
  const base = s.high ? (s.h0 || PLAT_H + 0.55) * (1 - k) + 0.5 * k : 0.6;
  const lift = (s.bomb || W0.arc || s.w === 'seed') ? Math.sin(k * Math.PI) * dk * (s.w === 'seed' ? 1.2 : 2.2) + dk * base * (1 - k) : dk * base;
  const q = dproj(s.sx + (s.tx - s.sx) * k, s.sy + (s.ty - s.sy) * k); return { x: q.x, y: q.y - lift };
}
function drawShot(s) {
  const k = Math.min(1, s.t / s.dur);
  const W0 = WEAPON[s.w] || {};
  // arrows leave from the raised platform and drop toward the target
  const base = s.high ? (s.h0 || PLAT_H + 0.55) * (1 - k) + 0.5 * k : 0.6;
  const lift = (s.bomb || W0.arc || s.w === 'seed') ? Math.sin(Math.max(0, k) * Math.PI) * dk * (s.w === 'seed' ? 1.2 : 2.2) + dk * base * (1 - k) : dk * base;
  const p = dproj(s.x, s.y), y = p.y - lift;
  if (s.rain) {
    if (s.t < 0) return;
    const q = dproj(s.tx, s.ty), kk = Math.min(1, s.t / s.dur);
    drawItem('it_chopsticks', q.x, q.y - (1 - kk) * dk * 5 - dk * 0.3, dk * 0.5, 2.35);
    return;
  }
  if (s.bomb) { drawItem('it_chili', p.x, y, dk * 0.5, s.t * 14) || (ctx.fillStyle = '#d33', ctx.fillRect(p.x - 4, y - 4, 8, 8)); return; }
  if (s.t < 0) return;
  // glowing trail behind every thrown item
  if (!s.flame) {
    const tier = s.tier || 0, col = tier >= 3 ? '#ffe680' : WCOL[s.w] || '#fff', n = 5 + tier * 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i <= n; i++) {
      const q = shotScreen(s, s.t - i * 0.022); if (!q) break;
      ctx.globalAlpha = (1 - i / (n + 1)) * 0.55; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(q.x, q.y, dk * (0.12 + tier * 0.03) * (1 - i / (n + 2)), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  if (s.flame) {
    const u = Math.min(1, s.t / s.dur), q = dproj(s.x, s.y), r = dk * (0.25 + u * 0.55), yy = q.y - dk * (s.h0 || 1) * (1 - u) - dk * 0.4;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85 * (1 - u * 0.7);
    const g = ctx.createRadialGradient(q.x, yy, 0, q.x, yy, r);
    if (s.blue) { g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#7ad0ff'); g.addColorStop(1, 'rgba(40,80,255,0)'); }
    else { g.addColorStop(0, '#fff6c0'); g.addColorStop(0.35, '#ffa02a'); g.addColorStop(1, 'rgba(255,40,0,0)'); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, yy, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    return;
  }
  if (s.roll) {
    const q = dproj(s.x, s.y), w = dk * s.wide * 1.7, hh = dk * 0.32;
    ctx.save(); ctx.translate(q.x, q.y - hh * 0.6);
    ctx.fillStyle = '#c98a4a'; roundRect(-w / 2, -hh / 2, w, hh, hh / 2); ctx.fill();
    ctx.fillStyle = '#e8b47a'; roundRect(-w / 2 + 3, -hh / 2 + 2, w - 6, hh * 0.35, hh / 4); ctx.fill();
    ctx.strokeStyle = 'rgba(110,60,20,.6)'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { const yy = ((s.t * 6 + i / 4) % 1) * hh - hh / 2; ctx.beginPath(); ctx.moveTo(-w / 2 + 6, yy); ctx.lineTo(w / 2 - 6, yy); ctx.stroke(); }
    ctx.fillStyle = '#8a5a2b'; for (const sx of [-1, 1]) { roundRect(sx > 0 ? w / 2 : -w / 2 - hh * 0.6, -hh * 0.2, hh * 0.6, hh * 0.4, 3); ctx.fill(); }
    ctx.restore();
    return;
  }
  if (s.w === 'egg') { ctx.save(); ctx.translate(p.x, y); ctx.rotate(s.t * 9); ctx.fillStyle = '#fff8ea'; ctx.beginPath(); ctx.ellipse(0, 0, dk * 0.16, dk * 0.21, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); return; }
  if (s.w === 'fish') { drawItem('it_sauce', p.x, y, dk * 0.45, s.t * 10); return; }
  if (s.w === 'coffee') { ctx.fillStyle = '#6a3a1a'; ctx.beginPath(); ctx.arc(p.x, y, dk * 0.13, 0, Math.PI * 2); ctx.fill(); return; }
  if (s.pan) { drawItem('it_pan', p.x, p.y - dk * (s.h0 ? 0.9 : 0.6), dk * (s.big ? 0.75 : 0.55), s.t * 18); return; }
  if (s.w === 'melon' || s.w === 'seed') {
    const r = dk * (s.w === 'seed' ? 0.1 : 0.26) * (1 + (s.tier || 0) * 0.1);
    ctx.save(); ctx.translate(p.x, y); ctx.rotate(s.t * 8);
    if (s.w === 'seed') { ctx.fillStyle = '#2a1a1a'; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
    else {
      ctx.fillStyle = '#2f8a3a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a6e07a'; ctx.lineWidth = Math.max(1.5, r * 0.18);
      for (const o of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(o * r, 0, r * 0.18, r * 0.95, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.strokeStyle = '#163d1c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore(); return;
  }
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
// one cell of a 4-cell painted effect sheet, centred at (x, y)
function fxCell(name, i, x, y, size, rot) {
  const im = IMG[name], cw = im.naturalWidth / 4, ch = im.naturalHeight;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.drawImage(im, Math.max(0, Math.min(3, i)) * cw, 0, cw, ch, -size / 2, -size / 2, size, size); ctx.restore();
}
function drawFx(f) {
  if (f.type === 'fw') return drawFirework(f);
  const p = dproj(f.x, f.y), k = f.t / 0.5;
  if (f.rot === undefined) { f.rot = (Math.random() - 0.5) * 0.8; f.cell = [0, 1, 3][Math.floor(Math.random() * 3)]; }
  // painted effects (fall back to the code-drawn ones below while loading)
  if ((f.type === 'boom' || f.type === 'fire') && ready(IMG.fx_boom)) {
    const sz = dk * (f.type === 'boom' ? 3.2 : 1.7) * (f.size || 1) * (0.75 + k * 0.45);
    ctx.save(); ctx.globalAlpha = Math.min(1, (1 - k) * 1.6);
    fxCell('fx_boom', Math.floor(Math.min(0.99, k) * 4), p.x, p.y - sz * 0.32, sz, f.rot * 0.3); ctx.restore(); return;
  }
  if ((f.type === 'dust' || f.type === 'poof') && ready(IMG.fx_smoke)) {
    const sz = dk * (f.type === 'dust' ? 2.8 : 1.2) * (0.7 + k * 0.6);
    ctx.save(); ctx.globalAlpha = (1 - k) * 0.9;
    fxCell('fx_smoke', Math.floor(Math.min(0.99, k) * 4), p.x, p.y - dk * (f.type === 'poof' ? 0.5 : 0.2) - k * dk * 0.3, sz, f.rot); ctx.restore(); return;
  }
  if (f.type === 'flash' && ready(IMG.fx_hits)) {
    // big hit: white POW burst that pops in and shrinks away
    const pop = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) * 0.4, sz = dk * (f.size || 1.5) * 1.5 * pop;
    ctx.save(); ctx.globalAlpha = Math.min(1, (1 - k) * 2); fxCell('fx_hits', 3, p.x, p.y - dk * 0.5, sz, f.rot * 0.5); ctx.restore(); return;
  }
  if (f.type === 'spark' || !f.type) {
    if (ready(IMG.fx_hits)) {
      const pop = k < 0.25 ? 0.5 + k * 2 : 1, sz = dk * 0.95 * (f.size || 1) * pop;
      ctx.save(); ctx.globalAlpha = Math.min(1, (1 - k) * 1.8); fxCell('fx_hits', f.cell, p.x, p.y - dk * 0.6, sz, f.rot + k); ctx.restore(); return;
    }
  }
  if (f.type === 'splat' && f.color === '#ff4a5a' && ready(IMG.fx_hits)) {
    // red / chili splats use the painted chili splash
    const sz = dk * 1.4 * (f.size || 1) * (0.6 + k * 0.5);
    ctx.save(); ctx.globalAlpha = (1 - k) * 0.95; fxCell('fx_hits', 2, p.x, p.y - dk * 0.2, sz, f.rot); ctx.restore(); return;
  }
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
  } else if (f.type === 'flash') {
    const r = dk * (f.size || 1.5) * (0.6 + k * 0.8);
    const g = ctx.createRadialGradient(p.x, p.y - dk * 0.4, 0, p.x, p.y - dk * 0.4, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, f.color); g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y - dk * 0.4, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * r * 0.3, p.y - dk * 0.4 + Math.sin(a) * r * 0.3); ctx.lineTo(p.x + Math.cos(a) * r, p.y - dk * 0.4 + Math.sin(a) * r * 0.8); ctx.stroke(); }
  } else if (f.type === 'egg') {
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1 - k * k;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(p.x, p.y, dk * 0.55, dk * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffc21a'; ctx.beginPath(); ctx.ellipse(p.x + dk * 0.05, p.y - dk * 0.03, dk * 0.2, dk * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  } else if (f.type === 'splat') {
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = (1 - k) * 0.7; ctx.fillStyle = f.color;
    const r = dk * 0.9 * (f.size || 1) * (0.5 + k * 0.6);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + f.x; ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * r * 0.7, p.y + Math.sin(a) * r * 0.45, r * 0.32, r * 0.2, a, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 0.6, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
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
      ctx.font = `900 ${Math.round(Math.max(10, dk * 0.24))}px Mitr,system-ui,sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.65)';
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
function drawPool(pl) {
  const p = dproj(pl.x, pl.y), a = Math.min(1, pl.t * 4) * Math.min(1, (pl.life - pl.t) * 1.5), r = pl.r * dk;
  ctx.save(); ctx.globalAlpha = a * 0.75;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); g.addColorStop(0, '#6a8a2a'); g.addColorStop(0.7, '#7a6a2a'); g.addColorStop(1, 'rgba(90,70,30,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  const t = performance.now() / 1000;
  for (let i = 0; i < 6; i++) { const k = (t * 0.8 + i / 6) % 1, ang = i * 2.1 + pl.x;
    ctx.globalAlpha = a * (1 - k) * 0.9; ctx.fillStyle = '#b6f07a';
    ctx.beginPath(); ctx.arc(p.x + Math.cos(ang) * r * 0.5, p.y + Math.sin(ang) * r * 0.25 - k * dk * 0.9, 2 + (1 - k) * 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
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
  if (T.lead.atk + T.lead.spd >= 7) drawItem('it_chefhat', w * 0.02, -h * 0.98, h * 0.42);
  // ladle (or frying pan once upgraded) in the front wing
  const big = T.lead.atk >= 5, sw = L.swingT > 0 ? (L.swingT > 0.18 ? -1.3 : 1.1) : 0.35 + Math.sin(L.walkT * 2) * 0.1;
  drawItem(big ? 'it_pan' : 'it_ladle', w * 0.42, -h * 0.5, h * (big ? 0.5 : 0.55), sw, false);
  ctx.restore();
}
function drawTdHud() {
  if (D.phase === 'intro') { drawCatIntro(); return; }
  drawVictoryStars();
  if (D.flashT > 0) { D.flashT -= 1 / 60; ctx.fillStyle = `rgba(255,250,220,${Math.max(0, D.flashT) * 1.6})`; ctx.fillRect(0, 0, W, H); }
  if (D.slowT > 0) { const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,20,0,.35)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }
  if (D.joy && D.joy.moved) {
    const j = D.joy, dx = j.x - j.sx, dy = j.y - j.sy, l = Math.hypot(dx, dy), m = Math.min(l, 45);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(j.sx, j.sy, 48, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(j.sx + (l ? dx / l * m : 0), j.sy + (l ? dy / l * m : 0), 20, 0, Math.PI * 2); ctx.fill();
  } else if (D.lead.goal) {
    const g = dproj(D.lead.goal.x, D.lead.goal.y), b = Math.abs(Math.sin(performance.now() / 180)) * 8;
    ctx.font = `${Math.round(dk * 0.45)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('👇', g.x, g.y - dk * 0.55 - b);
  } else if (!save.td.walked) {
    // first-time hint until the player drags once
    const p = dproj(D.lead.x, D.lead.y), b = Math.sin(performance.now() / 250) * 6;
    ctx.font = '900 14px Mitr,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    const tx = '👆 แตะวงกลมให้เป็ดเดินไปซื้อ'; ctx.strokeText(tx, p.x, p.y + dk * 0.9 + b); ctx.fillStyle = '#fff'; ctx.fillText(tx, p.x, p.y + dk * 0.9 + b);
  }
  if (D.joy && D.joy.moved && !save.td.walked) { save.td.walked = true; persist(); }
  if (D.phase === 'wave') {
    const alive = D.cats.filter(c => c.hp > 0).length + D.queue.length;
    ctx.font = '900 16px Mitr,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    const t1 = `🐱 เหลือ ${alive}`;
    ctx.strokeText(t1, W / 2, 62); ctx.fillStyle = '#fff'; ctx.fillText(t1, W / 2, 62);
    { const tx = W - 46, ty = H - 128, tr = 28;
      ctx.fillStyle = D.trapMode ? 'rgba(255,210,80,.75)' : 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.arc(tx, ty, tr, 0, Math.PI * 2); ctx.fill();
      if (D.trapMode) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
      if (!drawItem('it_fishtrap', tx, ty, tr * 1.5)) { ctx.font = '24px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🐟', tx, ty); }
      ctx.font = '900 13px Mitr,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(T.traps, tx + 20, ty + 18); ctx.fillStyle = '#fff'; ctx.fillText(T.traps, tx + 20, ty + 18); ctx.textBaseline = 'alphabetic';
      if (D.trapMode) { ctx.font = '900 14px Mitr,system-ui,sans-serif'; ctx.strokeText('แตะพื้นด้านบนเพื่อวางกับดัก', W / 2, H - 170); ctx.fillStyle = '#ffe680'; ctx.fillText('แตะพื้นด้านบนเพื่อวางกับดัก', W / 2, H - 170); } }
    const bx = W - 46, by = H - 196, r = 28;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
    if (D.bombCd > 0) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - D.bombCd / 7)); ctx.fill(); }
    ctx.font = '24px system-ui'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('🌶️', bx, by + 1);
    ctx.textBaseline = 'alphabetic';
  }
  if (D.banner > 0) {
    ctx.globalAlpha = Math.min(1, D.banner);
    ctx.font = '900 30px Mitr,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(80,0,0,.75)';
    const txt = D.bannerTxt || (D.bossBanner ? 'ราชาแมวมาแล้ว!! 👑' : 'แมวบุกมาแล้ว!');
    ctx.strokeText(txt, W / 2, H * 0.2); ctx.fillStyle = '#ff6a5a'; ctx.fillText(txt, W / 2, H * 0.2);
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
  }
}

// ---------- over-the-air patches (Android app) ----------
// the app downloads a newer game in the background and calls this when it is ready
window.onMoltPatch = v => {
  let b = document.getElementById('patchBar');
  if (!b) {
    b = document.createElement('button'); b.id = 'patchBar';
    b.style.cssText = 'position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:50;border:0;border-radius:16px;padding:10px 18px;font:900 15px Mitr,system-ui,sans-serif;color:#fff;background:linear-gradient(#5fd06a,#2f9a3e);box-shadow:0 4px 0 #1f6a2a,0 8px 18px rgba(0,0,0,.35)';
    document.body.appendChild(b);
  }
  b.innerHTML = `🔄 อัปเดตใหม่พร้อมแล้ว (รุ่น ${v})<br><small style="font-weight:700">แตะเพื่อโหลดเกมใหม่</small>`;
  b.onclick = () => {
    if (D && (D.phase === 'wave' || D.phase === 'intro')) { toast('สู้วันนี้ให้จบก่อน แล้วค่อยอัปเดตนะ'); return; }
    persist(); if (window.AndroidPatch) AndroidPatch.reload();
  };
};
function gameVersion() { try { return window.AndroidPatch ? 'รุ่น ' + AndroidPatch.version() : 'เว็บ'; } catch (e) { return '?'; } }

// ---------- buttons ----------
$('waveBtn').onclick = e => { e.stopPropagation(); startWave(); };
$('houseBtn').onclick = e => { e.stopPropagation(); SFX.init(); SFX.play('click'); openHouse(); };
$('sheetClose').onclick = closeSheet;
$('raidBtn').onclick = () => {
  if (D && D.phase === 'wave') { toast('สู้วันนี้ให้จบก่อน'); return; }
  SFX.init(); SFX.play('click'); closeSheet(); hide('tdUi');
  state = 'menu'; renderMenu(); preview(); show('menu');
};
$('homeBtn').onclick = () => { SFX.play('click'); enterTD(); };
freshField();
enterTD();
