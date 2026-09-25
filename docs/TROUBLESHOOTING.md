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

Akad launched on **Preview** — early in this build, a Midnight developer's guidance was that Preprod was still under active development and not reliable for contract deployment.

That guidance is now stale. Midnight's own docs (checked September 2026) describe Preprod as the network that "tracks mainnet most closely" and recommend it as the final validation environment before production launch — a real shift from what it was when Akad started. A Preprod network reset happened March 21, 2026, with some intermittent downtime around that reset; we have not run a live deployment on it ourselves to confirm current day-to-day stability, so treat "more stable now" as documented, not as something this project has verified firsthand.

To act on this without committing to Preprod before it's actually been exercised, the app now has a **network toggle** (`components/brand/network-toggle.tsx`, backed by `lib/networks.ts` + `contexts/NetworkContext.tsx`) so Preview and Preprod can both be tested from the same deployed site, switched with a button instead of editing env vars and redeploying. Preview stays the default. The Akad contract is now deployed to both networks: Preview at `676fb20d4062e293d6521bd8e70af202345f75406ba4922d66453148a9d636ae` and Preprod at `2689c5c24d4f560ec4ce0be14641ad544bca382d524ebdcb2e69c152f179a51a` (see the root README's Live Demo & Deployed Contracts section for the current addresses, and `.env.example` for the env var names).

## Why we don't run a local Docker proof server

The [official installation guide](https://docs.midnight.network/getting-started/installation) documents running a proof server locally via Docker:

```bash
docker run -p 6300:6300 midnightntwrk/proof-server:latest midnight-proof-server -v
```

This is required only when proving happens on the developer's own machine — e.g. a local/standalone network, CLI-based deploy tooling (we hit this with the third-party `scaffold-midnight` tool, since abandoned), or manual circuit testing outside a wallet flow. To use it with Lace at all, you also have to manually switch Lace to **Settings → Midnight → Local (<http://localhost:6300>)** — it isn't the default.

Akad's deploy pipeline delegates proving to the connected wallet instead, via `dappConnectorProofProvider`. On Preview testnet, Lace proves against Midnight's own hosted proof server rather than anything local — confirmed directly from the wallet's own config:

```ts
const config = await connectedApi.getConfiguration();
// config.proverServerUri === "https://proof-server.preview.midnight.network"
```

So no local Docker proof server is needed (or used) for Akad's actual deploy/swap/wrap flow on Preview. The Docker proof server we set up early in development (see dev environment setup notes) was only used for initial local toolchain verification (compiling `counter.compact`), not for any of the deployed contract interactions.

## Shielded coins (`wrap` and `unwrap`)

Both directions work and are verified on Preview. `wrap` burns a public balance and mints a native Zswap shielded coin to the caller; `unwrap` spends that coin back into the contract via `receiveShielded` and credits the public balance.

Two things to know before touching this code:

- The shielded token colour is derived as `tokenType(domainSep, kernel.self())`, so it is **contract-address specific**. Every redeployment produces a different colour, and coins wrapped against an older deployment cannot be unwrapped against a newer one.
- `unwrap` is verified on 1AM. On Lace, the call hangs inside the wallet's own `balanceUnsealedTransaction` and never returns — Lace's `connectedApi` also lacks `getProvingProvider()`, which `dapp-connector-api@4.x` declares as required.

## The unwrap investigation — a post-mortem

`unwrap()` failed for roughly a month across two wallets and five contract deployments. The cause turned out to be trivial, and the reason it took so long is worth writing down.

### The symptom, and how it changed

The same underlying fault surfaced differently depending on the wallet and how far the transaction got:

| Wallet | Symptom |
| --- | --- |
| Lace | Silent hang inside `balanceUnsealedTransaction` — no popup, no error, no timeout |
| 1AM | `Balance failed: Insufficient funds`, sometimes preceded by a "Dust Sponsorship Failed" prompt |

The Lace hang was the most misleading. Producing no error at all, it invited architectural explanations. In reality the wallet held no shielded coin matching what the circuit asked for, and rather than reporting that, it simply never returned.

### Hypotheses that were wrong

Each was investigated and ruled out. They are listed because they were reasonable, and because ruling them out consumed most of the time:

- **Nonce evolution** — that `mintShieldedToken` derives a coin nonce different from the seed passed in, making the client-reconstructed coin unmatchable.
- **A Lace API gap** — Lace genuinely lacks `getProvingProvider()`. Real, documented, and irrelevant to this bug.
- **SDK version mismatch** — every installed package was checked against the official Preview support matrix. All matched exactly.
- **Proof server incompatibility** — a `midnight:proof-versioned` vs `midnight:vec(option(u64))` error suggested 1AM's ProofStation ran an incompatible proof format.
- **Wrong architecture** — that `unwrap` needed rebuilding on `makeTransfer`/`makeIntent` to bypass automatic transaction balancing. This file documented that as the path forward for weeks.

### The actual cause

Two independent faults, stacked:

1. `tokenColor` was declared as a ledger field but never written by any circuit. `akdColor()` computed the value and returned it; nothing persisted it. Reading it back gave 32 zero bytes.
2. The fix for (1) never reached the running application. Compiled artifacts under `build/` were copied into `frontend/` by hand once, and never again. Every subsequent deployment put a months-old contract build on chain while the source sat corrected in the working tree.

The consequence: `unwrap` read `tokenColor` from the ledger, got zeros, and asked the wallet to spend a coin of colour `0x0000...0000`. No wallet held such a coin. `wrap` was unaffected because it computes the colour inline and never reads the ledger — which is why one direction worked perfectly while the other never did.

### What actually found it

Logging the values rather than reasoning about them:

```ts
console.log('[DEBUG] targetAddress:', targetAddress);
console.log('[DEBUG] totalSupply:', ledgerState.totalSupply?.toString());
console.log('[DEBUG] tokenColor raw:', ledgerState.tokenColor);
```

Three lines. The decisive output was `totalSupply: 1000000000000` alongside `tokenColor: [0, 0, 0, ...]` — a contradiction, because the current `init()` writes both. An `init()` that mints supply but leaves the colour unwritten could only be an older build of the circuit, which pointed at the artifacts rather than the wallet. Timestamps confirmed it: compiled output dated 6 August, frontend copy dated 22 July.

### The fix

`scripts/sync-contract-artifacts.sh` copies compiled output into every location that consumes it — the contract module under `frontend/lib/`, the ZK assets under `frontend/public/`, and `contracts/managed/`. Run it after every `compact compile`, before deploying.

### What to take from this

- **A hang is a missing error message, not a hint about architecture.** Lace's silence was read as evidence of deep incompatibility. It was a wallet failing to report that it could not find a coin.
- **Verify what is running, not what is written.** The contract source was correct for weeks. Nothing checked that the deployed bytecode matched it.
- **Log the value before theorising about the mechanism.** Every wrong hypothesis was about mechanism. The answer was visible in a single printed field.
- **Any manual copy step in a build pipeline will eventually be skipped.** Script it the first time.

## CI

GitHub Actions uses `npm install` rather than `npm ci` — the latter's strict lockfile matching was failing on the runner even when the lockfile was locally consistent, likely due to platform-specific optional dependency resolution differences.

Next.js 16 defaults to Turbopack, which conflicts with the custom webpack config this project needs (for WASM support and `isomorphic-ws` polyfilling) — both `dev` and `build` scripts pass `--webpack` explicitly.
