/* ============================================================
   PREVIEW BEHAVIOUR: "Bands"
   Companion to theme-bands.css. Loads alongside main.js, touches nothing
   main.js owns.

   Two jobs:
     1. the service track: buttons and arrows drive a native scroll-snap
        rail, and the rail drives the buttons back
     2. the fixed header inverts, and picks up the right scrim colour,
        whenever a light band is behind it
   ============================================================ */
(function () {
  'use strict';

  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduced = function () { return !!(mq && mq.matches); };

  /* ---------- 1. SERVICE TRACK ----------
     Deliberately NOT a tablist. Every card is visible at once in a
     scrollable rail, so promising one-panel-per-tab would lie to a screen
     reader: it would be told "1 of 6 selected" and then read all six. This
     is a labelled scroll region plus a group of buttons that move it, which
     is what it actually is. */
  function initTrack(root) {
    var rail = root.querySelector('[data-rail]');
    var viewport = root.querySelector('[data-viewport]');
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-track-tab]'));
    var cards = Array.prototype.slice.call(root.querySelectorAll('.track-card'));
    var prev = root.querySelector('[data-track-prev]');
    var next = root.querySelector('[data-track-next]');
    var fill = root.querySelector('[data-track-fill]');
    var label = root.querySelector('[data-track-label]');
    if (!rail || !viewport || !cards.length) return;

    var active = 0;

    // The rail carries a leading gutter so the first card lines up with the
    // tab row, and the scroller reserves it via scroll-padding. Both the
    // scroll target and the active-card lookup have to subtract it.
    function railPad() {
      return parseFloat(getComputedStyle(rail).paddingInlineStart) || 0;
    }
    function offsetOf(card) {
      return card.offsetLeft - rail.offsetLeft - railPad();
    }

    function go(i, focusBtn) {
      i = Math.max(0, Math.min(cards.length - 1, i));
      var card = cards[i];
      // scrollLeft rather than scrollIntoView: scrollIntoView also nudges
      // the page vertically, which fights the reveal animations.
      viewport.scrollTo({
        left: offsetOf(card),
        behavior: reduced() ? 'auto' : 'smooth'
      });
      setActive(i);
      if (focusBtn && tabs[i]) tabs[i].focus();
    }

    function setActive(i) {
      active = i;
      tabs.forEach(function (t, n) {
        // aria-current, not aria-selected: these are buttons that move a
        // scroller, and every button stays in the tab order.
        if (n === i) t.setAttribute('aria-current', 'true');
        else t.removeAttribute('aria-current');
      });
      // The arrows stay focusable at the ends. `disabled` would drop the
      // focused element out of the tab order mid-interaction and dump focus
      // to the body.
      if (prev) prev.setAttribute('aria-disabled', i === 0 ? 'true' : 'false');
      if (next) next.setAttribute('aria-disabled', i === cards.length - 1 ? 'true' : 'false');
      if (fill) fill.style.width = ((i + 1) / cards.length * 100) + '%';
      if (label) label.textContent = (i + 1) + ' of ' + cards.length;
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { go(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key;
        if (k === 'ArrowRight') { e.preventDefault(); go(active + 1, true); }
        else if (k === 'ArrowLeft') { e.preventDefault(); go(active - 1, true); }
        else if (k === 'Home') { e.preventDefault(); go(0, true); }
        else if (k === 'End') { e.preventDefault(); go(cards.length - 1, true); }
      });
    });

    function step(delta) {
      return function () {
        // aria-disabled does not block activation the way disabled does, so
        // the guard lives here.
        if (delta < 0 && active === 0) return;
        if (delta > 0 && active === cards.length - 1) return;
        go(active + delta);
      };
    }
    if (prev) prev.addEventListener('click', step(-1));
    if (next) next.addEventListener('click', step(1));

    // The rail is the source of truth: a swipe has to move the buttons too.
    var settle;
    viewport.addEventListener('scroll', function () {
      clearTimeout(settle);
      settle = setTimeout(function () {
        var x = viewport.scrollLeft;
        var best = 0, bestD = Infinity;
        cards.forEach(function (c, n) {
          var d = Math.abs(offsetOf(c) - x);
          if (d < bestD) { bestD = d; best = n; }
        });
        if (best !== active) setActive(best);
      }, 90);
    }, { passive: true });

    setActive(0);
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-track]'), initTrack);

  /* ---------- 2. HEADER OVER A LIGHT BAND ----------
     The header is fixed and its default palette is light-on-dark. Once
     sections own their own backgrounds it has to know what is behind it,
     and its scrim has to match that band rather than a single hard-coded
     colour: one scrim would paint a warm ground over the tint band. */
  var header = document.querySelector('.site-header');
  var lightBands = Array.prototype.slice.call(
    document.querySelectorAll('.band--bone, .band--tint, .band--paper')
  );

  if (header && lightBands.length) {
    /* This used to measure inside the scroll handler: offsetHeight, then
       getBoundingClientRect on every light band, then getComputedStyle on the
       one it found, and then it wrote a class and a custom property. Reading
       layout after writing to it forces the browser to recompute layout
       synchronously, and doing that on every scroll frame is the textbook
       cause of scrolling that feels heavy rather than glassy.

       Nothing being read here actually changes while you scroll. Band
       positions and background colours are fixed once the page has laid out,
       so they are measured once and again on resize, and the scroll path is
       then arithmetic against a cached list with no DOM reads at all. */
    var lastScrim = '';
    var lastHit = -1;
    var probe = 0;
    var geo = [];

    var measure = function () {
      /* Taken while the header is at whatever height it currently is. The
         difference between its resting and stuck heights is about 9px, which
         only shifts a band changeover by a frame. */
      probe = header.getBoundingClientRect().height * 0.55;
      var sy = window.pageYOffset;
      geo = [];
      for (var i = 0; i < lightBands.length; i++) {
        var r = lightBands[i].getBoundingClientRect();
        geo.push({
          top: r.top + sy,
          bottom: r.bottom + sy,
          bg: getComputedStyle(lightBands[i]).backgroundColor
        });
      }
    };

    var sync = function () {
      var y = window.pageYOffset + probe;
      var hit = -1;
      for (var i = 0; i < geo.length; i++) {
        if (geo[i].top <= y && geo[i].bottom > y) { hit = i; break; }
      }
      // Writing the same class and the same colour every frame still costs a
      // style invalidation, so nothing is touched unless the band changed.
      if (hit === lastHit) return;
      lastHit = hit;
      header.classList.toggle('on-light', hit >= 0);
      if (hit >= 0) {
        var bg = geo[hit].bg;
        if (bg && bg !== lastScrim) {
          header.style.setProperty('--hdr-scrim', bg);
          lastScrim = bg;
        }
      }
    };

    var queued = false;
    var onScroll = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; sync(); });
    };

    var remeasure = function () { measure(); lastHit = -1; sync(); };

    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', remeasure, { passive: true });
    // Late web fonts and images can move a band after first layout.
    addEventListener('load', remeasure);
    if (mq && mq.addEventListener) mq.addEventListener('change', remeasure);
    remeasure();
  }
})();
