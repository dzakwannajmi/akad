# Akad Contracts

Compact smart contracts for Akad — a constant-product AMM with an optional shielded-balance mode, built on Midnight.

## Contents

- `src/akad.compact`: the AKD token (public balance ledger, `wrap`/`unwrap` bridging to native Zswap shielded coins) and the constant-product AMM (`x * y = k`) in a single contract.

This used to be two contracts (`token.compact` + `swap.compact`). They were merged because a swap circuit calling into a separate token contract to move a trader's balance has no verified-safe authorization pattern in Compact today, since a callee circuit that reads a witness disqualifies it from cross-contract calls, and neither Midnight's own docs nor OpenZeppelin's Midnight contracts show a safe way around that. Keeping the balance ledger and the swap logic in one contract sidesteps the problem instead of leaving a fund-drain surface in production code. See [docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) for the investigation.

## Circuits

**akad.compact**
| Circuit | Purpose |
|---|---|
| `init` | One-time setup: mints initial supply to the deployer, records the token's shielded color |
| `transfer` | Public balance transfer between accounts |
| `wrap` | Converts public AKD into a native shielded coin (Zswap) |
| `unwrap` | Converts a shielded AKD coin back to public balance; asserts the coin's color matches AKD's own before crediting it |
| `akdColor` | Returns AKD's collision-resistant shielded token type |
| `addLiquidity` | Seeds the pool's initial reserves (one-time, builder-provided); moves the builder's real AKD balance into the pool's custody account |
| `swapAkdToNight` | Swap AKD for NIGHT. The AKD leg moves a real balance from the trader to the pool; the NIGHT leg is simulated (see Design notes) |
| `swapNightToAkd` | Swap NIGHT for AKD. The AKD leg moves a real balance from the pool to the trader; the NIGHT leg is simulated (see Design notes) |
| `claimFaucet` | One-time-per-wallet claim of a fixed 50 AKD from the public faucet's custody account, so a wallet with no prior AKD can try a real swap |
| `privateSwapAkdToNight` | Swap AKD for NIGHT, spending the AKD leg as a shielded coin directly instead of a public balance; the NIGHT leg is simulated (see Design notes) |
| `privateSwapNightToAkd` | Swap NIGHT for AKD, minting the AKD leg as a fresh shielded coin instead of crediting a public balance; the NIGHT leg is simulated (see Design notes) |

`callerKey()`, `poolKey()`, `faucetKey()`, `balanceOf()`, and `hasClaimedFaucet()` are internal (non-exported) helpers, not callable directly. `callerKey()` returns the caller's real wallet identity via `ownPublicKey()`; `poolKey()` and `faucetKey()` are fixed custody accounts in the same balance map (for pool reserves and the public faucet, respectively); `balanceOf()` and `hasClaimedFaucet()` are safe map reads that return a default (0, or false) for an account with no prior entry instead of letting `Map.lookup()` fail at runtime. `faucetAddress` is a ledger field (not a circuit) holding the faucet's custody account bytes, written once by `init()` so the frontend can read it without a transaction; the builder funds the faucet by calling `transfer(faucetAddress, amount)` like any other account.

## Building

Requires the [Compact toolchain](https://docs.midnight.network/getting-started/installation), pinned to compiler 0.31.1 for compatibility with the Preview network (see [docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)).

```bash
compact compile src/akad.compact ../build/akad
```

Compiled output (`compiler/`, `contract/`, `keys/`, `zkir/`) is consumed by the frontend. Run `../scripts/sync-contract-artifacts.sh akad` after every compile, before deploying from the frontend. See `frontend/README.md` for how artifacts are wired in.

## Design notes

- Reserve pools are intentionally public (required for AMM price discovery on any chain). See the root [README's Privacy Model section](../README.md#privacy-model) for the exact public/private boundary.
- The AKD leg of every swap and of `addLiquidity` is a real balance transfer: AKD moves between the caller's account and `poolKey()`'s custody account in the same `balances` map, the same way `transfer` moves it between two regular accounts. The NIGHT leg is not yet real: `reserveNight` updates correctly for pricing, but no NIGHT changes custody on either side of a swap. Wiring real NIGHT settlement needs Compact's unshielded-token primitives (`sendUnshielded` / `receiveUnshielded`), tracked as a roadmap item in the root README.
- `init()` mints the entire initial supply to the deployer only; every other wallet starts at an AKD balance of 0. `claimFaucet()` exists so a new wallet can bootstrap 50 AKD once, without the deployer manually calling `transfer` for each one. It is a per-wallet limit rather than a per-time-window one, since Compact circuits have no verified-safe way to read wall-clock time for a cooldown; the faucet can also simply run dry (`faucetBalance >= 50` fails with a clear message), in which case the deployer needs to fund it again.
- Caller identity is bound to `ownPublicKey()` rather than a self-declared witness. An earlier version of this contract let the caller supply their own account identifier with no on-chain verification, which meant any client could claim to be any account and drain its balance via `transfer`.
- `wrap`/`unwrap` bridge public AKD to Midnight's native Zswap shielded pool via `mintShieldedToken`, rather than a hand-rolled commitment scheme — this keeps the security-critical cryptography inside Midnight's audited protocol code.
- The constant-product invariant check in both swap circuits casts reserves down to `Uint<64>` before multiplying, so both reserves are capped at 4,000,000,000 base units each to stay under `Uint<64>::MAX` with room for a trade on top.
- `unwrap`, `privateSwapAkdToNight`, and `privateSwapNightToAkd` all assert a shielded coin's color matches `tokenColor` before crediting or spending it as AKD. `unwrap` originally had no such check — `receiveShielded`/`createZswapInput` verify a coin is authentic and unspent, but not its token type, so any shielded coin of any color could be unwrapped into fraudulent AKD balance and re-wrapped into an indistinguishable real AKD coin. Fixed by asserting `coin.color == tokenColor.read()` as the first line of `unwrap`, and built into the private-swap circuits from the start.
- `privateSwapAkdToNight`/`privateSwapNightToAkd` let a trader move the AKD leg of a swap through Zswap directly, instead of `wrap` → `swapAkdToNight`/`swapNightToAkd` → `unwrap`. The pool's own reserves and custody stay public (still required for the constant-product invariant check); only the trader's own AKD balance moves as a shielded coin instead of through the `balances` map.
- See [docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) for Compact language quirks encountered while building this.
