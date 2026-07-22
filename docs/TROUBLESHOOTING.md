# Troubleshooting & Build Notes

Notes from building Akad on Compact/Midnight, kept here so the main README stays focused on the finished product. Useful if you're hitting similar walls.

## Compact language gotchas (compiler v0.31.1)

- No `/` division operator. Compute division off-chain (frontend), verify the result on-chain via multiplication instead.
- No top-level `const`. Inline literals, or use a `pure circuit` if you need a named constant.
- Max `Uint` width is 248 bits, not 256. Multiplying two `Uint<128>` values needs an explicit bounded cast (we cast down to `Uint<64>` after asserting a safe reserve ceiling).
- Arithmetic results (`x + dx`) get precise range types, not automatically narrowed back to the ledger's declared type — cast explicitly (`as Uint<128>`) before writing.
- All circuit parameters are private/witness by default. Writing anything derived from them to public ledger state requires an explicit `disclose()` wrapper.
- `Opaque<"string">` can't be a literal inside a circuit — pass it in as a parameter from TypeScript.
- No built-in caller-identity function. Use a `witness` (e.g. a stable per-wallet hash) instead — or the native `ownPublicKey()` if you need a real `ZswapCoinPublicKey`.
- `MerkleTree<depth, T>` (not `StateBoundedMerkleTree`) with `.insert(value)` is the real ledger type/method in this compiler version.
- `createCoin` / `createNullifier` (documented in some third-party guides) are not bound in this compiler. Use `persistentHash` / `persistentCommit` from the standard library directly.

## Network: Preview vs Preprod

Per guidance from a Midnight developer during this build, Preprod was still under active development and not reliable for contract deployment at the time. Akad targets **Preview** — indexer, node, and proof server endpoints are all `*.preview.midnight.network`.

## Shielded coins (`wrap`)

`wrap()` (public AKD → native shielded coin via `mintShieldedToken`) works end-to-end and is confirmed live — Lace automatically displays the resulting shielded balance with no custom UI needed.

`unwrap()` (shielded coin → public AKD) is not yet functional. Diagnosis: `receiveShielded` requires a real `QualifiedShieldedCoinInfo` that the wallet tracks internally (nonce evolves at mint time, and includes a Merkle index only the wallet knows) — a client-side reconstructed coin object doesn't match it. The wallet's transaction-balancing call (`balanceUnsealedTransaction`) hangs indefinitely trying to reconcile it, confirmed via direct instrumentation (the call is made, never resolves or rejects). The fix likely requires using the wallet's `makeTransfer`/`makeIntent` API to build the shielded transfer explicitly, rather than relying on `submitCallTxAsync`'s automatic balancing. See [Roadmap](README.md#roadmap).

## CI

GitHub Actions uses `npm install` rather than `npm ci` — the latter's strict lockfile matching was failing on the runner even when the lockfile was locally consistent, likely due to platform-specific optional dependency resolution differences.

Next.js 16 defaults to Turbopack, which conflicts with the custom webpack config this project needs (for WASM support and `isomorphic-ws` polyfilling) — both `dev` and `build` scripts pass `--webpack` explicitly.
