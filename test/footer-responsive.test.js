/**
 * Public Pages Footer & Section Rhythm Responsive Test
 * Verifies the shared footer and inter-section spacing across the public pages
 * (index, about, services, service-details, pricing, blog, blog-details,
 * contact, 404) at 320px, 375px, 425px and 768px viewports.
 *
 * Guards against the Bootstrap/Tailwind spacing collision: Bootstrap 5.3.3
 * loads before style.min.css and its !important utilities (mt-4, py-5,
 * gap-5, ...) silently win over Tailwind unless restored by the parity block
 * at the end of assets/css/bootstrap-rtl-fix.css.
 *
 * Uses headless Edge via Chrome DevTools Protocol to measure real rendering.
 */

const { spawn } = require("child_process");
const http = require("http");
const server = require("../server");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const SERVER_PORT = 3890;
const CDP_PORT = 9336;

let passedCount = 0;
let totalCount = 0;

function assertTest(desc, condition, detail) {
  totalCount++;
  if (condition) {
    console.log(`  ✓ ${desc}`);
    passedCount++;
  } else {
    console.error(`  ✗ ${desc}`);
    if (detail) console.error(`    Detail: ${detail}`);
  }
}

function cdpSend(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e6);
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener("message", handler);
        if (msg.error) {
          reject(new Error(msg.error.message));
        } else {
          resolve(msg.result);
        }
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function run() {
  console.log("=================================================");
  console.log("Footer & Section Rhythm Responsive Verification");
  console.log("Breakpoints: 320px, 375px, 425px, 768px | LTR & RTL");
  console.log("=================================================\n");

  // 1. Start Server
  await new Promise((resolve) => server.listen(SERVER_PORT, resolve));
  console.log(`Test server running at http://127.0.0.1:${SERVER_PORT}`);

  // 2. Start Headless Edge
  const edgeProc = spawn(EDGE_PATH, [
    "--headless",
    "--disable-gpu",
    `--remote-debugging-port=${CDP_PORT}`,
    "--remote-debugging-address=127.0.0.1",
    "--no-first-run",
    "--no-default-browser-check"
  ]);

  // Wait for CDP to be ready
  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 300));
    try {
      const res = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${CDP_PORT}/json`, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(JSON.parse(data)));
        }).on("error", reject);
      });
      const page = res.find((t) => t.type === "page");
      if (page && page.webSocketDebuggerUrl) {
        wsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error("Could not connect to Headless Edge CDP");
    edgeProc.kill();
    server.close();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  await cdpSend(ws, "Page.enable");
  await cdpSend(ws, "DOM.enable");
  await cdpSend(ws, "CSS.enable");

  // Public pages with the shared copy-pasted footer
  const pages = [
    "/index.html",
    "/about.html",
    "/services.html",
    "/service-details.html",
    "/pricing.html",
    "/blog.html",
    "/blog-details.html",
    "/contact.html",
    "/404.html"
  ];

  const breakpoints = [
    { name: "320px", width: 320, height: 568 },
    { name: "375px", width: 375, height: 667 },
    { name: "425px", width: 425, height: 800 },
    { name: "768px", width: 768, height: 1024 }
  ];

  for (const pagePath of pages) {
    console.log(`\nTesting Page: ${pagePath}`);
    await cdpSend(ws, "Page.navigate", { url: `http://127.0.0.1:${SERVER_PORT}${pagePath}` });
    await new Promise((r) => setTimeout(r, 1200));

    for (const bp of breakpoints) {
      console.log(`\n--- Viewport: ${bp.name} ---`);

      await cdpSend(ws, "Emulation.setDeviceMetricsOverride", {
        width: bp.width,
        height: bp.height,
        deviceScaleFactor: 1,
        mobile: true
      });
      await new Promise((r) => setTimeout(r, 150));

      for (const dir of ["ltr", "rtl"]) {
        const dirLabel = dir.toUpperCase();

        await cdpSend(ws, "Runtime.evaluate", {
          expression: `document.documentElement.setAttribute('dir', '${dir}');`
        });
        await new Promise((r) => setTimeout(r, 80));

        const evalRes = await cdpSend(ws, "Runtime.evaluate", {
          expression: `
            (() => {
              const footer = document.querySelector('footer');
              if (!footer) return { missing: true };

              const html = document.documentElement;
              const mainEl = document.querySelector('main') || document.querySelector('main, .hero, [class*="hero"]');

              function cs(el) { return window.getComputedStyle(el); }
              function box(el) {
                const r = el.getBoundingClientRect();
                return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
              }

              // Footer top section container (container-wide py-14)
              const topContainer = footer.querySelector('.container-wide.py-14');
              const topRow = topContainer ? topContainer.querySelector('.row') : null;
              const topCols = topRow ? [...topRow.children].filter(c => c.className.includes('col-')) : [];
              const colBoxes = topCols.filter(c => cs(c).display !== 'none').map(box);

              // Bottom bar (copyright row)
              const bottomBar = footer.querySelector('.container-wide.flex');
              const bottomBarStyle = bottomBar ? cs(bottomBar) : null;
              const bottomLinksWrap = bottomBar ? bottomBar.querySelector('.flex.gap-5') : null;
              const bottomLinksGap = bottomLinksWrap ? cs(bottomLinksWrap).columnGap || cs(bottomLinksWrap).gap : null;

              // Footer column internals: mt-4 headings/lists must be 16px (Tailwind), not 24px (Bootstrap)
              const colMt4 = footer.querySelector('.mt-4');
              const colMt4Margin = colMt4 ? cs(colMt4).marginTop : null;

              // Section rhythm: gap between consecutive <section> bands in <main>
              const sections = [...document.querySelectorAll('main > section, main > div')].filter(s => cs(s).display !== 'none');
              const sectionGaps = [];
              for (let i = 1; i < sections.length; i++) {
                const prev = sections[i - 1], cur = sections[i];
                // Only count bands stacked directly (no horizontal offset)
                sectionGaps.push({
                  gap: Math.round(box(cur).top - box(prev).bottom),
                  prevPadBottom: Math.round(parseFloat(cs(prev).paddingBottom)),
                  curPadTop: Math.round(parseFloat(cs(cur).paddingTop))
                });
              }

              return {
                missing: false,
                scrollWidth: html.scrollWidth,
                colBoxes,
                colCount: colBoxes.length,
                topContainerPadTop: topContainer ? Math.round(parseFloat(cs(topContainer).paddingTop)) : null,
                topContainerPadX: topContainer ? Math.round(parseFloat(cs(topContainer).paddingLeft)) : null,
                topRowGutterY: topRow ? cs(topRow).getPropertyValue('--bs-gutter-y').trim() : null,
                bottomPadTop: bottomBarStyle ? Math.round(parseFloat(bottomBarStyle.paddingTop)) : null,
                bottomPadBottom: bottomBarStyle ? Math.round(parseFloat(bottomBarStyle.paddingBottom)) : null,
                bottomLinksGap,
                colMt4Margin: colMt4Margin !== null ? Math.round(parseFloat(colMt4Margin)) : null,
                sectionGaps
              };
            })()
          `,
          returnByValue: true
        });

        const d = evalRes.result.value;
        if (!d || d.missing) {
          assertTest(`[${dirLabel} @ ${bp.width}px] Footer exists on ${pagePath}`, false, "footer element not found");
          continue;
        }

        // 1. No horizontal overflow
        assertTest(
          `[${dirLabel} @ ${bp.width}px] No horizontal overflow (scrollWidth ${d.scrollWidth} <= ${bp.width})`,
          d.scrollWidth <= bp.width,
          `scrollWidth ${d.scrollWidth} vs viewport ${bp.width}`
        );

        // 2. Footer columns stack full-width below sm (640px): every column is
        //    most of the viewport width (404.html wraps the footer in a
        //    narrower Bootstrap .container, so allow up to ~30% inset).
        if (bp.width < 640) {
          const stacked = d.colBoxes.length >= 3 && d.colBoxes.every(c => c.width >= bp.width * 0.7);
          assertTest(
            `[${dirLabel} @ ${bp.width}px] Footer columns stack vertically (each ~full width)`,
            stacked,
            `widths: ${d.colBoxes.map(c => Math.round(c.width)).join(', ')}`
          );
        }

        // 3. At 768px: 2x2 grid — columns 1&2 on first row, 3&4 on second row,
        //    equal widths, vertically stacked rows (direction-neutral check).
        if (bp.width === 768) {
          const [c1, c2, c3, c4] = d.colBoxes;
          const twoByTwo = c1 && c2 && c3 && c4 &&
            Math.abs(c1.top - c2.top) < 4 &&          // row 1: cols 1+2
            Math.abs(c3.top - c4.top) < 4 &&          // row 2: cols 3+4
            c3.top > c2.bottom - 4 &&                 // col 3 below the first row
            Math.abs(c1.width - c2.width) < 8 &&      // equal widths
            Math.abs(c1.width - c3.width) < 8;
          assertTest(
            `[${dirLabel} @ ${bp.width}px] Footer link columns form a 2x2 grid at 768px`,
            twoByTwo,
            `boxes: ${JSON.stringify(d.colBoxes.map(c => [Math.round(c.left), Math.round(c.top), Math.round(c.width)]))}`
          );
        }

        // 4. Footer container vertical padding reduced on mobile: <= 48px below 640, 56px at 768
        if (bp.width < 640) {
          assertTest(
            `[${dirLabel} @ ${bp.width}px] Footer container block padding is reduced (<= 48px, got ${d.topContainerPadTop})`,
            d.topContainerPadTop !== null && d.topContainerPadTop <= 48,
            `padding-top: ${d.topContainerPadTop}`
          );
        } else {
          assertTest(
            `[${dirLabel} @ ${bp.width}px] Footer container block padding is 56px at >=640 (got ${d.topContainerPadTop})`,
            d.topContainerPadTop === 56,
            `padding-top: ${d.topContainerPadTop}`
          );
        }

        // 5. Bottom bar padding restored to Tailwind py-5 = 20px (was 48px via Bootstrap !important)
        assertTest(
          `[${dirLabel} @ ${bp.width}px] Bottom bar padding is 20px (Tailwind py-5), got ${d.bottomPadTop}/${d.bottomPadBottom}`,
          d.bottomPadTop === 20 && d.bottomPadBottom === 20,
          `padding-top: ${d.bottomPadTop}, padding-bottom: ${d.bottomPadBottom}`
        );

        // 6. Bottom-bar link gap restored to Tailwind gap-5 = 20px (was 48px)
        const gapPx = d.bottomLinksGap ? Math.round(parseFloat(d.bottomLinksGap)) : null;
        assertTest(
          `[${dirLabel} @ ${bp.width}px] Bottom-bar link gap is 20px (Tailwind gap-5), got ${gapPx}`,
          gapPx === 20,
          `gap: ${d.bottomLinksGap}`
        );

        // 7. Footer column mt-4 restored to Tailwind 16px (was 24px via Bootstrap)
        assertTest(
          `[${dirLabel} @ ${bp.width}px] Footer mt-4 spacing is 16px (Tailwind), got ${d.colMt4Margin}`,
          d.colMt4Margin === 16,
          `margin-top: ${d.colMt4Margin}`
        );

        // 8. Section rhythm: adjacent section bands never leave a huge dead gap on mobile
        for (let i = 0; i < d.sectionGaps.length; i++) {
          const g = d.sectionGaps[i];
          if (g.gap < 0 || g.gap > 4) continue; // stacked bands with 0-4px seam are fine; skip non-adjacent
          assertTest(
            `[${dirLabel} @ ${bp.width}px] Section seam #${i + 1} padding within bounds (bottom ${g.prevPadBottom}px + top ${g.curPadTop}px <= 160px)`,
            g.prevPadBottom + g.curPadTop <= 160,
            `prev padding-bottom: ${g.prevPadBottom}, cur padding-top: ${g.curPadTop}`
          );
        }
      }
    }
  }

  // Cleanup
  ws.close();
  edgeProc.kill();
  server.close(() => {
    console.log("\n=================================================");
    console.log(`Footer/Section Test Results: ${passedCount}/${totalCount} tests passed!`);
    console.log("=================================================\n");
    process.exit(passedCount === totalCount ? 0 : 1);
  });
}

run().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
