#!/usr/bin/env node
// Privacy budget: the disclosure map is the only source for Akad's privacy
// claims, so CI holds it to the compiler's own output. For each map:
//
// 1. It lists exactly the circuits in compiler/contract-info.json.
// 2. Each circuit's publicInputs equals `num_inputs` in its zkir file, the
//    compiler's count of the proof's public inputs (see
//    scripts/zk-public-inputs.mjs for what that number does and does not say).
// 3. Each `source` range starts at that circuit's `export circuit` line and
//    ends at the closing brace, with no other circuit inside it.
//
// contracts/test/disclosure-map.test.ts checks the ledger reads, writes and
// caller exposure in the same map against simulator runs.
//
//   node scripts/check-privacy-budget.mjs

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

const MAPS = [{ map: 'docs/v2/disclosure-map.json', managed: 'contracts/managed/akad' }];

const failures = [];
const fail = (message) => failures.push(message);

function readJson(path) {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'));
}

function checkSource(name, source) {
  const match = /^(.+\.compact)#L(\d+)-L(\d+)$/.exec(source);
  if (match === null) return fail(`${name}: source "${source}" is not <file>#L<a>-L<b>`);
  const [, file, first, last] = match;
  if (!existsSync(resolve(ROOT, file))) return fail(`${name}: ${file} does not exist`);
  const lines = readFileSync(resolve(ROOT, file), 'utf8').split('\n');
  const range = lines.slice(Number(first) - 1, Number(last));
  if (range.length !== Number(last) - Number(first) + 1) return fail(`${name}: ${source} runs past the end of ${file}`);
  if (!range[0].startsWith(`export circuit ${name}(`)) fail(`${name}: line ${first} of ${file} is not "export circuit ${name}("`);
  if (range.at(-1) !== '}') fail(`${name}: line ${last} of ${file} is not the closing brace`);
  if (range.slice(1).some((line) => line.startsWith('export circuit '))) fail(`${name}: ${source} contains another circuit`);
}

const rows = [];
for (const { map: mapPath, managed } of MAPS) {
  const map = readJson(mapPath);
  const compiled = readJson(join(managed, 'compiler', 'contract-info.json')).circuits.map((c) => c.name);
  const mapped = Object.keys(map.circuits);
  for (const name of compiled.filter((c) => !mapped.includes(c))) fail(`${mapPath}: circuit ${name} is compiled but not mapped`);
  for (const name of mapped.filter((c) => !compiled.includes(c))) fail(`${mapPath}: circuit ${name} is mapped but not compiled`);

  for (const name of mapped.filter((c) => compiled.includes(c))) {
    const entry = map.circuits[name];
    const zkir = resolve(ROOT, managed, 'zkir', `${name}.zkir`);
    if (!existsSync(zkir)) {
      fail(`${name}: no zkir file at ${join(managed, 'zkir', `${name}.zkir`)}`);
      continue;
    }
    const measured = JSON.parse(readFileSync(zkir, 'utf8')).num_inputs;
    rows.push({ contract: map.contract, name, mapped: entry.publicInputs, measured });
    if (measured !== entry.publicInputs) {
      fail(`${name}: the map says ${entry.publicInputs} public inputs, the compiler counts ${measured}`);
    }
    checkSource(name, entry.source);
  }
}

const width = Math.max('circuit'.length, ...rows.map((row) => row.name.length));
console.log(`${'circuit'.padEnd(width)}  map  compiler`);
for (const row of rows) console.log(`${row.name.padEnd(width)}  ${String(row.mapped).padStart(3)}  ${String(row.measured).padStart(8)}`);

if (failures.length > 0) {
  console.error(`\nPrivacy budget fails:\n${failures.map((line) => `  ${line}`).join('\n')}`);
  process.exit(1);
}
console.log(`\nPrivacy budget passes: ${rows.length} circuit(s) match the compiler.`);
