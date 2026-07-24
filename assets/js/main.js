/* ============================================================
   TM ADVISORS / main.js
   No dependencies. ~7KB unminified. Shared across every page.
   ============================================================ */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---------- 1. Entrance / intro curtain ---------- */
  const html = document.documentElement;
  const intro = $('.intro');
  const startPage = () => html.classList.add('is-ready');
  // .intro-done is set by the inline <head> gate (repeat visit / deep link).
  const introActive = intro && !html.classList.contains('intro-done') && !reduceMotion;
  if (introActive) {
    // Let the hero rise as the curtain lifts (curtain lift begins ~1.15s in).
    setTimeout(startPage, 1150);
    intro.addEventListener('animationend', (e) => { if (e.animationName === 'intro-lift') intro.remove(); });
    setTimeout(() => intro && intro.remove(), 2600); // failsafe if animationend never fires
  } else {
    requestAnimationFrame(startPage);
    if (intro) intro.remove();
  }

  /* ---------- 2. Sticky header ---------- */
  const header = $('.site-header');
  if (header) {
    let ticking = false;
    const sync = () => {
      header.classList.toggle('is-stuck', window.scrollY > 24);
      ticking = false;
    };
    addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(sync); }
    }, { passive: true });
    sync();
  }

  /* ---------- 3. Client Portals dropdown (hover + click + keyboard) ---------- */
  $$('.dropdown').forEach((dd) => {
    const trigger = $('.dropdown-trigger', dd);
    if (!trigger) return;
    const open = (state) => {
      dd.dataset.open = String(state);
      trigger.setAttribute('aria-expanded', String(state));
    };
    trigger.addEventListener('click', (e) => { e.preventDefault(); open(dd.dataset.open !== 'true'); });
    /* Hover intent only where hovering is real. On a touch screen the browser
       synthesises mouseenter just before click, so the tap opened the menu and
       the click that followed immediately toggled it shut again. Reachable on
       any touch device wide enough to show the desktop nav, such as a tablet in
       landscape or a touchscreen laptop. */
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      dd.addEventListener('mouseenter', () => open(true));
      dd.addEventListener('mouseleave', () => open(false));
    }
    dd.addEventListener('focusout', (e) => { if (!dd.contains(e.relatedTarget)) open(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') open(false); });
    document.addEventListener('click', (e) => { if (!dd.contains(e.target)) open(false); });
  });

  /* ---------- 4. Mobile drawer ---------- */
  const drawer = $('#drawer');
  const burger = $('.burger');
  if (drawer && burger) {
    let lastFocus = null;
    /* Everything that is not the drawer goes inert while it is open. Without it,
       tabbing past the last drawer link walks straight into the header and page
       behind the overlay, and a screen reader reads content the user cannot see.
       The drawer is a direct child of body, so its siblings are the whole page. */
    const siblings = [...document.body.children].filter((el) => el !== drawer);
    const setDrawer = (state) => {
      drawer.classList.toggle('is-open', state);
      drawer.setAttribute('aria-hidden', String(!state));
      burger.setAttribute('aria-expanded', String(state));
      document.body.style.overflow = state ? 'hidden' : '';
      // Order matters on close: clear inert first, or the element we hand focus
      // back to is still unfocusable and focus silently falls to <body>.
      siblings.forEach((el) => state ? el.setAttribute('inert', '') : el.removeAttribute('inert'));
      if (state) { lastFocus = document.activeElement; $('.drawer-close', drawer)?.focus(); }
      else { lastFocus?.focus(); }
    };
    burger.addEventListener('click', () => setDrawer(!drawer.classList.contains('is-open')));
    $('.drawer-close', drawer)?.addEventListener('click', () => setDrawer(false));
    $$('a', drawer).forEach((a) => a.addEventListener('click', () => setDrawer(false)));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('is-open')) setDrawer(false); });
    setDrawer(false);
  }

  /* ---------- 5. Scroll reveal ---------- */
  const revealables = $$('.reveal');
  if (revealables.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealables.forEach((el) => el.classList.add('is-in'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });
      revealables.forEach((el) => io.observe(el));
    }
  }

  /* ---------- 6. Contour field (replaces Three.js, ~1KB, no library) ----------
     On a phone this canvas is the single most expensive thing on the page: a
     full-viewport repaint, forever, on a GPU with a fraction of a laptop's fill
     rate. The lines are drawn at alpha 0.05 to 0.135 under a 0.55 opacity layer,
     so on a small screen the motion is essentially imperceptible while the cost
     is not. Small screens and weak devices therefore get ONE static frame: the
     texture survives, the continuous cost goes to zero. */
  const canvas = $('#contour');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d', { alpha: true });
    const smallScreen = innerWidth <= 820;
    const weakDevice = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    const staticField = smallScreen || weakDevice;
    // Fewer lines and a lower ceiling on the backing store cut fill cost roughly
    // in half again for the one frame a small screen does paint.
    const LINES = smallScreen ? 18 : 26;
    const DPR_MAX = smallScreen ? 1.5 : 2;
    let w = 0, h = 0, dpr = 1, raf = 0, t = 0, visible = true;

    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, DPR_MAX);
      w = innerWidth; h = innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const step = h / (LINES - 1);
      for (let i = 0; i < LINES; i++) {
        const p = i / (LINES - 1);
        const baseY = i * step;
        // Amplitude swells toward the vertical centre, fades at the edges
        const amp = Math.sin(p * Math.PI) * (h * 0.075) + 6;
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += 14) {
          const nx = x / w;
          const y = baseY
            + Math.sin(nx * 4.4 + t + p * 3.1) * amp
            + Math.sin(nx * 9.3 - t * 0.68 + p * 5.4) * amp * 0.34;
          x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        const warm = Math.max(0, Math.sin(p * Math.PI - 0.5));
        ctx.strokeStyle = `rgba(${170 + warm * 55}, ${185 + warm * 30}, ${205 - warm * 55}, ${0.05 + Math.sin(p * Math.PI) * 0.085})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      t += 0.0032;
    };

    /* Park the animation for the duration of a scroll.
       Measured on a 1440x900 desktop at DPR 1.25, one frame of this canvas is
       2.02M backing pixels and 2756 path operations: 1.4ms median but up to
       10.8ms worst case, which is 65% of a 60fps budget, on the main thread,
       thirty times a second. On a retina display the backing store more than
       doubles again. Scrolling is precisely when the main thread has the least
       room to spare, and nobody is studying an ambient background while the page
       is moving. So it stops on the first scroll event and picks up again a beat
       after scrolling ends. Idle, the motion is exactly as it was. */
    let scrolling = false, scrollIdle = 0;
    addEventListener('scroll', () => {
      scrolling = true;
      clearTimeout(scrollIdle);
      scrollIdle = setTimeout(() => { scrolling = false; }, 180);
    }, { passive: true });

    let last = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (!visible || scrolling) return;
      if (now - last < 33) return; // cap at ~30fps, plenty for this and halves CPU
      last = now;
      draw();
    };

    /* Mobile browsers fire `resize` every time the URL bar slides away, which is
       to say constantly while scrolling. Reallocating the backing store there
       clears and rebuilds a full-screen bitmap mid-scroll, which is exactly the
       stutter people feel. Only a real width change (or a genuine orientation
       change) counts, and even that is debounced. */
    let lastW = innerWidth, lastH = innerHeight, resizeTimer = 0;
    const onResize = () => {
      if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 200) return;
      lastW = innerWidth; lastH = innerHeight;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resize(); draw(); }, 150);
    };

    resize();
    addEventListener('resize', onResize, { passive: true });

    if (staticField) {
      // One frame, taken a little way into the motion so the curves sit in a
      // pleasing phase rather than dead flat. Then nothing, for the whole visit.
      t = 1.35;
      draw();
    } else {
      document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
      raf = requestAnimationFrame(loop);
    }
  } else if (canvas) {
    canvas.remove();
  }

  /* ---------- 7. Team bio dialog ---------- */
  const dialog = $('#bio');
  const cards = $$('.member-trigger');
  if (dialog && cards.length && typeof dialog.showModal === 'function') {
    const order = cards.map((c) => c.dataset.member);
    const prevBtn = $('[data-bio-prev]', dialog);
    const nextBtn = $('[data-bio-next]', dialog);
    let index = 0;

    const render = (i) => {
      const card = cards[i];
      if (!card) return;
      index = i;
      const src = card.dataset.photo || '';
      $('#bio-name').textContent = card.dataset.name || '';
      $('#bio-role').textContent = card.dataset.role || '';
      $('#bio-body').innerHTML = $(`#bio-src-${card.dataset.member}`)?.innerHTML || '';
      const img = $('#bio-photo');
      img.src = src;
      img.alt = `Portrait of ${card.dataset.name || ''}`;
      prevBtn.disabled = i === 0;
      nextBtn.disabled = i === order.length - 1;
      // Which element actually scrolls depends on viewport: .bio-main owns the
      // overflow on desktop, .bio-grid takes over below 1024px. Reset both, or
      // paging to the next profile on mobile lands you mid-bio.
      $('.bio-main', dialog).scrollTop = 0;
      $('.bio-grid', dialog).scrollTop = 0;
    };

    cards.forEach((card, i) => {
      // The matching reset lives on the `close` handler below. It was clearing a
      // lock that nothing ever set, so the page behind the open bio still
      // scrolled under your finger on iOS.
      card.addEventListener('click', () => { render(i); document.body.style.overflow = 'hidden'; dialog.showModal(); });
    });
    prevBtn?.addEventListener('click', () => render(Math.max(0, index - 1)));
    nextBtn?.addEventListener('click', () => render(Math.min(order.length - 1, index + 1)));
    $('.bio-close', dialog)?.addEventListener('click', () => dialog.close());

    // Click the backdrop (outside the panel) to dismiss
    dialog.addEventListener('click', (e) => {
      const r = dialog.getBoundingClientRect();
      const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (outside) dialog.close();
    });

    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' && index > 0) render(index - 1);
      if (e.key === 'ArrowRight' && index < order.length - 1) render(index + 1);
    });

    // <dialog> locks scroll on its own in modern browsers, but Safari <17 needs help
    dialog.addEventListener('close', () => { document.body.style.overflow = ''; });
  }

  /* ---------- 8. Footer year ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- 9. Services ledger: scroll-spy + rail visibility ----------
     Only toggles classes (no motion), so it runs regardless of reduced-motion. */
  const ledger = $('.ledger');
  if (ledger && 'IntersectionObserver' in window) {
    const rows = $$('.ledger-row');
    const spyLinks = $$('[data-spy]');
    const rail = $('.ledger-rail');
    const setActive = (id) => {
      spyLinks.forEach((a) => {
        const on = a.getAttribute('href') === '#' + id;
        a.classList.toggle('is-active', on);
        if (a.dataset.spy === 'index') {
          on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
        }
      });
      rows.forEach((r) => r.classList.toggle('is-active', r.id === id));
    };
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    rows.forEach((r) => spy.observe(r));
    /* The last row can never reach the centre band, so activate it at page end.
       Throttled to one check per frame. Reading scrollHeight forces the browser
       to flush pending layout before it can answer, and scroll events fire more
       often than the page paints, so doing it per event meant repeatedly
       stalling the main thread mid scroll for a value that cannot have changed
       more than once per frame. */
    let endTick = false;
    addEventListener('scroll', () => {
      if (endTick) return;
      endTick = true;
      requestAnimationFrame(() => {
        endTick = false;
        if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) {
          setActive(rows[rows.length - 1].id);
        }
      });
    }, { passive: true });
    // Fade the fixed rail in only while the ledger is on screen.
    if (rail) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => rail.classList.toggle('is-visible', e.isIntersecting));
      }, { rootMargin: '-10% 0px -10% 0px' }).observe(ledger);
    }
  }
})();
