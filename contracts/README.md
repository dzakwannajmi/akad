# Akad Contracts

Compact smart contracts for Akad, a constant-product AMM with an optional shielded-balance mode, built on Midnight.

## Contents

- `src/akad.compact`: the AKD token (public balance ledger, `wrap`/`unwrap` bridging to native Zswap shielded coins) and the constant-product AMM (`x * y = k`) in a single contract.

This used to be two contracts (`token.compact` + `swap.compact`). They were merged because a swap circuit calling into a separate token contract to move a trader's balance has no verified-safe authorization pattern in Compact today, since a callee circuit that reads a witness disqualifies it from cross-contract calls, and neither Midnight's own docs nor OpenZeppelin's Midnight contracts show a safe way around that. Keeping the balance ledger and the swap logic in one contract sidesteps the problem instead of leaving a fund-drain surface in production code. See [docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) for the investigation.

## Circuits

### `akad.compact`

| Circuit | Purpose |
| --- | --- |
| `transfer` | Public balance transfer between accounts |
| `wrap` | Converts public AKD into a native shielded coin (Zswap) |
| `unwrap` | Converts a shielded AKD coin back to public balance; asserts the coin's color matches AKD's own before crediting it |
| `akdColor` | Returns AKD's collision-resistant shielded token type |
| `addLiquidity` | Seeds the pool's initial reserves (one-time, builder-provided); moves the builder's real AKD balance into the pool's custody account |
| `swapAkdToNight` | Swap AKD for NIGHT. Both legs real: AKD moves from the trader to the pool, and real tNIGHT is paid out of the pool's own custody to the trader's wallet |
| `swapNightToAkd` | Swap NIGHT for AKD. Both legs are real: real tNIGHT moves from the trader into the pool's custody, and AKD moves from the pool to the trader |
| `claimFaucet` | One-time-per-wallet claim of a fixed 50 AKD from the public faucet's custody account, so a wallet with no prior AKD can try a real swap |
| `recordTokenColor` | Writes the current AKD shielded token color to a ledger field, purely as a frontend read convenience; unguarded and idempotent |
| `shieldedSwapAkdToNight` | Swap AKD for sNIGHT, spending the AKD leg as a shielded coin and minting a shielded sNIGHT coin back. No address published; replaces the removed `privateSwapAkdToNight` |
| `shieldedSwapNightToAkd` | Swap sNIGHT for AKD, spending the sNIGHT leg as a shielded coin and minting a shielded AKD coin back. No address published; replaces the removed `privateSwapNightToAkd` |
| `unwrapNight` | Redeems a shielded sNIGHT coin for real tNIGHT, paid out of the pool's custody via `sendUnshielded` to a caller-supplied `recipient: UserAddress` |

`callerKey()`, `poolKey()`, `faucetKey()`, `balanceOf()`, and `hasClaimedFaucet()` are internal (non-exported) helpers, not callable directly. `callerKey()` returns the caller's real wallet identity via `ownPublicKey()`; `poolKey()` and `faucetKey()` are fixed custody accounts in the same balance map (for pool reserves and the public faucet, respectively); `balanceOf()` and `hasClaimedFaucet()` are safe map reads that return a default (0, or false) for an account with no prior entry instead of letting `Map.lookup()` fail at runtime. `faucetAddress` is a ledger field (not a circuit) holding the faucet's custody account bytes, written once by the constructor so the frontend can read it without a transaction; the builder funds the faucet by calling `transfer(faucetAddress, amount)` like any other account.

## Building

Requires the [Compact toolchain](https://docs.midnight.network/getting-started/installation), pinned to compiler 0.31.1 for compatibility with the Preview network (see [docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)).

```bash
compact compile src/akad.compact ../build/akad
```

Compiled output (`compiler/`, `contract/`, `keys/`, `zkir/`) is consumed by the frontend. Run `../scripts/sync-contract-artifacts.sh akad` after every compile, before deploying from the frontend. See `frontend/README.md` for how artifacts are wired in.

## Design notes

- Reserve pools are intentionally public (required for AMM price discovery on any chain). See the root [README's Privacy Model section](../README.md#privacy-model) for the exact public/private boundary.
- The AKD leg of every swap and of `addLiquidity` is a real balance transfer: AKD moves between the caller's account and `poolKey()`'s custody account in the same `balances` map, the same way `transfer` moves it between two regular accounts. The tNIGHT leg of the public swap circuits and of `addLiquidity` is also real now: `sendUnshielded`/`receiveUnshielded` (both using `nativeToken()` as the color) move actual native-token custody in and out of the pool, sourced/delivered through the connected wallet's own transaction-balancing step. `swapAkdToNight` additionally takes a `recipient: UserAddress` parameter, since `sendUnshielded` needs a concrete payout destination rather than implicitly paying whoever is calling.
- The public swap circuits (`swapAkdToNight`, `swapNightToAkd`) and `addLiquidity` settle tNIGHT for real via `sendUnshielded`/`receiveUnshielded`. The original private circuits, `privateSwapAkdToNight` and `privateSwapNightToAkd`, first shipped without a tNIGHT leg at all, then were fixed to settle it for real through those same primitives, which in turn published the trader's unshielded NIGHT address on every call (see [docs/hackathon/SECURITY_AUDIT.md](../docs/hackathon/SECURITY_AUDIT.md) findings C-01 and H-01 for the original bug). Both circuits were then removed rather than patched further. `shieldedSwapAkdToNight` and `shieldedSwapNightToAkd` trade shielded AKD against sNIGHT instead, a shielded 1:1 claim on tNIGHT the contract holds in custody, so both legs move as shielded coins and no address appears in the transaction. `unwrapNight` is the one remaining circuit that pays real tNIGHT out through `sendUnshielded`, and its recipient address is public for the same reason that primitive always is.
- The constructor mints the entire initial supply to the deployer only, as part of the deploy transaction; every other wallet starts at an AKD balance of 0. This used to be a separate `init()` circuit guarded only by `assert(totalSupply.read() == 0)`, which meant that between deployment and the deployer's own `init()` transaction, anyone could call it first and take the whole supply. A constructor removes the race by removing the entry point (audit finding H-03). `claimFaucet()` exists so a new wallet can bootstrap 50 AKD once, without the deployer manually calling `transfer` for each one. It is a per-wallet limit rather than a per-time-window one, since Compact circuits have no verified-safe way to read wall-clock time for a cooldown; the faucet can also simply run dry (`faucetBalance >= 50` fails with a clear message), in which case the deployer needs to fund it again.
- Caller identity is bound to `ownPublicKey()` rather than a self-declared witness. An earlier version of this contract let the caller supply their own account identifier with no on-chain verification, which meant any client could claim to be any account and drain its balance via `transfer`.
- `wrap`/`unwrap` bridge public AKD to Midnight's native Zswap shielded pool via `mintShieldedToken`, rather than a hand-rolled commitment scheme. This keeps the security-critical cryptography inside Midnight's audited protocol code.
- The constant-product invariant check in both swap circuits casts reserves down to `Uint<64>` before multiplying, so both reserves are capped at 4,000,000,000 base units each to stay under `Uint<64>::MAX` with room for a trade on top.
- `unwrap`, `shieldedSwapAkdToNight`, `shieldedSwapNightToAkd`, and `unwrapNight` all assert a shielded coin's color matches the expected token (AKD or sNIGHT) before crediting or spending it. `unwrap` originally had no such check: `receiveShielded`/`createZswapInput` verify a coin is authentic and unspent, but not its token type, so any shielded coin of any color could be unwrapped into fraudulent AKD balance and re-wrapped into an indistinguishable real AKD coin. Fixed by asserting the coin's color against `currentTokenColor()`/`currentNightColor()` as the first line of each of these circuits.
- `shieldedSwapAkdToNight`/`shieldedSwapNightToAkd` let a trader move both legs of a swap through Zswap directly, instead of `wrap`, `swapAkdToNight`/`swapNightToAkd`, then `unwrap`. The pool's own reserves and custody stay public (still required for the constant-product invariant check); only the trader's own balance moves as a shielded coin instead of through the `balances` map. `unwrapNight` is the exit ramp back to real tNIGHT, and it is the one place in this flow where an address becomes public again.
- See [docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) for Compact language quirks encountered while building this.
