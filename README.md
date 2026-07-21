# Akad

Privacy-optional AMM on Midnight Network. Built for Rise In × Midnight "New Moon to Full: Monthly Moonshots" builder program.

**Live demo:** [_add your deployed frontend URL here_](https://akad-dzakwannajmis-projects.vercel.app/|)

**Deployed contracts (Preview testnet):**
- Token (AKD): `37e14edc42799d76746e22b87419252e94f64104e1fc0d2a59fd037cfe337cfb`
- Swap (AMM): `c4831f264adc54f237823ad837733c8ccbc698218f64cf3f13e84c02b8b8b5bb`
- [View on explorer](https://explorer.preview.midnight.network/contracts/stream/c4831f264adc54f237823ad837733c8ccbc698218f64cf3f13e84c02b8b8b5bb)

---

## What is Akad

Akad is a constant-product AMM (x * y = k) for swapping a custom fungible token (AKD) against tNIGHT on Midnight. Users choose a privacy level per action — a "Public" mode is fully built and working today; a "Private" mode is architected but not yet implemented (see Privacy Model and Roadmap below).

## Privacy Model

This section states plainly what an observer of the Akad contracts can and cannot learn, based on the actual deployed code, not aspirational claims.

### What an observer CAN learn (public, visible via indexer/explorer)

- Pool reserves (reserveAKD, reserveNight) at any point in time — required for price discovery, deliberately public.
- Every individual trade's size and direction. Both dx (amount in) and dy (amount out) are explicitly disclosed when writing the new reserve values after a swap. Reserve deltas are public by construction, so trade amounts are not hidden even though dx/dy start as private circuit parameters.
- Every addLiquidity call and its amounts — also explicitly disclosed.
- Token balances in token.compact's balances map, keyed by a 32-byte identifier derived from the caller's wallet.

### What an observer CANNOT learn (not exposed in current contract state)

- Slippage tolerance (minOut) a trader sets per swap — used only in an on-chain assert, never written to public state.
- The raw correspondence between a wallet's real public key and its balance-map key — the key is a SHA-256 hash of the wallet's shielded coin public key, not the plaintext key itself. This is a thin pseudonymity layer, not full identity privacy.

### Honest summary

Level 1-3 "Public" mode intentionally provides no amount or trade privacy. This is a deliberate, documented tradeoff: Midnight has no built-in shielded-balance primitive for custom fungible tokens (only native NIGHT/DUST get protocol-level shielding via Zswap). Real amount/identity privacy for a custom token requires a hand-rolled commitment and nullifier scheme — documented as Roadmap rather than claimed as delivered.

The engineering choice that is "meaningfully using Midnight's privacy model" here: every value written to public ledger state goes through an explicit disclose() call — nothing leaks by accident. The public/private boundary is an explicit, auditable decision at every write site.

---

## Architecture

    contracts/src/
      token.compact   — custom fungible token ledger (Map of Bytes32 to Uint128 balances)
      swap.compact    — constant-product AMM: addLiquidity, swapAkdToNight, swapNightToAkd

    frontend/
      app/            — Next.js pages: landing (/), swap UI (/swap), internal deploy tool (/deploy)
      lib/            — wallet connector, provider setup, deploy/swap API, bonding curve math
      lib/contracts/  — compiled contract JS modules (bundled by webpack)
      public/contracts/ — compiled ZK keys/zkir (fetched via HTTP by the wallet's proof pipeline)

**Stack:** Compact (smart contracts), Next.js + TypeScript (frontend), Lace wallet (DApp Connector API v4), shadcn/ui, Vitest (testing), GitHub Actions (CI).

**Why disclosure happens where it does:** the constant-product formula requires public reserves for correct price discovery — this is true of every AMM on every chain, not a Midnight-specific limitation. See the Privacy Model section above for the precise boundary.

## Roadmap (not yet built)

These items are explicitly out of scope for Level 1-3 and documented here so the current scope is unambiguous:

- Commitment-based private balances for AKD — hide individual holdings using a persistentCommit + witness-opening scheme, instead of the current public balances map.
- Trade-amount privacy — batching or commit-reveal-with-delay to reduce what an observer can infer from reserve deltas. Full amount-hiding in an AMM with public reserves is a known-hard problem.
- Multi-provider liquidity / LP tokens — currently a single fixed liquidity seed from the builder (deliberate, to narrow attack surface for this stage).
- Multi-pool support.

## Testing and CI

8+ tests (Vitest) covering bonding curve math and wallet compatibility filtering — see frontend/lib/__tests__/.

GitHub Actions runs typecheck, tests, and build on every push — see .github/workflows/ci.yml.

## Local development

Contracts:

    cd contracts
    compact compile src/token.compact ../build/token
    compact compile src/swap.compact ../build/swap

Frontend:

    cd frontend
    npm install
    cp .env.example .env.local
    npm run dev
    npm run test
