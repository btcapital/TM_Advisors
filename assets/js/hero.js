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

  /* Domain-warped fractal noise: fbm is fed its own output twice, which is
     what stops the field ever settling into a shape you can name. The gold is
     gated on the fold being both high and steep, so it shows up where the
     surface catches light rather than as a wash over everything. */
  var FRAG = [
    'precision highp float;',
    'uniform vec2 u_res;',
    'uniform float u_time;',

    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',

    'float noise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),',
    '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
    '}',

    'float fbm(vec2 p){',
    '  float v = 0.0, a = 0.5;',
    '  for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; }',
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
    '  f = clamp((f - 0.28) * 1.85, 0.0, 1.0);',

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
    '  float d = length((uv - vec2(0.20, 0.36)) * vec2(1.05, 1.45));',
    '  col *= mix(0.62, 1.06, smoothstep(0.0, 0.66, d));',

    '  float sweepPos = fract(u_time * 0.045) * 2.6 - 0.75;',
    '  float band = exp(-pow((sweepPos - (uv.x * 0.82 + uv.y * 0.38)) * 2.1, 2.0));',
    '  col += band * vec3(0.055, 0.072, 0.095);',

    // Grain, in the shader rather than as a sixth composited layer.
    '  float g = hash(gl_FragCoord.xy + fract(u_time) * vec2(13.7, 71.3));',
    '  col += (g - 0.5) * 0.034;',

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

  /* Fill rate is the whole cost here, so the backing store is capped well
     below a retina ratio. The field has no edges, so nobody can tell. */
  function resize() {
    var r = host.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.max(1, Math.round(r.width * dpr));
    var h = Math.max(1, Math.round(r.height * dpr));
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
