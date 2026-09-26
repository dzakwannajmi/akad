// Reads which ledger fields a circuit call touched from its public
// transcript, the ledger program the proof commits to and the chain replays.
// It recognises the op sequences the 0.31.1 compiler emits for top-level
// fields (see the ledger accessors in managed/akad/contract/index.js):
//
//   read       dup(0) idx(field) ...                       (cells and maps)
//   cell write push(cell field) pushS(value) ins           (not after idxP)
//   map write  idxP(field) push(cell key) pushS(value) ins ins
//
// dup(n > 0) reaches the call context or the effects, not the ledger, so
// kernel.self() and receiveUnshielded() bookkeeping are not counted.
// disclosure-map.test.ts checks every result against the ledger diff of the
// same call, so a sequence this misreads fails a test instead of passing.
import type { AlignedValue, Op } from '@midnight-ntwrk/compact-runtime';

type TranscriptOp = Op<AlignedValue>;
type IdxOp = Extract<TranscriptOp, { idx: unknown }>;
type PushOp = Extract<TranscriptOp, { push: unknown }>;
type Key = IdxOp['idx']['path'][number];

export type LedgerAccess = {
  reads: Set<string>;
  writes: Set<string>;
  /** Keys written into each map field, hex. */
  mapKeysWritten: Map<string, string[]>;
};

function isIdx(op: TranscriptOp | undefined): op is IdxOp {
  return typeof op === 'object' && 'idx' in op;
}

function isPush(op: TranscriptOp | undefined, storage: boolean): op is PushOp {
  return typeof op === 'object' && 'push' in op && op.push.storage === storage;
}

function isIns(op: TranscriptOp | undefined): boolean {
  return typeof op === 'object' && 'ins' in op;
}

function isDup0(op: TranscriptOp | undefined): boolean {
  return typeof op === 'object' && 'dup' in op && op.dup.n === 0;
}

function smallIndex(value: AlignedValue): number | null {
  const [bytes, ...rest] = value.value;
  if (bytes === undefined || rest.length > 0 || bytes.length > 1) return null;
  return bytes[0] ?? 0;
}

function keyIndex(key: Key | undefined): number | null {
  return key !== undefined && key.tag === 'value' ? smallIndex(key.value) : null;
}

function cellValue(op: PushOp): AlignedValue | null {
  return op.push.value.tag === 'cell' ? op.push.value.content : null;
}

/**
 * Classifies the ledger reads and writes in one call's public transcript.
 *
 * @param ops - `proofData.publicTranscript` of the call.
 * @param fields - Ledger field names by index (harness LEDGER_FIELDS).
 * @returns Field names read and written, and the keys written into maps.
 * @throws Error when an access names an index that is not a ledger field.
 */
export function ledgerAccess(ops: readonly TranscriptOp[], fields: readonly string[]): LedgerAccess {
  const access: LedgerAccess = { reads: new Set(), writes: new Set(), mapKeysWritten: new Map() };
  const name = (index: number | null): string => {
    const field = index === null ? undefined : fields[index];
    if (field === undefined) throw new Error(`transcript touches unknown ledger index ${String(index)}`);
    return field;
  };

  ops.forEach((op, i) => {
    const next = ops[i + 1];
    if (isDup0(op) && isIdx(next) && !next.idx.pushPath) {
      access.reads.add(name(keyIndex(next.idx.path[0])));
    }
    if (isIdx(op) && op.idx.pushPath && isPush(next, false) && isPush(ops[i + 2], true) && isIns(ops[i + 3])) {
      const field = name(keyIndex(op.idx.path[0]));
      const key = cellValue(next);
      access.writes.add(field);
      if (key !== null) {
        const keys = access.mapKeysWritten.get(field) ?? [];
        keys.push(Buffer.from(key.value[0] ?? []).toString('hex'));
        access.mapKeysWritten.set(field, keys);
      }
    }
    const previous = ops[i - 1];
    const previousIsPath = isIdx(previous) && previous.idx.pushPath;
    if (isPush(op, false) && !previousIsPath && isPush(next, true) && isIns(ops[i + 2])) {
      const cell = cellValue(op);
      if (cell !== null) access.writes.add(name(smallIndex(cell)));
    }
  });
  return access;
}
