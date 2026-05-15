/* ═══════════════════════════════════════════════════════════════════
   THOTH SYSTEM — Level 2: Maximum Punch Engine
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  document.body.classList.add('loading');

  // ─────────────────── PRELOADER ───────────────────
  const preloader = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloaderBar');
  const preloaderText = document.getElementById('preloaderText');
  const scrambleChars = 'ΘΩΔΣΨΛΞπφ𓂀𓋹𓅃𓇳𓊽01';

  let loadProgress = 0;
  const loadMessages = ['INICIALIZANDO', 'DESCIFRANDO JEROGLÍFICOS', 'ACTIVANDO PROTOCOLOS', 'CONECTANDO DIMENSIONES', 'SISTEMA LISTO'];

  function updatePreloader() {
    loadProgress += Math.random() * 18 + 5;
    if (loadProgress > 100) loadProgress = 100;
    preloaderBar.style.width = loadProgress + '%';

    const msgIndex = Math.min(Math.floor(loadProgress / 25), loadMessages.length - 1);
    preloaderText.textContent = loadMessages[msgIndex];

    if (loadProgress < 100) {
      setTimeout(updatePreloader, 200 + Math.random() * 200);
    } else {
      setTimeout(() => {
        preloader.classList.add('done');
        document.body.classList.remove('loading');
        triggerHeroAnimations();
      }, 400);
    }
  }

  setTimeout(updatePreloader, 300);

  // ─────────────────── CUSTOM CURSOR ───────────────────
  const customCursor = document.getElementById('customCursor');
  const cursorDot = customCursor ? customCursor.querySelector('.cursor-dot') : null;
  const cursorRing = customCursor ? customCursor.querySelector('.cursor-ring') : null;
  const cursorTextEl = customCursor ? customCursor.querySelector('.cursor-text') : null;
  let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;
  const isTouch = window.matchMedia('(pointer:coarse)').matches || window.innerWidth < 1024;

  if (customCursor && !isTouch) {
    customCursor.classList.add('active');
    document.documentElement.classList.add('custom-cursor-active');
    document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

    (function animCursor() {
      cursorDot.style.left = mouseX + 'px';
      cursorDot.style.top = mouseY + 'px';
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      cursorRing.style.left = ringX + 'px';
      cursorRing.style.top = ringY + 'px';
      if (cursorTextEl) {
        cursorTextEl.style.left = ringX + 'px';
        cursorTextEl.style.top = ringY + 'px';
      }
      requestAnimationFrame(animCursor);
    })();

    const cTargets = {
      button: '.btn-primary, .btn-ghost, .nav-toggle',
      card: '.service-card, .tech-category',
      link: 'a, .nav-link, .mobile-link, .tech-item'
    };

    document.addEventListener('mouseover', e => {
      for (const [state, sel] of Object.entries(cTargets)) {
        if (e.target.closest(sel)) {
          customCursor.dataset.state = state;
          if (cursorTextEl) cursorTextEl.textContent = state === 'button' ? 'CLICK' : state === 'card' ? 'VIEW' : '';
          return;
        }
      }
      customCursor.dataset.state = '';
      if (cursorTextEl) cursorTextEl.textContent = '';
    });

    document.addEventListener('mousedown', () => customCursor.classList.add('clicking'));
    document.addEventListener('mouseup', () => customCursor.classList.remove('clicking'));
  }


  // ─────────────────── PARTICLE SYSTEM ───────────────────
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let w, h;

  function resizeCanvas() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.size = Math.random() * 1.8 + 0.3;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.5 + 0.1;
      this.gold = Math.random() > 0.5;
      this.pulseSpeed = Math.random() * 0.02 + 0.005;
      this.pulsePhase = Math.random() * Math.PI * 2;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.pulsePhase += this.pulseSpeed;
      this.currentOpacity = this.opacity * (Math.sin(this.pulsePhase) * 0.3 + 0.7);
      if (this.x < -10 || this.x > w + 10 || this.y < -10 || this.y > h + 10) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.gold
        ? `rgba(201, 168, 76, ${this.currentOpacity})`
        : `rgba(59, 130, 246, ${this.currentOpacity * 0.6})`;
      ctx.fill();
    }
  }

  const particleCount = Math.min(100, Math.floor(w * h / 12000));
  for (let i = 0; i < particleCount; i++) particles.push(new Particle());

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = dx * dx + dy * dy;
        if (dist < 14400) {
          const opacity = (1 - Math.sqrt(dist) / 120) * 0.08;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(201, 168, 76, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animateParticles() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => { p.update(); p.draw(); });
    drawConnections();
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

  // ─────────────────── NAVIGATION ───────────────────
  const nav = document.getElementById('mainNav');
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  let lastScrollY = 0;
  let navHidden = false;

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
  });

  mobileMenu.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      mobileMenu.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  // ─────────────────── SCROLL HANDLER ───────────────────
  const progressFill = document.getElementById('progressFill');
  const pNodes = document.querySelectorAll('.p-node');
  const sections = ['hero', 'about', 'services', 'tech', 'contact'];

  function onScroll() {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollY / docHeight) * 100;

    // Smart nav: hide on scroll down, show on scroll up
    if (scrollY > 100) {
      nav.classList.add('scrolled');
      if (scrollY > lastScrollY && scrollY > 300 && !navHidden) {
        nav.classList.add('hidden');
        navHidden = true;
      } else if (scrollY < lastScrollY && navHidden) {
        nav.classList.remove('hidden');
        navHidden = false;
      }
    } else {
      nav.classList.remove('scrolled');
      nav.classList.remove('hidden');
      navHidden = false;
    }

    progressFill.style.height = scrollPercent + '%';

    sections.forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
        pNodes.forEach(n => n.classList.remove('active'));
        if (pNodes[i]) pNodes[i].classList.add('active');
      }
    });

    lastScrollY = scrollY;
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // ─────────────────── TEXT SCRAMBLE EFFECT ───────────────────
  function scrambleText(el) {
    const finalText = el.dataset.final || el.textContent;
    const chars = scrambleChars;
    let iteration = 0;
    const totalIterations = finalText.length * 3;

    const interval = setInterval(() => {
      el.textContent = finalText
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' ';
          if (i < iteration / 3) return finalText[i];
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join('');

      iteration++;
      if (iteration >= totalIterations) {
        el.textContent = finalText;
        clearInterval(interval);
      }
    }, 40);
  }

  // ─────────────────── SPLIT TEXT REVEAL ───────────────────
  function splitTextIntoChars(el) {
    const html = el.innerHTML;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const fragment = document.createDocumentFragment();
        text.split('').forEach((char, i) => {
          const span = document.createElement('span');
          span.className = 'split-char';
          span.textContent = char === ' ' ? ' ' : char;
          span.style.transitionDelay = `${i * 25}ms`;
          fragment.appendChild(span);
        });
        node.parentNode.replaceChild(fragment, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'BR') return;
        Array.from(node.childNodes).forEach(processNode);
      }
    }

    Array.from(el.childNodes).forEach(processNode);
  }

  document.querySelectorAll('.split-reveal').forEach(splitTextIntoChars);

  // ─────────────────── INTERSECTION OBSERVER — REVEAL ───────────────────
  const revealElements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .split-reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay) || 0;
        setTimeout(() => entry.target.classList.add('revealed'), delay);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  revealElements.forEach(el => revealObserver.observe(el));

  // ─────────────────── SVG DRAW-ON ───────────────────
  const svgDrawElements = document.querySelectorAll('.svg-draw');

  const svgObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const paths = entry.target.closest('.service-card, .about-visual, .eye-of-horus');
        if (paths) {
          paths.querySelectorAll('.svg-draw').forEach((path, i) => {
            setTimeout(() => path.classList.add('drawn'), i * 150);
          });
        } else {
          entry.target.classList.add('drawn');
        }
        svgObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.icon-draw, .about-visual').forEach(el => svgObserver.observe(el));

  // ─────────────────── COUNTER ANIMATION ───────────────────
  const counters = document.querySelectorAll('.stat-number');

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        const duration = 2200;
        const start = performance.now();

        function updateCounter(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 4);
          el.textContent = Math.floor(eased * target);
          if (progress < 1) requestAnimationFrame(updateCounter);
          else {
            el.style.textShadow = '0 0 20px rgba(201, 168, 76, 0.5)';
            setTimeout(() => { el.style.textShadow = ''; }, 600);
          }
        }
        requestAnimationFrame(updateCounter);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => counterObserver.observe(c));

  // ─────────────────── 3D TILT CARDS ───────────────────
  document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotateX = (0.5 - y) * 12;
      const rotateY = (x - 0.5) * 12;

      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;

      // Card glow follows cursor
      const glow = card.querySelector('.card-glow');
      if (glow) {
        glow.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(201, 168, 76, 0.12) 0%, transparent 60%)`;
      }

      // Shine effect
      const shine = card.querySelector('.card-shine');
      if (shine) {
        shine.style.transform = `rotate(${rotateY * 2}deg)`;
        shine.style.opacity = '1';
      }
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      const glow = card.querySelector('.card-glow');
      if (glow) glow.style.background = '';
      const shine = card.querySelector('.card-shine');
      if (shine) shine.style.opacity = '0';
    });
  });

  // ─────────────────── HERO ANIMATIONS TRIGGER ───────────────────
  function triggerHeroAnimations() {
    const scrambleTarget = document.querySelector('.scramble-target');
    if (scrambleTarget) {
      setTimeout(() => scrambleText(scrambleTarget), 400);
    }
  }

  // ─────────────────── SMOOTH SCROLL ───────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // ─────────────────── TECH ITEMS STAGGER ───────────────────
  const techObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.tech-item').forEach((item, i) => {
          setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
          }, i * 80);
        });
        techObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.tech-category').forEach(cat => {
    cat.querySelectorAll('.tech-item').forEach(item => {
      item.style.opacity = '0';
      item.style.transform = 'translateX(-15px)';
      item.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    });
    techObserver.observe(cat);
  });

  // ─────────────────── MAGNETIC BUTTONS ───────────────────
  document.querySelectorAll('.btn-primary, .btn-ghost').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2 - 2}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });

  // ─────────────────── FLOATING HIEROGLYPHS ───────────────────
  const hieroglyphs = ['𓀀','𓁀','𓂀','𓃀','𓄀','𓅀','𓆀','𓇀','𓈀','𓉀','𓊀','𓋀','𓌀','𓍀','𓎀','𓏀','𓐀','𓅃','𓋹','𓊽','𓇳','𓉐','𓏏','𓂋','𓃭','𓊯','𓁟'];

  function spawnFloatingHieroglyph() {
    const el = document.createElement('div');
    el.textContent = hieroglyphs[Math.floor(Math.random() * hieroglyphs.length)];
    el.style.cssText = `
      position: fixed;
      font-size: ${Math.random() * 20 + 14}px;
      color: rgba(201, 168, 76, 0.06);
      left: ${Math.random() * 100}vw;
      top: 100vh;
      pointer-events: none;
      z-index: 0;
    `;

    document.body.appendChild(el);

    const duration = Math.random() * 12000 + 8000;
    const startTime = Date.now();
    const drift = (Math.random() - 0.5) * 50;
    const startX = parseFloat(el.style.left);

    function float() {
      const progress = (Date.now() - startTime) / duration;
      if (progress > 1) { el.remove(); return; }
      const opacity = progress < 0.1 ? progress * 10 : progress > 0.85 ? (1 - progress) * 6.67 : 1;
      el.style.top = (100 - progress * 120) + 'vh';
      el.style.left = (startX + Math.sin(progress * Math.PI * 2) * drift) + 'vw';
      el.style.opacity = opacity * 0.06;
      el.style.transform = `rotate(${progress * 200}deg)`;
      requestAnimationFrame(float);
    }
    requestAnimationFrame(float);
  }

  setInterval(spawnFloatingHieroglyph, 2500);

  // ─────────────────── SECTION IN-VIEW TRANSITIONS ───────────────────
  const sectionElements = document.querySelectorAll('.section');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -60px 0px' });

  sectionElements.forEach(sec => sectionObserver.observe(sec));

  // ─────────────────── PARALLAX ON SECTION BACKGROUNDS ───────────────────
  const secGridBgs = document.querySelectorAll('.sec-grid-bg');

  function updateParallax() {
    const scrollY = window.scrollY;
    secGridBgs.forEach(bg => {
      const section = bg.closest('.section');
      if (!section) return;
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const progress = (rect.top / window.innerHeight);
      bg.style.transform = `translateY(${progress * 30}px)`;
    });
    requestAnimationFrame(updateParallax);
  }
  updateParallax();

  // ─────────────────── ENERGY DIVIDER SCROLL ACTIVATION ───────────────────
  const energyDividers = document.querySelectorAll('.energy-divider');

  const dividerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('divider-active');
      }
    });
  }, { threshold: 0.5 });

  energyDividers.forEach(d => dividerObserver.observe(d));

  // ─────────────────── INIT ───────────────────
  onScroll();

})();
