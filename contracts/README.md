# Akad Contracts

Compact smart contracts for Akad — a constant-product AMM with an optional shielded-balance mode, built on Midnight.

## Contents

- `src/token.compact` — AKD fungible token: public balance ledger, plus `wrap`/`unwrap` circuits bridging to native Zswap shielded coins
- `src/swap.compact` — constant-product AMM (`x * y = k`): liquidity seeding and bidirectional swap

## Circuits

**token.compact**
| Circuit | Purpose |
|---|---|
| `init` | One-time setup: mints initial supply, records the token's shielded color |
| `transfer` | Public balance transfer between accounts |
| `wrap` | Converts public AKD into a native shielded coin (Zswap) |
| `unwrap` | Converts a shielded AKD coin back to public balance |
| `akdColor` | Returns AKD's collision-resistant shielded token type |

**swap.compact**
| Circuit | Purpose |
|---|---|
| `addLiquidity` | Seeds the pool's initial reserves (one-time, builder-provided) |
| `swapAkdToNight` | Swap AKD for tNIGHT |
| `swapNightToAkd` | Swap tNIGHT for AKD |

## Building

Requires the [Compact toolchain](https://docs.midnight.network/getting-started/installation).

```bash
compact compile src/token.compact ../build/token
compact compile src/swap.compact ../build/swap
```

Compiled output (`compiler/`, `contract/`, `keys/`, `zkir/`) is consumed by the frontend — see `frontend/README.md` for how artifacts are wired in.

## Design notes

- Reserve pools are intentionally public (required for AMM price discovery on any chain). See the root [README's Privacy Model section](../README.md#privacy-model) for the exact public/private boundary.
- `wrap`/`unwrap` bridge public AKD to Midnight's native Zswap shielded pool via `mintShieldedToken`, rather than a hand-rolled commitment scheme — this keeps the security-critical cryptography inside Midnight's audited protocol code.
- See [docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) for Compact language quirks encountered while building this.
