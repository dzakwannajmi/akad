// Checks docs/v2/disclosure-map.json against what each v1 circuit does in
// the simulator: the ledger fields its public transcript reads and writes,
// and whether the caller's identity reaches the transcript or its effects.
// scripts/check-privacy-budget.mjs checks the public-input counts and source
// ranges against the compiler output.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTRACT_INFO, LEDGER_FIELDS, hex } from './harness.js';
import { callerKeyHex, runJourney } from './journey.js';
import { ledgerAccess } from './transcript.js';

type CircuitEntry = {
  ledgerReads: string[];
  ledgerWrites: string[];
  traderAddressPublished: boolean;
  amountsVisible: string;
  private: string[];
};

const map = JSON.parse(readFileSync(new URL('../../docs/v2/disclosure-map.json', import.meta.url), 'utf8')) as {
  circuits: Record<string, CircuitEntry>;
};

const journey = runJourney();

function entry(circuit: string): CircuitEntry {
  const found = map.circuits[circuit];
  if (found === undefined) throw new Error(`${circuit} is missing from the disclosure map`);
  return found;
}

/** Everything a call publishes through its transcript, as searchable text. */
function published(step: (typeof journey)[number]): string {
  return JSON.stringify({ transcript: step.result.transcript, effects: step.result.effects }, (_key, value: unknown) => {
    if (value instanceof Uint8Array) return hex(value);
    if (value instanceof Map) return [...value.entries()];
    if (typeof value === 'bigint') return value.toString();
    return value;
  });
}

describe('disclosure map for akad v1', () => {
  it('lists exactly the exported circuits of the compiled contract', () => {
    expect(Object.keys(map.circuits).sort()).toEqual(CONTRACT_INFO.circuits.map((c) => c.name).sort());
  });

  it('the journey calls every exported circuit', () => {
    expect(new Set(journey.map((step) => step.circuit))).toEqual(new Set(Object.keys(map.circuits)));
  });

  for (const step of journey) {
    describe(`${step.circuit} (caller ${step.caller.slice(0, 4)})`, () => {
      const access = ledgerAccess(step.result.transcript, LEDGER_FIELDS);

      it('ledgerReads and ledgerWrites match the public transcript', () => {
        expect([...access.reads].sort()).toEqual([...entry(step.circuit).ledgerReads].sort());
        expect([...access.writes].sort()).toEqual([...entry(step.circuit).ledgerWrites].sort());
      });

      it('every field whose value changed is listed as written', () => {
        for (const field of step.changed) expect(entry(step.circuit).ledgerWrites).toContain(field);
      });

      it('traderAddressPublished matches the transcript, its effects and the unshielded legs', () => {
        const callerKeyPublished = published(step).includes(callerKeyHex(step.caller));
        const unshieldedLeg = step.result.nightIn > 0n || step.result.nightPaidTo.size > 0;
        expect(callerKeyPublished || unshieldedLeg).toBe(entry(step.circuit).traderAddressPublished);
      });

      if (entry(step.circuit).private.some((claim) => claim.startsWith("caller's Zswap coin public key"))) {
        it("keeps the caller's coin public key out of the transcript and its effects", () => {
          expect(published(step)).not.toContain(callerKeyHex(step.caller));
        });
      }

      if (entry(step.circuit).amountsVisible === 'inferable from reserve delta') {
        it('moves no unshielded tokens, so the reserve delta is the only amount signal in the ledger', () => {
          expect([step.result.nightIn, step.result.nightOut]).toEqual([0n, 0n]);
          expect(entry(step.circuit).ledgerWrites).toEqual(expect.arrayContaining(['reserveAKD', 'reserveNight']));
        });
      }
    });
  }
});
