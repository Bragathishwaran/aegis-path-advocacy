/**
 * Automated Test Suite for Dashboard Responsive Header Layout & Alignment
 * Tests 320px, 375px, and 425px viewports across both LTR and RTL directions.
 * Uses headless Edge via Chrome DevTools Protocol to measure real rendering.
 */

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const server = require("../server");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const SERVER_PORT = 3888;
const CDP_PORT = 9334;

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
  console.log("Dashboard Header Responsive Layout Verification");
  console.log("Breakpoints: 320px, 375px, 425px | LTR & RTL");
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

  // Test across dashboard and public pages
  const pages = [
    "/index.html",
    "/dashboard/index.html",
    "/dashboard/case-notes.html",
    "/dashboard/profile.html",
    "/dashboard/progress.html",
    "/dashboard/schedule.html"
  ];

  const breakpoints = [
    { name: "320px (Ultra-small mobile)", width: 320, height: 568 },
    { name: "375px (Standard mobile)", width: 375, height: 667 },
    { name: "425px (Large mobile)", width: 425, height: 800 }
  ];

  for (const pagePath of pages) {
    const isDash = pagePath.startsWith("/dashboard");
    console.log(`\nTesting Page: ${pagePath}`);
    await cdpSend(ws, "Page.navigate", { url: `http://127.0.0.1:${SERVER_PORT}${pagePath}` });
    await new Promise((r) => setTimeout(r, 1000));

    for (const bp of breakpoints) {
      console.log(`\n--- Viewport: ${bp.name} ---`);

      // Set viewport
      await cdpSend(ws, "Emulation.setDeviceMetricsOverride", {
        width: bp.width,
        height: bp.height,
        deviceScaleFactor: 1,
        mobile: true
      });

      for (const dir of ["ltr", "rtl"]) {
        const isRtl = dir === "rtl";
        const dirLabel = isRtl ? "RTL" : "LTR";

        // Apply direction in browser
        await cdpSend(ws, "Runtime.evaluate", {
          expression: `
            document.documentElement.setAttribute('dir', '${dir}');
            if (window.IEPUI && window.IEPUI.applyDir) {
              window.IEPUI.applyDir('${dir}');
            } else {
              document.querySelectorAll('[data-dir-toggle]').forEach(btn => {
                const iconRtl = btn.querySelector('[data-icon-rtl]');
                const iconLtr = btn.querySelector('[data-icon-ltr]');
                if (iconRtl) iconRtl.classList.toggle('hidden', '${dir}' === 'rtl');
                if (iconLtr) iconLtr.classList.toggle('hidden', '${dir}' !== 'rtl');
              });
            }
          `
        });
        await new Promise((r) => setTimeout(r, 100));

        // Evaluate layout metrics
        const evalRes = await cdpSend(ws, "Runtime.evaluate", {
          expression: `
            (() => {
              const header = document.querySelector('.site-header');
              const brandLink = document.querySelector('.dash-brand-link') || document.querySelector('.site-header a.font-display') || document.querySelector('.site-header a[href*="index.html"]');
              const brandPrimary = document.querySelector('.dash-brand-primary') || brandLink;
              const brandSecondary = document.querySelector('.dash-brand-secondary');
              const actions = document.querySelector('.dash-header-actions') || document.querySelector('.site-header .flex.items-center.gap-2') || document.querySelector('.site-header .container-wide > .flex > div:last-child');
              const dirBtn = document.querySelector('[data-dir-toggle]');
              const themeBtn = document.querySelector('[data-theme-toggle]');
              const profileBtn = document.querySelector('.dash-profile-btn');
              const menuBtn = document.querySelector('.dash-menu-btn') || document.querySelector('[data-menu-toggle]');
              const body = document.body;
              const html = document.documentElement;

              const bodyScrollWidth = html.scrollWidth;
              const headerClientWidth = header ? header.clientWidth : 0;
              const headerScrollWidth = header ? header.scrollWidth : 0;

              function toBox(el) {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
              }

              const brandBox = toBox(brandLink);
              const actionsBox = toBox(actions);
              const dirBox = toBox(dirBtn);
              const themeBox = toBox(themeBtn);
              const profileBox = toBox(profileBtn);
              const menuBox = toBox(menuBtn);

              const iconRtl = dirBtn ? dirBtn.querySelector('[data-icon-rtl]') : null;
              const iconLtr = dirBtn ? dirBtn.querySelector('[data-icon-ltr]') : null;
              const iconRtlVisible = iconRtl ? window.getComputedStyle(iconRtl).display !== 'none' : false;
              const iconLtrVisible = iconLtr ? window.getComputedStyle(iconLtr).display !== 'none' : false;

              const brandSecondaryVisible = brandSecondary ? window.getComputedStyle(brandSecondary).display !== 'none' : true;
              const brandPrimaryVisible = brandPrimary ? window.getComputedStyle(brandPrimary).display !== 'none' : false;
              const dirBtnVisible = dirBtn ? window.getComputedStyle(dirBtn).display !== 'none' : false;
              const themeBtnVisible = themeBtn ? window.getComputedStyle(themeBtn).display !== 'none' : false;
              const profileBtnVisible = profileBtn ? window.getComputedStyle(profileBtn).display !== 'none' : true;
              const menuBtnVisible = menuBtn ? window.getComputedStyle(menuBtn).display !== 'none' : false;

              const brandPrimaryText = brandPrimary ? brandPrimary.textContent.trim() : '';
              const brandSecondaryText = brandSecondary ? brandSecondary.textContent.trim() : '';
              const brandFullText = brandLink ? brandLink.textContent.trim() : '';

              return {
                bodyScrollWidth,
                headerClientWidth,
                headerScrollWidth,
                brandBox,
                actionsBox,
                dirBox,
                themeBox,
                profileBox,
                menuBox,
                iconRtlVisible,
                iconLtrVisible,
                brandPrimaryVisible,
                brandSecondaryVisible,
                brandPrimaryText,
                brandSecondaryText,
                brandFullText,
                dirBtnVisible,
                themeBtnVisible,
                profileBtnVisible,
                menuBtnVisible,
                isRtl: html.getAttribute('dir') === 'rtl'
              };
            })()
          `,
          returnByValue: true
        });

        const data = evalRes.result.value;

        // 1. Page horizontal overflow check: html.scrollWidth <= viewport width
        assertTest(
          `[${dirLabel} @ ${bp.width}px] No horizontal page scroll (scrollWidth: ${data.bodyScrollWidth}px <= ${bp.width}px)`,
          data.bodyScrollWidth <= bp.width,
          `Body scrollWidth is ${data.bodyScrollWidth}px but viewport is ${bp.width}px`
        );

        // 2. Header container overflow check: header.scrollWidth <= header.clientWidth
        assertTest(
          `[${dirLabel} @ ${bp.width}px] Header fits within bounds (scrollWidth: ${data.headerScrollWidth}px <= clientWidth: ${data.headerClientWidth}px)`,
          data.headerScrollWidth <= data.headerClientWidth,
          `Header scrollWidth is ${data.headerScrollWidth}px > clientWidth ${data.headerClientWidth}px`
        );

        // 3. Brand primary is always visible and text matches
        assertTest(
          `[${dirLabel} @ ${bp.width}px] Brand name is visible and contains 'Aegis'`,
          data.brandPrimaryVisible === true && data.brandFullText.includes("Aegis"),
          `brandPrimary visible: ${data.brandPrimaryVisible}, text: '${data.brandFullText}'`
        );

        // 4. Brand contains 'Point' and 'Advocacy' is removed
        assertTest(
          `[${dirLabel} @ ${bp.width}px] Brand contains 'Point' and 'Advocacy' is removed`,
          data.brandFullText.includes("Point") && !data.brandFullText.includes("Advocacy"),
          `full: '${data.brandFullText}'`
        );

        // 5. Direction toggle button is visible across all viewports
        assertTest(
          `[${dirLabel} @ ${bp.width}px] RTL/LTR direction toggle button is visible`,
          data.dirBtnVisible === true,
          `dirBtn: ${data.dirBtnVisible}`
        );

        // 6. Direction SVG icons toggle correctly between RTL and LTR
        if (isRtl) {
          assertTest(
            `[RTL @ ${bp.width}px] LTR icon is visible and RTL icon is hidden in RTL mode`,
            data.iconLtrVisible && !data.iconRtlVisible,
            `iconLtr: ${data.iconLtrVisible}, iconRtl: ${data.iconRtlVisible}`
          );
        } else {
          assertTest(
            `[LTR @ ${bp.width}px] RTL icon is visible and LTR icon is hidden in LTR mode`,
            data.iconRtlVisible && !data.iconLtrVisible,
            `iconRtl: ${data.iconRtlVisible}, iconLtr: ${data.iconLtrVisible}`
          );
        }

        // 7. Theme toggle & Menu toggle buttons are visible
        assertTest(
          `[${dirLabel} @ ${bp.width}px] Theme toggle and Menu button are visible`,
          data.themeBtnVisible && data.menuBtnVisible,
          `themeBtn: ${data.themeBtnVisible}, menuBtn: ${data.menuBtnVisible}`
        );

        // 6. Action buttons and Logo don't overlap
        if (data.brandBox && data.actionsBox) {
          const overlap = isRtl
            ? data.actionsBox.right > data.brandBox.left // in RTL, actions on left, brand on right
            : data.brandBox.right > data.actionsBox.left; // in LTR, brand on left, actions on right
          assertTest(
            `[${dirLabel} @ ${bp.width}px] Logo and actions container do not overlap`,
            !overlap,
            `brand: [${data.brandBox.left}, ${data.brandBox.right}], actions: [${data.actionsBox.left}, ${data.actionsBox.right}]`
          );
        }

        // 7. RTL vs LTR alignment check:
        // In LTR: brand on left (brand.left < actions.left)
        // In RTL: brand on right (actions.left < brand.left)
        if (data.brandBox && data.actionsBox) {
          if (isRtl) {
            assertTest(
              `[RTL @ ${bp.width}px] Actions container is positioned at inline-end (left side) in RTL`,
              data.actionsBox.left < data.brandBox.left,
              `actions.left: ${data.actionsBox.left}, brand.left: ${data.brandBox.left}`
            );
          } else {
            assertTest(
              `[LTR @ ${bp.width}px] Actions container is positioned at inline-end (right side) in LTR`,
              data.brandBox.left < data.actionsBox.left,
              `brand.left: ${data.brandBox.left}, actions.left: ${data.actionsBox.left}`
            );
          }
        }
      }
    }
  }

  // Cleanup
  ws.close();
  edgeProc.kill();
  server.close(() => {
    console.log("\n=================================================");
    console.log(`Responsive Test Results: ${passedCount}/${totalCount} tests passed!`);
    console.log("=================================================\n");
    if (passedCount === totalCount) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  });
}

run().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
