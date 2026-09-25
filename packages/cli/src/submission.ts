import type * as ledger from '@midnight-ntwrk/ledger-v8';
import { SerializedTransaction } from '@midnight-ntwrk/wallet-sdk';
import {
  SubmissionEvent,
  type SubmissionService,
  type SubmitTransactionMethod,
} from '@midnight-ntwrk/wallet-sdk/capabilities/submission';
import { ApiPromise, WsProvider } from '@polkadot/api';

type Stage = 'Submitted' | 'InBlock' | 'Finalized';
const RANK: Record<Stage, number> = { Submitted: 0, InBlock: 1, Finalized: 2 };

/**
 * Submission service that keeps one node connection open for the whole
 * process. The wallet SDK's default service disconnects after loading node
 * metadata and reconnects per submission; on 26 Sep 2026 that reconnect
 * failed every Preview submission from this CLI with "disconnected ... 1000
 * Normal Closure", while the same transaction sent over one open connection
 * reached InBlock and the indexer reported SUCCESS
 * (ca2389161e9ead8e48745f3090de1d4226200b33ef29991b49ea4b9f99a53ad0). Status
 * handling mirrors the SDK's PolkadotNodeClient.
 *
 * @param relayURL - Node WebSocket endpoint.
 * @returns A SubmissionService for WalletFacade.init.
 */
export function persistentSubmissionService(relayURL: URL): SubmissionService<ledger.FinalizedTransaction> {
  let connecting: Promise<ApiPromise> | null = null;
  const api = () =>
    (connecting ??= ApiPromise.create({ provider: new WsProvider(relayURL.toString()), noInitWarn: true }));

  const submit = async (tx: ledger.FinalizedTransaction, waitForStatus: Stage = 'InBlock'): Promise<SubmissionEvent> => {
    const client = await api();
    const serialized = SerializedTransaction.from(tx);
    const hex = `0x${Buffer.from(serialized).toString('hex')}`;
    const extrinsic = client.tx['midnight']?.['sendMnTransaction'];
    if (extrinsic === undefined) throw new Error('The node exposes no midnight.sendMnTransaction extrinsic.');

    return new Promise<SubmissionEvent>((resolve, reject) => {
      let settled = false;
      let unsubscribe: (() => void) | undefined;
      const finish = (settle: () => void) => {
        if (settled) return;
        settled = true;
        settle();
        unsubscribe?.();
      };
      extrinsic(hex)
        .send((result) => {
          const { status } = result;
          const txHash = result.txHash.toString();
          // SubmittableResult carries blockNumber at runtime, but the
          // ISubmittableResult interface does not declare it; the SDK decodes it
          // the same way.
          const { blockNumber } = result as { blockNumber?: { toString(radix: number): string } };
          const blockHeight = BigInt(blockNumber?.toString(10) ?? '0');
          let event: SubmissionEvent | undefined;
          if (status.isReady || status.isFuture || status.isBroadcast || status.isRetracted) {
            event = SubmissionEvent.Submitted({ tx: serialized, txHash });
          } else if (status.isInBlock) {
            event = SubmissionEvent.InBlock({ tx: serialized, txHash, blockHash: status.asInBlock.toString(), blockHeight });
          } else if (status.isFinalized) {
            event = SubmissionEvent.Finalized({ tx: serialized, txHash, blockHash: status.asFinalized.toString(), blockHeight });
          } else {
            finish(() => reject(new Error(`The node reported the transaction as ${status.type}.`)));
            return;
          }
          if (RANK[event._tag] >= RANK[waitForStatus]) finish(() => resolve(event));
        })
        .then((unsub) => {
          unsubscribe = unsub;
          if (settled) unsub();
        })
        .catch((err: unknown) => finish(() => reject(err)));
    });
  };

  return {
    // The SDK types submitTransaction as an overload set keyed on the
    // requested stage; this single implementation serves every overload.
    submitTransaction: submit as SubmitTransactionMethod<ledger.FinalizedTransaction>,
    close: async () => {
      if (connecting !== null) await (await connecting).disconnect();
    },
  };
}
