#!/usr/bin/env node
// Compare the bundle filenames in the live production HTML against the
// freshly-built local dist/index.html. Exits non-zero if they differ —
// loud signal that Cloudflare Pages is serving a stale build.
//
// Pure Node, no dependencies. Run AFTER `npm run build` and a deploy.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROD_URL = 'https://flen-varldsorkester.pages.dev/';
const LOCAL_HTML = join(process.cwd(), 'dist', 'index.html');

const JS_RE = /\/assets\/(index-[A-Za-z0-9_-]+\.js)/;
const CSS_RE = /\/assets\/(index-[A-Za-z0-9_-]+\.css)/;

function extract(re, html, label) {
  const m = html.match(re);
  if (!m) throw new Error(`verify-production-bundle: could not find ${label} bundle in ${label === 'local' ? LOCAL_HTML : PROD_URL}`);
  return m[1];
}

async function main() {
  let localHtml;
  try {
    localHtml = readFileSync(LOCAL_HTML, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`verify-production-bundle: ${LOCAL_HTML} not found. Run \`npm run build\` first.`);
      process.exit(1);
    }
    throw err;
  }

  let prodHtml;
  try {
    const res = await fetch(PROD_URL, { headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) {
      console.error(`verify-production-bundle: GET ${PROD_URL} returned HTTP ${res.status}`);
      process.exit(1);
    }
    prodHtml = await res.text();
  } catch (err) {
    console.error(`verify-production-bundle: network error fetching ${PROD_URL}: ${err.message}`);
    process.exit(1);
  }

  const localJs = extract(JS_RE, localHtml, 'local');
  const prodJs = extract(JS_RE, prodHtml, 'production');
  const localCss = localHtml.match(CSS_RE)?.[1];
  const prodCss = prodHtml.match(CSS_RE)?.[1];

  const mismatches = [];
  if (localJs !== prodJs) mismatches.push(['JS', localJs, prodJs]);
  if (localCss && prodCss && localCss !== prodCss) mismatches.push(['CSS', localCss, prodCss]);

  if (mismatches.length > 0) {
    console.error('verify-production-bundle: ❌ production serves a different bundle than your local dist/');
    for (const [kind, local, prod] of mismatches) {
      console.error(`  ${kind}:`);
      console.error(`    local dist/: ${local}`);
      console.error(`    production:  ${prod}`);
    }
    console.error('');
    console.error('Likely cause: Cloudflare Pages auto-build overwrote your manual deploy with a stale bundle.');
    console.error('Fix: re-run `npm run deploy:production` until verification passes.');
    process.exit(1);
  }

  // Filenames match — content-sanity check on the first ~50 KB of the JS bundle.
  try {
    const prodJsRes = await fetch(`${PROD_URL}assets/${prodJs}`, { headers: { 'cache-control': 'no-cache' } });
    if (prodJsRes.ok) {
      const prodJsBuf = Buffer.from(await prodJsRes.arrayBuffer());
      const localJsBuf = readFileSync(join(process.cwd(), 'dist', 'assets', localJs));
      const n = Math.min(50 * 1024, prodJsBuf.length, localJsBuf.length);
      if (!prodJsBuf.subarray(0, n).equals(localJsBuf.subarray(0, n))) {
        console.error(`verify-production-bundle: ❌ filenames match (${localJs}) but first ${n} bytes of content differ — possible CDN cache issue.`);
        process.exit(1);
      }
    }
  } catch (err) {
    console.error(`verify-production-bundle: warning — content sanity check skipped: ${err.message}`);
  }

  console.log(`verify-production-bundle: ✓ production bundle matches local dist (${localJs}${localCss ? `, ${localCss}` : ''})`);
}

main();
