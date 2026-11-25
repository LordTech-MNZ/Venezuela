(function () {
  var SRC = 'musica-fondo.mp3';
  var K = { muted: 'mnz-muted', time: 'mnz-time', pos: 'mnz-pos' };
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var css = document.createElement('style');
  css.textContent =
    '#mnz-music{position:fixed;z-index:9999;width:52px;height:52px;border-radius:50%;' +
    'border:1px solid var(--line,#352a52);background:var(--surface,#1c1530);color:var(--accent,#a87bff);' +
    'display:flex;align-items:center;justify-content:center;padding:0;cursor:grab;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.4);touch-action:none;user-select:none;-webkit-user-select:none;' +
    '-webkit-tap-highlight-color:transparent;transition:transform .15s}' +
    '#mnz-music:active{cursor:grabbing;transform:scale(.94)}' +
    '#mnz-music:focus-visible{outline:2px solid var(--accent,#a87bff);outline-offset:3px}' +
    '#mnz-music svg{width:26px;height:26px;pointer-events:none}' +
    '#mnz-music .off{display:none}#mnz-music.muted .on{display:none}#mnz-music.muted .off{display:block}';
  document.head.appendChild(css);

  var audio = new Audio(SRC);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 1;
  var t = parseFloat(get(K.time));
  if (t > 0) audio.addEventListener('loadedmetadata', function () {
    if (t < audio.duration) { try { audio.currentTime = t; } catch (e) {} }
  }, { once: true });

  var btn = document.createElement('button');
  btn.id = 'mnz-music';
  btn.type = 'button';
  btn.innerHTML =
    '<svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>' +
    '<svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="m22 9-6 6M16 9l6 6"/></svg>';
  document.body.appendChild(btn);

  function setMuted(m) {
    audio.muted = m;
    btn.classList.toggle('muted', m);
    btn.setAttribute('aria-pressed', m ? 'true' : 'false');
    btn.setAttribute('aria-label', m ? 'Activar la música de fondo' : 'Silenciar la música de fondo');
    btn.title = m ? 'Activar música' : 'Silenciar música';
    set(K.muted, m ? '1' : '0');
  }
  setMuted(get(K.muted) === '1');

  /* ---- reproducción (los navegadores bloquean el sonido automático) ---- */
  var gestureEvents = ['pointerdown', 'keydown', 'touchend'];
  function removeGestures() { gestureEvents.forEach(function (e) { document.removeEventListener(e, onGesture, true); }); }
  function onGesture(ev) {
    if (ev.target === btn || btn.contains(ev.target)) return;
    tryPlay();
  }
  function tryPlay() {
    var p = audio.play();
    if (p && p.then) p.then(removeGestures, function () {});
  }
  gestureEvents.forEach(function (e) { document.addEventListener(e, onGesture, true); });
  tryPlay();

  /* ---- posición flotante y arrastrable ---- */
  var M = 16, S = 52;
  function clamp(x, y) {
    return [Math.min(Math.max(8, x), window.innerWidth - S - 8), Math.min(Math.max(8, y), window.innerHeight - S - 8)];
  }
  function place(x, y) {
    var c = clamp(x, y);
    btn.style.left = c[0] + 'px'; btn.style.top = c[1] + 'px';
    btn.style.right = 'auto'; btn.style.bottom = 'auto';
    return c;
  }
  var saved = null;
  try { saved = JSON.parse(get(K.pos)); } catch (e) {}
  var fx = saved && typeof saved.x === 'number' ? saved.x : 1;
  var fy = saved && typeof saved.y === 'number' ? saved.y : 1;
  function applyFrac() {
    place(fx * (window.innerWidth - S - 2 * M) + M, fy * (window.innerHeight - S - 2 * M) + M);
  }
  applyFrac();
  window.addEventListener('resize', applyFrac);

  var drag = null;
  btn.addEventListener('pointerdown', function (e) {
    var r = btn.getBoundingClientRect();
    drag = { id: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
    try { btn.setPointerCapture(e.pointerId); } catch (er) {}
  });
  btn.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
    drag.moved = true;
    place(e.clientX - drag.ox, e.clientY - drag.oy);
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var moved = drag.moved; drag = null;
    if (moved) {
      var r = btn.getBoundingClientRect();
      fx = Math.min(1, Math.max(0, (r.left - M) / (window.innerWidth - S - 2 * M)));
      fy = Math.min(1, Math.max(0, (r.top - M) / (window.innerHeight - S - 2 * M)));
      set(K.pos, JSON.stringify({ x: fx, y: fy }));
      btn._justDragged = true;
      setTimeout(function () { btn._justDragged = false; }, 0);
    }
  }
  btn.addEventListener('pointerup', endDrag);
  btn.addEventListener('pointercancel', endDrag);

  btn.addEventListener('click', function () {
    if (btn._justDragged) return;
    var nowMuted = !audio.muted;
    setMuted(nowMuted);
    if (audio.paused) tryPlay();
  });

  /* ---- recordar el punto de la canción al cambiar de página ---- */
  function saveTime() { if (audio.currentTime > 0) set(K.time, String(audio.currentTime)); }
  setInterval(saveTime, 2000);
  window.addEventListener('pagehide', saveTime);
})();
