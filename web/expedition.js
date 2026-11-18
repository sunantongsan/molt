// MOLT — "ออกศึก" (expedition): from day 16 the ducks march OUT of the city.
// Tribal-Rush-style lane push: a long jungle map scrolls upward, the duck war camp sits at the bottom,
// tap 🔨 Build to raise duck huts beside the path; each hut keeps sending ducks up the winding path to
// smash cat pot-towers, wok barracks and chili catapults. Clearing a zone opens the next build pads.
// Every few builds the player picks 1 of 3 upgrade cards. Destroy the cat king's fortress to win the day.
// Shares globals with index.html / td.js (ctx, W, H, IMG, FRAMES, drawFrame, drawAt, drawItem, ready, SFX,
// save, persist, state, T, tr, toast, $, Ads, show, hide, enterTD, renderTdHud, drawKitchenCatBody...).
"use strict";
(() => {
const EXP_FROM = 16;

// ---------- text (Thai first, English for players who picked English) ----------
const XEN = {
  "⚔️ ออกศึก วันที่ {0}": "⚔️ March out · Day {0}",
  "ออกศึก!": "March out!",
  "บุกป้อมแมว": "Storm the cat forts",
  "สร้าง": "Build",
  "อัปเกรด!": "UPGRADE!",
  "เลือก 1 ใบ": "Pick one",
  "ใหม่": "NEW",
  "ค่ายตะเกียบ": "Chopstick Hut",
  "หอส้อมยักษ์": "Fork Tower",
  "โรงซอสพริก": "Chili Mill",
  "ค่ายทัพพี": "Ladle Lodge",
  "ป้อมหน้าไม้": "Crossbow Fort",
  "ศาลไข่ทอง": "Golden Egg Shrine",
  "ส่งเป็ดตะเกียบ (ประชิด)": "Sends chopstick ducks (melee)",
  "ส่งเป็ดยิงส้อม (ไกล)": "Sends fork-shooting ducks (ranged)",
  "ส่งเป็ดซอสพริก (ระเบิดวง)": "Sends chili ducks (splash)",
  "ส่งเป็ดทัพพีตัวอึด": "Sends tough ladle ducks",
  "ป้อมยิงแมวที่เข้าใกล้": "Shoots cats that come close",
  "รักษาเป็ดรอบ ๆ": "Heals nearby ducks",
  "พลัง +30%": "Power +30%",
  "ผลิตไวขึ้น 25%": "Trains 25% faster",
  "ซ่อมค่ายใหญ่": "Repair the war camp",
  "ฟื้นพลังค่ายใหญ่ 50%": "Restore 50% camp HP",
  "ข้าวโพดไหลเร็วขึ้น": "Faster corn",
  "🌽 +2 ต่อวินาที": "🌽 +2 per second",
  "เหรียญไม่พอ — ดูโฆษณารับเหรียญได้": "Not enough coins — watch an ad for more",
  "ถุงเหรียญ": "Coin bag",
  "รับ 🪙{0} ทันที": "Get 🪙{0} now",
  "ฟรี!": "FREE!",
  "ได้เหรียญ +🪙{0}": "Got +🪙{0}",
  "ไม่มีที่ว่างให้สร้าง — ทำลายป้อมแมวข้างหน้าก่อน": "No free pad — destroy the cat forts ahead first",
  "เปิดพื้นที่สร้างใหม่แล้ว!": "New build pads unlocked!",
  "ยึดป้อมแมวได้แล้ว!": "Cat fortress captured!",
  "ราชาแมวออกมาแล้ว!": "The cat king is here!",
  "ค่ายใหญ่พังแล้ว! 😿": "The war camp fell! 😿",
  "ชนะวันที่ {0}! {1}": "Day {0} won! {1}",
  "ล้มแมว {0} ตัว • พังป้อม {1} หลัง • โบนัส 🪙{2}": "{0} cats down • {1} forts smashed • bonus 🪙{2}",
  "ล้มแมว {0} ตัว • พังป้อม {1} หลัง": "{0} cats down • {1} forts smashed",
  "▶ กลับเมืองเป็ด": "▶ Back to the duck city",
  "🔁 ออกศึกใหม่": "🔁 March out again",
  "🎬 ดูโฆษณา สู้ต่อ!<small>ซ่อมค่ายใหญ่เต็ม แล้วสู้ต่อ</small>": "🎬 Watch an ad to keep fighting<small>The war camp is fully repaired</small>",
  "สู้ต่อ! ค่ายใหญ่ซ่อมเต็มแล้ว": "Fight on! The war camp is fully repaired",
  "พักรบ": "Paused",
  "❓ วิธีเล่น": "❓ How to play",
  "🎬 ดูคลิปหัวหน้าเป็ด": "🎬 Watch the chief's speech",
  "นี่คือค่ายใหญ่ของเป็ด ⛺\nถ้าแมวพังค่ายนี้ได้ = แพ้": "This is the duck war camp ⛺\nIf the cats wreck it, you lose",
  "แตะปุ่ม 🔨 สร้าง ตรงนี้เลย! (หลังแรกฟรี)\nใช้เหรียญ 🪙 ตั้งค่ายเป็ดบนจุด ➕ ข้างทาง": "Tap 🔨 Build right here! (first hut is free)\nSpend coins 🪙 to put a duck hut on a ➕ pad",
  "เยี่ยม! 🎉 ค่ายนี้จะส่งเป็ด\nเดินขึ้นไปสู้เองเรื่อยๆ": "Great! 🎉 This hut keeps sending\nducks up the path to fight",
  "ใช้เหรียญ 🪙 ที่สะสมไว้สร้างได้เลย\nล้มแมว พังป้อม ได้เหรียญเพิ่ม • ไม่พอกด 🎬 ดูโฆษณารับเหรียญ": "Your saved coins 🪙 pay for huts\nCats and forts drop more • short? tap 🎬 for coins",
  "ข้างหน้าคือป้อมแมว 💥\nพังให้หมด เพื่อปลดล็อกจุดสร้าง 🔒 ถัดไป": "Cat forts ahead 💥\nSmash them all to unlock the next 🔒 pads",
  "สร้างครบทุก ๆ 3 หลัง\nได้เลือกการ์ดอัปเกรด 1 ใน 3 ใบ 🃏": "Every few builds you pick\n1 of 3 upgrade cards 🃏",
  "บนสุดคือป้อมราชาแมว 🏰\nพังได้ = ชนะ! ลากจอขึ้นลงเพื่อดูแผนที่": "At the very top: the Cat King's fortress 🏰\nSmash it to win! Drag to look around",
  "ต่อไป ▶": "Next ▶",
  "ลุยเลย! ✔": "Let's go! ✔",
  "ข้าม": "Skip",
  "▶ สู้ต่อ": "▶ Resume",
  "🏳️ ถอยกลับเมือง": "🏳️ Retreat to the city",
  "ถอยกลับเมืองแล้ว เก็บเหรียญที่ได้ไว้": "Retreated — you keep the coins you earned",
  "วิธีออกศึก": "How to march out",
  "แตะ 🔨 สร้าง เพื่อตั้งค่ายเป็ดข้างทาง": "Tap 🔨 Build to set up a duck hut by the path",
  "ค่ายจะส่งเป็ดเดินขึ้นไปสู้เองตลอด": "Huts keep sending ducks up the path to fight",
  "ทำลายป้อมแมวให้หมด เพื่อเปิดที่สร้างข้างหน้า": "Smash every cat fort to open the next build pads",
  "พังป้อมราชาแมวด้านบนสุดเพื่อชนะ": "Destroy the cat king's fortress at the top to win",
  "ลุยเลย!": "Let's go!",
  "หอหม้อ": "Pot Tower",
  "ค่ายกระทะ": "Wok Barracks",
  "เครื่องยิงพริก": "Chili Catapult",
  "ป้อมราชาแมว": "Cat King Fortress",
  "ป้อมแมว {0}/{1}": "Cat forts {0}/{1}",
  "แมวบุก!": "Cat raid!",
  "แมวบุกใหญ่!!": "Big cat raid!!",
  "นกกระยาง": "Egrets",
  "บอลลูน": "Balloon",
  "นกกระยางมาแล้ว!": "Egrets incoming!",
  "บอลลูนทิ้งระเบิด!": "Balloon bombs away!",
  "จิก!": "Peck!",
  "ยังไม่มีเป้าหมาย": "No target yet",
};
function xt(th, ...a) { return tr(gameLanguage === 'en' && XEN[th] ? XEN[th] : th, ...a); }

// ---------- duck huts and cat buildings ----------
const HUTS = {
  chop:   { name: "ค่ายตะเกียบ",  desc: "ส่งเป็ดตะเกียบ (ประชิด)",   unit: 'chop',  every: 3.4, cap: 3, hp: 90 },
  fork:   { name: "หอส้อมยักษ์",  desc: "ส่งเป็ดยิงส้อม (ไกล)",      unit: 'fork',  every: 4.6, cap: 2, hp: 80 },
  chili:  { name: "โรงซอสพริก",   desc: "ส่งเป็ดซอสพริก (ระเบิดวง)", unit: 'chili', every: 5.6, cap: 2, hp: 80 },
  spoon:  { name: "ค่ายทัพพี",     desc: "ส่งเป็ดทัพพีตัวอึด",       unit: 'spoon', every: 6.6, cap: 2, hp: 110 },
  tower:  { name: "ป้อมหน้าไม้",   desc: "ป้อมยิงแมวที่เข้าใกล้",     tower: true, range: 5.2, dmg: 8, cd: 0.9, hp: 160 },
  shrine: { name: "ศาลไข่ทอง",     desc: "รักษาเป็ดรอบ ๆ",           heal: 6, range: 3.4, hp: 120 },
};
const DUCKS = {
  chop:  { hp: 34, dmg: 7,  range: 0.85, cd: 0.8, speed: 1.65 },
  fork:  { hp: 22, dmg: 6,  range: 4.2,  cd: 1.15, speed: 1.5, shot: 'it_fork' },
  chili: { hp: 26, dmg: 8,  range: 3.7,  cd: 1.7, speed: 1.45, shot: 'it_chili', splash: 1.15, arc: true },
  spoon: { hp: 85, dmg: 10, range: 0.95, cd: 1.1, speed: 1.3 },
};
const CATS = {
  cat:     { hp: 28, dmg: 6,  range: 0.8, cd: 1.0, speed: 1.4, coin: 3 },
  ninja:   { hp: 22, dmg: 8,  range: 0.8, cd: 0.8, speed: 2.2, coin: 4 },
  tank:    { hp: 95, dmg: 9,  range: 0.9, cd: 1.3, speed: 1.0, coin: 6 },
  pitcher: { hp: 22, dmg: 5,  range: 3.4, cd: 1.5, speed: 1.3, coin: 4, shot: 'it_skewer' },
  chief:   { hp: 650, dmg: 22, range: 1.3, cd: 1.6, speed: 0.95, coin: 60, boss: true },
  // heavier cats that join the raids on later days
  knight:  { hp: 70,  dmg: 10, range: 0.9, cd: 1.0, speed: 1.35, coin: 6, art: 'k_knight' },
  steel:   { hp: 160, dmg: 12, range: 0.95, cd: 1.4, speed: 0.9, coin: 9, art: 'k_steel' },
  shadow:  { hp: 40,  dmg: 13, range: 0.85, cd: 0.7, speed: 2.6, coin: 7, art: 'k_shadow', hunter: true },
};
const FORTS = {
  pottower: { name: "หอหม้อ",         hp: 170, range: 4.8, dmg: 6,  cd: 1.25, shot: 'it_spatula' },
  barracks: { name: "ค่ายกระทะ",       hp: 210, spawn: 5.5 },
  catapult: { name: "เครื่องยิงพริก",   hp: 130, range: 7.0, dmg: 12, cd: 3.4, shot: 'it_chili', splash: 1.35, arc: true },
  fortress: { name: "ป้อมราชาแมว",     hp: 720, range: 5.6, dmg: 8,  cd: 1.1, shot: 'it_spatula', spawn: 6.5 },
};

// ---------- world & camera ----------
const XL = 64;            // map length (m)
const XYS = 0.8;          // vertical foreshortening
let X = null;             // the running expedition
let xk = 36;              // px per metre
function xBot() { return Math.max(118, H * 0.15); }
function xp(x, y) { return { x: W / 2 + x * xk, y: H - xBot() - (y - X.camY) * xk * XYS }; }
function xinv(sx, sy) { return { x: (sx - W / 2) / xk, y: (H - xBot() - sy) / (xk * XYS) + X.camY }; }
function viewSpan() { return (H - xBot() - 70) / (xk * XYS); }

// seeded random so a day's map is the same after a retry
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function buildPath(R) {
  const ctl = [{ x: 0, y: -3 }, { x: 0, y: 1.5 }];
  let side = R() < 0.5 ? -1 : 1;
  for (let y = 7; y < XL - 6; y += 6 + R() * 1.5) { ctl.push({ x: side * (1.2 + R() * 1.5), y }); side = -side; }
  ctl.push({ x: 0, y: XL - 4.5 }, { x: 0, y: XL + 2 });
  const pts = [];
  for (let i = 0; i < ctl.length - 1; i++) {
    const p0 = ctl[Math.max(0, i - 1)], p1 = ctl[i], p2 = ctl[i + 1], p3 = ctl[Math.min(ctl.length - 1, i + 2)];
    for (let t = 0; t < 1; t += 0.05) {
      const t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  pts.push(ctl[ctl.length - 1]);
  // resample evenly every 0.25 m
  const out = [{ x: pts[0].x, y: pts[0].y, s: 0 }]; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = Math.hypot(b.x - a.x, b.y - a.y); let u = 0;
    while (acc + d - u >= 0.25) { u += 0.25 - acc; acc = 0; const k = u / d; const q = out[out.length - 1]; out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, s: q.s + 0.25 }); }
    acc += d - u;
  }
  for (let i = 0; i < out.length; i++) { const a = out[Math.max(0, i - 2)], b = out[Math.min(out.length - 1, i + 2)], l = Math.hypot(b.x - a.x, b.y - a.y) || 1; out[i].nx = (b.y - a.y) / l; out[i].ny = -(b.x - a.x) / l; }
  return out;
}
function pathIdxAtY(y) { const P = X.path; let best = 0, bd = 1e9; for (let i = 0; i < P.length; i++) { const d = Math.abs(P[i].y - y); if (d < bd) { bd = d; best = i; } } return best; }
function nearestIdx(x, y, hint) {
  const P = X.path; let lo = 0, hi = P.length - 1;
  if (hint !== undefined && hint >= 0) { lo = Math.max(0, hint - 14); hi = Math.min(P.length - 1, hint + 14); }
  let best = lo, bd = 1e9;
  for (let i = lo; i <= hi; i++) { const d = (P[i].x - x) ** 2 + (P[i].y - y) ** 2; if (d < bd) { bd = d; best = i; } }
  return best;
}
function riverY(R0, x) { return R0 + Math.sin(x * 0.55 + R0) * 0.7; }
function inRiver(x, y) { for (const r of X.rivers) if (Math.abs(y - riverY(r, x)) < 1.6) return true; return false; }
function nearPath(x, y, d) { const P = X.path; for (let i = 0; i < P.length; i += 2) if (Math.abs(P[i].y - y) < d + 1 && Math.hypot(P[i].x - x, P[i].y - y) < d) return true; return false; }

// ---------- level generation ----------
function dayN() { return Math.max(1, T.wave - EXP_FROM + 1); }
// the city still matters: every weapon level bought on the wall makes the marching ducks stronger
function duckPower() { let lv = 0; for (const p of (T.plats || [])) lv += (p.lvl || 1) - 1; return 1 + Math.min(1.5, lv * 0.04) + ((T.house || 1) - 1) * 0.03; }
function campMax() { return 420 + ((T.fence || 1) - 1) * 25 + ((T.house || 1) - 1) * 20 + (dayN() - 1) * 30; }

function newExpedition() {
  if (X && X.tiles) { for (const c of X.tiles.values()) recycleTile(c); }
  const n = dayN(), R = rng(T.wave * 7919 + 13);
  xk = Math.min(W / 10.4, 46);
  X = {
    t: 0, phase: 'intro', introT: 0, paused: false, camY: 0, camHold: 0, drag: null,
    path: null, rivers: [XL * 0.31, XL * 0.7], decor: [], tiles: new Map(),
    groups: [], slots: [], huts: [], forts: [], ducks: [], cats: [], shots: [], parts: [], floats: [], rubble: [],
    spent: 0, builds: 0, cardsTaken: 0, cardDue: false, card: null,
    unlocked: ['chop'], lv: { chop: 0, fork: 0, chili: 0, spoon: 0, tower: 0, shrine: 0 }, fast: { chop: 0, fork: 0, chili: 0, spoon: 0 },
    camp: { x: 0, y: 0.6, hp: campMax(), max: campMax(), cd: 0, hit: 0 },
    items: { egret: { cd: 6, max: 24 }, balloon: { cd: 14, max: 34 } }, egrets: [], balloons: [], bombs: [],
    killed: 0, smashed: 0, earned: 0, front: 0, revived: false, shake: 0, banner: 0, bannerTxt: '', bossOut: false,
    hpMul: 1 + (n - 1) * 0.11, dmgMul: 1 + (n - 1) * 0.06, power: duckPower() * (1 + (n - 1) * 0.04), sndT: {}, nextType: 'chop', seed: T.wave,
  };
  X.path = buildPath(R);
  // duck build-pad groups and cat zones, bottom to top
  const G = [3.6, 15.5, 28.5, 41.5, 53.5], Z = [[9.5, 12], [21.5, 24.5], [34, 37.5], [47, 50.5]];
  for (let g = 0; g < G.length; g++) {
    const i = pathIdxAtY(G[g]), p = X.path[i], grp = { y: G[g], open: g === 0, slots: [] };
    const offs = [[-2.35, 0.2], [2.35, -0.2], [-3.75, 1.3], [3.75, 1.1]];
    for (const [o, dy] of offs) {
      let x = p.x + p.nx * o, y = p.y + p.ny * o + dy;
      x = Math.max(-4.55, Math.min(4.55, x)); if (nearPath(x, y, 1.6)) x += Math.sign(o) * 0.9;
      const s = { x, y, g, hut: null, id: X.slots.length }; grp.slots.push(s); X.slots.push(s);
    }
    X.groups.push(grp);
  }
  // cat forts per zone, more of them as the days go on
  const zoneKinds = [['pottower', 'barracks'], ['pottower', 'catapult', 'barracks'], ['pottower', 'barracks', 'catapult', 'pottower'], ['catapult', 'barracks', 'pottower', 'barracks']];
  for (let z = 0; z < Z.length; z++) {
    let kinds = zoneKinds[z].slice(0, (z < 2 ? 2 : 3) + (n >= 3 ? 1 : 0));
    kinds.forEach((kind, j) => {
      const y = Z[z][0] + (Z[z][1] - Z[z][0]) * (kinds.length > 1 ? j / (kinds.length - 1) : 0.5), i = pathIdxAtY(y), p = X.path[i];
      const side = j % 2 ? 1 : -1, o = side * (2.1 + R() * 0.9);
      let x = Math.max(-4.4, Math.min(4.4, p.x + p.nx * o)), yy = p.y + p.ny * o;
      if (nearPath(x, yy, 1.5)) x += side * 0.8;
      addFort(kind, x, yy, z);
    });
  }
  addFort('fortress', 0, XL - 2.2, 4);
  // scenery: palms, bushes, rocks, flowers — kept off the path, the pads and the forts
  const busy = (x, y, r) => nearPath(x, y, 1.8 + r) || inRiver(x, y) || X.slots.some(s => Math.hypot(s.x - x, s.y - y) < 1.4 + r) || X.forts.some(f => Math.hypot(f.x - x, f.y - y) < (f.kind === 'fortress' ? 3.6 : 1.7) + r) || Math.hypot(x, y - 0.6) < 2.6 + r;
  for (let k = 0; k < 420 && X.decor.length < 150; k++) {
    const y = -3 + R() * (XL + 6), edge = R() < 0.72, x = edge ? (R() < 0.5 ? -1 : 1) * (3.9 + R() * 1.6) : -4.6 + R() * 9.2;
    const kind = R() < 0.36 ? 'palm' : R() < 0.55 ? 'bush' : R() < 0.75 ? 'rock' : 'flower';
    const r = kind === 'palm' ? 0.6 : kind === 'rock' ? 0.55 : 0.4;
    if (busy(x, y, r * 0.6)) continue;
    X.decor.push({ kind, x, y, s: 0.75 + R() * 0.55, r: R(), flip: R() < 0.5 });
  }
  X.decor.sort((a, b) => b.y - a.y);
  pickNextType();
  X.w = W; X.h = H;
}
function addFort(kind, x, y, zone) {
  const F = FORTS[kind], hp = Math.round(F.hp * X.hpMul);
  X.forts.push({ kind, x, y, zone, hp, max: hp, cd: 1 + Math.random(), spawnT: 2 + Math.random() * 2, hit: 0, alive: true, shootT: 0 });
}

// ---------- painted background (cached in strips) ----------
const TILE_M = 7;
// Background strips are recycled: only the strips around the screen are kept (about 6), and the same
// canvases are reused from battle to battle. Allocating a fresh full map every day piled up graphics memory
// on phones until Android closed the game.
const TILE_POOL = [];
function recycleTile(c) { if (TILE_POOL.length < 8) TILE_POOL.push(c); else { c.width = c.height = 0; } }
function releaseTiles() { if (X && X.tiles) { for (const c of X.tiles.values()) { c.width = c.height = 0; } X.tiles.clear(); } for (const c of TILE_POOL) { c.width = c.height = 0; } TILE_POOL.length = 0; }
function bgTile(ti) {
  let c = X.tiles.get(ti); if (c) return c;
  const th = TILE_M * xk * XYS, dpr = Math.min(1.5, window.devicePixelRatio || 1);
  c = TILE_POOL.pop() || document.createElement('canvas'); c.width = Math.ceil(W * dpr); c.height = Math.ceil(th * dpr) + 2;
  const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.scale(dpr, dpr);
  const y0 = ti * TILE_M, y1 = y0 + TILE_M;            // world rows covered
  const P = (x, y) => ({ x: W / 2 + x * xk, y: th - (y - y0) * xk * XYS });
  const R = rng(X.seed * 131 + ti * 977 + 5);
  // grass with soft patches
  const gr = g.createLinearGradient(0, 0, 0, th); gr.addColorStop(0, '#79c94a'); gr.addColorStop(1, '#6dbf43'); g.fillStyle = gr; g.fillRect(0, 0, W, th + 2);
  for (let i = 0; i < 26; i++) { const x = R() * W, y = R() * th, r = 18 + R() * 46; g.fillStyle = R() < 0.5 ? 'rgba(150,215,90,.35)' : 'rgba(70,150,50,.22)'; g.beginPath(); g.ellipse(x, y, r * 1.4, r * 0.8, 0, 0, Math.PI * 2); g.fill(); }
  for (let i = 0; i < 70; i++) { const x = R() * W, y = R() * th; g.strokeStyle = R() < 0.5 ? 'rgba(40,110,30,.35)' : 'rgba(190,240,120,.45)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2 + R() * 4, y - 4 - R() * 4); g.stroke(); }
  // rivers (+ wooden bridge where the path crosses)
  for (const r0 of X.rivers) {
    if (r0 < y0 - 3 || r0 > y1 + 3) continue;
    const band = (off, col, wd) => { g.beginPath(); for (let x = -6; x <= 6.01; x += 0.25) { const p = P(x, riverY(r0, x) + off); x === -6 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y); } g.strokeStyle = col; g.lineWidth = wd * xk * XYS; g.lineCap = 'round'; g.stroke(); };
    band(0, '#e8d49a', 3.5); band(0, '#58b8e6', 2.7); band(0.15, '#3c9fd8', 1.6); band(0.35, 'rgba(255,255,255,.25)', 0.25); band(-0.6, 'rgba(255,255,255,.18)', 0.12);
    // bridge
    const bi = nearestIdx(0, r0), bx = X.path[pathIdxAtY(r0)].x;
    void bi;
    for (let k = -1.9; k <= 1.9; k += 0.42) { const p = P(bx - 1.25, r0 + k), q = P(bx + 1.25, r0 + k); g.fillStyle = k % 0.84 < 0.42 ? '#b7834a' : '#a87440'; g.strokeStyle = '#5a3a1a'; g.lineWidth = 1.5; g.fillRect(p.x, p.y - 6, q.x - p.x, 7); g.strokeRect(p.x, p.y - 6, q.x - p.x, 7); }
    for (const sx of [-1.3, 1.3]) { const a = P(bx + sx, r0 - 2), b = P(bx + sx, r0 + 2); g.strokeStyle = '#6a4220'; g.lineWidth = 4; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
  }
  // dirt path: edge, fill, wheel ruts and pebbles
  const P0 = X.path.filter(p => p.y > y0 - 2.5 && p.y < y1 + 2.5);
  if (P0.length > 1) {
    const stroke = (col, wdM, off) => { g.beginPath(); P0.forEach((p, i) => { const q = P(p.x + (off || 0) * p.nx, p.y + (off || 0) * p.ny); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }); g.strokeStyle = col; g.lineWidth = wdM * xk; g.lineJoin = g.lineCap = 'round'; g.stroke(); };
    stroke('#a8794a', 2.75); stroke('#d9a96a', 2.35); stroke('#e4b878', 1.5);
    stroke('rgba(150,100,55,.35)', 0.12, -0.45); stroke('rgba(150,100,55,.35)', 0.12, 0.45);
    for (const p of P0) if (R() < 0.35) { const o = (R() - 0.5) * 2, q = P(p.x + p.nx * o, p.y + p.ny * o); g.fillStyle = R() < 0.5 ? '#c08a55' : '#f0cf96'; g.beginPath(); g.ellipse(q.x, q.y, 2 + R() * 2.5, 1.5 + R() * 1.5, 0, 0, Math.PI * 2); g.fill(); }
  }
  // scenery that falls into this strip
  for (const d of X.decor) { if (d.y < y0 - 2.5 || d.y > y1 + 3.5) continue; const p = P(d.x, d.y); drawDecor(g, d, p.x, p.y); }
  X.tiles.set(ti, c); return c;
}
function drawDecor(g, d, x, y) {
  const s = d.s * xk;
  if (d.kind === 'palm') {
    g.fillStyle = 'rgba(0,0,0,.16)'; g.beginPath(); g.ellipse(x + s * 0.4, y, s * 0.9, s * 0.28, 0, 0, Math.PI * 2); g.fill();
    const lean = (d.flip ? -1 : 1) * s * 0.35, tx = x + lean, ty = y - s * 1.9;
    g.strokeStyle = '#7a5226'; g.lineWidth = s * 0.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.2, y - s, tx, ty); g.stroke();
    g.strokeStyle = 'rgba(60,35,10,.5)'; g.lineWidth = 1.2; for (let k = 0.15; k < 0.95; k += 0.14) { const px = x + (tx - x) * k * k, py = y + (ty - y) * k; g.beginPath(); g.moveTo(px - s * 0.09, py); g.lineTo(px + s * 0.09, py - s * 0.03); g.stroke(); }
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.55 + d.r * 0.3, len = s * (1.05 + (k % 2) * 0.25);
      g.fillStyle = k % 2 ? '#2f9a3a' : '#3cb447'; g.strokeStyle = '#1f6a28'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(tx, ty);
      g.quadraticCurveTo(tx + Math.cos(a - 0.25) * len * 0.7, ty + Math.sin(a - 0.25) * len * 0.5 - s * 0.15, tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.55 + s * 0.25);
      g.quadraticCurveTo(tx + Math.cos(a + 0.25) * len * 0.6, ty + Math.sin(a + 0.25) * len * 0.45, tx, ty); g.fill(); g.stroke();
    }
    g.fillStyle = '#8a5a2a'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(tx - s * 0.1 + k * s * 0.1, ty + s * 0.06, s * 0.08, 0, Math.PI * 2); g.fill(); }
  } else if (d.kind === 'bush') {
    g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.ellipse(x, y, s * 0.75, s * 0.22, 0, 0, Math.PI * 2); g.fill();
    const blobs = [[-0.4, -0.25, 0.42], [0.35, -0.25, 0.4], [0, -0.5, 0.48], [-0.15, -0.2, 0.4], [0.2, -0.15, 0.36]];
    g.strokeStyle = '#1e6a2a'; g.lineWidth = 1.5;
    for (const [bx, by, br] of blobs) { g.fillStyle = '#2e9a3e'; g.beginPath(); g.arc(x + bx * s, y + by * s, br * s, 0, Math.PI * 2); g.fill(); g.stroke(); }
    for (const [bx, by, br] of blobs) { g.fillStyle = 'rgba(140,230,110,.45)'; g.beginPath(); g.arc(x + bx * s - br * s * 0.25, y + by * s - br * s * 0.3, br * s * 0.45, 0, Math.PI * 2); g.fill(); }
    if (d.r < 0.45) { g.fillStyle = d.r < 0.2 ? '#ff6b8a' : '#ffd24a'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + (k - 1.5) * s * 0.25, y - s * (0.35 + (k % 2) * 0.25), s * 0.07, 0, Math.PI * 2); g.fill(); } }
  } else if (d.kind === 'rock') {
    g.fillStyle = 'rgba(0,0,0,.16)'; g.beginPath(); g.ellipse(x, y, s * 0.7, s * 0.2, 0, 0, Math.PI * 2); g.fill();
    const pts = [[-0.62, 0], [-0.55, -0.35], [-0.2, -0.62], [0.25, -0.58], [0.6, -0.3], [0.65, 0]];
    g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(x + px * s, y + py * s) : g.moveTo(x + px * s, y + py * s)); g.closePath();
    const rg = g.createLinearGradient(x, y - s * 0.6, x, y); rg.addColorStop(0, '#d9c3a8'); rg.addColorStop(1, '#a88d72'); g.fillStyle = rg; g.fill(); g.strokeStyle = '#6a5440'; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(x - s * 0.45, y - s * 0.32); g.lineTo(x - s * 0.18, y - s * 0.55); g.lineTo(x + s * 0.05, y - s * 0.5); g.lineTo(x - s * 0.3, y - s * 0.25); g.fill();
  } else {
    const cols = ['#ffffff', '#ffd24a', '#ff8ab0', '#b9a2ff'];
    for (let k = 0; k < 5; k++) { const fx = x + Math.cos(k * 2.4 + d.r * 6) * s * 0.45, fy = y + Math.sin(k * 2.4) * s * 0.2; g.fillStyle = cols[(k + Math.floor(d.r * 4)) % 4]; for (let q = 0; q < 5; q++) { g.beginPath(); g.arc(fx + Math.cos(q * 1.26) * 2.6, fy + Math.sin(q * 1.26) * 2.6, 2.2, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#f5b400'; g.beginPath(); g.arc(fx, fy, 1.7, 0, Math.PI * 2); g.fill(); }
  }
}

// ---------- building art (drawn once into small canvases) ----------
const ART = new Map();
function art(key, wM, hM, paint) {
  const k = key + '@' + Math.round(xk); let c = ART.get(k);
  if (c) return c;
  const dpr = Math.min(1.5, window.devicePixelRatio || 1), w = wM * xk, h = hM * xk;
  c = document.createElement('canvas'); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const keep = ctx; try { ctx = g; paint(g, w, h); } finally { ctx = keep; }
  c.cw = w; c.ch = h; ART.set(k, c); return c;
}
function outlined(g, col, path, lw) { g.fillStyle = col; path(); g.fill(); g.strokeStyle = '#4a2e14'; g.lineWidth = lw || 2.2; g.stroke(); }
// round tribal hut with a cone roof; roof colours + topper decide the type
function paintHut(g, w, h, o) {
  const cx = w / 2, by = h - 6, rw = w * 0.36, wallH = h * 0.26;
  g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(cx, by, rw * 1.25, rw * 0.38, 0, 0, Math.PI * 2); g.fill();
  // walls
  const wg = g.createLinearGradient(cx - rw, 0, cx + rw, 0); wg.addColorStop(0, o.wallD); wg.addColorStop(0.45, o.wall); wg.addColorStop(1, o.wallD);
  outlined(g, wg, () => { g.beginPath(); g.moveTo(cx - rw, by - wallH); g.lineTo(cx - rw, by - rw * 0.12); g.ellipse(cx, by - rw * 0.12, rw, rw * 0.3, 0, Math.PI, 0, true); g.lineTo(cx + rw, by - wallH); g.closePath(); });
  g.strokeStyle = 'rgba(80,50,20,.35)'; g.lineWidth = 1.3; for (let k = -3; k <= 3; k++) { const x = cx + k * rw * 0.27; g.beginPath(); g.moveTo(x, by - wallH + 2); g.lineTo(x, by - rw * 0.12 + Math.sqrt(Math.max(0, 1 - (k * 0.27) ** 2)) * rw * 0.3 - 2); g.stroke(); }
  // door
  outlined(g, '#5a3518', () => { g.beginPath(); g.moveTo(cx - rw * 0.3, by - rw * 0.02); g.lineTo(cx - rw * 0.3, by - wallH * 0.7); g.arc(cx, by - wallH * 0.7, rw * 0.3, Math.PI, 0); g.lineTo(cx + rw * 0.3, by - rw * 0.02); g.closePath(); }, 1.8);
  g.fillStyle = 'rgba(255,200,90,.25)'; g.beginPath(); g.arc(cx, by - wallH * 0.62, rw * 0.16, 0, Math.PI * 2); g.fill();
  // cone roof
  const ry = by - wallH, top = h * 0.12, rr = rw * 1.28;
  const rg = g.createLinearGradient(cx - rr, 0, cx + rr, 0); rg.addColorStop(0, o.roofD); rg.addColorStop(0.4, o.roof); rg.addColorStop(1, o.roofD);
  outlined(g, rg, () => { g.beginPath(); g.moveTo(cx, top); g.quadraticCurveTo(cx - rr * 0.5, ry - rr * 0.2, cx - rr, ry + rr * 0.06); g.ellipse(cx, ry + rr * 0.06, rr, rr * 0.28, 0, Math.PI, 0, true); g.quadraticCurveTo(cx + rr * 0.5, ry - rr * 0.2, cx, top); g.closePath(); }, 2.4);
  g.strokeStyle = o.stripe; g.lineWidth = 3; for (let k = 1; k <= 3; k++) { const yy = top + (ry - top) * k / 4 + 4, ww = rr * k / 4 * 1.02; g.beginPath(); g.ellipse(cx, yy, ww, ww * 0.26, 0, 0.15, Math.PI - 0.15); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(cx - 2, top + 6); g.quadraticCurveTo(cx - rr * 0.35, ry - rr * 0.25, cx - rr * 0.65, ry); g.lineTo(cx - rr * 0.5, ry); g.quadraticCurveTo(cx - rr * 0.2, ry - rr * 0.3, cx - 2, top + 6); g.fill();
  // fringe
  g.strokeStyle = o.roofD; g.lineWidth = 2; for (let a = 0.2; a < Math.PI - 0.15; a += 0.22) { const x = cx + Math.cos(a) * rr, y = ry + rr * 0.06 + Math.sin(a) * rr * 0.28; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 5); g.stroke(); }
  if (o.top) o.top(g, cx, top);
}
function duckFlag(g, x, y, col) {
  g.strokeStyle = '#5a3a1a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x, y - 26); g.stroke();
  outlined(g, col || '#ffd23a', () => { g.beginPath(); g.moveTo(x, y - 26); g.quadraticCurveTo(x + 14, y - 30, x + 24, y - 22); g.quadraticCurveTo(x + 13, y - 17, x, y - 14); g.closePath(); }, 1.6);
  g.fillStyle = '#ff8a1a'; g.beginPath(); g.ellipse(x + 13, y - 21.5, 4, 2, 0, 0, Math.PI * 2); g.fill();
}
function hutArt(type) {
  if (type === 'chop') return art('hut_chop', 2.3, 2.5, (g, w, h) => paintHut(g, w, h, { wall: '#efce8a', wallD: '#c99a55', roof: '#ffcf3e', roofD: '#e09a1a', stripe: '#c9741a', top: (g, x, y) => { drawItem('it_chopsticks', x, y + 2, w * 0.36, 0.5); duckFlag(g, x + 2, y + 2); } }));
  if (type === 'chili') return art('hut_chili', 2.3, 2.6, (g, w, h) => paintHut(g, w, h, { wall: '#f3d9a8', wallD: '#cfa36a', roof: '#ff5a3a', roofD: '#c0281a', stripe: '#ffd0a0', top: (g, x, y) => { drawItem('it_sauce', x, y - 2, w * 0.3, 0.1); duckFlag(g, x + 4, y + 6, '#ff9a3a'); } }));
  if (type === 'spoon') return art('hut_spoon', 2.6, 2.7, (g, w, h) => paintHut(g, w, h, { wall: '#e3c896', wallD: '#b58e57', roof: '#5fc85a', roofD: '#2f8a30', stripe: '#d9f5a0', top: (g, x, y) => { drawItem('it_ladle', x - 6, y + 4, w * 0.36, -0.5); drawItem('it_ladle', x + 6, y + 4, w * 0.36, 0.5, true); duckFlag(g, x, y + 2); } }));
  if (type === 'fork') return art('hut_fork', 2.2, 3.0, (g, w, h) => {
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(w / 2, h - 6, w * 0.42, w * 0.14, 0, 0, Math.PI * 2); g.fill();
    if (ready(IMG.molt_deck_bamboo)) drawAt(IMG.molt_deck_bamboo, w / 2, h - 4, w * 0.62);
    const fy = h * 0.3; duckFlag(g, w / 2 + w * 0.2, fy + 6);
    drawItem('it_fork', w / 2 - w * 0.18, fy - 2, w * 0.4, -0.25);
  });
  if (type === 'tower') return art('hut_tower', 2.2, 2.6, (g, w, h) => {
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(w / 2, h - 6, w * 0.42, w * 0.14, 0, 0, Math.PI * 2); g.fill();
    if (ready(IMG.molt_deck_brick)) drawAt(IMG.molt_deck_brick, w / 2, h - 4, w * 0.7);
  });
  if (type === 'shrine') return art('hut_shrine', 2.0, 2.4, (g, w, h) => {
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(w / 2, h - 6, w * 0.4, w * 0.13, 0, 0, Math.PI * 2); g.fill();
    if (ready(IMG.molt_altar)) drawAt(IMG.molt_altar, w / 2, h - 4, w * 0.72);
  });
  return null;
}
// cat buildings — kitchen theme: stacked-pot tower, upside-down wok barracks, chili catapult, the king's fortress
function fortArt(kind) {
  if (kind === 'pottower') return art('f_pot', 2.0, 3.4, (g, w, h) => {
    const cx = w / 2, by = h - 5;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(cx, by, w * 0.4, w * 0.13, 0, 0, Math.PI * 2); g.fill();
    // wooden legs
    g.strokeStyle = '#6a4220'; g.lineWidth = 5; g.lineCap = 'round';
    for (const [a, b] of [[-0.3, -0.12], [0.3, 0.12]]) { g.beginPath(); g.moveTo(cx + a * w, by); g.lineTo(cx + b * w, by - h * 0.42); g.stroke(); }
    g.lineWidth = 3; g.beginPath(); g.moveTo(cx - w * 0.25, by - h * 0.12); g.lineTo(cx + w * 0.2, by - h * 0.3); g.moveTo(cx + w * 0.25, by - h * 0.12); g.lineTo(cx - w * 0.2, by - h * 0.3); g.stroke();
    // three stacked pots
    for (let k = 0; k < 3; k++) drawItem('it_pot', cx, by - h * 0.44 - k * h * 0.15, w * (0.78 - k * 0.1), Math.PI);
    // red cat banner
    g.strokeStyle = '#4a2e14'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(cx + w * 0.3, by - h * 0.55); g.lineTo(cx + w * 0.3, by - h * 0.9); g.stroke();
    outlined(g, '#e0352a', () => { g.beginPath(); g.moveTo(cx + w * 0.3, by - h * 0.9); g.lineTo(cx + w * 0.48, by - h * 0.86); g.lineTo(cx + w * 0.42, by - h * 0.8); g.lineTo(cx + w * 0.48, by - h * 0.74); g.lineTo(cx + w * 0.3, by - h * 0.74); g.closePath(); }, 1.5);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + w * 0.38, by - h * 0.815, 2.6, 0, Math.PI * 2); g.fill();
  });
  if (kind === 'barracks') return art('f_wok', 2.8, 2.4, (g, w, h) => {
    const cx = w / 2, by = h - 6, r = w * 0.4;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(cx, by, r * 1.2, r * 0.32, 0, 0, Math.PI * 2); g.fill();
    // upside-down wok dome
    const dg = g.createRadialGradient(cx - r * 0.35, by - r * 0.9, r * 0.1, cx, by - r * 0.4, r * 1.2); dg.addColorStop(0, '#9aa3b0'); dg.addColorStop(0.55, '#5e6672'); dg.addColorStop(1, '#3a404a');
    outlined(g, dg, () => { g.beginPath(); g.ellipse(cx, by - r * 0.1, r, r * 0.95, 0, Math.PI, 0); g.ellipse(cx, by - r * 0.1, r, r * 0.26, 0, 0, Math.PI); g.closePath(); }, 2.6);
    // rim + handles
    outlined(g, '#2e333b', () => { g.beginPath(); g.ellipse(cx, by - r * 0.1, r * 1.08, r * 0.28, 0, 0, Math.PI * 2); }, 2);
    g.fillStyle = '#5e6672'; g.beginPath(); g.ellipse(cx, by - r * 0.14, r * 0.98, r * 0.2, 0, Math.PI, 0); g.fill();
    for (const s of [-1, 1]) outlined(g, '#8a5a2a', () => { g.beginPath(); g.roundRect ? g.roundRect(cx + s * r * 1.05 - (s < 0 ? r * 0.32 : 0), by - r * 0.22, r * 0.32, r * 0.12, 4) : g.rect(cx + s * r * 1.05 - (s < 0 ? r * 0.32 : 0), by - r * 0.22, r * 0.32, r * 0.12); }, 1.6);
    // door
    outlined(g, '#1e1410', () => { g.beginPath(); g.moveTo(cx - r * 0.28, by - r * 0.05); g.lineTo(cx - r * 0.28, by - r * 0.45); g.arc(cx, by - r * 0.45, r * 0.28, Math.PI, 0); g.lineTo(cx + r * 0.28, by - r * 0.05); g.closePath(); }, 2);
    g.fillStyle = '#ffd84a'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * r * 0.1, by - r * 0.35, r * 0.05, r * 0.03, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(cx - r * 0.45, by - r * 0.65, r * 0.2, r * 0.1, -0.7, 0, Math.PI * 2); g.fill();
    // knob + banner
    outlined(g, '#2e333b', () => { g.beginPath(); g.ellipse(cx, by - r * 1.06, r * 0.14, r * 0.07, 0, 0, Math.PI * 2); }, 1.6);
    g.strokeStyle = '#4a2e14'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(cx, by - r * 1.06); g.lineTo(cx, by - r * 1.6); g.stroke();
    outlined(g, '#e0352a', () => { g.beginPath(); g.moveTo(cx, by - r * 1.6); g.quadraticCurveTo(cx + r * 0.35, by - r * 1.66, cx + r * 0.5, by - r * 1.52); g.quadraticCurveTo(cx + r * 0.3, by - r * 1.42, cx, by - r * 1.36); g.closePath(); }, 1.5);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + r * 0.22, by - r * 1.5, 2.8, 0, Math.PI * 2); g.fill();
  });
  if (kind === 'catapult') return art('f_cata', 2.2, 2.2, (g, w, h) => {
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(w / 2, h - 6, w * 0.4, w * 0.12, 0, 0, Math.PI * 2); g.fill();
    if (ready(IMG.catapult_prop)) drawAt(IMG.catapult_prop, w / 2, h - 4, w * 0.92);
    else if (ready(IMG.k_cart)) drawAt(IMG.k_cart, w / 2, h - 4, w * 0.8);
  });
  if (kind === 'fortress') return art('f_fort', 6.2, 5.6, (g, w, h) => {
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(w / 2, h - 10, w * 0.46, w * 0.12, 0, 0, Math.PI * 2); g.fill();
    if (ready(IMG.castle)) drawAt(IMG.castle, w / 2, h - 6, w * 0.95);
    // pot helmets on the turrets + cat banners
    drawItem('it_pot', w * 0.2, h * 0.2, w * 0.17, Math.PI); drawItem('it_pot', w * 0.8, h * 0.2, w * 0.17, Math.PI);
    for (const x of [0.31, 0.69]) {
      outlined(g, '#e0352a', () => { g.beginPath(); g.moveTo(w * x - 9, h * 0.45); g.lineTo(w * x + 9, h * 0.45); g.lineTo(w * x + 9, h * 0.66); g.lineTo(w * x, h * 0.61); g.lineTo(w * x - 9, h * 0.66); g.closePath(); }, 1.6);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(w * x, h * 0.52, 3.2, 0, Math.PI * 2); g.fill(); for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(w * x - 4 + k * 4, h * 0.485, 1.4, 0, Math.PI * 2); g.fill(); }
    }
  });
  return null;
}
function campArt() {
  return art('duck_camp', 3.6, 3.2, (g, w, h) => {
    const cx = w / 2, by = h - 6;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(cx, by, w * 0.46, w * 0.14, 0, 0, Math.PI * 2); g.fill();
    // log palisade ring behind
    for (let k = -6; k <= 6; k++) { const x = cx + k * w * 0.07, yb = by - 6 - Math.abs(k) * 1.2; outlined(g, k % 2 ? '#b07a40' : '#c48a4a', () => { g.beginPath(); g.moveTo(x - 6, yb); g.lineTo(x - 6, yb - h * 0.2); g.lineTo(x, yb - h * 0.25); g.lineTo(x + 6, yb - h * 0.2); g.lineTo(x + 6, yb); g.closePath(); }, 1.5); }
    if (ready(IMG.it_tent)) drawAt(IMG.it_tent, cx, by - 2, w * 0.66);
    duckFlag(g, cx + w * 0.26, by - h * 0.62); duckFlag(g, cx - w * 0.28, by - h * 0.5, '#ff9a3a');
  });
}

// ---------- start / end ----------
function startExpedition() {
  SFX.init(); SFX.play('horn');
  closeSheet && closeSheet();
  newExpedition();
  state = 'exp';
  hide('tdUi'); hide('result');
  buildExpUi(); renderExpUi();
  X.banner = 2.6; X.bannerTxt = xt("ออกศึก!");
  if (!save.rallySeen && window.MoltRally) playRally();
}
// the chief's rally speech (first march only; replay from the pause menu)
function playRally(back) {
  X.phase = 'rally'; X.rallyBack = back || 'intro'; hide('expUi');
  MoltRally.start(() => {
    save.rallySeen = true; persist();
    if (!X) return;
    X.phase = X.rallyBack; show('expUi');
    if (X.phase === 'intro') { X.introT = 0; X.banner = 2.6; SFX.play('horn'); }
    else X.paused = false;
  });
}
function endExpedition(won) {
  if (X.phase === 'won' || X.phase === 'lost') return;
  if (won) {
    X.phase = 'won'; X.endT = 0; SFX.play('fanfare');
    X.banner = 3; X.bannerTxt = xt("ยึดป้อมแมวได้แล้ว!");
    for (const c of X.cats) if (c.hp > 0) { c.flee = true; }
    for (let i = 0; i < 70; i++) confetto(X.forts.find(f => f.kind === 'fortress'));
  } else {
    X.phase = 'lost'; X.endT = 0; SFX.play('lose');
    X.banner = 2.5; X.bannerTxt = xt("ค่ายใหญ่พังแล้ว! 😿");
  }
}
// stars: keep the war camp healthy AND win quickly
function expStars() { const r = X.camp.hp / X.camp.max, t = X.t; return r >= 0.75 && t <= 220 ? 3 : r >= 0.35 && t <= 340 ? 2 : 1; }
function showExpResult() {
  try { localStorage.removeItem('molt_trace'); } catch (e) {}
  const won = X.phase === 'won', st = expStars();
  let bonus = 0;
  if (won) {
    bonus = Math.round((120 + T.wave * 22) * (0.6 + st * 0.2));
    save.coins += bonus; X.earned += bonus; T.lastStars = st;
  }
  $('rTitle').textContent = won ? xt("ชนะวันที่ {0}! {1}", T.wave, '⭐'.repeat(st)) : xt("ค่ายใหญ่พังแล้ว! 😿");
  $('rTitle').style.color = won ? '#ffd84a' : '#ff7a7a';
  $('rInfo').textContent = won ? xt("ล้มแมว {0} ตัว • พังป้อม {1} หลัง • โบนัส 🪙{2}", X.killed, X.smashed, bonus) : xt("ล้มแมว {0} ตัว • พังป้อม {1} หลัง", X.killed, X.smashed);
  $('rCoins').textContent = X.earned;
  const ab = $('adBtn'), nx = $('next'), earned = X.earned;
  ab.classList.remove('hidden');
  if (won) {
    T.wave++;
    ab.innerHTML = tr("🎬 ดูโฆษณา รับ x3<small>+🪙{0} เพิ่ม</small>", earned * 2);
    ab.onclick = () => Ads.show(ok => { if (!ok) return; save.coins += earned * 2; persist(); SFX.play('reward'); $('rCoins').textContent = earned * 3; ab.classList.add('hidden'); toast(tr("ได้เหรียญ x3! +🪙{0}", earned * 2)); });
    nx.textContent = xt("▶ กลับเมืองเป็ด");
    nx.onclick = () => { hide('result'); leaveExpedition(); };
    if (st >= 3 && typeof openChest === 'function') setTimeout(() => { try { openChest(() => {}); } catch (e) {} }, 400);
  } else {
    ab.classList.toggle('hidden', X.revived);
    ab.innerHTML = xt("🎬 ดูโฆษณา สู้ต่อ!<small>ซ่อมค่ายใหญ่เต็ม แล้วสู้ต่อ</small>");
    ab.onclick = () => Ads.show(ok => { if (ok) reviveExpedition(); });
    nx.textContent = xt("🔁 ออกศึกใหม่");
    nx.onclick = () => { hide('result'); startExpedition(); };
  }
  persist();
  hide('expUi'); show('result'); state = 'expresult';
}
function reviveExpedition() {
  SFX.play('reward'); X.revived = true; X.phase = 'fight';
  X.camp.hp = X.camp.max;
  for (const c of X.cats) if (c.hp > 0 && c.y < X.camp.y + 9) { c.y += 6; c.idx = nearestIdx(c.x, c.y); burst(c.x, c.y, ['#bfe6ff', '#fff'], 6, 3); }
  hide('result'); show('expUi'); state = 'exp'; X.shake = 0.3;
  toast(xt("สู้ต่อ! ค่ายใหญ่ซ่อมเต็มแล้ว"));
}
function leaveExpedition() {
  try { localStorage.removeItem('molt_trace'); } catch (e) {}
  closeExpModal(); hide('expUi'); releaseTiles(); X = null;
  persist(); enterTD(); renderTdHud();
}

// ---------- building ----------
// building costs the same 🪙 coins the city uses, so saved-up coins (and ads) really matter; the first hut is free
function buildCost() { if (!X.builds) return 0; return Math.min(900, Math.round((25 + (X.builds - 1) * 10) * (1 + (dayN() - 1) * 0.06))); }
function pickNextType() {
  const pool = X.unlocked.filter(t => t !== 'tower' && t !== 'shrine' || X.huts.filter(h => h.type === t).length < 2);
  const counts = t => X.huts.filter(h => h.type === t && h.hp > 0).length;
  let best = null, bw = -1;
  for (const t of pool) { const w = Math.random() * (1 / (1 + counts(t))) + (t === X.lastCardType ? 0.35 : 0); if (w > bw) { bw = w; best = t; } }
  X.nextType = best || 'chop';
}
function freeSlot() {
  for (let g = X.groups.length - 1; g >= 0; g--) { if (!X.groups[g].open) continue; const free = X.groups[g].slots.filter(s => !s.hut); if (free.length) return free[Math.floor(Math.random() * free.length)]; }
  return null;
}
function doBuild() {
  if (!X || X.phase !== 'fight' || X.paused) return;
  if (X.tutStep && X.tutStep.wait !== 'build' && !X.tutStep.run) return;
  const cost = buildCost();
  if (save.coins < cost) { SFX.play('gateBad'); toast(xt("เหรียญไม่พอ — ดูโฆษณารับเหรียญได้")); pulseBuild(); pulseAd(); return; }
  const s = freeSlot(); if (!s) { SFX.play('gateBad'); toast(xt("ไม่มีที่ว่างให้สร้าง — ทำลายป้อมแมวข้างหน้าก่อน")); return; }
  save.coins -= cost; X.spent += cost; X.builds++; persist();
  if (cost > 0) floatText(s.x, s.y + 3.1, '-' + cost + '🪙', '#ffd84a');
  const type = X.nextType, H0 = HUTS[type], hp = Math.round(H0.hp * (1 + X.lv[type] * 0.3));
  const hut = { type, x: s.x, y: s.y, slot: s, hp, max: hp, spawnT: 0.6, cd: 0.5, pop: 0, hit: 0, aim: 0, shootT: 0 };
  s.hut = hut; X.huts.push(hut);
  SFX.play('wood'); setTimeout(() => SFX.play('upgrade'), 120);
  dust(s.x, s.y, 14); sparkle(s.x, s.y, 12);
  floatText(s.x, s.y + 2.4, xt(HUTS[type].name), '#fff6b0');
  if (X.builds === 2 || (X.builds > 2 && (X.builds - 2) % 3 === 0)) X.cardDue = true;
  pickNextType(); renderExpUi();
}

function cardCoins() { return Math.round(150 * (1 + (dayN() - 1) * 0.1)); }
function adCoins() { return Math.max(150, buildCost() * 3); }
function pulseAd() { const b = $('xAd'); if (!b || b.classList.contains('hidden')) return; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
function watchAdForCoins() {
  if (!X || X.phase !== 'fight') return;
  const amt = adCoins(); SFX.play('click');
  Ads.show(ok => { if (!ok || !X) return; save.coins += amt; persist(); SFX.play('reward'); toast(xt("ได้เหรียญ +🪙{0}", amt)); for (let i = 0; i < 8; i++) coinPop(X.camp.x, X.camp.y); renderExpUi(); });
}
function pulseBuild() { const b = $('xBuild'); if (!b) return; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }

// ---------- upgrade cards ----------
function cardChoices() {
  const out = [], all = ['fork', 'chili', 'spoon', 'tower', 'shrine'];
  const locked = all.filter(t => !X.unlocked.includes(t));
  const R = () => Math.random();
  if (locked.length) { const t = locked[Math.floor(R() * Math.min(locked.length, X.cardsTaken < 2 ? 2 : locked.length))]; out.push({ kind: 'new', type: t }); }
  if (locked.length > 1 && R() < 0.55) { const t = locked.filter(q => q !== out[0].type)[Math.floor(R() * (locked.length - 1))]; out.push({ kind: 'new', type: t }); }
  const pool = [];
  for (const t of X.unlocked) { pool.push({ kind: 'power', type: t }); if (HUTS[t].unit) pool.push({ kind: 'fast', type: t }); }
  if (X.camp.hp < X.camp.max * 0.8) pool.push({ kind: 'repair' });
  pool.push({ kind: 'coins' });
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  return out;
}
function cardText(c) {
  if (c.kind === 'new') return { title: xt(HUTS[c.type].name), sub: xt(HUTS[c.type].desc), tag: xt("ใหม่"), type: c.type };
  if (c.kind === 'power') return { title: xt(HUTS[c.type].name), sub: xt("พลัง +30%") + ` (Lv${X.lv[c.type] + 2})`, type: c.type };
  if (c.kind === 'fast') return { title: xt(HUTS[c.type].name), sub: xt("ผลิตไวขึ้น 25%"), type: c.type };
  if (c.kind === 'repair') return { title: xt("ซ่อมค่ายใหญ่"), sub: xt("ฟื้นพลังค่ายใหญ่ 50%"), type: 'camp' };
  return { title: xt("ถุงเหรียญ"), sub: xt("รับ 🪙{0} ทันที", cardCoins()), type: 'coins' };
}
function openCards() {
  X.cardDue = false; X.paused = true; SFX.play('chestOpen');
  const list = cardChoices();
  const m = expModal(`<div class="xribbon">${xt("อัปเกรด!")}</div><div class="xcards"></div><div class="xsub">${xt("เลือก 1 ใบ")}</div>`, 'cards');
  const box = m.querySelector('.xcards');
  list.forEach((c, i) => {
    const t = cardText(c), el = document.createElement('button'); el.className = 'xcard' + (c.kind === 'new' ? ' new' : ''); el.style.animationDelay = (i * 0.09) + 's';
    el.innerHTML = (t.tag ? `<i>${t.tag}</i>` : '') + `<canvas width="120" height="120"></canvas><b>${t.title}</b><small>${t.sub}</small>`;
    const cv2 = el.querySelector('canvas'); cardIcon(cv2, t.type);
    el.onclick = () => { SFX.play('upgrade'); takeCard(c); closeExpModal(); X.paused = false; renderExpUi(); };
    box.appendChild(el);
  });
}
function takeCard(c) {
  X.cardsTaken++;
  if (c.kind === 'new') { X.unlocked.push(c.type); X.nextType = c.type; X.lastCardType = c.type; }
  else if (c.kind === 'power') { X.lv[c.type]++; for (const h of X.huts) if (h.type === c.type) { const k = 1.3; h.max = Math.round(h.max * k); h.hp = Math.round(h.hp * k); } for (const d of X.ducks) if (d.type === c.type) { d.max *= 1.3; d.hp *= 1.3; } X.lastCardType = c.type; }
  else if (c.kind === 'fast') { X.fast[c.type]++; X.lastCardType = c.type; }
  else if (c.kind === 'repair') { X.camp.hp = Math.min(X.camp.max, X.camp.hp + X.camp.max * 0.5); sparkle(X.camp.x, X.camp.y, 20); }
  else { const c = cardCoins(); save.coins += c; X.earned += c; persist(); floatText(X.camp.x, X.camp.y + 3, '+' + c + '🪙', '#ffd84a'); for (let i = 0; i < 6; i++) coinPop(X.camp.x, X.camp.y); }
}
function cardIcon(cv2, type) {
  const g = cv2.getContext('2d'), keep = ctx;
  g.clearRect(0, 0, 120, 120);
  try {
    ctx = g;
    if (type === 'coins') { g.font = '64px system-ui'; g.textAlign = 'center'; g.fillText('💰', 60, 84); }
    else if (type === 'camp') { const c = campArt(); g.drawImage(c, 60 - 50, 112 - 50 * c.ch / c.cw * 2, 100, 100 * c.ch / c.cw); }
    else {
      const c = hutArt(type), sc = Math.min(100 / c.cw, 104 / c.ch);
      g.drawImage(c, 60 - c.cw * sc / 2, 114 - c.ch * sc, c.cw * sc, c.ch * sc);
      const u = HUTS[type].unit; if (u) duckSprite(u, 92, 116, 46, 0, 0, false, 0);
      if (type === 'tower') duckSprite('fork', 60, 52, 40, 0, 0, false, 0);
    }
  } finally { ctx = keep; }
}

// ---------- units ----------
function spawnDuck(h) {
  const B = DUCKS[h.type === 'tower' ? 'fork' : HUTS[h.type].unit], lv = X.lv[h.type], k = (1 + lv * 0.3) * X.power;
  const idx = nearestIdx(h.x, h.y);
  const d = { side: 'duck', type: HUTS[h.type].unit, x: h.x + (Math.random() - 0.5) * 0.3, y: h.y - 0.3, idx, off: (Math.random() - 0.5) * 1.4, hp: B.hp * k, max: B.hp * k, dmg: B.dmg * k, B, cd: Math.random() * 0.5, atkT: 0, walk: Math.random() * 4, face: h.x > X.path[idx].x ? -1 : 1, hut: h, hitT: 0, scan: Math.random() * 0.2, target: null, born: 0 };
  X.ducks.push(d); h.pop = 0.35; return d;
}
function spawnCat(kind, x, y) {
  const B = CATS[kind], m = kind === 'chief' ? X.hpMul : X.hpMul;
  const c = { side: 'cat', kind, x, y, idx: nearestIdx(x, y), off: (Math.random() - 0.5) * 1.3, hp: B.hp * m, max: B.hp * m, dmg: B.dmg * X.dmgMul, B, cd: Math.random() * 0.6, atkT: 0, walk: Math.random() * 4, hitT: 0, scan: Math.random() * 0.2, target: null, gear: catGearX(kind), walkDistance: 0, st: 'walk', mx: 0, my: 1, squash: 0, ph: Math.random() * 6, born: 0 };
  X.cats.push(c); return c;
}
function raidKind(n) {
  const r = Math.random();
  if (n >= 7 && r < 0.1) return 'steel';
  if (n >= 5 && r < 0.22) return 'shadow';
  if (n >= 3 && r < 0.38) return 'knight';
  if (r < 0.12 + n * 0.01) return 'tank';
  if (r < 0.55) return r < 0.4 ? 'ninja' : 'pitcher';
  return 'cat';
}
function catGearX(kind) {
  if (kind === 'pitcher') return { hat: 'h_catberet', wpn: 'it_skewer' };
  if (kind === 'chief') return { hat: 'it_chefhat', wpn: 'it_pan' };
  try { return catGear(kind === 'cat' ? 'basic' : kind); } catch (e) { return { hat: 'it_pot', wpn: 'it_spatula' }; }
}
function alive(o) { return o && o.hp > 0; }
function dist(a, b) { return Math.hypot(a.x - b.x, (a.y - b.y)); }

function findDuckTarget(d) {
  const reach = d.B.range + (d.B.range > 2 ? 1.2 : 2.6);
  let best = null, bd = reach;
  for (const c of X.cats) { if (c.hp <= 0 || c.flee) continue; const q = dist(d, c); if (q < bd) { bd = q; best = c; } }
  if (best) return best;
  bd = reach + 0.8;
  for (const f of X.forts) { if (!f.alive) continue; const q = dist(d, f) - fortRad(f); if (q < bd) { bd = q; best = f; } }
  return best;
}
function findCatTarget(c) {
  const reach = c.B.range + (c.B.range > 2 ? 1.2 : 2.4);
  let best = null, bd = reach;
  if (c.B.hunter) { bd = 4.5; for (const h of X.huts) { if (h.hp <= 0) continue; const q = dist(c, h); if (q < bd) { bd = q; best = h; } } if (best) return best; bd = reach; }
  for (const d of X.ducks) { if (d.hp <= 0) continue; const q = dist(c, d); if (q < bd) { bd = q; best = d; } }
  if (best) return best;
  bd = reach + 0.6;
  for (const h of X.huts) { if (h.hp <= 0) continue; const q = dist(c, h) - 0.7; if (q < bd) { bd = q; best = h; } }
  if (!best && dist(c, X.camp) - 1.4 < reach + 0.6) best = X.camp;
  return best;
}
function fortRad(f) { return f.kind === 'fortress' ? 2.2 : f.kind === 'barracks' ? 1.1 : 0.8; }
function targetRad(t) { return t.kind ? fortRad(t) : t === X.camp ? 1.4 : t.slot ? 0.7 : 0.25; }

function moveUnit(u, dt, dir) {
  const P = X.path, sp = u.B.speed * (u.slowT > 0 ? 0.5 : 1);
  let tx, ty;
  if (u.target && alive(u.target)) {
    const r = targetRad(u.target) + u.B.range * 0.92, dd = dist(u, u.target);
    if (dd <= r) { u.moving = false; return; }
    tx = u.target.x; ty = u.target.y;
  } else {
    u.idx = nearestIdx(u.x, u.y, u.idx);
    const j = Math.max(0, Math.min(P.length - 1, u.idx + dir * 6)), p = P[j];
    tx = p.x + p.nx * u.off * 0.7; ty = p.y + p.ny * u.off * 0.7;
  }
  const dx = tx - u.x, dy = ty - u.y, l = Math.hypot(dx, dy) || 1;
  u.x += dx / l * sp * dt; u.y += dy / l * sp * dt; u.moving = true; u.walk += dt * sp * 2.6;
  if (Math.abs(dx) > 0.05) u.face = dx > 0 ? 1 : -1;
  u.mx = dx / l; u.my = -dy / l; // (screen-space: walking up the map = moving up the screen)
  u.walkDistance = (u.walkDistance || 0) + sp * dt;
}
function separate(list) {
  for (let i = 0; i < list.length; i++) { const a = list[i]; if (a.hp <= 0) continue;
    for (let j = i + 1; j < list.length; j++) { const b = list[j]; if (b.hp <= 0) continue; const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy; if (d2 > 0.36 || d2 < 1e-6) continue; const d = Math.sqrt(d2), push = (0.6 - d) * 0.5; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; } }
}
// long battles: the ducks get fired up (so a stalemate always ends) and kill coins taper off (no farming)
function rageMul() { return X.t > 240 ? 1 + (X.t - 240) / 150 : 1; }
function coinMul() { return X.t > 300 ? Math.max(0.3, 1 - (X.t - 300) / 300) : 1; }
function hurt(t, dmg, from) {
  if (!alive(t)) return;
  if (from && from.side !== 'cat' && (t.side === 'cat' || (t.kind && FORTS[t.kind]))) dmg *= rageMul();
  t.hp -= dmg; t.hitT = 0.18; if (t.squash !== undefined) t.squash = 0.6;
  // damage numbers: at most a few per second per target, so big brawls stay readable
  t.dmgAcc = (t.dmgAcc || 0) + dmg;
  if (X.t - (t.lastFloat || -9) > 0.45 || t.hp <= 0) { floatText(t.x + (Math.random() - 0.5) * 0.4, t.y + (t.kind && FORTS[t.kind] ? 2 : t.kind === 'chief' ? 2.2 : 1.3), '-' + Math.max(1, Math.round(t.dmgAcc)), t.side === 'duck' || t.slot || t === X.camp ? '#ff9a9a' : '#fff'); t.lastFloat = X.t; t.dmgAcc = 0; }
  if (t === X.camp) { X.shake = Math.max(X.shake, 0.12); if (t.hp <= 0) { t.hp = 0; endExpedition(false); } return; }
  if (t.hp > 0) return;
  // something died
  if (t.side === 'cat') {
    X.killed++; const coin = Math.max(1, Math.round(t.B.coin * (1 + (dayN() - 1) * 0.08) * coinMul())); X.earned += coin; save.coins += coin;
    floatText(t.x, t.y + 1.8, '+' + coin + '🪙', '#ffd84a'); coinPop(t.x, t.y); throttle('meow', 0.35);
    t.deadT = 0; if (t.kind === 'chief') { X.shake = 0.5; SFX.play('bossRoar'); }
  } else if (t.side === 'duck') { t.deadT = 0; throttle('quack', 0.3); }
  else if (t.kind && FORTS[t.kind]) {
    t.alive = false; X.smashed++; const coin = Math.round((t.kind === 'fortress' ? 60 : 18) * (1 + (dayN() - 1) * 0.1)); X.earned += coin; save.coins += coin;
    floatText(t.x, t.y + 2.6, '+' + coin + '🪙', '#ffd84a'); for (let i = 0; i < 6; i++) coinPop(t.x, t.y);
    X.rubble.push({ x: t.x, y: t.y, t: 0, big: t.kind === 'fortress' }); dust(t.x, t.y, 26); debris(t.x, t.y, 18);
    X.shake = Math.max(X.shake, t.kind === 'fortress' ? 0.6 : 0.3); SFX.play('break'); setTimeout(() => SFX.play('thud'), 90);
    if (t.kind === 'fortress') endExpedition(true); else checkUnlocks();
  } else if (t.slot) {
    t.slot.hut = null; dust(t.x, t.y, 16); debris(t.x, t.y, 10); SFX.play('crack'); X.rubble.push({ x: t.x, y: t.y, t: 0, small: true });
  }
}
function checkUnlocks() {
  for (let g = 1; g < X.groups.length; g++) {
    const grp = X.groups[g]; if (grp.open) continue;
    if (X.forts.every(f => !f.alive || f.y > grp.y + 1.5 || f.kind === 'fortress')) {
      grp.open = true; X.banner = 2; X.bannerTxt = xt("เปิดพื้นที่สร้างใหม่แล้ว!"); SFX.play('gateGood');
      for (const s of grp.slots) sparkle(s.x, s.y, 8);
    }
  }
}
function fire(from, target, B, dmg, side) {
  const tx = target.x, ty = target.y, d = Math.hypot(tx - from.x, ty - from.y);
  X.shots.push({ x: from.x, y: from.y, z: from.z || 0.9, tx, ty, t: 0, dur: Math.max(0.22, d / (B.arc ? 6.5 : 11)), img: B.shot, arc: !!B.arc, splash: B.splash || 0, dmg, side, target });
  throttle(B.arc ? 'fire' : B.shot === 'it_fork' ? 'xbow' : 'shoot', 0.09);
}
function landShot(s) {
  if (s.splash) {
    const list = s.side === 'duck' ? X.cats.concat(X.forts.filter(f => f.alive)) : X.ducks.concat(X.huts.filter(h => h.hp > 0), [X.camp]);
    for (const t of list) if (alive(t) && Math.hypot(t.x - s.tx, t.y - s.ty) < s.splash + targetRad(t) * 0.6) hurt(t, s.dmg, s);
    splat(s.tx, s.ty, s.img === 'it_chili' ? ['#ff3a1a', '#ff8a1a', '#ffd04a'] : ['#fff', '#bbb'], 12); throttle('hit', 0.08);
  } else if (alive(s.target) && Math.hypot(s.target.x - s.tx, s.target.y - s.ty) < 1.2 + targetRad(s.target)) { hurt(s.target, s.dmg, s); sparks(s.tx, s.ty, 5); throttle('hit', 0.06); }
}


// ---------- duck support items: egrets that dive and peck, a duck balloon that drops bombs ----------
function itemPower() { return X.power * (1 + (dayN() - 1) * 0.05); }
function bestCluster(r) {
  let best = null, bn = 0;
  for (const c of X.cats) { if (c.hp <= 0 || c.flee) continue; let n = 0; for (const o of X.cats) if (o.hp > 0 && Math.hypot(o.x - c.x, o.y - c.y) < r) n += o.B.boss ? 4 : 1; if (n > bn) { bn = n; best = c; } }
  return best ? { x: best.x, y: best.y, n: bn } : null;
}
function useItemX(k) {
  if (!X || X.phase !== 'fight' || X.paused || X.tutStep) return;
  const it = X.items[k]; if (it.cd > 0) { SFX.play('gateBad'); return; }
  if (k === 'egret') {
    let tgt = bestCluster(2.5); if (!tgt) { const f = X.forts.filter(f => f.alive).sort((a, b) => a.y - b.y)[0]; if (f) tgt = { x: f.x, y: f.y }; }
    if (!tgt) { toast(xt("ยังไม่มีเป้าหมาย")); return; }
    for (let i = 0; i < 2; i++) X.egrets.push({ x: (i ? 7 : -7), y: tgt.y + 3 + i, z: 4.5, tx: tgt.x, ty: tgt.y, st: 'in', t: 0, pecks: 0, peckCd: 0, face: i ? -1 : 1, flap: Math.random() * 6, target: null });
    X.banner = 1.2; X.bannerTxt = xt("นกกระยางมาแล้ว!"); throttle('ufo', 0.5);
  } else {
    let tgt = bestCluster(2.8); if (!tgt) { const f = X.forts.filter(f => f.alive).sort((a, b) => a.y - b.y)[0]; if (f) tgt = { x: f.x, y: f.y }; }
    if (!tgt) { toast(xt("ยังไม่มีเป้าหมาย")); return; }
    X.balloons.push({ x: -6.5, y: tgt.y - 2.5, z: 5, tx: tgt.x, ty: tgt.y, t: 0, drops: 0, dropCd: 0, st: 'in' });
    X.banner = 1.2; X.bannerTxt = xt("บอลลูนทิ้งระเบิด!"); throttle('spin', 0.5);
  }
  it.cd = it.max; SFX.play('upgrade'); renderItemsX();
}
function itemsUpdate(dt) {
  for (const k in X.items) X.items[k].cd = Math.max(0, X.items[k].cd - dt);
  // egrets: swoop in, peck the crowd (each peck stuns), then fly away
  for (const e of X.egrets) {
    e.t += dt; e.flap += dt * (e.st === 'peck' ? 18 : 11);
    if (e.st === 'in') {
      const dx = e.tx - e.x, dy = e.ty - e.y, l = Math.hypot(dx, dy) || 1, v = 8;
      e.x += dx / l * v * dt; e.y += dy / l * v * dt; e.z = Math.max(1.2, e.z - dt * 2.2); e.face = dx >= 0 ? 1 : -1;
      if (l < 0.6) { e.st = 'peck'; e.t = 0; }
    } else if (e.st === 'peck') {
      if (!alive(e.target) || e.target.alive === false || dist(e, e.target) > 4.5) { let bd = 4, b = null; for (const c of X.cats) { if (c.hp <= 0) continue; const q = Math.hypot(c.x - e.tx, c.y - e.ty) + dist(e, c) * 0.5; if (q < bd) { bd = q; b = c; } }
        if (!b) { bd = 4.5; for (const f of X.forts) { if (!f.alive) continue; const q = Math.hypot(f.x - e.tx, f.y - e.ty); if (q < bd) { bd = q; b = f; } } } e.target = b; }
      if (e.target) {
        const dx = e.target.x - e.x, dy = e.target.y - e.y, l = Math.hypot(dx, dy) || 1;
        if (l > 0.45 + (e.target.kind && FORTS[e.target.kind] ? fortRad(e.target) : 0)) { e.x += dx / l * 6 * dt; e.y += dy / l * 6 * dt; e.face = dx >= 0 ? 1 : -1; e.z += (1.0 - e.z) * Math.min(1, dt * 6); }
        e.peckCd -= dt;
        if (l <= 0.6 + (e.target.kind && FORTS[e.target.kind] ? fortRad(e.target) : 0) && e.peckCd <= 0) { e.peckCd = 0.32; e.z = 0.5; e.pecks++; e.peckT = 0.15; hurt(e.target, 16 * itemPower(), e); e.target.stun = 0.5; e.target.slowT = 1.2; sparks(e.target.x, e.target.y, 4); floatText(e.target.x, e.target.y + 1.7, xt("จิก!"), '#bfe6ff'); throttle('bonk', 0.06); if (Math.random() < 0.35) feathers(e.x, e.y); }
      }
      if (e.peckT > 0) e.peckT -= dt;
      if (e.t > 4.2 || e.pecks >= 12) { e.st = 'out'; e.t = 0; feathers(e.x, e.y); }
    } else { e.x += e.face * 7 * dt; e.y += 6 * dt; e.z += dt * 3; if (e.t > 2.5) e.gone = true; }
  }
  X.egrets = X.egrets.filter(e => !e.gone);
  // balloons: drift over the target and drop a stick of bombs
  for (const b of X.balloons) {
    b.t += dt;
    if (b.st === 'in') { const dx = b.tx - b.x, dy = b.ty - b.y, l = Math.hypot(dx, dy) || 1; b.x += dx / l * 3.4 * dt; b.y += dy / l * 3.4 * dt; if (l < 1) { b.st = 'drop'; b.t = 0; } }
    else if (b.st === 'drop') {
      const tgt = bestCluster(2.6); if (tgt) { const dx = tgt.x - b.x, dy = tgt.y - b.y, l = Math.hypot(dx, dy) || 1; if (l > 0.3) { b.x += dx / l * 1.6 * dt; b.y += dy / l * 1.6 * dt; } }
      b.dropCd -= dt;
      if (b.dropCd <= 0 && b.drops < 6) { b.dropCd = 0.42; b.drops++; X.bombs.push({ x: b.x + (Math.random() - 0.5) * 0.8, y: b.y + (Math.random() - 0.5) * 0.6, z: b.z - 0.6, vz: 0, spin: Math.random() * 6 }); throttle('shoot', 0.1); }
      if (b.drops >= 6 && b.dropCd <= -0.4) { b.st = 'out'; b.t = 0; }
    } else { b.x += 2.5 * dt; b.y += 3 * dt; b.z += dt * 1.5; if (b.t > 3.5) b.gone = true; }
  }
  X.balloons = X.balloons.filter(b => !b.gone);
  for (const m of X.bombs) {
    m.vz -= 14 * dt; m.z += m.vz * dt; m.spin += dt * 8;
    if (m.z <= 0 && !m.done) {
      m.done = true; const P = itemPower();
      for (const c of X.cats) if (c.hp > 0 && Math.hypot(c.x - m.x, c.y - m.y) < 1.5) { hurt(c, 26 * P, m); c.squash = 1; }
      for (const f of X.forts) if (f.alive && Math.hypot(f.x - m.x, f.y - m.y) < 1.4 + fortRad(f)) { hurt(f, 40 * P, m); f.hit = 0.25; }
      boom(m.x, m.y); X.shake = Math.max(X.shake, 0.18); throttle('break', 0.12);
    }
  }
  X.bombs = X.bombs.filter(m => !m.done);
}
function feathers(x, y) { for (let i = 0; i < 4; i++) addPart({ x, y, z: 1.2, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5), vz: 1 + Math.random(), t: 0, life: 1.1, col: '#ffffff', size: 5, kind: 'feather' }); }
function boom(x, y) {
  X.fxRings = X.fxRings || []; X.fxRings.push({ x, y, t: 0 });
  for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, v = 2 + Math.random() * 3; addPart({ x, y, z: 0.4, vx: Math.cos(a) * v * 0.5, vy: Math.sin(a) * v * 0.35, vz: 2 + Math.random() * 3, t: 0, life: 0.6, col: ['#ffd04a', '#ff8a1a', '#ff3a1a', '#fff6b0'][i % 4], size: 4 }); }
  dust(x, y, 8);
}
function drawEgret(e) {
  const p = xp(e.x, e.y), s = xk * 1.35, sy = p.y - e.z * xk * 0.8, fl = Math.sin(e.flap);
  ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, s * 0.45, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(p.x, sy); ctx.scale(e.face, 1);
  const lw = Math.max(1.5, s * 0.05); ctx.lineJoin = ctx.lineCap = 'round';
  // legs trailing back
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-s * 0.25, s * 0.08); ctx.lineTo(-s * 0.75, s * 0.2); ctx.moveTo(-s * 0.22, s * 0.12); ctx.lineTo(-s * 0.72, s * 0.28); ctx.stroke();
  // far wing
  ctx.fillStyle = '#e6eef5'; ctx.strokeStyle = '#7a8a9a'; ctx.lineWidth = lw * 0.8;
  ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.02); ctx.quadraticCurveTo(-s * 0.2, -s * 0.55 * fl - s * 0.1, -s * 0.55, -s * 0.75 * fl); ctx.quadraticCurveTo(-s * 0.35, -s * 0.2 * fl, s * 0.12, s * 0.02); ctx.closePath(); ctx.fill(); ctx.stroke();
  // body
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#6a7a8a'; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.36, s * 0.16, -0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // S-neck + head (pecks forward)
  const pk = e.peckT > 0 ? 1 : 0, hx = s * (0.5 + pk * 0.15), hy = -s * (0.32 - pk * 0.3);
  ctx.strokeStyle = '#6a7a8a'; ctx.lineWidth = s * 0.13; ctx.beginPath(); ctx.moveTo(s * 0.25, -s * 0.05); ctx.quadraticCurveTo(s * 0.55, -s * 0.05, s * 0.36, -s * 0.2); ctx.quadraticCurveTo(s * 0.25, -s * 0.32, hx, hy); ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s * 0.09; ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#6a7a8a'; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(hx, hy, s * 0.1, s * 0.08, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffc21a'; ctx.strokeStyle = '#8a5a00'; ctx.beginPath(); ctx.moveTo(hx + s * 0.07, hy - s * 0.03); ctx.lineTo(hx + s * 0.42, hy + s * 0.02 + pk * s * 0.08); ctx.lineTo(hx + s * 0.07, hy + s * 0.04); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(hx + s * 0.03, hy - s * 0.02, s * 0.025, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = lw * 0.8; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(hx - s * 0.06, hy - s * 0.05); ctx.quadraticCurveTo(hx - s * 0.2, hy - s * 0.12 - k * s * 0.03, hx - s * 0.32, hy - s * 0.02 + k * s * 0.03); ctx.stroke(); }   // head plumes
  // near wing
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#6a7a8a'; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.05); ctx.quadraticCurveTo(-s * 0.05, -s * 0.7 * fl - s * 0.1, -s * 0.45, -s * 0.95 * fl); ctx.quadraticCurveTo(-s * 0.3, -s * 0.3 * fl, s * 0.2, s * 0.02); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c9d6e2'; ctx.beginPath(); ctx.moveTo(-s * 0.45, -s * 0.95 * fl); ctx.lineTo(-s * 0.3, -s * 0.62 * fl); ctx.lineTo(-s * 0.2, -s * 0.7 * fl - s * 0.04); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawBalloon(b) {
  const p = xp(b.x, b.y), s = xk * 1.25, sy = p.y - b.z * xk * 0.8, sway = Math.sin(X.t * 1.6 + b.t) * 0.05;
  ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, s * 0.6, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(p.x, sy); ctx.rotate(sway);
  const by = s * 0.95;   // basket
  ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.6; for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k * s * 0.42, -s * 0.05); ctx.lineTo(k * s * 0.22, by - s * 0.05); ctx.stroke(); }
  if (SPRITE_OK()) { ctx.save(); ctx.translate(0, by - s * 0.02); drawFrame('k_duck_walk', 0, 0, 0, s * 0.62, false); drawItem('it_pot', s * 0.02, -s * 0.6, s * 0.28, 0.1); ctx.restore(); }
  const bg = ctx.createLinearGradient(-s * 0.25, 0, s * 0.25, 0); bg.addColorStop(0, '#a8763a'); bg.addColorStop(0.5, '#d9a35a'); bg.addColorStop(1, '#a8763a');
  ctx.fillStyle = bg; ctx.strokeStyle = '#4a2e14'; ctx.lineWidth = 2; roundRect(-s * 0.25, by - s * 0.1, s * 0.5, s * 0.3, 5); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(80,50,20,.5)'; ctx.lineWidth = 1; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-s * 0.25 + k * s * 0.125, by - s * 0.1); ctx.lineTo(-s * 0.25 + k * s * 0.125, by + s * 0.2); ctx.stroke(); }
  // flame
  ctx.fillStyle = `rgba(255,${150 + Math.floor(Math.random() * 60)},40,.9)`; ctx.beginPath(); ctx.ellipse(0, -s * 0.02, s * 0.06, s * 0.12 + Math.random() * s * 0.04, 0, 0, Math.PI * 2); ctx.fill();
  // envelope with stripes
  const cols = ['#ffd23a', '#ff7a2a', '#ffd23a', '#ff4a5a', '#ffd23a', '#ff7a2a'];
  ctx.save(); ctx.beginPath(); ctx.moveTo(-s * 0.25, -s * 0.05); ctx.bezierCurveTo(-s * 0.95, -s * 0.55, -s * 0.75, -s * 1.55, 0, -s * 1.55); ctx.bezierCurveTo(s * 0.75, -s * 1.55, s * 0.95, -s * 0.55, s * 0.25, -s * 0.05); ctx.closePath(); ctx.clip();
  for (let k = 0; k < cols.length; k++) { ctx.fillStyle = cols[k]; ctx.fillRect(-s + k * s * 2 / cols.length, -s * 1.6, s * 2 / cols.length + 1, s * 1.6); }
  const sh = ctx.createRadialGradient(-s * 0.3, -s * 1.1, s * 0.05, 0, -s * 0.8, s * 0.9); sh.addColorStop(0, 'rgba(255,255,255,.55)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(80,30,0,.35)'); ctx.fillStyle = sh; ctx.fillRect(-s, -s * 1.6, s * 2, s * 1.6);
  ctx.restore();
  ctx.strokeStyle = '#5a2a0a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-s * 0.25, -s * 0.05); ctx.bezierCurveTo(-s * 0.95, -s * 0.55, -s * 0.75, -s * 1.55, 0, -s * 1.55); ctx.bezierCurveTo(s * 0.75, -s * 1.55, s * 0.95, -s * 0.55, s * 0.25, -s * 0.05); ctx.closePath(); ctx.stroke();
  // duck emblem
  ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(0, -s * 0.85, s * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#5a2a0a'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(0, -s * 0.87, s * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff8a1a'; ctx.beginPath(); ctx.ellipse(s * 0.11, -s * 0.85, s * 0.06, s * 0.03, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(s * 0.04, -s * 0.9, s * 0.02, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function SPRITE_OK() { return ready(IMG.k_duck_walk); }
function drawBomb(m) {
  const p = xp(m.x, m.y), sy = p.y - m.z * xk * 0.8, r = xk * 0.16;
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * (1.2 - Math.min(1, m.z / 5) * 0.6), r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(p.x, sy); ctx.rotate(m.spin * 0.2);
  ctx.fillStyle = '#2a2a33'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, r * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.5, -r * 1.5, r * 0.2, -r * 1.8); ctx.stroke();
  ctx.fillStyle = Math.random() < 0.5 ? '#ffd04a' : '#ff6a1a'; ctx.beginPath(); ctx.arc(r * 0.2, -r * 1.85, r * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawItemsX() {
  if (X.fxRings) { for (const r of X.fxRings) { r.t += 1 / 60; const p = xp(r.x, r.y), u = r.t / 0.45; if (u > 1) continue; ctx.globalAlpha = 1 - u; ctx.fillStyle = '#ffd04a'; ctx.beginPath(); ctx.ellipse(p.x, p.y, xk * (0.4 + u * 1.3), xk * (0.4 + u * 1.3) * XYS * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1; } X.fxRings = X.fxRings.filter(r => r.t < 0.45); }
  for (const m of X.bombs) drawBomb(m);
  for (const e of X.egrets) drawEgret(e);
  for (const b of X.balloons) drawBalloon(b);
}
function renderItemsX() {
  if (!X || !$('xEgret')) return;
  for (const k of ['egret', 'balloon']) {
    const it = X.items[k], b = $(k === 'egret' ? 'xEgret' : 'xBalloon'), f = it.cd / it.max;
    b.style.setProperty('--cd', (f * 360) + 'deg'); b.classList.toggle('ready', it.cd <= 0);
    b.querySelector('em').textContent = it.cd > 0 ? Math.ceil(it.cd) : '';
  }
}
function itemIcon(cv2, k) {
  const g = cv2.getContext('2d'), keep = ctx, keepX = X;
  g.clearRect(0, 0, cv2.width, cv2.height);
  try {
    ctx = g;
    const fake = { camY: 0, t: 0.3 };
    X = Object.assign(Object.create(null), keepX || {}, fake);
    const sx = xk; xk = cv2.width / (k === 'egret' ? 2.6 : 3.4);
    // draw at canvas centre: temporarily map world (0,0) to the middle of the icon
    g.save(); g.translate(cv2.width / 2 - W / 2, cv2.height * (k === 'egret' ? 0.62 : 0.92) - (H - xBot()));
    if (k === 'egret') drawEgret({ x: 0, y: 0, z: 0, face: 1, flap: 1.2 }); else drawBalloon({ x: 0, y: 0, z: 0, t: 0 });
    g.restore(); xk = sx;
  } catch (e) {} finally { ctx = keep; X = keepX; }
}

// ---------- update ----------
function expUpdate(dt) {
  if (!X || state !== 'exp') return;
  if (X.phase === 'rally') { MoltRally.update(dt); return; }
  if (X.tutStep && !X.tutStep.run) { tutCamera(dt); updateFx(dt); X.t += dt * 0.0001; return; }
  if (X.paused) return;
  if (X.cardDue && X.phase === 'fight' && !X.tutStep) { openCards(); return; }
  X.t += dt;
  if (X.banner > 0) X.banner -= dt;
  if (X.shake > 0) X.shake = Math.max(0, X.shake - dt);
  if (X.phase === 'intro') { X.introT += dt; X.camY = Math.max(0, (XL - viewSpan()) * Math.max(0, 1 - X.introT / 2.6) ** 2); if (X.introT > 2.8) { X.phase = 'fight'; X.camY = 0; if (!save.tut || !save.tut.exp) startExpTut(); } updateFx(dt); return; }
  if (X.phase === 'won' || X.phase === 'lost') { X.endT += dt; updateFx(dt); for (const c of X.cats) if (c.flee && c.hp > 0) { c.y += dt * 3; c.walk += dt * 6; c.my = -1; } if (X.endT > (X.phase === 'won' ? 2.6 : 1.8)) showExpResult(); return; }
  // huts: train ducks / shoot / heal
  for (const h of X.huts) {
    if (h.hp <= 0) continue; h.pop = Math.max(0, h.pop - dt); h.hit = Math.max(0, h.hit - dt);
    const H0 = HUTS[h.type];
    if (H0.unit) {
      h.spawnT -= dt;
      const mine = X.ducks.filter(d => d.hut === h && d.hp > 0).length;
      if (h.spawnT <= 0 && mine < H0.cap && X.ducks.length < 46) { spawnDuck(h); h.spawnT = H0.every / (1 + X.fast[h.type] * 0.25); }
      else if (h.spawnT <= 0) h.spawnT = 0.5;
    } else if (H0.tower) {
      h.cd -= dt; h.shootT = Math.max(0, h.shootT - dt);
      if (h.cd <= 0) { let best = null, bd = H0.range; for (const c of X.cats) { if (c.hp <= 0) continue; const q = dist(h, c); if (q < bd) { bd = q; best = c; } } if (best) { fire({ x: h.x, y: h.y + 0.2, z: 2.2 }, best, { shot: 'it_fork' }, H0.dmg * (1 + X.lv.tower * 0.3) * X.power, 'duck'); h.cd = H0.cd; h.shootT = 0.3; h.aim = best.x < h.x ? -1 : 1; } else h.cd = 0.25; }
    } else if (H0.heal) {
      for (const d of X.ducks) if (d.hp > 0 && d.hp < d.max && dist(d, h) < H0.range) { d.hp = Math.min(d.max, d.hp + H0.heal * (1 + X.lv.shrine * 0.3) * dt); if (Math.random() < dt * 2) X.parts.push({ x: d.x, y: d.y, z: 1, vx: 0, vy: 0, vz: 1.2, t: 0, life: 0.7, col: '#8dff6a', size: 3, kind: 'plus' }); }
    }
  }
  // the war camp defends itself a little
  X.camp.cd -= dt;
  if (X.camp.cd <= 0) { let best = null, bd = 4.2; for (const c of X.cats) { if (c.hp <= 0) continue; const q = dist(X.camp, c); if (q < bd) { bd = q; best = c; } } if (best) { fire({ x: X.camp.x, y: X.camp.y + 0.3, z: 2 }, best, { shot: 'it_chopsticks' }, 6 * X.power, 'duck'); X.camp.cd = 1.0; } else X.camp.cd = 0.3; }
  // cat forts
  const frontY = X.ducks.reduce((m, d) => d.hp > 0 ? Math.max(m, d.y) : m, X.camp.y + 4);
  X.front += (frontY - X.front) * Math.min(1, dt * 2);
  for (const f of X.forts) {
    if (!f.alive) continue; f.hit = Math.max(0, f.hit - dt); f.shootT = Math.max(0, f.shootT - dt);
    const F = FORTS[f.kind], awake = f.y - frontY < 13 || f.zone === 0;
    if (F.range) {
      f.cd -= dt;
      if (f.cd <= 0) {
        let best = null, bd = F.range;
        for (const d of X.ducks) { if (d.hp <= 0) continue; const q = dist(f, d); if (q < bd) { bd = q; best = d; } }
        if (!best) for (const h of X.huts) { if (h.hp <= 0) continue; const q = dist(f, h); if (q < bd) { bd = q; best = h; } }
        if (best) { fire({ x: f.x, y: f.y, z: f.kind === 'pottower' ? 2.6 : f.kind === 'fortress' ? 3 : 1.4 }, best, F, F.dmg * X.dmgMul, 'cat'); f.cd = F.cd; f.shootT = 0.35; f.aim = best.x < f.x ? -1 : 1; } else f.cd = 0.3;
      }
    }
    if (f.kind === 'barracks' && dayN() >= 2 && X.t > 30 && (f.sortieT = (f.sortieT || 0) - dt) <= 0 && X.ducks.some(d => d.hp > 0 && dist(d, f) < 6)) {
      f.sortieT = Math.max(12, 24 - dayN());
      for (let i = 0; i < Math.min(5, 1 + Math.floor(dayN() / 2)); i++) { const c = spawnCat(raidKind(dayN()), f.x + (Math.random() - 0.5) * 1.2, f.y - fortRad(f) - 0.2 - i * 0.3); c.home = f; c.sortie = true; }
      f.shootT = 0.4; throttle('catScared', 0.5);
    }
    if (F.spawn && awake) {
      f.spawnT -= dt;
      const mine = X.cats.filter(c => c.home === f && c.hp > 0).length, cap = f.kind === 'fortress' ? 4 : 3 + (dayN() >= 4 ? 1 : 0);
      if (f.spawnT <= 0 && mine < cap && X.cats.length < 40) {
        const n = dayN(), r = Math.random();
        let kind = 'cat';
        if (f.kind === 'fortress') kind = r < 0.35 ? 'tank' : r < 0.6 ? 'ninja' : r < 0.8 ? 'pitcher' : 'cat';
        else if (n >= 2 && r < 0.18) kind = 'ninja'; else if (n >= 3 && r < 0.32) kind = 'tank'; else if (r < 0.48 && f.zone >= 1) kind = 'pitcher';
        const c = spawnCat(kind, f.x + (Math.random() - 0.5) * 0.6, f.y - fortRad(f) - 0.2); c.home = f;
        f.spawnT = F.spawn * (0.85 + Math.random() * 0.3);
      } else if (f.spawnT <= 0) f.spawnT = 0.8;
    }
    if (f.kind === 'fortress' && !X.bossOut && f.hp < f.max * 0.6) {
      X.bossOut = true; const b = spawnCat('chief', f.x, f.y - 2.6); b.home = f; X.banner = 2.2; X.bannerTxt = xt("ราชาแมวออกมาแล้ว!"); SFX.play('bossRoar'); X.shake = 0.4;
    }
  }
  // every so often the cats send a raiding party down the road
  X.raidT = (X.raidT === undefined ? 36 : X.raidT) - dt;
  if (X.raidT <= 0) {
    const n = dayN(), from = X.forts.filter(f => f.alive).sort((a, b) => a.y - b.y)[0];
    // later days: cats counter-attack sooner, in bigger groups, with knights, steel tanks and shadow hunters
    X.raidT = Math.max(16, 31 - n * 0.9) * (0.85 + Math.random() * 0.3);
    if (from && X.cats.length < 40) {
      const size = Math.min(12, 2 + Math.floor(n * 0.5) + Math.floor(X.t / 90));
      for (let i = 0; i < size; i++) { const c = spawnCat(raidKind(n), from.x + (Math.random() - 0.5) * 1.6, from.y - fortRad(from) - 0.3 - i * 0.35); c.raider = true; }
      X.raids = (X.raids || 0) + 1;
      X.banner = 1.6; X.bannerTxt = n >= 4 && X.raids % 3 === 0 ? xt("แมวบุกใหญ่!!") : xt("แมวบุก!"); throttle('horn', 1); if (n >= 4) X.shake = Math.max(X.shake, 0.15);
    }
  }
  // ducks
  for (const d of X.ducks) {
    if (d.hp <= 0) { d.deadT += dt; continue; }
    d.born += dt; d.hitT = Math.max(0, d.hitT - dt); d.cd -= dt; d.atkT = Math.max(0, d.atkT - dt); d.scan -= dt;
    if (d.scan <= 0 || !alive(d.target) || (d.target.alive === false)) { d.target = findDuckTarget(d); d.scan = 0.25; }
    if (d.target && d.target.alive === false) d.target = null;
    moveUnit(d, dt, +1);
    if (d.target && dist(d, d.target) <= targetRad(d.target) + d.B.range + 0.05 && d.cd <= 0) {
      d.cd = d.B.cd; d.atkT = 0.3; d.face = d.target.x >= d.x ? 1 : -1;
      if (d.B.shot) fire({ x: d.x, y: d.y, z: 0.8 }, d.target, d.B, d.dmg, 'duck');
      else { hurt(d.target, d.dmg, d); sparks(d.target.x, d.target.y, 3); throttle('bonk', 0.07); }
    }
    if (d.y > XL + 1) d.hp = 0;
  }
  // cats
  for (const c of X.cats) {
    if (c.hp <= 0) { c.deadT += dt; continue; }
    c.born += dt; c.hitT = Math.max(0, c.hitT - dt); c.slowT = Math.max(0, (c.slowT || 0) - dt);
    if (c.stun > 0) { c.stun -= dt; c.moving = false; continue; }
    c.cd -= dt; c.atkT = Math.max(0, c.atkT - dt); c.scan -= dt; c.squash = Math.max(0, (c.squash || 0) - dt * 3);
    if (c.scan <= 0 || !alive(c.target)) { c.target = findCatTarget(c); c.scan = 0.25; }
    moveUnit(c, dt, -1); c.st = c.moving ? 'walk' : 'atk';
    if (c.target && dist(c, c.target) <= targetRad(c.target) + c.B.range + 0.05 && c.cd <= 0) {
      c.cd = c.B.cd; c.atkT = 0.45;
      if (c.B.shot) fire({ x: c.x, y: c.y, z: 0.8 }, c.target, c.B, c.dmg, 'cat');
      else { hurt(c.target, c.dmg, c); sparks(c.target.x, c.target.y, 3); throttle('bonk', 0.07); if (c.kind === 'chief') { X.shake = 0.25; for (const d of X.ducks) if (d.hp > 0 && dist(d, c.target) < 1.4 && d !== c.target) hurt(d, c.dmg * 0.5, c); dust(c.target.x, c.target.y, 10); } }
    }
    if (c.y < X.camp.y - 1) c.y = X.camp.y - 1;
  }
  separate(X.ducks); separate(X.cats);
  X.ducks = X.ducks.filter(d => d.hp > 0 || d.deadT < 0.9);
  X.cats = X.cats.filter(c => c.hp > 0 || c.deadT < 0.9);
  X.huts = X.huts.filter(h => h.hp > 0);
  itemsUpdate(dt);
  // shots
  for (const s of X.shots) { s.t += dt; if (s.t >= s.dur && !s.done) { s.done = true; landShot(s); } }
  X.shots = X.shots.filter(s => !s.done);
  updateFx(dt);
  // camera: follow the front unless the player is looking around
  X.camHold = Math.max(0, X.camHold - dt);
  if (X.tutStep && X.tutStep.camY !== undefined) tutCamera(dt);
  else if (!X.drag && X.camHold <= 0) {
    const want = Math.max(0, Math.min(XL + 1 - viewSpan(), X.front - viewSpan() * 0.42));
    X.camY += (want - X.camY) * Math.min(1, dt * 1.6);
  }
  X.uiT = (X.uiT || 0) - dt; if (X.uiT <= 0) { X.uiT = 0.2; renderExpUi(); }
  // crash breadcrumb: if the app dies mid-battle, the welcome screen shows where it happened next time
  X.traceT = (X.traceT || 0) - dt;
  if (X.traceT <= 0) { X.traceT = 2; try { localStorage.setItem('molt_trace', JSON.stringify({ day: T.wave, t: Math.round(X.t), forts: X.forts.filter(f => !f.alive).length + '/' + X.forts.length, cats: X.cats.length, ducks: X.ducks.length, huts: X.huts.length, fx: X.parts.length, mem: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1, at: Date.now() })); } catch (e) {} }
}

// ---------- effects ----------
function updateFx(dt) {
  for (const p of X.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.kind !== 'plus' && p.kind !== 'spark') p.vz -= 9 * dt; if (p.z < 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.6; p.vy *= 0.6; } }
  X.parts = X.parts.filter(p => p.t < p.life);
  for (const f of X.floats) f.t += dt; X.floats = X.floats.filter(f => f.t < 1.1);
  for (const r of X.rubble) r.t += dt;
}
function addPart(o) { if (X.parts.length < 320) X.parts.push(o); }
function burst(x, y, cols, n, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = sp * (0.4 + Math.random()); addPart({ x, y, z: 0.6, vx: Math.cos(a) * v * 0.4, vy: Math.sin(a) * v * 0.4, vz: 2 + Math.random() * 2, t: 0, life: 0.6 + Math.random() * 0.4, col: cols[i % cols.length], size: 3 + Math.random() * 2 }); } }
function sparks(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28; addPart({ x, y, z: 0.7, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, vz: Math.random() * 2, t: 0, life: 0.25, col: i % 2 ? '#fff6b0' : '#ffffff', size: 2.2, kind: 'spark' }); } }
function sparkle(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28; addPart({ x: x + Math.cos(a) * 0.6, y: y + Math.sin(a) * 0.4, z: 0.2, vx: Math.cos(a) * 0.6, vy: Math.sin(a) * 0.4, vz: 2.2 + Math.random() * 1.8, t: 0, life: 0.9, col: ['#fff6b0', '#ffd23a', '#a8fff1', '#ffffff'][i % 4], size: 2.8, kind: 'spark' }); } }
function dust(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28; addPart({ x, y, z: 0.2, vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 0.9, vz: 0.5 + Math.random(), t: 0, life: 0.9, col: 'rgba(225,200,160,.75)', size: 7 + Math.random() * 6, kind: 'dust' }); } }
function debris(x, y, n) { burst(x, y, ['#8a5a2a', '#c08a55', '#7a7f88', '#5e6672'], n, 4); }
function splat(x, y, cols, n) { burst(x, y, cols, n, 3); }
function coinPop(x, y) { addPart({ x, y, z: 1, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1, vz: 4 + Math.random() * 2, t: 0, life: 0.9, col: '#ffd23a', size: 5, kind: 'coin' }); throttle('coin', 0.12); }
function confetto(f) { const x = f ? f.x : 0, y = f ? f.y : XL - 3; const a = Math.random() * 6.28; addPart({ x: x + Math.cos(a) * 2, y: y + Math.sin(a) * 1.5, z: 2 + Math.random() * 2, vx: Math.cos(a) * 1.5, vy: Math.sin(a), vz: 3 + Math.random() * 3, t: 0, life: 2.2, col: ['#ffd23a', '#ff5a7a', '#4ad0ff', '#8dff6a', '#ffffff'][Math.floor(Math.random() * 5)], size: 4, kind: 'conf' }); }
function floatText(x, y, txt, col) { if (X.floats.length > 34) X.floats.shift(); X.floats.push({ x, y, txt, col, t: 0 }); }
function throttle(name, gap) { const now = performance.now() / 1000; if ((X.sndT[name] || 0) > now) return; X.sndT[name] = now + gap; try { SFX.play(name); } catch (e) {} }

// ---------- drawing ----------
function duckSprite(type, x, y, h, walk, atk, moving, hitT) {
  const artName = type === 'fork' ? 'duck_crossbow_art' : type === 'chili' ? 'duck_chili_art' : type === 'spoon' ? 'duck_spoon_art' : null;
  if (artName && ready(IMG[artName])) {
    const fr = atk > 0 ? 1 + Math.floor((0.3 - atk) / 0.1) % 3 : 0;
    drawFrame(artName, fr, x, y, h * 1.12, false);
    return;
  }
  // chopstick duck: plain walking duck with a pot helmet and chopsticks
  const img = atk > 0 ? 'k_duck_act' : 'k_duck_walk', fr = atk > 0 ? (atk > 0.15 ? 0 : 1) : moving ? Math.floor(walk) % 4 : 0;
  if (ready(IMG[img])) drawFrame(img, fr, x, y, h, false);
  drawItem('it_chopsticks', x + h * 0.32, y - h * 0.45, h * 0.5, atk > 0 ? 1.6 - atk * 4 : 0.5);
  drawItem('it_pot', x + h * 0.03, y - h * 0.95, h * 0.42, 0.1);
}
function drawDuck(d) {
  const p = xp(d.x, d.y), h = xk * 0.95;
  if (p.y < -60 || p.y > H + 60) return;
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.24, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(p.x, p.y);
  if (d.hp <= 0) { const k = Math.min(1, d.deadT / 0.5); ctx.globalAlpha = 1 - Math.max(0, d.deadT - 0.5) / 0.4; ctx.rotate(-k * 1.3 * d.face); }
  const pop = d.born < 0.35 ? 1 - Math.exp(-9 * d.born) * Math.cos(16 * d.born) : 1;
  const step = d.moving && d.hp > 0 ? Math.sin(d.walk * Math.PI) * 0.05 : 0, hit = d.hitT > 0 ? 0.15 : 0;
  ctx.scale((d.face < 0 ? -1 : 1) * Math.max(0.05, pop) * (1 - step + hit), Math.max(0.05, pop) * (1 + step - hit));
  if (d.moving && d.hp > 0) ctx.translate(0, -Math.abs(Math.sin(d.walk * Math.PI)) * h * 0.06);
  duckSprite(d.type, 0, 0, h, d.walk, d.atkT, d.moving, d.hitT);
  ctx.restore();
  hpBar(p.x, p.y - h * 1.15, h * 0.7, d.hp / d.max, '#7dff5a');
}
function drawCatX(c) {
  const p = xp(c.x, c.y), boss = c.kind === 'chief', h = xk * (boss ? 1.9 : c.kind === 'tank' ? 1.15 : 1.0);
  if (p.y < -80 || p.y > H + 60) return;
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.28, h * 0.09, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  if (c.hp <= 0) { ctx.globalAlpha = 1 - Math.max(0, c.deadT - 0.5) / 0.4; }
  const pop = c.born < 0.35 ? 1 - Math.exp(-9 * c.born) * Math.cos(16 * c.born) : 1;
  if (pop < 1) { ctx.translate(p.x, p.y); ctx.scale(Math.max(0.05, pop), Math.max(0.05, pop)); ctx.translate(-p.x, -p.y); }
  if (c.B.art && ready(IMG[c.B.art])) {
    // armoured cats from the old sheets: they face left, so mirror when walking right
    ctx.translate(p.x, p.y); if ((c.mx || 0) > 0.1) ctx.scale(-1, 1);
    const hh = h * (c.kind === 'steel' ? 1.25 : 1.1), lunge = c.atkT > 0 ? Math.sin((0.45 - c.atkT) / 0.45 * Math.PI) : 0;
    ctx.rotate(-lunge * 0.18); ctx.scale(1 + lunge * 0.1, 1 - lunge * 0.08);
    if (c.hitT > 0) ctx.scale(1.12, 0.88);
    drawFrame(c.B.art, c.moving ? Math.floor(c.walk * 1.4) % 4 : 0, 0, 0, hh, false);
    if (c.kind === 'shadow' && c.hp > 0) { ctx.globalAlpha = 0.25; drawFrame(c.B.art, Math.floor(c.walk * 1.4 + 1) % 4, h * 0.25, 0, hh, false); }
  } else if (boss && ready(IMG.chief_walk)) {
    ctx.translate(p.x, p.y); if ((c.mx || 0) < 0) ctx.scale(-1, 1);
    const sq = c.atkT > 0 ? 0.12 : 0; ctx.scale(1 + sq, 1 - sq);
    drawFrame('chief_walk', Math.floor(c.walk * 1.5) % 6, 0, 0, h, false);
  } else {
    const atk = c.atkT > 0, kk = atk ? 1 - c.atkT / 0.45 : 0;
    c.st = c.hp <= 0 ? 'dead' : c.moving ? 'walk' : 'atk';
    try { drawKitchenCatBody(c, p.x, p.y, h, atk, kk, X.t + c.ph); }
    catch (e) { if (ready(IMG.k_cat_front)) drawFrame('k_cat_front', Math.floor(c.walk) % 4, p.x, p.y, h, false); }
  }
  ctx.restore();
  if (c.hp > 0) hpBar(p.x, p.y - h * 1.12, h * (boss ? 0.9 : 0.6), c.hp / c.max, boss ? '#ff4a3a' : '#ff6a5a');
}
function hpBar(x, y, w, f, col) {
  if (f >= 0.999 || f <= 0) return;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
  ctx.fillStyle = col; ctx.fillRect(x - w / 2, y, w * Math.max(0, f), 4);
}
function drawHut(h) {
  const p = xp(h.x, h.y), c = hutArt(h.type); if (!c) return;
  const sq = h.pop > 0 ? Math.sin(h.pop / 0.35 * Math.PI) * 0.12 : 0, hit = h.hit > 0 ? 0.06 : 0;
  const born = h.born === undefined ? (h.born = X.t) : h.born, age = X.t - born, pop = age < 0.5 ? 1 - Math.exp(-8 * age) * Math.cos(14 * age) : 1;
  ctx.save(); ctx.translate(p.x, p.y + 4); ctx.scale((1 + sq + hit) * pop, (1 - sq - hit) * pop);
  ctx.drawImage(c, -c.cw / 2, -c.ch, c.cw, c.ch);
  ctx.restore();
  if (h.type === 'tower') { const t = h.shootT > 0 ? 0.3 - h.shootT : 0; ctx.save(); ctx.translate(p.x, p.y - c.ch * 0.62); if (h.aim < 0) ctx.scale(-1, 1); duckSprite('fork', 0, 0, xk * 0.9, 0, h.shootT, false, 0); ctx.restore(); void t; }
  if (h.type === 'shrine') { const a = 0.25 + Math.sin(X.t * 3) * 0.1; ctx.strokeStyle = `rgba(140,255,120,${a})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, p.y, HUTS.shrine.range * xk, HUTS.shrine.range * xk * XYS, 0, 0, Math.PI * 2); ctx.stroke(); }
  hpBar(p.x, p.y - c.ch * 0.95, xk * 1.2, h.hp / h.max, '#7dff5a');
}
function drawFort(f) {
  const p = xp(f.x, f.y), c = fortArt(f.kind); if (!c) return;
  if (p.y - c.ch > H + 40 || p.y < -60) return;
  const hit = f.hit > 0 ? 0.05 : 0, recoil = f.shootT > 0 ? Math.sin(f.shootT / 0.35 * Math.PI) * 0.06 : 0;
  ctx.save(); ctx.translate(p.x + (hit ? (Math.random() - 0.5) * 4 : 0), p.y + 4); ctx.scale(1 + hit + recoil, 1 - hit - recoil);
  ctx.drawImage(c, -c.cw / 2, -c.ch, c.cw, c.ch);
  ctx.restore();
  if (f.kind === 'pottower') {
    const k = f.shootT > 0 ? 1 : 0; ctx.save(); ctx.translate(p.x, p.y - c.ch * 0.66); if (f.aim < 0) ctx.scale(-1, 1);
    if (ready(IMG.k_cat_act) && k) drawFrame('k_cat_act', 1, 0, 0, xk * 0.85, false); else if (ready(IMG.k_cat_front)) drawFrame('k_cat_front', Math.floor(X.t * 3) % 4, 0, 0, xk * 0.85, false);
    drawItem('it_pot', 0, -xk * 0.78, xk * 0.42, 0.1); ctx.restore();
  }
  if (f.kind === 'fortress' && ready(IMG.k_cat_front)) { for (const s of [-1, 1]) { ctx.save(); ctx.translate(p.x + s * c.cw * 0.2, p.y - c.ch * 0.5); drawFrame(f.shootT > 0 && s === f.aim ? 'k_cat_act' : 'k_cat_front', f.shootT > 0 && s === f.aim ? 1 : Math.floor(X.t * 3 + s) % 4, 0, 0, xk * 0.8, false); drawItem('it_pot', 0, -xk * 0.74, xk * 0.4); ctx.restore(); } }
  if (f.hp < f.max) hpBar(p.x, p.y - c.ch - 4, Math.min(c.cw * 0.7, xk * 2.4), f.hp / f.max, '#ff6a5a');
}
function drawCamp() {
  const p = xp(X.camp.x, X.camp.y), c = campArt();
  ctx.drawImage(c, p.x - c.cw / 2, p.y + 6 - c.ch, c.cw, c.ch);
  // serจ่อย cheering (lazily) from his deck chair
  if (ready(IMG.shrine_serjoy)) { /* reserved for a future art pass */ }
  hpBar(p.x, p.y - c.ch + 2, xk * 2.4, X.camp.hp / X.camp.max, '#7dff5a');
}
function drawRubble(r) {
  const p = xp(r.x, r.y), s = xk * (r.big ? 2.6 : r.small ? 0.8 : 1.2);
  ctx.fillStyle = 'rgba(80,60,40,.35)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, s, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();
  const cols = ['#8a7a6a', '#6a5a4a', '#a89a88', '#7a5a3a'];
  for (let i = 0; i < (r.big ? 14 : 7); i++) { const a = i * 2.3, rr = s * (0.25 + (i % 3) * 0.22); ctx.fillStyle = cols[i % 4]; ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.3 - 3, s * 0.18, s * 0.11, a, 0, Math.PI * 2); ctx.fill(); }
  if (r.t < 3) { ctx.globalAlpha = Math.max(0, 1 - r.t / 3) * 0.5; ctx.fillStyle = '#ddd'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(p.x + Math.sin(r.t * 2 + i) * 8, p.y - 10 - r.t * 18 - i * 10, 8 + i * 3 + r.t * 4, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
}
function drawPads() {
  const t = X.t;
  for (const s of X.slots) {
    if (s.hut) continue;
    const p = xp(s.x, s.y), open = X.groups[s.g].open; if (p.y < -30 || p.y > H + 30) continue;
    const rx = xk * 0.85, ry = rx * 0.36;
    ctx.save();
    ctx.fillStyle = open ? 'rgba(255,240,170,.35)' : 'rgba(60,60,60,.18)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.setLineDash(open ? [7, 5] : [4, 6]); ctx.lineDashOffset = -t * 18; ctx.lineWidth = 2.5; ctx.strokeStyle = open ? '#fff3b0' : 'rgba(255,255,255,.35)'; ctx.stroke(); ctx.setLineDash([]);
    if (open) { const b = Math.sin(t * 4 + s.id) * 2; ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(xk * 0.5)}px Mitr,system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeStyle = '#6a4a10'; ctx.lineWidth = 3; ctx.strokeText('+', p.x, p.y - 2 + b); ctx.fillText('+', p.x, p.y - 2 + b); }
    else { ctx.font = `${Math.round(xk * 0.38)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.6; ctx.fillText('🔒', p.x, p.y - 2); }
    ctx.restore();
  }
}
function drawShotX(s) {
  const u = Math.min(1, s.t / s.dur), x = s.x + (s.tx - s.x) * u, y = s.y + (s.ty - s.y) * u, z = s.z * (1 - u) + 0.5 * u + (s.arc ? Math.sin(u * Math.PI) * 2.2 : 0);
  const p = xp(x, y), sy = p.y - z * xk * 0.8;
  ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
  const a = Math.atan2(-(s.ty - s.y) * XYS, s.tx - s.x);
  if (s.img && ready(IMG[s.img])) drawItem(s.img, p.x, sy, xk * (s.img === 'it_chili' ? 0.45 : 0.55), s.img === 'it_spatula' || s.img === 'it_chili' ? s.t * 14 : a + Math.PI / 2);
  else { ctx.fillStyle = '#fff6b0'; ctx.beginPath(); ctx.arc(p.x, sy, 3, 0, Math.PI * 2); ctx.fill(); }
}
function drawParts() {
  for (const q of X.parts) {
    const p = xp(q.x, q.y), sy = p.y - q.z * xk * 0.7, f = 1 - q.t / q.life;
    if (q.kind === 'dust') { ctx.globalAlpha = f * 0.8; ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(p.x, sy, q.size * (1.4 - f * 0.6), 0, Math.PI * 2); ctx.fill(); }
    else if (q.kind === 'coin') { ctx.globalAlpha = 1; drawItem('it_coin', p.x, sy, 14, 0) || (ctx.fillStyle = q.col, ctx.beginPath(), ctx.arc(p.x, sy, 5, 0, 6.28), ctx.fill()); }
    else if (q.kind === 'feather') { ctx.globalAlpha = f; ctx.fillStyle = '#fff'; ctx.save(); ctx.translate(p.x, sy); ctx.rotate(q.t * 6); ctx.beginPath(); ctx.ellipse(0, 0, 5, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    else if (q.kind === 'plus') { ctx.globalAlpha = f; ctx.fillStyle = q.col; ctx.font = '900 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText('+', p.x, sy); }
    else { ctx.globalAlpha = Math.min(1, f * 1.5); ctx.fillStyle = q.col; ctx.fillRect(p.x - q.size / 2, sy - q.size / 2, q.size, q.size); }
  }
  ctx.globalAlpha = 1;
}
function drawFloats() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const f of X.floats) {
    const p = xp(f.x, f.y), u = f.t / 1.1, sc = u < 0.15 ? 0.5 + u / 0.15 * 0.7 : u < 0.25 ? 1.2 - (u - 0.15) * 2 : 1;
    ctx.save(); ctx.globalAlpha = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1; ctx.translate(p.x, p.y - u * 30); ctx.scale(sc, sc);
    ctx.font = `900 ${f.txt.length > 6 ? 13 : 15}px Mitr,system-ui`; ctx.lineWidth = 4; ctx.strokeStyle = '#2a1a0a'; ctx.strokeText(f.txt, 0, 0); ctx.fillStyle = f.col; ctx.fillText(f.txt, 0, 0); ctx.restore();
  }
}
function expDraw() {
  if (!X) return;
  if (X.phase === 'rally') { MoltRally.draw(); return; }
  if (X.w !== W || X.h !== H) { X.w = W; X.h = H; xk = Math.min(W / 10.4, 46); for (const c of X.tiles.values()) recycleTile(c); X.tiles.clear(); X.iconType = null; }
  ctx.save();
  if (X.shake > 0) ctx.translate((Math.random() - 0.5) * X.shake * 22, (Math.random() - 0.5) * X.shake * 16);
  // background strips
  ctx.fillStyle = '#6dbf43'; ctx.fillRect(-20, -20, W + 40, H + 40);
  const th = TILE_M * xk * XYS, yTop = xinv(0, -20).y, yBot = xinv(0, H + 20).y;
  const tLo = Math.floor(yBot / TILE_M), tHi = Math.floor(yTop / TILE_M);
  for (let ti = tLo; ti <= tHi; ti++) { const c = bgTile(ti), sy = xp(0, ti * TILE_M).y - th; ctx.drawImage(c, 0, sy, W, th + 2 / Math.min(1.5, window.devicePixelRatio || 1)); }
  for (const [ti, c] of X.tiles) if (ti < tLo - 1 || ti > tHi + 1) { X.tiles.delete(ti); recycleTile(c); }
  // top: the cat country fades into a dark-green forest edge
  { const p = xp(0, XL + 1.5); if (p.y > -40) { const gr = ctx.createLinearGradient(0, p.y - 60, 0, p.y + 30); gr.addColorStop(0, '#2f6a2a'); gr.addColorStop(1, 'rgba(47,106,42,0)'); ctx.fillStyle = gr; ctx.fillRect(0, -20, W, p.y + 50); } }
  for (const r of X.rubble) drawRubble(r);
  drawPads();
  // depth-sorted scene
  const objs = [];
  objs.push({ y: X.camp.y, f: drawCamp });
  for (const h of X.huts) objs.push({ y: h.y, o: h, f: drawHut });
  for (const f of X.forts) if (f.alive) objs.push({ y: f.y, o: f, f: drawFort });
  for (const d of X.ducks) objs.push({ y: d.y, o: d, f: drawDuck });
  for (const c of X.cats) objs.push({ y: c.y, o: c, f: drawCatX });
  objs.sort((a, b) => b.y - a.y);
  for (const o of objs) o.f(o.o);
  for (const s of X.shots) drawShotX(s);
  drawItemsX();
  drawParts(); drawFloats();
  ctx.restore();
  if (X.tutStep) tutTick();
  // banners
  if (X.banner > 0 && X.bannerTxt) {
    const u = X.banner, a = Math.min(1, u * 2), sc = 1 + Math.max(0, 0.4 - (2.6 - u)) * 0.6;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H * 0.36); ctx.scale(sc, sc);
    ctx.font = '900 30px Mitr,system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = 8; ctx.strokeStyle = '#5a2a00'; ctx.strokeText(X.bannerTxt, 0, 0); ctx.fillStyle = '#ffd84a'; ctx.fillText(X.bannerTxt, 0, 0);
    if (X.phase === 'intro') { ctx.font = '800 16px Mitr,system-ui'; ctx.lineWidth = 5; ctx.strokeText(xt("บุกป้อมแมว"), 0, 34); ctx.fillStyle = '#fff'; ctx.fillText(xt("บุกป้อมแมว"), 0, 34); }
    ctx.restore();
  }
}

// ---------- input: drag to look around ----------
cv.addEventListener('pointerdown', e => { if (state !== 'exp' || !X) return; X.drag = { id: e.pointerId, y: e.clientY, cam: X.camY }; });
cv.addEventListener('pointermove', e => { if (!X || !X.drag || X.drag.id !== e.pointerId) return; const dy = e.clientY - X.drag.y; X.camY = Math.max(-1, Math.min(XL + 1 - viewSpan(), X.drag.cam + dy / (xk * XYS))); X.camHold = 2.5; });
const xDragEnd = e => { if (X && X.drag && X.drag.id === e.pointerId) X.drag = null; };
cv.addEventListener('pointerup', xDragEnd); cv.addEventListener('pointercancel', xDragEnd);

// ---------- DOM: HUD, build button, cards, pause ----------
function buildExpUi() {
  let ui = $('expUi');
  if (!ui) {
    const st = document.createElement('style'); st.textContent = `
#expUi{position:fixed;inset:0;pointer-events:none;z-index:6;font-family:Mitr,system-ui,sans-serif}
#expUi .xtop{position:fixed;top:12px;left:72px;right:8px;display:flex;gap:6px;align-items:center;justify-content:space-between}
#expUi .xpill{background:rgba(40,25,10,.62);color:#fff;border-radius:999px;padding:6px 12px;font:800 14px Mitr,system-ui;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 3px 8px rgba(0,0,0,.25)}
#expUi .xpill b{color:#ffd84a}
#expUi .xprog{position:fixed;top:62px;left:50%;transform:translateX(-50%);width:min(64vw,260px);height:12px;border-radius:99px;background:rgba(40,25,10,.55);box-shadow:inset 0 2px 3px rgba(0,0,0,.4)}
#expUi .xprog i{display:block;height:100%;border-radius:99px;background:linear-gradient(#ffe27a,#ffb21a);transition:width .3s}
#expUi .xprog span{position:absolute;top:13px;left:0;right:0;text-align:center;color:#fff;font:800 11px Mitr,system-ui;text-shadow:0 1px 2px #000}
#expUi .xpause{pointer-events:auto;width:40px;height:40px;border-radius:50%;border:0;background:linear-gradient(#fff3c4,#f2c96a);box-shadow:0 4px 0 #a8792a,0 6px 12px rgba(0,0,0,.3);font:900 16px system-ui;color:#6a3a00}
#xBuild{pointer-events:auto;position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);min-width:190px;padding:8px 20px 10px 64px;border:0;border-radius:22px;
 background:linear-gradient(#e9c98f,#c99a55);box-shadow:inset 0 2px 0 #fff3d0,inset 0 -4px 0 #a8792a,0 6px 0 #6a4a1a,0 10px 20px rgba(0,0,0,.35);color:#4a2a00;text-align:left;transition:transform .12s cubic-bezier(.34,1.56,.64,1)}
#xBuild:active{transform:translateX(-50%) scale(.93)}
#xBuild b{display:block;font:900 22px Mitr,system-ui;line-height:1.1;text-shadow:0 1px 0 #fff3d0}
#xBuild small{display:block;font:800 13px Mitr,system-ui}
#xBuild #xCost{font-size:17px;margin-left:4px}#xBuild #xCost.no{color:#c0281a}#xBuild small{white-space:nowrap}
#xBuild canvas{position:absolute!important;inset:auto!important;left:6px!important;top:50%!important;transform:translateY(-58%);width:56px!important;height:56px!important}
#xBuild.shake{animation:xshake .35s}
#xBuild.ready{animation:xglow 1.2s ease-in-out infinite}
@keyframes xshake{0%,100%{transform:translateX(-50%)}25%{transform:translateX(calc(-50% - 7px))}75%{transform:translateX(calc(-50% + 7px))}}
@keyframes xglow{50%{box-shadow:inset 0 2px 0 #fff3d0,inset 0 -4px 0 #a8792a,0 6px 0 #6a4a1a,0 0 22px 6px rgba(255,230,120,.8)}}
#expUi .xitem{pointer-events:auto;position:fixed;bottom:max(22px,env(safe-area-inset-bottom));width:62px;height:62px;border-radius:50%;border:0;padding:0;
 background:conic-gradient(rgba(20,10,0,.55) var(--cd,0deg),transparent 0),radial-gradient(circle at 35% 30%,#bfeaff,#4a9be0);box-shadow:inset 0 2px 0 rgba(255,255,255,.6),0 4px 0 #2b6aa8,0 8px 14px rgba(0,0,0,.3);transition:transform .12s}
#expUi .xitem:active{transform:scale(.9)}
#expUi .xitem.ready{animation:xglow2 1.4s ease-in-out infinite}
@keyframes xglow2{50%{box-shadow:inset 0 2px 0 rgba(255,255,255,.6),0 4px 0 #2b6aa8,0 0 18px 5px rgba(160,230,255,.9)}}
#xEgret{left:10px}#xBalloon{right:10px;background:conic-gradient(rgba(20,10,0,.55) var(--cd,0deg),transparent 0),radial-gradient(circle at 35% 30%,#ffe0a0,#ff8a3a)!important;box-shadow:inset 0 2px 0 rgba(255,255,255,.6),0 4px 0 #b0501a,0 8px 14px rgba(0,0,0,.3)}
#expUi .xitem canvas{position:absolute!important;inset:3px!important;width:56px!important;height:56px!important;pointer-events:none}
#expUi .xitem em{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 22px Mitr,system-ui;font-style:normal;color:#fff;text-shadow:0 2px 3px #000}
#expUi .xitem small{position:absolute;left:-10px;right:-10px;bottom:-15px;text-align:center;font:800 11px Mitr,system-ui;color:#fff;text-shadow:0 1px 2px #000,0 0 4px #000}
#xBuild{min-width:170px!important}
#xAd{pointer-events:auto;position:fixed;left:50%;transform:translateX(-50%);bottom:calc(max(18px,env(safe-area-inset-bottom)) + 78px);border:0;border-radius:16px;padding:6px 14px;font:900 15px Mitr,system-ui;color:#fff;background:linear-gradient(#ff8a5a,#e0482a);box-shadow:0 4px 0 #8f2a17,0 6px 12px rgba(0,0,0,.3);animation:xglow3 1.3s ease-in-out infinite}
#xAd b{color:#fff6b0}
#xAd.shake{animation:xshake .35s}
@keyframes xglow3{50%{transform:translateX(-50%) scale(1.06)}}
#xModal{position:fixed;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,30,50,.55);font-family:Mitr,system-ui,sans-serif;animation:xfade .2s}
@keyframes xfade{from{opacity:0}}
#xModal .xribbon{background:linear-gradient(#ff5a8a,#d8204a);color:#fff;font:900 24px Mitr,system-ui;padding:6px 40px;margin-bottom:12px;clip-path:polygon(0 0,100% 0,94% 50%,100% 100%,0 100%,6% 50%);text-shadow:0 2px 0 #8a1030;letter-spacing:1px}
#xModal .xcards{display:flex;gap:8px;padding:0 8px}
#xModal .xcard{position:relative;width:min(30vw,128px);border:0;border-radius:16px;padding:8px 6px 10px;background:linear-gradient(#7fd8ff,#3aa0e8);box-shadow:inset 0 2px 0 rgba(255,255,255,.6),0 5px 0 #1d6aa8,0 10px 18px rgba(0,0,0,.35);color:#fff;font-family:inherit;animation:xin .45s cubic-bezier(.34,1.56,.64,1) both}
#xModal .xcard.new{background:linear-gradient(#a8f07a,#4ac04a);box-shadow:inset 0 2px 0 rgba(255,255,255,.6),0 5px 0 #2a8a2a,0 10px 18px rgba(0,0,0,.35)}
#xModal .xcard:active{transform:scale(.93)}
@keyframes xin{from{transform:translateY(40px) scale(.6);opacity:0}}
#xModal .xcard canvas{position:static!important;display:block;inset:auto;width:100%!important;height:auto!important;aspect-ratio:1;background:rgba(255,255,255,.25);border-radius:12px}
#xModal .xcard b{display:block;font:900 14px Mitr,system-ui;margin-top:4px;text-shadow:0 1px 2px rgba(0,0,0,.4)}
#xModal .xcard small{display:block;font:700 11px Mitr,system-ui;line-height:1.25;margin-top:2px}
#xModal .xcard i{position:absolute;top:-9px;left:-6px;background:#ff3a5a;color:#fff;font:900 11px Mitr,system-ui;font-style:normal;padding:2px 8px;border-radius:8px;transform:rotate(-10deg);box-shadow:0 2px 4px rgba(0,0,0,.3)}
#xModal .xsub{color:#fff;font:800 13px Mitr,system-ui;margin-top:12px;text-shadow:0 1px 3px #000}
#xModal .xbox{background:#fff8e6;border-radius:20px;padding:16px 18px;max-width:330px;box-shadow:0 8px 0 #c9a46a,0 14px 30px rgba(0,0,0,.4);text-align:center}
#xModal .xh{font:900 22px Mitr,system-ui;color:#6a3a00;margin-bottom:8px}
#xModal .xhelp p{margin:7px 0;text-align:left;font:700 14px Mitr,system-ui;color:#4a2a10}
#xModal .btn{margin-top:10px}`;
    document.head.appendChild(st);
    ui = document.createElement('div'); ui.id = 'expUi'; ui.className = 'hidden';
    ui.innerHTML = `<div class="xtop"><span class="xpill">📅 <b id="xDay"></b></span><span class="xpill">🪙 <b id="xCoins"></b></span><button class="xpause" id="xPause">❚❚</button></div>
      <div class="xprog"><i id="xProg"></i><span id="xProgT"></span></div>
      <button class="xitem" id="xEgret"><canvas width="120" height="120"></canvas><em></em><small>${xt("นกกระยาง")}</small></button>
      <button class="xitem" id="xBalloon"><canvas width="120" height="120"></canvas><em></em><small>${xt("บอลลูน")}</small></button>
      <button id="xAd" class="hidden">🎬 <b id="xAdAmt"></b></button>
      <button id="xBuild"><canvas width="112" height="112"></canvas><b>🔨 ${xt("สร้าง")} <span id="xCost"></span></b><small id="xNext"></small></button>`;
    document.body.appendChild(ui);
    $('xBuild').onclick = e => { e.stopPropagation(); doBuild(); };
    $('xAd').onclick = e => { e.stopPropagation(); watchAdForCoins(); };
    $('xPause').onclick = e => { e.stopPropagation(); SFX.play('click'); openPause(); };
    $('xEgret').onclick = e => { e.stopPropagation(); useItemX('egret'); };
    $('xBalloon').onclick = e => { e.stopPropagation(); useItemX('balloon'); };
  }
  show('expUi'); X.iconType = null;
  setTimeout(() => { if (X) { itemIcon($('xEgret').querySelector('canvas'), 'egret'); itemIcon($('xBalloon').querySelector('canvas'), 'balloon'); } }, 50);
}
function renderExpUi() {
  if (!X || !$('expUi')) return;
  $('xDay').textContent = T.wave; $('xCoins').textContent = Math.floor(save.coins).toLocaleString();
  const cost = buildCost(), b = $('xBuild'), can = save.coins >= cost && !!freeSlot();
  $('xCost').textContent = cost ? `🪙${cost}` : xt("ฟรี!"); $('xCost').className = save.coins >= cost ? '' : 'no';
  { const ad = $('xAd'), need = save.coins < cost && !!freeSlot() && X.phase === 'fight'; ad.classList.toggle('hidden', !need); if (need) $('xAdAmt').textContent = '+🪙' + adCoins(); } $('xNext').textContent = xt(HUTS[X.nextType].name);
  b.classList.toggle('ready', can);
  if (X.iconType !== X.nextType) { X.iconType = X.nextType; const c = b.querySelector('canvas'); cardIcon(c, X.nextType); }
  const total = X.forts.length, gone = X.forts.filter(f => !f.alive).length;
  renderItemsX();
  $('xProg').style.width = Math.round(gone / total * 100) + '%'; $('xProgT').textContent = xt("ป้อมแมว {0}/{1}", gone, total);
}
function expModal(html, kind) {
  closeExpModal();
  const m = document.createElement('div'); m.id = 'xModal';
  m.innerHTML = kind === 'cards' ? html : `<div class="xbox">${html}</div>`;
  document.body.appendChild(m); return m;
}
function closeExpModal() { const m = $('xModal'); if (m) m.remove(); }
function openPause() {
  if (!X || X.phase === 'won' || X.phase === 'lost') return;
  X.paused = true;
  const m = expModal(`<div class="xh">${xt("พักรบ")}</div><button class="btn" id="xResume">${xt("▶ สู้ต่อ")}</button><br><button class="btn" id="xHow" style="background:linear-gradient(#8fd0ff,#4a9be0);box-shadow:0 4px 0 #2b6aa8">${xt("❓ วิธีเล่น")}</button><br><button class="btn" id="xClip" style="background:linear-gradient(#ffb36a,#e0782a);box-shadow:0 4px 0 #a04a10">${xt("🎬 ดูคลิปหัวหน้าเป็ด")}</button><br><button class="btn" id="xQuit" style="background:linear-gradient(#9aa3b0,#5e6672);box-shadow:0 4px 0 #3a404a">${xt("🏳️ ถอยกลับเมือง")}</button>`);
  m.querySelector('#xHow').onclick = () => { SFX.play('click'); closeExpModal(); X.paused = false; startExpTut(true); };
  m.querySelector('#xClip').onclick = () => { SFX.play('click'); closeExpModal(); if (window.MoltRally) playRally('fight'); else X.paused = false; };
  m.querySelector('#xResume').onclick = () => { SFX.play('click'); closeExpModal(); X.paused = false; };
  m.querySelector('#xQuit').onclick = () => { SFX.play('click'); persist(); toast(xt("ถอยกลับเมืองแล้ว เก็บเหรียญที่ได้ไว้")); leaveExpedition(); };
}


// ---------- guided tutorial (spotlight + pointing hand) ----------
function rectOfEl(id) { const el = $(id); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.max(r.width, r.height) / 2 + 8 }; }
function rectOfWorld(x, y, rM, up) { const p = xp(x, y); return { x: p.x, y: p.y - (up || 0) * xk, r: rM * xk }; }
function firstFort() { return X.forts.filter(f => f.alive && f.kind !== 'fortress').sort((a, b) => a.y - b.y)[0]; }
const EXP_TUT = [
  { text: "นี่คือค่ายใหญ่ของเป็ด ⛺\nถ้าแมวพังค่ายนี้ได้ = แพ้", at: () => rectOfWorld(X.camp.x, X.camp.y, 1.6, 1.2), camY: () => 0 },
  { text: "แตะปุ่ม 🔨 สร้าง ตรงนี้เลย! (หลังแรกฟรี)\nใช้เหรียญ 🪙 ตั้งค่ายเป็ดบนจุด ➕ ข้างทาง", at: () => rectOfEl('xBuild'), wait: 'build', camY: () => 0 },
  { text: "เยี่ยม! 🎉 ค่ายนี้จะส่งเป็ด\nเดินขึ้นไปสู้เองเรื่อยๆ", at: () => { const h = X.huts[X.huts.length - 1]; return h ? rectOfWorld(h.x, h.y, 1.3, 1) : null; }, run: true, camY: () => 0 },
  { text: "ใช้เหรียญ 🪙 ที่สะสมไว้สร้างได้เลย\nล้มแมว พังป้อม ได้เหรียญเพิ่ม • ไม่พอกด 🎬 ดูโฆษณารับเหรียญ", at: () => rectOfEl('xCoins'), run: true },
  { text: "ข้างหน้าคือป้อมแมว 💥\nพังให้หมด เพื่อปลดล็อกจุดสร้าง 🔒 ถัดไป", at: () => { const f = firstFort(); return f ? rectOfWorld(f.x, f.y, 1.5, 1.2) : null; }, camY: () => { const f = firstFort(); return f ? f.y - viewSpan() * 0.45 : 0; } },
  { text: "สร้างครบทุก ๆ 3 หลัง\nได้เลือกการ์ดอัปเกรด 1 ใน 3 ใบ 🃏", at: null, camY: () => 0 },
  { text: "บนสุดคือป้อมราชาแมว 🏰\nพังได้ = ชนะ! ลากจอขึ้นลงเพื่อดูแผนที่", at: () => rectOfWorld(0, XL - 2.2, 3, 2), camY: () => XL + 1 - viewSpan() },
];
function tutCamera(dt) {
  const st = X.tutStep; if (!st || !st.camY) return;
  const want = Math.max(0, Math.min(XL + 1 - viewSpan(), st.camY()));
  X.camY += (want - X.camY) * Math.min(1, dt * 3);
}
function startExpTut(replay) {
  X.tutI = 0; X.tutReplay = !!replay;
  let el = $('xTut');
  if (!el) {
    const st = document.createElement('style'); st.textContent = `
#xTut{position:fixed;inset:0;z-index:15;pointer-events:none;font-family:Mitr,system-ui,sans-serif}
#xTut .spot{position:fixed;border-radius:50%;box-shadow:0 0 0 9999px rgba(0,0,0,.55),0 0 0 4px #ffe27a,0 0 24px 8px rgba(255,226,122,.8);transition:all .35s cubic-bezier(.34,1.3,.64,1)}
#xTut .hand{position:fixed;font-size:42px;transition:left .35s,top .35s;animation:xtap .9s ease-in-out infinite;filter:drop-shadow(0 3px 3px rgba(0,0,0,.4))}
@keyframes xtap{50%{transform:translate(4px,10px) scale(.92)}}
#xTut .box{position:fixed;left:12px;right:12px;background:#fff8e6;border-radius:18px;padding:14px 16px 12px;box-shadow:0 6px 0 #c9a46a,0 12px 24px rgba(0,0,0,.4);pointer-events:auto;animation:xin .35s cubic-bezier(.34,1.56,.64,1)}
#xTut .box p{margin:0 0 10px;white-space:pre-line;font:800 16px/1.45 Mitr,system-ui;color:#4a2a10;text-align:center}
#xTut .row{display:flex;justify-content:space-between;align-items:center}
#xTut .dots{color:#c9a46a;font-size:12px;letter-spacing:2px}
#xTut button{border:0;border-radius:14px;padding:8px 16px;font:800 15px Mitr,system-ui;color:#fff;background:linear-gradient(#5fd35a,#2f9a30);box-shadow:0 4px 0 #1f6a20}
#xTut button.skip{background:none;box-shadow:none;color:#a07a4a;font-size:13px}`;
    document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'xTut';
    el.innerHTML = '<div class="spot"></div><div class="hand">👆</div><div class="box"><p></p><div class="row"><button class="skip"></button><span class="dots"></span><button class="next"></button></div></div>';
    document.body.appendChild(el);
    el.querySelector('.next').onclick = e => { e.stopPropagation(); SFX.play('click'); tutNext(); };
    el.querySelector('.skip').onclick = e => { e.stopPropagation(); SFX.play('click'); endExpTut(); };
  }
  el.style.display = ''; showTutStep();
}
function showTutStep() {
  const el = $('xTut'), st = EXP_TUT[X.tutI]; X.tutStep = st;
  // a replayed build step only waits if a build is actually possible right now
  if (st.wait === 'build') { X.tutBuilds = X.builds; if (save.coins < buildCost() || !freeSlot()) { tutNext(); return; } }
  el.querySelector('p').textContent = xt(st.text);
  el.querySelector('.dots').textContent = EXP_TUT.map((_, i) => i === X.tutI ? '●' : '○').join('');
  const nb = el.querySelector('.next'); nb.textContent = X.tutI === EXP_TUT.length - 1 ? xt("ลุยเลย! ✔") : xt("ต่อไป ▶"); nb.style.visibility = st.wait ? 'hidden' : '';
  el.querySelector('.skip').textContent = xt("ข้าม");
  placeTut();
}
function placeTut() {
  const el = $('xTut'); if (!el || !X || !X.tutStep) return;
  const st = X.tutStep, a = st.at ? st.at() : null, spot = el.querySelector('.spot'), hand = el.querySelector('.hand'), box = el.querySelector('.box');
  if (a) { spot.style.left = (a.x - a.r) + 'px'; spot.style.top = (a.y - a.r) + 'px'; spot.style.width = spot.style.height = (a.r * 2) + 'px'; hand.style.display = ''; hand.style.left = (a.x - 6) + 'px'; hand.style.top = (a.y + a.r * 0.35) + 'px'; }
  else { spot.style.left = (W / 2) + 'px'; spot.style.top = (H / 2) + 'px'; spot.style.width = spot.style.height = '0px'; hand.style.display = 'none'; }
  const low = a && a.y > H * 0.5; box.style.top = low ? '96px' : ''; box.style.bottom = low ? '' : '110px';
  // while waiting for the Build tap, the button itself must be clickable above the dim layer
  const ui = $('expUi'); if (ui) ui.style.zIndex = st.wait === 'build' ? '16' : '';
}
function tutNext() { if (++X.tutI >= EXP_TUT.length) endExpTut(); else showTutStep(); }
function endExpTut() {
  const el = $('xTut'); if (el) el.style.display = 'none';
  if (X) X.tutStep = null; { const ui = $('expUi'); if (ui) ui.style.zIndex = ''; }
  if (!save.tut) save.tut = {}; save.tut.exp = true; persist();
}
function tutTick() {
  if (!X || !X.tutStep) return;
  if (X.tutStep.wait === 'build' && X.builds > X.tutBuilds) { setTimeout(tutNext, 450); X.tutStep = Object.assign({}, X.tutStep, { wait: 'done' }); }
  placeTut();
}

// ---------- hook into the duck city ----------
{
  const startCity = startWave;
  startWave = function () {
    if (T.wave >= EXP_FROM && D && D.phase === 'build') { startExpedition(); return; }
    return startCity.apply(this, arguments);
  };
  const hudCity = renderTdHud;
  renderTdHud = function () {
    hudCity.apply(this, arguments);
    if (D && T.wave >= EXP_FROM && $('waveBtn')) $('waveBtn').textContent = xt("⚔️ ออกศึก วันที่ {0}", T.wave);
  };
  try { renderTdHud(); } catch (e) {}
}
window.expUpdate = expUpdate; window.expDraw = expDraw;
window.__exp = { get X() { return X; }, start: startExpedition, build: doBuild, update: expUpdate, lose: () => endExpedition(false), use: useItemX, cost: () => buildCost() };
})();
