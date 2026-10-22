/**
 * ============================================================================
 * AegisPoint Advocacy - Responsive Audit
 * ----------------------------------------------------------------------------
 * Sweeps every page (public + dashboard) at mobile / tablet / desktop
 * widths in LTR, RTL and dark mode and reports:
 *
 *   1. Horizontal page overflow (with the offending elements)
 *   2. Broken images
 *   3. Stretched images (rendered aspect ratio != natural aspect ratio
 *      and no object-fit: cover/contain to compensate)
 *   4. Clipped text (scrollWidth > clientWidth on a text element)
 *   5. Tap targets smaller than 24px on touch widths
 *
 * Uses headless Edge via the Chrome DevTools Protocol, the same harness as
 * test/header-responsive.test.js and test/footer-responsive.test.js.
 *
 *   node test/responsive-audit.js            # human readable report
 *   node test/responsive-audit.js --json     # machine readable
 * ============================================================================
 */

const { spawn } = require("child_process");
const http = require("http");
const server = require("../server");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const SERVER_PORT = 3892;
const CDP_PORT = 9338;
const AS_JSON = process.argv.includes("--json");

const PAGES = [
  "/index.html",
  "/about.html",
  "/services.html",
  "/service-details.html",
  "/pricing.html",
  "/blog.html",
  "/blog-details.html",
  "/contact.html",
  "/404.html",
  "/coming-soon.html",
  "/login.html",
  "/dashboard/index.html",
  "/dashboard/case-notes.html",
  "/dashboard/progress.html",
  "/dashboard/schedule.html",
  "/dashboard/profile.html",
];

const BREAKPOINTS = [
  { name: "320px", width: 320, height: 568, touch: true },
  { name: "375px", width: 375, height: 667, touch: true },
  { name: "425px", width: 425, height: 800, touch: true },
  { name: "768px", width: 768, height: 1024, touch: true },
  { name: "1024px", width: 1024, height: 800, touch: false },
  { name: "1440px", width: 1440, height: 900, touch: false },
];

const MODES = ["ltr", "rtl", "dark"];

function cdpSend(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e6);
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener("message", handler);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const AUDIT_EXPRESSION = `
(() => {
  const html = document.documentElement;
  const vw = html.clientWidth;

  function cs(el) { return window.getComputedStyle(el); }
  function label(el) {
    const id = el.id ? "#" + el.id : "";
    const cls = (el.className && el.className.toString)
      ? "." + el.className.toString().trim().split(/\\s+/).slice(0, 4).join(".")
      : "";
    return el.tagName.toLowerCase() + id + cls;
  }
  function inScroller(el) {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const o = cs(p);
      if (o.overflowX === "auto" || o.overflowX === "scroll") return true;
      if (o.overflowX === "hidden" || o.overflowY === "hidden") return true;
      if (o.overflow === "hidden" || o.overflow === "clip") return true;
      p = p.parentElement;
    }
    return false;
  }

  // 1. Overflow offenders (only meaningful when the page actually scrolls)
  const overflow = [];
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const s = cs(el);
    if (s.position === "fixed" || s.display === "none" || s.visibility === "hidden") continue;
    if (r.right > vw + 1 || r.left < -1) {
      if (inScroller(el)) continue;
      overflow.push({
        el: label(el),
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width)
      });
      if (overflow.length >= 8) break;
    }
  }

  // 2 + 3. Images
  const broken = [];
  const pending = [];
  const stretched = [];
  for (const img of document.images) {
    const r = img.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const s = cs(img);
    if (s.display === "none") continue;
    if (!img.complete || !img.naturalWidth) {
      if (img.complete && !img.naturalWidth) {
        broken.push({ el: label(img), src: (img.getAttribute("src") || "").slice(0, 70) });
      } else {
        pending.push({ el: label(img), src: (img.getAttribute("src") || "").slice(0, 70) });
      }
      continue;
    }
    const fit = s.objectFit;
    if (fit === "cover" || fit === "contain" || fit === "none" || fit === "scale-down") continue;
    const rAspect = r.width / r.height;
    const nAspect = img.naturalWidth / img.naturalHeight;
    const delta = Math.abs(rAspect - nAspect) / nAspect;
    if (delta > 0.08) {
      stretched.push({
        el: label(img),
        src: (img.getAttribute("src") || "").slice(0, 60),
        rendered: (Math.round(r.width) + "x" + Math.round(r.height)),
        natural: (img.naturalWidth + "x" + img.naturalHeight),
        distortion: Math.round(delta * 100) + "%"
      });
    }
  }

  // 4. Clipped text (deliberate truncation is not a bug)
  const clipped = [];
  for (const el of document.body.querySelectorAll("h1,h2,h3,h4,h5,p,span,a,li,button,label,td,th")) {
    if (el.closest(".sr-only") || el.closest(".visually-hidden")) continue;
    if (el.classList.contains("truncate")) continue;
    const s = cs(el);
    if (s.display === "none" || s.visibility === "hidden") continue;
    if (s.textOverflow === "ellipsis") continue;
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
      const o = s.overflowX;
      if (o === "hidden" || o === "clip" || o === "auto" || o === "scroll") {
        clipped.push({ el: label(el), text: (el.textContent || "").trim().slice(0, 48) });
        if (clipped.length >= 6) break;
      }
    }
  }

  // 5. Tap targets (a linked <label> counts as the target for a checkbox)
  const small = [];
  const smallLinks = [];
  for (const el of document.body.querySelectorAll("button, a, input, select, textarea, [role=button]")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const s = cs(el);
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") continue;
    if (r.height >= 24 && r.width >= 24) continue;
    // A visually hidden input is driven by its label, so the label is the
    // real tap target - the hidden input itself must not be measured.
    if (el.tagName === "INPUT" && (el.classList.contains("sr-only") || el.closest(".sr-only") ||
        el.classList.contains("visually-hidden") || el.closest(".visually-hidden") || r.width <= 2 || r.height <= 2)) {
      const lab = el.id ? document.querySelector('label[for="' + el.id + '"]') : null;
      if (lab) {
        const lr = lab.getBoundingClientRect();
        if (lr.width >= 24 && lr.height >= 24) continue;
      }
    }
    if (el.tagName === "INPUT" && el.type === "checkbox") {
      const lab = el.id ? document.querySelector('label[for="' + el.id + '"]') : null;
      if (lab) continue; // the label is the real target
    }
    const entry = { el: label(el), w: Math.round(r.width), h: Math.round(r.height) };
    if (el.tagName === "A" || el.getAttribute("role") === "button") {
      smallLinks.push(entry);
      if (smallLinks.length >= 8) break;
    } else {
      small.push(entry);
      if (small.length >= 8) break;
    }
  }

  return {
    vw,
    scrollWidth: html.scrollWidth,
    ready: document.readyState,
    overflow: overflow,
    broken: broken,
    pending: pending,
    stretched: stretched,
    clipped: clipped,
    small: small,
    smallLinks: smallLinks
  };
})()
`;

async function run() {
  await new Promise((resolve) => server.listen(SERVER_PORT, resolve));

  const edgeProc = spawn(EDGE_PATH, [
    "--headless",
    "--disable-gpu",
    `--remote-debugging-port=${CDP_PORT}`,
    "--remote-debugging-address=127.0.0.1",
    "--no-first-run",
    "--no-default-browser-check",
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 300));
    try {
      const res = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${CDP_PORT}/json`, (r) => {
          let d = "";
          r.on("data", (c) => (d += c));
          r.on("end", () => resolve(JSON.parse(d)));
        }).on("error", reject);
      });
      const page = res.find((t) => t.type === "page");
      if (page && page.webSocketDebuggerUrl) { wsUrl = page.webSocketDebuggerUrl; break; }
    } catch (e) {}
  }
  if (!wsUrl) {
    console.error("Could not connect to Headless Edge CDP");
    edgeProc.kill();
    server.close();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  await cdpSend(ws, "Page.enable");
  await cdpSend(ws, "Runtime.enable");

  const report = [];

  for (const pagePath of PAGES) {
    await cdpSend(ws, "Page.navigate", { url: `http://127.0.0.1:${SERVER_PORT}${pagePath}` });
    // Wait for the document (and its images) to settle.
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const st = await cdpSend(ws, "Runtime.evaluate", {
        expression: "document.readyState === 'complete' && [...document.images].every(i => i.complete)",
        returnByValue: true,
      });
      if (st.result.value) break;
    }

    for (const bp of BREAKPOINTS) {
      await cdpSend(ws, "Emulation.setDeviceMetricsOverride", {
        width: bp.width, height: bp.height, deviceScaleFactor: 1, mobile: bp.touch,
      });
      await new Promise((r) => setTimeout(r, 120));

      for (const mode of MODES) {
        await cdpSend(ws, "Runtime.evaluate", {
          expression: `
            (() => {
              document.documentElement.setAttribute('dir', '${mode === "rtl" ? "rtl" : "ltr"}');
              const dark = ${mode === "dark" ? "true" : "false"};
              document.documentElement.classList.toggle('dark', dark);
              document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
              if (document.body) {
                document.body.classList.toggle('dark', dark);
                document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
              }
            })()`
        });
        await new Promise((r) => setTimeout(r, 90));

        const res = await cdpSend(ws, "Runtime.evaluate", {
          expression: AUDIT_EXPRESSION,
          returnByValue: true,
        });
        const data = res.result.value || {};
        const hOverflow = data.scrollWidth > data.vw + 1;
        const issues = [];
        if (hOverflow) issues.push(`overflow ${data.scrollWidth}>${data.vw}`);
        if (data.broken.length) issues.push(`${data.broken.length} broken image(s)`);
        if (data.stretched.length) issues.push(`${data.stretched.length} stretched image(s)`);
        if (data.clipped.length) issues.push(`${data.clipped.length} clipped text(s)`);
        if (bp.touch && data.small.length) issues.push(`${data.small.length} small control(s)`);
        if (bp.touch && data.smallLinks.length) issues.push(`${data.smallLinks.length} small link(s)`);

        report.push({
          page: pagePath, bp: bp.name, mode,
          hOverflow, scrollWidth: data.scrollWidth, vw: data.vw,
          overflow: hOverflow ? data.overflow : [],
          broken: data.broken, stretched: data.stretched,
          clipped: data.clipped, small: data.small, smallLinks: data.smallLinks,
          pending: data.pending, issues,
        });
      }
    }
  }

  ws.close();
  edgeProc.kill();
  server.close();

  const problems = report.filter((r) => r.issues.length);
  if (AS_JSON) {
    console.log(JSON.stringify({ total: report.length, problems }, null, 2));
  } else {
    console.log("=================================================");
    console.log("Responsive Audit");
    console.log("=================================================\n");
    console.log(`Checked ${report.length} page/viewport/mode combinations.`);
    console.log(`Combinations with findings: ${problems.length}\n`);
    for (const p of problems) {
      console.log(`--- ${p.page} @ ${p.bp} (${p.mode}) ---`);
      console.log(`    ${p.issues.join(" | ")}`);
      if (p.overflow.length) {
        p.overflow.forEach((o) => console.log(`      overflow: ${o.el} [${o.left}..${o.right}] w=${o.width}`));
      }
      if (p.broken.length) {
        p.broken.forEach((b) => console.log(`      broken:   ${b.el} -> ${b.src}`));
      }
      if (p.stretched.length) {
        p.stretched.forEach((s) => console.log(`      stretched: ${s.el} ${s.rendered} vs ${s.natural} (${s.distortion}) ${s.src}`));
      }
      if (p.clipped.length) {
        p.clipped.forEach((c) => console.log(`      clipped:  ${c.el} "${c.text}"`));
      }
      if (p.small.length) {
        p.small.forEach((s) => console.log(`      control:  ${s.el} ${s.w}x${s.h}`));
      }
      if (p.smallLinks.length) {
        p.smallLinks.forEach((s) => console.log(`      link:     ${s.el} ${s.w}x${s.h}`));
      }
    }
    console.log("\n=================================================");
    console.log(problems.length ? `${problems.length} combination(s) need attention.` : "No issues found.");
    console.log("=================================================");
  }

  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
