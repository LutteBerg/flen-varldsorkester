#!/usr/bin/env node
// Post-build sanity check: scan the freshly-built dist/assets/index-*.js
// bundle(s) for code that should NEVER appear in production.
//
// Why this exists: the v0 site (commit 3fef853) used a `LocalStorageAdapter`
// that wrote all admin edits to the browser's localStorage. PR #1 deleted
// that adapter and replaced it with the API-driven one. After PR #2 was
// merged, a Cloudflare Pages auto-deploy mysteriously re-promoted the
// v0 bundle as the active production deployment — admin edits started
// landing in localStorage again and nowhere else. The new bundle was
// bit-identical to the 6-day-old v0 build.
//
// This script runs as `postbuild` (via npm) so any future regression that
// re-introduces localStorage-based persistence fails the build LOUDLY
// instead of silently shipping. Run manually with `node scripts/check-bundle.mjs`.
//
// Pure Node, no dependencies.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ASSETS_DIR = join(process.cwd(), 'dist', 'assets');

// Patterns that MUST NOT appear in any built JS bundle.
// Each entry: [regex, human-readable reason]
const FORBIDDEN = [
  [/localStorage\.setItem/, 'localStorage.setItem — the v0 LocalStorageAdapter wrote admin edits here'],
  [/localStorage\.getItem/, 'localStorage.getItem — the v0 LocalStorageAdapter read admin edits here'],
  [/LocalStorageAdapter/,   'LocalStorageAdapter — deleted in PR #1, must not return'],
  [/STORAGE_KEY/,           'STORAGE_KEY — the v0 localStorage key constant'],
  [/lutte_berg_cms_data/,   'lutte_berg_cms_data — the v0 localStorage key value'],
];

function findBundles() {
  let entries;
  try {
    entries = readdirSync(ASSETS_DIR);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`check-bundle: ${ASSETS_DIR} not found. Run \`npm run build\` first.`);
      process.exit(2);
    }
    throw err;
  }
  return entries
    .filter((name) => /^index-.*\.js$/.test(name))
    .map((name) => join(ASSETS_DIR, name));
}

function main() {
  const bundles = findBundles();
  if (bundles.length === 0) {
    console.error(`check-bundle: no index-*.js bundle found under ${ASSETS_DIR}.`);
    process.exit(2);
  }

  const findings = [];
  for (const file of bundles) {
    const src = readFileSync(file, 'utf8');
    for (const [pattern, reason] of FORBIDDEN) {
      if (pattern.test(src)) {
        findings.push({ file, pattern: pattern.toString(), reason });
      }
    }
  }

  if (findings.length > 0) {
    console.error('check-bundle: ❌ forbidden patterns found in production bundle:');
    for (const f of findings) {
      console.error(`  - ${f.file}`);
      console.error(`      pattern: ${f.pattern}`);
      console.error(`      reason:  ${f.reason}`);
    }
    console.error('');
    console.error('This usually means the build has regressed to a pre-PR#1 state.');
    console.error('Verify src/lib/cms/adapters/ — there should only be apiAdapter.js + seedAdapter.js.');
    process.exit(1);
  }

  const sizes = bundles.map((f) => `${f.replace(process.cwd(), '.')} (${(statSync(f).size / 1024).toFixed(1)} KiB)`).join(', ');
  console.log(`check-bundle: ✅ ${bundles.length} bundle(s) clean — ${sizes}`);
}

main();
