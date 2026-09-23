/* Hero atmosphere.

   Replaces five large composited CSS layers with one GPU surface. That is as
   much the point as the look is: the browser was blending three oversized
   gradient elements, a sheen and a grain tile every frame, underneath a fixed
   header that snapshots and blurs whatever sits behind it.

   Raw WebGL, no library. A scene graph, a camera and a mesh loader would all
   go unused here, and the repo's rule is zero dependencies.

   Progressive enhancement: the CSS fields in main.css stay exactly as they are
   and render on their own. This file only hides them once a context is live,
   so a browser without WebGL, or one that loses its context, still gets a lit
   surface rather than a flat band. */
(function () {
  'use strict';

  var host = document.querySelector('.hero-aurora');
  if (!host || !window.WebGLRenderingContext) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'hero-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  var gl = null;
  try {
    gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, powerPreference: 'low-power'
    });
  } catch (e) { gl = null; }
  if (!gl) return;

  var VERT = [
    'attribute vec2 a_pos;',
    'void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }'
  ].join('\n');

  /* Gradient noise, domain warped.

     The first version of this shader showed hard rectangular blocks at
     several scales. Two causes, both worth recording because both are easy
     to reintroduce.

     1. The hash was fract(sin(dot(p, k)) * 43758.5)). That idiom is
     everywhere, and it falls apart exactly here: the domain warp feeds
     already-warped coordinates back in, so the argument to sin gets large,
     and sin of a large float32 loses its low bits. Neighbouring lattice
     cells then hash to the same value and the lattice itself becomes
     visible, axis aligned, as blocks. Replaced with a multiply-and-fract
     hash that never calls a trig function.

     2. Value noise interpolates a scalar per lattice corner, so the grid
     survives smoothing. This is gradient noise: a random direction per
     corner, quintic interpolation, which is C2 continuous, so no crease
     falls on a cell boundary. Each octave is also rotated, because
     doubling frequency on an unrotated lattice stacks every octave's grid
     on the same axes, which is what made the blocks read as one grid
     rather than as noise. */
  var FRAG = [
    'precision highp float;',
    'uniform vec2 u_res;',
    'uniform float u_time;',

    'vec2 hash2(vec2 p){',
    '  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));',
    '  p3 += dot(p3, p3.yzx + 33.33);',
    '  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;',
    '}',

    'float gnoise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);',
    '  float a = dot(hash2(i), f);',
    '  float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));',
    '  float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));',
    '  float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 0.5 + 0.5;',
    '}',

    'float fbm(vec2 p){',
    '  float v = 0.0, a = 0.5;',
    '  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);',
    '  for (int i = 0; i < 5; i++){',
    '    v += a * gnoise(p);',
    '    p = rot * p * 2.03 + 11.7;',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',

    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / u_res;',
    '  vec2 p = uv; p.x *= u_res.x / u_res.y;',
    '  float t = u_time * 0.030;',

    '  vec2 q = vec2(fbm(p * 1.5 + vec2(0.0, t)),',
    '                fbm(p * 1.5 + vec2(3.2, -t * 0.75)));',
    '  vec2 r = vec2(fbm(p * 1.5 + 2.3 * q + vec2(1.7, 9.2) + t * 0.45),',
    '                fbm(p * 1.5 + 2.3 * q + vec2(8.3, 2.8) - t * 0.32));',
    '  float f = fbm(p * 1.5 + 2.5 * r);',
    /* Gradient noise clusters nearer its mean than the value noise it
       replaced, so the same remap left the field flatter and lost the bright
       plumes that were the part worth keeping. More gain, lower floor. */
    '  f = clamp((f - 0.255) * 2.40, 0.0, 1.0);',

    '  vec3 deep  = vec3(0.039, 0.071, 0.110);',
    '  vec3 navy  = vec3(0.086, 0.157, 0.239);',
    '  vec3 slate = vec3(0.227, 0.318, 0.420);',
    '  vec3 lift  = vec3(0.420, 0.553, 0.690);',
    '  vec3 gold  = vec3(0.773, 0.643, 0.494);',

    '  vec3 col = mix(deep, navy, smoothstep(0.00, 0.52, f));',
    '  col = mix(col, slate, smoothstep(0.34, 0.84, f));',
    '  col = mix(col, lift,  smoothstep(0.52, 0.98, f) * 0.88);',

    '  float catchLight = smoothstep(0.56, 0.90, f) * smoothstep(0.20, 0.70, r.x);',
    '  col = mix(col, gold, catchLight * 0.58);',

    // One light source: warm and bright upper right, falling to the lower
    // left. Same discipline as the CSS pass this replaces.
    '  float lit = smoothstep(0.05, 1.15, uv.x * 0.62 + uv.y * 0.72);',
    '  col *= mix(0.54, 1.34, lit);',

    // Headline and lede sit lower left. Sink that quadrant so the type never
    // has to fight the field for contrast.
    '  float dd = length((uv - vec2(0.20, 0.36)) * vec2(1.05, 1.45));',
    '  col *= mix(0.62, 1.06, smoothstep(0.0, 0.66, dd));',

    /* A soft band of light crossing the field on a 22s cycle. This is the
       part that reads as movement at a glance.

       Squared by multiplication, not by pow(). GLSL leaves pow(x, y)
       undefined for x < 0, and this base goes negative on half the screen
       by construction, which was the other half of the block artefact. */
    '  float s = (fract(u_time * 0.045) * 2.6 - 0.75) - (uv.x * 0.82 + uv.y * 0.38);',
    '  col += exp(-(s * s) * 4.41) * vec3(0.055, 0.072, 0.095);',

    /* Grain, in the shader rather than as a sixth composited layer. On the
       same hash as the noise: the version here was still sin based, with an
       unbounded u_time added inside the sin, so it had the same precision
       cliff as the lattice bug above, just slower to arrive. */
    '  float g = hash2(gl_FragCoord.xy + fract(u_time) * 431.7).x * 0.5 + 0.5;',
    '  col += (g - 0.5) * 0.030;',

    // Ordered dither before the 8 bit write. Smooth dark gradients band
    // badly at this depth, and banding reads as blockiness too.
    '  float dith = fract(dot(gl_FragCoord.xy, vec2(0.75487, 0.56984)));',
    '  col += (dith - 0.5) / 255.0;',

    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { gl.deleteShader(sh); return null; }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  /* One triangle covering the clip volume, not two for a quad: no seam down
     the diagonal, and one fewer vertex to no purpose. */
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, 'u_res');
  var uTime = gl.getUniformLocation(prog, 'u_time');

  /* Render at the display's real pixel ratio now that the field is the
     centrepiece, but under a total pixel budget, because fill rate is the
     entire cost and an ultrawide at 2x is four times the work of a laptop.
     Above the budget the ratio is scaled back rather than the cap being a
     flat number, so a big screen loses sharpness gradually. */
  var PIXEL_BUDGET = 2900000;

  function resize() {
    var r = host.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, r.width), h = Math.max(1, r.height);
    if (w * h * dpr * dpr > PIXEL_BUDGET) {
      dpr = Math.max(1, Math.sqrt(PIXEL_BUDGET / (w * h)));
    }
    w = Math.round(w * dpr);
    h = Math.round(h * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }
  }

  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var running = false, raf = 0, start = 0;
  var FROZEN = 8.0;

  function draw(seconds) {
    gl.uniform1f(uTime, seconds);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now) {
    if (!start) start = now;
    draw((now - start) / 1000);
    raf = requestAnimationFrame(frame);
  }

  function play() {
    if (running) return;
    running = true;
    resize();
    /* Asked not to move: render one good frame and stop. Still a lit surface,
       which was the note, and nothing travels. */
    if (reduce && reduce.matches) { draw(FROZEN); return; }
    start = 0;
    raf = requestAnimationFrame(frame);
  }

  function pause() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  host.appendChild(canvas);
  host.classList.add('gl-on');

  /* Off screen is off. Scrolling past the hero should not leave a shader
     running behind six bands of content. */
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) play(); else pause();
    }, { threshold: 0 }).observe(host);
  } else {
    play();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause(); else play();
  });

  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      resize();
      if (reduce && reduce.matches) draw(FROZEN);
    }, 120);
  }, { passive: true });

  if (reduce && reduce.addEventListener) {
    reduce.addEventListener('change', function () { pause(); play(); });
  }

  /* A lost context drops back to the CSS fields rather than to a flat band. */
  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    pause();
    host.classList.remove('gl-on');
  });

  play();
})();
