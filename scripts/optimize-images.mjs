#!/usr/bin/env node
/**
 * scripts/optimize-images.mjs
 *
 * One-shot image optimizer for public/assets/**.
 *
 * Resizes each .jpg/.jpeg/.png to a max dimension of MAX_DIM (default 1600),
 * re-encodes JPEGs at QUALITY (default 80), and replaces the file in place.
 * Originals are backed up to ./image-originals/ (outside public/ so Vite
 * does NOT ship them in dist).
 *
 * Requires ImageMagick `convert` on PATH.
 *
 * Usage:
 *   node scripts/optimize-images.mjs
 *   node scripts/optimize-images.mjs --dry-run
 *   node scripts/optimize-images.mjs --max=1280 --quality=85
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const execFileP = promisify(execFile);

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'public', 'assets');
const BACKUP_DIR = path.join(ROOT, 'image-originals');

const args = parseArgs(process.argv.slice(2));
const MAX_DIM = args.max ? Number(args.max) : 1600;
const QUALITY = args.quality ? Number(args.quality) : 80;
const DRY_RUN = !!args['dry-run'];

if (!Number.isFinite(MAX_DIM) || MAX_DIM < 200 || MAX_DIM > 4000) {
  console.error(`Invalid --max=${MAX_DIM}. Use 200..4000.`);
  process.exit(2);
}
if (!Number.isFinite(QUALITY) || QUALITY < 40 || QUALITY > 95) {
  console.error(`Invalid --quality=${QUALITY}. Use 40..95.`);
  process.exit(2);
}

async function main() {
  try {
    await execFileP('convert', ['-version']);
  } catch (e) {
    console.error('ImageMagick `convert` not found on PATH.');
    console.error('Install: https://imagemagick.org/script/download.php');
    process.exit(1);
  }

  let files = [];
  try { files = await walk(SRC_DIR); }
  catch (e) {
    if (e.code === 'ENOENT') { console.log(`No ${SRC_DIR} directory.`); return; }
    throw e;
  }

  let totalBefore = 0, totalAfter = 0, processed = 0, skipped = 0;

  for (const file of files) {
    if (!/\.(jpe?g|png)$/i.test(file)) continue;

    const rel = path.relative(SRC_DIR, file);
    const stat = await fs.stat(file);
    const before = stat.size;
    totalBefore += before;

    if (before < 250 * 1024) { skipped++; continue; }

    const { stdout: idStdout } = await execFileP('identify', ['-format', '%w %h', file]);
    const [w, h] = idStdout.trim().split(/\s+/).map(Number);
    const needsResize = w > MAX_DIM || h > MAX_DIM;

    const action = `${rel}  (${fmt(before)}, ${w}x${h})${needsResize ? ` -> resize ${MAX_DIM}px` : ''} -> q${QUALITY}`;

    if (DRY_RUN) { console.log('[dry] ' + action); processed++; continue; }

    const backupPath = path.join(BACKUP_DIR, rel);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    try { await fs.access(backupPath); }
    catch { await fs.copyFile(file, backupPath); }

    const cArgs = [file];
    if (needsResize) cArgs.push('-resize', `${MAX_DIM}x${MAX_DIM}>`);
    cArgs.push('-strip', '-quality', String(QUALITY),
               '-sampling-factor', '4:2:0', '-interlace', 'Plane', file);

    try { await execFileP('convert', cArgs); }
    catch (e) { console.error(`FAILED ${rel}: ${e.message}`); continue; }

    const after = (await fs.stat(file)).size;
    totalAfter += after;
    processed++;
    console.log(`${action}  ->  ${fmt(after)}  (${Math.round((1 - after / before) * 100)}% smaller)`);
  }

  if (!DRY_RUN) {
    let unchanged = 0;
    for (const file of files) {
      if (!/\.(jpe?g|png)$/i.test(file)) continue;
      const stat = await fs.stat(file);
      if (stat.size < 250 * 1024) unchanged += stat.size;
    }
    totalAfter += unchanged;
  }

  console.log('');
  console.log(`Processed: ${processed}    Skipped (<250 KB): ${skipped}`);
  if (!DRY_RUN) {
    console.log(`Before: ${fmt(totalBefore)}    After: ${fmt(totalAfter)}    Saved: ${fmt(totalBefore - totalAfter)}`);
    console.log(`Originals preserved under ${path.relative(ROOT, BACKUP_DIR)}/`);
  }
}

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(full)));
    else if (ent.isFile()) out.push(full);
  }
  return out;
}

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v === undefined ? true : v;
    }
  }
  return out;
}

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

main().catch((e) => { console.error(e); process.exit(1); });
