/**
 * ============================================================================
 * AegisPoint Advocacy & Consulting - Static Build
 * Copies ONLY the public website files into ./dist so that the Vercel
 * deployment never exposes backend source (server.js, lib/, api/),
 * stored form submissions (data/) or project config.
 * Run via: npm run build
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "dist");

// Directories that make up the public website
const PUBLIC_DIRS = ["assets", "dashboard"];
// Individual public files at the project root
const PUBLIC_FILES = ["favicon.svg"];

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else if (entry.isFile()) {
      fs.copyFileSync(src, dest);
    }
  }
}

function build() {
  // Clean previous output
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // Every HTML page lives at the project root
  const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));
  for (const page of pages) {
    fs.copyFileSync(path.join(ROOT, page), path.join(OUT, page));
  }

  for (const file of PUBLIC_FILES) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, file));
  }

  for (const dir of PUBLIC_DIRS) {
    const src = path.join(ROOT, dir);
    if (fs.existsSync(src)) copyDir(src, path.join(OUT, dir));
  }

  const count = pages.length + PUBLIC_FILES.length + PUBLIC_DIRS.length;
  console.log(`Static build complete -> dist/ (${pages.length} pages, ${PUBLIC_DIRS.join(", ")})`);
  return count;
}

build();
