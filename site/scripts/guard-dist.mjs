// Post-build guard: fails the build if the OpenCage key that was once hard-coded in main.py, or the
// personal number once in myphone.py, appears anywhere in dist. Only SHA-256 hashes are stored here,
// so this file does not republish either value.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const BANNED = new Set([
  '5046a7589cbc2e11f108cf62d2d0b67ef3d0f434b23981cef7d8387931aac223', // old API key
  'c111ac0a6797532af18272d7234f5d6005faf99e03ac9f8b9a9240124ce7a804', // old number, international digits
  'f1a13250f50241c0e43063a50aaaebf70469047437c4e8745169ce6a8d9436bf', // old number, national format
  '485fc047fb0b2be44f2d3c0d78a0de2e715bf45f087408326330810d5e481c9d', // old number, subscriber digits
]);
const sha = (s) => createHash('sha256').update(s).digest('hex');
const dist = path.resolve(import.meta.dirname, '../dist');
const files = fs.readdirSync(dist, { recursive: true }).map((f) => path.join(dist, f)).filter((f) => fs.statSync(f).isFile());
let hits = 0;
for (const f of files) {
  const text = fs.readFileSync(f, 'latin1');
  const tokens = new Set(text.match(/[0-9a-f]{32}/gi) ?? []);
  for (const run of text.match(/\d{10,}/g) ?? [])
    for (const len of [10, 11, 13]) for (let i = 0; i + len <= run.length; i++) tokens.add(run.slice(i, i + len));
  for (const t of tokens) if (BANNED.has(sha(t.toLowerCase()))) { console.error(`guard: banned value found in ${path.relative(dist, f)}`); hits++; }
}
if (hits) process.exit(1);
console.log(`guard ok: ${files.length} files in dist, no API key or personal number`);
