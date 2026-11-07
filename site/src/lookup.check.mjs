// Known-answer check, run by `npm run build`: the browser code must reproduce what the Python
// phonenumbers library recorded in results/*.json (see scripts/export_metadata.py).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { inspect, summarize } from './lookup.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../results/${p}`, import.meta.url)));
const { codes, summary } = read('calling_codes.json');
const { rows } = read('example_lookups.json');

// 1. Every count the page shows, recomputed from the raw tables, equals the Python export.
const mine = summarize(codes, rows);
for (const k of Object.keys(mine)) assert.equal(mine[k], summary[k], `summary.${k}`);
assert.equal(Object.values(codes).filter((r) => r[0] !== '001').reduce((s, r) => s + r.length, 0), summary.geographic_regions);

// 2. The calling codes really are prefix-free, so longest-prefix matching is unambiguous.
const keys = Object.keys(codes);
for (const a of keys) for (const b of keys) if (a !== b) assert.ok(!b.startsWith(a), `${a} is a prefix of ${b}`);

// 3. For each of the library's example numbers, the browser parser finds the same country code
//    phonenumbers.parse found, and the recorded region is among the regions it offers.
for (const r of rows) {
  const got = inspect(r.e164, codes);
  assert.ok(got.ok, `${r.e164}: ${got.error}`);
  assert.equal(Number(got.cc), r.country_code, r.e164);
  assert.ok(got.regions.includes(r.region), `${r.e164} -> ${got.regions} lacks ${r.region}`);
  assert.equal(got.cc + got.nsn, r.e164.slice(1));
}

// 4. Shape validation rejects what E.164 forbids.
assert.equal(inspect('8801812345678', codes).ok, false);
assert.equal(inspect('+1234567890123456', codes).ok, false);
assert.equal(inspect('+1 (201) 555-0123', codes).cc, '1');
console.log(`lookup ok: ${rows.length} example numbers reproduced, ${keys.length} calling codes prefix-free`);
