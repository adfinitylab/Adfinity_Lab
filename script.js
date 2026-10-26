const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= NAVBAR ================= */
(() => {
  const burger = $('#burger'), menu = $('#menu');
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  menu.addEventListener('click', e => {
    if (e.target.closest('a')) { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); }
  });

  // dark glass bar once you scroll, so the links stay readable on light sections
  const nav = $('.nav');
  const solid = () => nav.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', solid, { passive: true });
  solid();
})();

/* ================= HERO: 3D scene + hover-letter headline, then the loader ================= */
(() => {
  const hero = $('#home');
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------- 1. Glass blob (WebGL shader, white + #1B2C37 only) ---------- */
  const cv = $('#hxCanvas');
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FS = `
  precision highp float;
  uniform vec2 uRes; uniform float uT; uniform float uAmp; uniform vec2 uM;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
  // The artwork lives in a fixed 1.9-wide design space that is always fitted to the screen width and
  // pinned to the top, so the shape is identical on every screen size (no re-shaping on resize).
  float shape(vec2 p){
    float t=uT, amp=uAmp;
    p += (.010+.016*amp)*vec2(sin(p.y*1.7+t*.45), sin(p.x*1.3-t*.4));      // very gentle flow, silhouette stays clean
    float th=.33+.012*sin(t*.23)+uM.x*.02;
    mat2 R=mat2(cos(th),-sin(th),sin(th),cos(th));
    vec2 q=R*(p-vec2(.66,-.34));
    float sc=1.+.018*sin(t*.21)+.012*amp;                                 // slow breathing
    return sdRB(q/sc,vec2(.90,1.08),.58)*sc;
  }
  void main(){
    vec2 fc=gl_FragCoord.xy;
    float ref=max(uRes.x/1.9, uRes.y*.62);                                 // tall/narrow screens: scale up so the shape keeps its elegant sweep
    float xo=max(0.,1.9-uRes.x/ref)*.62;                                   // ...and show its top-right corner instead of squeezing the whole shape in
    vec2 p=vec2(fc.x/ref+xo, 1.+(fc.y-uRes.y)/ref);
    float t=uT, amp=uAmp;
    float d=shape(p);
    vec2 e=vec2(.0025,0.);
    vec2 n=normalize(vec2(shape(p+e.xy)-shape(p-e.xy),shape(p+e.yx)-shape(p-e.yx))+1e-5);
    float px=1.5/ref;                                                      // 1.5 screen pixels, keeps the edge crisp
    float inside=smoothstep(px,-px,d);
    vec2 L=normalize(vec2(.5+uM.x*.4,.85+uM.y*.3));
    float light=.5+.5*dot(n,L);
    float ang=atan(n.y,n.x);
    float sheen=pow(.5+.5*cos(ang-t*.35-1.1),3.);                          // a soft highlight that travels around the rim
    float rw=.013+.012*sheen;
    float rim=exp(d/rw)*inside*(.28+.55*light+.5*sheen);
    float rim2=exp(-pow((d+.05)/.006,2.))*(.10+.16*sheen)*inside;
    float rim3=exp(-pow((d+.085)/.005,2.))*.06*inside;
    float band=exp(-pow((d+.12)/.085,2.))*smoothstep(.15,.95,n.y)*.085*inside;
    float u=clamp(1.-p.y,0.,1.3);
    float bx=1.04-.30*u-.10*sin(u*3.)+.03*sin(t*.25+u*2.);                // the S-shaped seam inside the shape
    float lobe=smoothstep(-.03,.45,p.x-bx)*inside*smoothstep(.95,.55,p.y+.0);
    float seam=exp(-abs(p.x-bx)/.0045)*.13*inside*smoothstep(.9,.6,p.y);
    seam*=2.2;                                                            // the thin line: tinted logo blue
    float a=rim*.85+rim2+rim3+band+lobe*(.05+.03*(1.-p.y))+seam+.012*inside;
    a+=(hash(fc+fract(t))-.5)*.010;
    a=clamp(a,0.,.95);
    vec3 blue=vec3(.42,.66,.85);                                         // logo blue (#6BA8D8)
    gl_FragColor=vec4(vec3(max(a-seam,0.))+blue*min(seam,a),a);
  }`;
  let U = null, hasGL = !!gl;
  if (hasGL) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); hasGL = false; } return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr); gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    U = { res: gl.getUniformLocation(pr, 'uRes'), t: gl.getUniformLocation(pr, 'uT'), amp: gl.getUniformLocation(pr, 'uAmp'), m: gl.getUniformLocation(pr, 'uM') };
    gl.clearColor(0, 0, 0, 0);
  }
  let heroT0 = null, mx = 0, my = 0, tmx = 0, tmy = 0;
  addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - .5; tmy = .5 - e.clientY / innerHeight; }, { passive: true });
  const sizeScene = () => {
    if (!hasGL) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.5), s = .9;       // render a bit smaller: it is soft anyway
    cv.width = Math.round(hero.clientWidth * dpr * s); cv.height = Math.round(hero.clientHeight * dpr * s);
    gl.viewport(0, 0, cv.width, cv.height);
  };
  const CYCLE = 14;                                                     // seconds per morph cycle
  const scene = now => {
    if (!hasGL) return;
    const t = reduce ? 1.6 : (heroT0 === null ? 0 : (now - heroT0) / 1000) + 1.1;
    const ph = ((t % CYCLE) + CYCLE) % CYCLE / CYCLE;
    const amp = reduce ? 0 : .3 + .7 * Math.exp(-Math.pow((ph - .3) / .16, 2));  // calm -> quick liquid morph -> calm
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.res, cv.width, cv.height); gl.uniform1f(U.t, t); gl.uniform1f(U.amp, amp); mx += (tmx - mx) * .05; my += (tmy - my) * .05; gl.uniform2f(U.m, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  /* ---------- 2. Headline: hover a letter, it grows; leave, it settles ---------- */
  // The headline is the logo, cut into letter slices (img/hero-*.png). Each slice is sized in em
  // (width = slice width / logo height), so the pop animation below works exactly as it did with text.
  const LOGO_H = 583;                                                    // logo slice height in px
  const LOGO_TOP = [['ad', 717], ['f', 263], ['i1', 134], ['n', 357], ['i2', 132], ['t', 250], ['y', 431]];
  const LOGO_BOT = [['L', 429], ['a', 364], ['b', 373]];
  const row = $('#hxRow'), letters = [];
  const mk = (list, host) => list.forEach(([n, w]) => {
    const el = document.createElement('span'); el.className = 'hx-ch hx-ch--img';
    el.style.backgroundImage = `url(img/hero-${n}.png)`; el.style.setProperty('--ar', (w / LOGO_H).toFixed(4));
    host.append(el);
    letters.push({ el, size: 0, vel: 0, rot: 0, relX: 0 });
  });
  mk(LOGO_TOP, $('#hxW1')); mk(LOGO_BOT, $('#hxW2'));

  const CAP = 1.0;                                                       // logo height in em: raise/lower to resize the logo
  let W, H, REST, SMALL, BIG, restW = 0, restH = 0, active = -1;
  const measure = () => {
    const hp0 = hero.style.getPropertyValue('--hp'); hero.style.setProperty('--hp', 0);   // measure without the scroll parallax
    W = hero.clientWidth; H = hero.clientHeight;
    REST = Math.min(W * .115, H * .2);
    SMALL = REST * .3;
    BIG = Math.min(H * .34, W * .45) / CAP;           // pop size: lower the .34 for a smaller pop
    letters.forEach(l => { l.size = REST; l.vel = 0; l.el.style.fontSize = REST + 'px'; l.el.style.transform = 'none'; });
    row.style.height = REST * CAP + 'px';
    const SCALE = [4, 8, 12, 16, 24, 32, 48, 64, 96];                    // spacing scale
    const snap = v => SCALE.reduce((m, s) => Math.abs(s - v) < Math.abs(m - v) ? s : m, SCALE[0]);
    $('#hxW1').style.marginRight = snap(REST * .32) + 'px';
    const rr = row.getBoundingClientRect();
    restW = rr.width; restH = rr.height;
    letters.forEach(l => { const r = l.el.getBoundingClientRect(); l.relX = r.left + r.width / 2 - rr.left; });
    active = -1;
    sizeScene();
    if (hp0) hero.style.setProperty('--hp', hp0);
  };

  // hit test uses live hero position, so it keeps working after the page has scrolled
  const onMove = e => {
    const hr = hero.getBoundingClientRect(), pad = REST * .12;
    const left = hr.left + (W - restW) / 2, top = hr.top + (H - restH) / 2, x = e.clientX, y = e.clientY;
    let on = x >= left - pad && x <= left + restW + pad && y >= top - pad && y <= top + restH + pad;
    if (!on && active >= 0) { const c = row.getBoundingClientRect(); on = x >= c.left && x <= c.right && y >= c.top && y <= c.bottom; }
    if (on) {
      let best = 0, d = Infinity;
      letters.forEach((l, i) => { const k = Math.abs(left + l.relX - x); if (k < d) { d = k; best = i; } });
      active = best;
    } else active = -1;
  };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onMove, { passive: true });
  addEventListener('pointerup', e => { if (e.pointerType === 'touch') active = -1; });
  addEventListener('pointercancel', () => { active = -1; });
  document.documentElement.addEventListener('pointerleave', () => { active = -1; });

  const K = 190, D = 17;
  const letterStep = dt => {
    let maxSize = REST;
    letters.forEach((l, i) => {
      const target = active < 0 ? REST : (i === active ? BIG : SMALL);
      if (reduce) { l.size = target; l.vel = 0; l.rot = 0; }
      else { l.vel += (K * (target - l.size) - D * l.vel) * dt; l.size += l.vel * dt; l.rot = Math.max(-14, Math.min(14, l.vel * .004)); }
      if (l.size < 1) l.size = 1;
      maxSize = Math.max(maxSize, l.size);
      l.el.style.fontSize = l.size.toFixed(2) + 'px';
      l.el.style.transform = l.rot ? `rotate(${l.rot.toFixed(2)}deg)` : 'none';
    });
    row.style.height = (maxSize * CAP).toFixed(2) + 'px';
  };

  /* ---------- 3. One loop, only while the hero is on screen ---------- */
  let visible = true, running = false, last = performance.now();
  const frame = now => {
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min((now - last) / 1000, .034); last = now;
    scene(now); letterStep(dt);
    requestAnimationFrame(frame);
  };
  const kick = () => { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (!visible) active = -1; kick(); }).observe(hero);
  document.addEventListener('visibilitychange', kick);
  addEventListener('resize', measure);

  measure();
  document.fonts.ready.then(measure);
  kick();
  const startHero = () => { heroT0 = performance.now(); measure(); };                  // re-measure once the loader is gone

  /* ================= Loader: ADFINITY + 00 -> 100, then reveal the page ================= */
  const num = $('#num'), lineFill = $('#lineFill'), loader = $('#loader');
  const pageReady = Promise.all([
    document.fonts.ready,
    document.readyState === 'complete' ? 0 : new Promise(r => addEventListener('load', r, { once: true }))
  ]);

  const DURATION = reduce ? 300 : 2400;
  const t0 = performance.now();
  (function count(now) {
    const p = Math.min((now - t0) / DURATION, 1);
    const v = Math.round((1 - Math.pow(1 - p, 2)) * 100);
    num.textContent = String(v).padStart(2, '0');
    lineFill.style.width = v + '%';
    if (p < 1) return requestAnimationFrame(count);
    pageReady.then(() => setTimeout(() => {
      loader.classList.add('done');
      document.body.classList.add('ready');
      setTimeout(startHero, 400);
    }, 500));
  })(t0);
})();

/* ================= SERVICES + PROCESS ================= */
(() => {
  /* Services: pinned slides */
  const section = $('#services'), slides = $$('.slide');
  const bar = $('#bar'), counter = $('#counter');
  const N = slides.length;
  let shown = -1, stepTimer = null;
  const STEP_MS = 1050;                             // keep each service visible long enough to read

  section.style.height = (N + 1) * 100 + 'vh'; // reserve one full viewport of scroll for every service

  function show(index) {
    shown = index;
    slides.forEach((s, i) => {
      s.classList.toggle('is-active', i === index);
      s.classList.toggle('is-before', i < index);   // passed -> waits on the left
    });
    counter.textContent = `[${index + 1} /${N}]`;
    bar.style.width = ((index + 1) / N) * 100 + '%';
  }

  let target = 0;
  function step() {
    if (shown === target) return;
    show(shown + Math.sign(target - shown));        // one slide at a time, never skip
    stepTimer = setTimeout(() => { stepTimer = null; step(); }, STEP_MS);
  }

  function updateServices() {
    const max = section.offsetHeight - innerHeight;
    const progress = Math.min(Math.max(-section.getBoundingClientRect().top / max, 0), 1);
    target = Math.min(N - 1, Math.floor(progress * N));
    if (shown === -1) return show(target);
    if (!stepTimer) step();
  }

  /* Process: active step + progress line */
  const steps = $$('.step'), list = $('#steps'), fill = $('#fill');

  // a thin band in the middle of the screen = "active zone"
  const stepObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) steps.forEach(s => s.classList.toggle('is-active', s === e.target));
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => stepObserver.observe(s));

  function updateLine() {
    const r = list.getBoundingClientRect();
    const progress = (innerHeight / 2 - r.top) / r.height;   // 0 -> 1
    fill.style.height = Math.min(Math.max(progress, 0), 1) * 100 + '%';
  }

  /* One shared scroll listener for both sections */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateServices(); updateLine(); ticking = false; });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  updateServices();
  updateLine();
})();

/* ================= WHY ADFINITY ================= */
(() => {
  const panels = $$('.panels .panel');
  let current = -1;
  let timer;

  // number count-up (ROAS gauge)
  function countUp(el) {
    if (reduce) return;                          // text already shows the final number
    const target = +el.dataset.count;
    const dec = +el.dataset.dec || 0;
    const start = performance.now() + 500;       // wait for the panel to open
    const frame = now => {
      const p = Math.min(Math.max((now - start) / 1400, 0), 1);
      el.textContent = (target * (1 - (1 - p) ** 3)).toFixed(dec);
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  function openPanel(i) {
    if (i === current) return;
    current = i;
    panels.forEach((p, n) => {
      p.classList.toggle('active', n === i);
      p.setAttribute('aria-expanded', n === i);
    });
    panels[i].querySelectorAll('[data-count]').forEach(countUp);
  }

  // visitor takes control -> stop auto-play
  panels.forEach((p, i) => {
    const pick = () => { clearInterval(timer); openPanel(i); };
    ['mouseenter', 'click', 'focus'].forEach(ev => p.addEventListener(ev, pick));
    p.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
    });
  });

  // start only when the section is on screen, so the visitor sees the first animation
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    if (current >= 0) return;                    // visitor already picked a panel
    openPanel(0);
    if (!reduce) timer = setInterval(() => openPanel((current + 1) % panels.length), 5500);
  }, { threshold: 0.2 }).observe($('.panels'));
})();


/* ================= FAQ ================= */
(() => {
  const items = $$('.faq__item'), search = $('#faqSearch'), empty = $('#faqEmpty');

  const setOpen = (item, open) => {
    item.classList.toggle('is-open', open);
    item.querySelector('.faq__q').setAttribute('aria-expanded', open);
  };

  // click a question: open it and close the others (click an open one to close it)
  items.forEach(item => item.querySelector('.faq__q').addEventListener('click', () => {
    const open = !item.classList.contains('is-open');
    items.forEach(i => setOpen(i, i === item && open));
  }));

  // search: hide questions that don't match, open the first match
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let first = null;
    items.forEach(i => {
      const match = i.textContent.toLowerCase().includes(q);
      i.hidden = !match;
      if (match && !first) first = i;
    });
    empty.hidden = !!first;
    if (q && first) items.forEach(i => setOpen(i, i === first));
  });
})();


/* ================= CONTACT FORM ================= */
(() => {
  const form = $('#contactForm'), status = $('#status'), btn = form.querySelector('button');
  const say = (msg, type = '') => { status.textContent = msg; status.className = 'contact__status ' + type; };

  form.addEventListener('input', e => e.target.classList.remove('invalid'));

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // every field needs text, and the email needs a valid shape
    let valid = true;
    form.querySelectorAll('input, textarea').forEach(f => {
      const v = f.value.trim();
      const ok = f.type === 'email' ? /^\S+@\S+\.\S+$/.test(v) : v !== '';
      f.classList.toggle('invalid', !ok);
      if (!ok) valid = false;
    });
    if (!valid) return say('Fill in every field with a valid email.', 'error');

    btn.disabled = true;
    btn.textContent = 'Sending...';
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) throw new Error(res.status);   // fetch does NOT throw on 404/500 by itself
      form.reset();
      say('Sent. We’ll reply soon.', 'ok');
    } catch {
      say('Couldn’t send. Try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit';
    }
  });
})();

/* ================= SCROLL REVEAL (up / from the left / from the right) ================= */
(() => {
  if (reduce || !('IntersectionObserver' in window)) return;   // content stays visible
  document.documentElement.classList.add('js-anim');
  const seen = new Set();
  const add = (sel, dir, stagger = true) => $$(sel).forEach((el, i) => {
    if (seen.has(el)) return;
    seen.add(el);
    el.classList.add('reveal', 'reveal-' + (typeof dir === 'function' ? dir(i) : dir));
    el.style.setProperty('--rd', (stagger ? Math.min(i, 5) * 0.08 : 0) + 's');
  });
  const alt = i => (i % 2 ? 'r' : 'l');
  add('.process__head', 'l');
  add('.step', alt, false);                                      // steps swing in from alternating sides
  add('.why-head', 'u');
  add('.faq h2', 'l'); add('.faq__search', 'r'); add('.faq__item', alt); add('.faq__art', 'r');
  add('.contact__info > *', 'l'); add('.contact__form', 'r');
  add('.ft__grid > *', 'u');
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  seen.forEach(el => io.observe(el));

  // Why-Us cards rise one after another
  const panels = $('.panels');
  panels.querySelectorAll('.panel').forEach((p, i) => p.style.setProperty('--i', i));
  new IntersectionObserver(([en], o) => { if (en.isIntersecting) { panels.classList.add('in-view'); o.disconnect(); } },
    { threshold: 0.15 }).observe(panels);
})();

/* ================= SCROLL FEEL: smooth wheel, parallax, word-by-word shading, marquee speed ================= */
(() => {
  if (reduce) return;
  const root = document.documentElement;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---- 1. smooth, inertial wheel scrolling (mouse devices only; touch keeps its native momentum) ---- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    root.classList.add('smooth');
    let target = scrollY, current = scrollY, raf = 0, lt = 0;
    const max = () => root.scrollHeight - innerHeight;
    const run = () => { if (!raf) { lt = 0; raf = requestAnimationFrame(tick); } };
    function tick(now) {
      const dt = Math.min(((now || 0) - lt) / 16.67, 4) || 1; lt = now || 0;          // same feel at any frame rate
      current += (target - current) * (1 - Math.pow(1 - 0.075, dt));
      if (Math.abs(target - current) < 0.4) { current = target; raf = 0; scrollTo(0, current); return; }
      scrollTo(0, current);
      raf = requestAnimationFrame(tick);
    }
    addEventListener('wheel', e => {
      if (e.ctrlKey || e.target.closest('textarea')) return;       // pinch-zoom and text areas stay native
      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 32; else if (e.deltaMode === 2) dy *= innerHeight;
      // Prevent a high-resolution mouse wheel / fast wheel flick from queuing a huge jump.
      // Keep a little momentum, but never let the target run far ahead of the visible page.
      const step = Math.max(-180, Math.min(180, dy));
      target = clamp(target + step, 0, max());
      target = clamp(target, current - 260, current + 520);
      run();
    }, { passive: false });
    addEventListener('scroll', () => {                              // keyboard, scrollbar drag, anchors: hand control back
      if (raf && Math.abs(scrollY - current) > 3) { cancelAnimationFrame(raf); raf = 0; }
      if (!raf) target = current = scrollY;
    }, { passive: true });
    document.addEventListener('click', e => {                       // #links glide too
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      const el = document.querySelector(a.getAttribute('href'));
      if (!el) return;
      e.preventDefault();
      target = clamp(el.getBoundingClientRect().top + scrollY, 0, max());
      current = scrollY;
      run();
    });
  }

  /* ---- 2. split headings and intro text into words that light up while you scroll ---- */
  const shades = [];
  ['.process__head h2', '.process__head p', '.why-head h2', '.why-head p', '.faq h2', '.contact__info h2', '.contact__lead']
    .forEach(sel => $$(sel).forEach(el => {
      if (el.children.length) return;
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      const spans = words.map((w, i) => {
        const s = document.createElement('span'); s.className = 'w'; s.textContent = w; el.append(s);
        if (i < words.length - 1) el.append(' ');
        return s;
      });
      shades.push({ el, spans, last: [] });
    }));

  /* ---- 3. scroll-linked bits ---- */
  const hero = $('#home'), svc = $('#services'), slides = $$('.slide');
  const ghost = $('.contact__ghost'), faqArt = $('.faq__art'), marquee = $('.ft-marquee__track');
  const bar = document.createElement('div'); bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true'); document.body.append(bar);
  let anim = null, lastY = scrollY, sv = 0, idle = 0, ticking = false;

  function update() {
    const y = scrollY, vh = innerHeight;
    const dv = y - lastY; lastY = y;
    sv += (Math.abs(dv) - sv) * 0.12;

    bar.style.transform = `scaleX(${clamp(y / (root.scrollHeight - vh || 1))})`;
    hero.style.setProperty('--hp', clamp(y / (hero.offsetHeight * 0.9)).toFixed(4));

    // services: title and text drift apart, the square tilts, while you move through each slide
    const sr = svc.getBoundingClientRect(), smax = svc.offsetHeight - vh;
    if (sr.top < vh && sr.bottom > 0) {
      const prog = clamp(-sr.top / smax), pos = prog * slides.length, idx = Math.min(slides.length - 1, Math.floor(pos));
      const f = clamp(pos - idx) - 0.5, act = $('.slide.is-active');
      if (act) {
        act.querySelector('.slide__title').style.translate = `${(-f * 40).toFixed(1)}px 0`;
        act.querySelector('.slide__text').style.translate = `${(f * 40).toFixed(1)}px 0`;
        act.querySelector('.slide__tile').style.rotate = `${(f * 8).toFixed(2)}deg`;
      }
    }

    // word-by-word shading
    shades.forEach(s => {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const p = clamp((vh * 0.92 - r.top) / (vh * 0.36)), n = s.spans.length;
      s.spans.forEach((w, i) => {
        const o = (0.14 + 0.86 * clamp(p * (n + 2) - i)).toFixed(2);
        if (s.last[i] !== o) { w.style.opacity = o; s.last[i] = o; }
      });
    });

    // big CONTACT word glides sideways, FAQ art tilts
    const g = ghost.getBoundingClientRect();
    ghost.style.translate = `${((clamp((vh - g.top) / (vh + g.height)) - 0.5) * -16).toFixed(2)}vw 0`;
    const fr = faqArt.getBoundingClientRect();
    faqArt.style.rotate = `${((clamp((vh - fr.top) / (vh + fr.height)) - 0.5) * 8).toFixed(2)}deg`;

    // footer marquee speeds up with scroll speed
    if (!anim) anim = marquee.getAnimations()[0];
    if (anim) anim.playbackRate = 1 + Math.min(sv * 0.4, 8);

    idle = (Math.abs(dv) < 0.05 && sv < 0.05) ? idle + 1 : 0;
    if (idle > 8) { ticking = false; if (anim) anim.playbackRate = 1; return; }
    requestAnimationFrame(update);
  }
  const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  kick();
})();

/* ================= FOOTER ================= */
(() => {
  document.getElementById('ftYear').textContent = new Date().getFullYear();

  const cta = document.getElementById('ftCta');
  const btn = document.getElementById('ftBtn');

  // only for devices with a real mouse (CSS handles touch screens)
  if (!matchMedia('(hover: hover)').matches) return;

  let x = 0, y = 0;     // current button position
  let tx = 0, ty = 0;   // where it wants to go
  let mouse = null;     // last mouse position on screen

  // resting spot: center, under the small label
  function rest() {
    mouse = null;
    tx = cta.clientWidth / 2 - btn.offsetWidth / 2;
    ty = cta.clientHeight - 80;
  }

  // follow the mouse (also on scroll, so the button never drifts away)
  function follow() {
    if (!mouse) return;
    const r = cta.getBoundingClientRect();
    tx = mouse.x - r.left - btn.offsetWidth / 2;
    ty = mouse.y - r.top + 20;
  }

  cta.addEventListener('mousemove', e => { mouse = { x: e.clientX, y: e.clientY }; follow(); });
  cta.addEventListener('mouseleave', rest);
  addEventListener('scroll', follow, { passive: true });
  addEventListener('resize', rest);

  // easing: move 12% of the distance each frame
  function animate() {
    x += (tx - x) * 0.12;
    y += (ty - y) * 0.12;
    btn.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(animate);
  }

  // wait for fonts so the strip height is right, then start
  document.fonts.ready.then(() => { rest(); x = tx; y = ty; animate(); });
})();

/* ================= CUSTOM CURSOR: small blue circle instead of the arrow ================= */
(() => {
  // only for devices with a real mouse (touch screens keep their normal behavior)
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const dot = document.createElement('div');
  dot.className = 'cursor';
  dot.setAttribute('aria-hidden', 'true');
  document.body.append(dot);
  document.documentElement.classList.add('has-cursor');

  let x = -100, y = -100, cx = -100, cy = -100;

  addEventListener('pointermove', e => {
    x = e.clientX; y = e.clientY;
    dot.classList.add('show');
  }, { passive: true });
  document.addEventListener('mouseleave', () => dot.classList.remove('show'));
  addEventListener('pointerdown', () => dot.classList.add('down'));
  addEventListener('pointerup', () => dot.classList.remove('down'));

  // grow a little over clickable things and text fields
  const hoverSel = 'a, button, [role="button"], input, textarea, label, .panel, .faq__q';
  document.addEventListener('pointerover', e => dot.classList.toggle('hover', !!e.target.closest(hoverSel)));

  // smooth follow (the dot trails the real pointer by a hair)
  (function loop() {
    cx += (x - cx) * (reduce ? 1 : .28);
    cy += (y - cy) * (reduce ? 1 : .28);
    dot.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(loop);
  })();
})();