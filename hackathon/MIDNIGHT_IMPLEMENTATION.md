# How Akad Uses Midnight

What is proven, what is disclosed, what stays private, and why privacy matters for this use case.

This document reuses the framing already drafted in the root `README.md` "Privacy Model" section and `contracts/README.md` "Design notes", with two claims corrected. Those corrections are marked inline and explained in [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) (findings H-02 and M-02). Where this document and the developer-facing READMEs disagree, this one follows the source code.

---

## 1. Why privacy matters for an AMM

On a transparent chain, a swap publishes the trader's address next to the amount and direction of their trade, permanently. For a token that anyone actually holds, that is a running public record of who owns what and who is accumulating or exiting. Traders are front-run because their intent is visible in the mempool, and holders are profiled because their balance is a public row keyed to their address.

An AMM cannot fix all of this, and Akad does not claim to. Pool reserves have to be public: a constant-product market maker prices trades from its reserves, so hiding them removes price discovery entirely. That is true on every chain, and it means **swap amounts are inherently public on any public-reserve AMM**, including this one.

What Akad does address is the part that is not structural: **a standing, permanently public balance keyed to your wallet address**. Holding a token should not require publishing your position to everyone, forever, just because you might want to trade it later. Midnight's shielded pool makes it possible to hold the token without that public row, and Akad's contribution is wiring a normal AMM to that capability so a user can choose, per holding, whether their balance is a public ledger entry or a shielded coin.

That is the honest scope: **privacy of custody, not privacy of the trade.**

---

## 2. Midnight and Compact features used

| Feature | Where | What it does here |
|---|---|---|
| `ownPublicKey()` | `callerKey()`, line 74 | Binds caller identity to the wallet's real Zswap public key, protocol-enforced, not client-declared |
| `tokenType()` + `kernel.self()` | constructor, line 146 | Derives a shielded token type bound to this contract's own address, so AKD coins cannot be confused with another contract's token. Both work inside a Compact constructor, confirmed by compile |
| `mintShieldedToken()` | `wrap` line 201, `privateSwapNightToAkd` line 432 | Mints native Zswap shielded coins, rather than a hand-rolled commitment scheme |
| `receiveShielded()` | `unwrap` line 208, `privateSwapAkdToNight` line 356 | Accepts a shielded coin into contract custody, with authenticity and unspent-ness enforced by Zswap |
| `receiveUnshielded()` + `nativeToken()` | `addLiquidity`, `swapNightToAkd`, `privateSwapNightToAkd` | Pulls real tNIGHT into the contract's own on-chain custody |
| `sendUnshielded()` + `nativeToken()` | `swapAkdToNight`, `privateSwapAkdToNight` | Pays real tNIGHT out of pool custody to the trader |
| `unshieldedBalanceGte()` | `swapAkdToNight`, `privateSwapAkdToNight` | Confirms the pool actually holds the tNIGHT it is about to pay, before committing to the payout |
| `constructor()` | lines 138 to 150 | Mints the supply at deploy time, so there is no separate initialisation call for an attacker to front-run |
| `persistentHash<Uint<8>>()` | `poolKey`, `faucetKey`, domain separators | Fixed, collision-resistant account identifiers for the pool and faucet, and domain separation for the token type |
| `Map.member()` before `.lookup()` | `balanceOf`, `hasClaimedFaucet` | Safe reads, since Compact's `lookup` fails rather than defaulting on an absent key |
| `disclose()` | Throughout | Explicit, compiler-checked marking of every value that crosses from the circuit into public ledger state |

The deliberate choice worth calling out: **Akad uses Midnight's native shielded-coin infrastructure rather than building its own privacy scheme on top of a public contract.** A wrapped AKD balance is a real Zswap coin in the wallet, not a commitment in a map that this contract invented. Nullifier generation, double-spend prevention, and the commitment construction are all protocol code that has been audited, not application code written for a hackathon. The contract implements no nullifier scheme of its own, and correctly does not need to.

---

## 3. What is proven

Every exported circuit is a ZK proof that its assertions held. The load-bearing ones:

**Token type binding.** `unwrap` and `privateSwapAkdToNight` both assert `coin.color == tokenColor.read()` before crediting anything. This matters more than it looks: `receiveShielded` verifies that a coin is authentic and unspent, but *not* which token it is. Without the check, a shielded coin of any color could be unwrapped into AKD at par and re-wrapped as an indistinguishable real AKD coin. The check binds acceptance to `tokenType(domainSep, kernel.self())`, which is derived from this contract's own address and cannot be forged by another contract. This gap existed in an earlier version of `unwrap` and was found and fixed during development.

**Constant-product invariant.** All four swap circuits prove `(x + dx) * (y - dy) >= x * y` before writing any state. The comparison is in the pool's favour, so integer rounding accumulates to the pool and repeated small trades cannot drain value.

**Balance sufficiency.** Every debit proves the account holds the amount first: `senderBalance >= amount` in `transfer`, `traderBalance >= dx` in `swapAkdToNight`, `poolBalance >= dy` in the pool-paying circuits, `faucetBalance >= 50000000` in `claimFaucet`.

**Custody sufficiency.** `swapAkdToNight` proves `unshieldedBalanceGte(nativeToken(), dy)` before promising a payout, so the contract cannot commit to sending tNIGHT it does not hold.

**One-shot guards.** `addLiquidity` proves both reserves are zero; `claimFaucet` proves the caller has not claimed before. The supply mint needs no guard at all, because it happens in the constructor and cannot be called twice.

**Arithmetic safety.** Every downcast to `Uint<64>` is preceded by the bound assertion that makes it safe, and every subtraction by the comparison that prevents underflow. The audit found no overflow or underflow.

---

## 4. What is disclosed, and what is private

This is the section the developer-facing README gets partly wrong. The corrected version:

### Public to any observer

- Which contract and circuit were called, and when.
- **Every argument of every exported circuit.** In Compact, circuit arguments are part of the public transcript. For this contract that means `dx`, `dy`, `minOut`, `recipient`, `nonce`, and the whole `coin` struct (nonce, color, and value) are all visible.
- All ledger writes: both reserves after every swap, and every public `balances` entry that changes.
- Therefore: **every swap's size and direction**, on the private path as much as the public one, because the reserve delta is exactly `dx`.

> **Correction to the root README.** `README.md` currently lists slippage tolerance (`minOut`) under what an observer cannot learn, describing it as "a value proven correct without ever being shown". `minOut` is a circuit argument, so it is shown. There is no value in this contract that is proven without being disclosed, because the production contract declares no `witness` at all and therefore has no private inputs. See finding M-02.

### Private

- **No standing public balance for shielded AKD.** While AKD is held as a Zswap coin, there is no row in the `balances` map attributable to its holder. This is real and it is the feature. Wrapping removes your position from the public ledger.
- **The coin's owner is not written anywhere by this contract.** `mintShieldedToken` sends to `ownPublicKey()` and the recipient lives inside the Zswap commitment, not in a ledger field.
- **The private swap path writes no `balances` entry for the trader.** `privateSwapAkdToNight` spends a coin instead of debiting a public balance; `privateSwapNightToAkd` mints a coin instead of crediting one. The trader's address does not appear in the map for that trade.

### The limit on unlinkability

> **Correction to the root README.** `README.md` states that while shielded, AKD is "unlinkable from the public balance it came from". The cryptography is Midnight's own and is sound, but the contract's calling convention defeats it above the crypto layer.
>
> A coin's nonce is a public circuit argument at both ends of its life. `wrap(amount, nonce)` publishes nonce `N` in a transaction that also writes `balances[P]` for the caller's public key `P`. When that coin is later spent through `unwrap(coin)` or `privateSwapAkdToNight(coin, ...)`, the identical nonce `N` appears in the clear again. An observer matches on nonce equality and recovers the link, with no cryptanalysis and no statistical inference.
>
> So the accurate claim is narrower: **wrapping removes your standing public balance; it does not break the transaction graph linking the coin's creation to the wallet that created it.** Making the stronger claim true requires sourcing nonces and spent coins from a `witness` rather than a circuit argument, which is the recommended fix in finding H-02.

---

## 5. Settlement status, stated plainly

| Circuit | AKD leg | tNIGHT leg |
|---|---|---|
| `addLiquidity` | Real | **Real** (`receiveUnshielded`) |
| `swapAkdToNight` | Real | **Real** (`sendUnshielded`, guarded by `unshieldedBalanceGte`) |
| `swapNightToAkd` | Real | **Real** (`receiveUnshielded`) |
| `privateSwapAkdToNight` | Real | **Real** (`sendUnshielded`, guarded by `unshieldedBalanceGte`) |
| `privateSwapNightToAkd` | Real | **Real** (`receiveUnshielded`) |

The public path settles both legs for real, on chain, using Compact's native unshielded-token primitives. This is verified by transaction on Preprod (see the root README's transaction table).

Until the security audit, the private path's tNIGHT leg was not simulated in the sense of being mocked for display: it was **absent from the circuit entirely**, while the AKD leg moved real value. The design reasoning behind that was sound and is worth preserving. `sendUnshielded` and `receiveUnshielded` are transparent by design, so wiring them into a private swap publishes exactly who traded tNIGHT with this pool and how much. A leg that is both real and private needs a genuinely shielded representation of the native token, which a contract cannot create, since minting only works for a color the contract itself owns.

The conclusion drawn from that reasoning was the wrong one. A live, unrestricted circuit that moves real AKD in one direction and nothing in the other is not a privacy tradeoff: `privateSwapAkdToNight` took a user's AKD and returned nothing, and `privateSwapNightToAkd` gave real AKD away for free, which chained into a full drain of the pool's real tNIGHT through the public path. Findings C-01 and H-01 carry the worked exploit.

Both are fixed. All four circuits now settle both legs, and the price paid is an openly transparent tNIGHT leg on the private path. That price is not evenly distributed: `privateSwapAkdToNight` publishes the trader's `UserAddress` as a payout destination, so that direction is only marginally more private than the public path, while `privateSwapNightToAkd` still delivers the AKD side as a shielded coin and keeps its real benefit. This documentation does not claim the two directions are equally private.

**The open research question is genuine and worth stating as such:** private settlement of a native token that a contract cannot mint is not solved here, and as far as the author could determine it is not solved in Midnight's own documentation or in OpenZeppelin's Compact contracts either.

---

## 6. Summary for a reviewer

**What Akad demonstrates well.** Native Zswap shielded coins used for their intended purpose rather than a hand-rolled commitment scheme. A contract-bound token type that makes cross-token confusion impossible. Protocol-bound caller identity. Real native-token settlement through `sendUnshielded` and `receiveUnshielded` with a custody check before payout. A public and private mode a user opts into per holding, on top of a conventional, well-understood AMM.

**What it does not achieve.** Trade-amount privacy (structural to public-reserve AMMs, and conceded in the project's own docs). Full unlinkability of a shielded coin from the wallet that created it (fixable, currently claimed but not delivered). Private settlement of the native token (a real open problem, correctly identified).

**What was fixed after the audit.** The two private swap circuits now settle their tNIGHT leg for real, closing a critical fund-drain path. `init()` is gone, replaced by a constructor, so the supply mint cannot be front-run on a redeploy. The privacy claims that did not survive inspection have been rewritten here, in the root README, and in the app's own landing page and FAQ. What remains open is listed in the remediation table at the top of [SECURITY_AUDIT.md](./SECURITY_AUDIT.md); none of it is a fund-loss path.
