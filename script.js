/* =====================================================================
   ADFINITY LAB: site behaviour. Sections in order:
   1 Navbar · 2 Hero + loader · 3 Services + Process · 4 Why · 5 FAQ
   6 Contact form · 7 Reveal on scroll · 8 Scroll effects · 9 Footer button · 10 Cursor
   ===================================================================== */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mouseDevice = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ================= 1. NAVBAR ================= */
(() => {
  const burger = $('#burger'), menu = $('#menu'), nav = $('.nav');
  const setMenu = open => { menu.classList.toggle('open', open); burger.setAttribute('aria-expanded', open); };

  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });

  // dark glass bar once you scroll
  const solid = () => nav.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', solid, { passive: true });
  solid();
})();

/* ================= 2. HERO: glass shape + logo letters, then the loader ================= */
const hero = $('#home');
let startHero = () => { };                                  // set below, called when the loader ends

(() => {
  /* ---------- glass shape (WebGL shader) ---------- */
  const cv = $('#hxCanvas');
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });

  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FS = `
  precision highp float;
  uniform vec2 uRes; uniform float uT; uniform float uAmp; uniform vec2 uM; uniform vec3 uBrand;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
  // The shape lives in a fixed 1.9-wide design space, fitted to the screen width and pinned to the top.
  float shape(vec2 p){
    float t=uT, amp=uAmp;
    p += (.010+.016*amp)*vec2(sin(p.y*1.7+t*.45), sin(p.x*1.3-t*.4));
    float th=.33+.012*sin(t*.23)+uM.x*.02;
    mat2 R=mat2(cos(th),-sin(th),sin(th),cos(th));
    vec2 q=R*(p-vec2(.66,-.34));
    float sc=1.+.018*sin(t*.21)+.012*amp;
    return sdRB(q/sc,vec2(.90,1.08),.58)*sc;
  }
  void main(){
    vec2 fc=gl_FragCoord.xy;
    float ref=max(uRes.x/1.9, uRes.y*.62);
    float xo=max(0.,1.9-uRes.x/ref)*.62;
    vec2 p=vec2(fc.x/ref+xo, 1.+(fc.y-uRes.y)/ref);
    float t=uT, amp=uAmp;
    float d=shape(p);
    vec2 e=vec2(.0025,0.);
    vec2 n=normalize(vec2(shape(p+e.xy)-shape(p-e.xy),shape(p+e.yx)-shape(p-e.yx))+1e-5);
    float px=1.5/ref;
    float inside=smoothstep(px,-px,d);
    vec2 L=normalize(vec2(.5+uM.x*.4,.85+uM.y*.3));
    float light=.5+.5*dot(n,L);
    float ang=atan(n.y,n.x);
    float sheen=pow(.5+.5*cos(ang-t*.35-1.1),3.);
    float rw=.013+.012*sheen;
    float rim=exp(d/rw)*inside*(.28+.55*light+.5*sheen);
    float rim2=exp(-pow((d+.05)/.006,2.))*(.10+.16*sheen)*inside;
    float rim3=exp(-pow((d+.085)/.005,2.))*.06*inside;
    float band=exp(-pow((d+.12)/.085,2.))*smoothstep(.15,.95,n.y)*.085*inside;
    float u=clamp(1.-p.y,0.,1.3);
    float bx=1.04-.30*u-.10*sin(u*3.)+.03*sin(t*.25+u*2.);
    float lobe=smoothstep(-.03,.45,p.x-bx)*inside*smoothstep(.95,.55,p.y);
    float seam=exp(-abs(p.x-bx)/.0045)*.29*inside*smoothstep(.9,.6,p.y);   // the thin line, drawn in the brand colour
    float a=rim*.85+rim2+rim3+band+lobe*(.05+.03*(1.-p.y))+seam+.012*inside;
    a+=(hash(fc+fract(t))-.5)*.010;
    a=clamp(a,0.,.95);
    gl_FragColor=vec4(vec3(max(a-seam,0.))+uBrand*min(seam,a),a);
  }`;

  // read the brand colour from CSS (--brand) so it is defined in one place
  const brand = (() => {
    const hex = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim().replace('#', '');
    const n = parseInt(hex.length === 3 ? hex.replace(/./g, '$&$&') : hex, 16);
    return Number.isNaN(n) ? [1, 1, 1] : [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  })();

  let U = null, hasGL = !!gl;
  if (hasGL) {
    const shader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); hasGL = false; }
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    U = Object.fromEntries(['uRes', 'uT', 'uAmp', 'uM', 'uBrand'].map(k => [k, gl.getUniformLocation(prog, k)]));
    gl.uniform3f(U.uBrand, ...brand);
    gl.clearColor(0, 0, 0, 0);
  }

  let heroT0 = null, mx = 0, my = 0, tmx = 0, tmy = 0;
  addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - .5; tmy = .5 - e.clientY / innerHeight; }, { passive: true });

  const sizeScene = () => {
    if (!hasGL) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.5), s = .9;     // a bit smaller than the screen: it is soft anyway
    cv.width = Math.round(hero.clientWidth * dpr * s);
    cv.height = Math.round(hero.clientHeight * dpr * s);
    gl.viewport(0, 0, cv.width, cv.height);
  };

  const CYCLE = 14;                                                // seconds per morph cycle
  const scene = now => {
    if (!hasGL) return;
    const t = reduce ? 1.6 : (heroT0 === null ? 0 : (now - heroT0) / 1000) + 1.1;
    const ph = ((t % CYCLE) + CYCLE) % CYCLE / CYCLE;
    const amp = reduce ? 0 : .3 + .7 * Math.exp(-Math.pow((ph - .3) / .16, 2));   // calm → quick morph → calm
    mx += (tmx - mx) * .05; my += (tmy - my) * .05;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uRes, cv.width, cv.height);
    gl.uniform1f(U.uT, t); gl.uniform1f(U.uAmp, amp); gl.uniform2f(U.uM, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  /* ---------- headline: ADFINITY LAB, one span per letter. Hover one and it pops. ---------- */
  const row = $('#hxTitle'), word1 = $('#hxW1'), word2 = $('#hxW2'), letters = [];
  const addLetters = (text, host) => [...text].forEach(c => {
    const el = document.createElement('span');
    el.className = 'hx-ch';
    el.textContent = c;
    host.append(el);
    letters.push({ el, size: 0, vel: 0, rot: 0, relX: 0 });
  });
  addLetters('ADFINITY', word1); addLetters('LAB', word2);

  const CAP = .73;                                                // capital-letter height as a share of font-size
  let W, H, REST, SMALL, BIG, restW = 0, restH = 0, active = -1;
  const GAPS = [4, 8, 12, 16, 24, 32, 48, 64, 96];
  const snap = v => GAPS.reduce((m, s) => Math.abs(s - v) < Math.abs(m - v) ? s : m);

  const measure = () => {
    const hp = hero.style.getPropertyValue('--hp');
    hero.style.setProperty('--hp', 0);                              // measure without the scroll parallax
    W = hero.clientWidth; H = hero.clientHeight;
    REST = Math.min(W * .115, H * .2);                              // font size at rest
    SMALL = REST * .3;                                              // neighbours shrink to this
    BIG = Math.min(H * .34, W * .45) / CAP;                         // hovered letter grows to this (lower .34 = smaller pop)
    letters.forEach(l => { l.size = REST; l.vel = 0; l.el.style.fontSize = REST + 'px'; l.el.style.transform = 'none'; });
    row.style.height = REST * CAP + 'px';
    word1.style.marginRight = snap(REST * .32) + 'px';
    const rr = row.getBoundingClientRect();
    restW = rr.width; restH = rr.height;
    letters.forEach(l => { const r = l.el.getBoundingClientRect(); l.relX = r.left + r.width / 2 - rr.left; });
    active = -1;
    sizeScene();
    if (hp) hero.style.setProperty('--hp', hp);
  };

  // which letter is under the pointer (uses the live hero position, so it works after scrolling)
  const onMove = e => {
    const hr = hero.getBoundingClientRect(), pad = REST * .12;
    const left = hr.left + (W - restW) / 2, top = hr.top + (H - restH) / 2, x = e.clientX, y = e.clientY;
    let on = x >= left - pad && x <= left + restW + pad && y >= top - pad && y <= top + restH + pad;
    if (!on && active >= 0) {                                       // while popped, the row is taller: use its real box
      const c = row.getBoundingClientRect();
      on = x >= c.left && x <= c.right && y >= c.top && y <= c.bottom;
    }
    if (on) {
      let best = 0, dist = Infinity;
      letters.forEach((l, i) => { const k = Math.abs(left + l.relX - x); if (k < dist) { dist = k; best = i; } });
      active = best;
    } else active = -1;
  };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onMove, { passive: true });
  addEventListener('pointerup', e => { if (e.pointerType === 'touch') active = -1; });
  addEventListener('pointercancel', () => { active = -1; });
  document.documentElement.addEventListener('pointerleave', () => { active = -1; });

  // spring physics: each letter chases its target size
  const K = 190, D = 17;
  const letterStep = dt => {
    let maxSize = REST;
    letters.forEach((l, i) => {
      const target = active < 0 ? REST : (i === active ? BIG : SMALL);
      if (reduce) { l.size = target; l.vel = 0; l.rot = 0; }
      else {
        l.vel += (K * (target - l.size) - D * l.vel) * dt;
        l.size += l.vel * dt;
        l.rot = clamp(l.vel * .004, -14, 14);
      }
      l.size = Math.max(1, l.size);
      maxSize = Math.max(maxSize, l.size);
      l.el.style.fontSize = l.size.toFixed(2) + 'px';
      l.el.style.transform = l.rot ? `rotate(${l.rot.toFixed(2)}deg)` : 'none';
    });
    row.style.height = (maxSize * CAP).toFixed(2) + 'px';
  };

  // one loop, only while the hero is on screen
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
  startHero = () => { heroT0 = performance.now(); measure(); };    // re-measure once the loader is gone
})();

/* ---------- loader: 00 → 100, then reveal the page ---------- */
(() => {
  const num = $('#num'), line = $('#lineFill'), loader = $('#loader');
  const DURATION = reduce ? 300 : 2400;
  const pageReady = Promise.race([
    Promise.all([document.fonts.ready, document.readyState === 'complete' || new Promise(r => addEventListener('load', r, { once: true }))]),
    new Promise(r => setTimeout(r, 5000))                           // never wait forever on a slow font or image
  ]);

  const t0 = performance.now();
  (function count(now) {
    const p = Math.min((now - t0) / DURATION, 1);
    const v = Math.round((1 - (1 - p) ** 2) * 100);
    num.textContent = String(v).padStart(2, '0');
    line.style.width = v + '%';
    if (p < 1) return requestAnimationFrame(count);
    pageReady.then(() => setTimeout(() => {
      loader.classList.add('done');
      document.body.classList.add('ready');
      setTimeout(startHero, 400);
    }, 500));
  })(t0);
})();

/* ================= 3. SERVICES (pinned slides) + PROCESS ================= */
const services = (() => {
  const section = $('#services'), slides = $$('.slide'), N = slides.length;
  const bar = $('#bar'), counter = $('#counter');
  const STEP_MS = 1050;                                             // each service stays on screen at least this long
  let shown = -1, target = 0, timer = null;

  section.style.height = (N + 1) * 100 + 'vh';                      // one viewport of scrolling per service

  const show = i => {
    shown = i;
    slides.forEach((s, n) => { s.classList.toggle('is-active', n === i); s.classList.toggle('is-before', n < i); });
    counter.textContent = `[${i + 1} /${N}]`;
    bar.style.width = (i + 1) / N * 100 + '%';
  };
  const step = () => {                                              // one slide at a time, never skip
    if (shown === target) return;
    show(shown + Math.sign(target - shown));
    timer = setTimeout(() => { timer = null; step(); }, STEP_MS);
  };

  // called on every scroll frame
  return {
    update(vh) {
      const r = section.getBoundingClientRect();
      const progress = clamp(-r.top / (section.offsetHeight - vh));
      target = Math.min(N - 1, Math.floor(progress * N));
      if (shown < 0) show(target); else if (!timer) step();

      // title and text drift apart and the square tilts while you move through a slide
      if (reduce || r.top > vh || r.bottom < 0) return;
      const f = clamp(progress * N - target) - .5, s = slides[shown];
      s.querySelector('.slide__title').style.translate = `${(-f * 40).toFixed(1)}px 0`;
      s.querySelector('.slide__text').style.translate = `${(f * 40).toFixed(1)}px 0`;
      s.querySelector('.slide__tile').style.rotate = `${(f * 8).toFixed(2)}deg`;
    }
  };
})();

const processSteps = (() => {
  const steps = $$('.step'), list = $('#steps'), fill = $('#fill');
  // a thin band in the middle of the screen is the "active zone"
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) steps.forEach(s => s.classList.toggle('is-active', s === e.target));
  }), { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => io.observe(s));

  return {
    update(vh) {
      const r = list.getBoundingClientRect();
      fill.style.height = clamp((vh / 2 - r.top) / r.height) * 100 + '%';
    }
  };
})();

/* ================= 4. WHY US: accordion cards with auto-play ================= */
(() => {
  const panels = $$('.panels .panel');
  let current = -1, timer;

  // number count-up (ROAS gauge)
  const countUp = el => {
    if (reduce) return;                                             // the text already shows the final number
    const to = +el.dataset.count, dec = +el.dataset.dec || 0, start = performance.now() + 500;
    const frame = now => {
      const p = clamp((now - start) / 1400);
      el.textContent = (to * (1 - (1 - p) ** 3)).toFixed(dec);
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const open = i => {
    if (i === current) return;
    current = i;
    panels.forEach((p, n) => { p.classList.toggle('active', n === i); p.setAttribute('aria-expanded', n === i); });
    panels[i].querySelectorAll('[data-count]').forEach(countUp);
  };

  // when the visitor takes control, stop auto-play
  panels.forEach((p, i) => {
    const pick = () => { clearInterval(timer); open(i); };
    ['mouseenter', 'click', 'focus'].forEach(ev => p.addEventListener(ev, pick));
    p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  });

  // start only when the section is on screen, so the first animation is seen
  new IntersectionObserver(([e], io) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    if (current >= 0) return;                                       // the visitor already picked one
    open(0);
    if (!reduce) timer = setInterval(() => open((current + 1) % panels.length), 5500);
  }, { threshold: .2 }).observe($('.panels'));
})();

/* ================= 5. FAQ: accordion + search ================= */
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

/* ================= 6. CONTACT FORM ================= */
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
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(res.status);                     // fetch does not throw on 404 / 500 by itself
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

/* ================= 7. REVEAL ON SCROLL (up / from the left / from the right) ================= */
(() => {
  if (reduce || !('IntersectionObserver' in window)) return;        // content simply stays visible
  document.documentElement.classList.add('js-anim');

  const seen = new Set();
  const add = (sel, dir, stagger = true) => $$(sel).forEach((el, i) => {
    if (seen.has(el)) return;
    seen.add(el);
    el.classList.add('reveal', 'reveal-' + (typeof dir === 'function' ? dir(i) : dir));
    el.style.setProperty('--rd', (stagger ? Math.min(i, 5) * .08 : 0) + 's');
  });
  const alternate = i => (i % 2 ? 'r' : 'l');

  add('.process__head', 'l');
  add('.step', alternate, false);
  add('.why-head', 'u');
  add('.faq h2', 'l'); add('.faq__search', 'r'); add('.faq__item', alternate); add('.faq__art', 'r');
  add('.contact__info > *', 'l'); add('.contact__form', 'r');
  add('.ft__grid > *', 'u');

  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  seen.forEach(el => io.observe(el));

  // Why-Us cards rise one after another
  const panels = $('.panels');
  panels.querySelectorAll('.panel').forEach((p, i) => p.style.setProperty('--i', i));
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { panels.classList.add('in-view'); o.disconnect(); } }, { threshold: .15 }).observe(panels);
})();

/* ================= 8. SCROLL EFFECTS: smooth wheel + one shared frame loop ================= */
(() => {
  const root = document.documentElement;

  /* ---- smooth, inertial wheel scrolling (mouse devices only; touch keeps native momentum) ---- */
  if (!reduce && mouseDevice) {
    root.classList.add('smooth');
    let target = scrollY, current = scrollY, raf = 0, lt = 0;
    const max = () => root.scrollHeight - innerHeight;
    const run = () => { if (!raf) { lt = 0; raf = requestAnimationFrame(tick); } };
    function tick(now) {
      const dt = Math.min(((now || 0) - lt) / 16.67, 4) || 1; lt = now || 0;       // same feel at any frame rate
      current += (target - current) * (1 - Math.pow(1 - .075, dt));
      if (Math.abs(target - current) < .4) { current = target; raf = 0; scrollTo(0, current); return; }
      scrollTo(0, current);
      raf = requestAnimationFrame(tick);
    }
    addEventListener('wheel', e => {
      if (e.ctrlKey || e.target.closest('textarea')) return;                       // pinch-zoom and text areas stay native
      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 32; else if (e.deltaMode === 2) dy *= innerHeight;
      target = clamp(target + clamp(dy, -180, 180), 0, max());                     // a fast flick never queues a huge jump
      target = clamp(target, current - 260, current + 520);
      run();
    }, { passive: false });
    addEventListener('scroll', () => {                                             // keyboard, scrollbar drag: hand control back
      if (raf && Math.abs(scrollY - current) > 3) { cancelAnimationFrame(raf); raf = 0; }
      if (!raf) target = current = scrollY;
    }, { passive: true });
    document.addEventListener('click', e => {                                      // #links glide too
      const a = e.target.closest('a[href^="#"]');
      const el = a && a.getAttribute('href').length > 1 && document.querySelector(a.getAttribute('href'));
      if (!el) return;
      e.preventDefault();
      target = clamp(el.getBoundingClientRect().top + scrollY, 0, max());
      current = scrollY;
      run();
    });
  }

  /* ---- headings and intro text split into words that light up while you scroll ---- */
  const shades = [];
  if (!reduce) {
    ['.process__head h2', '.process__head p', '.why-head h2', '.why-head p', '.faq h2', '.contact__info h2', '.contact__lead']
      .forEach(sel => $$(sel).forEach(el => {
        if (el.children.length) return;
        const words = el.textContent.trim().split(/\s+/);
        el.textContent = '';
        const spans = words.map((w, i) => {
          const s = document.createElement('span');
          s.className = 'w'; s.textContent = w; el.append(s);
          if (i < words.length - 1) el.append(' ');
          return s;
        });
        shades.push({ el, spans, last: [] });
      }));
  }

  /* ---- one loop for everything that follows the scroll ---- */
  const ghost = $('.contact__ghost'), faqArt = $('.faq__art'), track = $('.ft-marquee__track');
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  progressBar.setAttribute('aria-hidden', 'true');
  document.body.append(progressBar);

  let marquee = null, lastY = scrollY, speed = 0, idle = 0, running = false;

  const update = () => {
    const y = scrollY, vh = innerHeight;
    const dy = y - lastY; lastY = y;
    speed += (Math.abs(dy) - speed) * .12;

    progressBar.style.transform = `scaleX(${clamp(y / (root.scrollHeight - vh || 1))})`;
    services.update(vh);
    processSteps.update(vh);

    if (!reduce) {
      hero.style.setProperty('--hp', clamp(y / (hero.offsetHeight * .9)).toFixed(4));

      shades.forEach(s => {                                                        // word-by-word shading
        const r = s.el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const p = clamp((vh * .92 - r.top) / (vh * .36)), n = s.spans.length;
        s.spans.forEach((w, i) => {
          const o = (.14 + .86 * clamp(p * (n + 2) - i)).toFixed(2);
          if (s.last[i] !== o) { w.style.opacity = o; s.last[i] = o; }
        });
      });

      const g = ghost.getBoundingClientRect();                                     // CONTACT glides sideways
      ghost.style.translate = `${((clamp((vh - g.top) / (vh + g.height)) - .5) * -16).toFixed(2)}vw 0`;
      const f = faqArt.getBoundingClientRect();                                    // FAQ art tilts
      faqArt.style.rotate = `${((clamp((vh - f.top) / (vh + f.height)) - .5) * 8).toFixed(2)}deg`;

      marquee ||= track.getAnimations()[0];                                        // footer text speeds up with scrolling
      if (marquee) marquee.playbackRate = 1 + Math.min(speed * .4, 8);
    }

    // stop the loop once everything has settled
    idle = (Math.abs(dy) < .05 && speed < .05) ? idle + 1 : 0;
    if (idle > 8) { running = false; if (marquee) marquee.playbackRate = 1; return; }
    requestAnimationFrame(update);
  };
  const kick = () => { if (!running) { running = true; requestAnimationFrame(update); } };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  kick();
})();

/* ================= 9. FOOTER: button follows the mouse ================= */
(() => {
  $('#ftYear').textContent = new Date().getFullYear();
  if (!matchMedia('(hover: hover)').matches) return;                // touch screens: CSS places the button

  const cta = $('#ftCta'), btn = $('#ftBtn');
  let x = 0, y = 0, tx = 0, ty = 0, mouse = null, raf = 0;

  const move = () => {                                              // ease 12% of the way each frame, stop when arrived
    x += (tx - x) * .12; y += (ty - y) * .12;
    btn.style.transform = `translate(${x}px, ${y}px)`;
    raf = Math.abs(tx - x) > .1 || Math.abs(ty - y) > .1 ? requestAnimationFrame(move) : 0;
  };
  const go = () => { if (!raf) raf = requestAnimationFrame(move); };

  const rest = () => {                                              // resting spot: centred under the small label
    mouse = null;
    tx = cta.clientWidth / 2 - btn.offsetWidth / 2;
    ty = cta.clientHeight - 80;
    go();
  };
  const follow = () => {                                            // also runs on scroll so the button never drifts away
    if (!mouse) return;
    const r = cta.getBoundingClientRect();
    tx = mouse.x - r.left - btn.offsetWidth / 2;
    ty = mouse.y - r.top + 20;
    go();
  };

  cta.addEventListener('mousemove', e => { mouse = { x: e.clientX, y: e.clientY }; follow(); });
  cta.addEventListener('mouseleave', rest);
  addEventListener('scroll', follow, { passive: true });
  addEventListener('resize', rest);
  document.fonts.ready.then(() => { rest(); x = tx; y = ty; btn.style.transform = `translate(${x}px, ${y}px)`; });
})();

/* ================= 10. CURSOR: small dot instead of the arrow (mouse devices only) ================= */
(() => {
  if (!mouseDevice) return;

  const dot = document.createElement('div');
  dot.className = 'cursor';
  dot.setAttribute('aria-hidden', 'true');
  document.body.append(dot);
  document.documentElement.classList.add('has-cursor');

  let x = -100, y = -100, cx = -100, cy = -100, raf = 0;
  const ease = reduce ? 1 : .28;
  const move = () => {                                              // the dot trails the pointer by a hair
    cx += (x - cx) * ease; cy += (y - cy) * ease;
    dot.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    raf = Math.abs(x - cx) > .1 || Math.abs(y - cy) > .1 ? requestAnimationFrame(move) : 0;
  };

  addEventListener('pointermove', e => {
    x = e.clientX; y = e.clientY;
    dot.classList.add('show');
    if (!raf) raf = requestAnimationFrame(move);
  }, { passive: true });
  document.addEventListener('mouseleave', () => dot.classList.remove('show'));
  addEventListener('pointerdown', () => dot.classList.add('down'));
  addEventListener('pointerup', () => dot.classList.remove('down'));

  // grows over clickable things
  const clickable = 'a, button, [role="button"], input, textarea, label, .panel, .faq__q';
  document.addEventListener('pointerover', e => dot.classList.toggle('hover', !!e.target.closest(clickable)));
})();
