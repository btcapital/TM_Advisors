/* ============================================================
   TM ADVISORS / main.js
   No dependencies. ~7KB unminified. Shared across every page.
   ============================================================ */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---------- 1. Entrance ---------- */
  requestAnimationFrame(() => document.documentElement.classList.add('is-ready'));

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
    dd.addEventListener('mouseenter', () => open(true));
    dd.addEventListener('mouseleave', () => open(false));
    dd.addEventListener('focusout', (e) => { if (!dd.contains(e.relatedTarget)) open(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') open(false); });
    document.addEventListener('click', (e) => { if (!dd.contains(e.target)) open(false); });
  });

  /* ---------- 4. Mobile drawer ---------- */
  const drawer = $('#drawer');
  const burger = $('.burger');
  if (drawer && burger) {
    let lastFocus = null;
    const setDrawer = (state) => {
      drawer.classList.toggle('is-open', state);
      drawer.setAttribute('aria-hidden', String(!state));
      burger.setAttribute('aria-expanded', String(state));
      document.body.style.overflow = state ? 'hidden' : '';
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

  /* ---------- 6. Contour field (replaces Three.js, ~1KB, no library) ---------- */
  const canvas = $('#contour');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d', { alpha: true });
    const LINES = 26;
    let w = 0, h = 0, dpr = 1, raf = 0, t = 0, visible = true;

    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
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

    let last = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      if (now - last < 33) return; // cap at ~30fps, plenty for this and halves CPU
      last = now;
      draw();
    };

    resize();
    addEventListener('resize', () => { resize(); draw(); }, { passive: true });
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
    raf = requestAnimationFrame(loop);
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
      $('.bio-main', dialog).scrollTop = 0;
    };

    cards.forEach((card, i) => {
      card.addEventListener('click', () => { render(i); dialog.showModal(); });
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
})();
