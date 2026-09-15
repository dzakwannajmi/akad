#!/usr/bin/env node
// Prints the number of PUBLIC inputs to each circuit's ZK proof, read
// straight from the compiler's own zkir output.
//
// Why this exists: "this circuit is private" is a claim, and claims are
// cheap. `num_inputs` is the compiler's own count of a circuit's public
// inputs. Every argument of an exported circuit becomes one; every value
// sourced from a `witness` does not. So this number is a direct,
// reproducible measurement of how much of a call's data the proof system
// treats as public, and anyone can regenerate it from a clean clone.
//
//   cd contracts && compact compile src/akad.compact ../build/akad
//   node scripts/zk-public-inputs.mjs
//
// Pass a directory to point it somewhere else:
//   node scripts/zk-public-inputs.mjs contracts/managed/akad/zkir
//
// What the number does NOT say, and this matters:
//
// 1. A public input is not the same as a value published in the clear. An
//    on-chain ContractCall carries no argument list at all; arguments reach
//    the verifier through a randomised communication commitment. This was
//    tested against live transactions, because an earlier version of this
//    project assumed otherwise and was wrong. See hackathon/SECURITY_AUDIT.md,
//    "H-02 refuted on chain".
//
// 2. A circuit with zero public inputs can still publish plenty through its
//    ledger writes, which are a separate channel. unwrap() is the clearest
//    case: 0 public inputs, while its balance write still reveals the amount
//    by delta.
//
// 3. It says nothing about unshielded token movement, which is where this
//    contract's real identity leak is. Both private swaps publish the
//    trader's unshielded address in the clear despite a low count here.
//
// Read this as "how much of the call surface the proof treats as public",
// not as a privacy score.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'build/akad/zkir';

if (!existsSync(dir)) {
  console.error(`No zkir directory at ${dir}`);
  console.error('Compile first: cd contracts && compact compile src/akad.compact ../build/akad');
  process.exit(1);
}

const rows = readdirSync(dir)
  .filter((f) => f.endsWith('.zkir'))
  .map((f) => {
    const parsed = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    return { circuit: f.replace(/\.zkir$/, ''), publicInputs: parsed.num_inputs };
  })
  .sort((a, b) => b.publicInputs - a.publicInputs || a.circuit.localeCompare(b.circuit));

const width = Math.max(...rows.map((r) => r.circuit.length), 'circuit'.length);
console.log(`${'circuit'.padEnd(width)}  public inputs`);
console.log('-'.repeat(width + 15));
for (const r of rows) {
  console.log(`${r.circuit.padEnd(width)}  ${String(r.publicInputs).padStart(13)}`);
}
