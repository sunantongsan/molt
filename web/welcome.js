// MOLT — welcome screen. Shown every time the game opens: loads the pictures, checks for an
// over-the-air patch and installs it on the spot (the app restarts into the new version by itself),
// then waits for a tap. The story intro and the tutorial only start after it closes.
"use strict";

const WEL = { open: true, after: [], ready: false, auto: false, t0: performance.now() };
function onWelcomeDone(fn) { if (WEL.open) WEL.after.push(fn); else fn(); }

(function () {
  const css = document.createElement('style');
  css.textContent = `
  #welcome{position:fixed;inset:0;z-index:1000;overflow:hidden;background:linear-gradient(#7fd0ff 0%,#bfeaff 38%,#9ad86a 62%,#5fae3e 100%);
    display:flex;flex-direction:column;align-items:center;justify-content:flex-end;font-family:Mitr,system-ui,sans-serif;color:#fff;user-select:none}
  #welcome .wbg{position:absolute;inset:0;background-size:cover;background-position:center}
  #welcome .wart{position:absolute;left:50%;top:44%;width:min(108vw,560px);transform:translate(-52%,-50%);filter:drop-shadow(0 10px 18px rgba(0,0,0,.25));animation:wfloat 3.2s ease-in-out infinite}
  #welcome .wtitle{position:absolute;left:0;right:0;top:7%;text-align:center}
  #welcome .wtitle b{display:block;font-weight:900;font-size:min(22vw,104px);line-height:1;letter-spacing:2px;color:#ffd84a;
    -webkit-text-stroke:6px #6a3a08;paint-order:stroke fill;text-shadow:0 6px 0 #6a3a08,0 12px 22px rgba(0,0,0,.35);animation:wpop .7s cubic-bezier(.2,1.6,.4,1) both}
  #welcome .wtitle span{display:inline-block;margin-top:8px;padding:6px 16px;border-radius:999px;background:rgba(106,58,8,.82);font-weight:800;font-size:min(5vw,22px)}
  #welcome .wbox{position:relative;width:min(86vw,420px);margin-bottom:max(8vh,40px);display:flex;flex-direction:column;align-items:center;gap:10px}
  #welcome .wbar{width:100%;height:18px;border-radius:999px;background:rgba(0,0,0,.35);border:3px solid #6a3a08;overflow:hidden;box-shadow:0 4px 0 rgba(0,0,0,.25)}
  #welcome .wfill{height:100%;width:0;border-radius:999px;background:linear-gradient(#ffe680,#f2b318);transition:width .25s}
  #welcome .wfill.busy{width:35%!important;animation:wbusy 1.1s ease-in-out infinite alternate}
  #welcome .wmsg{font-weight:800;font-size:15px;text-shadow:0 2px 0 rgba(0,0,0,.45);text-align:center;min-height:22px}
  #welcome .wgo{border:0;border-radius:20px;padding:14px 34px;font:900 22px Mitr,system-ui,sans-serif;color:#fff;background:linear-gradient(#ffb03a,#f2711c);
    box-shadow:0 6px 0 #a8460c,0 12px 24px rgba(0,0,0,.3);animation:wpulse 1.1s ease-in-out infinite}
  #welcome .wskip{border:0;background:rgba(0,0,0,.35);color:#fff;border-radius:12px;padding:6px 12px;font:700 13px Mitr,system-ui,sans-serif}
  #welcome .wver{position:absolute;right:10px;bottom:8px;font-size:11px;opacity:.75}
  @keyframes wfloat{50%{transform:translate(-52%,-53%)}}
  @keyframes wpop{from{transform:scale(.2);opacity:0}}
  @keyframes wpulse{50%{transform:scale(1.06)}}
  @keyframes wbusy{from{margin-left:0}to{margin-left:65%}}`;
  document.head.appendChild(css);
  const el = document.createElement('div'); el.id = 'welcome';
  el.innerHTML = `<div class="wbg"></div><img class="wart" src="img/shrine.webp" alt="">
    <div class="wtitle"><b>MOLT</b><span>🦆 เป็ดพิทักษ์ไข่ทองคำ 🥚</span></div>
    <div class="wbox"><div class="wmsg">กำลังโหลด…</div><div class="wbar"><div class="wfill"></div></div>
    <button class="wgo" style="display:none">แตะเพื่อเริ่มเล่น ▶</button><button class="wskip" style="display:none">เล่นเลย (อัปเดตต่อเบื้องหลัง)</button></div>
    <div class="wver"></div>`;
  document.body.appendChild(el);
  // a painted welcome picture (img/welcome.jpg) replaces the drawn title screen once it exists
  const pic = new Image();
  pic.onload = () => { el.querySelector('.wbg').style.backgroundImage = 'url(img/welcome.jpg)'; el.querySelector('.wart').style.display = 'none'; el.querySelector('.wtitle').style.display = 'none'; };
  pic.src = 'img/welcome.jpg';
  const msg = el.querySelector('.wmsg'), fill = el.querySelector('.wfill'), go = el.querySelector('.wgo'), skip = el.querySelector('.wskip');
  try { el.querySelector('.wver').textContent = window.AndroidPatch ? 'รุ่น ' + AndroidPatch.version() : ''; } catch (e) {}

  function imgProgress() {
    const all = Object.values(typeof IMG !== 'undefined' ? IMG : {});
    if (!all.length) return 1;
    return all.filter(i => i.complete).length / all.length;
  }
  function setReady(text) {
    if (WEL.ready) return; WEL.ready = true;
    fill.classList.remove('busy'); fill.style.width = '100%';
    msg.textContent = text || 'พร้อมแล้ว!'; go.style.display = ''; skip.style.display = 'none';
  }
  function curVersion() { try { return window.AndroidPatch ? AndroidPatch.version() : 0; } catch (e) { return 0; } }
  function restartInto(v) {
    // already running this version (the app remembers "ready" until it is closed): don't reload again
    if (v && v <= curVersion()) { setReady('เกมเป็นรุ่นล่าสุดแล้ว ✅'); return; }
    let tries = 0; try { tries = +(sessionStorage.getItem('molt_reload_' + v) || 0); sessionStorage.setItem('molt_reload_' + v, tries + 1); } catch (e) {}
    if (tries >= 1) { setReady('พร้อมแล้ว!'); return; }
    if (WEL.auto) return; WEL.auto = true;
    fill.classList.remove('busy'); fill.style.width = '100%';
    msg.textContent = `✨ โหลดรุ่นใหม่ ${v ? '(' + v + ') ' : ''}เสร็จแล้ว กำลังเปิดเกมใหม่…`;
    go.style.display = 'none'; skip.style.display = 'none';
    setTimeout(() => { try { persist(); } catch (e) {} try { AndroidPatch.reload(); } catch (e) { location.reload(); } }, 700);
  }
  // td.js asks us first when a patch finishes downloading
  window.welcomePatchReady = v => { if (!WEL.open) return false; restartInto(v); return true; };

  const hasState = !!(window.AndroidPatch && typeof AndroidPatch.state === 'function');
  function tick() {
    if (!WEL.open || WEL.auto) return;
    const ip = imgProgress();
    if (hasState) {
      let st = {}; try { st = JSON.parse(AndroidPatch.state()); } catch (e) {}
      if (st.s === 'checking' || st.s === 'idle') { msg.textContent = 'กำลังตรวจหาอัปเดต…'; fill.style.width = Math.round(ip * 30) + '%'; }
      else if (st.s === 'download') { const k = st.total ? st.done / st.total : 0; msg.textContent = `📥 กำลังโหลดอัปเดต ${st.done}/${st.total} ไฟล์`; fill.style.width = Math.round(30 + k * 70) + '%'; }
      else if (st.s === 'ready') { restartInto(st.v); if (!WEL.auto) return; return; }
      else if (st.s === 'none' || st.s === 'offline') { if (ip >= 1) { setReady(st.s === 'offline' ? 'ออฟไลน์อยู่ เล่นรุ่นเดิมได้เลย' : 'เกมเป็นรุ่นล่าสุดแล้ว ✅'); return; } msg.textContent = 'กำลังโหลดภาพ…'; fill.style.width = Math.round(30 + ip * 70) + '%'; }
    } else if (window.AndroidPatch) {
      // older app: it can only tell us when a patch is done, so give it a few seconds
      const t = (performance.now() - WEL.t0) / 1000;
      msg.textContent = 'กำลังตรวจหาอัปเดต…'; fill.classList.add('busy');
      if (t > 4.5 && ip >= 1) { setReady('พร้อมแล้ว!'); return; }
    } else {
      fill.style.width = Math.round(ip * 100) + '%'; msg.textContent = 'กำลังโหลดภาพ…';
      if (ip >= 1 && performance.now() - WEL.t0 > 700) { setReady('พร้อมแล้ว!'); return; }
    }
    if (!WEL.ready && performance.now() - WEL.t0 > 9000) skip.style.display = '';
    setTimeout(tick, 150);
  }
  tick();

  function close() {
    if (!WEL.open) return;
    try { SFX.init(); SFX.play('click'); } catch (e) {}
    WEL.open = false; el.style.transition = 'opacity .35s'; el.style.opacity = '0';
    setTimeout(() => el.remove(), 380);
    const q = WEL.after; WEL.after = []; q.forEach(f => { try { f(); } catch (e) {} });
  }
  window.closeWelcome = close;
  go.onclick = close;
  skip.onclick = close;
})();
