# Product Proposal — Akad

**Privacy-Optional AMM on Midnight Network**
Rise In × Midnight — "New Moon to Full: Monthly Moonshots" Builder Program

| | |
|---|---|
| **Project Name** | Akad |
| **Category** | DeFi — Automated Market Maker (AMM) with optional privacy layer |
| **Track** | Rise In × Midnight, Level 1–3 (New Moon → First Quarter) |
| **Idea List Reference** | Approved by program mentor against the provided 7-item idea list |
| **Repository** | [github.com/dzakwannajmi/akad](https://github.com/dzakwannajmi/akad) |
| **Live Demo** | [akad-dzakwannajmis-projects.vercel.app](https://akad-dzakwannajmis-projects.vercel.app/) |
| **Network** | Midnight Preview Testnet |
| **Date** | 22 July 2026 |

---

> **Status update (10 September 2026):** This proposal is kept as originally submitted where it is still accurate. The sections below were updated only where the project has materially changed since: Architecture (the token and swap contracts were merged into a single `akad.compact`), Deployed Contracts (the merged contract's addresses, now live on both Preview and Preprod), wallet support (1AM added alongside Lace, and now recommended), and Roadmap (items shipped since are checked off, three new exploratory items added). See the [repository README](../README.md) for the current, complete picture.

## 1. Executive Summary

Akad is a constant-product Automated Market Maker (`x * y = k`) that lets users swap a custom fungible token, AKD, against NIGHT on the Midnight Network. What sets Akad apart from a conventional AMM is its privacy-optional custody model: a user can hold AKD as a normal, publicly-visible balance, or convert it at will into a genuinely private, unlinkable balance backed by Midnight's native Zswap shielded-coin infrastructure.

The name "Akad" refers to an agreement between two parties. Every swap on the platform is exactly that — an agreement — and each trader chooses, independently, how much of that agreement stays visible to the outside world.

## 2. Problem Statement

Public blockchains expose every wallet's token balances and transaction history by default. For a trader or a business, this means competitors, counterparties, or observers can track holdings and trading behavior over time. Most DEX/AMM products treat this as an unavoidable trade-off of on-chain trading.

At the same time, fully private AMMs that hide pool reserves are not practical — price discovery on a constant-product curve fundamentally requires reserves to be knowable. A product that dishonestly claims full trade-amount privacy on a public-reserve AMM misrepresents what the cryptography actually protects.

## 3. Proposed Solution

Akad draws the privacy boundary around token custody rather than around the trade mechanism itself:

- **Public Swap:** standard constant-product AMM (`x * y = k`). Pool reserves and individual swap sizes are public — this is structural to any public-reserve AMM and is not hidden.
- **Wrap to Private:** a user can convert their public AKD balance into a native Zswap shielded coin. Once wrapped, that balance is unlinkable from the public balance it came from, using Midnight's own audited shielded-pool cryptography rather than a custom scheme.
- **Slippage protection** (`minOut`) is enforced entirely on-chain via a zero-knowledge assertion — the value is never written to public state.

This is an honest, scoped privacy claim: Akad protects balance ownership once a user opts to wrap, not the amount of an individual public swap. Since this proposal was first submitted, that same custody boundary has been extended directly into a swap: a trader can now spend or receive the AKD leg as a shielded coin in the swap transaction itself, instead of wrap, swap publicly, then unwrap (see Roadmap).

## 4. Architecture

The system consists of three parts:

- `contracts/` — Compact smart contract: `akad.compact`, a custom token ledger (wrap/unwrap, private swap) and bonding-curve AMM (both swap directions) merged into one contract. It started as two separate contracts (`token.compact` + `swap.compact`); they were merged because a swap circuit calling into a separate token contract to move a trader's balance has no verified-safe cross-contract authorization pattern in Compact today — see `contracts/README.md`.
- `frontend/` — Next.js + TypeScript application: landing page, swap UI, and wallet integration (1AM, recommended, and Lace) via the DApp Connector API (v4).
- `docs/` — Build notes, troubleshooting log, and architecture documentation.

**Tech stack:** Compact (Midnight's smart-contract language), Zswap for native shielding, Next.js/TypeScript, 1AM and Lace wallets, shadcn/ui, Vitest, and GitHub Actions for CI/CD.

## 5. Deployed Contracts

| Contract | Network | Address |
|---|---|---|
| Akad (token + AMM, merged) | Preview | `462616f6263725ab0a22b5ffdcde5798a47c39ec72f04978c2e0bb8b9588583f` |
| Akad (token + AMM, merged) | Preprod | `52907ea70ae01643508a270cf5592901e8b88216f1d332e953231f788b7e7975` |

The two contracts listed at initial submission (`token.compact`, `swap.compact`) were since merged into the single `akad.compact` above; both addresses are from the most recent redeploy (private swap + an `unwrap` security fix, see Roadmap).

## 6. Privacy Model

**What an observer CAN learn from public contract state:**
- Pool reserves at any point in time, and every individual public swap's size and direction.
- Public AKD balances, keyed by a hashed (not plaintext) wallet identifier.

**What an observer CANNOT learn:**
- Slippage tolerance (`minOut`) — proven correct via an on-chain assertion, never exposed in public state.
- Ownership of any AKD balance moved into shielded form via Wrap, or spent/received directly in a private swap — unlinkable from its originating public balance.

## 7. Roadmap

- [x] Fix `unwrap` — the actual cause was unrelated to the wallet's transfer API guessed here: `tokenColor` wasn't persisted to the ledger, and a stale compiled build was deployed on top of that. See `docs/TROUBLESHOOTING.md` for the post-mortem. Working and verified on 1AM.
- [x] Private swap — spend or receive a shielded AKD coin directly in a swap, rather than wrap to public swap to unwrap. Shipped both directions, verified on Preview.
- [ ] Multi-token and multi-pool support beyond AKD/NIGHT.
- [x] Multi-wallet support — 1AM added alongside Lace, and is now the recommended wallet (`unwrap` requires it; Lace hangs on shielded receive).
- [ ] Multi-chain expansion beyond Midnight.
- [ ] Mobile-responsive UI.
- [ ] Multi-provider liquidity (LP tokens) — currently a single fixed liquidity seed.
- [ ] Research into reserve-delta privacy (batching / delayed settlement).
- [x] Deploy the contract to Preprod and verify a full swap/wrap/unwrap cycle there.
- [ ] Akad Explorer — a self-built block/transaction explorer scoped to the Akad contract.
- [ ] Akad as a wallet — extend the swap app itself into a lightweight Midnight wallet.
- [ ] Akad SDK — a published TypeScript package so other developers can integrate Akad into their own dApps.

## 8. Compliance with Program Requirements

- Fully functional dApp meaningfully using Midnight's privacy model — Wrap to Private is live and tested on Preview testnet.
- Minimum 3 tests passing — 8+ Vitest tests covering bonding-curve math and wallet compatibility.
- CI/CD pipeline running — GitHub Actions runs typecheck, tests, and build on every push.
- Approved idea from the provided idea list — confirmed by program mentor.
- Minimum 10 meaningful commits — satisfied across contracts, frontend, and docs.

## 9. Links

- Repository: [github.com/dzakwannajmi/akad](https://github.com/dzakwannajmi/akad)
- Live Demo: [akad-dzakwannajmis-projects.vercel.app](https://akad-dzakwannajmis-projects.vercel.app/)
