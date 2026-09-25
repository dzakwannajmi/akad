# Akad Contract Architecture

Written for a reviewer seeing this contract for the first time. No prior context with the project is assumed.

Everything here describes `contracts/src/akad.compact` as committed on the `hackathon` branch (472 lines, one file, compiler 0.31.1 / language 0.23.0 / runtime 0.16.0), after the security audit's fixes were applied. Where the contract's behaviour differs from what the developer-facing READMEs claim, this document follows the code and says so. The full reasoning is in [SECURITY_AUDIT.md](./SECURITY_AUDIT.md).

> **Status note (18 Sep 2026).** The `privateSwapAkdToNight`/`privateSwapNightToAkd` circuits this document walks through in detail have since been removed and replaced with `shieldedSwapAkdToNight`/`shieldedSwapNightToAkd`, which trade shielded AKD against sNIGHT (a shielded claim on tNIGHT) instead of settling tNIGHT through `sendUnshielded`/`receiveUnshielded`, and no longer publish the trader's address. This document has not been rewritten for that change; treat the circuit-by-circuit analysis below as a description of an earlier contract version, and see the root [README](../../README.md) for the current design.

---

## 1. What the contract is

A constant-product automated market maker (`x * y = k`) for one pair: **AKD**, a fungible token this contract issues and accounts for itself, against **tNIGHT**, Midnight's native testnet token.

The contract is also the AKD token. There is no separate token contract, and that is deliberate: a swap circuit that needs to debit a trader's balance held in a *different* contract has no verified-safe authorisation pattern in Compact today, because a callee circuit that reads a witness is disqualified from cross-contract calls. Merging the token ledger and the AMM into one contract sidesteps the problem rather than shipping an unverified authorisation shortcut. This is the single most consequential structural decision in the codebase.

AKD uses **6 decimals**, so 1 AKD is 1,000,000 base units. Every number in this document is in base units unless stated otherwise.

---

## 2. Ledger state

Six exported fields. All of them are public, readable by anyone, which is normal for Midnight: ledger state is the public half of the contract.

| Field | Type | Written by | Purpose |
| --- | --- | --- | --- |
| `balances` | `Map<Bytes<32>, Uint<128>>` | constructor, `transfer`, `claimFaucet`, `wrap`, `unwrap`, `addLiquidity`, all four swaps | Public AKD balances, keyed by account identifier |
| `totalSupply` | `Uint<128>` | constructor only | Fixed at 1,000,000,000,000 (1,000,000 AKD) |
| `tokenColor` | `Bytes<32>` | constructor only | This contract's shielded token type, used to validate incoming shielded coins |
| `faucetAddress` | `Bytes<32>` | constructor only | The faucet's custody account, exposed so the frontend can read it without a transaction |
| `reserveAKD` | `Uint<128>` | `addLiquidity`, all four swaps | AKD side of the pool |
| `reserveNight` | `Uint<128>` | `addLiquidity`, all four swaps | tNIGHT side of the pool |

### Account identifiers

`balances` is keyed by a 32 byte account identifier that comes from one of three places:

- **A real wallet.** `callerKey()` returns `disclose(ownPublicKey().bytes)`, the caller's actual Zswap public key. This is bound by the protocol and cannot be spoofed by the client. An earlier version of this contract accepted a self-declared account identifier as a witness, which let any client claim to be any account; that hole is closed.
- **The pool.** `poolKey()` returns `persistentHash<Uint<8>>(7)`, a fixed constant. The pool's AKD reserves sit in the same `balances` map as everyone else's, under this key.
- **The faucet.** `faucetKey()` returns `persistentHash<Uint<8>>(11)`, likewise fixed. The builder tops the faucet up by calling ordinary `transfer()` with this address.

Using hash constants for the pool and faucet means neither can collide with a real wallet key, and neither needs a private key to hold a balance.

### Reading balances safely

Compact's `Map.lookup()` fails at runtime on a key that has never been inserted, rather than returning a default. Every balance read therefore goes through `balanceOf()`, which checks `.member()` first and returns 0 otherwise. `hasClaimedFaucet()` does the same for the `faucetClaimed` map. This mirrors how OpenZeppelin's own Compact contracts handle the same problem.

---

## 3. Circuits

Ten exported circuits, plus a constructor. Five helpers (`callerKey`, `poolKey`, `faucetKey`, `balanceOf`, `hasClaimedFaucet`) are internal and not callable from outside.

### Setup and token basics

| Circuit | Signature | What it does |
| --- | --- | --- |
| *(constructor)* | n/a | Runs inside the deploy transaction: mints the entire 1,000,000 AKD supply to the deployer, derives and stores `tokenColor`, stores `faucetAddress`. Not callable afterwards |
| `transfer` | `(to, amount)` | Ordinary public balance transfer |
| `claimFaucet` | `()` | One-time-per-wallet claim of 50 AKD from the faucet's custody account |
| `akdColor` | `()` | Recomputes and returns the shielded token type. Redundant, since `tokenColor` already holds it |

**Reviewer note:** this used to be an exported `init()` circuit guarded only by `assert(totalSupply.read() == 0)`. Since deployment and the first circuit call are separate transactions on Midnight, anyone watching new deployments could call `init()` first and take the entire supply. Moving the work into a constructor removes the race by removing the entry point. See finding H-03, now fixed. The CI `contract-compile` job fails the build if `init` ever reappears in the compiled circuit set.

### The shielded bridge

| Circuit | Signature | What it does |
| --- | --- | --- |
| `wrap` | `(amount, nonce)` | Debits the caller's public balance and mints a native Zswap shielded coin of the same value to them |
| `unwrap` | `(coin)` | Accepts a shielded AKD coin into contract custody and credits the caller's public balance |

Both directions are 1:1 backed: public balance decreases exactly as shielded supply increases, and the reverse.

`unwrap` asserts `coin.color == tokenColor.read()` before crediting anything. This check is load-bearing. `receiveShielded` verifies that a coin is authentic and unspent, but not *which* token it is, so without the color check any shielded coin of any type could be unwrapped into AKD at par. `tokenColor` is derived as `tokenType(domainSep, kernel.self())`, binding it to this contract's own address.

Double-spend prevention for these coins is handled entirely by Zswap at the protocol layer, not by contract code. The contract implements no nullifier scheme of its own and does not need one.

### Liquidity

| Circuit | Signature | What it does |
| --- | --- | --- |
| `addLiquidity` | `(amountAKD, amountNight)` | One-shot pool seed. Moves the builder's AKD into pool custody and pulls real tNIGHT in via `receiveUnshielded` |

Callable once (guarded by `reserveAKD == 0 && reserveNight == 0`). No LP tokens, single provider, and **no inverse**: seeded liquidity cannot be withdrawn in this version.

Both amounts are capped at 4,000,000,000 base units (4,000 AKD). The cap exists because the invariant check downcasts to `Uint<64>` before multiplying, and `4e9 * 4e9` is the largest product that stays under `Uint<64>::MAX`. Note the scale mismatch: the cap is 0.4% of the minted supply, and the faucet pays out 50 AKD per wallet.

### The swaps

Four circuits, two axes: direction (AKD in or tNIGHT in) and path (public or private).

| Circuit | AKD leg | tNIGHT leg |
| --- | --- | --- |
| `swapAkdToNight(dx, dy, minOut, recipient)` | Real. Debits `balances[trader]`, credits `balances[pool]` | **Real.** `sendUnshielded` pays the trader from the pool's own native-token custody, after `unshieldedBalanceGte` confirms the custody exists |
| `swapNightToAkd(dx, dy, minOut)` | Real. Debits `balances[pool]`, credits `balances[trader]` | **Real.** `receiveUnshielded` pulls the trader's tNIGHT into pool custody |
| `privateSwapAkdToNight(coin, dy, minOut, recipient)` | Real. `receiveShielded` takes the trader's shielded coin, credits `balances[pool]` | **Real.** `sendUnshielded` pays the trader, after `unshieldedBalanceGte` confirms the custody exists |
| `privateSwapNightToAkd(dx, dy, minOut, nonce)` | Real. Debits `balances[pool]`, mints a shielded coin to the trader | **Real.** `receiveUnshielded` pulls the trader's tNIGHT into pool custody |

All four share the same core: read reserves, assert bounds, downcast to `Uint<64>`, assert `(x + dx) * (y - dy) >= x * y`, then write state. The assertion always precedes every state write, and every downcast is preceded by the bound assertion that makes it safe.

**Reviewer note.** Until the security audit, the two private circuits contained no token primitive for the tNIGHT leg at all, while their AKD leg moved real value. `privateSwapAkdToNight` took a user's real AKD and returned nothing; `privateSwapNightToAkd` handed out real AKD for free, which chained into a complete drain of the pool's real tNIGHT through the public path. Findings C-01 and H-01 carry the worked three-transaction exploit, and both are now fixed: all four circuits settle both legs.

The cost of that fix is worth understanding. `sendUnshielded` and `receiveUnshielded` are transparent, so the private path's tNIGHT leg is now openly visible. For `privateSwapAkdToNight` in particular, the payout destination is a public `UserAddress`, which makes that direction only marginally more private than the public path: it avoids a `balances` write but publishes an address instead. `privateSwapNightToAkd` holds up better, because the trader receives a shielded coin and their AKD genuinely leaves the public ledger.

### Who computes the price

Nobody, on-chain. The frontend computes `dy` off-chain from the public reserves and passes it in as a circuit argument. The contract does not derive the output; it only checks that the caller's proposed `(dx, dy)` pair does not decrease `k`.

This has a direct consequence for slippage: `assert(dy >= minOut)` compares two values the same caller supplied in the same transaction, so it can never fail in practice. The real protection against a moved price is the invariant assertion, which reverts the transaction rather than bounding the output. See finding M-01.

---

## 4. The public and private boundary

Stated precisely, because this is what the project is about.

### Always public, for every circuit

- Which contract was called, which circuit, and when.
- **Every argument to every exported circuit.** This is a property of Compact's execution model, not a choice this contract made. It means `dx`, `dy`, `minOut`, `recipient`, `nonce`, and the entire `coin` struct (nonce, color, and value) are all visible to any observer.
- Every ledger write: both reserves after every swap, and every `balances` entry that changes.

### Genuinely private

- Nothing that is passed as a circuit argument. There is currently no `witness` in the production contract, so there are no private inputs at all.
- A shielded AKD coin has no standing public balance entry. While AKD is wrapped, there is no row in `balances` attributable to its holder.

### What the private swap path actually achieves

It removes the trader's `balances` write for that trade. That is a real difference from the public path and it is worth having.

It does **not** make the trade anonymous. Two separate leaks defeat that:

1. **Amount.** `reserveAKD.write(disclose(x + dx))` publishes the new reserve. The delta from the previous public value is exactly `dx`. Swap sizes are public on the private path exactly as they are on the public path. The root README concedes this and is right to.
2. **Identity.** The coin's nonce is a public circuit argument at both ends of its life. A coin minted by `wrap(amount, nonce)` publishes nonce `N` in a transaction that also writes `balances[P]` for the caller's public key `P`. When that coin is later spent via `privateSwapAkdToNight(coin, ...)`, the same nonce `N` appears in the clear. Matching on nonce equality links the "private" swap back to wallet `P` with no cryptanalysis at all. See finding H-02.

Reserves being public is not a defect: a constant-product AMM cannot do price discovery without them, and this is true on every chain. The nonce leak is a defect, and it is fixable, possibly by sourcing nonces and spent coins from a `witness` instead of a parameter.

---

## 5. Value conservation

Worth tracing, because it is where the private circuits break and the rest holds.

Total AKD lives in three places: public `balances` entries, shielded coins held by users, and shielded coins sitting in contract custody after an `unwrap` or `privateSwapAkdToNight`.

- `wrap`: public down by `amount`, shielded up by `amount`. Conserved.
- `unwrap`: shielded coin into contract custody (permanently, nothing ever re-emits it), public up by the same. Conserved.
- `transfer`, `claimFaucet`, `addLiquidity`, both public swaps: pure movement between `balances` entries. Conserved.
- `privateSwapNightToAkd`: `balances[pool]` down by `dy`, shielded up by `dy`, and `receiveUnshielded` pulls real tNIGHT in to match the `reserveNight` increase. Conserved on both sides.
- `privateSwapAkdToNight`: coin into custody, `balances[pool]` up by `dx`, and `sendUnshielded` pays real tNIGHT out to match the `reserveNight` decrease. Conserved on both sides.

So AKD accounting is sound throughout, and since the audit so is tNIGHT. Before the fix, the two private circuits wrote `reserveNight` with no matching token movement, which let the recorded reserve drift away from the contract's actual native-token holdings: the pool would quote prices against tNIGHT it did not hold, and `swapAkdToNight` would revert on its custody check whenever a payout exceeded real holdings. That was finding M-03, and removing both sources of drift closed it.

---

## 6. Structure and known weaknesses

The circuit-level separation is clean and the naming is consistent. Two structural notes a reviewer will notice:

**Duplication.** The same twelve-line block (reserve reads, bound asserts, downcasts, invariant check) appears four times, once per swap. The four copies differ only in variable bindings. This is why C-01 was hard to see by inspection: the private circuits looked identical to the public ones, and the defect was what was missing rather than what was present. Extracting one shared `pure circuit` would make any future divergence obvious. Still open.

**No fee.** The invariant has no fee term, so a round trip costs only transaction fees. Liquidity earns nothing and price manipulation is cheap.

Full list, with severities and fixes, in [SECURITY_AUDIT.md](./SECURITY_AUDIT.md).

---

## 7. Quick map for reading the source

| Lines | Contents |
| --- | --- |
| 5 to 58 | Header comments: the two-contract merge, the identity binding, the tNIGHT settlement decision, and the honest limit of the shielded path |
| 61 to 79 | Ledger declarations |
| 85 to 130 | Internal helpers: `callerKey`, `poolKey`, `faucetKey`, `balanceOf`, `hasClaimedFaucet` |
| 138 to 150 | The constructor (supply mint, `tokenColor`, `faucetAddress`) |
| 152 to 200 | `transfer`, `claimFaucet`, `akdColor` |
| 202 to 236 | `wrap`, `unwrap` |
| 238 to 278 | `addLiquidity` |
| 280 to 360 | `swapAkdToNight`, `swapNightToAkd` |
| 362 to 472 | `privateSwapAkdToNight`, `privateSwapNightToAkd` |

All four swap circuits now share the same shape: assert everything, then move value. Reading one public circuit and its private counterpart side by side is the quickest way to see what the private path does and does not change.
