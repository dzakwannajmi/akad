import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { submitCallTxAsync, type CallTxOptions } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { resolveNetwork } from '../config.js';
import { decodeAkadV1State, stateForReport } from '../contract/akad-v1.js';
import {
  AKAD_PRIVATE_STATE_ID,
  compileAkadV1,
  initialPrivateState,
  type AkadV1Contract,
} from '../contract/akad-v1-compiled.js';
import { convertArgs, type ArgType, type CircuitArg } from '../contract/args.js';
import { akadV1Providers, type Submission } from '../contract/providers.js';
import type { Command } from '../context.js';
import { AkadError, isAkadError } from '../errors.js';
import { feeCapFor } from '../fees.js';
import { isSet, optionalString, requireString } from '../flags.js';
import type { IndexerClient } from '../indexer/client.js';
import { DEFAULT_WAIT, describeOutcome, waitForTransaction, type TxOutcome } from '../indexer/wait.js';
import { parseNetwork, sdkNetworkId } from '../networks.js';
import { currentCommit, stepPassed, writeRun, type RunStep } from '../report/run-report.js';
import { parseWalletName } from '../secrets.js';
import { loadWallet } from '../wallet.js';
import { cachePath } from '../wallet-cache.js';
import { startWallet, waitForSync } from '../wallet-runtime.js';
import { checkGate } from '../wallet-tx.js';
import { contractAddress } from './state.js';
import { SYNC_TIMEOUT_S, timeoutMs } from './wallet-status.js';

type CircuitInfo = { name: string; arguments: { name: string; type: ArgType }[] };

/**
 * Circuits that spend a shielded coin through the spentCoin() witness. They
 * need a coin selected from the wallet's shielded state, which the
 * v1-evidence scenario adds; `call` refuses them until then.
 */
const SPENDS_COIN = new Set(['unwrap', 'unwrapNight', 'shieldedSwapAkdToNight', 'shieldedSwapNightToAkd']);

/**
 * Reads the circuit list and argument types from the compiler output.
 *
 * @param managedDir - contracts/managed/akad.
 * @returns Circuits with argument names and types.
 */
export function readCircuits(managedDir: string): CircuitInfo[] {
  const info = JSON.parse(readFileSync(join(managedDir, 'compiler', 'contract-info.json'), 'utf8')) as {
    circuits: CircuitInfo[];
  };
  return info.circuits;
}

function displayArg(value: CircuitArg): string {
  if (typeof value === 'bigint' || typeof value === 'boolean') return value.toString();
  if (value instanceof Uint8Array) return Buffer.from(value).toString('hex');
  return JSON.stringify(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, displayArg(v)])));
}

async function readState(indexer: IndexerClient, address: string): Promise<Record<string, string>> {
  const snapshot = await indexer.contractState(address);
  if (snapshot === null) throw new AkadError('CONTRACT_NOT_FOUND', `The indexer has no contract at ${address}.`);
  return stateForReport(decodeAkadV1State(snapshot));
}

/**
 * `akad call <circuit> --wallet a1 --network preprod --args '[...]' --yes`:
 * prove, balance and submit one v1 circuit call, then record the outcome the
 * indexer reports in a run report.
 */
export const call: Command = {
  path: ['call'],
  summary: 'Call one v1 circuit and write an indexer-checked run report',
  submits: true,
  positionals: ['circuit'],
  flags: {
    wallet: { type: 'string' },
    args: { type: 'string' },
    contract: { type: 'string' },
    timeout: { type: 'string' },
  },
  async run(ctx, flags, positionals) {
    const network = parseNetwork(optionalString(flags, 'network'));
    const walletName = parseWalletName(requireString(flags, 'wallet'));
    const circuits = readCircuits(ctx.paths.managedContractDir);
    const circuit = circuits.find((c) => c.name === positionals[0]);
    if (circuit === undefined) {
      throw new AkadError('INVALID_ARGS', `Unknown circuit. v1 circuits: ${circuits.map((c) => c.name).join(', ')}.`);
    }
    if (SPENDS_COIN.has(circuit.name)) {
      throw new AkadError(
        'NOT_IMPLEMENTED',
        `${circuit.name} spends a shielded coin, which needs coin selection from the wallet; the v1-evidence scenario provides it.`
      );
    }
    const args = convertArgs(optionalString(flags, 'args') ?? '[]', circuit.arguments);
    const address = contractAddress(optionalString(flags, 'contract'), ctx.config.networks[network].akadV1Contract);
    const keys = loadWallet(ctx, walletName, network);
    const plan: [string, string][] = [
      ['circuit', circuit.name],
      ['args', args.length === 0 ? 'none' : args.map(displayArg).join(', ')],
      ['wallet', `${walletName} ${keys.addresses.unshielded}`],
      ['contract', address],
      ['network', network],
      ['becomes public', 'entry point, ledger writes, unshielded inputs and outputs'],
    ];
    if (isSet(flags, 'dry-run')) {
      ctx.out.fields([...plan, ['fee estimate', 'computed after proving; not in a dry run']]);
      return;
    }

    const cap = feeCapFor(ctx.env, isSet(flags, 'yes'));
    setNetworkId(sdkNetworkId(network));
    const resolved = resolveNetwork(ctx.config, network);
    const indexer = ctx.indexerFor(resolved);
    currentCommit(ctx.paths.repoRoot);
    const startedAt = ctx.now();
    const stateBefore = await readState(indexer, address);

    const wallet = await startWallet(keys, resolved, cachePath(ctx.paths.repoRoot, network, walletName));
    try {
      if (wallet.restored) ctx.out.error('sync: resuming from the local cache');
      await waitForSync(wallet.facade, SYNC_TIMEOUT_S * 1000, (line) => ctx.out.error(line));
      await wallet.save();

      let feeEstimate: bigint | null = null;
      const submission: Submission = { identifier: null };
      const providers = akadV1Providers(wallet, resolved, ctx.paths.managedContractDir, async (finalized) => {
        feeEstimate = await wallet.facade.calculateTransactionFee(finalized);
        checkGate(ctx, { cap, yes: isSet(flags, 'yes'), plan }, feeEstimate);
      }, submission);

      providers.privateStateProvider.setContractAddress(address);
      await providers.privateStateProvider.set(AKAD_PRIVATE_STATE_ID, {
        ...initialPrivateState(),
        pendingNonce: circuit.name === 'wrap' ? Uint8Array.from(randomBytes(32)) : null,
      });

      // The circuit name arrives at runtime, validated against
      // contract-info.json above, so TypeScript cannot tie circuitId to its
      // argument types; the options object is asserted to the union type here.
      const options = {
        compiledContract: compileAkadV1(ctx.paths.managedContractDir),
        contractAddress: address,
        circuitId: circuit.name,
        args,
        privateStateId: AKAD_PRIVATE_STATE_ID,
      } as unknown as CallTxOptions<AkadV1Contract, Parameters<typeof providers.zkConfigProvider.getVerifierKey>[0]>;

      let error: string | null = null;
      try {
        await submitCallTxAsync(providers, options);
      } catch (err) {
        const gateRefusal = isAkadError(err) && (err.code === 'FEE_CAP_EXCEEDED' || err.code === 'CONFIRMATION_REQUIRED');
        if (gateRefusal && submission.identifier === null) throw err;
        error = err instanceof Error ? err.message : String(err);
      }

      let outcome: TxOutcome | null = null;
      if (submission.identifier !== null) {
        ctx.out.error(`submitted; waiting for the indexer (identifier ${submission.identifier})`);
        outcome = await waitForTransaction(indexer, { identifier: submission.identifier }, {
          ...DEFAULT_WAIT,
          timeoutMs: timeoutMs(optionalString(flags, 'timeout'), DEFAULT_WAIT.timeoutMs / 1000),
          sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
          now: () => Date.now(),
        });
      }
      const described = outcome === null ? null : describeOutcome(outcome);
      const indexerStatus = described?.indexerStatus ?? 'NOT_SUBMITTED';
      const step: RunStep = {
        index: 0,
        kind: 'call',
        circuit: circuit.name,
        wallet: walletName,
        walletAddress: keys.addresses.unshielded,
        expected: 'SUCCESS',
        feeEstimate: { dust: String(feeEstimate ?? 0n), method: 'approximate' },
        tx: outcome?.kind === 'indexed' ? outcome.tx.hash : null,
        indexerStatus,
        passed: stepPassed('SUCCESS', indexerStatus),
        stateBefore,
        stateAfter: await readState(indexer, address),
        feeActual: null,
        error,
      };
      const scenario = `call-${circuit.name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
      const path = writeRun(ctx, { scenario, network, contract: address, startedAt, steps: [step] });
      ctx.out.fields([
        ['tx', step.tx ?? 'none'],
        ['indexer status', described?.message ?? `Not submitted: ${error ?? 'unknown error'}`],
        ['report', path],
      ]);
      if (!step.passed) throw new AkadError('STEP_FAILED', `${circuit.name} did not reach SUCCESS on the indexer.`);
    } finally {
      await wallet.stop();
    }
  },
};

