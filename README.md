<div align="center">

# Akad

![Network](https://img.shields.io/badge/network-Preview%20%26%20Preprod%20live-blue)
![Chain](https://img.shields.io/badge/chain-Midnight-6f42c1)
[![CI](https://github.com/dzakwannajmi/akad/actions/workflows/ci.yml/badge.svg)](https://github.com/dzakwannajmi/akad/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
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
- [License](#license)

## What is Akad

Akad is a constant-product AMM (`x * y = k`) for swapping a custom fungible token (AKD) against NIGHT on Midnight Network. Users can hold AKD publicly (standard token balance) or convert it into a genuinely private, unlinkable balance backed by Midnight's native Zswap shielded-coin infrastructure.

The idea behind the name: "Akad" is an agreement between two parties — every swap is exactly that, with a level of openness each trader chooses for themselves.

## Live Demo & Deployed Contracts

**App:** https://akad-dzakwannajmis-projects.vercel.app/

**Network:** Midnight Preview testnet (default), with **Preprod** also live and verified — see [Network Toggle](#network-toggle) below.

**Contracts:**

| Contract | Network | Address |
|---|---|---|
| Akad (token + AMM) | Preview | `462616f6263725ab0a22b5ffdcde5798a47c39ec72f04978c2e0bb8b9588583f` |
| Akad (token + AMM) | Preprod | `52907ea70ae01643508a270cf5592901e8b88216f1d332e953231f788b7e7975` |

[View Preview contract on Night Scan](https://explorer.preview.midnight.network/contracts/stream/462616f6263725ab0a22b5ffdcde5798a47c39ec72f04978c2e0bb8b9588583f)

Token and swap logic were originally two separate contracts; they were merged into one so swap circuits could move a trader's real AKD balance without relying on an unverified cross-contract authorization pattern. See [contracts/README.md](contracts/README.md) for why. Both addresses above are from the redeploy that shipped the private-swap circuits and the `unwrap()` token-color fix (see [Roadmap](#roadmap)); coins wrapped against an older deployment cannot be unwrapped against this one.

**Verified transactions** on the current Preview contract above, on-chain:

| Action | Transaction |
|---|---|
| `privateSwapAkdToNight()` | [`f44c3e0b…dff7c62`](https://explorer.1am.xyz/tx/f44c3e0bad755827fccb15c55454bd15cb32ff6f0c0e0f47700fb269bdff7c62?network=preview) |

> `wrap`, `unwrap`, `swapAkdToNight`, `swapNightToAkd`, and `privateSwapNightToAkd` were all re-verified working after this redeploy (both directions of private swap, and a full swap/wrap/unwrap cycle on Preprod), but fresh transaction links for this specific contract address are still being collected — the previous set of links here pointed at the prior deployment and have been removed rather than left pointing at a superseded address.

## Trying the App

1. Install a Midnight wallet — **1AM** (recommended) or [Lace](https://www.lace.io/midnight) — and switch its network to **Preview**.
2. Get test tokens from the [Preview faucet](https://faucet.preview.midnight.network/): NIGHT for gas, and DUST generated from it.
3. Open the [live demo](https://akad-dzakwannajmis-projects.vercel.app/) and click **Launch App**.
4. Connect your wallet on the swap page.
5. Enter an amount, review the quote, and swap.
6. Try **Wrap to Private** below the swap card — wrap an AKD amount, then check your wallet: the shielded AKD appears as a native shielded token, unlinked from your public balance.
7. Unwrap sends it back the other way, crediting your public balance again.
8. Once you have a wrapped coin, flip **Private** in the swap card's settings to spend or receive the AKD leg directly as a shielded coin, skipping the wrap/unwrap round trip. See [Design Notes](#design-notes) for exactly what that hides and what it doesn't.

> **Wallet note:** `unwrap()` is verified on 1AM. On Lace, the shielded-receive transaction hangs inside the wallet's own `balanceUnsealedTransaction` and never returns — use 1AM for the full round trip.

## Network Toggle

Akad can run against **Preview** or **Preprod** from the same deployed site — a toggle switches the active network (indexer endpoints, wallet `connect()` target, and contract address) without editing env vars or redeploying. Preview is the default; Preprod now also has a deployed contract, with a full swap/wrap/unwrap cycle verified on it. See [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md#network-preview-vs-preprod) for why Preprod was avoided early on and what's changed since, and `frontend/.env.example` for the full list of per-network env vars.

## Architecture

    contracts/    Compact smart contract (akad.compact: token + AMM), see contracts/README.md
    frontend/     Next.js app (landing, swap UI, wallet integration) — see frontend/README.md
    docs/         Build notes and troubleshooting log

**Stack:** Compact (smart contracts) · Next.js + TypeScript (frontend) · 1AM and Lace wallets via DApp Connector API v4 · shadcn/ui · Vitest · GitHub Actions.

## Design Notes

Akad's swap mechanics use a standard constant-product model — public reserves, `x * y = k`, no oracle dependency. This part is deliberately conventional: it's a well-understood, battle-tested AMM design, and reinventing pricing mechanics wasn't the point of this project.

The part that isn't standard is the privacy layer sitting alongside it. Rather than treating privacy as a separate product, Akad treats it as a mode a user opts into for their own holdings — public AKD behaves exactly like a normal ERC20-style balance, and `wrap` converts it into a native Zswap shielded coin whenever a user wants that balance to stop being publicly linkable. The AMM itself stays fully public (reserves have to be, for price discovery to work at all); the privacy boundary is drawn around token *custody*, not around the trade mechanism. See [Privacy Model](#privacy-model) for exactly what that boundary does and doesn't cover.

Private swap builds on that same boundary rather than adding a new one: `privateSwapAkdToNight` and `privateSwapNightToAkd` let a trader spend or receive the AKD leg of a trade as a shielded Zswap coin in the same transaction as the swap itself, instead of wrapping first, swapping publicly, then unwrapping. The AMM's public reserves and pricing don't change; only which ledger structure the trader's own AKD balance touches differs — a public map entry keyed to their address, versus a shielded coin nobody but the holder can link to a wallet.

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

### Private Swap — AKD leg spent or received as a shielded coin, in one transaction

```mermaid
flowchart LR
  U["User<br/>(wrapped AKD coin)"] -->|"privateSwapAkdToNight(coin, dy, minOut)"| TC["Akad Contract"]
  U -->|"spends shielded coin"| ZS["Zswap<br/>(native shielded pool)"]
  ZS -->|"receiveShielded()"| TC
  TC -->|"reads / writes"| R["reserveAKD, reserveNight<br/>(public)"]
  TC -->|"tx confirmed"| U
```

```mermaid
flowchart LR
  U["User"] -->|"privateSwapNightToAkd(dx, dy, minOut, nonce)"| TC["Akad Contract"]
  TC -->|"reads / writes"| R["reserveAKD, reserveNight<br/>(public)"]
  TC -->|"mintShieldedToken()"| ZS["Zswap<br/>(native shielded pool)"]
  ZS -->|"shielded coin, color = AKD"| U
```

Both circuits assert the spent or minted coin's color matches AKD's own shielded color before moving it — the same check `unwrap()` was missing until this release (see [Roadmap](#roadmap)). Verified on Preview; see the transaction table above.

## Privacy Model

What an observer **can** learn from the public contract state:

- Pool reserves at any point in time, and every individual swap's size and direction (reserve deltas are public — required for AMM price discovery, true of any chain).
- Public AKD balances, keyed by a hashed (not plaintext) wallet identifier.

What an observer **cannot** learn:

- Slippage tolerance (`minOut`) — used only in an on-chain assertion, never written to public state. A value proven correct without ever being shown.
- **Ownership of any AKD balance held in shielded form.** `wrap` burns a public balance and mints a native Zswap shielded coin to the caller; `unwrap` returns that coin to the contract and credits the public balance back. `privateSwapAkdToNight` and `privateSwapNightToAkd` extend the same boundary directly into a swap, spending or receiving the AKD leg as a shielded coin without ever writing a balance keyed to the trader's address. While shielded, the AKD is unlinkable from the public balance it came from, using Midnight's own shielded-pool cryptography rather than a hand-rolled scheme.

All four circuits (`wrap`, `unwrap`, `privateSwapAkdToNight`, `privateSwapNightToAkd`) assert the coin's color matches AKD's own shielded color before moving it, so shielded supply stays 1:1 backed by locked public balance and can't be inflated by feeding in a different token's shielded coin.

The honest boundary: swap trade amounts remain public (structural to any public-reserve AMM); balance ownership is private while wrapped. Akad does not claim trade-amount privacy during a swap.

## Roadmap

- [ ] Real NIGHT settlement: wire `sendUnshielded`/`receiveUnshielded` so the NIGHT leg of a swap actually moves funds, not just AKD (currently simulated, see [Design Notes](#design-notes))
- [x] Private swap — spend or receive a shielded AKD coin directly in a swap, rather than wrap to public swap to unwrap. Shipped both directions (`privateSwapAkdToNight`, `privateSwapNightToAkd`), verified on Preview.
- [ ] Multi-token support — pools beyond AKD/NIGHT
- [ ] Full Lace support — `unwrap` currently requires 1AM; Lace's transaction balancing hangs on shielded receive
- [ ] Multi-chain — beyond Midnight
- [ ] Mobile-responsive UI
- [ ] Multi-provider liquidity (LP tokens) — currently a single fixed liquidity seed from the builder
- [ ] Reserve-delta privacy research — batching or delayed settlement to reduce what's inferable from public reserve changes
- [x] Deploy the contract to Preprod and verify a full swap/wrap/unwrap cycle there
- [ ] Akad Explorer — a self-built block/transaction explorer scoped to the Akad contract, instead of relying on Night Scan/1AM's explorer for a full picture of pool and wallet activity
- [ ] Akad as a wallet — extend the swap app itself into a lightweight Midnight wallet (key management, balances, shielded coins) instead of only connecting to an external one
- [ ] Akad SDK — a published TypeScript package wrapping the contract's circuits and providers, so other developers can integrate Akad swap/wrap/unwrap into their own dApps without copying `lib/akad-api.ts`

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

## License

MIT — see [LICENSE](LICENSE).
