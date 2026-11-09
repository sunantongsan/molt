// MOLT — step-by-step "how to play" guide with a spotlight and a tapping hand.
"use strict";

if (!save.tut) save.tut = {};
window.tutPause = false;

function elRect(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.max(r.width, r.height) / 2 + 10 };
}
function fieldRect(x, y, rr, up) { const p = dproj(x, y); return { x: p.x, y: p.y - (up || 0) * dk, r: rr * dk }; }
function firstEmptySlot() { for (let s = 0; s < SLOTS; s++) if (!platAt(s)) return s; return 0; }

const TUT = {
  td: [
    { text: 'นี่คือบ้านเป็ด 🏠\nเป็ดนอนอยู่ในบ้าน ฝูงแมวจะบุกมาจากทุกทิศ ต้องป้องกันบ้านไว้!', at: () => fieldRect(0, -0.6, 1.9) },
    { text: 'เป็ดยืนยิงธนูอยู่บนนั่งร้าน 🏹\nแตะนั่งร้านเพื่ออัปเกรด หรือเปลี่ยนอาวุธให้แรงขึ้น', at: () => { const q = platPos(T.plats[0] ? T.plats[0].slot : 2); return fieldRect(q.x, q.y, 1.0, 0.8); } },
    { text: 'แตะวงกลม ＋ เพื่อสร้างนั่งร้านใหม่\nเป็ดอีกตัวจะออกจากบ้านมาช่วยยิง', at: () => { const q = platPos(firstEmptySlot()); return fieldRect(q.x, q.y, 0.8); } },
    { text: 'แมวต้องพังรั้วก่อนถึงบ้าน 🪵\nถ้ารั้วเสียหาย แตะเพื่อซ่อม (ใช้เหรียญ)', at: () => fieldRect(0, -RING, 1.3, 0.4) },
    { text: 'กดปุ่มบ้าน 🏠 เพื่อเสริมความทนของบ้าน รั้ว และระเบิด', at: () => elRect('#houseBtn') },
    { text: 'พร้อมแล้วกดเริ่มคลื่น! ▶\nระหว่างสู้ แตะพื้นเพื่อขว้างระเบิด 💣 ใส่ฝูงแมว', at: () => elRect('#waveBtn') },
    { text: 'ล้มแมวได้เหรียญ 🪙 เอาไปอัปเกรดอาวุธ\nดูวิธีเล่นซ้ำได้ที่ปุ่ม ❓', at: () => elRect('#helpBtn') },
  ],
};

let tutSteps = null, tutI = 0, tutKey = '';
function runTut(key) {
  tutSteps = TUT[key]; tutI = 0; tutKey = key;
  window.tutPause = true;
  $('tut').classList.remove('hidden');
  showTutStep();
}
function showTutStep() {
  const st = tutSteps[tutI];
  $('tutText').textContent = st.text;
  $('tutDots').textContent = tutSteps.map((_, i) => i === tutI ? '●' : '○').join('');
  $('tutNext').textContent = tutI === tutSteps.length - 1 ? 'เริ่มเล่น! ✔' : 'ต่อไป ▶';
  const spot = $('tutSpot'), hand = $('tutHand'), box = $('tutBox');
  const a = st.at ? st.at() : null;
  if (a) {
    spot.style.left = (a.x - a.r) + 'px'; spot.style.top = (a.y - a.r) + 'px';
    spot.style.width = spot.style.height = (a.r * 2) + 'px';
    hand.style.display = ''; hand.style.left = (a.x - 8) + 'px'; hand.style.top = (a.y + Math.min(a.r * 0.4, 30)) + 'px';
    if (a.y > H * 0.55) { box.style.top = '70px'; box.style.bottom = ''; } else { box.style.top = ''; box.style.bottom = '24px'; }
  } else {
    spot.style.left = (W / 2) + 'px'; spot.style.top = (H / 2) + 'px'; spot.style.width = spot.style.height = '0px';
    hand.style.display = 'none';
    box.style.top = ''; box.style.bottom = (H * 0.38) + 'px';
  }
}
function endTut() {
  $('tut').classList.add('hidden');
  window.tutPause = false;
  save.tut[tutKey] = true; persist();
}
$('tutNext').onclick = () => { SFX.init(); SFX.play('click'); if (++tutI >= tutSteps.length) endTut(); else showTutStep(); };
$('tutSkip').onclick = () => { SFX.play('click'); endTut(); };
$('helpBtn').onclick = () => { SFX.init(); SFX.play('click'); closeSheet(); runTut('td'); };
if (!save.tut.td && state === 'td') setTimeout(() => runTut('td'), 600);
