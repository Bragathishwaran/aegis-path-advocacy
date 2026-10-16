/* ==========================================================================
   AegisPoint Advocacy - main.js  (Enhanced v2)
   Global UI: theme, RTL toggle, mobile menu, dropdowns, accordions,
   tabs, reveal-on-scroll, counters, back-to-top, scroll-progress,
   RTL-aware layout fixes.
   ========================================================================== */
(function () {
  "use strict";

  var STORAGE = { theme: "iep-theme", dir: "iep-dir" };

  /* ─── Theme (dark / light) ────────────────────────────────────── */
  function applyTheme(theme) {
    var isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    if (document.body) {
      document.body.classList.toggle("dark", isDark);
      document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    }
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(isDark));
      var sun = btn.querySelector("[data-icon-sun]");
      var moon = btn.querySelector("[data-icon-moon]");
      if (sun) sun.classList.toggle("hidden", !isDark);
      if (moon) moon.classList.toggle("hidden", isDark);
      var sunIcon = btn.querySelector(".sun-icon");
      var moonIcon = btn.querySelector(".moon-icon");
      if (sunIcon) sunIcon.style.display = isDark ? "" : "none";
      if (moonIcon) moonIcon.style.display = isDark ? "none" : "";
    });
  }

  function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem(STORAGE.theme); } catch (e) {}
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(stored || (prefersDark ? "dark" : "light"));

    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = document.documentElement.classList.contains("dark") ? "light" : "dark";
        applyTheme(next);
        try { localStorage.setItem(STORAGE.theme, next); } catch (e) {}
      });
    });
  }

  /* ─── Direction (LTR / RTL) ──────────────────────────────────── */
  function applyDir(dir) {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", dir === "rtl" ? "ar" : "en");

    // Update labels
    document.querySelectorAll("[data-dir-toggle]").forEach(function (btn) {
      var label = btn.querySelector("[data-dir-label]");
      if (label) label.textContent = dir === "rtl" ? "LTR" : "RTL";
      btn.setAttribute("aria-pressed", String(dir === "rtl"));
    });

    // Fix timelines
    document.querySelectorAll("[data-timeline]").forEach(function (el) {
      if (dir === "rtl") {
        el.style.borderLeft = "none";
        el.style.borderRight = "2px solid #eaeef4";
        el.style.paddingLeft = "0";
        el.style.paddingRight = "2rem";
      } else {
        el.style.borderRight = "none";
        el.style.borderLeft = "2px solid #eaeef4";
        el.style.paddingRight = "0";
        el.style.paddingLeft = "2rem";
      }
    });

    // Fix back-to-top position
    var btt = document.querySelector("[data-back-to-top]");
    if (btt) {
      if (dir === "rtl") {
        btt.style.right = "auto";
        btt.style.left = "1.5rem";
      } else {
        btt.style.left = "auto";
        btt.style.right = "1.5rem";
      }
    }

    // Dispatch custom event for page-specific fixes
    document.dispatchEvent(new CustomEvent("dirchange", { detail: { dir: dir } }));
  }

  function initDir() {
    var stored = null;
    try { stored = localStorage.getItem(STORAGE.dir); } catch (e) {}
    var dir = stored || document.documentElement.getAttribute("dir") || "ltr";
    applyDir(dir);

    document.querySelectorAll("[data-dir-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = document.documentElement.getAttribute("dir") === "rtl" ? "ltr" : "rtl";
        applyDir(next);
        try { localStorage.setItem(STORAGE.dir, next); } catch (e) {}
      });
    });
  }

  /* ─── Mobile menu ─────────────────────────────────────────────── */
  function initMobileMenu() {
    var toggle = document.querySelector("[data-menu-toggle]");
    var panel = document.querySelector("[data-menu-panel]");
    if (!toggle || !panel) return;
    toggle.addEventListener("click", function () {
      var open = panel.classList.toggle("hidden") === false;
      toggle.setAttribute("aria-expanded", String(open));
    });
    panel.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        panel.classList.add("hidden");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ─── Dropdowns ───────────────────────────────────────────────── */
  function initDropdowns() {
    document.querySelectorAll("[data-dropdown]").forEach(function (wrap) {
      var trigger = wrap.querySelector("[data-dropdown-trigger]");
      var menu = wrap.querySelector("[data-dropdown-menu]");
      if (!trigger || !menu) return;
      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        var willOpen = menu.classList.contains("hidden");
        document.querySelectorAll("[data-dropdown]").forEach(function(otherWrap) {
          var otherMenu = otherWrap.querySelector("[data-dropdown-menu]");
          var otherTrigger = otherWrap.querySelector("[data-dropdown-trigger]");
          if (otherMenu && otherMenu !== menu) otherMenu.classList.add("hidden");
          if (otherTrigger && otherTrigger !== trigger) otherTrigger.setAttribute("aria-expanded", "false");
        });
        menu.classList.toggle("hidden", !willOpen);
        trigger.setAttribute("aria-expanded", String(willOpen));
      });
      document.addEventListener("click", function () {
        menu.classList.add("hidden");
        trigger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ─── Accordions ──────────────────────────────────────────────── */
  function initAccordions() {
    document.querySelectorAll("[data-accordion]").forEach(function (item) {
      var head = item.querySelector("[data-accordion-head]");
      var body = item.querySelector("[data-accordion-body]");
      var icon = item.querySelector("[data-accordion-icon]");
      if (!head || !body) return;
      head.addEventListener("click", function () {
        var open = body.classList.toggle("hidden") === false;
        head.setAttribute("aria-expanded", String(open));
        if (icon) icon.classList.toggle("rotate-45", open);
        if (icon) icon.classList.toggle("faq-icon", true);
        if (icon) icon.classList.toggle("open", open);
      });
    });
  }

  /* ─── Tabs ─────────────────────────────────────────────────────── */
  function initTabs() {
    document.querySelectorAll("[data-tabs]").forEach(function (group) {
      var buttons = group.querySelectorAll("[data-tab]");
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var target = btn.getAttribute("data-tab");
          buttons.forEach(function (b) {
            b.classList.toggle("nav-link-active", b === btn);
          });
          group.querySelectorAll("[data-tab-panel]").forEach(function (p) {
            p.classList.toggle("hidden", p.getAttribute("data-tab-panel") !== target);
          });
        });
      });
    });
  }

  /* ─── Reveal on scroll ─────────────────────────────────────────── */
  function initReveal() {
    var els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("animate-fade-up"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-fade-up");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) {
      el.style.opacity = "0";
      io.observe(el);
    });
  }

  /* ─── Counters ─────────────────────────────────────────────────── */
  function initCounters() {
    var els = document.querySelectorAll("[data-counter]");
    if (!els.length) return;
    var run = function (el) {
      var target = parseFloat(el.getAttribute("data-counter")) || 0;
      var suffix = el.getAttribute("data-suffix") || "";
      var dur = 1400;
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString() + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) {
      els.forEach(run);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ─── Animated progress bars ──────────────────────────────────── */
  function initProgressBars() {
    var bars = document.querySelectorAll("[data-progress]");
    if (!bars.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var pct = entry.target.getAttribute("data-progress") || "0";
          entry.target.style.width = pct + "%";
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    bars.forEach(function (bar) {
      bar.style.width = "0%";
      bar.style.transition = "width 1.4s cubic-bezier(0.25,0.46,0.45,0.94)";
      io.observe(bar);
    });
  }

  /* ─── Back to top ─────────────────────────────────────────────── */
  function initBackToTop() {
    var btn = document.querySelector("[data-back-to-top]");
    if (!btn) return;
    window.addEventListener("scroll", function () {
      btn.classList.toggle("hidden", window.scrollY < 400);
    });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ─── Scroll progress bar ─────────────────────────────────────── */
  function initScrollProgress() {
    var bar = document.getElementById("scroll-progress");
    if (!bar) return;
    window.addEventListener("scroll", function () {
      var pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      bar.style.width = Math.min(pct, 100) + "%";
    }, { passive: true });
  }

  /* ─── Year stamp ──────────────────────────────────────────────── */
  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ─── Password visibility toggle ─────────────────────────────── */
  function initPasswordToggle() {
    document.querySelectorAll("[data-pw-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var input = document.getElementById(btn.getAttribute("data-pw-toggle"));
        if (!input) return;
        var isText = input.type === "text";
        input.type = isText ? "password" : "text";
        btn.setAttribute("aria-pressed", String(!isText));
        var icon = btn.querySelector("[data-pw-icon]");
        if (icon) icon.textContent = isText ? "Show" : "Hide";
      });
    });
  }

  /* ─── Countdown timer ─────────────────────────────────────────── */
  function initCountdown() {
    var els = {
      days: document.getElementById("cd-days"),
      hours: document.getElementById("cd-hours"),
      mins: document.getElementById("cd-mins"),
      secs: document.getElementById("cd-secs")
    };
    if (!els.days) return;
    var target = new Date("2026-01-01T00:00:00").getTime();
    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) { els.days.textContent = els.hours.textContent = els.mins.textContent = els.secs.textContent = "00"; return; }
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      els.days.textContent = String(d).padStart(2, "0");
      els.hours.textContent = String(h).padStart(2, "0");
      els.mins.textContent = String(m).padStart(2, "0");
      els.secs.textContent = String(s).padStart(2, "0");
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ─── Pricing toggle ──────────────────────────────────────────── */
  function initPricingToggle() {
    var toggle = document.getElementById("pricing-toggle");
    if (!toggle) return;
    toggle.addEventListener("change", function () {
      var isAnnual = toggle.checked;
      document.querySelectorAll("[data-price-monthly]").forEach(function (el) {
        el.classList.toggle("hidden", isAnnual);
      });
      document.querySelectorAll("[data-price-annual]").forEach(function (el) {
        el.classList.toggle("hidden", !isAnnual);
      });
    });
  }

  /* ─── Dashboard: progress bar animation ──────────────────────── */
  function initDashProgressBars() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll("[data-progress]").forEach(function (bar) {
            var pct = bar.getAttribute("data-progress") || "0";
            setTimeout(function () { bar.style.width = pct + "%"; }, 100);
          });
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    document.querySelectorAll(".goals-section").forEach(function (el) { io.observe(el); });
  }

  /* ─── Trust Bar Moving Ticker (JS Animated, RTL/LTR, Multi-pixel Responsive) ─── */
  function initTrustTicker() {
    var ticker = document.querySelector("[data-trust-ticker]");
    if (!ticker) return;

    var track = ticker.querySelector("[data-ticker-track]");
    if (!track) return;

    var initialGroup = track.querySelector(".trust-ticker-group");
    if (!initialGroup) return;

    var groupWidth = 0;
    var currentX = 0;
    var animId = null;
    var isPaused = false;
    var lastTime = performance.now();
    var baseSpeed = 45; // Pixels per second for a smooth, readable glide

    function getIsRtl() {
      return document.documentElement.getAttribute("dir") === "rtl";
    }
    var isRtl = getIsRtl();

    function setupClones() {
      // Remove any previously created clone groups
      var existingGroups = track.querySelectorAll(".trust-ticker-group");
      for (var i = 1; i < existingGroups.length; i++) {
        existingGroups[i].remove();
      }

      // Measure original single-group width accurately
      groupWidth = initialGroup.getBoundingClientRect().width || initialGroup.offsetWidth;
      if (groupWidth <= 0) return;

      // Calculate required copies for any screen size (320px, 375px, 425px, 768px, desktop)
      var viewportWidth = window.innerWidth || document.documentElement.clientWidth || 320;
      var neededCopies = Math.max(3, Math.ceil((viewportWidth * 3) / groupWidth) + 1);

      for (var j = 1; j < neededCopies; j++) {
        var clone = initialGroup.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      }

      // Keep currentX cleanly normalized within [-groupWidth, 0]
      if (currentX <= -groupWidth || currentX > 0) {
        currentX = isRtl ? -groupWidth : 0;
      }
    }

    function animate(now) {
      if (!now) now = performance.now();
      var delta = (now - lastTime) / 1000;
      lastTime = now;

      // Cap delta in case tab was backgrounded/inactive
      if (delta > 0.1) delta = 0.016;

      if (!isPaused && groupWidth > 0) {
        var step = baseSpeed * delta;
        if (isRtl) {
          // In RTL mode: move rightwards toward natural RTL reading direction
          currentX += step;
          if (currentX >= 0) {
            currentX -= groupWidth;
          }
        } else {
          // In LTR mode: move leftwards
          currentX -= step;
          if (currentX <= -groupWidth) {
            currentX += groupWidth;
          }
        }
        track.style.transform = "translate3d(" + currentX.toFixed(2) + "px, 0, 0)";
      }

      animId = requestAnimationFrame(animate);
    }

    function updateDir(newDir) {
      var nextRtl = newDir ? newDir === "rtl" : getIsRtl();
      if (nextRtl !== isRtl) {
        isRtl = nextRtl;
        if (groupWidth > 0) {
          while (currentX > 0) currentX -= groupWidth;
          while (currentX < -groupWidth) currentX += groupWidth;
        }
      }
    }

    // React to direction change events
    document.addEventListener("dirchange", function (e) {
      updateDir(e.detail && e.detail.dir);
    });

    if (window.MutationObserver) {
      var dirObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.attributeName === "dir") {
            updateDir();
          }
        });
      });
      dirObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
    }

    // Pause on hover or touch
    ticker.addEventListener("mouseenter", function () { isPaused = true; }, { passive: true });
    ticker.addEventListener("mouseleave", function () {
      isPaused = false;
      lastTime = performance.now();
    }, { passive: true });
    ticker.addEventListener("touchstart", function () { isPaused = true; }, { passive: true });
    ticker.addEventListener("touchend", function () {
      isPaused = false;
      lastTime = performance.now();
    }, { passive: true });

    // Handle responsive resize (320px, 375px, 425px, 768px, etc.)
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        setupClones();
      }, 120);
    }, { passive: true });

    // Setup initial clones
    setupClones();

    // Re-check after custom web fonts finish rendering
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        setupClones();
      });
    }

    // Start movement loop
    if (animId) cancelAnimationFrame(animId);
    lastTime = performance.now();
    animId = requestAnimationFrame(animate);
  }

  /* ─── Boot ─────────────────────────────────────────────────────── */
  function boot() {
    initTheme();
    initDir();
    initMobileMenu();
    initDropdowns();
    initAccordions();
    initTabs();
    initReveal();
    initCounters();
    initProgressBars();
    initBackToTop();
    initScrollProgress();
    initYear();
    initPasswordToggle();
    initCountdown();
    initPricingToggle();
    initDashProgressBars();
    initTrustTicker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.IEPUI = { applyTheme: applyTheme, applyDir: applyDir };
})();
