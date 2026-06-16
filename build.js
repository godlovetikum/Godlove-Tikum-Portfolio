#!/usr/bin/env node
/**
 * build.js
 *
 * Reads portfolio.config.json, copies Public/, Admin/, Supabase/schema/,
 * and Netlify/ into dist/, then replaces every __TOKEN__ placeholder
 * with its configured value.
 *
 * Usage — run from inside the project root directory:
 *
 *   node build.js
 *
 * Output:
 *   dist/public/   →  drag-and-drop into your CF Pages public portfolio project
 *   dist/admin/    →  drag-and-drop into your CF Pages admin dashboard project
 *   dist/sql/      →  paste SQL files in order into the Supabase SQL editor
 *   dist/netlify/  →  deploy directory for the Netlify SEO redirect layer
 *
 * dist/ is gitignored. Never commit it.
 * No npm install needed — only Node.js built-ins are used.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Config ───────────────────────────────────────────────────────────────────

const ROOT   = __dirname;
const DIST   = path.join(ROOT, 'dist');
const CONFIG = path.join(ROOT, 'portfolio.config.json');

// Source folder → output folder name inside dist/
const SOURCES = [
  { src: 'Public',           out: 'public'  },
  { src: 'Admin',            out: 'admin'   },
  { src: 'Supabase/schema',  out: 'sql'     },
  { src: 'Netlify',          out: 'netlify' },
];

// File extensions that may contain __TOKEN__ placeholders
const SUB_EXTS = new Set(['.html', '.js', '.xml', '.sql', '.toml', '.txt']);

// Specific filenames (no extension) that may contain __TOKEN__ placeholders
const SUB_NAMES = new Set(['_headers', '_redirects']);

// Top-level directories inside each source that are skipped for substitution.
// CF Pages Functions read runtime secrets from CF env vars — not from tokens.
const SKIP_SUB_DIRS = new Set(['functions']);

// ── Load tokens ──────────────────────────────────────────────────────────────

let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
} catch (err) {
  console.error(`\n✗  Cannot read portfolio.config.json: ${err.message}\n`);
  process.exit(1);
}

const tokens = Object.entries(config)
  .filter(([k]) => k !== '_comment')
  .map(([k, v]) => ({
    placeholder: `__${k.toUpperCase()}__`,
    value:       String(v),
  }));

if (tokens.length === 0) {
  console.error('\n✗  portfolio.config.json has no keys to substitute.\n');
  process.exit(1);
}

console.log(`\n▶  portfolio.config.json — ${tokens.length} tokens loaded`);
tokens.forEach(({ placeholder }) => console.log(`   ${placeholder}`));
console.log('');

// ── Helpers ──────────────────────────────────────────────────────────────────

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src,  entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function substituteFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const { placeholder, value } of tokens) {
    if (content.includes(placeholder)) {
      // split/join avoids RegExp escaping issues with URLs and special chars
      content = content.split(placeholder).join(value);
      changed  = true;
    }
  }
  if (changed) fs.writeFileSync(filePath, content, 'utf8');
}

function shouldSubstitute(entryName) {
  return SUB_EXTS.has(path.extname(entryName).toLowerCase()) ||
         SUB_NAMES.has(entryName);
}

function walkAndSubstitute(dir, srcRoot) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Check whether this subtree should be skipped (functions/ etc.)
      const relFromSrc = path.relative(srcRoot, full);
      const topLevel   = relFromSrc.split(path.sep)[0];
      if (SKIP_SUB_DIRS.has(topLevel)) continue;
      walkAndSubstitute(full, srcRoot);
    } else if (shouldSubstitute(entry.name)) {
      substituteFile(full);
    }
  }
}

/** Returns any __TOKEN__ patterns still present in substitutable files. */
function findRemainingTokens(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRemainingTokens(full));
      continue;
    }
    if (!shouldSubstitute(entry.name)) continue;
    const content = fs.readFileSync(full, 'utf8');
    const matches = [...new Set(content.match(/__[A-Z][A-Z0-9_]*__/g) ?? [])];
    for (const token of matches) {
      results.push({ token, file: path.relative(DIST, full) });
    }
  }
  return results;
}

// ── Build ────────────────────────────────────────────────────────────────────
console.log('▶  Cleaning dist/ ...')
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true, force: true });

for (const { src, out } of SOURCES) {
  const srcPath = path.join(ROOT, src);
  const outPath = path.join(DIST, out);

  if (!fs.existsSync(srcPath)) {
    console.warn(`   ⚠  ${src}/ not found — skipping`);
    continue;
  }

  process.stdout.write(`▶  ${src}/  →  dist/${out}/  `);
  copyDir(srcPath, outPath);
  walkAndSubstitute(outPath, outPath);
  console.log('✓');
}

// ── Verify ───────────────────────────────────────────────────────────────────

const remaining = findRemainingTokens(DIST);
console.log('');

if (remaining.length > 0) {
  console.warn('⚠  Unresolved tokens remaining after substitution:');
  remaining.forEach(({ token, file }) =>
    console.warn(`   ${token.padEnd(30)}  ${file}`)
  );
  console.warn('\n   Add the missing keys to portfolio.config.json and re-run.\n');
} else {
  console.log('✓  All tokens resolved — no placeholders remaining.\n');
}

// ── Next steps ───────────────────────────────────────────────────────────────

console.log(`\
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  dist/ is ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  CLOUDFLARE PAGES — drag-and-drop upload
  ─────────────────────────────────────────
  1. dash.cloudflare.com  →  Workers & Pages
  2. Public portfolio project  →  Deployments  →  Upload assets
     Drag and drop the folder:   dist/public/
  3. Admin dashboard project   →  Deployments  →  Upload assets
     Drag and drop the folder:   dist/admin/

  SUPABASE EDGE FUNCTIONS — deploy via CLI (after any code change)
  ──────────────────────────────────────────────────────────────────
  supabase login   # one-time
  Then, from this directory:
    supabase functions deploy analytics   --project-ref <YOUR_REF> --no-verify-jwt
    supabase functions deploy auth        --project-ref <YOUR_REF> --no-verify-jwt
    supabase functions deploy contacts    --project-ref <YOUR_REF> --no-verify-jwt
    supabase functions deploy config      --project-ref <YOUR_REF> --no-verify-jwt
    supabase functions deploy email       --project-ref <YOUR_REF> --no-verify-jwt
    supabase functions deploy ping_shared --project-ref <YOUR_REF> --no-verify-jwt

  SUPABASE SQL — paste in SQL Editor, first time only
  ─────────────────────────────────────────────────────
  All SQL files are in dist/sql/ with your config values filled in.
  Run in order: 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12
  Then run the INSERT in 12_functions_auth.sql once to create your admin user.

  NETLIFY — SEO redirect layer (optional)
  ─────────────────────────────────────────
  Drag and drop the folder:   dist/netlify/
  (or connect Netlify to the repo with publish directory = Netlify/)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
