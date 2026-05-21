#!/usr/bin/env node
// Generate a 32-byte base64 secret suitable for SESSION_SECRET.
//
// Usage:
//   node scripts/random-secret.mjs
//   npx wrangler pages secret put SESSION_SECRET   # paste the value

import { randomBytes } from 'node:crypto';

console.log(`SESSION_SECRET=${randomBytes(32).toString('base64')}`);
