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
function roomRect(slot) {
  const c = slotCenter(slot), p = w2s(c.x, c.y);
  return { x: p.x, y: p.y, r: ROOM_HW * cam.z * 0.85 };
}

const TUT = {
  base: [
    { text: 'ยินดีต้อนรับสู่บ้านเป็ด! 🦆\nเป็ดในบ้านช่วยกันผลิตอาหาร 🍗 และวัสดุ ⚙️ ให้เองตลอดเวลา' },
    { text: 'แตะห้อง เพื่อส่งเป็ดไปทำงาน\nหรืออัปเกรดห้องให้ผลิตได้มากขึ้น', at: () => roomRect(0) },
    { text: 'ห้องนอน 🛏️ ใช้รับเป็ดตัวใหม่\nเป็ดยิ่งเยอะ บ้านยิ่งปลอดภัย', at: () => roomRect(1) },
    { text: 'ใช้เหรียญ 🪙 ซื้อและอัปเกรดอาวุธได้ที่ร้านอาวุธ\nอาวุธยิ่งแรง ยิ่งรอดง่าย', at: () => elRect('#shopBtn') },
    { text: 'ทุกคืนแมวจะบุกบ้าน! 🐱\nดูเวลาที่นี่ หรือกดเพื่อป้องกันบ้านได้เลย', at: () => elRect('#defBtn') },
    { text: 'อยากได้เหรียญเพิ่ม? ⚔️\nออกไปบุกปราสาทแมว (ใช้อาหาร)', at: () => elRect('#raidBtn') },
    { text: 'ดูวิธีเล่นซ้ำได้ทุกเมื่อที่ปุ่ม ❓', at: () => elRect('#helpBtn') },
  ],
  def: [
    { text: 'แมวบุกมาจากทุกทิศ! 🐱\nเป็ดของคุณจะยิงแมวที่อยู่ใกล้ที่สุดให้เอง' },
    { text: 'แตะที่พื้น เพื่อขว้างระเบิด 💣 ใส่ฝูงแมว\n(ใช้ได้ทุก 7 วินาที ดูได้ที่ปุ่มมุมขวาล่าง)', at: () => ({ x: W / 2, y: H * 0.22, r: 46 }), hand: true },
    { text: 'แมวจะฟันไม้กั้นก่อน 🪵\nถ้าไม้กั้นเสียหาย แตะเพื่อซ่อม 🔧 (ใช้วัสดุ)', at: () => { const p = dproj(Math.cos(-Math.PI / 2) * RING, Math.sin(-Math.PI / 2) * RING); return { x: p.x, y: p.y - dk * 0.4, r: dk * 1.3 }; }, hand: true },
    { text: 'ปกป้องบ้านจนแมวหมด!\nชนะแล้วได้เหรียญไปอัปเกรดอาวุธ 🪙', at: () => { const p = dproj(0, 0); return { x: p.x, y: p.y, r: dk * 2.8 }; } },
  ],
};

let tutSteps = null, tutI = 0, tutKey = '';
function runTut(key) {
  tutSteps = TUT[key]; tutI = 0; tutKey = key;
  window.tutPause = key === 'def';
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
    spot.style.display = ''; spot.style.left = (a.x - a.r) + 'px'; spot.style.top = (a.y - a.r) + 'px';
    spot.style.width = spot.style.height = (a.r * 2) + 'px';
    hand.style.display = ''; hand.style.left = (a.x - 8) + 'px'; hand.style.top = (a.y + Math.min(a.r * 0.4, 30)) + 'px';
    // keep the text box away from the highlighted spot
    if (a.y > H * 0.55) { box.style.top = '70px'; box.style.bottom = ''; } else { box.style.top = ''; box.style.bottom = '24px'; }
  } else {
    spot.style.display = ''; spot.style.left = (W / 2) + 'px'; spot.style.top = (H / 2) + 'px'; spot.style.width = spot.style.height = '0px';
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
$('helpBtn').onclick = () => { SFX.init(); SFX.play('click'); closeSheet(); runTut('base'); };

// first launch → base guide; first night → defense guide
const _startDefense = startDefense;
startDefense = function (auto) { _startDefense(auto); if (!save.tut.def) setTimeout(() => runTut('def'), 300); };
if (!save.tut.base && state === 'base') setTimeout(() => runTut('base'), 600);
