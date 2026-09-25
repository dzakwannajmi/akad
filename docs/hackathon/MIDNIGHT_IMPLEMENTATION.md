# How Akad Uses Midnight

What is proven, what is disclosed, what stays private, and why privacy matters for this use case.

This document describes `contracts/src/akad.compact` at tag `v1-snight` (670 lines); line numbers refer to that file. On-chain claims point to transactions in the root README's [Verified transactions](../../README.md#verified-transactions). Some comments inside the source still describe removed circuits; [ARCHITECTURE.md](./ARCHITECTURE.md) lists them, and this document follows the code.

---

## 1. Why privacy matters for an AMM

On a transparent chain, a swap publishes the trader's address next to the amount and direction of their trade, permanently. For a token that anyone actually holds, that is a running public record of who owns what and who is accumulating or exiting. Traders are front-run because their intent is visible in the mempool, and holders are profiled because their balance is a public row keyed to their address.

An AMM cannot fix all of this, and Akad does not claim to. Pool reserves have to be public: a constant-product market maker prices trades from its reserves, so hiding them removes price discovery entirely. That is true on every chain, and it means **swap amounts are inherently public on any public-reserve AMM**, including this one.

Akad addresses the part that is not structural: **a standing public balance keyed to your wallet, and your address on a trade.** Midnight's shielded pool lets a user hold AKD as a shielded coin instead of a public balance row. sNIGHT, a shielded claim on tNIGHT the contract holds, lets that coin trade against a shielded tNIGHT position with no address in the transaction.

That is the honest scope: **privacy of custody and of the trader's identity on the shielded side, not privacy of the trade amount.**

---

## 2. Midnight and Compact features used

| Feature | Where | What it does here |
| --- | --- | --- |
| `ownPublicKey()` | `callerKey()`, lines 168 to 170; mint recipient in `wrap` and both shielded swaps | Binds caller identity to the wallet's real Zswap public key, protocol-enforced, not client-declared |
| `tokenType()` + `kernel.self()` | `currentTokenColor()`, lines 202 to 205; `currentNightColor()`, lines 212 to 215 | Derives the AKD and sNIGHT token types from this contract's own address, so neither can be confused with another contract's token. Must run inside a circuit: in a constructor `kernel.self()` does not return the deployed address (lines 192 to 201) |
| `witness` | `coinNonce()` and `spentCoin()`, lines 100 and 101 | Supplies coin material from the caller's private state instead of circuit arguments |
| `mintShieldedToken()` | `wrap` line 350, `shieldedSwapAkdToNight` line 620, `shieldedSwapNightToAkd` line 669 | Mints native Zswap shielded coins, rather than a hand-rolled commitment scheme |
| `receiveShielded()` | `unwrap` line 364, `unwrapNight` line 549, `shieldedSwapAkdToNight` line 600, `shieldedSwapNightToAkd` line 655 | Accepts a shielded coin into contract custody, with authenticity and unspent-ness enforced by Zswap |
| `receiveUnshielded()` + `nativeToken()` | `addLiquidity` line 408, `swapNightToAkd` line 489 | Pulls real tNIGHT into the contract's own on-chain custody |
| `sendUnshielded()` + `nativeToken()` | `swapAkdToNight` line 455, `unwrapNight` line 553 | Pays real tNIGHT out of custody to a recipient address |
| `unshieldedBalanceGte()` | `swapAkdToNight` line 431, `unwrapNight` line 547 | Confirms the contract holds the tNIGHT it is about to pay, before committing to the payout |
| `constructor()` | lines 249 to 260 | Mints the supply at deploy time, so there is no separate initialisation call for an attacker to front-run |
| `persistentHash<Uint<8>>()` | `poolKey`, `faucetKey`, colour domain separators | Fixed, collision-resistant account identifiers for the pool and faucet, and domain separation between the AKD and sNIGHT token types |
| `Map.member()` before `.lookup()` | `balanceOf`, `hasClaimedFaucet` | Safe reads, since Compact's `lookup` fails rather than defaulting on an absent key |
| `disclose()` | Throughout | Compiler-checked marking of every value derived from a witness or argument that flows into ledger state or a token primitive |

The deliberate choice worth calling out: **Akad uses Midnight's native shielded-coin infrastructure rather than building its own privacy scheme on top of a public contract.** A wrapped AKD balance is a real Zswap coin in the wallet, not a commitment in a map that this contract invented. Nullifier generation, double-spend prevention and the commitment construction are Midnight protocol code, not application code. The contract implements no nullifier scheme of its own, and does not need to.

---

## 3. What is proven

Every exported circuit is a ZK proof that its assertions held. The load-bearing ones:

**Token type binding.** `unwrap`, `unwrapNight` and both shielded swaps assert the spent coin's colour against `currentTokenColor()` or `currentNightColor()` before accepting it (lines 363, 540, 578 and 626). `receiveShielded` verifies that a coin is authentic and unspent, but *not* which token it is. Without the check, a shielded coin of any colour could be unwrapped into AKD at par, or passed off as sNIGHT to drain custody. The colours are recomputed in-circuit from the contract's own address, not read from the ledger, so no stored value can mislead the check.

**Constant-product invariant.** All four swap circuits prove `(x + dx) * (y - dy) >= x * y` before writing any state (lines 438, 478, 598 and 646). The comparison is in the pool's favour, so integer rounding accumulates to the pool and repeated small trades cannot drain value.

**Balance sufficiency.** Every debit proves the account holds the amount first: `senderBalance >= amount` in `transfer` (line 267), `balance >= amount` in `wrap` (line 339), `builderBalance >= amountAKD` in `addLiquidity` (line 393), `traderBalance >= dx` in `swapAkdToNight` (line 442), `poolBalance >= dy` in the circuits that pay AKD out of the pool (lines 482 and 650), and `faucetBalance >= 50000000` in `claimFaucet` (line 291).

**Custody and supply sufficiency.** `swapAkdToNight` and `unwrapNight` prove `unshieldedBalanceGte(nativeToken(), amount)` before paying tNIGHT (lines 431 and 547). `unwrapNight` and `shieldedSwapNightToAkd` prove `sNightSupply` covers the sNIGHT being returned (lines 546 and 653).

**One-shot guards.** `addLiquidity` proves both reserves are zero (line 382); `claimFaucet` proves the caller has not claimed before (line 287). The supply mint needs no guard at all, because it happens in the constructor and cannot run twice.

**Arithmetic bounds.** Each `Uint<64>` downcast in the swap circuits follows the bound assertions that make it safe (for example lines 429 and 430 before 433 to 436), and `wrap` asserts `amount` fits `Uint<64>` before minting (line 341).

---

## 4. What is disclosed, and what is private

### Public to any observer

- Which contract and circuit were called, and when. The indexer records the entry point of every call.
- All ledger writes: both reserves after every swap, `sNightSupply` after every shielded swap and redemption, and every public `balances` entry that changes, keyed by the wallet's public key when the caller's balance moves.
- Every unshielded input and output, with address and amount: the caller's tNIGHT in `addLiquidity` and `swapNightToAkd`, the payout in `swapAkdToNight` and `unwrapNight`.
- Therefore **every swap's size and direction**, on the shielded path as much as the public one, because the reserve delta is exactly `dx`.

### Circuit arguments are not published in plaintext

An earlier version of this document claimed that a coin's nonce appeared in the clear at both ends of its life, so an observer could match on nonce equality and link a shielded coin to the wallet that created it. **The project tested that claim against live transactions on 14 Sep 2026 and it is false.** The full method, controls and data are in [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) under "H-02 refuted on chain". In short: every transaction of a pre-refactor deployment, which did take the nonce as a circuit argument, was enumerated, and the nonce of a coin minted by it appears in none of them, while a control value known to be present turned up every time.

Circuit arguments are public inputs to the circuit's proof. They are not serialised in plaintext into the transaction. An on-chain `ContractCall` carries an address, an entry point, the guaranteed and fallible transcripts, a communication commitment, and the proof. Arguments reach the verifier through `communicationCommitment(input, output, rand)`, which is randomised and therefore hiding. An argument still becomes public when its value reaches a public channel: `dx` and `dy` through the reserve deltas, `recipient` through the payout output.

### Private

- **No standing public balance for shielded holdings.** While AKD or sNIGHT is held as a Zswap coin, no `balances` row is attributable to its holder. `wrap` and `unwrap` transactions carry zero unshielded inputs and outputs (Preprod `884a3dbf…6383fb` and `22d9c167…491a3c`).
- **The coin's owner is not written anywhere by this contract.** `mintShieldedToken` sends to `ownPublicKey()`, and the recipient lives inside the Zswap commitment, not in a ledger field.
- **The trader on a shielded swap.** Neither shielded swap reads `callerKey()` or writes a trader balance, and neither has an unshielded input or output. All six shielded swaps recorded on the two deployments show zero unshielded inputs and outputs (for example Preprod `9b327947…25f3de` and `db36fb34…60de7f`).

### What an observer can still infer

1. **Trade size and direction**, from the reserve deltas, as above.
2. **Links by amount.** A shielded swap spends a whole coin, so its trade size equals the value of the coin it spent. A `wrap` of amount X shortly before a shielded swap of size X is an obvious candidate pair, and an sNIGHT coin of value `dy` later redeemed through `unwrapNight` publishes that same amount next to the recipient address. Timing narrows the candidates further. The protection is only as large as the set of same-value coins in flight. **Limitation.**
3. **Entry and exit.** `wrap` and `unwrap` write the caller's balance entry. `unwrapNight` publishes the recipient address and the amount, the same way `sendUnshielded` always does. Getting from plain tNIGHT to sNIGHT goes through `swapNightToAkd`, which spends from the trader's address.

### Before sNIGHT

The shielded swaps replace `privateSwapAkdToNight` and `privateSwapNightToAkd`, which settled tNIGHT through `sendUnshielded` and `receiveUnshielded`. On an earlier Preprod deployment, a block explorer rendered the trader's unshielded address in both directions:

```text
privateSwapAkdToNight   created output   mn_addr_prepro…9xrqm0l9eh    20.15355 NIGHT
privateSwapNightToAkd   spent input      mn_addr_prepro…9xrqm0l9eh     1,807 NIGHT
                        created output   mn_addr_prepro…9xrqm0l9eh     1,786 NIGHT
```

The same address appears in both, so the two swaps were linkable to each other and to one wallet. That exposure is why the private circuits were removed and why sNIGHT exists.

### Why coin material comes from a witness

The contract sources coin nonces and spent coins from `witness` rather than from circuit arguments, and that refactor was kept after the finding that motivated it was refuted. The reasons are narrower but real, and they are stated here so no reader mistakes them for a vulnerability fix:

- **Fewer public inputs to each proof.** `wrap` drops from 3 to 1, `unwrap` from 5 to 0. Reproducible from a clean clone with `node scripts/zk-public-inputs.mjs`.
- **The contract no longer trusts caller-supplied coin material.** A nonce arriving as an argument is a value the contract accepts; a nonce arriving from private state is one the wallet owns.
- **No frontend defect can leak coin material through an argument list**, because there is no longer an argument to leak.

None of that closed a hole. It is hardening, and this project does not claim otherwise.

---

## 5. Settlement status, stated plainly

| Circuit | AKD leg | tNIGHT or sNIGHT leg | Preprod transaction |
| --- | --- | --- | --- |
| `addLiquidity` | Builder's public balance into pool custody | Real tNIGHT in (`receiveUnshielded`) | `5113e29d…d4094d` |
| `swapAkdToNight` | Trader's public balance into pool custody | Real tNIGHT out (`sendUnshielded`, guarded by `unshieldedBalanceGte`) | `1db59292…de4ec7` |
| `swapNightToAkd` | Pool custody to trader's public balance | Real tNIGHT in (`receiveUnshielded`) | `272d0be6…43bbb4` |
| `shieldedSwapAkdToNight` | Shielded AKD coin into custody | Shielded sNIGHT coin minted; tNIGHT stays in custody | `9b327947…25f3de` |
| `shieldedSwapNightToAkd` | Shielded AKD coin minted from pool custody | Shielded sNIGHT coin into custody | `db36fb34…60de7f` |
| `unwrapNight` | None | sNIGHT coin in, real tNIGHT out (`sendUnshielded`, guarded by `unshieldedBalanceGte`) | `1f502679…12cc41` |

Every leg is real, and each row has run on Preprod with status `SUCCESS`. The tNIGHT legs use Compact's native unshielded-token primitives; the shielded legs use native Zswap coins.

Private settlement of the native token itself remains out of reach: a contract can only mint tokens of its own colour, and tNIGHT is always public. sNIGHT is how this contract works around that. It is a shielded 1:1 claim backed by tNIGHT in custody, with the solvency invariant `custody == reserveNight + sNightSupply` (see [ARCHITECTURE.md](./ARCHITECTURE.md), section 3). The price is that sNIGHT is a claim on this contract rather than tNIGHT, and that entering and leaving the shielded side stays public.

---

## 6. Summary for a reviewer

**What Akad demonstrates well.** Native Zswap shielded coins used for their intended purpose rather than a hand-rolled commitment scheme. Contract-bound token types that make cross-token confusion impossible. Protocol-bound caller identity. Real native-token settlement with a custody check before every payout. A shielded swap path that moves both legs as shielded coins and publishes no address, backed by a custody invariant anyone can check from public state.

**What it does not achieve.** Trade-amount privacy, which is structural to any public-reserve AMM and conceded throughout these docs. Unlinkability against amount matching, since a shielded swap spends a whole coin (section 4). Private entry and exit: `wrap`, `unwrap`, `unwrapNight` and the public swaps all reveal an identity or an address.

**What it got wrong and corrected.** This document previously claimed shielded coins were linkable through their nonce. That was an inference from platform documentation, never tested, and testing disproved it. The correction is recorded rather than quietly edited away, in [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) under "H-02 refuted on chain", because a reviewer's question about a privacy project should be how its claims were checked, not how confident they sound.

**What changed after the audit.** `init()` is gone, replaced by a constructor, so the supply mint cannot be front-run. The two private swap circuits, first missing their tNIGHT leg and then publishing the trader's address, were removed and replaced by the sNIGHT pair. What remains open is listed in [ARCHITECTURE.md](./ARCHITECTURE.md), section 6. None of it lets one party take another's funds; the seeded liquidity itself can never be withdrawn (L-02).
