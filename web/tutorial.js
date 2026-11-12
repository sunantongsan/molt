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
function padRect(id) { const pd = padList().find(q => q.id === id); return pd ? fieldRect(pd.x, pd.y, 0.8) : fieldRect(2.6, HOUSE_Y + 0.4, 0.8); }
function firstEmptySlot() { for (let s = 0; s < SLOTS; s++) if (!platAt(s)) return s; return 0; }

const TUT = {
  td: [
    { text: 'นี่คือไข่ทองคำ 🥚✨ สมบัติของเมืองเป็ด\nฝูงแมวจะบุกมาจากด้านบนเพื่อแย่งไข่ไป ต้องรักษาไว้ให้ได้!', at: () => fieldRect(0, EGG_Y - 0.8, 1.3) },
    { text: 'นี่คือเป็ดหัวหน้า 🦆\nแตะวงกลมซื้อของ เป็ดจะเดินไปจ่ายเหรียญให้เอง (ลากนิ้วก็บังคับเดินได้) และจะฟาดแมวที่ปีนเข้ามาด้วยทัพพี', at: () => fieldRect(D.lead.x, D.lead.y, 0.9, 0.5) },
    { text: 'เป็ดยืนเฝ้าบนกำแพงเมือง 🏰 ตรงกลางคือประตู 🚪\nระวังรถกระทุ้งประตู กับแมวแบกบันไดปีนกำแพง! พาเป็ดหัวหน้าไปยืนใต้บันไดเพื่อผลักล้ม', at: () => fieldRect(0, WALL_IN, 2.6, 0.9) },
    { text: 'แตะวงกลม 🪵 เพื่อสร้างป้อมบนกำแพง\nเหรียญจะไหลเข้าไปจนครบ แล้วเป็ดอีกตัวจะขึ้นกำแพงมาช่วยปา', at: () => padRect('b' + firstEmptySlot()) },
    { text: 'แตะวงกลมใต้ป้อมที่มีอยู่เพื่ออัปเกรด ⬆️\nเลเวล 4, 7, 10 ป้อมจะเปลี่ยนร่าง: ไม้ → หิน → เหล็ก → ทองคำ', at: () => padRect('u' + (T.plats[0] ? T.plats[0].slot : 2)) },
    { text: 'แตะเป็ดบนกำแพงเพื่อเปลี่ยนอาวุธ 🥢🍴🌶️ หมวกจะเปลี่ยนตามอาวุธด้วย\nแตะบ้านเพื่ออัปเป็ดหัวหน้า เสริมกำแพง และระเบิดพริก', at: () => elRect('#houseBtn') },
    { text: 'ตั้งค่ายเป็ดวางกับดัก ⛺ เป็ดจะปีนออกไปวางไม้กระดก (แมวเหยียบแล้วดีดกระเด็น) กับระเบิดปลาทู\nปุ่มปลาทู 🐟 มุมขวาล่าง: วางกับดักเองก็ได้', at: () => fieldRect(CAMP_POS[0].x, CAMP_POS[0].y - 0.4, 1.1) },
    { text: 'พร้อมแล้วกดเริ่มวันใหม่! ▶\nระหว่างสู้ แตะพื้นสั้นๆ เพื่อปาระเบิดพริก 🌶️ ใส่ฝูงแมว', at: () => elRect('#waveBtn') },
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
  save.tut[tutKey] = true; if (tutKey === 'td') save.tut.td3 = true; persist();
}
$('tutNext').onclick = () => { SFX.init(); SFX.play('click'); if (++tutI >= tutSteps.length) endTut(); else showTutStep(); };
$('tutSkip').onclick = () => { SFX.play('click'); endTut(); };
$('helpBtn').onclick = () => { SFX.init(); SFX.play('click'); closeSheet(); runTut('td'); };
onWelcomeDone(() => { if (!save.tut.td3 && state === 'td') setTimeout(() => runTut('td'), 600); });
