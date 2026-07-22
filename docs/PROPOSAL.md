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

## 1. Executive Summary

Akad is a constant-product Automated Market Maker (`x * y = k`) that lets users swap a custom fungible token, AKD, against tNIGHT on the Midnight Network. What sets Akad apart from a conventional AMM is its privacy-optional custody model: a user can hold AKD as a normal, publicly-visible balance, or convert it at will into a genuinely private, unlinkable balance backed by Midnight's native Zswap shielded-coin infrastructure.

The name "Akad" refers to an agreement between two parties. Every swap on the platform is exactly that — an agreement — and each trader chooses, independently, how much of that agreement stays visible to the outside world.

## 2. Problem Statement

Public blockchains expose every wallet's token balances and transaction history by default. For a trader or a business, this means competitors, counterparties, or observers can track holdings and trading behavior over time. Most DEX/AMM products treat this as an unavoidable trade-off of on-chain trading.

At the same time, fully private AMMs that hide pool reserves are not practical — price discovery on a constant-product curve fundamentally requires reserves to be knowable. A product that dishonestly claims full trade-amount privacy on a public-reserve AMM misrepresents what the cryptography actually protects.

## 3. Proposed Solution

Akad draws the privacy boundary around token custody rather than around the trade mechanism itself:

- **Public Swap:** standard constant-product AMM (`x * y = k`). Pool reserves and individual swap sizes are public — this is structural to any public-reserve AMM and is not hidden.
- **Wrap to Private:** a user can convert their public AKD balance into a native Zswap shielded coin. Once wrapped, that balance is unlinkable from the public balance it came from, using Midnight's own audited shielded-pool cryptography rather than a custom scheme.
- **Slippage protection** (`minOut`) is enforced entirely on-chain via a zero-knowledge assertion — the value is never written to public state.

This is an honest, scoped privacy claim: Akad protects balance ownership once a user opts to wrap, not the amount of an individual public swap.

## 4. Architecture

The system consists of three parts:

- `contracts/` — Compact smart contracts: `token.compact` (custom token ledger with wrap/unwrap) and `swap.compact` (bonding-curve swap circuit, both directions).
- `frontend/` — Next.js + TypeScript application: landing page, swap UI, and Lace wallet integration via the DApp Connector API (v4).
- `docs/` — Build notes, troubleshooting log, and architecture documentation.

**Tech stack:** Compact (Midnight's smart-contract language), Zswap for native shielding, Next.js/TypeScript, Lace wallet, shadcn/ui, Vitest, and GitHub Actions for CI/CD.

## 5. Deployed Contracts (Midnight Preview Testnet)

| Contract | Address |
|---|---|
| Token (AKD) | `e62f476dc4194c4ea3641016f55f4eb7069ab2ead2903deb3fdfe4f5f9f63d04` |
| Swap (AMM) | `c4831f264adc54f237823ad837733c8ccbc698218f64cf3f13e84c02b8b8b5bb` |

## 6. Privacy Model

**What an observer CAN learn from public contract state:**
- Pool reserves at any point in time, and every individual public swap's size and direction.
- Public AKD balances, keyed by a hashed (not plaintext) wallet identifier.

**What an observer CANNOT learn:**
- Slippage tolerance (`minOut`) — proven correct via an on-chain assertion, never exposed in public state.
- Ownership of any AKD balance moved into shielded form via Wrap — unlinkable from its originating public balance.

## 7. Roadmap

- [ ] Fix `unwrap` — rebuild the shielded transfer using the wallet's `makeTransfer`/`makeIntent` API.
- [ ] Private swap — spend a shielded AKD coin directly into a swap, without a public round-trip.
- [ ] Multi-token and multi-pool support beyond AKD/tNIGHT.
- [ ] Multi-wallet support beyond Lace.
- [ ] Multi-chain expansion beyond Midnight.
- [ ] Mobile-responsive UI.
- [ ] Multi-provider liquidity (LP tokens) — currently a single fixed liquidity seed.
- [ ] Research into reserve-delta privacy (batching / delayed settlement).

## 8. Compliance with Program Requirements

- Fully functional dApp meaningfully using Midnight's privacy model — Wrap to Private is live and tested on Preview testnet.
- Minimum 3 tests passing — 8+ Vitest tests covering bonding-curve math and wallet compatibility.
- CI/CD pipeline running — GitHub Actions runs typecheck, tests, and build on every push.
- Approved idea from the provided idea list — confirmed by program mentor.
- Minimum 10 meaningful commits — satisfied across contracts, frontend, and docs.

## 9. Links

- Repository: [github.com/dzakwannajmi/akad](https://github.com/dzakwannajmi/akad)
- Live Demo: [akad-dzakwannajmis-projects.vercel.app](https://akad-dzakwannajmis-projects.vercel.app/)
