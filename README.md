<div align="center">

# Akad

![Network](https://img.shields.io/badge/network-Preview%20live%2C%20Preprod%20toggle-blue)
![Chain](https://img.shields.io/badge/chain-Midnight-6f42c1)
[![CI](https://github.com/dzakwannajmi/akad/actions/workflows/ci.yml/badge.svg)](https://github.com/dzakwannajmi/akad/actions/workflows/ci.yml)
[![X](https://img.shields.io/badge/X-@akadtok-000000?logo=x&logoColor=white)](https://x.com/akadtok)

Privacy-optional AMM on Midnight Network, built for Rise In × Midnight "New Moon to Full: Monthly Moonshots"

[Live Demo](https://akad-dzakwannajmis-projects.vercel.app) · [Demo Video](https://youtu.be/UO1GlUcs83A?si=Dy7LKhTyzAB2-3Aj) · [@akadtok](https://x.com/akadtok) · [See Full Proposal](docs/PROPOSAL.md) · [Troubleshooting & Build Notes](docs/TROUBLESHOOTING.md)

</div>

---

## Table of Contents

- [What is Akad](#what-is-akad)
- [Live Demo & Deployed Contracts](#live-demo--deployed-contracts)
- [Trying the App](#trying-the-app)
- [Network Toggle](#network-toggle)
- [Architecture](#architecture)
- [Design Notes](#design-notes)
- [End-to-End Flows](#end-to-end-flows)
- [Privacy Model](#privacy-model)
- [Roadmap](#roadmap)
- [Testing & CI](#testing--ci)
- [Running Locally](#running-locally)
- [Project Structure](#project-structure)

## What is Akad

Akad is a constant-product AMM (`x * y = k`) for swapping a custom fungible token (AKD) against NIGHT on Midnight Network. Users can hold AKD publicly (standard token balance) or convert it into a genuinely private, unlinkable balance backed by Midnight's native Zswap shielded-coin infrastructure.

The idea behind the name: "Akad" is an agreement between two parties — every swap is exactly that, with a level of openness each trader chooses for themselves.

## Live Demo & Deployed Contracts

**App:** https://akad-dzakwannajmis-projects.vercel.app/

**Network:** Midnight Preview testnet (default). A network toggle in the app also supports **Preprod** — see [Network Toggle](#network-toggle) below; no contract is deployed there yet.

**Contracts:**

| Contract | Address |
|---|---|
| Akad (token + AMM) | `90a0183fe6e04efcc716f410d476b9d94148e788d4839013960382a4f50add3c` |

[View on Night Scan](https://explorer.preview.midnight.network/contracts/stream/90a0183fe6e04efcc716f410d476b9d94148e788d4839013960382a4f50add3c)

Token and swap logic were originally two separate contracts; they were merged into one so swap circuits could move a trader's real AKD balance without relying on an unverified cross-contract authorization pattern. See [contracts/README.md](contracts/README.md) for why.

**Verified transactions** on the merged contract above, on-chain:

| Action | Transaction |
|---|---|
| `wrap()` | [`50befbb2…d797d6`](https://explorer.1am.xyz/tx/50befbb21182d5243d2290b4a79684061d74c17f19c679cfd6f84df50ad797d6?network=preview) |
| `unwrap()` | [`ac3d5cf1…7f81d4e08`](https://explorer.1am.xyz/tx/ac3d5cf1983907d19eed9c98c37fded2e223dc9b68767f152ffd5467f81d4e08?network=preview) |
| `swapAkdToNight()` | [`3b7259a8…dd7fdaa38`](https://explorer.1am.xyz/tx/3b7259a832c31a778826a6d42e5cfceab301cb46bf915b88d7d57bb989fdaa38?network=preview) |
| `swapNightToAkd()` | [`9dddfb5d…835fb7643750`](https://explorer.1am.xyz/tx/9dddfb5d9921ebe364c2d0a0ec779f10107a06849299d69e3050835fb7643750?network=preview) |

## Trying the App

1. Install a Midnight wallet — **1AM** (recommended) or [Lace](https://www.lace.io/midnight) — and switch its network to **Preview**.
2. Get test tokens from the [Preview faucet](https://faucet.preview.midnight.network/): NIGHT for gas, and DUST generated from it.
3. Open the [live demo](https://akad-dzakwannajmis-projects.vercel.app/) and click **Launch App**.
4. Connect your wallet on the swap page.
5. Enter an amount, review the quote, and swap.
6. Try **Wrap to Private** below the swap card — wrap an AKD amount, then check your wallet: the shielded AKD appears as a native shielded token, unlinked from your public balance.
7. Unwrap sends it back the other way, crediting your public balance again.

> **Wallet note:** `unwrap()` is verified on 1AM. On Lace, the shielded-receive transaction hangs inside the wallet's own `balanceUnsealedTransaction` and never returns — use 1AM for the full round trip.

## Network Toggle

Akad can run against **Preview** or **Preprod** from the same deployed site — a toggle switches the active network (indexer endpoints, wallet `connect()` target, and contract address) without editing env vars or redeploying. Preview is the default and the only network with a deployed contract right now; Preprod is wired up and selectable in the UI, but `NEXT_PUBLIC_AKAD_CONTRACT_ADDRESS_PREPROD` is empty until the contract is deployed there via the `/deploy` page. See [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md#network-preview-vs-preprod) for why Preprod was avoided early on and what's changed since, and `frontend/.env.example` for the full list of per-network env vars.

## Architecture

    contracts/    Compact smart contract (akad.compact: token + AMM), see contracts/README.md
    frontend/     Next.js app (landing, swap UI, wallet integration) — see frontend/README.md
    docs/         Build notes and troubleshooting log

**Stack:** Compact (smart contracts) · Next.js + TypeScript (frontend) · 1AM and Lace wallets via DApp Connector API v4 · shadcn/ui · Vitest · GitHub Actions.

## Design Notes

Akad's swap mechanics use a standard constant-product model — public reserves, `x * y = k`, no oracle dependency. This part is deliberately conventional: it's a well-understood, battle-tested AMM design, and reinventing pricing mechanics wasn't the point of this project.

The part that isn't standard is the privacy layer sitting alongside it. Rather than treating privacy as a separate product, Akad treats it as a mode a user opts into for their own holdings — public AKD behaves exactly like a normal ERC20-style balance, and `wrap` converts it into a native Zswap shielded coin whenever a user wants that balance to stop being publicly linkable. The AMM itself stays fully public (reserves have to be, for price discovery to work at all); the privacy boundary is drawn around token *custody*, not around the trade mechanism. See [Privacy Model](#privacy-model) for exactly what that boundary does and doesn't cover.

**Where the AMM's settlement currently stands:** the AKD leg of every swap and of the initial liquidity seed is a real balance transfer, moving AKD between the trader (or the builder, for `addLiquidity`) and the pool's own custody account inside the contract. The NIGHT leg is not yet real: `reserveNight` updates correctly so quoted prices stay accurate, but no NIGHT actually changes custody on either side of a swap yet. Wiring that up needs Compact's unshielded-token primitives (`sendUnshielded` / `receiveUnshielded`), which is tracked in the [Roadmap](#roadmap) rather than shipped.

## End-to-End Flows

### Public Swap

```mermaid
flowchart LR
  U["User<br/>(Midnight wallet)"] -->|"connect()"| FE["Akad Frontend"]
  FE -->|"compute dy off-chain<br/>(bonding curve)"| FE
  FE -->|"swapAkdToNight(dx, dy, minOut)"| SC["Akad Contract"]
  SC -->|"reads / writes"| R["reserveAKD, reserveNight<br/>(public)"]
  SC -->|"tx confirmed"| FE
  FE -->|"updated pool + balance"| U
```

### Wrap — Public AKD to Private Shielded AKD

```mermaid
flowchart LR
  U["User<br/>(Midnight wallet)"] -->|"wrap(amount, nonce)"| TC["Akad Contract"]
  TC -->|"burn"| PB["Public balances map"]
  TC -->|"mintShieldedToken()"| ZS["Zswap<br/>(native shielded pool)"]
  ZS -->|"shielded coin, color = AKD"| U
  U -->|"balance now shown as"| L["Wallet: shielded AKD"]
```

### Unwrap — Private Shielded AKD back to Public AKD

```mermaid
flowchart LR
  U["User<br/>(Midnight wallet)"] -->|"unwrap(coin)"| TC["Akad Contract"]
  U -->|"spends shielded coin"| ZS["Zswap<br/>(native shielded pool)"]
  ZS -->|"receiveShielded()"| TC
  TC -->|"credit"| PB["Public balances map"]
  PB -->|"public balance restored"| U
```

Both directions are verified on Preview — see the transaction table under [Live Demo & Deployed Contracts](#live-demo--deployed-contracts). `unwrap` requires the wallet to spend a shielded coin it owns; 1AM handles this, while Lace hangs inside its own transaction balancing.

## Privacy Model

What an observer **can** learn from the public contract state:

- Pool reserves at any point in time, and every individual swap's size and direction (reserve deltas are public — required for AMM price discovery, true of any chain).
- Public AKD balances, keyed by a hashed (not plaintext) wallet identifier.

What an observer **cannot** learn:

- Slippage tolerance (`minOut`) — used only in an on-chain assertion, never written to public state. A value proven correct without ever being shown.
- **Ownership of any AKD balance held in shielded form.** `wrap` burns a public balance and mints a native Zswap shielded coin to the caller; `unwrap` returns that coin to the contract and credits the public balance back. While shielded, the AKD is unlinkable from the public balance it came from, using Midnight's own shielded-pool cryptography rather than a hand-rolled scheme.

Both directions assert value conservation in-circuit, so shielded supply stays 1:1 backed by locked public balance.

The honest boundary: swap trade amounts remain public (structural to any public-reserve AMM); balance ownership is private while wrapped. Akad does not claim trade-amount privacy during a swap.

## Roadmap

- [ ] Real NIGHT settlement: wire `sendUnshielded`/`receiveUnshielded` so the NIGHT leg of a swap actually moves funds, not just AKD (currently simulated, see [Design Notes](#design-notes))
- [ ] Private swap — spend a shielded AKD coin directly into a swap, rather than wrap to public swap to unwrap
- [ ] Multi-token support — pools beyond AKD/NIGHT
- [ ] Full Lace support — `unwrap` currently requires 1AM; Lace's transaction balancing hangs on shielded receive
- [ ] Multi-chain — beyond Midnight
- [ ] Mobile-responsive UI
- [ ] Multi-provider liquidity (LP tokens) — currently a single fixed liquidity seed from the builder
- [ ] Reserve-delta privacy research — batching or delayed settlement to reduce what's inferable from public reserve changes
- [ ] Deploy the contract to Preprod and verify a full swap/wrap/unwrap cycle there (the toggle is ready; the deployment itself is not done)

## Testing & CI

8+ tests (Vitest) covering bonding curve math and wallet compatibility filtering — see `frontend/lib/__tests__/`.

GitHub Actions runs typecheck, tests, and build on every push — see `.github/workflows/ci.yml`.

## Running Locally

Contracts:

    cd contracts
    compact compile src/akad.compact ../build/akad

Frontend:

    cd frontend
    npm install
    cp .env.example .env.local
    npm run dev

Full details, including artifact wiring and environment variables, in [contracts/README.md](contracts/README.md) and [frontend/README.md](frontend/README.md).

## Project Structure

See [Architecture](#architecture) above, or the per-folder READMEs for details.
