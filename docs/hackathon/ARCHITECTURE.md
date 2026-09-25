# Akad Contract Architecture

Written for a reviewer seeing this contract for the first time. No prior context with the project is assumed.

Everything here describes `contracts/src/akad.compact` at tag `v1-snight`: 670 lines, one file, compiler 0.31.1, language 0.23.0, runtime 0.16.0. Line numbers refer to that file. The contract is deployed on Preview (`676fb20d…9d636ae`) and Preprod (`2689c5c2…f179a51a`), and every circuit that has run on either deployment has a transaction hash in the root README's [Verified transactions](../../README.md#verified-transactions).

Some comments inside the source still describe code that has since been removed, for example lines 43 to 46, 83, 89, 108, 145 to 146 and 320, which mention `privateSwapAkdToNight`, `init()` or `wrapNight()`. The v1 contract is frozen as a reference, so those comments stay as they are. Where a comment and this document disagree, this document follows the code.

---

## 1. What the contract is

A constant-product automated market maker (`x * y = k`) for one pair: **AKD**, a fungible token this contract issues and accounts for itself, against **tNIGHT**, Midnight's native testnet token. A second token, **sNIGHT**, is a shielded 1:1 claim on tNIGHT the contract holds, so a trade can run shielded coin against shielded coin.

The contract is also the AKD token. There is no separate token contract, and that is deliberate: a swap circuit that needs to debit a trader's balance held in a *different* contract has no verified-safe authorisation pattern in Compact today, because a callee circuit that reads a witness is disqualified from cross-contract calls. Merging the token ledger and the AMM into one contract sidesteps the problem rather than shipping an unverified authorisation shortcut.

AKD uses **6 decimals**, so 1 AKD is 1,000,000 base units. Every number in this document is in base units unless stated otherwise.

---

## 2. Ledger state

Nine exported fields. All of them are public, readable by anyone, which is normal for Midnight: ledger state is the public half of the contract.

| Field | Type | Written by | Purpose |
| --- | --- | --- | --- |
| `balances` | `Map<Bytes<32>, Uint<128>>` | constructor, `transfer`, `claimFaucet`, `wrap`, `unwrap`, `addLiquidity`, all four swaps | Public AKD balances, keyed by account identifier |
| `totalSupply` | `Uint<128>` | constructor only | Fixed at 1,000,000,000,000 (1,000,000 AKD) |
| `tokenColor` | `Bytes<32>` | `recordTokenColor` | AKD's shielded token type, stored for the frontend to read. No circuit trusts it |
| `faucetAddress` | `Bytes<32>` | constructor only | The faucet's custody account, exposed so the frontend can read it without a transaction |
| `reserveAKD` | `Uint<128>` | `addLiquidity`, all four swaps | AKD side of the pool |
| `reserveNight` | `Uint<128>` | `addLiquidity`, all four swaps | tNIGHT side of the pool |
| `sNightColor` | `Bytes<32>` | `recordTokenColor` | sNIGHT's shielded token type, stored for the frontend to read |
| `sNightSupply` | `Uint<128>` | both shielded swaps, `unwrapNight` | sNIGHT outstanding |
| `faucetClaimed` | `Map<Bytes<32>, Boolean>` | `claimFaucet` | Which wallets have claimed from the faucet |

### Account identifiers

`balances` is keyed by a 32 byte account identifier that comes from one of three places:

- **A real wallet.** `callerKey()` (lines 168 to 170) returns `disclose(ownPublicKey().bytes)`, the caller's actual Zswap public key. The protocol binds it, so the client cannot spoof it. An earlier version of this contract accepted a self-declared account identifier as a witness, which let any client claim to be any account; that hole is closed.
- **The pool.** `poolKey()` (lines 176 to 178) returns `persistentHash<Uint<8>>(7)`, a fixed constant. The pool's AKD reserves sit in the same `balances` map as everyone else's, under this key.
- **The faucet.** `faucetKey()` (lines 185 to 187) returns `persistentHash<Uint<8>>(11)`, likewise fixed. The builder tops the faucet up by calling ordinary `transfer()` with this address.

Using hash constants for the pool and faucet means neither can collide with a real wallet key, and neither needs a private key to hold a balance.

### Token colours

AKD and sNIGHT are shielded token types derived from a domain separator and this contract's own address: `currentTokenColor()` (lines 202 to 205, separator `persistentHash<Uint<8>>(42)`) and `currentNightColor()` (lines 212 to 215, separator `43`). The two separators differ, so a coin of one token can never pass for the other.

Both helpers must run inside a circuit. `kernel.self()` does not return the deployed address when it runs in a constructor, so a colour derived there matches no real coin; lines 192 to 201 record the Preprod deployment where that happened. Every circuit that accepts a coin recomputes the colour through these helpers. The `tokenColor` and `sNightColor` fields exist only so the frontend can read the colours without a transaction.

### Reading balances safely

Compact's `Map.lookup()` fails at runtime on a key that has never been inserted, rather than returning a default. Every balance read therefore goes through `balanceOf()` (lines 224 to 229), which checks `.member()` first and returns 0 otherwise. `hasClaimedFaucet()` (lines 235 to 240) does the same for `faucetClaimed`.

### Private inputs

Two witnesses (lines 100 and 101) supply coin material from the caller's private state instead of from circuit arguments:

- `coinNonce(): Bytes<32>`, the randomness for a coin the contract mints (`wrap`, both shielded swaps).
- `spentCoin(): ShieldedCoinInfo`, the coin the contract receives (`unwrap`, `unwrapNight`, both shielded swaps).

Neither value is a public input to the proof. `unwrap` has zero public inputs, which anyone can reproduce with `node scripts/zk-public-inputs.mjs`.

---

## 3. Circuits

Eleven exported circuits plus a constructor. Seven helpers (`callerKey`, `poolKey`, `faucetKey`, `currentTokenColor`, `currentNightColor`, `balanceOf`, `hasClaimedFaucet`) are internal and not callable from outside. The public-input counts below come from the compiled zkir (`node scripts/zk-public-inputs.mjs contracts/managed/akad/zkir`).

### Setup and token basics

| Circuit | Signature | Lines | Public inputs | What it does |
| --- | --- | --- | --- | --- |
| *(constructor)* | n/a | 249 to 260 | n/a | Runs inside the deploy transaction: mints the entire 1,000,000 AKD supply to the deployer and stores `faucetAddress`. Not callable afterwards |
| `transfer` | `(to, amount)` | 263 to 275 | 3 | Ordinary public balance transfer |
| `claimFaucet` | `()` | 285 to 301 | 0 | One-time-per-wallet claim of 50 AKD from the faucet's custody account |
| `recordTokenColor` | `()` | 323 to 326 | 0 | Writes `tokenColor` and `sNightColor`. No access control and no one-shot guard: every caller writes the same bytes |

**Reviewer note:** the supply mint used to be an exported `init()` circuit guarded only by `assert(totalSupply.read() == 0)`. Since deployment and the first circuit call are separate transactions on Midnight, anyone watching new deployments could call `init()` first and take the entire supply. Moving the work into a constructor removes the race by removing the entry point (finding H-03). The CI `contract-compile` job fails the build if `init` ever reappears in the compiled circuit set. An exported `akdColor()` circuit was also removed, since nothing called it and every exported circuit adds a verifier key to the deploy transaction (lines 303 to 309, finding I-04).

### The shielded AKD bridge

| Circuit | Signature | Lines | Public inputs | What it does |
| --- | --- | --- | --- | --- |
| `wrap` | `(amount)` | 335 to 351 | 1 | Debits the caller's public balance and mints a native Zswap shielded coin of the same value to them, with its nonce from `coinNonce()` |
| `unwrap` | `()` | 361 to 372 | 0 | Takes the coin from `spentCoin()` into contract custody and credits the caller's public balance with its value |

Both directions are 1:1: public balance decreases exactly as shielded supply increases, and the reverse.

`unwrap` asserts `coin.color == currentTokenColor()` before crediting anything (line 363). This check is load-bearing. `receiveShielded` verifies that a coin is authentic and unspent, but not *which* token it is, so without the colour check any shielded coin of any type could be unwrapped into AKD at par.

Zswap prevents double spends of these coins at the protocol layer. The contract implements no nullifier scheme of its own and does not need one.

### Liquidity

| Circuit | Signature | Lines | Public inputs | What it does |
| --- | --- | --- | --- | --- |
| `addLiquidity` | `(amountAKD, amountNight)` | 378 to 412 | 2 | One-shot pool seed. Moves the builder's AKD into pool custody and pulls real tNIGHT in via `receiveUnshielded` |

Callable once (guarded by `reserveAKD == 0 && reserveNight == 0`, line 382). No LP tokens, single provider, and **no inverse**: seeded liquidity cannot be withdrawn in this version.

Both amounts are capped at 4,000,000,000 base units (4,000 AKD). The cap exists because the invariant check downcasts to `Uint<64>` before multiplying, and `4e9 * 4e9` stays under `Uint<64>::MAX`. Note the scale mismatch: the cap is 0.4% of the minted supply.

### The swaps

Four circuits, two axes: direction (AKD in or tNIGHT in) and path (public or shielded).

| Circuit | Lines | Public inputs | Value in | Value out |
| --- | --- | --- | --- | --- |
| `swapAkdToNight(dx, dy, minOut, recipient)` | 420 to 456 | 5 | `dx` from the trader's public AKD balance to `balances[pool]` | `dy` real tNIGHT from pool custody to `recipient` via `sendUnshielded`, after `unshieldedBalanceGte` confirms the custody |
| `swapNightToAkd(dx, dy, minOut)` | 461 to 501 | 3 | `dx` real tNIGHT from the trader into pool custody via `receiveUnshielded` | `dy` from `balances[pool]` to the trader's public balance |
| `shieldedSwapAkdToNight(dy, minOut)` | 576 to 621 | 2 | A shielded AKD coin from `spentCoin()`, whose whole value is `dx`, into custody; `balances[pool]` rises by `dx` | A new shielded sNIGHT coin worth `dy`; `sNightSupply` rises by `dy` |
| `shieldedSwapNightToAkd(dy, minOut)` | 624 to 670 | 2 | A shielded sNIGHT coin from `spentCoin()`, whose whole value is `dx`, into custody; `sNightSupply` falls by `dx` | A new shielded AKD coin worth `dy` from `balances[pool]` |

All four share the same core: read reserves, assert bounds, downcast to `Uint<64>`, assert `(x + dx) * (y - dy) >= x * y`, then move value. In the shielded swaps every assertion, including the colour check, runs before `receiveShielded()` claims the coin (lines 600 and 655), so no assertion in the circuit can fail after the coin is claimed.

A shielded swap spends the whole coin: `dx` is the coin's value (lines 580 and 628), and the circuit makes no change coin. Section 4 explains what that lets an observer infer.

**Reviewer note.** The shielded swaps replace two earlier circuits, `privateSwapAkdToNight` and `privateSwapNightToAkd`. Those first shipped without a tNIGHT leg at all (findings C-01 and H-01, including a worked pool drain), then settled tNIGHT through `sendUnshielded`/`receiveUnshielded`, which published the trader's unshielded address on every call. Both were removed rather than patched further.

### sNIGHT and the solvency invariant

tNIGHT cannot be private: its balances and transfers are always public, and the contract cannot mint a shielded version of the network's own token. sNIGHT is the workaround. The contract mints it only in `shieldedSwapAkdToNight`, against `reserveNight`, and takes it back in `shieldedSwapNightToAkd` or redeems it for real tNIGHT in `unwrapNight(recipient)` (lines 538 to 554). A `wrapNight()` circuit that minted sNIGHT directly from tNIGHT was removed to stay inside the deploy transaction's block limits (lines 509 to 528). A holder of plain tNIGHT reaches the shielded side through the public swap first.

The contract maintains one invariant between tNIGHT custody (the contract's unshielded balance) and two ledger fields:

```text
tNIGHT custody  ==  reserveNight + sNightSupply
```

| Circuit | Custody | `reserveNight` | `sNightSupply` |
| --- | --- | --- | --- |
| `addLiquidity` | `+amountNight` | `+amountNight` | 0 |
| `swapAkdToNight` | `-dy` | `-dy` | 0 |
| `swapNightToAkd` | `+dx` | `+dx` | 0 |
| `shieldedSwapAkdToNight` | 0 | `-dy` | `+dy` |
| `shieldedSwapNightToAkd` | 0 | `+dx` | `-dx` |
| `unwrapNight` | `-amount` | 0 | `-amount` |

Every row changes custody by the sum of its changes to the two fields, so the invariant holds after every circuit. On 25 Sep 2026 the contract state read from the indexer matched it on both deployments: Preview custody 1,036,733,773 against `reserveNight` 1,036,733,773 and `sNightSupply` 0 (state after transaction `5d1bb0d5…c8bcfb`), Preprod custody 907,777,805 against `reserveNight` 907,777,805 and `sNightSupply` 0 (state after `cc27010c…4a1db7`).

`unwrapNight` still asserts custody explicitly (line 547) before `receiveShielded()` claims the coin (line 549), so an accounting bug would fail a redemption rather than spend the pool's reserve.

The cost: sNIGHT is a claim on this contract, not tNIGHT itself. It is only as good as the custody backing it.

### Who computes the price

Nobody, on-chain. The frontend computes `dy` off-chain from the public reserves and passes it in as a circuit argument. The contract does not derive the output; it only checks that the proposed `(dx, dy)` pair does not decrease `k`.

This has a direct consequence for slippage: `assert(dy >= minOut)` compares two values the same caller supplied in the same transaction, so it cannot fail in practice. The real protection against a moved price is the invariant assertion, which reverts the transaction rather than bounding the output. See finding M-01.

---

## 4. The public and private boundary

Stated precisely, because this is what the project is about.

### Public to any observer

- Which contract was called, which circuit, and when. The indexer records the entry point of every call.
- Every ledger write: both reserves after every swap, every `balances` entry that changes (keyed by a wallet's public key when the caller's balance moves), and `sNightSupply` after every shielded swap and redemption.
- Every unshielded input and output, with its address and amount. `addLiquidity` and `swapNightToAkd` spend the caller's tNIGHT; `swapAkdToNight` and `unwrapNight` pay tNIGHT to a recipient address. The root README lists the count per transaction.

### Circuit arguments

Circuit arguments are public inputs to the circuit's proof. They are not serialised in plaintext into the transaction: an on-chain `ContractCall` binds them through a randomised communication commitment. The project tested this against every transaction of a live deployment (SECURITY_AUDIT.md, "H-02 refuted on chain").

An argument still becomes public when its value reaches a public channel. `dx` and `dy` show up in the reserve deltas, `recipient` in the payout output, and the `wrap` amount in the caller's balance change.

### Private

- **Witness values.** The mint nonce and the spent coin never appear as public inputs.
- **Shielded holdings.** While AKD or sNIGHT is held as a Zswap coin, no `balances` row is attributable to its holder.
- **The trader on a shielded swap.** Neither shielded swap calls `callerKey()` or writes a trader balance, and neither has an unshielded input or output. All six shielded swaps recorded on the two deployments show `0 / 0` unshielded inputs and outputs.

### What an observer can infer

1. **Trade size.** The reserve deltas equal `dx` and `dy` on every swap, shielded or not, and `sNightSupply` moves by the same amount on a shielded swap. A constant-product AMM cannot price trades without public reserves, so this holds on every chain.
2. **Amount matching.** A shielded swap spends a whole coin, so its trade size equals the value of the coin it spent. A `wrap` of amount X followed by a shielded swap of size X is an obvious candidate pair. Likewise an sNIGHT coin minted as `dy` and later redeemed through `unwrapNight` publishes that same amount next to the recipient address. Timing narrows the candidates further. The protection is only as large as the set of same-value coins in flight. **Limitation.**
3. **Entry and exit.** `wrap` and `unwrap` write the caller's balance entry, so they reveal the caller's public key and the amount. `unwrapNight` publishes the recipient address and amount. Reaching sNIGHT from plain tNIGHT goes through the public swap, which spends from the trader's address.

---

## 5. Value conservation

Total AKD lives in two places: public `balances` entries and shielded AKD coins held by users. Coins the contract receives stay in contract custody and are never re-emitted (finding L-04); each receipt is matched by an equal `balances` credit.

- `wrap`: public down by `amount`, a new shielded coin of `amount`. Conserved.
- `unwrap`: the coin goes into custody, public up by its value. Conserved.
- `shieldedSwapAkdToNight`: the coin goes into custody, `balances[pool]` up by `dx`. Conserved.
- `shieldedSwapNightToAkd`: `balances[pool]` down by `dy`, a new shielded AKD coin of `dy`. Conserved.
- `transfer`, `claimFaucet`, `addLiquidity`, both public swaps: pure movement between `balances` entries. Conserved.

tNIGHT and sNIGHT follow the solvency invariant in section 3.

---

## 6. Structure and known weaknesses

The circuit-level separation is clean and the naming is consistent. Structural notes a reviewer will notice:

- **Duplication.** The same block (reserve reads, bound asserts, downcasts, invariant check) appears in all four swaps: lines 433 to 438, 473 to 478, 593 to 598 and 641 to 646 hold the downcasts and the invariant. Extracting one shared `pure circuit` would make any future divergence obvious. Still open.
- **No fee** (L-01). The invariant has no fee term, so a round trip costs only transaction fees. Liquidity earns nothing and price manipulation is cheap.
- **Ineffective `minOut`** (M-01), described above.
- **Reserve cap** (M-05). The 4,000,000,000 cap halts the AKD-in direction once `reserveAKD` nears it, until someone trades the other way.
- **Unvalidated `recipient`** in `swapAkdToNight` (M-04). The payout goes wherever the caller says.
- **No `removeLiquidity`** (L-02), a **sybil-farmable faucet** (L-03) and **custodied coins never re-emitted** (L-04).
- **Stale source comments**, listed at the top of this document.

The finding IDs refer to [SECURITY_AUDIT.md](./SECURITY_AUDIT.md), which audited an earlier version of this contract; the findings named here still apply to the current code.

---

## 7. Quick map for reading the source

| Lines | Contents |
| --- | --- |
| 5 to 77 | Header comments: the two-contract merge, the identity binding, tNIGHT settlement, and the witness rationale (parts describe removed circuits) |
| 79 to 101 | Witnesses `coinNonce` and `spentCoin` |
| 103 to 162 | Ledger declarations, the sNIGHT rationale and the solvency invariant |
| 164 to 240 | Internal helpers |
| 242 to 260 | The constructor |
| 262 to 326 | `transfer`, `claimFaucet`, the `akdColor` removal note, `recordTokenColor` |
| 328 to 372 | `wrap`, `unwrap` |
| 374 to 412 | `addLiquidity` |
| 414 to 501 | `swapAkdToNight`, `swapNightToAkd` |
| 503 to 554 | The sNIGHT boundary: the `wrapNight` removal note, `unwrapNight` |
| 556 to 670 | `shieldedSwapAkdToNight`, `shieldedSwapNightToAkd` |

Reading `swapAkdToNight` next to `shieldedSwapAkdToNight` is the quickest way to see what the shielded path changes: the invariant block is the same, and only the value movements differ.
