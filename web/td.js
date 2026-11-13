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
  { id: 'bow',    name: tr("ตะเกียบพุ่ง"),  icon: '🥢', dmg: 1,   rate: 1.3,  range: 6.5, speed: 13, cost: 0 },
  { id: 'xbow',   name: tr("ส้อมยักษ์"),   icon: '🍴', dmg: 3,   rate: 0.8,  range: 8,   speed: 18, cost: 150 },
  { id: 'fire',   name: tr("ซอสพริก"),     icon: '🌶️', dmg: 2,   rate: 1.1,  range: 7,   speed: 13, splash: 1.0, cost: 300 },
  { id: 'ice',    name: tr("ไอติมแท่ง"),   icon: '🍧', dmg: 1.4, rate: 1.1,  range: 7,   speed: 14, cost: 400 },
  { id: 'triple', name: tr("ตะเกียบทั้งกำ"), icon: '🥢', dmg: 1.6, rate: 1.0,  range: 6.5, speed: 14, multi: 3, cost: 500 },
  { id: 'egg',    name: tr("ไข่ดาวแฟลช"),   icon: '🥚', dmg: 1.2, rate: 0.55, range: 7, speed: 9, splash: 1.5, arc: true, cost: 550 },
  { id: 'coffee', name: tr("เป็ดชงกาแฟ"),   icon: '☕', dmg: 0, rate: 0, range: 0, speed: 1, support: true, cost: 600 },
  { id: 'storm',  name: tr("ตะกร้อไฟฟ้า"), icon: '⚡', dmg: 2.2, rate: 0.9,  range: 7.5, speed: 22, chain: 2, cost: 650 },
  { id: 'pan',    name: tr("กระทะบูมเมอแรง"), icon: '🍳', dmg: 2.4, rate: 0.7, range: 7, speed: 9, pierce: true, cost: 750 },
  { id: 'cannon', name: tr("หม้อหุงข้าว"), icon: '🍙', dmg: 9,   rate: 0.33, range: 9,   speed: 9,  splash: 1.8, arc: true, cost: 800 },
  { id: 'stove',  name: tr("เตาพ่นไฟ"),     icon: '🔥', dmg: 0.55, rate: 6, range: 3.2, speed: 6, splash: 0.7, cost: 850 },
  { id: 'fish',   name: tr("น้ำปลาพิษ"),     icon: '🐟', dmg: 1.2, rate: 0.45, range: 7, speed: 8, arc: true, pool: true, cost: 900 },
  { id: 'melon',  name: tr("แตงโมระเบิด"),  icon: '🍉', dmg: 7, rate: 0.4, range: 8, speed: 7, splash: 1.6, arc: true, cost: 1000 },
  { id: 'roller', name: tr("ไม้นวดแป้งกลิ้ง"), icon: '🪵', dmg: 3, rate: 0.35, range: 9, speed: 6, pierce: true, cost: 1100 },
];
for (const w of WEAPONS) { w.range *= 1.8; w.speed *= 1.6; }   // long lane: throw far
const WEAPON = Object.fromEntries(WEAPONS.map(w => [w.id, w]));
// kitchen look: what each duck holds, and what flies through the air
const HELD = { camp: null, egg: null, coffee: 'it_soup', stove: null, fish: 'it_sauce', roller: null, pan: 'it_pan', melon: null, bow: 'it_chopsticks', xbow: 'it_fork', fire: 'it_sauce', ice: 'it_icepop', triple: 'it_chopsticks', storm: 'it_whisk', cannon: 'it_ricecooker' };
const AMMO = { pan: 'it_pan', bow: 'it_chopsticks', xbow: 'it_fork', fire: 'it_chili', ice: 'it_icepop', triple: 'it_chopsticks', storm: 'it_whisk', cannon: 'it_riceball' };
// platform looks by level tier: crates -> table & chairs -> cupboard tower -> golden stove fort
const PLAT_NAME = [tr("ป้อมไม้"), tr("ป้อมหิน"), tr("ป้อมเหล็ก"), tr("ป้อมทองคำ")];
const PLAT_SKILL = ['', tr("ยิงเร็วขึ้น 15%"), tr("ยิงเร็วขึ้น 30%"), tr("ยิงเร็วขึ้น 45% + ฝนตะเกียบทุก 6 วิ")];
// draw a kitchen item centred at (x, y)
function drawItem(name, x, y, size, rot, flip) {
  const img = IMG[name]; if (!ready(img)) return false;
  const w = artWidth(img), h = artHeight(img), s = size / Math.max(w, h);
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w * s / 2, -h * s / 2, w * s, h * s);
  ctx.restore(); return true;
}
// level look: 0 = Lv1-3, 1 = Lv4-6, 2 = Lv7-9, 3 = Lv10
function tierOf(lvl) { return lvl >= 10 ? 3 : lvl >= 7 ? 2 : lvl >= 4 ? 1 : 0; }
const TIER_COL = ['#8a8f99', '#3fb24f', '#4a8cff', '#c06bff'];
const TIER_GLOW = [null, '#a6ff9a', '#9fd0ff', '#ffd84a'];
const WCOL = { camp: '#8a9a6a', egg: '#fff6c0', coffee: '#c08a5a', stove: '#ff8a2a', fish: '#9be36a', roller: '#e0b07a', pan: '#e6e6f5', melon: '#ff5a6a', seed: '#ff5a6a', bow: '#ffe27a', xbow: '#d8f4ff', fire: '#ff8a2a', ice: '#9fe8ff', triple: '#ffe27a', storm: '#c8b6ff', cannon: '#ffb347' };
// special powers unlocked at Lv5 and Lv10
const PERKS = {
  bow:    [tr("พุ่งทีละ 2 คู่"), tr("จิ้มคริติคอล 25% (x2)")],
  xbow:   [tr("แทงแมวกระเด็นถอยหลัง"), tr("คริติคอล 30% (x2.5)")],
  fire:   [tr("เผ็ดไหม้ต่อเนื่อง"), tr("สาดวงกว้าง")],
  ice:    [tr("เย็นเจี๊ยบเป็นวง"), tr("แช่แข็งจนหยุดนิ่ง")],
  triple: [tr("พุ่งทีละ 5 คู่"), tr("พุ่งทีละ 7 คู่")],
  storm:  [tr("ไฟช็อตกระโดด 4 ตัว"), tr("ไฟช็อตกระโดด 6 ตัว")],
  cannon: [tr("ข้าวเหนียวติดหนึบจนมึน"), tr("ข้าวเหนียวลูกยักษ์ + มึนนาน")],
  pan:    [tr("บินกลับมาตีซ้ำขากลับ"), tr("กระทะยักษ์ แรง x1.5")],
  melon:  [tr("แตกเป็นเมล็ดระเบิด 3 ลูก"), tr("เมล็ด 6 ลูก + น้ำแตงโมลื่นทำแมวช้า")],
  egg:    [tr("แฟลชนานขึ้น (มึน 1.6 วิ)"), tr("แฟลชวงยักษ์")],
  coffee: [tr("แท่นข้างๆ ยิงเร็วขึ้น 45%"), tr("เร็วขึ้น 60% + สาดกาแฟร้อนใส่แมว")],
  stove:  [tr("ไฟกว้างเป็นกรวย 3 สาย"), tr("ไฟสีฟ้า ร้อนกว่า x1.5")],
  fish:   [tr("แอ่งใหญ่ขึ้น อยู่นานขึ้น"), tr("กลิ่นแรง! แมวในแอ่งเดินช้า")],
  roller: [tr("ไม้ใหญ่ขึ้น กวาดกว้าง"), tr("กลิ้งทีละ 2 อัน")],
};
function perkLv(p) { return p.lvl >= 10 ? 2 : p.lvl >= 5 ? 1 : 0; }
WEAPON.bomb = { speed: 1, range: 0 };

// ---------- save ----------
// lane layout (like a zombie-defense game): y grows downward on screen
// the town can be widened (T.expand): 5 -> 7 wall segments / duck turrets, and the camera zooms out to fit
let SLOTS = 5, SLOT_X = [-3.68, -1.84, 0, 1.84, 3.68], NWALL = 5, GATE = 2, FIELD_X = 4.5, CAT_X = 3.3, VIEW_W = 9.6;
const PLAT_Y = 0.45, FENCE_Y = 0, HOUSE_Y = 8.3, HOUSE_R = 1.0;
const WALL_W = 1.84, SPAWN_Y = -21, MAX_EXPAND = 2;
// side walls (a U around the lane): each expansion adds a turret on both arms
const ARM_X = 3.98, ARM_WD = 0.9, ARM_Y = [-1.6, -3.4];
let SLOT_POS = [];
const WALL_D = 1.0, WALL_IN = FENCE_Y + WALL_D;   // city wall: outer edge at FENCE_Y, walkway WALL_D deep, middle segment is the gate
const WALL_FOOT = WALL_IN + 1.3;                           // where the wall's inner face meets the courtyard floor
const EGG_Y = WALL_FOOT + 3.2, EGG_R = 0.75;                  // the golden egg the cats want
const RING = 4.4, PLAT_R = 2.75;   // old ring sizes, only used by leftover fallback drawing
function wallX(i) { return (i - (NWALL - 1) / 2) * WALL_W; }
if (!save.td) save.td = {
  wave: 1, house: 1, fence: 1, bomb: 1,
  plats: [{ slot: 2, w: 'bow', lvl: 1 }, { slot: 6, w: 'bow', lvl: 1 }],
};
const T = save.td;
if (T.expand === undefined) T.expand = 0;
if (!T.items) T.items = { bolt: 0, top: 0, ufo: 0 };
function applyLayout() {
  const e = Math.min(MAX_EXPAND, T.expand || 0);
  NWALL = 5; GATE = 2; FIELD_X = 4.5; CAT_X = 3.3; VIEW_W = 9.6;
  SLOT_X = [-3.68, -1.84, 0, 1.84, 3.68];
  SLOT_POS = SLOT_X.map(x => ({ x, y: PLAT_Y }));
  for (let k = 0; k < e; k++) { SLOT_POS.push({ x: -ARM_X, y: ARM_Y[k], arm: true }); SLOT_POS.push({ x: ARM_X, y: ARM_Y[k], arm: true }); SLOT_X.push(-ARM_X, ARM_X); }
  SLOTS = SLOT_POS.length;
}
// the first version of "expand" made the front wall wider; move those saves onto the U layout
if (!T.layoutV) { if (T.expand > 0) for (const p of T.plats) p.slot = p.slot === 0 ? 5 : p.slot === 6 ? 6 : p.slot - 1; T.layoutV = 2; T.pads = {}; }
if (T.gatehouse === undefined) T.gatehouse = 0;
applyLayout();
function armLen() { return T.expand >= 2 ? 4.4 : T.expand >= 1 ? 2.55 : 0; }
function slotPad(s) {
  const q = SLOT_POS[s];
  if (!q || !q.arm) return { x: SLOT_X[s], y: WALL_FOOT + 0.55 };
  return { x: Math.sign(q.x) * 4.1, y: WALL_FOOT + 1.2 + (q.y < -2 ? 0.85 : 0) };
}
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
function platPos(s) { const q = SLOT_POS[s]; return q ? { x: q.x, y: q.y } : { x: 0, y: PLAT_Y }; }
// two tent spots for the duck soldiers, on the open floor either side of the house
const CAMP_POS = [{ x: -3.4, y: WALL_FOOT + 2.45 }, { x: 3.85, y: WALL_FOOT + 2.45 }];
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
function expandCost() { return T.expand >= 1 ? 5000 : 2500; }
function expandDay() { return T.expand >= 1 ? 12 : 6; }
function expandTown() {
  if (T.expand >= MAX_EXPAND) return;
  T.expand++; applyLayout();
  persist(); renderTdHud(); SFX.play('upgrade');
  toast(tr("🏰 สร้างกำแพงข้างเพิ่มแล้ว! มีจุดตั้งป้อมเป็ดใหม่ 2 จุด"));
}
function gateCost() { return [600, 1500, 3500][T.gatehouse] || 0; }
function wallMax(i) { return Math.round((30 + (T.fence - 1) * 18) * (i === GATE ? 1.4 + (T.gatehouse || 0) * 0.6 : 1)); }
function bombDmg() { return 6 + (T.bomb - 1) * 4; }

// ---------- arena ----------
let D = null;
let dk = 30;
// camera: zoomed in, pans sideways (and a little up/down) to follow the leader duck
let camX = 0, camY = 0;
function baseY() { return H - 95 - (HOUSE_Y + 0.6) * dk * 0.62; }
function dproj(x, y) { return { x: W / 2 + (x - camX) * dk, y: baseY() + (y - camY) * dk * 0.62 }; }
function dinv(sx, sy) { return { x: (sx - W / 2) / dk + camX, y: (sy - baseY()) / (dk * 0.62) + camY }; }
function camFollow(dt) { camX = 0; camY = 0; }
function camFollowOld(dt) {
  const L = D.lead, mx = Math.max(0, LEAD_R + 0.6 - W / 2 / dk), my = Math.max(0, (LEAD_R + 0.8) - H * 0.4 / (dk * 0.62));
  const tx = Math.max(-mx, Math.min(mx, L.x)), ty = Math.max(-my, Math.min(my, L.y * 0.6));
  const k = Math.min(1, dt * 4); camX += (tx - camX) * k; camY += (ty - camY) * k;
}

function freshField() {
  dk = Math.min(W / VIEW_W, H / 15);
  D = {
    phase: 'build', t: 0, houseHp: houseMax(), houseMax: houseMax(), bombCd: 0, shake: 0,
    walls: Array.from({ length: NWALL }, (_, i) => ({ i, x: wallX(i), a: i, hp: wallMax(i), max: wallMax(i), hit: 0, gate: i === GATE })),
    shooters: new Map(),   // slot -> {cd, aimDx, aimDy, shootT}
    cats: [], shots: [], fx: [], floats: [], queue: [], banner: 0, killed: 0, earned: 0,
    parts: [], coins: [], revived: false, hudPulse: 0, seen: {}, bolts: [],
    drops: [], pools: [], traps: [], troops: [], ladders: [], cracks: [], holes: [], tops: [], strikes: [], sky: null, ufo: null, campT: {}, trapMode: false,                                   // coins lying on the ground for the leader to pick up
    lead: { x: -1.8, y: WALL_FOOT + 1.2, face: 1, walkT: 0, moving: false, atkCd: 0, swingT: 0, hurtT: 0, happyT: 0 },
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
  D.queue = buildWave(T.wave); D.ladders = []; D.thief = null;
  { const wx = WEATHERS[weatherOf(T.wave)]; if (weatherOf(T.wave) !== 'sun') toast(tr("{0} วันนี้{1}", wx.icon, wx.name)); }
  D.total = D.queue.length;
  // new faces today? the cat king shows them off first
  if (!save.seenKinds) save.seenKinds = [];
  const fresh = [];
  for (const e of D.queue) { const k = e.boss ? 'boss' : e.kind || 'cat'; if (!save.seenKinds.includes(k) && !fresh.includes(k)) fresh.push(k); }
  if (fresh.length) { D.phase = 'intro'; D.intro = { list: fresh, i: 0, t: 0 }; D.banner = 0; SFX.play('bossRoar'); }
  renderTdHud();
}
const INTRO_LINES = {
  cat:    [tr("ทหารหม้อ"), tr("ฮ่าๆๆ เป็ดน้อย! เจอกองทัพหม้อของข้าซะ!")],
  tray:   [tr("แมวหมวกถาด"), tr("หมวกถาดกับฝาหม้อ! ของที่เจ้าโยนลงมาจากฟ้าเด้งหมด!")],
  ninja:  [tr("นินจาผ้าแดง"), tr("นินจาของข้าวิ่งเร็วกว่าตะเกียบเจ้าซะอีก!")],
  knight: [tr("อัศวินแดง"), tr("อัศวินแดงของข้ามีโล่ด้วยนะ จะปาอะไรก็ปามา!")],
  cart:   [tr("รถยิงพริก"), tr("รถยิงพริก! จะยิงลูกน้องข้าข้ามกำแพงไปถึงบ้านเจ้าเลย!")],
  tank:   [tr("เกราะซึ้งนึ่ง"), tr("เกราะซึ้งนึ่ง! ทนยิ่งกว่าหม้อหุงข้าวของเจ้าอีก!")],
  shadow: [tr("นินจาเงา"), tr("นินจาเงา... เจ้าจะไม่มีวันปาโดนมันหรอก!")],
  healer: [tr("พ่อครัวต้มยำ"), tr("ต้มยำร้อนๆ! ลูกน้องข้าจะไม่มีวันหมดแรง!")],
  steel:  [tr("เกราะเหล็กล้วน"), tr("เกราะเหล็กทั้งตัว! ไหนลองปามาสิ ฮ่าๆ!")],
  glider: [tr("ร่มฝาชี"), tr("ร่มฝาชี! กระโดดข้ามกำแพงเจ้าได้สบายๆ!")],
  pitcher: [tr("แมวปาลูกชิ้น"), tr("มือปาลูกชิ้นของข้า! ปาโดนหัวเป็ดทีเดียวมึนเลย!")],
  boxer:  [tr("แมวนักมวย"), tr("นักมวยถุงมือร้อน! หมัดเดียวกำแพงกระจุย!")],
  chief:  [tr("รองบอสแมวค้อน"), tr("มือขวาของข้า! ระวังค้อนไม้ของเขาไว้ให้ดี!")],
  boss:   [tr("ราชาแมว"), tr("ข้าเอง! ราชาแมว!! วันนี้ข้าจะลงสนามเองโว้ย!!")],
  ladder: [tr("แมวแบกบันได"), tr("บันไดลิง! พาดกำแพงปุ๊บ ปีนเข้าไปแย่งไข่ทองคำปั๊บ!")],
  mole:   [tr("แมวขอมดำดิน"), tr("คาถาดำดิน! มุดดินไปโผล่หน้าประตู เป็ดไม่ทันเห็นแน่ ฮ่าๆ!")],
  para:   [tr("หน่วยโดดร่ม"), tr("หน่วยรบพิเศษ! โดดร่มลงหน้าประตูเมืองเจ้าเดี๋ยวนี้!")],
  ram:    [tr("รถกระทุ้งประตู"), tr("ไม้นวดแป้งยักษ์! กระทุ้งทีเดียว ประตูเมืองเป็ดพังแน่!")],
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
  if (kind === 'boss' && ready(IMG.boss_attack)) drawFrame('boss_attack', Math.floor(now * 3) % 4, ex, cy - pose, sh * 1.4, true);
  else if (kind === 'chief' && ready(IMG.k_king_act)) drawFrame('k_king_act', Math.floor(now * 3) % 2, ex, cy - pose, sh * 1.08, false);
  else if (kind === 'cart') drawCart(fake, { x: ex, y: cy - pose }, sh * 0.9);
  else if (kind === 'ram') drawRam(fake, { x: ex, y: cy - pose }, sh * 0.85);
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
    ctx.font = '800 11px Mitr,system-ui,sans-serif'; ctx.fillStyle = '#ffd84a'; ctx.fillText(kind === 'boss' ? tr("👑 บอส") : kind === 'chief' ? tr("⭐ รองหัวหน้า") : tr("🆕 ศัตรูใหม่"), 0, -28);
    ctx.restore();
  }
  // the cat king on the left, bouncing as he gloats (when he is not the one on show)
  const kx = W * 0.2, ky = H * 0.42, talk = Math.abs(Math.sin(now * 9)) * 4;
  const KW = 'boss_walk';
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
  ctx.font = '900 12px Mitr,system-ui,sans-serif'; ctx.fillStyle = '#d8352a'; ctx.fillText(tr("ราชาแมว:"), bx + 14, by - 16);
  // a scared duck at the bottom
  if (t > 0.9 && ready(IMG.k_duck_act)) {
    const dx = W * 0.22 + Math.sin(now * 40) * 2, dy = H * 0.82;
    drawFrame('k_duck_act', 2, dx, dy, sh * 0.6, false);
    // (the scared duck just quacks: sound, no text)
  }
  // footer
  ctx.font = '700 12px Mitr,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.fillText(tr("แตะเพื่อไปต่อ  {0}/{1}", I.i + 1, I.list.length), W / 2, H - bar / 2);
  ctx.restore();
}
// enemy roster: new kinds join as the waves go on (kitchen cats + the old armoured cats)
const CAT_KINDS = {
  cat:    { from: 1, w: 10, hp: 1,   v: 1,    size: 1.1,  name: tr("แมวหม้อ") },
  ninja:  { from: 3, w: 5,  hp: 0.6, v: 1.9,  size: 1.0,  name: tr("🥷 แมวนินจาผ้าแดงมาแล้ว! วิ่งเร็วมาก") },
  knight: { from: 4, w: 5,  hp: 1.8, v: 0.9,  size: 1.15, name: tr("⚔️ แมวอัศวินแดงมาแล้ว! มีโล่กันดาเมจนิดหน่อย") },
  tank:   { from: 6, w: 3,  hp: 3.2, v: 0.6,  size: 1.4,  name: tr("🛡️ แมวเกราะซึ้งนึ่งมาแล้ว! ทนมาก ใช้อาวุธแรงๆ") },
  shadow: { from: 7, w: 3,  hp: 0.8, v: 2.4,  size: 1.0,  name: tr("🗡️ แมวนินจาเงามาแล้ว! เร็วที่สุด หลบได้บางที") },
  steel:  { from: 9, w: 2,  hp: 5,   v: 0.5,  size: 1.45, name: tr("🪖 แมวเกราะเหล็กมาแล้ว! ทนสุดๆ ใช้หม้อหุงข้าว/ไฟช็อต") },
  tray:   { from: 2, w: 4,  hp: 1.2, v: 0.95, size: 1.1,  name: tr("🍽️ แมวถือถาดมาแล้ว! ถาดกันของที่ปาได้ 4 ที") },
  cart:   { from: 5, w: 2,  hp: 4,   v: 0.45, size: 1.7,  name: tr("🌶️ รถยิงพริกมาแล้ว! ยิงหินใส่กำแพง บางทียิงแมวข้ามกำแพงมาเลย!") },
  healer: { from: 8, w: 2,  hp: 1.4, v: 0.85, size: 1.1,  name: tr("🍜 แมวพ่อครัวต้มยำมาแล้ว! ป้อนต้มยำฮีลเพื่อน รีบล้มก่อน") },
  pitcher: { from: 6, w: 2, hp: 1.1, v: 0.9, size: 1.05, name: tr("แมวปาลูกชิ้น") },
  boxer:  { from: 7, w: 2,  hp: 2,   v: 1.0,  size: 1.15, name: tr("แมวนักมวย") },
  glider: { from: 10, w: 3, hp: 1,   v: 1.05, size: 1.05, name: tr("🪂 แมวร่มกระชอนมาแล้ว! กระโดดข้ามกำแพงได้") },
  ladder: { from: 3, w: 4,  hp: 1.2, v: 0.9,  size: 1.1,  name: tr("🪜 แมวแบกบันไดมาแล้ว! พาดกำแพงแล้วปีนเข้าเมือง") },
  ram:    { from: 4, w: 2,  hp: 7,   v: 0.42, size: 1.7,  name: tr("🪵 รถกระทุ้งประตูมาแล้ว! ยิงมันก่อนถึงประตู") },
  mole:   { from: 7, w: 3,  hp: 1.0, v: 1.25, size: 1.05, name: tr("⛏️ แมวขอมดำดินมาแล้ว! มุดดินมาโผล่หน้าประตู เป็ดมองไม่เห็นจนกว่าจะโผล่") },
  para:   { from: 8, w: 3,  hp: 1.1, v: 1.0,  size: 1.05, name: tr("🪂 แมวโดดร่มมาแล้ว! ลงตรงหน้าประตูเลย") },
};
const OLD_IMG = { knight: 'k_knight', shadow: 'k_shadow', steel: 'k_steel' };
// what each kitchen cat wears and swings (the plain cats get a random silly outfit)
const HATS = ['it_pot', 'it_colander', 'h_catberet', 'h_catmelon'];
const WPNS = ['it_spatula', 'it_spatula', 'it_pestle', 'it_ladle'];
function catGear(kind) {
  const r = a => a[Math.floor(Math.random() * a.length)];
  if (kind === 'chief') return { hat: 'it_chefhat', wpn: 'it_pan' };
  if (kind === 'tank') return { hat: 'it_steamer', wpn: 'it_pan' };
  if (kind === 'ninja') return { hat: 'h_catberet', wpn: 'it_skewer' };
  if (kind === 'tray') return { hat: r(['tray', 'lid']), wpn: 'it_fork' };
  if (kind === 'healer') return { hat: 'it_chefhat', wpn: 'it_soup', apron: true };
  if (kind === 'glider') return { hat: 'it_foodcover', wpn: 'it_spatula' };
  if (kind === 'boxer') return { hat: 'h_catmelon', wpn: 'it_mitt', mitts: true };
  if (kind === 'pitcher') return { hat: r(['it_pot', 'h_catberet']), wpn: 'it_skewer' };
  if (kind === 'mole') return { hat: 'minerhat', wpn: 'it_spatula' };
  if (kind === 'para') return { hat: 'h_catberet', wpn: 'it_fork' };
  if (kind === 'ladder') return { hat: r(['it_pot', 'h_catberet', 'h_catmelon']), wpn: 'it_spatula' };
  return { hat: r(HATS), wpn: r(WPNS) };
}
function drawHat(hat, x, y, size, rot) {
  if (hat === 'minerhat') {
    // yellow mining helmet with a head lamp
    ctx.save(); ctx.translate(x, y + size * 0.05); ctx.rotate(rot || 0);
    ctx.fillStyle = '#f2c230'; ctx.strokeStyle = '#4a3208'; ctx.lineWidth = Math.max(1.5, size * 0.05);
    ctx.beginPath(); ctx.ellipse(0, size * 0.08, size * 0.48, size * 0.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, size * 0.06, size * 0.36, size * 0.34, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-size * 0.14, -size * 0.12, size * 0.07, size * 0.1, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a8f99'; ctx.beginPath(); ctx.arc(0, -size * 0.08, size * 0.11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fffbd0'; ctx.beginPath(); ctx.arc(0, -size * 0.08, size * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); return;
  }
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
  row:    { from: 2, w: 3, name: tr("➖ แมวเรียงหน้ากระดาน!") },
  column: { from: 2, w: 3, name: tr("⬇️ แมวเดินแถวเรียงหนึ่ง!") },
  zigzag: { from: 3, w: 2, name: tr("〰️ แมวเดินส่ายหลบ!") },
  v:      { from: 4, w: 2, name: tr("🔻 แมวจัดทัพรูปตัววี!") },
  flank:  { from: 5, w: 2, name: tr("↔️ แมวตีขนาบสองข้าง!") },
  rush:   { from: 6, w: 2, name: tr("💨 แมวบุกตะลุย!!") },
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
  const clampX = x => Math.max(-CAT_X + 0.3, Math.min(CAT_X - 0.3, x));
  let t = 0;
  for (let g = 0; g < groups; g++) {
    const side = (Math.random() * 2 - 1) * (CAT_X - 0.6);      // group's x across the top
    const size = 4 + Math.floor(n * 1.6 + Math.random() * 4);
    let kind = pickKind(n);
    const pat = kind === 'cart' || kind === 'ram' ? 'blob' : pickPattern(n);
    if (pat === 'rush' && CAT_KINDS[kind].v < 1) kind = Math.random() < 0.5 ? 'ninja' : 'cat';
    const K = CAT_KINDS[kind], hp = 2 + Math.floor(n / 2);
    let cnt = kind === 'cart' || kind === 'ram' ? 1 : K.hp >= 3 ? Math.max(2, Math.ceil(size / 3)) : K.hp >= 1.5 ? Math.ceil(size * 0.6) : size;
    if (pat === 'rush') cnt = Math.ceil(cnt * 1.3);
    for (let i = 0; i < cnt; i++) {
      const e = { t: t + i * (K.v > 1.5 ? 0.22 : 0.35), a: kind === 'ram' ? (Math.random() - 0.5) * 1.2 : clampX(side + (Math.random() - 0.5) * 2.2), hp, boss: false, kind, pat: i === 0 ? pat : null };
      const mid = (cnt - 1) / 2;
      if (pat === 'row') { e.t = t + Math.random() * 0.1; e.a = clampX(-CAT_X + 0.5 + (2 * CAT_X - 1) * (cnt > 1 ? i / (cnt - 1) : 0.5)); e.dy = (i % 2) * 0.5; }
      else if (pat === 'column') { e.t = t + i * 0.3; e.a = clampX(side); }
      else if (pat === 'zigzag') e.zig = 1;
      else if (pat === 'v') { e.t = t; e.a = clampX(side * 0.5 + (i - mid) * 0.55); e.dy = Math.abs(i - mid) * 0.7; }
      else if (pat === 'flank') { const L = i % 2 === 0; e.a = L ? -CAT_X + 0.6 : CAT_X - 0.6; e.t = t + Math.floor(i / 2) * 0.32; }
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
  // later days used to send thousands of cats (it grew with day x day) and froze phones:
  // cap the head count and fold the cats we drop into tougher cats instead
  const MAXC = Math.min(170, 50 + n * 4);
  const plain = q.filter(e => !e.boss && e.kind !== 'chief' && e.kind !== 'cart' && e.kind !== 'ram');
  if (plain.length > MAXC) {
    const k = plain.length / MAXC, drop = new Set();
    plain.forEach((e, i) => { if (Math.floor((i + 1) / k) === Math.floor(i / k)) drop.add(e); });
    for (const e of q) if (!drop.has(e) && plain.includes(e)) e.hp = Math.round(e.hp * Math.min(k, 3));
    return q.filter(e => !drop.has(e));
  }
  return q;
}
const MAX_ALIVE = 40;
function spawnCatOrig(c) {
  const topY = Math.min(-8, dinv(0, 40).y - 1.2);
  const kind = c.kind || 'cat';
  const K = CAT_KINDS[kind];
  const hp = c.boss || kind === 'chief' ? c.hp : Math.max(1, Math.round(c.hp * K.hp + (K.hp >= 3 ? 4 : 0)));
  const v = 1.7 * (c.rush ? 1.45 : 1) * (c.boss ? 0.7 : kind === 'chief' ? 0.75 : K.v * (0.85 + Math.random() * 0.35));
  if (c.pat && PATTERNS[c.pat] && PATTERNS[c.pat].name && !D.seen['p_' + c.pat]) { D.seen['p_' + c.pat] = true; toast(PATTERNS[c.pat].name); }
  D.cats.push({ hasLadder: kind === 'ladder', zig: c.zig || 0, gear: catGear(kind), trayHp: kind === 'tray' ? 4 : 0, coward: !c.boss && kind !== 'chief' && kind !== 'cart' && kind !== 'ram' && Math.random() < 0.05, x: c.a, y: topY - (c.dy || 0) - Math.random() * 0.6, sway: Math.random() * 9, hp, max: hp, boss: c.boss, kind,
    v, st: 'walk', atk: 0, ph: Math.random() * 9, hitT: 0, slow: 0, stun: 0, burn: 0 });
  if (kind === 'chief') SFX.play('bossRoar');
  const nc = D.cats[D.cats.length - 1];
  if (kind === 'mole') nc.under = true;
  if (kind === 'para') { nc.x = Math.max(-2.2, Math.min(2.2, nc.x * 0.6)); nc.y = FENCE_Y - 1.1 - Math.random() * 2.4; nc.drop = { t: 0, dur: 2.2 + Math.random() * 0.9 }; nc.coward = false; }
}
function spawnCat(c) {
  spawnCatOrig(c);
  if (c.boss) { SFX.play('bossRoar'); D.banner = 2.2; D.bossBanner = true; D.bannerTxt = null; D.zoomT = 1.2; D.shake = Math.max(D.shake, 0.4); }
}
function wallFor(c) {
  if (!isFinite(c.x)) c.x = 0; if (!isFinite(c.y)) c.y = -6;
  return D.walls[Math.max(0, Math.min(NWALL - 1, Math.round(c.x / WALL_W + (NWALL - 1) / 2)))];
}
const HOUSE_TY = EGG_Y - 0.35;    // where cats stand to grab the golden egg

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
    // keep the number of cats on the field small enough for a phone: the rest wait at the top and walk in as space frees up
    { let alive = 0; for (const c of D.cats) if (c.hp > 0) alive++;
      let n = 0; while (D.queue.length && D.queue[0].t <= D.t - 1.2 && (alive < MAX_ALIVE || D.queue[0].boss || D.queue[0].kind === 'chief') && n < 3) { spawnCat(D.queue.shift()); alive++; n++; } }
    if (D.bombCd > 0) D.bombCd -= dt;
    for (const c of D.cats) {
      if (c.hp <= 0) continue;
      c.hitT = Math.max(0, c.hitT - dt);
      if (c.abduct) { abductStep(c, dt); continue; }
      if (c.drop) {
        // floating down under a parachute; lands right in front of the gate
        c.drop.t += dt; c.mx = 0; c.my = 1;
        if (c.drop.t >= c.drop.dur) { c.drop = null; addFx('dust', c.x, c.y, '#d9c49a'); SFX.play('thud'); }
        continue;
      }
      if (c.under) {
        // tunnelling under the lawn and the wall, pops up inside the town
        const ox = c.x, oy = c.y;
        c.y += c.v * 1.7 * dt; c.x += Math.sin(D.t * 2 + c.sway) * 0.4 * dt; c.mx = 0; c.my = 1;
        if (c.y > FENCE_Y - 5) { const gx = D.walls[GATE].x + (c.gateOff === undefined ? (c.gateOff = (Math.random() - 0.5) * 1.6) : c.gateOff); c.x += Math.max(-1, Math.min(1, gx - c.x)) * c.v * 1.2 * dt; }
        c.crackD = (c.crackD || 0) + Math.hypot(c.x - ox, c.y - oy);
        if (c.crackD > 0.22) { c.crackD = 0; const j = (Math.random() - 0.5) * 0.18; D.cracks.push({ x1: c.cx || ox, y1: c.cy || oy, x2: c.x + j, y2: c.y, t: 0, w: 0.6 + Math.random() * 0.6, br: Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0 }); c.cx = c.x + j; c.cy = c.y; }
        if (Math.random() < dt * 4) D.parts.push({ x: c.x + (Math.random() - 0.5) * 0.3, y: c.y, h: 0.05, vx: (Math.random() - 0.5) * 1.2, vy: -0.3, vh: 1.5 + Math.random() * 1.5, t: 0, life: 0.5, kind: 'rock', r: Math.random() * 6 });
        if (c.y >= FENCE_Y - 1.15) {
          // pops up right in front of the gate: the ducks only notice it now
          c.under = false; c.y = FENCE_Y - 1.15;
          c.emerge = 0.7; c.stun = Math.max(c.stun || 0, 0.7); c.jumped = true; D.holes.push({ x: c.x, y: c.y, t: 0 }); D.shake = Math.max(D.shake, 0.12); addFx('dust', c.x, c.y, '#a8865a'); burst(c.x, c.y, ['#8a6a3a', '#a8865a', '#6a4a2a'], 16, 4, 1.3); SFX.play('crack'); SFX.play('meow');
          if (!save.seenMoleTip) { save.seenMoleTip = true; persist(); toast(tr("⛏️ แมวขอมดำดินโผล่หน้าประตู! ตอนมุดอยู่เป็ดมองไม่เห็น")); }
        }
        continue;
      }
      if (c.emerge > 0) c.emerge -= dt;
      if (c.burn > 0) { c.burn -= dt; c.burnTick = (c.burnTick || 0) + dt; if (c.burnTick > 0.5) { c.burnTick = 0; hurtCat(c, c.burnDps * 0.5, 'burn'); if (c.hp <= 0) continue; } }
      if (c.launch) {
        // flung by a seesaw: fly back up the lane and land on the head
        const L = c.launch; L.t += dt; const u = Math.min(1, L.t / L.dur);
        c.x = L.x0 + (L.x1 - L.x0) * u; c.y = L.y0 + (L.y1 - L.y0) * u; c.mx = 0; c.my = -1;
        if (u >= 1) { c.launch = null; c.stun = Math.max(c.stun, 1.1); addFx('dust', c.x, c.y, '#d9c49a'); SFX.play('thud'); D.shake = Math.max(D.shake, 0.08); hurtCat(c, L.dmg, 'lead'); }
        continue;
      }
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
        c.y = c.jy0 + (WALL_FOOT + 0.35 - c.jy0) * u; c.jh = Math.sin(u * Math.PI) * 2.4; c.mx = 0; c.my = 1;
        if (u >= 1) { c.st = 'walk'; c.jumped = true; c.jh = 0; addFx('poof', c.x, c.y, '#ffffff'); }
        continue;
      }
      if (c.st === 'plant') {
        // ladder cat leans its ladder against the wall
        c.plantT -= sdt; c.mx = 0; c.my = 1;
        if (c.plantT <= 0) {
          const L = { x: c.x, t: 0, push: 0, down: false, fallT: 0 }; D.ladders.push(L);
          c.hasLadder = false; c.st = 'climb'; c.climb = { t: 0, L }; SFX.play('wood'); addFx('dust', c.x, FENCE_Y - 0.3, '#d9c49a');
          if (!save.seenLadderTip) { save.seenLadderTip = true; persist(); toast(tr("🪜 แมวพาดบันได! พาเป็ดหัวหน้าไปยืนใต้บันไดเพื่อผลักล้ม")); }
        }
        continue;
      }
      if (c.st === 'climb') {
        const L = c.climb && c.climb.L;
        if (!L || L.down) { c.st = 'walk'; c.climb = null; c.lift = 0; continue; }
        c.climb.t += sdt; const u = Math.min(1, c.climb.t / 1.7);
        c.x = L.x; c.y = FENCE_Y - 0.4; c.lift = u * 1.35; c.mx = 0; c.my = -1;
        if (u >= 1) { c.st = 'walk'; c.climb = null; c.lift = 0; c.y = WALL_FOOT + 0.35; c.jumped = true; addFx('dust', c.x, c.y, '#d9c49a'); SFX.play('meow'); }
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
        // ladder cat at an unbroken wall: put the ladder up
        if (c.kind === 'ladder' && c.hasLadder && !past && c.y >= FENCE_Y - 0.6 && wall.hp > 0) { c.st = 'plant'; c.plantT = 0.7; c.x = Math.max(-CAT_X - 0.6, Math.min(CAT_X + 0.6, c.x)); continue; }
        // a ladder is up nearby: run over and climb it
        if (canClimb(c) && !past) {
          const lad = ladderNear(c.x, c.y >= FENCE_Y - 1 ? 2.2 : 1.4);
          if (lad && c.y > FENCE_Y - 3.5) {
            const dx = lad.x - c.x;
            if (c.y >= FENCE_Y - 0.65 && Math.abs(dx) < 0.3 && !D.cats.some(o => o.climb && o.climb.L === lad && o.climb.t < 0.5)) { c.st = 'climb'; c.climb = { t: 0, L: lad }; continue; }
            const ty = FENCE_Y - 0.6, d = Math.hypot(dx, ty - c.y) || 1;
            c.mx = dx / d; c.my = (ty - c.y) / d; c.x += c.mx * c.v * sdt; c.y = Math.min(ty, c.y + c.my * c.v * sdt);
            continue;
          }
        }
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
        const gx = D.walls[GATE].x, spread = c.kind === 'ram' ? 0.3 : 0.8;
        if (!past && c.y >= FENCE_Y - 1.1 && Math.abs(c.x - gx) > spread && c.kind !== 'cart') {
          // the wall itself can't be broken: walk along it to the gate
          const sd = c.x > gx ? -1 : 1; c.mx = sd; c.my = 0.2;
          c.x += sd * c.v * sdt; c.y = Math.min(FENCE_Y - 0.6, c.y + c.v * 0.3 * sdt);
          continue;
        }
        if (!past && c.y >= FENCE_Y - 0.55 && wall.hp > 0) { c.st = 'wall'; c.atk = 0; }
        else if (past && dh <= EGG_R + 0.3) { c.st = 'house'; c.atk = 0; }
        else {
          // straight down the lane; once through a hole in the fence, head for the house
          let mx = Math.sin(D.t * (c.zig ? 2.4 : 1.3) + c.sway) * (c.zig ? 0.9 : 0.12), my = 1;
          if (past) { mx = (hx - c.x) / dh; my = (hy - c.y) / dh; }
          else if (c.kind === 'ram') mx = Math.max(-1, Math.min(1, -c.x * 0.9));
          c.x += mx * c.v * sdt; c.y += my * c.v * sdt; c.mx = mx; c.my = my;
          if (c.boss) { c.step = (c.step || 0) + dt; if (c.step > 0.55) { c.step = 0; SFX.play('bossStep'); D.shake = Math.max(D.shake, 0.08); } }
        }
      } else {
        // attacking the fence or the house; bosses swing slower but slam hard
        const ram = c.kind === 'ram', period = c.boss ? BOSS_PERIOD : ram ? 1.8 : 0.9, hitAt = c.boss ? BOSS_PERIOD * 0.8 : ram ? 1.25 : 0.9;
        if (c.st === 'wall' && wall.hp <= 0) { c.st = 'walk'; c.atk = 0; continue; }
        if (c.st === 'wall' && canClimb(c) && ladderNear(c.x, 2.2)) { c.st = 'walk'; c.atk = 0; continue; }
        const before = c.atk; c.atk += sdt;
        if (before < hitAt && c.atk >= hitAt) {
          if (c.boss) bossSlam(c);
          if (c.st === 'wall') {
            wall.hp -= c.boss ? 8 : ram ? (wall.gate ? 7 + T.wave * 0.7 : 4 + T.wave * 0.4) : c.kind === 'chief' || c.kind === 'boxer' ? 3 : 1; wall.hit = ram ? 0.35 : 0.2; SFX.play(c.boss ? 'crack' : ram ? 'slam' : Math.random() < 0.5 ? 'hit' : 'wood');
            if (ram) { D.shake = Math.max(D.shake, 0.22); addFx('dust', c.x, FENCE_Y - 0.1, '#c8b89a'); }
            for (let i = 0; i < (c.boss ? 10 : 2); i++) splinter(wall.x, FENCE_Y);
            if (wall.hp <= 0) { wall.hp = 0; SFX.play('crack'); addFx('ring', wall.x, FENCE_Y, '#ffcf8a'); for (let i = 0; i < 14; i++) splinter(wall.x, FENCE_Y); D.shake = Math.max(D.shake, 0.3); toast(wall.gate ? tr("ประตูเมืองพัง!! 🚪 พาเป็ดหัวหน้าไปซ่อมที่วงกลม 🔧") : tr("กำแพงพัง! พาเป็ดหัวหน้าไปยืนวงกลม 🔧 เพื่อซ่อม")); }
          } else {
            const ed = c.boss ? 4 : c.kind === 'chief' || c.kind === 'ram' ? 2 : 1;
            D.houseHp -= ed; D.flinchT = 0.35; D.eggHit = 0.3; D.shake = Math.max(D.shake, 0.15); SFX.play('hit');
            D.floats.push({ x: c.x, y: c.y, t: 0, text: `-${ed}🥚`, color: '#ff7a6a' });
            if (D.houseHp <= 0) startDefeat();
          }
        }
        if (c.atk >= period) c.atk = 0;
      }
    }
    trapUpdate(dt); troopUpdate(dt); itemsUpdate(dt);
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
        if (e.wall.hp <= 0) toast(tr("กำแพงพังเพราะรถยิงพริก! 🔧"));
      } else {
        D.houseHp -= 1; D.eggHit = 0.3; D.shake = Math.max(D.shake, 0.2); SFX.play('hit');
        addFx(e.type === 'chili' ? 'fire' : 'dust', e.tx, e.ty, '#ff7a3a');
        D.floats.push({ x: e.tx, y: e.ty, t: 0, text: '-1🥚', color: '#ff7a6a' });
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
        if (perkLv(p) >= 2 && o.cd <= 0) { const t2 = nearestCat(pos.x, pos.y, 9); if (t2) { o.cd = 2; o.shootT = 0.45; o.aimDx = t2.x - pos.x; o.aimDy = t2.y - pos.y;
          D.shots.push({ x: pos.x, y: pos.y, sx: pos.x, sy: pos.y, tx: t2.x, ty: t2.y, w: 'coffee', dmg: 3 + p.lvl * 0.4, t: 0, dur: 0.6, high: true, tier, h0: o.topH || PLAT_H }); } }
        continue;
      }
      if (o.cd > 0 || o.arrive > 0) continue;
      const t = nearestCat(pos.x, pos.y, W0.range);
      if (!t) continue;
      o.cd = Math.max(0.5, 1 / (W0.rate * (1 + tier * 0.15) * coffeeBuff(p.slot))); o.aimDx = t.x - pos.x; o.aimDy = t.y - pos.y; o.shootT = 0.45;
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
          t: -0.18, dur: R / W0.speed, back: pk >= 1, dmg: wDmg(p) * (pk >= 2 ? 1.5 : 1), big: pk >= 2, hit: new Set(), tier, h0: o.topH || PLAT_H });
        SFX.play('xbow'); continue;
      }
      for (let k = 0; k < n; k++) {
        const spread = n > 1 ? (k - (n - 1) / 2) * (p.w === 'bow' ? 0.08 : 0.22) : 0;
        const ang = Math.atan2(t.y - pos.y, t.x - pos.x) + spread, dist = Math.hypot(t.x - pos.x, t.y - pos.y);
        D.shots.push({ x: pos.x, y: pos.y, sx: pos.x, sy: pos.y, tx: pos.x + Math.cos(ang) * dist, ty: pos.y + Math.sin(ang) * dist,
          target: n > 1 && p.w !== 'bow' ? null : t, w: p.w, dmg: wDmg(p), t: -0.18, dur: dist / W0.speed, high: true, pk, tier, h0: o.topH || PLAT_H });
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
    if (s.pan && s.t < 0) continue;
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
  for (const c of D.cats) {
    if (c.walkX !== undefined && (c.st === 'walk' || c.st === 'flee' || (c.hp <= 0 && c.deadT > 1.3))) {
      const distance = Math.hypot(c.x - c.walkX, c.y - c.walkY);
      if (distance < 0.8) c.walkDistance = ((c.walkDistance || 0) + distance) % 4.5;
    }
    c.walkX = c.x; c.walkY = c.y;
  }
  for (const c of D.cats) { if (c.squash) c.squash = Math.max(0, c.squash - dt * 6); if (c.fly) { c.fly.t += dt; } }
  D.cats = D.cats.filter(c => c.hp > 0 || (c.deadT = (c.deadT || 0) + dt) < ((c.boss || c.kind === 'chief') ? (c.y > dinv(0, 30).y ? 99 : 0) : c.shockDead ? 0.9 : 0.6));
  for (const p of D.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.h += p.vh * dt; p.vh -= 14 * dt; p.t += dt; if (p.h < 0) { p.h = 0; p.vh *= -0.3; p.vx *= 0.6; p.vy *= 0.6; } }
  D.parts = D.parts.filter(p => p.t < p.life); if (D.parts.length > 260) D.parts.splice(0, D.parts.length - 260);
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
  D.floats = D.floats.filter(f => f.t < 1.1); if (D.floats.length > 60) D.floats.splice(0, D.floats.length - 60);
  for (const w of D.walls) { w.hit = Math.max(0, w.hit - dt); if (!w.gate) w.hp = w.max; }
  for (const k of D.cracks) k.t += dt; D.cracks = D.cracks.filter(k => k.t < 7); if (D.cracks.length > 120) D.cracks.splice(0, D.cracks.length - 120);
  for (const h of D.holes) h.t += dt; D.holes = D.holes.filter(h => h.t < 6);
  D.shake = Math.max(0, D.shake - dt); D.eggHit = Math.max(0, (D.eggHit || 0) - dt);
  if (D.phase === 'wave' && !D.queue.length && !D.cats.some(c => c.hp > 0)) startVictory();
  if (D.phase === 'victory') victoryUpdate(dt);
  if (D.phase === 'defeat') defeatUpdate(dt);
  if ((tdTick += dt) > 0.5) { tdTick = 0; renderTdHud(); } else if (D.bombCd > 0) renderItemBar();
}
let tdTick = 0;
function hurtCat(c, dmg, src) {
  if (c.hp <= 0 || c.under) return;
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
    if (!c.boss && c.kind !== 'chief' && c.kind !== 'cart' && c.kind !== 'ram' && !c.lift && Math.random() < 0.55) c.fly = { t: 0, vx: (Math.random() - 0.5) * 6, vh: 7 + Math.random() * 4, spin: (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 8) };
    // nearby duck archers cheer
    if (c.boss) {
      SFX.play('bossDie'); D.shake = 0.6; D.slowT = 1.8; D.flashT = 0.35;
      D.banner = 2.2; D.bannerTxt = tr("ราชาแมวล้มแล้ว!! 🎉");
      addFx('ring', c.x, c.y, '#ffd84a'); addFx('boom', c.x, c.y, '#ffd84a');
      for (let i = 0; i < 40; i++) confetti(c.x, c.y);
    } else {
      SFX.play('catDie'); SFX.play('poof');
      addFx('poof', c.x, c.y, '#ffffff');
      for (let i = 0; i < 3; i++) D.parts.push({ x: c.x, y: c.y, h: 1.0, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 1.2, vh: 3 + Math.random() * 2, t: 0, life: 0.7, kind: 'star' });
    }
    const co = c.boss ? 150 : c.kind === 'chief' ? 40 + T.wave * 3 : c.kind === 'ram' ? 15 + T.wave * 2 : c.kind === 'tank' || c.kind === 'steel' ? 6 + Math.floor(T.wave / 2) : c.kind === 'knight' ? 3 + Math.floor(T.wave / 2) : (Math.random() < 0.7 ? 2 + Math.floor(T.wave / 2) : 0);
    if (co) {
      save.coins += co; D.earned += co;
      D.floats.push({ x: c.x, y: c.y - 0.6, t: 0, text: '+' + co + '🪙', color: '#ffd84a' });
      const n = c.boss ? 14 : Math.min(4, 1 + Math.floor(co / 3));
      for (let i = 0; i < n; i++) flyCoin(c.x, c.y, i * 0.05);
    }
    // a cowardly cat that sees a friend fall nearby turns tail and runs
    if (!c.boss) for (const o of D.cats) {
      if (o.hp > 0 && o.coward && !o.fled && o.st === 'walk' && Math.hypot(o.x - c.x, o.y - c.y) < 4.5 && o.y > FENCE_Y - 4.5 && o.y < FENCE_Y) {
        o.st = 'flee'; o.fled = true; o.fleeT = 0;
        SFX.play('catScared');
      }
    }
    // the cat's pot helmet goes flying
    if (!c.boss && !OLD_IMG[c.kind] && c.kind !== 'cart' && c.kind !== 'ram') D.parts.push({ x: c.x, y: c.y, h: 1.0, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 2, vh: 5 + Math.random() * 2, t: 0, life: 0.9, kind: 'item', img: c.gear && /^(it|h)_/.test(c.gear.hat) ? c.gear.hat : 'it_pot', r: 0 });
    if (c.kind === 'ladder' && c.hasLadder) for (let i = 0; i < 6; i++) splinter(c.x, c.y);
    if (c.kind === 'ram') { D.shake = 0.3; addFx('boom', c.x, c.y, '#c8a060', 1.3); for (let i = 0; i < 16; i++) splinter(c.x, c.y); SFX.play('crack'); }
    if (c.kind === 'chief') { D.shake = 0.35; D.slowT = 0.7; addFx('ring', c.x, c.y, '#ffd84a'); for (let i = 0; i < 20; i++) confetti(c.x, c.y); }
  }
}
function nearestCat(x, y, r) {
  let best = null, bd = r;
  for (const c of D.cats) { if (c.hp <= 0 || c.under) continue; const d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; best = c; } }
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
    const tx = (Math.random() * 2 - 1) * (FIELD_X - 1), ty = WALL_FOOT + 0.5 + Math.random() * 1.0;
    D.eshots.push({ type: 'cat', sx, sy, tx, ty, t: 0, dur: 1.4 });
    SFX.play('catScared');
  } else if (r < 0.45) {
    D.eshots.push({ type: Math.random() < 0.5 ? 'chili' : 'rock', sx, sy, tx: (Math.random() - 0.5) * 1.6, ty: EGG_Y, t: 0, dur: 1.5 });
  } else {
    const g0 = D.walls[GATE], w = g0 && g0.hp > 0 ? g0 : null;
    if (w) D.eshots.push({ type: Math.random() < 0.5 ? 'chili' : 'rock', wall: w, sx, sy, tx: w.x + (Math.random() - 0.5) * 0.8, ty: FENCE_Y, t: 0, dur: 1.1 });
    else D.eshots.push({ type: 'rock', sx, sy, tx: 0, ty: EGG_Y, t: 0, dur: 1.5 });
  }
  SFX.play('cannon');
}
function trapNear(x, y, r) {
  let best = null, bd = r;
  for (const t of D.traps || []) { if (t.type === 'seesaw') continue; const d = Math.hypot(t.x - x, t.y - y); if (d < bd) { bd = d; best = t; } }
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
  if ((T.traps || 0) <= 0) { toast(tr("กับดักปลาทูหมดแล้ว ซื้อเพิ่มที่บ้าน 🏠")); SFX.play('gateBad'); return; }
  T.traps--; persist();
  D.traps.push({ x, y, t: 0, fuse: 6 });
  SFX.play('thud'); addFx('dust', x, y, '#d9c49a');
}
function trapUpdate(dt) {
  for (const trap of D.traps) {
    trap.t += dt;
    if (trap.type === 'seesaw') {
      trap.tilt = Math.max(0, trap.tilt - dt * 2.5);
      if (trap.broken) { if ((trap.brokeT += dt) > 0.4) trap.done = true; continue; }
      for (const c of D.cats) {
        if (c.hp <= 0 || c.launch || c.st === 'flee' || c.lift || c.under || c.drop) continue;
        if (Math.abs(c.x - trap.x) > 0.5 || Math.abs(c.y - trap.y) > 0.3) continue;
        if (c.boss || c.kind === 'ram' || c.kind === 'cart' || c.kind === 'steel') {
          // too heavy: the board snaps
          trap.broken = true; trap.brokeT = 0; SFX.play('crack'); for (let i = 0; i < 8; i++) splinter(trap.x, trap.y); if (!c.boss) c.stun = Math.max(c.stun, 0.5); break;
        }
        // BOING: the cat goes flying back up the lane
        const back = 4 + Math.random() * 2.5;
        c.launch = { t: 0, dur: 1.0, x0: c.x, y0: c.y, x1: Math.max(-CAT_X, Math.min(CAT_X, c.x + (Math.random() - 0.5) * 2.5)), y1: c.y - back, dmg: 1.5 + T.wave * 0.5 + trap.lvl * 0.4, spin: (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 6) };
        if (c.st !== 'walk') c.st = 'walk';
        trap.tilt = 1; trap.uses--; SFX.play('wood'); SFX.play('catScared'); addFx('dust', trap.x, trap.y, '#d9c49a');
        D.floats.push({ x: trap.x, y: trap.y - 0.3, t: 0, text: tr("ดึ๋ง!"), color: '#ffe680', small: true });
        if (trap.uses <= 0) { trap.broken = true; trap.brokeT = -0.3; }
        break;
      }
      continue;
    }
    const around = D.cats.filter(c => c.hp > 0 && Math.hypot(c.x - trap.x, c.y - trap.y) < 0.8).length;
    if (around) SFX.play('purr');   // happy cats munching the mackerel
    if (around >= 3 || trap.t >= trap.fuse) {
      trap.done = true;
      const dmg = (10 + T.wave * 1.6) * (trap.dmgMul || 1);
      for (const c of D.cats) if (c.hp > 0 && !c.lift && Math.hypot(c.x - trap.x, c.y - trap.y) < 2.1) { hurtCat(c, c.boss ? dmg * 0.5 : dmg); if (!c.boss) c.stun = Math.max(c.stun, 0.8); }
      addFx('boom', trap.x, trap.y, '#ffb347', 1.6); addFx('shock', trap.x, trap.y, '#ffe2a8'); D.shake = Math.max(D.shake, 0.35);
      burst(trap.x, trap.y, ['#c8a060', '#8a9aa8', '#ffcf6a'], 16, 4.5, 1.3);
      SFX.play('break'); SFX.play('catScared');
    }
  }
  D.traps = D.traps.filter(t => !t.done);
  for (const lad of D.ladders) if (lad.down) lad.fallT += dt;
  D.ladders = D.ladders.filter(l => !l.down || l.fallT < 0.7);
}
// ---------- ladders ----------
function canClimb(c) { return !c.boss && c.kind !== 'ram' && c.kind !== 'cart' && c.kind !== 'chief' && c.kind !== 'tank' && c.kind !== 'steel' && c.kind !== 'pitcher' && !(c.kind === 'ladder' && c.hasLadder); }
function ladderNear(x, r) { let best = null, bd = r; for (const l of D.ladders) { if (l.down) continue; const d = Math.abs(l.x - x); if (d < bd) { bd = d; best = l; } } return best; }
function knockLadder(lad) {
  lad.down = true; lad.fallT = 0; SFX.play('wood'); SFX.play('catScared'); D.shake = Math.max(D.shake, 0.12);
  D.floats.push({ x: lad.x, y: FENCE_Y - 0.4, t: 0, text: tr("ผลักล้ม!"), color: '#ffe680' });
  for (const c of D.cats) if (c.climb && c.climb.L === lad && c.hp > 0) {
    c.st = 'walk'; c.climb = null; c.y = FENCE_Y - 0.9; c.lift = 0; c.stun = 1.2; hurtCat(c, 2 + T.wave * 0.3, 'lead');
  }
}
// trap ducks: walk from their tent to the wall, hop over, set a seesaw or a mackerel bomb in front of the cats, then run home
function campTrapCap(cm) { return 1 + (cm.lvl >= 4 ? 1 : 0) + (cm.lvl >= 8 ? 1 : 0); }
function trapSpot() {
  // in front of the cat that is furthest down the lane, else somewhere on the lawn
  let lead = null;
  for (const c of D.cats) if (c.hp > 0 && c.y < FENCE_Y - 2.2 && c.y > dinv(0, 40).y && !c.launch && (!lead || c.y > lead.y)) lead = c;
  const x = lead ? lead.x + (Math.random() - 0.5) * 0.4 : (Math.random() * 2 - 1) * (CAT_X - 0.6);
  const y = lead ? Math.min(FENCE_Y - 1.6, lead.y + 2.2 + Math.random()) : FENCE_Y - 2.5 - Math.random() * 2.5;
  return { x: Math.max(-CAT_X + 0.5, Math.min(CAT_X - 0.5, x)), y };
}
function troopUpdate(dt) {
  T.camps.forEach((cm, i) => {
    if (!cm) return;
    const want = 1 + (cm.lvl >= 5 ? 1 : 0) + (cm.lvl >= 10 ? 1 : 0), mine = D.troops.filter(t => t.camp === i);
    const placed = D.traps.filter(tr => tr.camp === i).length + mine.filter(t => t.carry).length;
    if (mine.length < want && placed < campTrapCap(cm) && (D.campT[i] = (D.campT[i] || 0) - dt) <= 0) {
      D.campT[i] = 2.5; const cp = CAMP_POS[i];
      cm.next = cm.next === 'seesaw' ? 'fish' : 'seesaw';
      D.troops.push({ camp: i, x: cp.x + (Math.random() - 0.5) * 0.4, y: cp.y + 0.2, lvl: cm.lvl, carry: cm.next, st: 'march',
        gx: Math.max(-CAT_X + 0.4, Math.min(CAT_X - 0.4, cp.x * 0.9 + (Math.random() - 0.5) * 1.5)), hop: 0, walkT: 0, hitT: 0, face: 1, setT: 0 });
      SFX.play('quack');
    }
  });
  const inY = WALL_FOOT + 0.35, outY = FENCE_Y - 0.9;
  for (const t of D.troops) {
    t.hitT = Math.max(0, t.hitT - dt);
    const walkTo = (gx, gy, sp) => { const dx = gx - t.x, dy = gy - t.y, d = Math.hypot(dx, dy); if (d > 0.08) { const st = Math.min(d, sp * dt); t.x += dx / d * st; t.y += dy / d * st; t.walkT += dt * 10; if (Math.abs(dx) > 0.02) t.face = dx >= 0 ? 1 : -1; return false; } return true; };
    // outside the wall a cat that bumps into the duck sends it flying home (the trap it carried is lost)
    if ((t.st === 'go' || t.st === 'set' || t.st === 'back') && D.cats.some(c => c.hp > 0 && !c.launch && Math.hypot(c.x - t.x, c.y - t.y) < 0.5)) {
      t.st = 'down'; t.down = 0; t.carry = null; SFX.play('quack'); addFx('spark', t.x, t.y, '#ffffff');
    }
    if (t.st === 'down') {
      // tumble back over the wall and home, a bit dizzy
      t.down += dt; const u = Math.min(1, t.down / 0.8);
      if (t.y0 === undefined) { t.y0 = t.y; t.x0 = t.x; }
      t.y = t.y0 + (inY - t.y0) * u; t.hopLift = Math.sin(u * Math.PI) * 2.0;
      if (u >= 1) { t.st = 'home'; t.hopLift = 0; t.y0 = undefined; t.dizzy = 1.2; }
      continue;
    }
    if (t.st === 'march') { if (walkTo(t.gx, inY, 2.6)) { t.st = 'hop'; t.hop = 0; SFX.play('shoot'); } continue; }
    if (t.st === 'hop' || t.st === 'hopin') {
      t.hop = Math.min(1, t.hop + dt * 1.5);
      const a = t.st === 'hop' ? inY : outY, b2 = t.st === 'hop' ? outY : inY;
      t.y = a + (b2 - a) * t.hop; t.hopLift = Math.sin(t.hop * Math.PI) * 2.8;
      if (t.hop >= 1) { t.hopLift = 0; addFx('dust', t.x, t.y, '#d9c49a'); if (t.st === 'hop') { t.st = 'go'; const sp = trapSpot(); t.tx = sp.x; t.ty = sp.y; } else t.st = 'home'; }
      continue;
    }
    if (t.st === 'go') { if (walkTo(t.tx, t.ty, 3.0)) { t.st = 'set'; t.setT = 0.6; } continue; }
    if (t.st === 'set') {
      t.setT -= dt;
      if (t.setT <= 0) {
        const cm = T.camps[t.camp], lv = cm ? cm.lvl : 1;
        if (t.carry === 'seesaw') D.traps.push({ type: 'seesaw', camp: t.camp, x: t.x, y: t.y - 0.25, t: 0, uses: 2 + Math.floor(lv / 3), tilt: 0, lvl: lv });
        else D.traps.push({ type: 'fish', camp: t.camp, x: t.x, y: t.y - 0.25, t: 0, fuse: 9, dmgMul: 0.8 + lv * 0.12 });
        t.carry = null; SFX.play('thud'); addFx('dust', t.x, t.y - 0.25, '#d9c49a'); t.st = 'back';
      }
      continue;
    }
    if (t.st === 'back') { if (walkTo(t.gx, outY, 3.4)) { t.st = 'hopin'; t.hop = 0; SFX.play('shoot'); } continue; }
    if (t.st === 'home') { t.dizzy = Math.max(0, (t.dizzy || 0) - dt); const cp = CAMP_POS[t.camp]; if (walkTo(cp.x, cp.y + 0.2, 2.4)) t.gone = true; continue; }
  }
  D.troops = D.troops.filter(t => !t.gone);
}
function drawTroop(t) {
  const p = dproj(t.x, t.y), h = dk * 0.85, w = h * 0.75, lift = (t.hopLift || 0) * dk;
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.25, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(p.x, p.y - lift);
  if (t.st === 'down') { ctx.rotate(t.down * 12); drawFrame('k_duck_act', 2, 0, h * 0.5, h, false); ctx.restore(); return; }
  if (t.face < 0) ctx.scale(-1, 1);
  if (t.st === 'set') {
    // crouch and fiddle with the trap
    ctx.scale(1.08, 0.85 + Math.sin(performance.now() / 60) * 0.04);
    drawFrame('k_duck_act', 1, 0, 0, h, false);
  } else drawFrame('k_duck_walk', Math.floor(t.walkT) % 4, 0, 0, h, false);
  drawItem('it_pot', w * 0.04, -h * 0.95, h * 0.42, 0.1);
  // the trap it carries, held over its head
  if (t.carry === 'seesaw') { drawItem('it_board', 0, -h * 1.25, h * 0.7, Math.PI / 2); }
  else if (t.carry === 'fish') drawItem('it_fishtrap', 0, -h * 1.25, h * 0.6);
  ctx.restore();
  if (t.dizzy > 0) { ctx.font = `${Math.round(h * 0.3)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('💫', p.x + Math.cos(performance.now() / 150) * h * 0.2, p.y - h * 1.2); }
}
function drawCamp(i) {
  const cm = T.camps[i];
  if (!cm) {
    if (D.phase === 'wave') return;
    const cp = CAMP_POS[i], p = dproj(cp.x, cp.y), k = dk, t = performance.now() / 1000;
    ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, k * 0.6, k * 0.24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 10; ctx.beginPath(); ctx.ellipse(p.x, p.y, k * 0.6, k * 0.24, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = `${Math.round(k * 0.45)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('⛺', p.x, p.y - k * 0.1);
    ctx.font = `800 ${Math.round(Math.max(10, k * 0.24))}px Mitr,system-ui,sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText('🪙500', p.x, p.y + k * 0.42); ctx.fillStyle = '#ffe680'; ctx.fillText('🪙500', p.x, p.y + k * 0.42);
    ctx.restore(); return;
  }
  const cp = CAMP_POS[i], p = dproj(cp.x, cp.y), sz = dk * (1.45 + Math.min(3, Math.floor(cm.lvl / 4)) * 0.12);
  if (!drawItem('it_tent', p.x, p.y - sz * 0.38, sz)) { ctx.font = `${sz * 0.6}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('⛺', p.x, p.y); }
}
function drawTrap(tr) {
  if (tr.type === 'seesaw') { drawSeesaw(tr); return; }
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
    D.cheered = true; SFX.play('fanfare'); D.banner = 0;
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
  D.banner = 2.5; D.bannerTxt = tr("แมวแย่งไข่ทองคำไปแล้ว!! 😿");
  let th = null, bd = 99; for (const c of D.cats) if (c.hp > 0 && !c.boss && c.kind !== 'ram' && c.kind !== 'cart') { const d = Math.hypot(c.x, c.y - EGG_Y); if (d < bd) { bd = d; th = c; } }
  D.thief = th; if (th) { th.st = 'flee'; th.fleeT = 0; th.fled = true; th.dance = 0; th.lift = 0; th.climb = null; SFX.play('catScared'); }
}
function defeatUpdate(dt) {
  D.defT += dt;
  if (Math.random() < dt * 14) addFx('dust', (Math.random() - 0.5) * 2.4, EGG_Y - Math.random(), '#9a9080');
  // the cats dance around
  for (const c of D.cats) if (c.hp > 0 && c !== D.thief) { c.hitT = 0; c.dance = (c.dance || 0) + dt; }
  if (D.thief) { const th = D.thief; th.y -= 3.2 * dt; th.x += (0 - th.x) * dt; th.mx = 0; th.my = -1; }
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
  drawVictoryTitle();
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
    const tx = tr("ล้มแมว {0} ตัว • 🪙 +{1}", D.killed, Math.floor(D.earned));
    ctx.strokeText(tx, cx, cy + 56); ctx.fillStyle = '#fff'; ctx.fillText(tx, cx, cy + 56);
    ctx.font = '700 12px Mitr,system-ui,sans-serif'; ctx.globalAlpha = 0.8 + Math.sin(performance.now() / 200) * 0.2;
    ctx.strokeText(tr("แตะเพื่อไปต่อ"), cx, cy + 82); ctx.fillText(tr("แตะเพื่อไปต่อ"), cx, cy + 82);
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
  D.cats = []; D.shots = []; D.queue = []; D.pools = []; D.eshots = []; D.traps = []; D.troops = []; D.ladders = []; D.thief = null; D.trapMode = false; D.cracks = []; D.holes = []; D.tops = []; D.strikes = []; D.sky = null; D.ufo = null;
  collectAll();
  if (won) {
    for (let i = 0; i < 50; i++) confetti((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
    const st = D.vicStars || 3, bonus = Math.round((40 + T.wave * 15) * (0.6 + st * 0.2));
    save.coins += bonus; D.earned += bonus; T.lastStars = st;
    showWaveResult(true, bonus);
    if (st >= 3) openChest(() => { renderTdHud(); });
    T.wave++;
  } else {
    SFX.play('lose');
    showWaveResult(false, 0);
  }
  // fence and house are patched up between waves
  D.houseHp = D.houseMax = houseMax();
  for (const w of D.walls) w.hp = w.max = wallMax(w.i);
  persist(); renderTdHud();
}
function showWaveResult(won, bonus) {
  const earned = D.earned;
  $('rTitle').textContent = won ? tr("ผ่านวันที่ {0}! {1}", T.wave, '⭐'.repeat(D.vicStars || 3)) : tr("แมวแย่งไข่ทองคำไปแล้ว! 😿");
  $('rTitle').style.color = won ? '#ffd84a' : '#ff7a7a';
  $('rInfo').textContent = won ? tr("ล้มแมว {0} ตัว • โบนัส 🪙{1}", D.killed, bonus) : tr("ล้มแมวได้ {0} ตัว • ยังเหลือแมวอีก {1} ตัว", D.killed, D.cats.filter(c => c.hp > 0).length + D.queue.length);
  $('rCoins').textContent = earned;
  const ab = $('adBtn'), nx = $('next');
  ab.classList.remove('hidden');
  if (won) {
    ab.innerHTML = tr("🎬 ดูโฆษณา รับ x3<small>+🪙{0} เพิ่ม</small>", earned * 2);
    ab.onclick = () => Ads.show(ok => {
      if (!ok) return;
      save.coins += earned * 2; persist(); SFX.play('reward');
      $('rCoins').textContent = earned * 3; ab.classList.add('hidden');
      toast(tr("ได้เหรียญ x3! +🪙{0}", earned * 2)); renderTdHud();
    });
    nx.textContent = tr("▶ ไปวันที่ {0}", T.wave + 1);
    nx.onclick = () => { hide('result'); enterTD(); };
  } else {
    ab.classList.toggle('hidden', D.revived);
    ab.innerHTML = tr("🎬 ดูโฆษณา สู้ต่อ!<small>ซ่อมบ้านกับกำแพงเต็ม แล้วสู้วันนี้ต่อ</small>");
    ab.onclick = () => Ads.show(ok => { if (ok) revive(); });
    nx.textContent = tr("🔁 เริ่มวันนี้ใหม่");
    nx.onclick = () => { hide('result'); resetWave(); enterTD(); };
  }
  hide('tdUi'); show('result'); state = 'tdresult';
}
function revive() {
  SFX.play('reward');
  D.revived = true; D.phase = 'wave';
  D.houseHp = D.houseMax = houseMax();
  for (const w of D.walls) w.hp = w.max = wallMax(w.i);
  // knock every cat back out past the fence
  for (const c of D.cats) {
    if (c.hp <= 0) continue;
    if (!isFinite(c.x)) c.x = 0; c.y = isFinite(c.y) ? Math.min(c.y, FENCE_Y - 3) : FENCE_Y - 5; c.st = 'walk'; c.fleeT = 0; c.atk = 0; c.dance = 0; c.lift = 0; c.climb = null; c.launch = null;
  }
  D.ladders = []; D.thief = null;
  addFx('shock', 0, FENCE_Y, '#bfe6ff'); addFx('shock2', 0, FENCE_Y, '#ffffff'); D.shake = 0.3;
  hide('result'); show('tdUi'); state = 'td';
  toast(tr("สู้ต่อ! ไข่ทองคำกลับมาแล้ว กำแพงซ่อมเต็มแล้ว"));
}
function resetWave() {
  D.phase = 'build'; D.cats = []; D.shots = []; D.queue = []; D.ladders = []; D.thief = null; D.troops = []; D.traps = []; D.tops = []; D.strikes = []; D.sky = null; D.ufo = null;
  D.houseHp = D.houseMax = houseMax();
  for (const w of D.walls) w.hp = w.max = wallMax(w.i);
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
  if (document.getElementById('baseMenu')) { closeBaseMenu(); return; }
  if (D.phase === 'intro') { catIntroNext(); return; }
  if (D.phase === 'victory') { if (D.vicT > 1.5 && D.slowT <= 0) { D.vicT = 99; } return; }
  if (D.phase === 'defeat') return;
  if (D.trapMode && D.phase === 'wave') {
    const q = dinv(cx, cy); D.trapMode = false;
    if (q.y < FENCE_Y - 0.6) placeTrap(Math.max(-FIELD_X + 0.4, Math.min(FIELD_X - 0.4, q.x)), q.y);
    else toast(tr("วางกับดักได้แค่หน้ากำแพง (ฝั่งแมว)"));
    return;
  }
  const p = dinv(cx, cy);
  // buy / upgrade circles: the leader walks over and pays by himself
  { let best = null, bd = 0.7;
    for (const pd of padList()) { const d = Math.hypot(p.x - pd.x, (p.y - pd.y) * 1.2); if (d < bd) { bd = d; best = pd; } }
    if (best) {
      SFX.play('click'); closeSheet();
      D.lead.goal = { id: best.id, x: best.x, y: best.y, fresh: true }; D.padLock = null;
      if (save.coins < 1 && (T.pads[best.id] || 0) < best.cost) toast(tr("เหรียญไม่พอ 🪙 ล้มแมวเพิ่มก่อนนะ"));
      if (!save.td.walked) { save.td.walked = true; persist(); }
      return;
    } }
  // duck turrets (drawn raised, so test a little above the ground point too)
  for (let s = 0; s < SLOTS; s++) {
    const q = platPos(s);
    if (Math.hypot(p.x - q.x, p.y - q.y) < 0.8 || Math.hypot(p.x - q.x, p.y + 1.3 - q.y) < 0.8) {
      SFX.play('click');
      if (D.moveFrom !== undefined && D.moveFrom !== null) { finishMove(s); return; }
      openBaseMenu(s); return;
    }
  }
  if (D.moveFrom !== undefined && D.moveFrom !== null) { D.moveFrom = null; toast(tr("ยกเลิกการย้าย")); return; }
  // tents
  for (let i = 0; i < CAMP_POS.length; i++) { const cp = CAMP_POS[i]; if (Math.hypot(p.x - cp.x, (p.y - cp.y + 0.4) * 0.8) < 0.95) { SFX.play('click'); openCamp(i); return; } }
  // a hurt wall segment: repair on the spot
  if (p.y > FENCE_Y - 0.6 && p.y < WALL_FOOT + 0.2 && Math.abs(p.x) < FIELD_X + 0.3) { SFX.play('click'); openGate(); return; }
  if (Math.hypot(p.x, p.y - EGG_Y + 0.3) < 1.1) { SFX.play('click'); openHouse(); return; }
  closeSheet();
  if (D.phase !== 'wave' || D.bombCd > 0) return;
  D.bombCd = 7;
  D.shots.push({ x: 0, y: 0, sx: 0, sy: -0.8, tx: p.x, ty: p.y, w: 'bomb', dmg: bombDmg(), t: 0, dur: 0.45, bomb: true });
}

// ---------- leader duck, coin drops and buy pads ----------
function padList() { return []; }
function padListOld() {
  const L = [];
  for (let s = 0; s < SLOTS; s++) {
    const pl = platAt(s), { x, y } = slotPad(s);
    if (!pl) L.push({ id: 'b' + s, x, y, icon: '🪵', label: tr("สร้างป้อมบนกำแพง"), cost: buildCost(), apply: () => {
      T.plats.push({ slot: s, w: 'bow', lvl: 1 }); shooter(s).arrive = 1; SFX.play('quack'); toast(tr("เป็ดขึ้นกำแพงแล้ว! 🦆"));
    } });
    else if (pl.lvl < 10) L.push({ id: 'u' + s, x, y, icon: WEAPON[pl.w].icon, label: `Lv.${pl.lvl + 1}`, cost: lvlCost(pl), apply: () => {
      const before = tierOf(pl.lvl); pl.lvl++; const after = tierOf(pl.lvl);
      if (after > before) { toast(tr("แท่นใหม่: {0}! {1}", PLAT_NAME[after], PLAT_SKILL[after])); const q = platPos(s); for (let i = 0; i < 30; i++) confetti(q.x, q.y); addFx('ring', q.x, q.y, '#ffd84a'); }
    } });
  }
  CAMP_POS.forEach((cp, i) => {
    const cm = T.camps[i], x = cp.x + (i ? -0.2 : 0.4), y = cp.y + 1.15;
    if (!cm) L.push({ id: 'cb' + i, x, y, icon: '⛺', label: tr("ค่ายเป็ดวางกับดัก"), cost: 500, apply: () => { T.camps[i] = { lvl: 1 }; toast(tr("ตั้งค่ายแล้ว! เป็ดจะออกไปวางไม้กระดกกับระเบิดปลาทู 🪤")); SFX.play('quack'); } });
    else if (cm.lvl < 10) L.push({ id: 'cu' + i, x, y, icon: '🪖', label: tr("ค่าย Lv.{0}", cm.lvl + 1), cost: Math.round(55 * Math.pow(cm.lvl, 1.5) * 1.4), apply: () => { cm.lvl++; SFX.play('upgrade'); if (cm.lvl === 5 || cm.lvl === 10) toast(cm.lvl === 5 ? tr("ค่ายได้เป็ดวางกับดักเพิ่ม 1 ตัว!") : tr("กับดักแรงขึ้น + เป็ดเพิ่มอีกตัว!")); } });
  });
  L.push({ id: 'house', x: -2.0, y: EGG_Y + 1.45, icon: '🥚', label: tr("เกราะไข่ Lv.{0}", T.house + 1), cost: 80 * T.house, apply: () => { T.house++; SFX.play('upgrade'); D.houseHp = D.houseMax = houseMax(); } });
  for (const w of D.walls) if (w.hp < w.max) {
    const cost = Math.max(5, Math.round((20 + T.fence * 6) * (1 - w.hp / w.max)));
    L.push({ id: 'w' + w.i, x: w.x + (w.i === NWALL - 1 ? -0.9 : 0.9), y: WALL_FOOT + 0.55, icon: '🔧', label: w.gate ? tr("ซ่อมประตู") : tr("ซ่อมกำแพง"), cost, small: true, apply: () => { w.hp = w.max; SFX.play('plus'); } });
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
    const hcx = 0, hcy = EGG_Y + 0.5, rr = HOUSE_R + 0.45;
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
  // Ease the visual stride in and out independently of joystick movement.
  const blend = L.strideBlend || 0;
  L.strideBlend = Math.max(0, Math.min(1, blend + dt * (L.moving ? 7 : -6)));
  // stay in the yard, and walk around the house rather than through it
  L.x = Math.max(-FIELD_X + 0.2, Math.min(FIELD_X - 0.2, L.x)); L.y = Math.max(WALL_FOOT + 0.3, Math.min(HOUSE_Y + 0.6, L.y));
  { const hx = L.x, hy = L.y - (EGG_Y + 0.5), d = Math.hypot(hx, hy * 1.4), r = HOUSE_R + 0.15;
    if (d < r) { const k = r / (d || 1); L.x = (hx || 0.01) * k; L.y = EGG_Y + 0.5 + hy * k; } }
  // standing under a ladder pushes it off the wall
  if (D.phase === 'wave') for (const lad of D.ladders) {
    if (lad.down) continue;
    if (Math.abs(lad.x - L.x) < 0.75 && L.y < WALL_FOOT + 0.9) { lad.push += dt; L.face = 1; L.swingT = Math.max(L.swingT, 0.1); if (lad.push > 0.35) knockLadder(lad); }
    else lad.push = Math.max(0, lad.push - dt);
  }
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
function closeSheet() { closeBaseMenu(); sheetFor = null; $('sheet').classList.add('hidden'); }
function refreshSheet() { if (!sheetFor) return; if (sheetFor === 'gate') { openGate(); return; } if (sheetFor.camp !== undefined) { openCamp(sheetFor.camp); return; } if (sheetFor === 'house') openHouse(); else openSlot(sheetFor.slot); }
function sellValue(p) {
  const tier = WEAPONS.findIndex(w => w.id === p.w); let sum = 60 + (WEAPON[p.w].cost || 0);
  for (let l = 1; l < p.lvl; l++) sum += Math.round(40 * Math.pow(l, 1.5) * (1 + tier * 0.4));
  return Math.floor(sum * 0.5);
}
function finishMove(t) {
  const f = D.moveFrom; D.moveFrom = null;
  if (t === f) { toast(tr("ยกเลิกการย้าย")); return; }
  const a = platAt(f), b = platAt(t);
  if (!a) return;
  a.slot = t; if (b) b.slot = f;
  shooter(t).arrive = 1; if (b) shooter(f).arrive = 1;
  SFX.play('quack'); addFx('ring', platPos(t).x, platPos(t).y, '#ffd84a'); persist();
  toast(b ? tr("🔀 สลับที่ป้อมแล้ว") : tr("🔀 ย้ายป้อมแล้ว"));
}
function repairWall(w) {
  const cost = Math.max(5, Math.round((20 + T.fence * 6) * (1 - w.hp / w.max)));
  if (save.coins < cost) { toast(tr("ซ่อมต้องใช้ 🪙{0}", cost)); SFX.play('gateBad'); return; }
  save.coins -= cost; w.hp = w.max; SFX.play('plus'); addFx('ring', w.x, FENCE_Y + 0.5, '#7dff8a');
  D.floats.push({ x: w.x, y: FENCE_Y, t: 0, text: tr("🔧 ซ่อมแล้ว -🪙{0}", cost), color: '#7dff8a' }); persist(); renderTdHud();
}
function openGate() {
  sheetFor = 'gate';
  const body = $('sheetBody'); body.innerHTML = '';
  const g = D.walls[GATE], wt = WALL_TIERS[wallTierOf(T.fence)];
  $('sheetTitle').textContent = `🏰 ${wt.name} Lv.${T.fence}`;
  const info = document.createElement('div'); info.className = 'sinfo';
  info.innerHTML = tr("แมวเข้าเมืองได้ทาง<b>ประตู</b>เท่านั้น (ยกเว้นปีนบันได มุดดิน หรือโดดร่ม) • ประตูทน <b>{0}/{1}</b> • 🪙 {2}", Math.ceil(g.hp), g.max, Math.floor(save.coins).toLocaleString());
  body.appendChild(info);
  if (g.hp < g.max) { const c = Math.max(5, Math.round((20 + T.fence * 6) * (1 - g.hp / g.max)));
    body.appendChild(btn(g.hp <= 0 ? tr("🔧 สร้างประตูใหม่") : tr("🔧 ซ่อมประตู"), `🪙${c}`, save.coins >= c, () => { save.coins -= c; g.hp = g.max; SFX.play('plus'); addFx('ring', g.x, FENCE_Y + 0.5, '#7dff8a'); })); }
  const fc = 50 * T.fence;
  body.appendChild(btn(tr("🧱 อัปเกรดกำแพงเมือง Lv.{0}", T.fence + 1), tr("ประตูทน {0} → {1}{2} • 🪙{3}", wallMax(GATE), Math.round((30 + T.fence * 18) * (1.4 + (T.gatehouse || 0) * 0.6)), WALL_LOOK_AT.includes(T.fence + 1) ? tr(" • โฉมใหม่: {0}", WALL_TIERS[wallTierOf(T.fence + 1)].name) : '', fc), save.coins >= fc, () => {
    save.coins -= fc; const before = wallTierOf(T.fence); T.fence++; for (const w of D.walls) { w.max = wallMax(w.i); w.hp = w.gate ? Math.min(w.max, w.hp + 18) : w.max; }
    SFX.play('upgrade');
    if (wallTierOf(T.fence) > before) { toast(tr("🏰 กำแพงโฉมใหม่: {0}!", WALL_TIERS[wallTierOf(T.fence)].name)); for (let i = 0; i < 30; i++) confetti((Math.random() - 0.5) * 8, FENCE_Y); }
  }));
  if (T.gatehouse < 3) body.appendChild(btn(`🏯 ${[tr("สร้างซุ้มประตูเมือง"), tr("ซุ้มประตูหิน"), tr("ซุ้มประตูทองคำ")][T.gatehouse]}`, T.wave < 3 ? tr("ปลดล็อกวันที่ 3") : tr("ประตูทนขึ้นอีกมาก • 🪙{0}", gateCost()), T.wave >= 3 && save.coins >= gateCost(), () => { save.coins -= gateCost(); T.gatehouse++; g.max = wallMax(GATE); g.hp = g.max; SFX.play('upgrade'); toast(tr("🏯 ประตูเมืองแข็งแรงขึ้นแล้ว!")); }));
  if (T.expand < MAX_EXPAND) body.appendChild(btn(tr("🏰 สร้างกำแพงข้าง (ตัว U) {0}/{1}", T.expand + 1, MAX_EXPAND), T.wave < expandDay() ? tr("ปลดล็อกวันที่ {0} • ได้จุดตั้งป้อมเป็ดเพิ่ม 2 จุด", expandDay()) : tr("ได้จุดตั้งป้อมเป็ดเพิ่ม 2 จุด วางป้อมได้ทันที • 🪙{0}", expandCost()), T.wave >= expandDay() && save.coins >= expandCost(), () => { save.coins -= expandCost(); expandTown(); }));
  $('sheet').classList.remove('hidden');
}
function openCamp(i) {
  sheetFor = { camp: i };
  const body = $('sheetBody'); body.innerHTML = '';
  const cm = T.camps[i];
  $('sheetTitle').textContent = cm ? tr("⛺ ค่ายเป็ดวางกับดัก Lv.{0}", cm.lvl) : tr("⛺ ค่ายเป็ดวางกับดัก");
  const info = document.createElement('div'); info.className = 'sinfo';
  info.innerHTML = tr("เป็ดจากค่ายจะปีนกำแพงออกไปวาง<b>ไม้กระดก</b> (แมวเหยียบแล้วดีดกระเด็น) สลับกับ<b>ระเบิดปลาทู</b> ไว้หน้าแมว");
  body.appendChild(info);
  if (!cm) body.appendChild(btn(tr("⛺ ตั้งค่าย"), tr("เป็ดวางกับดัก 1 ตัว • 🪙500"), save.coins >= 500, () => { save.coins -= 500; T.camps[i] = { lvl: 1 }; SFX.play('quack'); toast(tr("ตั้งค่ายแล้ว! 🪤")); }));
  else if (cm.lvl < 10) { const c = Math.round(55 * Math.pow(cm.lvl, 1.5) * 1.4);
    body.appendChild(btn(tr("⬆️ อัปเกรดค่าย Lv.{0}", cm.lvl + 1), tr("กับดักแรงขึ้น • Lv.5, 10 ได้เป็ดเพิ่ม • 🪙{0}", c), save.coins >= c, () => { save.coins -= c; cm.lvl++; SFX.play('upgrade'); if (cm.lvl === 5 || cm.lvl === 10) toast(tr("ได้เป็ดวางกับดักเพิ่ม 1 ตัว!")); })); }
  else { const d = document.createElement('div'); d.className = 'sinfo'; d.textContent = tr("⭐ เลเวลเต็มแล้ว"); body.appendChild(d); }
  $('sheet').classList.remove('hidden');
}
function closeBaseMenu() { const m = document.getElementById('baseMenu'); if (m) m.remove(); }
function openBaseMenu(s) {
  closeBaseMenu(); closeSheet();
  const p = platAt(s), q = platPos(s), sp = dproj(q.x, q.y);
  const m = document.createElement('div'); m.id = 'baseMenu';
  m.style.cssText = `position:fixed;left:${Math.max(110, Math.min(W - 110, sp.x))}px;top:${Math.max(70, sp.y - dk * 1.55)}px;transform:translate(-50%,-100%);z-index:8;display:flex;gap:6px;padding:6px;border-radius:18px;background:rgba(40,25,10,.82);box-shadow:0 6px 16px rgba(0,0,0,.4)`;
  const mk = (icon, label, sub, ok, fn) => {
    const b = document.createElement('button');
    b.style.cssText = `border:0;border-radius:14px;width:62px;padding:6px 2px 5px;font-family:Mitr,system-ui,sans-serif;color:#fff;display:flex;flex-direction:column;align-items:center;gap:1px;background:${ok ? 'linear-gradient(#5fd06a,#2f9a3e)' : '#8a8070'};box-shadow:0 3px 0 ${ok ? '#1f6a2a' : '#5a5246'}`;
    b.innerHTML = `<span style="font-size:20px;line-height:1">${icon}</span><b style="font-size:11px">${label}</b>${sub ? `<small style="font-size:10px;color:#ffe680">${sub}</small>` : ''}`;
    b.onclick = e => { e.stopPropagation(); SFX.init(); if (!ok) { SFX.play('gateBad'); return; } fn(); };
    b.onpointerdown = e => e.stopPropagation();
    m.appendChild(b); return b;
  };
  if (!p) {
    mk('🏰', tr("สร้างป้อม"), `🪙${buildCost()}`, save.coins >= buildCost(), () => { save.coins -= buildCost(); T.plats.push({ slot: s, w: 'bow', lvl: 1 }); shooter(s).arrive = 1; SFX.play('quack'); toast(tr("เป็ดขึ้นป้อมแล้ว! 🦆")); persist(); closeBaseMenu(); renderTdHud(); });
  } else {
    if (p.lvl < 10) mk('⬆️', `Lv.${p.lvl + 1}`, `🪙${lvlCost(p)}`, save.coins >= lvlCost(p), () => {
      const before = tierOf(p.lvl); save.coins -= lvlCost(p); p.lvl++; const after = tierOf(p.lvl);
      addFx('ring', q.x, q.y, '#ffd84a'); SFX.play('upgrade'); D.floats.push({ x: q.x, y: q.y, t: 0, text: `⬆️ Lv.${p.lvl}`, color: '#ffe680', big: true });
      if (after > before) { toast(tr("ป้อมใหม่: {0}! {1}", PLAT_NAME[after], PLAT_SKILL[after])); for (let i = 0; i < 30; i++) confetti(q.x, q.y); }
      persist(); renderTdHud(); openBaseMenu(s);
    });
    else mk('⭐', tr("เต็มแล้ว"), '', false, () => {});
    mk('⚔️', tr("อาวุธ"), WEAPON[p.w].icon, true, () => { closeBaseMenu(); openSlot(s); });
    const idle = D.phase !== 'wave';
    mk('🔀', tr("ย้าย"), '', idle, () => { D.moveFrom = s; closeBaseMenu(); toast(tr("🔀 แตะจุดบนกำแพงที่จะย้ายไป")); });
    let sure = false; const sv = sellValue(p);
    const sb = mk('💰', tr("ขาย"), `+${sv}`, idle, () => {
      if (!sure) { sure = true; sb.querySelector('b').textContent = tr("ยืนยัน?"); sb.style.background = 'linear-gradient(#ff8a5a,#d8452a)'; SFX.play('click'); return; }
      save.coins += sv; T.plats = T.plats.filter(x => x !== p); D.shooters.delete(s); SFX.play('coin'); toast(tr("ขายป้อมแล้ว +🪙{0}", sv)); persist(); closeBaseMenu(); renderTdHud();
    });
    if (!idle) { const n = document.createElement('div'); n.style.cssText = 'position:absolute;left:0;right:0;top:100%;text-align:center;font:700 10px Mitr,system-ui,sans-serif;color:#fff;text-shadow:0 1px 2px #000;margin-top:2px'; n.textContent = tr("ย้าย/ขายได้ตอนพัก"); m.appendChild(n); }
  }
  document.body.appendChild(m);
  const r = m.getBoundingClientRect(); m.style.left = Math.max(r.width / 2 + 6, Math.min(W - r.width / 2 - 6, sp.x)) + 'px';
}
function openSlot(s) {
  sheetFor = { slot: s };
  const body = $('sheetBody'); body.innerHTML = '';
  const p = platAt(s);
  if (!p) {
    $('sheetTitle').textContent = tr("🏰 สร้างป้อมเป็ดตรงนี้");
    const info = document.createElement('div'); info.className = 'sinfo';
    info.innerHTML = tr("เป็ดถือตะเกียบจะขึ้นมาประจำป้อมนี้ แล้วค่อยเปลี่ยนอาวุธทีหลังได้ • มีเหรียญ 🪙 <b>{0}</b>", Math.floor(save.coins).toLocaleString());
    body.appendChild(info);
    body.appendChild(btn(tr("🏰 สร้างป้อม + เป็ดยิง"), `🪙${buildCost()}`, save.coins >= buildCost(), () => {
      save.coins -= buildCost(); T.plats.push({ slot: s, w: 'bow', lvl: 1 }); shooter(s).arrive = 1; SFX.play('quack'); toast(tr("เป็ดขึ้นป้อมแล้ว! 🦆")); closeSheet();
    }));
  } else {
    const W0 = WEAPON[p.w];
    $('sheetTitle').textContent = `${W0.icon} ${PLAT_NAME[tierOf(p.lvl)]} • ${W0.name} Lv.${p.lvl}`;
    const info = document.createElement('div'); info.className = 'sinfo';
    info.innerHTML = tr("🪙 <b>{0}</b> • ดาเมจ {1} • ยิง {2}/วิ • ระยะ {3}{4}{5}", Math.floor(save.coins).toLocaleString(), wDmg(p).toFixed(1), W0.rate, Math.round(W0.range), W0.splash ? tr(" • ระเบิด") : '', W0.multi ? tr(" • 3 ดอก") : '');
    body.appendChild(info);
    const pk = PERKS[p.w], perk = document.createElement('div'); perk.className = 'sinfo';
    perk.innerHTML = tr("⭐ Lv.5: {0} {1}<br>🌟 Lv.10: {2} {3}<br><small>เลเวล 4, 7, 10 เอฟเฟกต์ยิงจะสวยขึ้น</small>", pk[0], p.lvl >= 5 ? '✅' : '🔒', pk[1], p.lvl >= 10 ? '✅' : '🔒');
    body.appendChild(perk);
    if (p.lvl < 10) body.appendChild(btn(tr("⬆️ อัปเกรดเป็น Lv.{0}", p.lvl + 1), `${[4, 7, 10].includes(p.lvl + 1) ? tr("ป้อมเปลี่ยนเป็น{0}! • ", PLAT_NAME[tierOf(p.lvl + 1)]) : ''}🪙${lvlCost(p)}`, save.coins >= lvlCost(p), () => {
      const before = tierOf(p.lvl); save.coins -= lvlCost(p); p.lvl++; const after = tierOf(p.lvl); const q = platPos(s);
      addFx('ring', q.x, q.y, '#ffd84a'); SFX.play('upgrade');
      if (after > before) { toast(tr("ป้อมใหม่: {0}! {1}", PLAT_NAME[after], PLAT_SKILL[after])); for (let i = 0; i < 30; i++) confetti(q.x, q.y); }
    }));
    else { const mx = document.createElement('div'); mx.className = 'sinfo'; mx.textContent = tr("⭐ เลเวลเต็มแล้ว! ") + PLAT_SKILL[3]; body.appendChild(mx); }
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px';
    const mv = btn(tr("🔀 ย้าย / สลับ"), tr("แตะป้อมปลายทาง"), D.phase !== 'wave', () => { D.moveFrom = s; closeSheet(); toast(tr("🔀 แตะจุดบนกำแพงที่จะย้ายไป (แตะที่อื่นเพื่อยกเลิก)")); });
    let sure = false; const sv = sellValue(p);
    const sl = btn(tr("💰 ขาย"), `+🪙${sv}`, D.phase !== 'wave', () => {});
    sl.onclick = e => { e.stopPropagation(); if (D.phase === 'wave') { toast(tr("ย้าย/ขายได้ตอนพักระหว่างวัน")); return; }
      if (!sure) { sure = true; sl.querySelector('b').textContent = tr("💰 แตะอีกครั้งเพื่อขาย"); SFX.play('click'); return; }
      save.coins += sv; T.plats = T.plats.filter(q => q !== p); D.shooters.delete(s); SFX.play('coin'); toast(tr("ขายป้อมแล้ว +🪙{0}", sv)); persist(); closeSheet(); renderTdHud(); };
    if (D.phase === 'wave') mv.onclick = e => { e.stopPropagation(); toast(tr("ย้าย/ขายได้ตอนพักระหว่างวัน")); };
    mv.style.flex = sl.style.flex = '1'; row.appendChild(mv); row.appendChild(sl); body.appendChild(row);
    const head = document.createElement('div'); head.className = 'sinfo'; head.style.marginTop = '10px';
    head.textContent = tr("เปลี่ยนอาวุธ (เลเวลยังอยู่เหมือนเดิม)");
    body.appendChild(head);
    for (const w of WEAPONS) {
      if (w.id === p.w) continue;
      const better = WEAPONS.indexOf(w) > WEAPONS.indexOf(W0);
      body.appendChild(btn(`${w.icon} ${w.name}`, tr("ดาเมจ {0} • ยิง {1}/วิ{2}{3} • 🪙{4}", w.dmg, w.rate, w.splash ? tr(" • ระเบิด") : '', w.multi ? tr(" • 3 ดอก") : '', w.cost), save.coins >= w.cost, () => {
        save.coins -= w.cost; p.w = w.id; SFX.play(better ? 'gateGood' : 'click'); toast(tr("เปลี่ยนเป็น{0}!", w.name));
      }));
    }
  }
  $('sheet').classList.remove('hidden');
}
function openHouse() {
  sheetFor = 'house';
  const body = $('sheetBody'); body.innerHTML = '';
  $('sheetTitle').textContent = tr("🏠 บ้านเป็ด");
  const info = document.createElement('div'); info.className = 'sinfo';
  info.innerHTML = tr("🪙 <b>{0}</b> • เป็ดยิง {1} ตัว • วันถัดไป {2}", Math.floor(save.coins).toLocaleString(), T.plats.length, T.wave);
  body.appendChild(info);
  const fc = 50 * T.fence, bc = 60 * T.bomb;
  const lh = document.createElement('div'); lh.className = 'sinfo'; lh.innerHTML = tr("🦆 <b>เป็ดหัวหน้า</b> (แตะวงกลมซื้อของ เป็ดจะเดินไปจ่ายเอง ลากนิ้วก็ยังบังคับเดินได้ และฟาดแมวด้วยทัพพี)"); body.appendChild(lh);
  const la = 70 * T.lead.atk, ls = 60 * T.lead.spd, lm = 50 * T.lead.mag;
  body.appendChild(btn(tr("🥄 ทัพพี Lv.{0}{1}", T.lead.atk, T.lead.atk >= 5 ? tr(" → กระทะ") : ''), tr("ฟาดแรง {0} • 🪙{1}", leadDmg().toFixed(1), la), save.coins >= la, () => { save.coins -= la; T.lead.atk++; SFX.play('upgrade'); if (T.lead.atk === 5) toast(tr("ได้กระทะ! ฟาดแรงขึ้น 🍳")); }));
  body.appendChild(btn(tr("👟 วิ่งไว Lv.{0}", T.lead.spd), tr("ความเร็ว {0} • 🪙{1}", leadSpeed().toFixed(1), ls), save.coins >= ls, () => { save.coins -= ls; T.lead.spd++; SFX.play('upgrade'); }));
  const hh = document.createElement('div'); hh.className = 'sinfo'; hh.style.marginTop = '10px'; hh.textContent = tr("🏰 เมืองเป็ด"); body.appendChild(hh);
  body.appendChild(btn(tr("🥚 เสริมเกราะไข่ทองคำ Lv.{0}", T.house + 1), tr("ทน {0} → {1} • 🪙{2}", houseMax(), houseMax() + 12, 80 * T.house), save.coins >= 80 * T.house, () => { save.coins -= 80 * T.house; T.house++; SFX.play('upgrade'); D.houseHp = D.houseMax = houseMax(); }));
  { const wh = document.createElement('div'); wh.className = 'sinfo'; wh.textContent = tr("🧱 อัปเกรดกำแพง ประตูเมือง และกำแพงข้าง: แตะที่ตัวกำแพงได้เลย"); body.appendChild(wh); }
  body.appendChild(btn(tr("🐟 กับดักปลาทูระเบิด (มี {0})", T.traps), tr("ซื้อเพิ่ม 1 อัน • 🪙120"), save.coins >= 120, () => { save.coins -= 120; T.traps++; }));
  body.appendChild(btn(tr("🌶️ ระเบิดพริก Lv.{0}", T.bomb), tr("แรง {0} • 🪙{1}", bombDmg(), bc), save.coins >= bc, () => { save.coins -= bc; T.bomb++; SFX.play('upgrade'); }));
  const rp = document.createElement('button'); rp.className = 'sbtn'; rp.style.background = '#6d8fc9'; rp.style.boxShadow = '0 4px 0 #3f62a3';
  rp.innerHTML = tr("<b>🎬 ดูเรื่องราวตอนต้นอีกครั้ง</b>"); rp.onclick = () => { closeSheet(); playIntro(); }; body.appendChild(rp);
  const ver = document.createElement('div'); ver.className = 'sinfo'; ver.style.opacity = '.7'; ver.textContent = tr("เกม {0} • อัปเดตอัตโนมัติเมื่อมีแพตใหม่", gameVersion()); body.appendChild(ver);
  $('sheet').classList.remove('hidden');
}
function renderItemBar() {
  const bar = $('itemBar'); if (!bar || !D) return;
  const wave = D.phase === 'wave';
  const list = [
    { k: 'bomb', i: '🌶️', n: tr("พริก"), c: null, off: !wave || D.bombCd > 0, cd: wave ? Math.max(0, D.bombCd / 7) : 0 },
    { k: 'trap', i: '🐟', n: tr("ปลาทู"), c: T.traps, off: !wave || T.traps <= 0, on: D.trapMode },
    ...['bolt', 'top', 'ufo'].filter(k => (T.items[k] || 0) > 0).map(k => ({ k, i: ITEM_INFO[k].icon, n: ITEM_INFO[k].short, c: T.items[k], off: !wave || itemBusy(k) })),
  ];
  const key = list.map(x => [x.k, x.c, x.off, x.on, Math.round((x.cd || 0) * 10)].join(':')).join('|');
  if (bar.dataset.key === key) return; bar.dataset.key = key;
  bar.innerHTML = '';
  for (const it of list) {
    const b = document.createElement('button'); b.className = (it.off ? 'off' : '') + (it.on ? ' on' : '');
    b.innerHTML = `${it.cd ? `<span class="cd" style="transform:scaleY(${it.cd})"></span>` : ''}<i>${it.i}</i><small>${it.n}</small>${it.c !== null ? `<b>${it.c}</b>` : ''}`;
    b.onclick = e => {
      e.stopPropagation(); SFX.init();
      if (D.phase !== 'wave') { toast(tr("{0} {1}: ใช้ได้ตอนสู้", it.i, it.n)); return; }
      if (it.k === 'bomb') { toast(tr("🌶️ แตะที่พื้นตรงไหนก็ได้เพื่อปาระเบิดพริก")); return; }
      if (it.k === 'trap') { if (T.traps <= 0) { toast(tr("กับดักปลาทูหมดแล้ว ซื้อเพิ่มที่บ้าน 🏠")); return; } D.trapMode = !D.trapMode; SFX.play('click'); renderItemBar(); return; }
      useItem(it.k); renderItemBar();
    };
    bar.appendChild(b);
  }
}
function renderTdHud() {
  if (!D) return;
  renderItemBar();
  { const n = D.phase === 'victory' ? (D.vicStars || 0) : D.phase === 'wave' || D.phase === 'defeat' || D.phase === 'lost' ? waveStars() : (T.lastStars || 0), sp = $('starRow').children;
    for (let i = 0; i < 3; i++) { const on = i < n, el = sp[i]; if (el.classList.contains('off') === on) { el.classList.toggle('off', !on); el.classList.add('pop'); setTimeout(() => el.classList.remove('pop'), 260); } } }
  $('tdCoins').textContent = Math.floor(save.coins).toLocaleString();
  $('tdWave').textContent = T.wave;
  $('waveBtn').classList.toggle('hidden', D.phase !== 'build');
  for (const id of ['raidBtn', 'houseBtn', 'helpBtn']) { const el = $(id); if (el) el.style.visibility = D.phase === 'intro' ? 'hidden' : ''; }
  $('waveBtn').textContent = tr("▶ เริ่มวันที่ {0} {1}{2}", T.wave, WEATHERS[weatherOf(T.wave)].icon, T.wave % 5 === 0 ? ' 👑' : '');
}

// ---------- drawing ----------
function fitField() { if (W > 0 && H > 0) dk = Math.min(W / VIEW_W, H / 15); }
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
  drawGroundCracks();
  const list = [];
  for (const c of D.drops) list.push([c.y, () => drawDrop(c)]);
  for (const tr of D.traps || []) list.push([tr.y, () => drawTrap(tr)]);
  for (const tp of D.troops || []) list.push([tp.y, () => drawTroop(tp)]);
  for (let i = 0; i < CAMP_POS.length; i++) list.push([CAMP_POS[i].y, () => drawCamp(i)]);
  list.push([D.lead.y, drawLeader]);
  list.push([FENCE_Y, drawCityWall]);
  { const L = armLen(); if (L > 0) for (let y = FENCE_Y - L; y < FENCE_Y - 0.01; y += 0.6) { const y0 = y, y1 = Math.min(FENCE_Y, y + 0.6); list.push([y1 - 0.62, () => { drawArmChunk(-1, y0, y1); drawArmChunk(1, y0, y1); }]); }
    if (L > 0) list.push([FENCE_Y - L - 0.3, () => { drawArmEnd(-1); drawArmEnd(1); }]); }
  for (const lad of D.ladders) list.push([FENCE_Y - 0.5, () => drawLadder(lad)]);
  list.push([EGG_Y - 1.2, drawEggStand]);
  if (ready(IMG.shrine_serjoy) && ready(IMG.molt_altar) && !D.thief && D.phase !== 'defeat') {
    list.push([SERJOY_Y, drawSerjoy]);
  }
  for (let s = 0; s < SLOTS; s++) { const q = platPos(s); list.push([q.y, () => { const mv = D.moveFrom === s && platAt(s); drawPlatform(s); if (mv) ctx.restore(); }]); }
  for (const c of D.cats) list.push([c.y, () => drawCat(c)]);
  for (const tp of D.tops || []) list.push([tp.y, () => drawTopsOne(tp)]);
  list.sort((a, b) => a[0] - b[0]);
  for (const it of list) it[1]();
  for (const st of D.strikes || []) drawStrike(st);
  drawUfo();
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
  drawWeather(Math.min(0.05, (performance.now() - (WX.last || performance.now())) / 1000)); WX.last = performance.now();
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
// two rows of cartoon trees and bushes along the cat lane (painted into the cached background)
function drawLaneTrees(g, fy) {
  let seed = 98765; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const top = dinv(0, 0).y - 1.5, bottom = FENCE_Y - 0.9;
  // shade on the grass just inside the trees, so the lane reads as a path
  for (const sd of [-1, 1]) {
    const x0 = dproj(sd * (CAT_X + 0.9), 0).x, x1 = dproj(sd * (CAT_X - 0.4), 0).x;
    const sg = g.createLinearGradient(x0, 0, x1, 0); sg.addColorStop(0, 'rgba(30,70,20,.35)'); sg.addColorStop(1, 'rgba(30,70,20,0)');
    g.fillStyle = sg; g.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), fy - dk * 0.3);
  }
  const items = [];
  for (const sd of [-1, 1]) {
    for (let y = top; y < bottom; y += 1.15 + rnd() * 0.5) {
      const big = rnd() < 0.55;
      items.push({ x: sd * (CAT_X + (big ? 1.25 : 0.75) + rnd() * 0.35), y, r: big ? 0.95 + rnd() * 0.3 : 0.55 + rnd() * 0.2, tree: big, sd, c: rnd(), f: rnd() < 0.3 });
    }
    // fill the far edge of the screen too
    for (let y = top - 0.5; y < bottom; y += 1.4) items.push({ x: sd * (CAT_X + 2.4 + rnd() * 0.4), y, r: 1.1 + rnd() * 0.3, tree: true, sd, c: rnd(), f: false });
  }
  items.sort((a, b) => a.y - b.y);
  const OUT = '#2e4a1e';
  for (const it of items) {
    const p = dproj(it.x, it.y), R = it.r * dk;
    // blobs that make up the crown
    const blobs = [[0, -0.55, 0.62], [-0.5, -0.35, 0.5], [0.5, -0.38, 0.52], [-0.25, -0.95, 0.48], [0.28, -0.9, 0.46], [0, -0.2, 0.55]];
    const cy = p.y - (it.tree ? R * 0.75 : R * 0.15);
    // ground shadow
    g.fillStyle = 'rgba(20,50,10,.3)'; g.beginPath(); g.ellipse(p.x, p.y, R * 0.85, R * 0.3, 0, 0, Math.PI * 2); g.fill();
    if (it.tree) {   // trunk
      g.fillStyle = OUT; g.beginPath(); g.roundRect(p.x - R * 0.16, cy - R * 0.2, R * 0.32, p.y - cy + R * 0.2, R * 0.08); g.fill();
      g.fillStyle = '#8a5a32'; g.beginPath(); g.roundRect(p.x - R * 0.11, cy - R * 0.2, R * 0.22, p.y - cy + R * 0.14, R * 0.06); g.fill();
    }
    const base = ['#4f9a3a', '#5aa843', '#468f36'][Math.floor(it.c * 3)], light = '#86cc5e';
    g.fillStyle = OUT; for (const [bx, by, br] of blobs) { g.beginPath(); g.arc(p.x + bx * R, cy + by * R, br * R + 3, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = base; for (const [bx, by, br] of blobs) { g.beginPath(); g.arc(p.x + bx * R, cy + by * R, br * R, 0, Math.PI * 2); g.fill(); }
    // light from the top left, dark underside
    g.fillStyle = 'rgba(25,60,15,.28)'; g.beginPath(); g.ellipse(p.x, cy - R * 0.05, R * 0.85, R * 0.32, 0, 0, Math.PI); g.fill();
    g.fillStyle = light; for (const [bx, by, br] of blobs.slice(0, 5)) { g.beginPath(); g.arc(p.x + bx * R - br * R * 0.25, cy + by * R - br * R * 0.3, br * R * 0.45, 0, Math.PI * 2); g.fill(); }
    if (it.f) for (let i = 0; i < 4; i++) {   // a few fruit / flowers
      const a = rnd() * Math.PI * 2, d = rnd() * R * 0.6;
      g.fillStyle = it.c < 0.5 ? '#ff7a6a' : '#ffd84a'; g.strokeStyle = OUT; g.lineWidth = 1.5;
      g.beginPath(); g.arc(p.x + Math.cos(a) * d, cy - R * 0.5 + Math.sin(a) * d * 0.6, Math.max(2.5, R * 0.08), 0, Math.PI * 2); g.fill(); g.stroke();
    }
  }
}
// ---------- weather: every day looks a little different ----------
const WEATHERS = {
  sun:    { icon: '☀️', name: tr("แดดสดใส") },
  wind:   { icon: '🍃', name: tr("ลมแรง ใบไม้ปลิว") },
  rain:   { icon: '🌧️', name: tr("ฝนตก") },
  fog:    { icon: '🌫️', name: tr("หมอกลง") },
  sunset: { icon: '🌇', name: tr("ตอนเย็น") },
  night:  { icon: '🌙', name: tr("กลางคืน") },
  storm:  { icon: '⛈️', name: tr("พายุฟ้าคะนอง!") },
};
function weatherOf(day) {
  if (day <= 2) return 'sun';
  if (day % 5 === 0) return day % 10 === 0 ? 'storm' : 'night';   // boss days are dramatic
  const list = ['wind', 'rain', 'sunset', 'fog', 'sun', 'rain', 'wind', 'night', 'fog', 'sunset', 'sun', 'storm'];
  return list[(day - 3) % list.length];
}
const WX = { kind: null, drops: [], leaves: [], flies: [], splash: [], flash: 0, nextBolt: 4, t: 0 };
function drawWeather(dt) {
  const kind = weatherOf(T.wave);
  if (WX.kind !== kind) { WX.kind = kind; WX.drops = []; WX.leaves = []; WX.flies = []; WX.splash = []; }
  WX.t += dt;
  const fy = dproj(0, FENCE_Y).y;
  ctx.save();
  if (kind === 'sunset') {
    const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,120,60,.32)'); gr.addColorStop(0.6, 'rgba(255,170,90,.16)'); gr.addColorStop(1, 'rgba(255,190,120,.08)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  }
  if (kind === 'night' || kind === 'storm' || kind === 'rain') {
    // darken, but keep a warm pool of light around the duck house
    const dark = kind === 'night' ? 0.5 : kind === 'storm' ? 0.38 : 0.18;
    const hp = dproj(0, EGG_Y);
    const gr = ctx.createRadialGradient(hp.x, hp.y, dk * 1.5, hp.x, hp.y, Math.max(W, H) * 0.75);
    const col = kind === 'night' ? '15,20,70' : '30,40,70';
    gr.addColorStop(0, `rgba(${col},${dark * 0.35})`); gr.addColorStop(1, `rgba(${col},${dark})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  }
  if (kind === 'night') {
    while (WX.flies.length < 22) WX.flies.push({ x: Math.random() * W, y: Math.random() * H * 0.9, ph: Math.random() * 9, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 8 });
    ctx.globalCompositeOperation = 'lighter';
    for (const f of WX.flies) {
      f.x += (f.vx + Math.sin(WX.t + f.ph) * 10) * dt; f.y += (f.vy + Math.cos(WX.t * 0.8 + f.ph) * 8) * dt;
      if (f.x < -10) f.x = W + 10; if (f.x > W + 10) f.x = -10; if (f.y < -10) f.y = H; if (f.y > H) f.y = -10;
      const a = 0.4 + 0.6 * Math.max(0, Math.sin(WX.t * 2.5 + f.ph));
      const gr = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 9); gr.addColorStop(0, `rgba(230,255,140,${a})`); gr.addColorStop(1, 'rgba(230,255,140,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.x, f.y, 9, 0, Math.PI * 2); ctx.fill();
    }
    // a big round moon peeking at the top
    ctx.globalCompositeOperation = 'source-over';
    const mx = W * 0.8, my = 80;
    const mg = ctx.createRadialGradient(mx, my, 10, mx, my, 70); mg.addColorStop(0, 'rgba(255,250,210,.5)'); mg.addColorStop(1, 'rgba(255,250,210,0)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 70, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(mx, my, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(220,210,160,.7)'; ctx.beginPath(); ctx.arc(mx - 7, my - 5, 5, 0, Math.PI * 2); ctx.arc(mx + 8, my + 6, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  if (kind === 'rain' || kind === 'storm') {
    const n = kind === 'storm' ? 140 : 90, wind = kind === 'storm' ? 0.35 : 0.15;
    while (WX.drops.length < n) WX.drops.push({ x: Math.random() * W * 1.3 - W * 0.15, y: Math.random() * H, v: 700 + Math.random() * 300, l: 10 + Math.random() * 10, gy: Math.random() * H * 0.25 + H * 0.12 + Math.random() * H * 0.7 });
    ctx.strokeStyle = 'rgba(210,230,255,.55)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath();
    for (const d of WX.drops) {
      d.y += d.v * dt; d.x += d.v * wind * dt;
      if (d.y > d.gy) { if (WX.splash.length < 60) WX.splash.push({ x: d.x, y: d.gy, t: 0 }); d.y = -20 - Math.random() * 60; d.x = Math.random() * W * 1.3 - W * 0.2; d.gy = H * 0.12 + Math.random() * H * 0.85; }
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * wind, d.y - d.l);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220,235,255,.6)'; ctx.lineWidth = 1.2;
    WX.splash = WX.splash.filter(s2 => (s2.t += dt) < 0.25);
    for (const s2 of WX.splash) { const r = 2 + s2.t * 24; ctx.globalAlpha = 1 - s2.t / 0.25; ctx.beginPath(); ctx.ellipse(s2.x, s2.y, r, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (kind === 'storm') {
      WX.nextBolt -= dt;
      if (WX.nextBolt <= 0) { WX.nextBolt = 5 + Math.random() * 6; WX.flash = 0.35; WX.boltX = W * (0.15 + Math.random() * 0.7); if (window.SFX) try { SFX.play('thunder'); } catch (e) {} }
      if (WX.flash > 0) {
        WX.flash -= dt;
        const a = WX.flash > 0.25 ? 0.55 : WX.flash > 0.15 ? 0.1 : WX.flash > 0.08 ? 0.4 : 0.05;
        ctx.fillStyle = `rgba(235,240,255,${a})`; ctx.fillRect(0, 0, W, H);
        if (WX.flash > 0.15) {
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.shadowColor = '#bcd4ff'; ctx.shadowBlur = 14; ctx.beginPath();
          let x = WX.boltX, y = 0; ctx.moveTo(x, y);
          let sd = WX.boltX * 7; const r2 = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
          while (y < fy * 0.55) { x += (r2() - 0.5) * 40; y += 18 + r2() * 20; ctx.lineTo(x, y); }
          ctx.stroke(); ctx.shadowBlur = 0;
        }
      }
    }
  }
  if (kind === 'wind') {
    while (WX.leaves.length < 26) WX.leaves.push({ x: -20 - Math.random() * W, y: Math.random() * H * 0.95, v: 80 + Math.random() * 90, r: Math.random() * 6, s: 5 + Math.random() * 5, c: ['#7fc04e', '#a8d65a', '#e0b84a', '#d9844a'][Math.floor(Math.random() * 4)], ph: Math.random() * 9 });
    for (const l of WX.leaves) {
      l.x += l.v * dt; l.y += Math.sin(WX.t * 2 + l.ph) * 30 * dt + 12 * dt; l.r += dt * 4;
      if (l.x > W + 20) { l.x = -20; l.y = Math.random() * H * 0.95; }
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.r); ctx.scale(1, Math.abs(Math.sin(l.r * 0.7)) * 0.8 + 0.2);
      ctx.fillStyle = l.c; ctx.strokeStyle = '#2e4a1e'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, 0, l.s, l.s * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    // streaks of wind
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const y = (i * 0.19 + 0.08) * H, x = ((WX.t * 260 + i * 177) % (W + 300)) - 150;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 50, y - 10, x + 110, y); ctx.stroke(); }
  }
  if (kind === 'fog') {
    for (let i = 0; i < 4; i++) {
      const y = fy * (0.1 + i * 0.22), x = ((WX.t * (12 + i * 5) + i * 140) % (W + 400)) - 200;
      for (const xx of [x, x - W - 400]) {
        const gr = ctx.createRadialGradient(xx + 200, y, 10, xx + 200, y, 260); gr.addColorStop(0, 'rgba(245,248,250,.5)'); gr.addColorStop(1, 'rgba(245,248,250,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(xx + 200, y, 260, 90, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    const gr = ctx.createLinearGradient(0, 0, 0, fy); gr.addColorStop(0, 'rgba(240,244,248,.55)'); gr.addColorStop(1, 'rgba(240,244,248,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, fy);
  }
  ctx.restore();
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
    const s2 = W / iw, dw = iw * s2, dh = ih * s2, top = fy - E * dh;
    g.drawImage(bi, 0, top, dw, dh);
    // more lawn above: mirrored copies of the lawn part, so the hedges carry on seamlessly
    for (let y = top, k = 1; y > 0; k++) { const lh = E * dh; g.save(); g.translate(0, y); if (k % 2) g.scale(1, -1); else g.translate(0, -lh); g.drawImage(bi, 0, 0, iw, ih * E, 0, k % 2 ? 0 : 0, dw, lh); g.restore(); y -= lh; }
    // more floor below: mirrored copies of the tile part
    for (let y = top + dh, k = 1; y < H; k++) { const fh = (1 - E) * dh; g.save(); g.translate(0, y); if (k % 2) { g.translate(0, fh); g.scale(1, -1); } g.drawImage(bi, 0, ih * E, iw, ih * (1 - E), 0, 0, dw, fh); g.restore(); y += fh; }
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
  bgCache = { key, cv: cv2 };
  return cv2;
}
let houseTop = 0;
function drawHouse() {
  const p = dproj(0, HOUSE_Y - 0.6), s = dk * 0.6;
  if (ready(IMG.duckhouse)) {
    houseTop = p.y + s * 1.5 - drawAt(IMG.duckhouse, p.x, p.y + s * 1.5, s * 2.4);
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
    ctx.strokeText(tr("🔧 พาเป็ดมาซ่อม"), c.x, c.y - hgt * 0.4); ctx.fillStyle = '#ffe2a8'; ctx.fillText(tr("🔧 พาเป็ดมาซ่อม"), c.x, c.y - hgt * 0.4);
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
// a hat that matches the duck's weapon: [image, x (x frame width), y (x height, hat centre), size (x height), tilt]
const DUCK_HAT = {
  bow:    ['h_bow',    0.06, -0.9, 0.48, 0],
  xbow:   ['h_xbow',   0.08, -1.02, 0.40, 0.08],
  fire:   ['h_fire',   0.05, -0.97, 0.50, -0.1],
  ice:    ['h_ice',    0.04, -1.00, 0.48, 0.12],
  triple: ['h_triple', 0.06, -0.98, 0.46, 0],
  egg:    ['h_egg',    0.05, -0.95, 0.50, 0.12],
  coffee: ['h_coffee', 0.08, -0.93, 0.48, 0.1],
  storm:  ['h_storm',  0.06, -0.97, 0.46, 0.05],
  pan:    ['h_pan',    0.00, -0.94, 0.62, 0.1],
  cannon: ['h_cannon', 0.06, -0.95, 0.48, 0.08],
  stove:  ['h_stove',  0.08, -0.93, 0.52, 0.08],
  fish:   ['h_fish',   0.05, -1.03, 0.42, 0.15],
  melon:  ['h_melon',  0.06, -0.99, 0.42, 0.05],
  roller: ['h_roller', 0.06, -0.94, 0.56, 0],
};
function drawDuckHat(w, fw, h, tier) {
  const d = DUCK_HAT[w]; if (!d) return;
  const grow = 1 + tier * 0.06;   // a bit bigger and shinier at higher levels
  drawItem(d[0], fw * d[1], h * d[2] - (grow - 1) * h * d[3] * 0.3, h * d[3] * grow, d[4]);
  if (tier >= 2) {
    const t = performance.now() / 1000, a = t * 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + Math.sin(t * 6) * 0.3;
    ctx.fillStyle = tier >= 3 ? '#ffe680' : '#ffffff';
    const sx = fw * d[1] + Math.cos(a) * h * 0.22, sy = h * d[2] - h * 0.1 + Math.sin(a) * h * 0.05, r = h * 0.035;
    ctx.beginPath(); ctx.moveTo(sx, sy - r * 2); ctx.lineTo(sx + r * 0.6, sy); ctx.lineTo(sx, sy + r * 2); ctx.lineTo(sx - r * 0.6, sy); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
const DECK_ART = ['molt_deck_wood', 'molt_deck_bamboo', 'molt_deck_brick', 'molt_deck_gold'];
const DUCK_DEFENDER_ART = { xbow: 'duck_crossbow_art', fire: 'duck_chili_art', roller: 'duck_spoon_art' };
function drawPlatform(s) {
  const q = platPos(s), p = dproj(q.x, q.y), pl = platAt(s), k = dk;
  if (D.moveFrom === s) { ctx.save(); ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 120) * 0.3; }
  if (!pl) { if (D.phase !== 'wave') drawEmptySlot(s, p); return; }
  if (!pl) {
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, k * 0.6, k * 0.36, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = `900 ${Math.round(k * 0.55)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+', p.x, p.y); ctx.textBaseline = 'alphabetic';
    return;
  }
  // a round turret on the wall walkway; it gets sturdier with the level tier (wood -> stone -> iron -> gold)
  const ti = tierOf(pl.lvl), dh = k * (0.16 + ti * 0.05), rx = k * 0.5, ry = k * 0.2;
  const TUR = [['#b07a45', '#d29a5c', '#6a4220'], ['#a8a294', '#cfc9bb', '#55504a'], ['#7f8a99', '#aab4c2', '#3c444f'], ['#e2ac2a', '#ffd968', '#8a5a10']][ti];
  const deck = IMG[DECK_ART[ti]];
  let top = p.y - dh;
  if (ready(deck)) {
    const deckWidth = k * 1.04;
    const deckHeight = drawAt(deck, p.x, p.y + k * 0.18, deckWidth);
    top = p.y + k * 0.18 - deckHeight * (ti < 2 ? 0.57 : 0.7);
  } else {
    if (ti >= 1) {
      // banner pole behind the duck
      const px = p.x - rx * 0.75, fl = Math.sin(performance.now() / 260 + s) * 3;
      ctx.strokeStyle = '#4a3a2c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, top - k * 1.5); ctx.stroke();
      ctx.fillStyle = TIER_COL[ti]; ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, top - k * 1.48); ctx.quadraticCurveTo(px - k * 0.3, top - k * 1.36 + fl, px - k * 0.55, top - k * 1.3 + fl); ctx.lineTo(px - k * 0.4, top - k * 1.18 + fl); ctx.lineTo(px - k * 0.55, top - k * 1.06 + fl); ctx.quadraticCurveTo(px - k * 0.3, top - k * 1.12 + fl, px, top - k * 1.04); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(40,25,10,.3)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, rx * 1.08, ry * 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TUR[0]; ctx.strokeStyle = TUR[2]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x - rx, top); ctx.lineTo(p.x - rx, p.y); ctx.ellipse(p.x, p.y, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(p.x + rx, top); ctx.closePath(); ctx.fill(); ctx.stroke();
    // planks / stones / rivets on the drum
    ctx.strokeStyle = TUR[2]; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.2;
    for (let i = -2; i <= 2; i++) { const xx = p.x + i * rx * 0.38; ctx.beginPath(); ctx.moveTo(xx, top + ry * Math.sqrt(1 - Math.pow(i * 0.38, 2))); ctx.lineTo(xx, p.y + ry * Math.sqrt(1 - Math.pow(i * 0.38, 2))); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (ti === 2) { ctx.fillStyle = '#e8eef5'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(p.x + i * rx * 0.38, top + dh * 0.5 + ry * 0.9 * Math.sqrt(1 - Math.pow(i * 0.38, 2)), 1.8, 0, Math.PI * 2); ctx.fill(); } }
    ctx.fillStyle = TUR[1]; ctx.beginPath(); ctx.ellipse(p.x, top, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = TUR[2]; ctx.lineWidth = 2; ctx.stroke();
    if (ti === 3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + Math.sin(performance.now() / 300) * 0.15; ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.ellipse(p.x - rx * 0.3, top - ry * 0.2, rx * 0.35, ry * 0.35, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
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
  const dy = top + k * 0.1 - hop;
  // contact shadow so the duck stands on the deck instead of hovering over it
  { const sk = hop > 0 ? Math.max(0.4, 1 - hop / (k * 0.8)) : 1;
    ctx.fillStyle = 'rgba(40,25,10,.35)'; ctx.beginPath(); ctx.ellipse(p.x + (flip ? -1 : 1) * k * 0.04, top + k * 0.08, k * 0.3 * sk, k * 0.09 * sk, 0, 0, Math.PI * 2); ctx.fill(); }
  const defender = DUCK_DEFENDER_ART[pl.w];
  if (ready(IMG[defender])) {
    const progress = 1 - o.shootT / 0.45;
    const frame = o.stunT > 0 ? 2 : D.phase === 'victory' && D.cheered ? 3 :
      o.shootT <= 0 ? 0 : progress < 0.4 ? 1 : 2;
    ctx.save(); ctx.translate(p.x, dy); if (flip) ctx.scale(-1, 1);
    if (o.stunT > 0) cartoonRecoil(0.4 + 0.35 * Math.sin(o.stunT * 22), 0.9);
    else if (D.phase === 'victory' && D.cheered) cartoonStep(h, performance.now() / 75 + s, 1.15);
    else if (o.shootT > 0) cartoonStrike(h, progress, 0.58, 0.95);
    drawFrame(defender, frame, 0, 0, h);
    ctx.restore();
  } else if (ready(IMG.k_duck_act)) {
    // kitchen duck: wind up, throw, then idle; holds its weapon; dresses up with the platform tier
    const tr2 = tierOf(pl.lvl), fw = h * 0.75;
    ctx.save(); ctx.translate(p.x, dy); if (flip) ctx.scale(-1, 1);
    const TH = 0.45, u = o.shootT > 0 ? 1 - o.shootT / TH : -1;    // throw progress
    let held = true;
    if (o.stunT > 0) { drawFrame('k_duck_act', 2, 0, 0, h, false); ctx.font = `${Math.round(h * 0.3)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('💫', Math.cos(performance.now() / 150) * h * 0.2, -h * 1.05); }
    else if (D.phase === 'victory' && D.cheered) { const hp2 = Math.abs(Math.sin(performance.now() / 160 + s)) * h * 0.25; drawFrame('k_duck_act', 3, 0, -hp2, h, false); }
    else if (u >= 0) {
      // wind up (lean back, weapon behind the head) -> release (lunge forward) -> follow through
      const back = u < 0.4 ? u / 0.4 : 0;
      cartoonStrike(h, u, 0.58, 0.95);
      drawFrame('k_duck_act', u < 0.4 ? 0 : 1, 0, 0, h, false);
      if (tr2 >= 1) drawItem('it_apron', fw * 0.08, -h * 0.33, h * 0.4);
      drawDuckHat(pl.w, fw, h, tr2);
      if (u < 0.4) drawItem(HELD[pl.w], -fw * 0.25, -h * (0.85 + back * 0.2), h * 0.5, -1.2 - back * 0.8);
      else if (u < 0.75) { ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, -h * 0.65, h * 0.55, -2.2, -0.1); ctx.stroke(); }
      held = false;
    }
    else drawFrame('k_duck_walk', 1, 0, 0, h, false);
    if (held) {
      if (tr2 >= 1) drawItem('it_apron', fw * 0.08, -h * 0.33, h * 0.4);
      drawDuckHat(pl.w, fw, h, tr2);
      drawItem(HELD[pl.w], fw * 0.4, -h * 0.52, h * (pl.w === 'cannon' ? 0.5 : 0.48), 0.4);
    }
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
function drawGroundCracks() {
  if (!D.cracks) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const k of D.cracks) {
    const a = dproj(k.x1, k.y1), b = dproj(k.x2, k.y2), al = Math.min(1, (7 - k.t) / 1.5);
    const mx = (a.x + b.x) / 2 + (k.w - 1) * 6, my = (a.y + b.y) / 2;
    // raised soil lips either side, then the dark split
    ctx.globalAlpha = al * 0.55; ctx.strokeStyle = '#b8955e'; ctx.lineWidth = dk * 0.13 * k.w;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mx, my); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.globalAlpha = al; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = Math.max(1.5, dk * 0.05 * k.w);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mx, my); ctx.lineTo(b.x, b.y); ctx.stroke();
    // an occasional branching crack
    if (k.br) { ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + k.br * dk * 0.18, my + dk * 0.03); ctx.lineTo(mx + k.br * dk * 0.3, my - dk * 0.02); ctx.stroke(); }
  }
  for (const h of D.holes) {
    const p = dproj(h.x, h.y), al = Math.min(1, (6 - h.t) / 1.2), r = dk * 0.55 * Math.min(1, h.t * 8 + 0.4);
    ctx.globalAlpha = al;
    ctx.fillStyle = '#b8955e'; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.25, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1a0c'; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2 + 0.4, x0 = p.x + Math.cos(an) * r * 1.05, y0 = p.y + Math.sin(an) * r * 0.4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(an) * r * 0.45, y0 + Math.sin(an) * r * 0.2); ctx.lineTo(x0 + Math.cos(an + 0.3) * r * 0.7, y0 + Math.sin(an + 0.3) * r * 0.3); ctx.stroke(); }
    ctx.fillStyle = '#8a6a3a'; for (let i = 0; i < 5; i++) { const an = i * 1.3 + 0.2; ctx.beginPath(); ctx.ellipse(p.x + Math.cos(an) * r * 1.35, p.y + Math.sin(an) * r * 0.55, r * 0.16, r * 0.1, an, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}
function drawMound(c) {
  // the head of the tunnel: the ground bulges and splits where the cat is digging
  const p = dproj(c.x, c.y), t = performance.now() / 1000 + c.ph, s = dk * 0.6, bump = Math.abs(Math.sin(t * 12)) * s * 0.06;
  ctx.fillStyle = 'rgba(40,25,10,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, s * 0.6, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b8955e'; ctx.strokeStyle = '#5a3c1c'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(p.x, p.y - bump, s * 0.5, s * 0.26, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p.x - s * 0.35, p.y - s * 0.04 - bump); ctx.lineTo(p.x - s * 0.1, p.y - s * 0.16 - bump); ctx.lineTo(p.x + s * 0.06, p.y - s * 0.08 - bump); ctx.lineTo(p.x + s * 0.3, p.y - s * 0.18 - bump); ctx.stroke();
  ctx.fillStyle = '#8a6a3a'; for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * s * 0.4, p.y - s * 0.2 - Math.abs(Math.sin(a)) * s * 0.3, s * 0.06, 0, Math.PI * 2); ctx.fill(); }
}
function drawCat(c) {
  if (c.gone && c.hp <= 0) return;
  if (c.under) { drawMound(c); return; }
  if (c.drop && c.hp > 0) {
    const u = Math.min(1, c.drop.t / c.drop.dur), g = dproj(c.x, c.y), lift = (1 - u) * dk * 7, t = performance.now() / 1000, sw = Math.sin(t * 2 + c.ph) * 0.12, keep = c.drop;
    ctx.fillStyle = `rgba(0,0,0,${0.08 + u * 0.2})`; ctx.beginPath(); ctx.ellipse(g.x, g.y, dk * 0.3, dk * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(g.x, g.y - lift); ctx.rotate(sw);
    const cw = dk * 1.7, ch = dk * 0.85, cy0 = -dk * 2.05, n = 7, cols = c.ph % 2 > 1 ? ['#ff6b4a', '#fff3d6'] : ['#3fa8ff', '#fff3d6'];
    // suspension lines from the canopy edge to the harness
    ctx.strokeStyle = 'rgba(70,50,30,.75)'; ctx.lineWidth = 1;
    ctx.beginPath(); for (let i = 0; i <= n; i += 1) { const ex = -cw / 2 + cw * i / n; ctx.moveTo(ex, cy0 + ch * 0.12); ctx.lineTo((i / n - 0.5) * dk * 0.3, -dk * 0.8); } ctx.stroke();
    // gores (panels) with a scalloped hem
    for (let i = 0; i < n; i++) {
      const x0 = -cw / 2 + cw * i / n, x1 = -cw / 2 + cw * (i + 1) / n, xm = (x0 + x1) / 2;
      const top = x => cy0 - ch * Math.sqrt(Math.max(0, 1 - Math.pow(x / (cw / 2), 2)));
      ctx.beginPath(); ctx.moveTo(x0, cy0);
      for (let k = 0; k <= 6; k++) { const x = x0 + (x1 - x0) * k / 6; ctx.lineTo(x, top(x)); }
      ctx.lineTo(x1, cy0); ctx.quadraticCurveTo(xm, cy0 + ch * 0.22, x0, cy0); ctx.closePath();
      const gg = ctx.createLinearGradient(x0, 0, x1, 0); const cc = cols[i % 2];
      gg.addColorStop(0, cc); gg.addColorStop(1, i % 2 ? '#e2d4b4' : (cols[0] === '#ff6b4a' ? '#d8452a' : '#2a7ad0'));
      ctx.fillStyle = gg; ctx.fill(); ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 1.6; ctx.stroke();
    }
    // shine + vent
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(-cw * 0.2, cy0 - ch * 0.62, cw * 0.14, ch * 0.12, -0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2210'; ctx.beginPath(); ctx.ellipse(0, cy0 - ch * 0.98, cw * 0.05, ch * 0.04, 0, 0, Math.PI * 2); ctx.fill();
    // harness straps
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-dk * 0.15, -dk * 0.8); ctx.lineTo(-dk * 0.1, -dk * 0.45); ctx.moveTo(dk * 0.15, -dk * 0.8); ctx.lineTo(dk * 0.1, -dk * 0.45); ctx.stroke();
    ctx.translate(-g.x, -g.y); c.drop = null; drawCat(c); c.drop = keep; ctx.restore();
    return;
  }
  if (c.emerge > 0 && c.hp > 0) {
    const keep = c.emerge, u = 1 - keep / 0.7, g = dproj(c.x, c.y), hh = dk * 1.2;
    c.emerge = 0; ctx.save();
    ctx.beginPath(); ctx.rect(g.x - dk * 2, g.y - dk * 4, dk * 4, dk * 4 - (u < 0.85 ? 0 : 0) + 2); ctx.clip();
    ctx.translate(0, (1 - Math.min(1, u / 0.75)) * hh - Math.max(0, Math.sin(Math.max(0, u - 0.75) / 0.25 * Math.PI)) * dk * 0.25);
    drawCat(c); ctx.restore(); c.emerge = keep;
    // the near rim of the hole drawn over the cat's legs
    ctx.fillStyle = '#b8955e'; ctx.beginPath(); ctx.ellipse(g.x, g.y, dk * 0.68, dk * 0.27, 0, 0, Math.PI); ctx.fill();
    return;
  }
  if (c.abduct && c.hp > 0) {
    const A = c.abduct, u = Math.min(1, A.t / 1.0), g = dproj(c.x, c.y), keep = c.abduct; c.abduct = null;
    ctx.save(); ctx.translate(g.x, g.y - u * dk * 3.0); ctx.rotate(u * 7); ctx.scale(1 - u * 0.65, 1 - u * 0.65); ctx.translate(-g.x, -g.y); drawCat(c); ctx.restore();
    c.abduct = keep; return;
  }
  if (c.shockT > 0 && Math.floor(performance.now() / 70) % 2 === 0 && !c.boss && !c.lift && !c.launch) {
    const g = dproj(c.x, c.y), hh = dk * ((CAT_KINDS[c.kind] || CAT_KINDS.cat).size || 1.1);
    drawSkeletonCat(g.x, g.y, hh, performance.now() / 1000); return;
  }
  if (c.launch) {
    // spinning through the air in an arc, shadow stays on the grass
    const L = c.launch, u = Math.min(1, L.t / L.dur), g = dproj(c.x, c.y), arc = Math.sin(u * Math.PI) * dk * 3.2;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(g.x, g.y, dk * 0.25 * (1 - u * 0.3 + 0.3 * u), dk * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    const keep = c.launch; c.launch = null;
    ctx.save(); ctx.translate(g.x, g.y - arc - dk * 0.45); ctx.rotate(u * L.spin); ctx.translate(-g.x, -g.y + dk * 0.45); drawCat(c); ctx.restore();
    c.launch = keep; return;
  }
  if (c.lift) {
    const keep = c.lift; c.lift = 0;
    ctx.save(); ctx.translate(0, -keep * dk); drawCat(c); ctx.restore();
    c.lift = keep; return;
  }
  if (D.thief === c && c.hp > 0) { const g = dproj(c.x, c.y); { const eg = IMG.egg_gold, ew = dk * 0.7, eh = ready(eg) ? ew * eg.naturalHeight / eg.naturalWidth : ew; ctx.save(); ctx.translate(g.x, g.y - dk * 1.25 + Math.sin(performance.now() / 80) * 2); ctx.rotate(0.2 * Math.sin(performance.now() / 120)); if (ready(eg)) ctx.drawImage(eg, -ew / 2, -eh, ew, eh); else drawGoldenEgg(0, -eh / 2, dk * 0.75, 0); ctx.restore(); } }
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
  if (c.kind === 'ram') { drawRam(c, p, h); return; }
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
  const chiefArt = c.kind === 'chief' && ready(IMG.k_king_act) && (ready(IMG.chief_walk) || ready(IMG.k_king_walk));
  const KC = !c.boss && !chiefArt && !OLD_IMG[c.kind] && ready(IMG.k_cat_walk) && ready(IMG.k_cat_act);
  if (c.hp <= 0 && !KC) { ctx.save(); ctx.translate(x, p.y); ctx.rotate((flip ? -1 : 1) * Math.min(1.4, (c.deadT || 0) * 5)); x = 0; }
  const py = c.hp <= 0 && !KC ? 0 : p.y, atk = (c.fighting || c.st !== 'walk') && c.st !== 'flee' && c.st !== 'jump' && c.st !== 'climb' && c.hp > 0, k = (c.atk || 0) / 0.9;
  if (KC) {
    if (c.hp <= 0 && c.kind !== 'chief') ctx.globalAlpha = Math.max(0, 1 - Math.max(0, (c.deadT || 0) - 0.25) / 0.4);
    drawKitchenCat(c, x, py, h, atk, k, t);
  } else if (chiefArt) {
    const bh = h * 1.15;
    if (c.hp <= 0) {
      ctx.restore(); ctx.globalAlpha = 1;
      const dt2 = c.deadT || 0;
      if (dt2 < 1.3) {
        // knocked down: sits dizzy, wobbling, stars circling
        ctx.save(); ctx.translate(p.x, p.y); cartoonRecoil(Math.min(1, dt2 / 0.55), 1.2); drawFrame('k_king_act', 2, 0, 0, bh * 0.9, flip); ctx.restore();
      } else {
        // Limps away facing a stable direction.
        ctx.save(); ctx.translate(p.x, p.y - Math.abs(Math.sin(dt2 * 7)) * bh * 0.04); ctx.rotate(Math.sin(dt2 * 7) * 0.08);
        drawFrame('k_king_act', 3, 0, 0, bh * 0.95, flip); ctx.restore();
        ctx.font = `${Math.round(bh * 0.18)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('💦', p.x + bh * 0.28, p.y - bh * 0.85 + Math.sin(dt2 * 12) * 3);
      }
      ctx.font = `${Math.round(bh * 0.16)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('💫', p.x + Math.cos(dt2 * 5) * bh * 0.18, p.y - bh * 0.98);
      return;
    }
    if (atk) {
      const phase = k;
      ctx.save(); ctx.translate(x, py); if (flip) ctx.scale(-1, 1);
      cartoonStrike(bh, phase, 0.87, 0.95);
      drawFrame('k_king_act', phase < 0.87 ? 0 : 1, 0, 0, bh * 1.08);
      ctx.restore();
    } else {
      ctx.save(); ctx.translate(x, py);
      const gait = (c.walkDistance || 0) / 0.75;
      if (c.hitT > 0) cartoonRecoil(1 - c.hitT / 0.12);
      else cartoonStep(bh, gait * Math.PI * 2, 0.2);
      const sprite = ready(IMG.chief_walk) ? 'chief_walk' : 'k_king_walk';
      drawFrame(sprite, sprite === 'chief_walk' ? Math.floor(gait * 6) : 1, 0, 0, bh, flip);
      ctx.restore();
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
      drawFrame(back ? 'boss_walk_back' : 'boss_walk', Math.floor((c.walkDistance || 0) * 8) % 6, x, py, bh, back ? !flip : flip);
    }
    if (c.hitT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, py - bh * 0.5, bh * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  } else if (c.boss && ready(IMG.boss)) {
    ctx.save(); ctx.translate(x, py); ctx.rotate(atk ? Math.sin(k * Math.PI * 2) * 0.25 : Math.sin(t * 6) * 0.06);
    drawAt(IMG.boss, 0, 0, h * IMG.boss.naturalWidth / IMG.boss.naturalHeight); ctx.restore();
  } else if (OLD_IMG[c.kind] && ready(IMG[OLD_IMG[c.kind]])) {
    // redesigned front-walking cats: code-driven lunge for the attack
    const ci = OLD_IMG[c.kind], wf = Math.floor((c.walkDistance || 0) * 9) % 2;
    if (atk) {
      const wind = k < 0.5 ? k / 0.5 : 0, hit = k >= 0.5 && k < 0.75 ? 1 - Math.abs(k - 0.62) / 0.13 : 0;
      ctx.save(); ctx.translate(x, py + hit * h * 0.1); ctx.scale(1 + wind * 0.08 - hit * 0.05, 1 - wind * 0.1 + hit * 0.12);
      ctx.rotate((flip ? 1 : -1) * (wind * 0.12 - hit * 0.2));
      drawFrame(ci, k < 0.5 ? 1 : 2, 0, 0, h, flip); ctx.restore();
    } else if (c.st === 'flee') {
      ctx.save(); ctx.translate(x, py - Math.abs(Math.sin(t * 9)) * h * 0.06); ctx.scale(1, 0.95); drawFrame(ci, Math.floor(t * 14) % 4, 0, 0, h, !flip); ctx.restore();
    } else drawFrame(ci, wf, x, py - Math.abs(Math.sin(t * 7)) * h * 0.035, h, flip);
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
  const cart = c.recoil > 0 && ready(IMG.catapult_prop) ? IMG.catapult_prop : IMG.k_cart;
  if (ready(cart)) drawAt(cart, 0, 0, h * 1.25);
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
  else if (e.type === 'chili') drawItem('cat_chili_prop', q.x, yy, dk * 0.5, e.t * 10) || drawItem('it_chili', q.x, yy, dk * 0.5, e.t * 10);
  else if (e.type === 'skewer') drawItem('it_skewer', q.x, yy, dk * 0.55, e.t * 14);
  else { ctx.fillStyle = '#8f8a80'; ctx.beginPath(); ctx.arc(q.x, yy, dk * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#3a3630'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#b8b2a6'; ctx.beginPath(); ctx.arc(q.x - dk * 0.06, yy - dk * 0.06, dk * 0.07, 0, Math.PI * 2); ctx.fill(); }
}
function drawKitchenCat(c, x, py, h, atk, kk, t) {
  drawKitchenCatBody(c, x, py, h, atk, kk, t);
  if (c.kind === 'ladder' && c.hasLadder !== false && c.hp > 0) {
    // the ladder rides on its head, bouncing with each step
    const bob = Math.abs(Math.sin(t * 7)) * h * 0.04, len = h * 1.5;
    ctx.save(); ctx.translate(x, py - h * 1.0 - bob); ctx.rotate(c.st === 'plant' ? -0.9 : Math.sin(t * 7) * 0.05);
    drawLadderShape(-len / 2, 0, len / 2, 0, h * 0.28); ctx.restore();
  }
}
function drawKitchenCatBody(c, x, py, h, atk, kk, t) {
  const cb = c.kind === 'chief', G = c.gear || catGear(c.kind);
  // glider in the air: lift it up and open the colander parachute
  const jh = c.jh || 0;
  if (jh > 0) py -= jh * dk;
  const gait = (c.walkDistance || 0) / 0.75;
  // the kitchen cat sprites face RIGHT; cats on the right side walk left, so mirror those
  const flee = c.st === 'flee', flip = (c.mx || 0) < 0, w = h * 0.76, dead = c.hp <= 0;
  let img = 'k_cat_walk', fr = Math.floor(gait * 4) % 4, bob = c.st === 'walk' || flee ? Math.abs(Math.sin(gait * Math.PI * 2)) * h * 0.025 : 0;
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
  if (s.t < 0 && !s.rain) return;   // still in the duck's hand
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
  if (s.bomb) { drawItem('cat_bomb_prop', p.x, y, dk * 0.5, s.t * 14) || drawItem('it_chili', p.x, y, dk * 0.5, s.t * 14) || (ctx.fillStyle = '#d33', ctx.fillRect(p.x - 4, y - 4, 8, 8)); return; }
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
    drawItem(AMMO[s.w], p.x, y, dk * (s.w === 'cannon' ? 0.58 : 0.55) * (1 + tier * 0.12), spin);
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
var USE_FX_ART = false;   // painted effects kept on file but switched off
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
  // painted effects (switched off: the code-drawn ones read better)
  if (USE_FX_ART) {
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
function drawEmptySlot(s, p) {
  const k = dk, t = performance.now() / 1000, mv = D.moveFrom !== undefined && D.moveFrom !== null, pulse = 1 + Math.sin(t * 4 + s) * (mv ? 0.12 : 0.05);
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(pulse, pulse);
  ctx.fillStyle = mv ? 'rgba(255,220,90,.45)' : 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 0, k * 0.5, k * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = mv ? '#ffe680' : 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 10;
  ctx.beginPath(); ctx.ellipse(0, 0, k * 0.5, k * 0.2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.font = `900 ${Math.round(k * 0.5)}px Mitr,system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.strokeText('+', 0, -k * 0.32); ctx.fillStyle = '#fff'; ctx.fillText('+', 0, -k * 0.32);
  if (!mv) { ctx.font = `800 ${Math.round(Math.max(10, k * 0.24))}px Mitr,system-ui,sans-serif`; ctx.lineWidth = 3; const tx = `🪙${buildCost()}`; ctx.strokeText(tx, 0, k * 0.36); ctx.fillStyle = save.coins >= buildCost() ? '#ffe680' : '#fff'; ctx.fillText(tx, 0, k * 0.36); }
  ctx.textBaseline = 'alphabetic'; ctx.restore();
}
// ---------- side walls (the U) and the gatehouse ----------
// The same capstone and masonry lighting ties the front wall to the side wings.
function drawWallStone(x, y, w, h, light, dark) {
  const shade = ctx.createLinearGradient(0, y, 0, y + h);
  shade.addColorStop(0, light);
  shade.addColorStop(1, dark);
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
}
function drawArmChunk(side, y0, y1) {
  const C = WALL_TIERS[wallTierOf(T.fence)], cx = side * ARM_X, xa = dproj(cx - ARM_WD / 2, 0).x, xb = dproj(cx + ARM_WD / 2, 0).x;
  const ya = dproj(0, y0).y, yb = dproj(0, y1).y, MH = dk * C.mh * 0.8;
  // shadow cast onto the lane
  const sx = side < 0 ? xb : xa, sg = ctx.createLinearGradient(sx, 0, sx - side * dk * 0.6, 0); sg.addColorStop(0, 'rgba(30,40,20,.35)'); sg.addColorStop(1, 'rgba(30,40,20,0)');
  ctx.fillStyle = sg; ctx.fillRect(Math.min(sx, sx - side * dk * 0.6), ya, dk * 0.6, yb - ya + dk * 0.3);
  // outer side face peeking out, then the walkway
  ctx.fillStyle = C.face; ctx.fillRect(xa, ya + dk * 0.25, xb - xa, yb - ya);
  drawWallStone(xa, ya, xb - xa, yb - ya + 1, C.cap, C.top);
  ctx.fillStyle = C.cap;
  const coping = Math.max(1, dk * 0.045);
  ctx.fillRect(xa, ya, coping, yb - ya + 1);
  ctx.fillRect(xb - coping, ya, coping, yb - ya + 1);
  ctx.strokeStyle = C.out; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xa, yb); ctx.moveTo(xb, ya); ctx.lineTo(xb, yb); ctx.stroke();
  ctx.strokeStyle = 'rgba(120,100,70,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xa, (ya + yb) / 2); ctx.lineTo(xb, (ya + yb) / 2); ctx.stroke();
  // merlons along both edges
  for (const ex of [xa, xb]) for (let y = ya + dk * 0.12; y < yb; y += dk * 0.36) {
    const w = dk * 0.17, h = MH;
    ctx.fillStyle = C.merlon; ctx.strokeStyle = C.out; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(ex - w / 2, y - h, w, h + dk * 0.1, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.cap; ctx.fillRect(ex - w / 2 + 1.5, y - h + 1.5, w - 3, h * 0.25);
  }
}
function drawArmEnd(side) {
  // a round tower closing the far end of each side wall
  const C = WALL_TIERS[wallTierOf(T.fence)], p = dproj(side * ARM_X, FENCE_Y - armLen()), tw = dk * 0.95, top = p.y - dk * 1.0, bot = p.y + dk * 0.35;
  ctx.fillStyle = 'rgba(30,20,10,.3)'; ctx.beginPath(); ctx.ellipse(p.x, bot + 3, tw * 0.6, tw * 0.17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.face; ctx.strokeStyle = C.out; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p.x - tw / 2, top); ctx.lineTo(p.x - tw / 2, bot); ctx.ellipse(p.x, bot, tw / 2, tw * 0.15, 0, Math.PI, 0, true); ctx.lineTo(p.x + tw / 2, top); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(40,30,30,.3)'; ctx.lineWidth = 1; for (let k = 1; k < 4; k++) { const yy = top + (bot - top) * k / 4; ctx.beginPath(); ctx.moveTo(p.x - tw / 2, yy); ctx.lineTo(p.x + tw / 2, yy); ctx.stroke(); }
  ctx.fillStyle = C.top; ctx.beginPath(); ctx.ellipse(p.x, top, tw / 2, tw * 0.17, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = C.out; ctx.lineWidth = 2; ctx.stroke();
  for (let i = 0; i < 5; i++) { const a = Math.PI + i / 4 * Math.PI, mx = p.x + Math.cos(a) * tw * 0.42, my = top + Math.sin(a) * tw * 0.12; ctx.fillStyle = C.merlon; ctx.strokeStyle = C.out; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(mx - dk * 0.08, my - dk * 0.28, dk * 0.16, dk * 0.3, 2); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = C.banner || '#d8352a'; ctx.strokeStyle = C.out; ctx.lineWidth = 1.5; const t = performance.now() / 1000;
  ctx.beginPath(); ctx.moveTo(p.x, top - dk * 0.2); ctx.lineTo(p.x, top - dk * 1.0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p.x, top - dk * 1.0); ctx.lineTo(p.x - side * dk * 0.45, top - dk * 0.88 + Math.sin(t * 4 + side) * 3); ctx.lineTo(p.x, top - dk * 0.74); ctx.closePath(); ctx.fill(); ctx.stroke();
}
function drawThaiRoof(x, base, w, h, col, trim) {
  // stacked gable roof with upturned finials (cartoon Thai style)
  ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 2;
  for (let k = 0; k < 2; k++) {
    const ww = w * (1 - k * 0.3), yb = base - k * h * 0.45, yt = yb - h * 0.62;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - ww / 2, yb); ctx.quadraticCurveTo(x - ww * 0.2, yb - h * 0.2, x, yt); ctx.quadraticCurveTo(x + ww * 0.2, yb - h * 0.2, x + ww / 2, yb); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = trim; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - ww / 2, yb); ctx.quadraticCurveTo(x - ww * 0.2, yb - h * 0.2, x, yt); ctx.quadraticCurveTo(x + ww * 0.2, yb - h * 0.2, x + ww / 2, yb); ctx.stroke();
    ctx.fillStyle = trim; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sd * ww / 2, yb); ctx.quadraticCurveTo(x + sd * (ww / 2 + 6), yb - 2, x + sd * (ww / 2 + 7), yb - 9); ctx.lineTo(x + sd * (ww / 2 + 3), yb - 2); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 2;
  }
  ctx.fillStyle = trim; ctx.beginPath(); ctx.moveTo(x, base - h * 1.07); ctx.quadraticCurveTo(x + 5, base - h * 1.25, x + 2, base - h * 1.4); ctx.lineTo(x - 1, base - h * 1.07); ctx.fill();
}
function drawGatehouse() {
  const g = D.walls[GATE], lv = T.gatehouse || 0;
  if (!g || lv <= 0 || g.hp <= 0) return;
  const C = WALL_TIERS[wallTierOf(T.fence)], yo = dproj(0, FENCE_Y).y, yi = dproj(0, WALL_IN).y, FH = dk * 0.8, cx = dproj(g.x, 0).x;
  const col = ['#9a6232', '#a9a8a2', '#f2e6c8'][lv - 1], roof = ['#8a4a20', '#c8463a', '#f2b318'][lv - 1], trim = lv >= 3 ? '#fff3b0' : '#f2c440';
  const tw = dk * 0.56, top = yo - dk * (0.8 + lv * 0.16), bot = yi + FH;
  for (const sd of [-1, 1]) {
    const x = cx + sd * dk * 0.82;
    ctx.fillStyle = 'rgba(30,20,10,.25)'; ctx.fillRect(x - tw / 2 + 3, bot - 2, tw, 5);
    ctx.fillStyle = col; ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(x - tw / 2, top, tw, bot - top); ctx.fill(); ctx.stroke();
    if (lv === 1) { ctx.strokeStyle = 'rgba(58,34,16,.5)'; ctx.lineWidth = 1; for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - tw / 2 + tw * k / 3, top); ctx.lineTo(x - tw / 2 + tw * k / 3, bot); ctx.stroke(); } }
    else { ctx.strokeStyle = 'rgba(40,30,30,.3)'; ctx.lineWidth = 1; for (let k = 1; k < 6; k++) { const yy = top + (bot - top) * k / 6; ctx.beginPath(); ctx.moveTo(x - tw / 2, yy); ctx.lineTo(x + tw / 2, yy); ctx.stroke(); } }
    ctx.fillStyle = '#2a2230'; ctx.beginPath(); ctx.roundRect(x - tw * 0.15, top + (bot - top) * 0.22, tw * 0.3, (bot - top) * 0.2, tw * 0.15); ctx.fill();
    if (lv >= 3) { ctx.fillStyle = '#f2c440'; ctx.fillRect(x - tw / 2, top, tw, 4); ctx.fillRect(x - tw / 2, bot - 6, tw, 4); }
    drawThaiRoof(x, top + 2, tw * 1.7, dk * 0.6, roof, trim);
  }
  // lintel with a golden egg emblem across the gate
  const ly = yi + FH * 0.02;
  ctx.fillStyle = roof; ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(cx - dk * 0.62, ly - dk * 0.12, dk * 1.24, dk * 0.2, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(cx, ly - dk * 0.02, dk * 0.09, dk * 0.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#7a4a08'; ctx.lineWidth = 1.5; ctx.stroke();
}
// ---------- city wall, gate, ladders, golden egg, battering ram, seesaw ----------
const WALL_COL = { face: '#c4b193', faceDark: '#a8957a', top: '#e6d8bb', merlon: '#d8c7a6', cap: '#efe3c8', out: '#4a3a2c' };
// the wall changes look as it is upgraded: sandstone -> grey stone with banners -> granite with towers -> white marble and gold
const WALL_TIERS = [
  { name: tr("กำแพงดินเผา"), face: '#c4b193', top: '#e6d8bb', merlon: '#d8c7a6', cap: '#efe3c8', out: '#4a3a2c', mh: 0.42 },
  { name: tr("กำแพงหิน + ธง"), face: '#a9a8a2', top: '#d6d4cc', merlon: '#bdbbb3', cap: '#dedcd4', out: '#3a3a40', mh: 0.48, banner: '#d8352a' },
  { name: tr("ป้อมหินมีหอคอย"), face: '#8b93a3', top: '#c3c8d2', merlon: '#a3aab8', cap: '#d0d5de', out: '#2a2e3a', mh: 0.52, banner: '#2f6fd6', towers: '#c8463a' },
  { name: tr("กำแพงหินอ่อนทองคำ"), face: '#ece6da', top: '#fbf7ee', merlon: '#f4eee2', cap: '#f2c440', out: '#7a5a1a', mh: 0.56, banner: '#7a3ad6', towers: '#f2b318', gold: true },
];
const WALL_LOOK_AT = [3, 6, 9];
function wallTierOf(lv) { return lv >= 9 ? 3 : lv >= 6 ? 2 : lv >= 3 ? 1 : 0; }
function wallSegment(x0, x1, w) {
  const C = WALL_TIERS[wallTierOf(T.fence)], yo = dproj(0, FENCE_Y).y, yi = dproj(0, WALL_IN).y, FH = dk * 0.8, MH = dk * C.mh;
  const ratio = w ? w.hp / w.max : 1, sh = w && w.hit > 0 ? Math.sin(w.hit * 90) * 3 : 0;
  x0 += sh; x1 += sh;
  let seed = (w ? w.i * 97 : Math.round(x0)) + 13; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  if (w && w.hp <= 0 && w.gate) { wallSegment(x0, x1, null); drawBrokenGate((x0 + x1) / 2, yi, FH); return; }
  if (w && w.hp <= 0) {
    // rubble: a low pile of stones the cats can walk over
    ctx.fillStyle = 'rgba(40,30,20,.25)'; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, yi + FH * 0.6, (x1 - x0) * 0.55, dk * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 16; i++) {
      const rx = x0 + rnd() * (x1 - x0), ry = yo + rnd() * (yi - yo + FH * 0.6), r = dk * (0.12 + rnd() * 0.16);
      ctx.fillStyle = rnd() < 0.5 ? C.face : C.merlon; ctx.strokeStyle = C.out; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(rx, ry, r, r * 0.7, rnd() * 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    if (w.gate) for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate((x0 + x1) / 2 + (i - 1.5) * dk * 0.3, yi + FH * 0.4); ctx.rotate((rnd() - 0.5) * 1.6); ctx.fillStyle = '#9a6232'; ctx.strokeStyle = C.out; ctx.lineWidth = 1.5; ctx.fillRect(-dk * 0.08, -dk * 0.35, dk * 0.16, dk * 0.7); ctx.strokeRect(-dk * 0.08, -dk * 0.35, dk * 0.16, dk * 0.7); ctx.restore(); }
    return;
  }
  // shadow on the floor in front of the wall
  const sg = ctx.createLinearGradient(0, yi + FH, 0, yi + FH + dk * 0.5); sg.addColorStop(0, 'rgba(50,35,20,.35)'); sg.addColorStop(1, 'rgba(50,35,20,0)');
  ctx.fillStyle = sg; ctx.fillRect(x0, yi + FH, x1 - x0, dk * 0.5);
  // Staggered beveled masonry with continuous mortar at the section joints.
  ctx.fillStyle = C.out; ctx.fillRect(x0, yi, x1 - x0, FH);
  const rows = 3, bw = dk * 0.47, course = FH / rows, mortar = Math.max(0.6, dk * 0.022);
  for (let row = 0; row < rows; row++) {
    const y = yi + row * course + mortar / 2;
    for (let x = x0 - (row % 2) * bw / 2; x < x1; x += bw) {
      const left = Math.max(x + mortar / 2, x0 + mortar / 2);
      const width = Math.min(x + bw - mortar / 2, x1 - mortar / 2) - left;
      if (width <= 0) continue;
      ctx.fillStyle = rnd() < 0.25 ? C.merlon : C.face;
      ctx.fillRect(left, y, width, course - mortar);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = C.cap;
      ctx.fillRect(left, y, width, mortar);
      ctx.globalAlpha = 1;
    }
  }
  ctx.save();
  ctx.globalAlpha = 0.24;
  drawWallStone(x0, yi, x1 - x0, FH, C.cap, C.out);
  ctx.restore();
  // walkway on top
  drawWallStone(x0, yo, x1 - x0, yi - yo, C.cap, C.top);
  ctx.strokeStyle = 'rgba(120,100,70,.3)'; ctx.lineWidth = 1;
  for (let x = x0 + dk * 0.55; x < x1; x += dk * 0.55) { ctx.beginPath(); ctx.moveTo(x, yo); ctx.lineTo(x - dk * 0.08, yi); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x0, (yo + yi) / 2); ctx.lineTo(x1, (yo + yi) / 2); ctx.stroke();
  // lip along the inner edge
  ctx.fillStyle = C.gold ? '#f2c440' : C.merlon; ctx.fillRect(x0, yi - 3, x1 - x0, 6); ctx.strokeStyle = C.out; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, yi + 3); ctx.lineTo(x1, yi + 3); ctx.stroke();
  if (C.gold) { ctx.fillStyle = '#f2c440'; ctx.fillRect(x0, yi + FH - 5, x1 - x0, 4); }
  // gate: arched wooden door in the inner face
  if (w && w.gate) {
    const cx = (x0 + x1) / 2, gw = dk * 0.95, gb = yi + FH, gt = yi + FH * 0.05;
    ctx.fillStyle = '#5a4030'; ctx.beginPath(); ctx.moveTo(cx - gw / 2 - 4, gb); ctx.lineTo(cx - gw / 2 - 4, gt + gw * 0.45); ctx.arc(cx, gt + gw * 0.45 + 2, gw / 2 + 4, Math.PI, 0); ctx.lineTo(cx + gw / 2 + 4, gb); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx - gw / 2, gb); ctx.lineTo(cx - gw / 2, gt + gw * 0.5); ctx.arc(cx, gt + gw * 0.5, gw / 2, Math.PI, 0); ctx.lineTo(cx + gw / 2, gb); ctx.closePath(); ctx.clip();
    drawWallStone(cx - gw / 2, gt, gw, gb - gt, ratio > 0.4 ? '#d99a55' : '#ad7542', '#684323');
    ctx.strokeStyle = '#5a3416'; ctx.lineWidth = 1.5; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - gw / 2 + gw * i / 4, gt); ctx.lineTo(cx - gw / 2 + gw * i / 4, gb); ctx.stroke(); }
    for (const f of [0.35, 0.75]) {
      const y = gt + (gb - gt) * f;
      const band = Math.max(2, dk * 0.075);
      drawWallStone(cx - gw / 2, y, gw, band, '#9ba7b3', '#424959');
      ctx.fillStyle = '#c9a773';
      for (const pin of [-0.32, 0.32]) {
        ctx.beginPath(); ctx.arc(cx + gw * pin, y + band / 2, Math.max(0.7, band * 0.23), 0, Math.PI * 2); ctx.fill();
      }
    }
    if (ratio < 0.6) { ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - gw * 0.1, gt + 6); ctx.lineTo(cx + gw * 0.08, gt + (gb - gt) * 0.4); ctx.lineTo(cx - gw * 0.05, gt + (gb - gt) * 0.7); if (ratio < 0.3) { ctx.moveTo(cx + gw * 0.3, gt + 10); ctx.lineTo(cx + gw * 0.15, gb - 6); } ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = C.out; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - gw / 2, gb); ctx.lineTo(cx - gw / 2, gt + gw * 0.5); ctx.arc(cx, gt + gw * 0.5, gw / 2, Math.PI, 0); ctx.lineTo(cx + gw / 2, gb); ctx.stroke();
    ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(cx + gw * 0.25, gt + (gb - gt) * 0.6, 3, 0, Math.PI * 2); ctx.fill();
  }
  // cracks as the wall gets hurt
  if (ratio < 0.7) {
    ctx.strokeStyle = 'rgba(40,25,15,.75)'; ctx.lineWidth = 1.8; const n = ratio < 0.35 ? 4 : 2;
    for (let i = 0; i < n; i++) { let x = x0 + (0.15 + rnd() * 0.7) * (x1 - x0), y = yi + 2; if (w && w.gate && Math.abs(x - (x0 + x1) / 2) < dk * 0.6) x += dk * 0.7 * (x > (x0 + x1) / 2 ? 1 : -1); ctx.beginPath(); ctx.moveTo(x, y); for (let k2 = 0; k2 < 4; k2++) { x += (rnd() - 0.5) * dk * 0.25; y += FH * 0.22; ctx.lineTo(x, y); } ctx.stroke(); }
  }
  // outer parapet with merlons (the cats are on the other side of these)
  ctx.fillStyle = C.merlon; ctx.strokeStyle = C.out; ctx.lineWidth = 2;
  ctx.fillRect(x0, yo - dk * 0.14, x1 - x0, dk * 0.2); ctx.beginPath(); ctx.moveTo(x0, yo + dk * 0.06); ctx.lineTo(x1, yo + dk * 0.06); ctx.stroke();
  const sp = dk * 0.62, n = Math.max(1, Math.round((x1 - x0) / sp)), step = (x1 - x0) / n, mw = step * 0.58;
  for (let i = 0; i < n; i++) {
    if (ratio < 0.35 && i % 2 === 1) continue;     // broken teeth
    const mx = x0 + step * (i + 0.5) - mw / 2, mt = yo - dk * 0.14 - MH;
    ctx.fillStyle = C.merlon; ctx.beginPath(); ctx.roundRect(mx, mt, mw, MH + 2, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.cap; ctx.fillRect(mx + 2, mt + 2, mw - 4, MH * 0.22);
  }
  if (w && w.gate && w.hp > 0 && w.hp < w.max && D.phase === 'wave') { ctx.font = `${Math.round(dk * 0.32)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('🔧', (x0 + x1) / 2 + dk * 0.55, yi + FH * 0.55); }
  if (w && w.hp < w.max) {
    const cx = (x0 + x1) / 2, by = yi + FH - 9;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(cx - 20, by, 40, 5);
    ctx.fillStyle = ratio > 0.5 ? '#7dde5a' : ratio > 0.25 ? '#ffb347' : '#ff5a4a'; ctx.fillRect(cx - 20, by, 40 * ratio, 5);
  }
}
function drawBrokenGate(cx, yi, FH) {
  const gw = dk * 0.95, gb = yi + FH, gt = yi + FH * 0.05, t = performance.now() / 1000;
  // dark empty archway
  ctx.fillStyle = '#5a4030'; ctx.beginPath(); ctx.moveTo(cx - gw / 2 - 4, gb); ctx.lineTo(cx - gw / 2 - 4, gt + gw * 0.45); ctx.arc(cx, gt + gw * 0.45 + 2, gw / 2 + 4, Math.PI, 0); ctx.lineTo(cx + gw / 2 + 4, gb); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#20160e'; ctx.beginPath(); ctx.moveTo(cx - gw / 2, gb); ctx.lineTo(cx - gw / 2, gt + gw * 0.5); ctx.arc(cx, gt + gw * 0.5, gw / 2, Math.PI, 0); ctx.lineTo(cx + gw / 2, gb); ctx.closePath(); ctx.fill();
  // one door leaf hanging off its hinge, the other lying smashed
  ctx.save(); ctx.translate(cx - gw / 2, gt + gw * 0.35); ctx.rotate(0.55 + Math.sin(t * 2) * 0.03);
  ctx.fillStyle = '#8a5428'; ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 2; ctx.fillRect(0, 0, gw * 0.45, FH * 0.8); ctx.strokeRect(0, 0, gw * 0.45, FH * 0.8);
  ctx.strokeStyle = 'rgba(58,34,16,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gw * 0.22, 0); ctx.lineTo(gw * 0.22, FH * 0.8); ctx.stroke();
  ctx.fillStyle = '#5c5f69'; ctx.fillRect(0, FH * 0.2, gw * 0.45, 4); ctx.fillRect(0, FH * 0.6, gw * 0.45, 4);
  ctx.fillStyle = '#20160e'; ctx.beginPath(); ctx.moveTo(gw * 0.45, FH * 0.5); ctx.lineTo(gw * 0.3, FH * 0.62); ctx.lineTo(gw * 0.45, FH * 0.72); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(cx + gw * 0.3, gb + 2); ctx.rotate(-0.18);
  ctx.fillStyle = '#8a5428'; ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 2; ctx.fillRect(-gw * 0.3, -FH * 0.16, gw * 0.62, FH * 0.2); ctx.strokeRect(-gw * 0.3, -FH * 0.16, gw * 0.62, FH * 0.2); ctx.restore();
  // splinters
  ctx.strokeStyle = '#c8904a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const [dx, dy, a] of [[-0.55, 0.05, 0.6], [0.6, 0.12, -0.9], [-0.15, 0.2, 1.4], [0.15, 0.08, 0.3]]) { ctx.beginPath(); ctx.moveTo(cx + dx * gw, gb + dy * dk); ctx.lineTo(cx + dx * gw + Math.cos(a) * dk * 0.18, gb + dy * dk + Math.sin(a) * dk * 0.08); ctx.stroke(); }
  // crack marks around the arch
  ctx.strokeStyle = 'rgba(30,20,10,.75)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - gw * 0.6, gt + 4); ctx.lineTo(cx - gw * 0.75, gt + FH * 0.25); ctx.lineTo(cx - gw * 0.68, gt + FH * 0.45); ctx.moveTo(cx + gw * 0.55, gt + 6); ctx.lineTo(cx + gw * 0.72, gt + FH * 0.3); ctx.stroke();
}
function drawCityWall() {
  const l = dproj(wallX(0) - WALL_W / 2, 0).x, r = dproj(wallX(NWALL - 1) + WALL_W / 2, 0).x;
  if (l > 0) wallSegment(-4, l, null);
  if (r < W) wallSegment(r, W + 4, null);
  for (const w of D.walls) wallSegment(dproj(w.x - WALL_W / 2, 0).x, dproj(w.x + WALL_W / 2, 0).x, w);
  drawGatehouse();
  const C = WALL_TIERS[wallTierOf(T.fence)], yo = dproj(0, FENCE_Y).y, yi = dproj(0, WALL_IN).y, FH = dk * 0.8, t = performance.now() / 1000;
  if (C.banner) for (const w of D.walls) {
    if (w.gate || w.hp <= 0) continue;
    for (const f of [-0.28, 0.28]) {
      const x = dproj(w.x + f * WALL_W, 0).x, bw = dk * 0.32, bh = FH * 0.78, sway = Math.sin(t * 2 + w.i + f * 5) * 2;
      ctx.fillStyle = C.banner; ctx.strokeStyle = C.out; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - bw / 2, yi + 3); ctx.lineTo(x + bw / 2, yi + 3); ctx.lineTo(x + bw / 2 + sway, yi + bh); ctx.lineTo(x + sway, yi + bh - bw * 0.35); ctx.lineTo(x - bw / 2 + sway, yi + bh); ctx.closePath(); ctx.fill(); ctx.stroke();
      // a little golden egg emblem
      ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(x + sway * 0.5, yi + bh * 0.42, bw * 0.17, bw * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#7a4a08'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = C.gold ? '#f2c440' : '#5a4030'; ctx.fillRect(x - bw / 2 - 2, yi + 1, bw + 4, 4);
    }
  }
  if (C.towers) for (let i = 0; i <= NWALL; i++) {
    // round towers at the joints between segments (and both ends)
    const x = dproj(wallX(0) - WALL_W / 2 + i * WALL_W, 0).x, tw = dk * 0.46, top = yo - dk * C.mh - dk * 0.12, bot = yi + FH;
    ctx.fillStyle = 'rgba(30,20,10,.25)'; ctx.beginPath(); ctx.ellipse(x, bot + 3, tw * 0.65, tw * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.face; ctx.strokeStyle = C.out; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - tw / 2, top); ctx.lineTo(x - tw / 2, bot); ctx.ellipse(x, bot, tw / 2, tw * 0.15, 0, Math.PI, 0, true); ctx.lineTo(x + tw / 2, top); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,30,30,.3)'; ctx.lineWidth = 1; for (let k = 1; k < 5; k++) { const yy = top + (bot - top) * k / 5; ctx.beginPath(); ctx.moveTo(x - tw / 2, yy); ctx.lineTo(x + tw / 2, yy); ctx.stroke(); }
    ctx.fillStyle = '#2a2230'; ctx.beginPath(); ctx.roundRect(x - tw * 0.1, top + (bot - top) * 0.3, tw * 0.2, (bot - top) * 0.22, tw * 0.1); ctx.fill();
    // cone roof + pennant
    ctx.fillStyle = C.towers; ctx.strokeStyle = C.out; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - tw * 0.62, top + 2); ctx.lineTo(x, top - tw * 1.05); ctx.lineTo(x + tw * 0.62, top + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, top + 2, tw * 0.62, tw * 0.14, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.out; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, top - tw * 1.05); ctx.lineTo(x, top - tw * 1.45); ctx.stroke();
    ctx.fillStyle = C.banner || '#d8352a'; ctx.beginPath(); ctx.moveTo(x, top - tw * 1.45); ctx.lineTo(x + tw * 0.4, top - tw * 1.36 + Math.sin(t * 4 + i) * 2); ctx.lineTo(x, top - tw * 1.27); ctx.closePath(); ctx.fill();
  }
}
function drawLadderShape(x0, y0, x1, y1, wd) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len * wd / 2, ny = dx / len * wd / 2;
  const n = Math.max(3, Math.round(len / (wd * 0.85)));
  ctx.lineCap = 'round';
  for (const [col, lw] of [['#5a3a1a', Math.max(4, wd * 0.28)], ['#d39a52', Math.max(2, wd * 0.16)]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw * 0.8; ctx.beginPath();
    for (let i = 1; i < n; i++) { const k = i / n; ctx.moveTo(x0 + dx * k + nx, y0 + dy * k + ny); ctx.lineTo(x0 + dx * k - nx, y0 + dy * k - ny); }
    ctx.stroke();
    ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0 + nx, y0 + ny); ctx.lineTo(x1 + nx, y1 + ny); ctx.moveTo(x0 - nx, y0 - ny); ctx.lineTo(x1 - nx, y1 - ny); ctx.stroke();
  }
}
function drawLadder(lad) {
  const b = dproj(lad.x, FENCE_Y - 0.75), topY = dproj(0, FENCE_Y).y - dk * 1.75;
  let tx = b.x, ty = topY;
  if (lad.down) { const u = Math.min(1, lad.fallT / 0.5); tx = b.x + u * dk * 0.6; ty = topY + (b.y - dk * 1.2 - topY) * u - Math.sin(u * Math.PI) * dk * 0.2; ctx.globalAlpha = 1 - Math.max(0, (lad.fallT - 0.5) / 0.2); }
  const wob = lad.push > 0 ? Math.sin(performance.now() / 30) * lad.push * 12 : 0;
  drawLadderShape(b.x, b.y, tx + wob, ty, dk * 0.42);
  ctx.globalAlpha = 1;
  if (!lad.down && lad.push > 0) { ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(tx, ty - 10, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, lad.push / 0.35)); ctx.stroke(); }
}
function eggPath(w, h) {
  // a proper egg: narrower on top, round and heavy at the bottom
  ctx.beginPath(); ctx.moveTo(0, -h);
  ctx.bezierCurveTo(w * 0.62, -h, w, -h * 0.25, w, h * 0.2);
  ctx.bezierCurveTo(w, h * 0.72, w * 0.55, h, 0, h);
  ctx.bezierCurveTo(-w * 0.55, h, -w, h * 0.72, -w, h * 0.2);
  ctx.bezierCurveTo(-w, -h * 0.25, -w * 0.62, -h, 0, -h); ctx.closePath();
}
function drawGoldenEgg(x, y, size, rot) {
  const w = size * 0.36, h = size * 0.48, t = performance.now() / 1000;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
  // body: warm gold, darker towards the bottom right
  const g = ctx.createRadialGradient(-w * 0.35, -h * 0.4, size * 0.02, w * 0.1, h * 0.1, size * 0.62);
  g.addColorStop(0, '#fffef0'); g.addColorStop(0.18, '#ffe98a'); g.addColorStop(0.5, '#ffc928'); g.addColorStop(0.85, '#e09412'); g.addColorStop(1, '#a8630a');
  eggPath(w, h); ctx.fillStyle = g; ctx.fill();
  // reflected light along the bottom edge
  ctx.save(); eggPath(w, h); ctx.clip();
  const rl = ctx.createLinearGradient(0, h * 0.4, 0, h); rl.addColorStop(0, 'rgba(255,240,170,0)'); rl.addColorStop(1, 'rgba(255,240,170,.55)');
  ctx.fillStyle = rl; ctx.fillRect(-w, h * 0.4, w * 2, h * 0.6);
  // a shine band that sweeps across every few seconds
  const sx = ((t * 0.45) % 1.6 - 0.3) * w * 2.6 - w * 1.3;
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,230,.45)';
  ctx.beginPath(); ctx.moveTo(sx, -h); ctx.lineTo(sx + w * 0.35, -h); ctx.lineTo(sx - w * 0.15, h); ctx.lineTo(sx - w * 0.5, h); ctx.closePath(); ctx.fill();
  ctx.restore();
  eggPath(w, h); ctx.strokeStyle = '#6e3f06'; ctx.lineWidth = Math.max(2, size * 0.035); ctx.stroke();
  // highlight
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(-w * 0.42, -h * 0.42, w * 0.16, h * 0.24, -0.35, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-w * 0.2, -h * 0.72, w * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawNest(x, y, s, front) {
  // straw nest; the back half is drawn behind the egg, the front rim over it
  const rx = s * 0.62, ry = s * 0.24;
  if (!front) {
    ctx.fillStyle = 'rgba(40,25,10,.3)'; ctx.beginPath(); ctx.ellipse(x, y + s * 0.06, rx * 1.1, ry * 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a4e22'; ctx.beginPath(); ctx.ellipse(x, y - s * 0.12, rx * 0.95, ry * 0.85, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a3412'; ctx.beginPath(); ctx.ellipse(x, y - s * 0.1, rx * 0.7, ry * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    return;
  }
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y - s * 0.08, rx, ry * 1.25, 0, 0, Math.PI); ctx.lineTo(x - rx, y - s * 0.1); ctx.closePath();
  ctx.fillStyle = '#c8924a'; ctx.fill(); ctx.strokeStyle = '#4a2c10'; ctx.lineWidth = 2; ctx.stroke();
  ctx.clip();
  let sd = 7; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI, cx = x + Math.cos(a) * rx * (0.3 + r() * 0.7), cy = y - s * 0.08 + Math.sin(a) * ry * 1.1 * r();
    ctx.strokeStyle = ['#e8b860', '#a8742e', '#f2d088', '#8a5a22'][i % 4]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - s * 0.12, cy - s * 0.02 + r() * 4); ctx.quadraticCurveTo(cx, cy + s * 0.04, cx + s * 0.13, cy - s * 0.03); ctx.stroke();
  }
  ctx.restore();
  // a few loose straws sticking out
  ctx.strokeStyle = '#e8b860'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const [dx, dy, ex, ey] of [[-0.55, -0.12, -0.75, -0.25], [0.5, -0.1, 0.72, -0.2], [-0.2, 0.12, -0.35, 0.2], [0.3, 0.12, 0.45, 0.22]]) { ctx.beginPath(); ctx.moveTo(x + dx * s, y + dy * s); ctx.lineTo(x + ex * s, y + ey * s); ctx.stroke(); }
}
// The older shrine images already include Serจ่อย; the separate sprite accompanies the new altar.
const SHRINE_EGG = [0.37, 0.485], SERJOY_Y = EGG_Y + 0.65;

function drawSerjoy() {
  const p = dproj(2.35, SERJOY_Y);
  drawAt(IMG.shrine_serjoy, p.x, p.y, dk * 1.65);
}

function shrineRect() {
  const empty = D.thief || D.phase === 'defeat';
  const altar = !empty && ready(IMG.molt_altar);
  const im = altar ? IMG.molt_altar : empty && ready(IMG.shrine_noegg) ? IMG.shrine_noegg : IMG.shrine;
  const anchor = altar ? [0.5, 0.45] : SHRINE_EGG;
  const w = dk * (altar ? 3.5 : 4.3), h = ready(im) ? w * artHeight(im) / artWidth(im) : w * 0.75, e = dproj(0, EGG_Y);
  return { x: e.x - w * anchor[0], y: e.y - h * anchor[1], w, h, ex: e.x, ey: e.y, im, altar };
}
function drawEggStand() {
  const r = shrineRect(), gone = D.thief || D.phase === 'defeat', t = performance.now() / 1000;
  const im = r.im;
  ctx.fillStyle = 'rgba(40,25,10,.25)'; ctx.beginPath(); ctx.ellipse(r.ex + r.w * 0.05, r.y + r.h * 0.96, r.w * 0.4, dk * 0.19, 0, 0, Math.PI * 2); ctx.fill();
  if (ready(im)) {
    const shake = r.altar && D.eggHit > 0 ? Math.sin(D.eggHit * 60) * dk * 0.045 : 0;
    ctx.drawImage(im, r.x + shake, r.y, r.w, r.h);
  }
  if (gone) return;
  // a hit makes the egg wobble on its cushion
  if (!r.altar && D.eggHit > 0 && ready(IMG.egg_gold)) {
    const eg = IMG.egg_gold, ew = r.w * 0.219, eh = ew * eg.naturalHeight / eg.naturalWidth;
    ctx.save(); ctx.translate(r.ex, r.ey); ctx.rotate(Math.sin(D.eggHit * 60) * 0.12); ctx.drawImage(eg, -ew / 2, -eh, ew, eh); ctx.restore();
  }
  // twinkles
  for (let i = 0; i < 3; i++) { const k2 = (t * 0.6 + i / 3) % 1, a = i * 2.3 + Math.floor(t * 0.6 + i / 3) * 1.7;
    ctx.globalAlpha = Math.sin(k2 * Math.PI); ctx.fillStyle = '#fffbe0';
    const sx = r.ex + Math.cos(a) * dk * 0.5, sy = r.ey - dk * 0.75 + Math.sin(a) * dk * 0.45, rr = 2 + k2 * 3;
    ctx.beginPath(); ctx.moveTo(sx, sy - rr * 2); ctx.lineTo(sx + rr * 0.5, sy); ctx.lineTo(sx, sy + rr * 2); ctx.lineTo(sx - rr * 0.5, sy); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx - rr * 2, sy); ctx.lineTo(sx, sy + rr * 0.5); ctx.lineTo(sx + rr * 2, sy); ctx.lineTo(sx, sy - rr * 0.5); ctx.closePath(); ctx.fill(); }
  ctx.globalAlpha = 1;
  const r2 = Math.max(0, D.houseHp / D.houseMax);
  if (r2 < 1) { const bw = 64, y = r.ey - dk * 1.55;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; roundRect(r.ex - bw / 2, y, bw, 8, 4); ctx.fill();
    ctx.fillStyle = r2 > 0.5 ? '#ffd84a' : r2 > 0.25 ? '#ffa03a' : '#ff5a4a'; roundRect(r.ex - bw / 2 + 2, y + 2, (bw - 4) * r2, 4, 2); ctx.fill(); }
}
function drawRam(c, p, h) {
  const t = performance.now() / 1000 + c.ph, dead = c.hp <= 0;
  ctx.save(); ctx.globalAlpha = dead ? Math.max(0, 1 - (c.deadT || 0) / 0.6) : 1;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.5, h * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  const walking = c.st === 'walk' && !dead, bob = walking ? Math.abs(Math.sin(t * 5)) * h * 0.02 : 0;
  // ram stroke: pull back, then slam forward
  let th = 0; if (c.st === 'wall' || c.st === 'house') { const a = c.atk || 0; th = a < 1.1 ? -a / 1.1 * 0.12 : a < 1.25 ? -0.12 + (a - 1.1) / 0.15 * 0.32 : Math.max(0, 0.2 - (a - 1.25) * 0.6); }
  ctx.translate(p.x + (c.hitT > 0 ? Math.sin(c.hitT * 120) * 3 : 0), p.y - bob);
  const OUT = '#3a2614';
  // two cats pushing from behind
  if (!dead && ready(IMG.k_cat_front)) for (const sx of [-0.28, 0.28]) drawFrame('k_cat_front', Math.floor(t * 7 + sx * 6) % 4, sx * h, -h * 0.5 + (walking ? Math.abs(Math.sin(t * 7 + sx * 5)) * h * 0.03 : 0), h * 0.5, false);
  // wheels
  ctx.fillStyle = '#4a3020'; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
  for (const sx of [-1, 1]) for (const sy of [-0.42, -0.1]) { ctx.beginPath(); ctx.ellipse(sx * h * 0.36, h * sy, h * 0.07, h * 0.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  // cart bed
  ctx.fillStyle = '#9a6232'; ctx.beginPath(); ctx.roundRect(-h * 0.33, -h * 0.5, h * 0.66, h * 0.42, 5); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(58,38,20,.5)'; ctx.lineWidth = 1.5; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-h * 0.33, -h * 0.5 + h * 0.42 * i / 4); ctx.lineTo(h * 0.33, -h * 0.5 + h * 0.42 * i / 4); ctx.stroke(); }
  // the giant rolling pin, sliding forward on each slam
  const ly = th * h;
  if (!drawItem('cat_ram_prop', 0, -h * 0.26 + ly, h * 0.87, -Math.PI / 4)) {
    ctx.fillStyle = '#e0b07a'; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-h * 0.13, -h * 0.62 + ly, h * 0.26, h * 0.72, h * 0.1); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c8905a'; ctx.beginPath(); ctx.roundRect(-h * 0.045, -h * 0.75 + ly, h * 0.09, h * 0.15, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a8f99'; ctx.beginPath(); ctx.ellipse(0, h * 0.1 + ly, h * 0.15, h * 0.08, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#d8dde6'; ctx.beginPath(); ctx.ellipse(-h * 0.04, h * 0.085 + ly, h * 0.05, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
  // checkered tablecloth roof
  const ry0 = -h * 0.95, ry1 = -h * 0.45;
  ctx.save(); ctx.beginPath(); ctx.moveTo(-h * 0.42, ry1); ctx.lineTo(-h * 0.18, ry0); ctx.lineTo(h * 0.18, ry0); ctx.lineTo(h * 0.42, ry1); ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.clip();
  ctx.fillStyle = '#d8352a'; const cs = h * 0.1; for (let yy = ry0; yy < ry1; yy += cs) for (let xx = -h * 0.45; xx < h * 0.45; xx += cs) if ((Math.round((xx + h) / cs) + Math.round((yy + h) / cs)) % 2) ctx.fillRect(xx, yy, cs, cs);
  ctx.restore();
  ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-h * 0.42, ry1); ctx.lineTo(-h * 0.18, ry0); ctx.lineTo(h * 0.18, ry0); ctx.lineTo(h * 0.42, ry1); ctx.closePath(); ctx.stroke();
  ctx.restore();
  if (c.hp > 0 && c.hp < c.max) { const bw = 46; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(p.x - bw / 2, p.y - h * 1.05, bw, 5); ctx.fillStyle = '#ff4a3a'; ctx.fillRect(p.x - bw / 2, p.y - h * 1.05, bw * c.hp / c.max, 5); }
}
function drawSeesaw(tr) {
  const p = dproj(tr.x, tr.y), sz = dk * 0.68;
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, sz * 0.7, sz * 0.15, 0, 0, Math.PI * 2); ctx.fill();
  const appear = Math.min(1, tr.t * 5);
  ctx.save(); ctx.globalAlpha = tr.broken ? Math.max(0, 1 - Math.max(0, tr.brokeT) / 0.4) : 1;
  ctx.translate(p.x, p.y); ctx.scale(appear, appear);
  // wooden wedge as the pivot, with a spring
  ctx.fillStyle = '#9a6232'; ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-sz * 0.2, 0); ctx.lineTo(0, -sz * 0.42); ctx.lineTo(sz * 0.2, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#8a8f99'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let i = 0; i <= 8; i++) { const yy = -i * sz * 0.045 * (1 - tr.tilt * 0.3), xx = sz * 0.42 + (i % 2 ? 5 : -5); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
  // cutting board plank: resting with one end down, flips up on BOING
  const ang = -0.28 + tr.tilt * 0.8 - (tr.broken ? 0.6 : 0);
  ctx.save(); ctx.translate(0, -sz * 0.44); ctx.rotate(ang);
  if (!drawItem('it_board', 0, 0, sz * 1.25, Math.PI / 2)) { ctx.fillStyle = '#c98a4a'; ctx.fillRect(-sz * 0.65, -sz * 0.1, sz * 1.3, sz * 0.2); }
  ctx.restore();
  // uses left
  if (!tr.broken) for (let i = 0; i < tr.uses; i++) { ctx.fillStyle = '#ffe680'; ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc((i - (tr.uses - 1) / 2) * 7, sz * 0.14, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
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
  const stride = L.strideBlend || 0;
  let img = 'k_duck_walk', fr = L.moving ? Math.floor(L.walkT) % 4 : 1;
  if (L.hurtT > 0.5) { img = 'k_duck_act'; fr = 2; }
  else if (L.swingT > 0) {
    const windup = L.swingT > 0.135;
    img = ready(IMG.duck_spoon_art) ? 'duck_spoon_art' : 'k_duck_act';
    fr = img === 'duck_spoon_art' ? (windup ? 1 : 2) : (windup ? 0 : 1);
  }
  else if (L.happyT > 0) { img = 'k_duck_act'; fr = 3; }
  if (!ready(IMG[img])) return;
  ctx.save(); ctx.translate(p.x, p.y); if (flip) ctx.scale(-1, 1);
  if (L.hurtT > 0.5) cartoonRecoil((1 - L.hurtT) * 2, 1.2);
  else if (L.swingT > 0) cartoonStrike(h, 1 - L.swingT / 0.3, 0.55, 1.2);
  else if (L.happyT > 0) cartoonStep(h, L.happyT * 24, 1.35);
  else if (stride > 0) {
    const transition = 4 * stride * (1 - stride);
    cartoonScale((L.moving ? 0.11 : -0.16) * transition, 0.1 * stride);
    cartoonStep(h, L.walkT * Math.PI, stride);
  }
  drawFrame(img, fr, 0, 0, h, false);
  drawItem('it_apron', w * 0.08, -h * 0.33, h * 0.42);
  if (T.lead.atk + T.lead.spd >= 7) drawItem('it_chefhat', w * 0.02, -h * 0.98, h * 0.42);
  // ladle (or frying pan once upgraded) in the front wing
  const big = T.lead.atk >= 5, sw = L.swingT > 0 ? (L.swingT > 0.18 ? -1.3 : 1.1) : 0.35 + Math.sin(L.walkT * 2) * 0.1;
  const bakedWeapon = img === 'duck_spoon_art' || (img === 'k_duck_act' && fr < 2 && IMG[img] instanceof HTMLCanvasElement);
  if (!bakedWeapon) {
    drawItem(big ? 'it_pan' : 'it_ladle', w * 0.42, -h * 0.5, h * (big ? 0.5 : 0.55), sw, false);
  }
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
    const tx = tr("👆 ลากนิ้วพาเป็ดหัวหน้าไปฟาดแมว"); ctx.strokeText(tx, p.x, p.y + dk * 0.9 + b); ctx.fillStyle = '#fff'; ctx.fillText(tx, p.x, p.y + dk * 0.9 + b);
  }
  if (D.joy && D.joy.moved && !save.td.walked) { save.td.walked = true; persist(); }
  if (D.phase === 'wave') {
    const alive = D.cats.filter(c => c.hp > 0).length + D.queue.length;
    ctx.font = '900 16px Mitr,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    const t1 = tr("🐱 เหลือ {0}", alive);
    ctx.strokeText(t1, W / 2, 62); ctx.fillStyle = '#fff'; ctx.fillText(t1, W / 2, 62);
    if (D.trapMode) { ctx.font = '900 14px Mitr,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(tr("แตะพื้นด้านบนเพื่อวางกับดัก"), W / 2, H - 110); ctx.fillStyle = '#ffe680'; ctx.fillText(tr("แตะพื้นด้านบนเพื่อวางกับดัก"), W / 2, H - 110); }
    ctx.textBaseline = 'alphabetic';
  }
  if (D.banner > 0) {
    ctx.globalAlpha = Math.min(1, D.banner);
    ctx.font = '900 30px Mitr,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(80,0,0,.75)';
    const txt = D.bannerTxt || (D.bossBanner ? tr("ราชาแมวมาแล้ว!! 👑") : tr("แมวบุกมาแล้ว!"));
    ctx.strokeText(txt, W / 2, H * 0.2); ctx.fillStyle = '#ff6a5a'; ctx.fillText(txt, W / 2, H * 0.2);
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
  }
}

// ---------- star rating, victory title, treasure chest and power-up items ----------
const ITEM_INFO = {
  bolt: { short: tr("ฟ้าผ่า"), name: tr("ฟ้าผ่า"), icon: '⚡', tip: tr("ฟ้าผ่าแมวทีละตัว ช็อตจนเห็นกระดูก!") },
  top:  { short: tr("ลูกข่าง"), name: tr("ลูกข่างยักษ์"), icon: '🌀', tip: tr("หมุนวิ่งไปทั่วทาง ชนแมวกระเด็น") },
  ufo:  { short: tr("จานบิน"), name: tr("จานบิน"), icon: '🛸', tip: tr("ดูดแมวขึ้นฟ้าไปทีละตัว") },
};
function itemButtons() {
  if (!D || D.phase !== 'wave') return [];
  const L = []; let y = H - 264;
  for (const k of ['bolt', 'top', 'ufo']) if ((T.items[k] || 0) > 0) { L.push({ k, x: W - 46, y, r: 28 }); y -= 66; }
  return L;
}
function itemBusy(k) { return k === 'bolt' ? !!D.sky : k === 'top' ? D.tops.length > 0 : !!D.ufo; }
function useItem(k) {
  if (itemBusy(k)) { toast(tr("{0} ยังทำงานอยู่", ITEM_INFO[k].icon)); return; }
  if (!D.cats.some(c => c.hp > 0)) { toast(tr("ยังไม่มีแมวให้จัดการ")); return; }
  T.items[k]--; persist(); SFX.init();
  if (k === 'bolt') {
    const list = D.cats.filter(c => c.hp > 0 && !c.abduct && !c.launch && !c.under).sort((a, b) => b.y - a.y).slice(0, 8);
    D.sky = { t: 0, list, i: 0, next: 0.35 }; D.flashT = 0.25; SFX.play('thunder'); D.shake = Math.max(D.shake, 0.2);
  } else if (k === 'top') {
    D.tops.push({ x: 0, y: FENCE_Y - 0.9, t: 0, life: 7.5, ph: 0, hits: new Map(), sfx: 0 }); SFX.play('spin');
  } else {
    D.ufo = { t: 0, life: 8, x: 0, y: FENCE_Y - 3, h: 9, grabs: 0, grabT: 0.9, max: 8 + Math.floor(T.wave / 5), aimT: 0, tx: 0, ty: FENCE_Y - 4 }; SFX.play('ufo');
  }
  toast(`${ITEM_INFO[k].icon} ${ITEM_INFO[k].name}!`);
}
function itemsUpdate(dt) {
  if (!D.tops) { D.tops = []; D.strikes = []; }
  // lightning: strike the leading cats one after another
  if (D.sky) {
    const S = D.sky; S.t += dt; S.next -= dt;
    if (S.next <= 0 && S.i < S.list.length) {
      const c = S.list[S.i++]; S.next = 0.17;
      if (c.hp > 0) {
        D.strikes.push({ x: c.x, y: c.y, t: 0, seed: Math.random() * 999 });
        c.shockT = 0.9; c.stun = Math.max(c.stun || 0, 0.9);
        hurtCat(c, (25 + T.wave * 3) * (c.boss ? 0.5 : 1), 'lead');
        if (c.hp <= 0) { c.fly = null; c.shockDead = true; }
        D.flashT = Math.max(D.flashT || 0, 0.1); D.shake = Math.max(D.shake, 0.18); SFX.play('zap');
        if (S.i % 3 === 1) SFX.play('thunder');
      }
    }
    if (S.i >= S.list.length && S.next < -0.5) D.sky = null;
  }
  for (const s of D.strikes) s.t += dt;
  D.strikes = D.strikes.filter(s => s.t < 0.35);
  for (const c of D.cats) if (c.shockT > 0) c.shockT -= dt;
  // spinning top: up the lane and back, weaving side to side, bowling cats over
  for (const tp of D.tops) {
    tp.t += dt; tp.ph += dt * 22; const u = Math.min(1, tp.t / tp.life);
    tp.x = Math.sin(tp.t * 1.6) * (CAT_X - 0.4); tp.y = FENCE_Y - 0.9 - 12 * Math.sin(u * Math.PI);
    if ((tp.sfx -= dt) <= 0) { tp.sfx = 0.4; SFX.play('spin'); }
    for (const c of D.cats) {
      if (c.hp <= 0 || c.launch || c.lift || c.abduct || c.under) continue;
      if (Math.hypot(c.x - tp.x, (c.y - tp.y) * 1.2) > 0.65) continue;
      if (tp.hits.has(c) && tp.t - tp.hits.get(c) < 0.8) continue;
      tp.hits.set(c, tp.t); SFX.play('bonk'); addFx('spark', c.x, c.y, '#ffffff', 1.2);
      if (c.boss || c.kind === 'ram' || c.kind === 'cart' || c.kind === 'steel') { hurtCat(c, 8 + T.wave * 0.8, 'lead'); c.stun = Math.max(c.stun || 0, 0.4); continue; }
      const side = c.x >= tp.x ? 1 : -1;
      c.launch = { t: 0, dur: 0.9, x0: c.x, y0: c.y, x1: Math.max(-CAT_X, Math.min(CAT_X, c.x + side * (1.5 + Math.random() * 1.5))), y1: c.y - 2.5 - Math.random() * 2, dmg: 4 + T.wave * 0.8, spin: side * (10 + Math.random() * 6) };
      if (c.st !== 'walk') c.st = 'walk';
    }
    if (tp.t >= tp.life) { tp.done = true; addFx('poof', tp.x, tp.y, '#ffffff'); SFX.play('poof'); }
  }
  D.tops = D.tops.filter(t => !t.done);
  // UFO: drift over the biggest bunch of cats and beam them up one by one
  const U = D.ufo;
  if (U) {
    U.t += dt;
    const beaming = D.cats.some(c => c.abduct && c.hp > 0);
    if (!U.leave) {
      U.h = Math.max(3.2, U.h - dt * 9);
      if ((U.aimT -= dt) <= 0) {
        U.aimT = 0.6; let best = null, bn = -1;
        for (const c of D.cats) { if (c.hp <= 0 || c.boss || c.abduct) continue; let n = 0; for (const o of D.cats) if (o.hp > 0 && Math.hypot(o.x - c.x, o.y - c.y) < 1.8) n++; if (n > bn) { bn = n; best = c; } }
        if (best) { U.tx = best.x; U.ty = best.y; }
      }
      const dx = U.tx - U.x, dy = U.ty - U.y, d = Math.hypot(dx, dy);
      if (d > 0.05 && !beaming) { const sp = Math.min(d, 4 * dt); U.x += dx / d * sp; U.y += dy / d * sp; }
      if ((U.grabT -= dt) <= 0 && U.grabs < U.max) {
        let pick = null, pd = 1.6;
        for (const c of D.cats) { if (c.hp <= 0 || c.boss || c.abduct || c.launch || c.lift || c.under || c.kind === 'ram' || c.kind === 'cart' || c.kind === 'chief') continue; const dd = Math.hypot(c.x - U.x, c.y - U.y); if (dd < pd) { pd = dd; pick = c; } }
        if (pick) { pick.abduct = { t: 0, x0: pick.x, y0: pick.y }; U.grabs++; U.grabT = 0.5; SFX.play('beam'); SFX.play('catScared'); }
        else U.grabT = 0.2;
      }
      if ((U.t > U.life || U.grabs >= U.max) && !beaming) { U.leave = true; SFX.play('ufo'); }
    } else { U.h += dt * 10; if (U.h > 14) D.ufo = null; }
  }
}
// abducted cats float up into the saucer (called from the cat loop)
function abductStep(c, dt) {
  const A = c.abduct; A.t += dt; const U = D.ufo, u = Math.min(1, A.t / 1.0);
  if (U) { c.x += (U.x - c.x) * Math.min(1, dt * 3); c.y += (U.y - c.y) * Math.min(1, dt * 3); }
  c.mx = 0; c.my = 1;
  if (u >= 1) { hurtCat(c, c.hp + 999, 'lead'); c.fly = null; c.deadT = 0.55; c.gone = true; SFX.play('poof'); }
}
// ---------- drawing the items ----------
function drawBoltIcon(g, x, y, s) {
  g.save(); g.translate(x, y);
  const gl = g.createRadialGradient(0, 0, 2, 0, 0, s * 0.7); gl.addColorStop(0, 'rgba(255,240,140,.7)'); gl.addColorStop(1, 'rgba(255,240,140,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, s * 0.7, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffd84a'; g.strokeStyle = '#7a4a08'; g.lineWidth = Math.max(2, s * 0.06); g.lineJoin = 'round';
  g.beginPath(); g.moveTo(s * 0.12, -s * 0.5); g.lineTo(-s * 0.26, s * 0.06); g.lineTo(-s * 0.02, s * 0.06); g.lineTo(-s * 0.14, s * 0.5); g.lineTo(s * 0.28, -s * 0.1); g.lineTo(s * 0.04, -s * 0.1); g.lineTo(s * 0.2, -s * 0.5); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(s * 0.12, -s * 0.44); g.lineTo(-s * 0.12, -s * 0.02); g.lineTo(-s * 0.04, -s * 0.02); g.closePath(); g.fill();
  g.restore();
}
function drawTopToy(g, x, y, s, ph, tilt) {
  g.save(); g.translate(x, y); g.rotate(tilt || 0);
  const OUT = '#3a2614';
  // cone to the tip
  g.fillStyle = '#c98a4a'; g.strokeStyle = OUT; g.lineWidth = Math.max(2, s * 0.05);
  g.beginPath(); g.moveTo(-s * 0.42, -s * 0.05); g.lineTo(0, s * 0.45); g.lineTo(s * 0.42, -s * 0.05); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#8a8f99'; g.beginPath(); g.moveTo(-s * 0.05, s * 0.38); g.lineTo(0, s * 0.5); g.lineTo(s * 0.05, s * 0.38); g.fill();
  // spinning striped disc
  g.save(); g.beginPath(); g.ellipse(0, -s * 0.08, s * 0.5, s * 0.2, 0, 0, Math.PI * 2); g.clip();
  const cols = ['#e8423a', '#ffd84a', '#3a8ae0', '#4ac05a'];
  for (let i = 0; i < 8; i++) { const a0 = ph + i * Math.PI / 4; g.fillStyle = cols[i % 4]; g.beginPath(); g.moveTo(0, -s * 0.08); g.lineTo(Math.cos(a0) * s, -s * 0.08 + Math.sin(a0) * s * 0.4); g.lineTo(Math.cos(a0 + Math.PI / 4) * s, -s * 0.08 + Math.sin(a0 + Math.PI / 4) * s * 0.4); g.closePath(); g.fill(); }
  g.restore();
  g.beginPath(); g.ellipse(0, -s * 0.08, s * 0.5, s * 0.2, 0, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(-s * 0.18, -s * 0.15, s * 0.14, s * 0.05, 0, 0, Math.PI * 2); g.fill();
  // stem
  g.fillStyle = '#9a5a2a'; g.beginPath(); g.roundRect(-s * 0.06, -s * 0.42, s * 0.12, s * 0.32, s * 0.04); g.fill(); g.stroke();
  g.fillStyle = '#e8423a'; g.beginPath(); g.arc(0, -s * 0.44, s * 0.08, 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
}
function drawUfoShape(g, x, y, s, t, pilot) {
  g.save(); g.translate(x, y);
  const OUT = '#2a2e3a';
  // glass dome with a duck pilot
  g.fillStyle = 'rgba(170,230,255,.55)'; g.strokeStyle = OUT; g.lineWidth = Math.max(2, s * 0.04);
  g.beginPath(); g.ellipse(0, -s * 0.12, s * 0.28, s * 0.28, 0, Math.PI, 0); g.closePath(); g.fill();
  if (pilot && ready(IMG.k_duck_walk)) { g.save(); g.beginPath(); g.ellipse(0, -s * 0.12, s * 0.27, s * 0.27, 0, Math.PI, 0); g.clip(); drawFrame('k_duck_walk', 1, 0, s * 0.1, s * 0.42, false); g.restore(); }
  g.beginPath(); g.ellipse(0, -s * 0.12, s * 0.28, s * 0.28, 0, Math.PI, 0); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-s * 0.12, -s * 0.28, s * 0.06, s * 0.1, -0.4, 0, Math.PI * 2); g.fill();
  // saucer body
  const gr = g.createLinearGradient(0, -s * 0.15, 0, s * 0.15); gr.addColorStop(0, '#e6ebf2'); gr.addColorStop(0.5, '#a8b2c2'); gr.addColorStop(1, '#6a7486');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, s * 0.62, s * 0.17, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#5a6476'; g.beginPath(); g.ellipse(0, s * 0.1, s * 0.3, s * 0.07, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  // running lights
  const lc = ['#ff5a5a', '#ffd84a', '#5aff8a', '#5ab0ff'];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI + 0.2, lx = Math.cos(a) * s * 0.5, ly = Math.sin(a) * s * 0.1; g.fillStyle = lc[(i + Math.floor(t * 8)) % 4]; g.beginPath(); g.arc(lx, ly, Math.max(2, s * 0.035), 0, Math.PI * 2); g.fill(); }
  g.restore();
}
function drawCoinsIcon(g, x, y, s) {
  for (const [dx, dy] of [[-0.22, 0.12], [0.2, 0.14], [0, -0.05], [-0.1, -0.22], [0.14, -0.2]]) {
    g.save(); g.translate(x + dx * s, y + dy * s);
    if (ready(IMG.it_coin)) { const im = IMG.it_coin, w = s * 0.42; g.drawImage(im, -w / 2, -w / 2, w, w); }
    else { g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(0, 0, s * 0.2, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
}
function drawRewardIcon(g, k, x, y, s, t) {
  if (k === 'bolt') drawBoltIcon(g, x, y, s);
  else if (k === 'top') drawTopToy(g, x, y, s * 0.9, t * 6, 0);
  else if (k === 'ufo') drawUfoShape(g, x, y + s * 0.1, s, t, false);
  else drawCoinsIcon(g, x, y, s);
}
function drawStrike(s) {
  const p = dproj(s.x, s.y), a = 1 - s.t / 0.35;
  let sd = s.seed; const r = () => { sd = (sd * 16807 + 7) % 2147483647; return sd / 2147483647; };
  const pts = []; let x = p.x + (r() - 0.5) * 60, y = -10; pts.push([x, y]);
  const ty = p.y - dk * 0.5; while (y < ty) { y = Math.min(ty, y + 24 + r() * 26); x += (r() - 0.5) * 34; x += (p.x - x) * (y / ty) * 0.35; pts.push([x, y]); }
  pts[pts.length - 1] = [p.x, ty];
  ctx.save(); ctx.globalAlpha = a; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const [col, w, blur] of [['rgba(140,190,255,.6)', 14, 18], ['#cfe6ff', 6, 8], ['#ffffff', 2.5, 0]]) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.shadowColor = '#8ab8ff'; ctx.shadowBlur = blur;
    ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke();
  }
  ctx.shadowBlur = 0;
  // ground flash
  const gg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dk * 1.2); gg.addColorStop(0, 'rgba(255,255,255,.8)'); gg.addColorStop(1, 'rgba(160,200,255,0)');
  ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(p.x, p.y, dk * 1.2, dk * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawSkeletonCat(x, py, h, t) {
  // cartoon x-ray: dark silhouette with white bones, crackling with sparks
  ctx.save();
  const gl = ctx.createRadialGradient(x, py - h * 0.5, 2, x, py - h * 0.5, h * 0.8); gl.addColorStop(0, 'rgba(200,230,255,.8)'); gl.addColorStop(1, 'rgba(120,170,255,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, py - h * 0.5, h * 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a2450'; ctx.strokeStyle = '#0a1028'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, py - h * 0.33, h * 0.27, h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, py - h * 0.75, h * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - h * 0.2, py - h * 0.85); ctx.lineTo(x - h * 0.16, py - h * 1.05); ctx.lineTo(x - h * 0.05, py - h * 0.93); ctx.moveTo(x + h * 0.2, py - h * 0.85); ctx.lineTo(x + h * 0.16, py - h * 1.05); ctx.lineTo(x + h * 0.05, py - h * 0.93); ctx.fill();
  ctx.fillRect(x - h * 0.22, py - h * 0.12, h * 0.12, h * 0.12); ctx.fillRect(x + h * 0.1, py - h * 0.12, h * 0.12, h * 0.12);
  ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineCap = 'round';
  // skull
  ctx.beginPath(); ctx.arc(x, py - h * 0.76, h * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - h * 0.08, py - h * 0.66, h * 0.16, h * 0.06);
  ctx.fillStyle = '#1a2450'; ctx.beginPath(); ctx.arc(x - h * 0.055, py - h * 0.78, h * 0.04, 0, Math.PI * 2); ctx.arc(x + h * 0.055, py - h * 0.78, h * 0.04, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, py - h * 0.73); ctx.lineTo(x - h * 0.02, py - h * 0.7); ctx.lineTo(x + h * 0.02, py - h * 0.7); ctx.fill();
  // spine, ribs, limbs, tail
  ctx.lineWidth = Math.max(2, h * 0.04);
  ctx.beginPath(); ctx.moveTo(x, py - h * 0.6); ctx.lineTo(x, py - h * 0.12); ctx.stroke();
  for (let i = 0; i < 4; i++) { const yy = py - h * (0.52 - i * 0.08), w = h * (0.17 - i * 0.02); ctx.beginPath(); ctx.moveTo(x - w, yy + h * 0.03); ctx.quadraticCurveTo(x, yy - h * 0.04, x + w, yy + h * 0.03); ctx.stroke(); }
  for (const sd of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x + sd * h * 0.08, py - h * 0.55); ctx.lineTo(x + sd * h * 0.3, py - h * 0.38 - Math.sin(t * 40) * h * 0.06); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + sd * h * 0.06, py - h * 0.14); ctx.lineTo(x + sd * h * 0.14, py - h * 0.01); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(x + h * 0.02, py - h * 0.16); ctx.quadraticCurveTo(x + h * 0.4, py - h * 0.2, x + h * 0.36, py - h * 0.5); ctx.stroke();
  // sparks
  ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) { const a = t * 20 + i * 1.6, r0 = h * 0.45, sx = x + Math.cos(a) * r0, sy = py - h * 0.5 + Math.sin(a) * r0 * 0.9;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 5, sy + 4); ctx.lineTo(sx - 2, sy + 7); ctx.lineTo(sx + 4, sy + 12); ctx.stroke(); }
  ctx.restore();
}
function drawTopsOne(tp) {
  {
    const p = dproj(tp.x, tp.y), s = dk * 1.15, t = performance.now() / 1000;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, s * 0.45, s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    // whirl lines
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const a = tp.ph * 0.5 + i * 2.1; ctx.beginPath(); ctx.ellipse(p.x, p.y - s * 0.35, s * 0.62, s * 0.22, 0, a, a + 1.2); ctx.stroke(); }
    drawTopToy(ctx, p.x, p.y - s * 0.47, s, tp.ph, Math.sin(t * 9) * 0.12);
  }
}
function drawUfo() {
  const U = D.ufo; if (!U) return;
  const g = dproj(U.x, U.y), t = performance.now() / 1000, s = dk * 2.0, uy = g.y - U.h * dk + Math.sin(t * 3) * 4;
  ctx.fillStyle = `rgba(0,0,0,${Math.max(0, 0.25 - (U.h - 3.2) * 0.02)})`; ctx.beginPath(); ctx.ellipse(g.x, g.y, s * 0.45, s * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  const beaming = D.cats.some(c => c.abduct && c.hp > 0);
  if (beaming || (!U.leave && U.grabT < 0.25)) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const bg = ctx.createLinearGradient(0, uy, 0, g.y); bg.addColorStop(0, 'rgba(150,255,200,.55)'); bg.addColorStop(1, 'rgba(150,255,200,.12)');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(g.x - s * 0.18, uy + s * 0.08); ctx.lineTo(g.x + s * 0.18, uy + s * 0.08); ctx.lineTo(g.x + dk * 1.3, g.y); ctx.lineTo(g.x - dk * 1.3, g.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(200,255,220,.6)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1, yy = g.y + (uy - g.y) * k, w = dk * 1.3 + (s * 0.18 - dk * 1.3) * k; ctx.beginPath(); ctx.ellipse(g.x, yy, w, w * 0.25, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  drawUfoShape(ctx, g.x, uy, s, t, true);
}
function drawItemButtons() {
  const t = performance.now() / 1000;
  for (const b of itemButtons()) {
    const busy = itemBusy(b.k);
    ctx.fillStyle = busy ? 'rgba(255,230,120,.6)' : 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 2.5; ctx.stroke();
    drawRewardIcon(ctx, b.k, b.x, b.y, b.r * 1.35, t);
    const n = T.items[b.k];
    ctx.font = '900 13px Mitr,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    ctx.strokeText(n, b.x + 20, b.y + 18); ctx.fillStyle = '#fff'; ctx.fillText(n, b.x + 20, b.y + 18); ctx.textBaseline = 'alphabetic';
  }
}
// ---------- victory title ----------
function drawVictoryTitle() {
  if (D.phase !== 'victory' || !D.cheered) return;
  const t = D.vicT - 0.6, cx = W / 2, cy = H * 0.2;
  ctx.save();
  // turning sun rays
  ctx.translate(cx, cy); ctx.rotate(t * 0.6); ctx.globalAlpha = Math.min(0.35, t * 0.8);
  for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI / 7); ctx.fillStyle = i % 2 ? '#fff3b0' : '#ffd84a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-24, -W * 0.7); ctx.lineTo(24, -W * 0.7); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // bouncing gold title
  const pop = t < 0.35 ? 0.3 + (t / 0.35) * 1.0 : 1 + Math.sin((t - 0.35) * 9) * Math.exp(-(t - 0.35) * 4) * 0.25;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(pop, pop); ctx.rotate(Math.sin(t * 3) * 0.03);
  ctx.font = '900 54px Mitr,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const txt = D.vicStars >= 3 ? tr("สุดยอด!!") : tr("ชนะแล้ว!");
  ctx.lineWidth = 12; ctx.strokeStyle = '#6a3a08'; ctx.strokeText(txt, 0, 4);
  const gr = ctx.createLinearGradient(0, -28, 0, 28); gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.45, '#ffd84a'); gr.addColorStop(1, '#f29a18');
  ctx.fillStyle = gr; ctx.fillText(txt, 0, 0);
  // a shine sweeping across the letters
  ctx.globalCompositeOperation = 'source-atop'; const sx = ((t * 260) % 600) - 300;
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(sx, -40); ctx.lineTo(sx + 26, -40); ctx.lineTo(sx - 4, 40); ctx.lineTo(sx - 30, 40); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // ribbon with the day
  ctx.font = '900 17px Mitr,system-ui,sans-serif'; const rt = tr("ผ่านวันที่ {0} 🎉", T.wave), rw = ctx.measureText(rt).width + 40;
  ctx.fillStyle = '#d8352a'; ctx.strokeStyle = '#6a1a10'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-rw / 2 - 14, 42); ctx.lineTo(-rw / 2, 32); ctx.lineTo(rw / 2, 32); ctx.lineTo(rw / 2 + 14, 42); ctx.lineTo(rw / 2, 52); ctx.lineTo(-rw / 2, 52); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillText(rt, 0, 43);
  ctx.restore();
  // sparkles around the title
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + t, k = (t * 1.5 + i / 8) % 1, r = 110 + k * 40, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.45, s = 3 + Math.sin(k * Math.PI) * 5;
    ctx.globalAlpha = Math.sin(k * Math.PI); ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.moveTo(x, y - s * 2); ctx.lineTo(x + s * 0.5, y); ctx.lineTo(x, y + s * 2); ctx.lineTo(x - s * 0.5, y); ctx.closePath(); ctx.fill(); }
  ctx.globalAlpha = 1;
}
// ---------- treasure chest after a 3-star day ----------
function rollReward() {
  const r = Math.random();
  if (r < 0.34) return { k: 'coins', n: 150 + T.wave * 30 };
  return { k: ['bolt', 'top', 'ufo'][Math.floor(Math.random() * 3)], n: 1 };
}
function drawChestArt(g, cx, cy, s, open, shake, t) {
  const OUT = '#3a2210', sh = shake ? Math.sin(t * 60) * shake * 6 : 0;
  g.save(); g.translate(cx + sh, cy);
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, s * 0.42, s * 0.62, s * 0.1, 0, 0, Math.PI * 2); g.fill();
  // inside glow
  if (open > 0) { g.save(); g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(0, -s * 0.05, 4, 0, -s * 0.05, s * (0.6 + open * 0.8)); gl.addColorStop(0, `rgba(255,240,160,${0.9 * open})`); gl.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, -s * 0.05, s * (0.6 + open * 0.8), 0, Math.PI * 2); g.fill(); g.restore(); }
  // body
  g.fillStyle = '#a8622c'; g.strokeStyle = OUT; g.lineWidth = Math.max(3, s * 0.03);
  g.beginPath(); g.roundRect(-s * 0.55, -s * 0.05, s * 1.1, s * 0.45, s * 0.05); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(58,34,16,.45)'; g.lineWidth = 2; for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(-s * 0.55, -s * 0.05 + s * 0.15 * i); g.lineTo(s * 0.55, -s * 0.05 + s * 0.15 * i); g.stroke(); }
  g.fillStyle = '#f2c440'; g.strokeStyle = OUT; g.lineWidth = Math.max(2, s * 0.02);
  for (const bx of [-0.42, 0.34]) { g.fillRect(bx * s, -s * 0.05, s * 0.08, s * 0.45); g.strokeRect(bx * s, -s * 0.05, s * 0.08, s * 0.45); }
  // lid: swings back on its hinge
  g.save(); g.translate(0, -s * 0.05); g.scale(1, Math.cos(open * 2.1)); 
  g.fillStyle = '#b8703a'; g.strokeStyle = OUT; g.lineWidth = Math.max(3, s * 0.03);
  g.beginPath(); g.moveTo(-s * 0.55, 0); g.lineTo(-s * 0.55, -s * 0.18); g.quadraticCurveTo(0, -s * 0.48, s * 0.55, -s * 0.18); g.lineTo(s * 0.55, 0); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#f2c440'; g.lineWidth = Math.max(2, s * 0.02);
  for (const bx of [-0.42, 0.34]) { g.beginPath(); g.moveTo(bx * s, 0); g.lineTo(bx * s, -s * 0.2 - (bx < 0 ? 0.06 : 0.07) * s); g.lineTo((bx + 0.08) * s, -s * 0.22 - (bx < 0 ? 0.06 : 0.07) * s); g.lineTo((bx + 0.08) * s, 0); g.closePath(); g.fill(); g.stroke(); }
  g.restore();
  // lock
  if (open < 0.3) { g.fillStyle = '#f2c440'; g.strokeStyle = OUT; g.lineWidth = 2; g.beginPath(); g.roundRect(-s * 0.08, -s * 0.12, s * 0.16, s * 0.2, s * 0.03); g.fill(); g.stroke(); g.fillStyle = OUT; g.beginPath(); g.arc(0, -s * 0.03, s * 0.025, 0, Math.PI * 2); g.fill(); g.fillRect(-s * 0.01, -s * 0.03, s * 0.02, s * 0.06); }
  g.restore();
}
function openChest(done) {
  SFX.init();
  const reward = rollReward();
  const el = document.createElement('div'); el.id = 'chest';
  el.style.cssText = 'position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 45%,rgba(90,50,10,.85),rgba(10,5,20,.92));font-family:Mitr,system-ui,sans-serif;color:#fff;text-align:center';
  el.innerHTML = tr("<div style=\"font:900 26px Mitr,system-ui,sans-serif;color:#ffd84a;text-shadow:0 3px 0 #6a3a08\">⭐⭐⭐ 3 ดาว!</div>\n    <div class=\"ct\" style=\"font:800 16px Mitr,system-ui,sans-serif;margin-top:4px\">ได้หีบสมบัติ! แตะเพื่อเปิด</div>\n    <canvas width=\"640\" height=\"640\" style=\"width:min(80vw,320px);height:min(80vw,320px)\"></canvas>\n    <div class=\"cr\" style=\"min-height:58px;font:900 22px Mitr,system-ui,sans-serif;color:#ffe680;text-shadow:0 2px 0 #000\"></div>\n    <button class=\"cb\" style=\"display:none;margin-top:8px;border:0;border-radius:18px;padding:12px 30px;font:900 20px Mitr,system-ui,sans-serif;color:#fff;background:linear-gradient(#5fd06a,#2f9a3e);box-shadow:0 5px 0 #1f6a2a\">รับรางวัล ✓</button>");
  document.body.appendChild(el);
  const cv2 = el.querySelector('canvas'), g = cv2.getContext('2d'), ct = el.querySelector('.ct'), cr = el.querySelector('.cr'), cb = el.querySelector('.cb');
  const st = { phase: 'wait', t: 0, open: 0, shake: 0, sparks: [] };
  let last = performance.now(), run = true;
  function frame(now) {
    if (!run) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; st.t += dt;
    const S = 640;
    g.clearRect(0, 0, S, S);
    if (st.phase === 'wait') st.shake = 0.15 + Math.max(0, Math.sin(st.t * 3)) * 0.3;
    if (st.phase === 'shake') { st.shake = 1; if ((st.st = (st.st || 0) + dt) > 0.7) { st.phase = 'open'; st.t2 = 0; SFX.play('chestOpen'); for (let i = 0; i < 40; i++) st.sparks.push({ x: S / 2, y: S * 0.55, vx: (Math.random() - 0.5) * 700, vy: -200 - Math.random() * 600, t: 0, c: ['#ffd84a', '#fff3b0', '#ff8a4a', '#8ad8ff'][i % 4] }); grant(); } }
    if (st.phase === 'open') { st.t2 += dt; st.open = Math.min(1, st.t2 / 0.35); st.shake = 0; }
    // rays behind once open
    if (st.open > 0) {
      g.save(); g.translate(S / 2, S * 0.5); g.rotate(st.t * 0.5); g.globalAlpha = 0.35 * st.open;
      for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); g.fillStyle = i % 2 ? '#fff3b0' : '#ffb03a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-26, -S * 0.47); g.lineTo(26, -S * 0.47); g.closePath(); g.fill(); }
      g.restore();
    }
    drawChestArt(g, S / 2, S * 0.62, S * 0.62, st.open, st.shake, st.t);
    if (st.open > 0) {
      const k = Math.min(1, st.t2 / 0.6), y = S * 0.55 - k * S * 0.28, sc = 0.3 + k * 0.7;
      drawRewardIcon(g, reward.k, S / 2, y, S * 0.36 * sc, st.t);
    }
    for (const p of st.sparks) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; g.globalAlpha = Math.max(0, 1 - p.t / 1.2); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 7, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  function grant() {
    if (reward.k === 'coins') { save.coins += reward.n; cr.textContent = tr("🪙 {0} เหรียญ!", reward.n); }
    else { T.items[reward.k] = (T.items[reward.k] || 0) + 1; cr.innerHTML = tr("{0} {1} x1!<div style=\"font:700 13px Mitr,system-ui,sans-serif;color:#fff;margin-top:4px\">{2}<br>ใช้ได้ตอนสู้ กดปุ่มทางขวาของจอ</div>", ITEM_INFO[reward.k].icon, ITEM_INFO[reward.k].name, ITEM_INFO[reward.k].tip); }
    persist(); SFX.play('reward'); ct.textContent = tr("ได้รางวัล!");
    setTimeout(() => { cb.style.display = ''; }, 500);
  }
  requestAnimationFrame(frame);
  el.addEventListener('pointerdown', e => { if (st.phase === 'wait') { st.phase = 'shake'; ct.textContent = '...'; SFX.play('chestShake'); setTimeout(() => SFX.play('chestShake'), 200); setTimeout(() => SFX.play('chestShake'), 420); } });
  cb.onclick = e => { e.stopPropagation(); run = false; el.remove(); SFX.play('click'); if (done) done(); };
}

// ---------- over-the-air patches (Android app) ----------
// the app downloads a newer game in the background and calls this when it is ready
window.onMoltPatch = v => {
  if (window.welcomePatchReady && window.welcomePatchReady(v)) return;   // still on the welcome screen: restart straight into it
  let b = document.getElementById('patchBar');
  if (!b) {
    b = document.createElement('button'); b.id = 'patchBar';
    b.style.cssText = 'position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:50;border:0;border-radius:16px;padding:10px 18px;font:900 15px Mitr,system-ui,sans-serif;color:#fff;background:linear-gradient(#5fd06a,#2f9a3e);box-shadow:0 4px 0 #1f6a2a,0 8px 18px rgba(0,0,0,.35)';
    document.body.appendChild(b);
  }
  b.innerHTML = tr("🔄 อัปเดตใหม่พร้อมแล้ว (รุ่น {0})<br><small style=\"font-weight:700\">แตะเพื่อโหลดเกมใหม่</small>", v);
  b.onclick = () => {
    if (D && (D.phase === 'wave' || D.phase === 'intro')) { toast(tr("สู้วันนี้ให้จบก่อน แล้วค่อยอัปเดตนะ")); return; }
    persist(); if (window.AndroidPatch) AndroidPatch.reload();
  };
};
function gameVersion() { try { return window.AndroidPatch ? tr("รุ่น ") + AndroidPatch.version() : tr("เว็บ"); } catch (e) { return '?'; } }

// ---------- buttons ----------
$('waveBtn').onclick = e => { e.stopPropagation(); startWave(); };
$('houseBtn').onclick = e => { e.stopPropagation(); SFX.init(); SFX.play('click'); openHouse(); };
$('sheetClose').onclick = closeSheet;
$('raidBtn').onclick = () => {
  if (D && D.phase === 'wave') { toast(tr("สู้วันนี้ให้จบก่อน")); return; }
  SFX.init(); SFX.play('click'); closeSheet(); hide('tdUi');
  state = 'menu'; renderMenu(); preview(); show('menu');
};
$('homeBtn').onclick = () => { SFX.play('click'); enterTD(); };
freshField();
enterTD();
