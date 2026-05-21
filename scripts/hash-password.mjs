#!/usr/bin/env node
// Generate ADMIN_PASSWORD_HASH / ADMIN_PASSWORD_SALT / ADMIN_PASSWORD_ITERATIONS
// values for the Cloudflare Pages Functions admin login.
//
// Usage:
//   node scripts/hash-password.mjs
//
// Then set each printed value via:
//   npx wrangler pages secret put ADMIN_PASSWORD_HASH
//   npx wrangler pages secret put ADMIN_PASSWORD_SALT
//   npx wrangler pages secret put ADMIN_PASSWORD_ITERATIONS
//
// Algorithm: PBKDF2-HMAC-SHA256, 100 000 iterations, 16-byte salt, 32-byte key.
// This matches what functions/lib/auth.js computes via Web Crypto on every login.
//
// 100 000 iterations is chosen to fit inside Cloudflare Workers' / Pages Functions'
// per-request CPU budget. Higher values (e.g. 600 000) routinely exceed the
// budget and cause every login to fail with an opaque 500 — see
// functions/lib/auth.js MAX_PBKDF2_ITERATIONS.

import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';

const ITERATIONS = 100000;
const SALT_BYTES = 16;
const KEY_BYTES  = 32;

function prompt(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    if (hidden) {
      const stdin = process.stdin;
      const onData = (char) => {
        char = char.toString();
        if (char === '\n' || char === '\r' || char === '') {
          stdin.removeListener('data', onData);
        } else {
          process.stdout.write('\b \b'.repeat((rl.line || '').length + 1));
          process.stdout.write('*'.repeat((rl.line || '').length));
        }
      };
      stdin.on('data', onData);
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const password = (await prompt('Enter admin password: ', { hidden: true })).trim();
if (!password) {
  console.error('Password cannot be empty.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const salt = randomBytes(SALT_BYTES);
const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_BYTES, 'sha256');

console.log('\nSet these as Cloudflare Pages secrets:');
console.log('--------------------------------------');
console.log(`ADMIN_PASSWORD_HASH=${hash.toString('base64')}`);
console.log(`ADMIN_PASSWORD_SALT=${salt.toString('base64')}`);
console.log(`ADMIN_PASSWORD_ITERATIONS=${ITERATIONS}`);
console.log('');
console.log('Then run (paste each value when prompted):');
console.log('  npx wrangler pages secret put ADMIN_PASSWORD_HASH');
console.log('  npx wrangler pages secret put ADMIN_PASSWORD_SALT');
console.log('  npx wrangler pages secret put ADMIN_PASSWORD_ITERATIONS');
console.log('');
console.log('Also generate SESSION_SECRET if you have not yet:');
console.log('  node scripts/random-secret.mjs');
