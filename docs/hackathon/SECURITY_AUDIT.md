# Akad Security Audit

**Target:** `contracts/src/akad.compact` (433 lines)
**Commit audited:** `bad91f3` (working tree clean at time of audit)
**Compiler targeted by the repo:** Compact `0.31.1`, language version `0.23.0`, runtime `0.16.0`
**Scope:** the Compact contract only. Frontend, UI, and deployment tooling are out of scope, in line with the hackathon's stated review process.
**Reviewer stance:** independent, adversarial. No involvement in authoring the contract.

> **Status note (18 Sep 2026).** This audit documents the contract as it stood on 13 Sep 2026, including the `privateSwapAkdToNight`/`privateSwapNightToAkd` circuits discussed throughout. Those two circuits were later removed and replaced with `shieldedSwapAkdToNight`/`shieldedSwapNightToAkd`, which trade shielded AKD against sNIGHT instead and no longer publish the trader's unshielded NIGHT address. The contract addresses cited below as "final" are also superseded; see the root [README](../../README.md#live-demo--deployed-contracts) for the current contract and addresses. The findings and on-chain evidence below are left as originally written, since they document a specific deployment at a specific time and rewriting them would misstate what was actually tested.

---

## Remediation status (12 Sep 2026)

This audit was delivered against commit `bad91f3`. The developer has since applied fixes on the `hackathon` branch. This section records what changed. The findings below are left exactly as first written: an audit that quietly edits away its own findings is worth less than one that shows what was found and what was done about it.

| Finding | Status | What changed |
|---|---|---|
| C-01 Critical | **FIXED** | `privateSwapNightToAkd` now calls `receiveUnshielded(nativeToken(), disclose(dx))`, so the NIGHT leg is real. The free mint, and the three-transaction drain it enabled, are both gone. |
| H-01 High | **FIXED** | `privateSwapAkdToNight` gained a `recipient: UserAddress` parameter and pays out through `sendUnshielded`, guarded by `unshieldedBalanceGte`. It can no longer consume a coin and return nothing. |
| H-02 High | **REFUTED (14 Sep 2026)** | Tested on chain and the finding does not hold. Coin nonces were never published in plaintext, even as circuit arguments. The premise this audit reasoned from was wrong. Full method, controls and data in "H-02 refuted on chain" below. The witness refactor was applied anyway, for narrower reasons stated there. |
| H-03 High | **FIXED** | `init()` is deleted. The supply mint, `tokenColor`, and `faucetAddress` now happen in a `constructor()`, which runs inside the deploy transaction. There is no entry point left to race. |
| M-01 Medium | **OPEN** | `minOut` is still tautological. Making it real means computing `dy` on-chain, a larger change than the remaining time allows. |
| M-02 Medium | **REASONING REFUTED (14 Sep 2026)** | M-02 rested entirely on H-02's premise, which is now disproven, so its argument does not stand either. Whether `minOut` is recoverable by some other route was never tested and remains unknown. The README edit is harmless and stays, but the finding must not be cited as established. See "H-02 refuted on chain". |
| M-03 Medium | **FIXED** | Both circuits that could desync `reserveNight` from real custody now move real tNIGHT, so the divergence has no remaining source. |
| M-04 Medium | **OPEN** | Unchanged, and it now applies to `privateSwapAkdToNight` too, since that circuit gained the same `recipient` parameter. Carried as a documented trust assumption rather than silently. |
| M-05 Medium | **OPEN** | Reserve cap unchanged. Mitigated operationally by seeding the pool well under the cap. |
| I-01 Informational | **FIXED** | The README now names the Midnight Korea Hackathon 2026. |
| I-03 Informational | **FIXED** | CI gained a `contract-compile` job that installs compiler 0.31.1, compiles the contract, and fails the build if `init` ever reappears in the circuit set. The workflow also now runs on this branch, which it previously did not. |
| I-04, I-05, I-06 | **OPEN** | `akdColor()`, the leftover test scaffolding, and the `disclose()` breadth question are all unchanged. |

**Hardening applied beyond the numbered findings.** The pool custody assertion in `swapNightToAkd` now runs *before* `receiveUnshielded`, and every assertion in both private circuits runs before any value moves. A failing check can no longer take a trader's funds in the guaranteed phase and roll back afterwards. This was raised in section 3 as a hardening note rather than a finding, because the failure could not be demonstrated from source alone.

**One documentation error found during remediation, not present in the original audit.** The README described public AKD balances as "keyed by a hashed (not plaintext) wallet identifier". They are keyed by `ownPublicKey().bytes`, the wallet's Zswap coin public key itself, not a hash of it. Corrected.

### Compile status after remediation

Unlike the original audit, the remediated contract **was compiled**: compiler 0.31.1, by the developer, on 12 Sep 2026. Verified from the artifacts afterwards:

- `contracts/managed/akad/compiler/contract-info.json` lists **10 circuits**, with `init` absent and `privateSwapAkdToNight(coin, dy, minOut, recipient)` present.
- `build/akad/contract/index.d.ts` exposes `initialState(context: ConstructorContext)`, confirming the constructor is registered and that `callerKey()`, `ownPublicKey()`, `kernel.self()`, `tokenType()`, and `Map.insert` are all legal inside a Compact constructor at language version 0.23.
- Compiled output is consistent across `build/`, `contracts/managed/`, `frontend/lib/contracts/`, and `frontend/public/contracts/`, with no stale `init.*` prover or verifier keys left anywhere.

### On-chain verification of the fixes (13 Sep 2026)

Compiling is not evidence that a fix works. Each remediated circuit was therefore run against live deployments on **both** networks and the resulting transactions were read on the block explorer, not trusted from the app's own UI. That distinction matters here: the frontend reports success as soon as it receives a transaction id, so a `PARTIAL_SUCCESS` transaction whose effects were rolled back looks identical to a real one in the interface. Only `STATUS`, `EXECUTION SEGMENTS` and `SPENT INPUTS` separate the two.

Deployments at the time of this audit: Preprod `77e840accabf8b7f6301d55285218f93466e6a41c9623cb48d7529e7549eb4aa`, Preview `b889ee2cce94c04a1cfc5b4a0aea844d5167759381db11ac2cd87e93550ed53c`, now superseded (see the status note above). Every circuit was exercised on both; the per-circuit hashes at the time were tabulated in the root README, which now points at the current deployment instead.

The three transaction shapes that actually close the findings:

| Finding | Circuit | What the chain shows |
|---|---|---|
| **C-01 closed** | `privateSwapNightToAkd` | `SUCCESS`, no failed segments, **`SPENT INPUTS: 1`**, 1 zswap event. Real tNIGHT entered the contract through `receiveUnshielded` and shielded AKD was minted out. The circuit can no longer mint AKD for free, so the three-transaction pool drain is gone. |
| **H-01 closed** | `privateSwapAkdToNight` | `SUCCESS`, no failed segments, **`PUBLIC OUTPUTS: 1`** with zero spent inputs, 2 zswap events. The trader's shielded coin was consumed and real tNIGHT left the pool's own custody through `sendUnshielded`. Zero spent inputs is correct for this direction, since the payout is funded by the contract rather than the caller. |
| **tokenColor regression closed** | `unwrap` | `SUCCESS`, no failed segments, 2 zswap events. The shielded coin was really spent and received, so the colour the ledger reports and the colour `mintShieldedToken()` stamps now agree. |

Four of these transactions (`addLiquidity` and both private swaps on Preview, `addLiquidity` on Preprod) were opened and read independently during this audit; the rest are the developer's records against the same deployments and can be checked the same way from the README table.

Both fund-loss findings are therefore verified against a live chain on two networks, not merely against a clean compile.

### An unexplained failure worth recording

Before the deployment above, three `addLiquidity` attempts on two earlier deployments all landed as `PARTIAL_SUCCESS` with `SPENT INPUTS: 0` and a failed fallible segment: the wallet attached no unshielded NIGHT at all, so `receiveUnshielded` went unsatisfied and every effect rolled back. The following were ruled out by evidence rather than by assumption: the amount (identical failure at both 1,000,000,000 and 63,000,000 base units), the balance (the wallet held roughly 1.0976e10 base units of unshielded NIGHT against a 1e9 request), and the audit fixes themselves (`addLiquidity` was the one circuit left completely untouched).

A clean sequential redeploy, with deploy then `recordTokenColor` then seed then fund then wrap then unwrap run in order, resolved it, and the developer changed nothing else. **The root cause was never identified.** It is recorded here rather than quietly omitted, because an unexplained intermittent failure in the funding path is exactly the kind of thing a reviewer could hit. `docs/hackathon/HOW_TO_RUN.md` carries the symptom and the known remedy in its troubleshooting table.

Section 0 below describes the conditions of the original audit and is left unchanged.

---

## 0. Compile verification: NOT PERFORMED

This audit did **not** compile the contract. The `compact` developer tool (v0.5.2) installed successfully in the audit environment, but `compact update 0.31.1` failed because fetching the compiler toolchain requires GitHub API access that the audit environment's egress proxy rejects (`Bad credentials`). No fallback direct-download URL for the `0.31.1` compiler artifacts resolved.

**Treat "this contract compiles" as unverified by this audit.** That said, the circumstantial evidence is strong and a judge can check it in seconds:

- `contracts/managed/akad/` is committed to git (48 files) and was regenerated in the same commit as the source change (`db1cb2f`, which touched `contracts/src/akad.compact` and the `contract/`, `zkir/`, and `keys/` artifacts for exactly the three circuits that changed).
- `contracts/managed/akad/compiler/contract-info.json` records `compiler-version: 0.31.1` and lists all 11 exported circuits with signatures that match the source exactly, including the recent `swapAkdToNight(..., recipient: UserAddress)` parameter.
- `git status` is clean, so the committed artifacts correspond to the committed source.

This is good evidence that the source at `bad91f3` compiled under 0.31.1 on the author's machine. It is not a substitute for a clean-clone compile, which remains the single highest-value thing to verify before submission (see punch list item 1).

---

## 1. Summary of findings

*Status below means "verified as a finding", not "still broken". Remediation is tracked in the section above.*

| ID | Severity | Status | Finding |
|---|---|---|---|
| C-01 | Critical | CONFIRMED | `privateSwapNightToAkd` mints real AKD without ever receiving NIGHT, and the free AKD chains into a complete drain of the pool's real tNIGHT custody |
| H-01 | High | CONFIRMED | `privateSwapAkdToNight` consumes the caller's real shielded AKD and delivers nothing in return |
| H-02 | High | **REFUTED on chain, 14 Sep 2026** | Originally filed as CONFIRMED. Testing against live transactions disproved it. Kept in place, with the refutation, rather than deleted |
| H-03 | High | CONFIRMED | `init()` is unauthenticated and front-runnable: the first caller after deployment receives the entire 1,000,000 AKD supply |
| M-01 | Medium | CONFIRMED | `minOut` provides no slippage protection; the assertion is tautological because the caller supplies both `dy` and `minOut` |
| M-02 | Medium | CONFIRMED | README claims `minOut` is never revealed on-chain; circuit arguments are always part of the public transcript |
| M-03 | Medium | CONFIRMED | `reserveNight` is an unreconciled mirror of real custody, so recorded reserves and actual holdings can diverge permanently |
| M-04 | Medium | CONFIRMED | `swapAkdToNight` pays out to an unvalidated caller-supplied `recipient`, so any party controlling transaction construction can redirect the entire tNIGHT payout |
| M-05 | Medium | CONFIRMED | The 4,000,000,000 reserve cap is ~0.4% of the minted supply and causes a directional trading halt at ordinary demo volumes |
| L-01 | Low | CONFIRMED | No trading fee, so round trips are costless and price manipulation is cheap |
| L-02 | Low | CONFIRMED | No `removeLiquidity`; seeded liquidity is permanently locked in the contract |
| L-03 | Low | CONFIRMED | Faucet is per-wallet, not per-person, and wallets are free to generate |
| L-04 | Low | CONFIRMED | Shielded coins received into contract custody are never re-emitted and accumulate as dead value |
| I-01 | Informational | CONFIRMED | README frames the project for the wrong program, which directly affects the "description matches README" review step |
| I-02 | Informational | CONFIRMED | Four of six circuits have no verified transaction against the current deployment |
| I-03 | Informational | CONFIRMED | CI never compiles the contract, so the green CI badge says nothing about the deliverable judges clone |
| I-04 | Informational | CONFIRMED | `akdColor()` is an exported circuit returning a value already available in ledger state |
| I-05 | Informational | CONFIRMED | Leftover test scaffolding in `contracts/src/test/note-primitives-test.compact` |
| I-06 | Informational | PLAUSIBLE | `disclose()` appears to be used more broadly than the compiler requires |

Nothing in this report is speculative padding. Every CONFIRMED finding was derived from the source text and re-checked adversarially. The single PLAUSIBLE item is labelled as such because it cannot be settled without running the compiler.

### What is genuinely sound

Stated plainly, because an audit that only lists problems is not an honest one:

- The color check (`coin.color == tokenColor.read()`, lines 207, 355) is correct and load-bearing. `tokenColor` is derived as `tokenType(domainSep, kernel.self())`, which binds it to this contract's own address, so a shielded coin of another contract's token cannot be credited as AKD. The author identified this gap themselves and fixed it.
- Binding caller identity to `ownPublicKey()` (line 74) rather than a self-declared witness is the right call and closes a genuine spoofing hole.
- `balanceOf()` and `hasClaimedFaucet()` (lines 101, 112) correctly guard against Compact's `Map.lookup()` failing on absent keys.
- Nullifier handling and double-spend prevention for shielded coins are delegated to Zswap rather than hand-rolled. This is correct: a coin spent via `receiveShielded` cannot be replayed, because the protocol layer enforces nullifier uniqueness. See section 3 for the full reasoning on audit dimension A4.
- Arithmetic ordering is correct throughout: every downcast to `Uint<64>` is preceded by the bound assertion that makes it safe, and every subtraction is preceded by the comparison that prevents underflow. I found no integer overflow or underflow.
- The constant-product assertion is written in the pool-favouring direction (`>=`), so integer rounding accumulates in the pool's favour. Repeated small trades cannot drain value through rounding.

---

## 2. Detailed findings

### C-01 (Critical, CONFIRMED): `privateSwapNightToAkd` mints AKD for free, enabling a complete drain of the pool's real tNIGHT

**Location:** `contracts/src/akad.compact:399-433`

**What it is**

`privateSwapNightToAkd(dx, dy, minOut, nonce)` is documented as a NIGHT to AKD swap whose NIGHT leg is "simulated". In the source, "simulated" means the circuit contains **no token primitive for the NIGHT leg at all**. There is no `receiveUnshielded` anywhere in lines 399 to 433. The circuit:

1. Reads reserves and checks the constant-product invariant against a caller-supplied `dx` that is never backed by anything (lines 400 to 416).
2. Debits the pool's real AKD custody by `dy` (line 423).
3. Writes `reserveNight = x + dx`, inflating the recorded NIGHT reserve with NIGHT that was never received (line 425).
4. Mints a **real** shielded AKD coin of value `dy` to the caller (line 432).

The AKD leg is real in both directions. The NIGHT leg is real only on the public path. The result is that the caller pays nothing and receives real AKD.

Note that this is not a supply inflation bug: `balances[pool]` is debited by exactly `dy` before the mint, so total AKD is conserved. It is a theft-from-pool bug.

**Concrete exploit**

Assume the pool is seeded at `reserveAKD = 2_000_000_000`, `reserveNight = 2_000_000_000` (2000 AKD and 2000 tNIGHT at 6 decimals), with 2_000_000_000 base units of real tNIGHT in contract custody.

*Transaction 1.* Attacker calls `privateSwapNightToAkd(dx = 2_000_000_000, dy = 1_000_000_000, minOut = 0, nonce = <fresh>)`.

Every assertion passes:
- `x > 0 && y > 0` holds.
- `dx > 0`, `dy > 0` hold.
- `dy >= minOut` holds trivially, because the attacker chose `minOut = 0` (see M-01).
- `dy (1e9) < y (2e9)` holds.
- `x + dx = 4e9 <= 4e9` holds exactly.
- `y = 2e9 <= 4e9` holds.
- Invariant: `(2e9 + 2e9) * (2e9 - 1e9) = 4e18 >= 2e9 * 2e9 = 4e18` holds exactly.
- `poolBalance (2e9) >= dy (1e9)` holds.

The attacker receives a shielded AKD coin worth 1,000,000,000 base units (1000 AKD, half the pool's AKD) and has transferred zero tNIGHT. State is now `reserveNight = 4e9`, `reserveAKD = 1e9`, real tNIGHT custody unchanged at 2e9.

*Transaction 2.* Attacker calls `unwrap(coin)` to convert the free shielded coin into a public balance of 1e9 AKD.

*Transaction 3.* Attacker calls `swapAkdToNight(dx = 1_000_000_000, dy = 2_000_000_000, minOut = 0, recipient = <attacker's own address>)`.

- `x + dx = 1e9 + 1e9 = 2e9 <= 4e9` holds.
- `y = 4e9 <= 4e9` holds.
- `dy (2e9) < y (4e9)` holds.
- `unshieldedBalanceGte(nativeToken(), 2e9)`: real custody is exactly 2e9, and the check is `>=`, so it holds.
- Invariant: `(1e9 + 1e9) * (4e9 - 2e9) = 2e9 * 2e9 = 4e18 >= 1e9 * 4e9 = 4e18` holds exactly.

`sendUnshielded` at line 299 pays the attacker **the pool's entire real tNIGHT custody**.

Total cost to the attacker: transaction fees only. Total extracted: 100% of the pool's real tNIGHT. Three transactions, no privileged access, no timing requirement, no front-running needed.

The mechanism is that transaction 1 is a free lever on the price: `privateSwapNightToAkd` moves `reserveAKD` down and `reserveNight` up at zero cost, which is exactly the state that makes `swapAkdToNight` pay out the most tNIGHT for the least AKD.

**Why the documentation does not neutralise this**

`contracts/README.md:44` and the file header at lines 27 to 36 present the simulated NIGHT leg as a deliberate privacy tradeoff. The reasoning about `sendUnshielded` being transparent is correct and worth keeping. But documenting a limitation does not change what a deployed, exported circuit does when a stranger calls it directly against the contract address, bypassing the frontend entirely. The circuits are live on both Preview and Preprod at the addresses listed in the README.

**Recommended fix (developer to apply; this audit does not modify contract code)**

Pick one, in descending order of preference given the Sep 28 deadline:

1. **Remove both private swap circuits from the contract before redeploying.** Keep `wrap`, `unwrap`, and the two public swaps. Users can still get a private AKD balance via `wrap`, and can still trade privately via `wrap` then public swap then `unwrap`. This loses one bullet on the roadmap and removes both C-01 and H-01 completely. It is the safest path with two weeks left.
2. **Gate both private circuits behind an owner check** so only the builder can call them, and present them explicitly as a non-settling demonstration of the Zswap coin path rather than as a swap. This requires storing an owner in ledger state at `init` and asserting `callerKey() == owner`.
3. **Make the NIGHT leg real on the private path** by adding `receiveUnshielded(nativeToken(), disclose(dx))` to `privateSwapNightToAkd` and `sendUnshielded(...)` to `privateSwapAkdToNight`. This fixes the economics completely and is a small change. It costs the amount privacy of the NIGHT leg, which, per H-02 below, the current design does not actually deliver anyway. Honest framing then becomes: "the private path hides which public balance the AKD came from at rest, not the trade."

---

### H-01 (High, CONFIRMED): `privateSwapAkdToNight` takes the user's shielded AKD and delivers nothing

**Location:** `contracts/src/akad.compact:354-385`

**What it is**

The mirror of C-01, pointing the other way. The circuit calls `receiveShielded(disclose(coin))` at line 356, taking the caller's real shielded AKD coin into contract custody, sets `dx = coin.value`, credits `balances[pool] += dx` at line 381, and writes `reserveNight = y - dy` at line 384. There is no `sendUnshielded` and no payout of any kind. The circuit ends at line 385 having taken the user's AKD and given back nothing.

**Concrete failure scenario**

A user holds a shielded AKD coin worth 50,000,000 base units (50 AKD, exactly one faucet claim, wrapped). They toggle "Private" in the swap card and submit. The transaction succeeds. The contract now holds their 50 AKD, credited to the pool's custody account. `reserveNight` drops by `dy` as though a payout happened. The user's wallet shows the shielded coin gone and no tNIGHT received. There is no circuit that can return it: `balances[pool]` is only spendable through `swapNightToAkd` and `privateSwapNightToAkd`, neither of which pays the original user.

This is unrecoverable loss for the user, not a reverted transaction. The transaction is valid and succeeds.

**Recommended fix**

Same options as C-01, item 1 or item 3. If the circuit is kept in any form, it must either pay out real tNIGHT or refuse to accept the coin.

---

### H-02 (filed High/CONFIRMED, later REFUTED): the private path does not deliver unlinkability

> **This finding is wrong.** It was filed as a confirmed High, then disproved by testing it against live transactions on 14 Sep 2026. The original text is left below exactly as written, followed by the refutation. An audit that deletes its own mistakes teaches a reader nothing about how much to trust the rest of it.

**Location:** `contracts/src/akad.compact:186` (`wrap`), `206` (`unwrap`), `354` (`privateSwapAkdToNight`), `399` (`privateSwapNightToAkd`)

**What it is**

In Compact, **every argument to an exported circuit is part of the public transcript**. This is not a subtlety of this contract; it is a documented property of the execution model, and the two independent references consulted for this audit state it identically: "Circuit arguments: all of them, they are part of the public transcript", and, under what ZK proofs do not guarantee, "Confidentiality of circuit arguments, those are always public".

Now look at the four circuits that touch shielded coins:

| Circuit | Signature | Public consequence |
|---|---|---|
| `wrap` | `(amount: Uint<128>, nonce: Bytes<32>)` | The minted coin's nonce and value are public. The same transaction writes `balances.insert(caller, ...)` at line 195, publishing the caller's `ownPublicKey()` bytes. |
| `unwrap` | `(coin: ShieldedCoinInfo)` | The spent coin's nonce, color, and value are all public. |
| `privateSwapAkdToNight` | `(coin: ShieldedCoinInfo, dy, minOut)` | Same: the spent coin is fully identified in the clear. |
| `privateSwapNightToAkd` | `(dx, dy, minOut, nonce: Bytes<32>)` | The minted coin's nonce is public, and its value is `dy`, also public and also written to reserves. |

**Concrete deanonymisation**

An observer with nothing but the public chain state does the following:

1. Reads transaction A: a `wrap` call. Circuit arguments give `amount = V` and `nonce = N`. The ledger write in the same transaction gives the caller's public key `P` (because `balances.insert(caller, newBalance)` publishes the map key, and the map key is `disclose(ownPublicKey().bytes)`).
2. Reads transaction B, some time later: a `privateSwapAkdToNight` call. The circuit argument `coin` gives `{nonce: N, color: AKD, value: V}`.
3. Matches on `nonce == N`. The "private" swap in transaction B is the wallet `P` from transaction A.

No cryptanalysis, no anonymity-set reasoning, no statistical inference. Direct equality on a 32 byte value that both transactions publish in the clear.

The same matching works in reverse for coins created by `privateSwapNightToAkd` (public nonce at mint, public nonce at spend) and for the `wrap` then `unwrap` round trip.

**What this contradicts**

Root `README.md:182` states: "**Ownership of any AKD balance held in shielded form.** [...] While shielded, the AKD is unlinkable from the public balance it came from, using Midnight's own shielded-pool cryptography rather than a hand-rolled scheme."

The cryptography is indeed Midnight's own and is sound. The problem is above the cryptography: the contract's own interface publishes the coin's identifying nonce at both ends of its life, so the linkage the shielded pool is designed to break is restored by the calling convention. "Unlinkable" is not accurate as written.

Root `README.md:109` makes the same claim in different words: "a shielded coin nobody but the holder can link to a wallet". An observer can link it, using only public data.

**Recommended fix**

Two parts, and the second is mandatory even if the first turns out to be impossible.

1. **Source coin nonces and spent coins from a `witness`, not from a circuit argument.** The idiomatic Midnight pattern for this is documented: `witness myRewardCoins(): Vector<10, ShieldedCoinInfo>;`, with the coin supplied from the wallet's local private state rather than passed in publicly. Applying the same shape here means declaring, for example, `witness spendCoin(): ShieldedCoinInfo;` and `witness freshNonce(): Bytes<32>;` and calling them inside the circuit instead of taking them as parameters. Note honestly: the author's own scaffolding at `contracts/src/test/note-primitives-test.compact:19` passes a witness-derived nonce to `mintShieldedToken` and still needs `disclose()` on it, which suggests `mintShieldedToken` may structurally require a public nonce. **This audit could not compile, so I cannot tell you whether the witness form is accepted.** Try it; it is a ten minute experiment and the payoff is the project's entire headline claim.
2. **If the compiler refuses, correct the README.** Say precisely what is hidden and what is not. Something like: "A wrapped AKD coin lives in Midnight's native shielded pool, so its balance is not a public ledger entry. The wrap and unwrap transactions do publish the coin's nonce as a circuit argument, so an observer can link a specific coin's creation and spend to the wallet that wrapped it. What the shielded form removes is a standing public balance, not transaction-graph linkability." That is a weaker claim, but it is true, and a judge who checks will respect it far more than a strong claim that does not survive inspection.

---

### H-02 refuted on chain (14 Sep 2026)

**Verdict: the finding above is false. The attack it describes cannot be carried out, because the value it depends on is never published.**

**Why it was filed in the first place**

The finding rests on one premise, quoted in its own text: every argument to an exported circuit is part of the public transcript. Two Midnight reference sources state this, in nearly identical words, and the original audit cited both. It was never tested against a transaction. The whole finding is an inference from a sentence in documentation.

**How it was tested**

The old Preprod deployment `77e840accabf8b7f6301d55285218f93466e6a41c9623cb48d7529e7549eb4aa` used the pre-refactor contract, where `wrap(amount, nonce)` took the nonce as a circuit argument. That is the exact code path the finding accuses.

A coin minted by that contract was still recorded in the developer's browser, unspent, with its nonce in full:

```
key    akad:wrappedCoin:preprod:77e840ac…eb4aa:mn_addr_preprod1xng…m0l9eh
nonce  f4d27ff7410a26ebafe56d3ebce3690c57fba7a5c77bf3daf80fad26ec01a875
value  22066533
```

The app writes that entry only after `wrapTokens()` returns, so the coin was minted by one of that contract's `wrap` transactions. If the finding were correct, those 32 bytes would appear in the clear in the wrap transaction, and again in any transaction spending the coin.

The contract's entire life was then enumerated from the Preprod indexer, block by block, rather than sampled: 16 transactions between heights 2,526,649 and 2,527,193, three of them `wrap`. Sweeps of the 200 blocks before and the 1,300 blocks after returned nothing, so no transaction was missed.

Every one of the 16 raw transactions was searched for the nonce, in forward byte order, reverse byte order, both 16 byte halves, and all four 8 byte chunks, to catch a re-encoded or split layout rather than only a verbatim match.

**Control**

A null result is worthless without proof the search can find anything at all. The same search, on the same bytes, was run for the contract address, a value known to be present. It was found in all three `wrap` transactions. The method works.

**Result**

| Height | Circuit | Contract address found (control) | Nonce found |
|---|---|---|---|
| 2,526,695 | `wrap` | yes | **no** |
| 2,526,732 | `wrap` | yes | **no** |
| 2,527,165 | `wrap` | yes | **no** |

Not in the other 13 transactions either, under any of the encodings tried.

**Why the premise was wrong**

The ledger's own type definitions say it plainly. An on-chain `ContractCall` carries exactly six things: `address`, `entryPoint`, `guaranteedTranscript`, `fallibleTranscript`, `communicationCommitment`, and `proof`. There is no field for circuit arguments and none for witness values. The arguments are bound through `communicationCommitment(input, output, rand)`, which takes randomness and therefore hides what it commits to.

"Public" in the documentation means public to the proof system, that is, a public input the verifier constrains against. It does not mean serialised in the clear into the transaction. This audit conflated the two.

**What this changes**

The unlinkability claim the original README made was closer to correct than this audit's rebuttal of it. Nothing in the contract needed fixing for this reason.

**What it does not change**

The witness refactor applied on 13 Sep stays, on narrower and honest grounds: the proof's public input count drops (`wrap` 3 to 1, `unwrap` 5 to 0, measurable with `scripts/zk-public-inputs.mjs`), the contract no longer trusts caller-supplied coin material, and no frontend defect can leak it through an argument list. Those are real, but they are hardening, not the closing of a vulnerability. **The project must not claim this refactor fixed a privacy hole.**

**What the real leak turned out to be**

While verifying the above, four post-refactor Preprod transactions were inspected directly. `wrap` and `unwrap` are clean: zero public outputs, zero spent inputs, no address anywhere. Both private swaps are not:

```
privateSwapAkdToNight   created output   mn_addr_prepro…9xrqm0l9eh    20.15355 NIGHT
privateSwapNightToAkd   spent input      mn_addr_prepro…9xrqm0l9eh     1,807 NIGHT
                        created output   mn_addr_prepro…9xrqm0l9eh     1,786 NIGHT
```

The same unshielded address in both, rendered in the clear by a public block explorer with no decoding required, and matching the wallet in the localStorage key above. Any observer can tie both "private" swaps to one identity and read their sizes. This is the genuine identity leak on the private path, it was always the real one, and it follows from `sendUnshielded` and `receiveUnshielded` being transparent by design. It is recorded in this audit under the honest caveat in section 8 rather than as a numbered finding, which understated it.

**Method note for the reader**

Both the original error and its correction came from the same place: a claim about runtime behaviour that was never executed. The `kernel.self()` regression found during remediation had the same shape, in the opposite direction, where code that compiled was assumed to behave correctly. Compiling is not running, and documenting is not verifying.

---

### H-03 (High, CONFIRMED): `init()` is unauthenticated and front-runnable

**Location:** `contracts/src/akad.compact:120-133`

**What it is**

The only guard on `init()` is `assert(totalSupply.read() == 0, "already initialized")` at line 121. There is no check that the caller is the deployer. Whoever calls `init()` first receives the entire initial supply:

```
balances.insert(owner, 1000000000000);   // line 126, owner = callerKey()
```

On Midnight, contract deployment and the first circuit call are separate transactions. Between the deployment landing on chain and the deployer's own `init` transaction being included, the contract exists with `totalSupply == 0` and `init` callable by anyone. The public transcript makes the contract address and the available circuits visible immediately.

**Concrete exploit**

An observer watching new contract deployments on Preview or Preprod sees the Akad contract appear. They call `init()` with a higher fee before the deployer's `init` lands. They now hold 1,000,000 AKD, the entire supply. The deployer's `init` reverts with "already initialized". The deployer controls nothing: they cannot seed liquidity (`addLiquidity` at line 237 requires an AKD balance they do not have) and cannot fund the faucet. The deployment is a total loss and must be redone.

**Current exposure**

The two deployments listed in the README are already initialized, so they are not exploitable today. **The exposure is prospective and immediate:** the README's own roadmap and the "pending re-verification" table indicate a redeploy is planned before submission. Every redeploy reopens this window.

**Recommended fix**

Store the deployer at construction time and check it, or accept a constructor-set owner. The minimal change, if a Compact constructor is available at this language version, is to move the supply mint into the constructor so no separate `init` call exists. If that is not workable, add an owner ledger field written by the deploying transaction and assert against it. At a bare minimum, submit the `init` transaction in the same block as the deployment and verify it landed before announcing the address.

---

### M-01 (Medium, CONFIRMED): `minOut` provides no slippage protection

**Location:** lines 271, 312, 366, 406 (all four swap circuits)

**What it is**

Every swap circuit contains `assert(dy >= minOut, "slippage: insufficient output")`. Both `dy` and `minOut` are supplied by the same caller in the same transaction. The assertion can only fail if the caller deliberately passes a `minOut` greater than their own `dy`. It is tautological in every honest and every hostile call. It protects nobody.

In a conventional AMM, the contract computes `dy` from the reserves at execution time and compares that computed value against the caller's `minOut`. Here the contract never computes `dy`; the frontend does, off-chain, and passes it in (this is visible in the README's own flow diagram at line 121: "compute dy off-chain (bonding curve)").

**What actually protects the trader**

The constant-product assertion. If another trade lands between quote and execution and moves the reserves, the caller's fixed `dy` no longer satisfies `(x + dx) * (y - dy) >= x * y` and the transaction reverts. So a trader is never overcharged relative to `k`. The protection is real, but it is a revert rather than a bound, and it is not what `minOut` is doing.

There is a residual asymmetry worth stating: if the reserves move in the trader's favour between quote and execution, their fixed `dy` is now less than the fair output, the invariant still holds, and the transaction succeeds. The trader silently receives less than the pool would have given them. `minOut` cannot catch this, because `minOut <= dy` by construction.

**Concrete failure scenario**

Alice's UI quotes `dy = 100` for `dx = 10` and submits `swapAkdToNight(10, 100, 95, alice)`. Before it lands, Bob's `swapNightToAkd` increases `reserveAKD`. Alice's fair output is now 92. Her invariant check fails and her transaction reverts, forfeiting fees (Midnight forfeits fees on fallible-phase failure). Bob can repeat this for pennies to grief every trade on the pool.

**Recommended fix**

Compute `dy` inside the circuit from `reserveAKD`, `reserveNight`, and `dx`, then assert `dy >= minOut`. This makes `minOut` meaningful, removes the caller's ability to specify an output at all, and turns front-running from a revert into a bounded partial fill. If integer division inside the circuit is awkward at this language version, the minimum honest change is to stop calling it slippage protection in the code and the docs, and to document that the invariant assertion is the real guard.

---

### M-02 (Medium, CONFIRMED): README states `minOut` is never revealed on-chain

**Location:** root `README.md:181`, against the circuit signatures at lines 264, 305, 354, 399

**What it is**

The README's Privacy Model section, under "What an observer **cannot** learn", states:

> Slippage tolerance (`minOut`) used only in an on-chain assertion, never written to public state. A value proven correct without ever being shown.

`minOut` is a parameter of an exported circuit. Circuit arguments are always part of the public transcript, as established in H-02. It is shown. The claim is false as written.

> **Correction (14 Sep 2026).** The sentence above is the only load-bearing step in this finding, and it borrows its premise from H-02, which has since been refuted on chain. Circuit arguments are not serialised in plaintext into a transaction. So this finding's argument collapses with H-02's.
>
> It is not being marked FIXED, because the opposite has not been shown either. What was tested is a 32 byte high-entropy value, a coin nonce. `minOut` is a small integer, and a low-entropy value can leak through channels a high-entropy one does not, so absence of the nonce proves nothing about `minOut`. The honest status is: **reasoning refuted, conclusion unverified.**
>
> Note also that M-01 is untouched by this. `minOut` remains tautological, and a value that is compared only against itself protects nobody whether it is public or not.

Severity is Medium rather than High because the practical harm of a leaked `minOut` is small (it reveals a trader's slippage tolerance, which is mildly useful to a front-runner and nothing more). The reason it matters here is different: the hackathon's review process explicitly assesses "how clearly Midnight's privacy features are used", and this is the one sentence in the README that claims a zero-knowledge property for a specific value. A judge who knows Compact will check it first, and it is wrong. A wrong privacy claim in a privacy project costs more credibility than the leak itself costs security.

**Recommended fix**

Delete the bullet. `minOut` is not private and cannot be made private while it is a circuit argument. Replacing it with something true, for example "the contract never stores any per-trader state beyond a public AKD balance", is better than defending the claim.

---

### M-03 (Medium, CONFIRMED): `reserveNight` is an unreconciled mirror of real custody

**Location:** lines 254 to 255, 296 to 297, 341 to 342, 383 to 384, 425 to 426

**What it is**

`reserveNight` is a ledger number written independently of the contract's actual native-token holdings. Four circuits write it. Only two of them (`addLiquidity` at line 252, `swapNightToAkd` at line 327) actually move tNIGHT in, and only one (`swapAkdToNight` at line 299) moves tNIGHT out. The two private circuits write `reserveNight` with no corresponding token movement at all.

The only reconciliation anywhere in the contract is `unshieldedBalanceGte(nativeToken(), disclose(dy))` at line 275, which checks custody at payout time in `swapAkdToNight`. That check prevents the contract from promising tNIGHT it does not have, which is genuinely valuable and correctly placed. But it is a floor check on one circuit, not an invariant.

**Concrete failure scenario**

Independent of the C-01 exploit, a single honest-looking `privateSwapNightToAkd` call leaves `reserveNight` overstated. The pool then quotes prices as though it holds tNIGHT it does not hold. Every subsequent `swapAkdToNight` whose fair `dy` exceeds real custody reverts on line 275, forfeiting the trader's fees, with the error message "pool has insufficient tNIGHT custody for this swap". From the trader's side this looks like the pool is broken at random. The pool is not drained, but it is mispriced and partially unusable, and there is no circuit that can correct `reserveNight` back down.

`privateSwapAkdToNight` produces the opposite skew: real custody exceeds `reserveNight`, so the pool holds tNIGHT it will never quote or pay out.

**Recommended fix**

Removing the private circuits (C-01 fix 1) eliminates every path that creates this skew today. Beyond that, the durable fix is to stop keeping `reserveNight` as an independent number and derive it from actual custody where the language allows, or to assert consistency at the top of each swap. Given the deadline, the practical action is the removal.

---

### M-04 (Medium, CONFIRMED): unvalidated `recipient` in `swapAkdToNight`

**Location:** `contracts/src/akad.compact:264`, payout at line 299

**What it is**

`swapAkdToNight` takes `recipient: UserAddress` and pays the full tNIGHT output there at line 299, while debiting the AKD from `callerKey()` at line 289. Nothing ties `recipient` to the caller. The comment at lines 262 to 263 says it "must be the caller's own unshielded address", but nothing enforces it.

**Concrete exploit**

The victim is the user, and the attacker is whoever builds the transaction. A phishing clone of the dApp, a compromised frontend deployment, a malicious npm dependency in the wallet integration path, or a hostile SDK wrapper substitutes its own address for `recipient`. The user approves what their wallet shows as an Akad swap. Their AKD balance is debited correctly. The entire tNIGHT output goes to the attacker. On-chain everything looks valid, and the contract has no basis to reject it.

The contract is the trust boundary here, and it is not enforcing the one relationship that makes the swap a swap rather than a donation.

**Honest note on the fix**

I could not find a clean enforcement in Compact at this language version, and I will not invent one. `ownPublicKey()` returns a `ZswapCoinPublicKey`, while `sendUnshielded` needs a `UserAddress`. These are different types and the contract cannot derive the second from the first. The author's comment acknowledges exactly this constraint and it appears to be a real language limitation, not an oversight.

**Recommended action**

Investigate whether the standard library offers an own-unshielded-address primitive at 0.31.1 (the search terms worth trying are `ownAddress`, `kernel` address accessors, and the `UserAddress` constructors). If one exists, assert `recipient == <that>`. If none exists, document the constraint prominently in `contracts/README.md` as a known trust assumption on transaction construction, rather than only as an implementation note. A stated limitation is defensible; an undocumented one is not.

---

### M-05 (Medium, CONFIRMED): reserve cap is ~0.4% of supply and causes a directional trading halt

**Location:** lines 232 to 233, 273 to 274, 314 to 315, 368 to 369, 408 to 409

**What it is**

Reserves are capped at 4,000,000,000 base units. At the token's 6 decimals that is 4,000 AKD. `init` mints 1,000,000,000,000 base units, which is 1,000,000 AKD. The pool can therefore hold at most 0.4% of the supply, and `claimFaucet` hands out 50 AKD per wallet, which is 1.25% of a maximally seeded pool.

The cap derives from the `Uint<64>` downcast in the invariant check: `4e9 * 4e9 = 1.6e19`, under `Uint<64>::MAX` of about `1.844e19`. The reasoning in the comment at lines 228 to 231 is arithmetically correct.

**Concrete failure scenario**

`swapAkdToNight` asserts `x + dx <= 4000000000` at line 273, where `x` is `reserveAKD`. Suppose the pool is seeded at 2,000 AKD and 2,000 tNIGHT. Traders sell AKD into the pool. After a cumulative 2,000 AKD of inflow (40 faucet users spending their full claim), every further `swapAkdToNight` and `privateSwapAkdToNight` call reverts with "reserveAKD exceeds safe bound", regardless of size, because `dx > 0` is required. The AKD-to-NIGHT direction is dead until someone trades the other way. On a demo pool during judging, forty small trades is a plausible afternoon.

This is recoverable, not permanent: `swapNightToAkd` reduces `reserveAKD`. But it will look like a broken app to whoever hits it, and the recovery requires somebody to have tNIGHT and a reason to sell it.

**Recommended fix**

Either raise the effective headroom by performing the invariant check without the `Uint<64>` downcast (Compact tracks bit widths and may widen the multiplication automatically, which would make the cap unnecessary; worth testing once you can compile), or reduce the token's decimals so 4e9 base units represents a sensible pool, or lower the faucet amount and seed the pool near the cap so the headroom lasts. The cheapest pre-deadline action is to seed conservatively (well under half the cap) so the halt is not reachable during judging.

---

### L-01 (Low, CONFIRMED): no trading fee

**Location:** the invariant assertions at lines 282, 322, 376, 416

The invariant is `(x + dx) * (y - dy) >= x * y` with no fee term. A round trip through the pool costs only transaction fees, which means price manipulation is cheap and liquidity providers earn nothing. For a hackathon AMM this is a defensible scope decision, but it is not a normal AMM property and it is not currently stated as a deliberate omission anywhere in the docs. Combined with M-01, it makes the pool a low-cost target for repeated price pushing. Recommend documenting it as an explicit scope decision.

### L-02 (Low, CONFIRMED): no `removeLiquidity`

`addLiquidity` (line 222) can be called once and there is no inverse. Whatever the builder seeds is locked in the contract permanently. The README roadmap lists multi-provider liquidity as future work, which covers the LP-token gap, but not the fact that the single existing provider also cannot exit. Recommend one line in the docs saying seeded liquidity is not withdrawable in this version.

### L-03 (Low, CONFIRMED): faucet is sybil-farmable

`claimFaucet` (line 158) limits one claim per `ownPublicKey()`. Wallet keys are free to generate, so the limit bounds nothing in practice. The author documents the reasoning for choosing a per-wallet limit over a time window honestly at `contracts/README.md:45`, and for a testnet faucet this is a reasonable tradeoff. Noted so it is not mistaken for a real rate limit.

### L-04 (Low, CONFIRMED): custodied shielded coins are never re-emitted

`unwrap` (line 208) and `privateSwapAkdToNight` (line 356) both call `receiveShielded`, moving coins into contract custody, and no circuit ever spends a custodied coin. Total AKD accounting stays consistent, because the corresponding public balance is credited, so this is not a loss of backing. It does mean the contract accumulates shielded coins that can never move again. Harmless today, worth knowing before anyone reasons about the contract's holdings.

### I-01 (Informational, CONFIRMED): README frames the project for a different program

Root `README.md:13` reads: "Privacy-optional AMM on Midnight Network, built for Rise In x Midnight 'New Moon to Full: Monthly Moonshots'".

The submission is to the Midnight Korea Hackathon 2026. The hackathon's stated review process includes checking that the submission form's description matches the README. A judge opening the repo sees it addressed to a different program in the first line under the title. This costs nothing to fix and is the single cheapest judging win in this report.

### I-02 (Informational, CONFIRMED): four of six circuits lack a verified transaction on the current deployment

Root `README.md:63` and lines 71 to 74 mark Preview entirely and four Preprod rows (`wrap`, `unwrap`, `privateSwapAkdToNight`, `privateSwapNightToAkd`) as "pending re-verification" against the redeployed contracts. The honesty here is commendable and the right call. But the review process explicitly checks that the demo is "accessible and verifiable", and right now the two circuits that carry the project's privacy story have no verifiable transaction on the address the README points at.

### I-03 (Informational, CONFIRMED): CI never compiles the contract

`.github/workflows/ci.yml` runs typecheck, tests, and build for `frontend/` only. There is no `compact compile` step anywhere. The CI badge at `README.md:9` sits directly above a repository whose headline deliverable is a Compact contract, and a green badge implies a verification that is not happening. Judges clone and compile as step one; CI should do the same thing first.

### I-04 (Informational, CONFIRMED): `akdColor()` is a redundant exported circuit

`akdColor()` (lines 179 to 182) recomputes `tokenType(domainSep, kernel.self())`, which `init` already wrote to the `tokenColor` ledger field at line 131. Reading `tokenColor` is free; calling `akdColor()` requires a full proof. It also costs a prover key, a verifier key, and two zkir files in the build output. Recommend deleting it.

### I-05 (Informational, CONFIRMED): leftover test scaffolding in `src/`

`contracts/src/test/note-primitives-test.compact` (20 lines) is exploratory scaffolding: it declares a `testNonce` witness, uses domain separator `1` where the real contract uses `42`, and assigns results to unused variables. It sits inside `contracts/src/`, where a judge looking for the contract will find it. Recommend moving it out of `src/` or deleting it.

Minor related note: `const coin = mintShieldedToken(...)` at lines 201 and 432 of the main contract assigns to a variable that is never read. Harmless, but it is the kind of thing a linter or a reviewer flags.

### I-06 (Informational, PLAUSIBLE): `disclose()` may be used more broadly than required

`disclose()` appears on values that, by the public-transcript rule, are already public: `disclose(to)` at lines 145 and 147 where `to` is a circuit argument, `disclose(nonce)` at lines 201 and 432, `disclose(coin)` at lines 208 and 356. If the compiler does not require these, they are noise, and noise matters here specifically because `disclose()` is the marker a reviewer uses to find where real disclosure happens. Burying the three or four that matter among a dozen that do not makes the privacy boundary harder to audit, including for the author.

**Marked PLAUSIBLE, not confirmed.** Whether Compact 0.31.1 requires, permits, or rejects a redundant `disclose()` cannot be determined without compiling, and it is possible that taint from `callerKey()` propagates into these expressions in ways that make them required. Resolve it by removing one at a time and recompiling.

---

## 3. Audit dimension coverage

Explicit answers to the questions in scope, including the ones where the answer is "this is fine".

**A. Privacy correctness**

- *Is `disclose()` used everywhere required?* By construction yes, since a missing one is a compile error and the committed artifacts show the contract compiled. The inverse question is I-06: it may be used more broadly than the minimum.
- *Does the private swap keep the trader's balance and swap amount off-chain?* Balance: partially. The trader's AKD does not appear in the `balances` map for that trade, which is a genuine improvement over the public path. Amount: **no**. `reserveAKD.write(disclose(x + dx))` at line 383 publishes the new reserve, and the delta from the previous public value is exactly `dx`. Identity: **no**, but not for the reason first given here. H-02's nonce-matching argument was refuted on chain (see "H-02 refuted on chain"). The real exposure is `sendUnshielded` and `receiveUnshielded` publishing the trader's unshielded address in the clear, which a block explorer renders without any decoding. The README's own "honest boundary" paragraph at line 186 already concedes trade amounts are public, which is correct and to the author's credit; the identity claim at line 182 is the one that does not hold.
- *Is the documented simulated-NIGHT limitation accurate?* The description is accurate. The framing is not. Describing it as a privacy tradeoff implies the alternative would be worse for privacy, when the actual consequence is C-01 and H-01: one circuit gives away real AKD, the other takes real AKD without paying. No code path warns the caller.
- *Nullifier and double-spend handling for the shielded AKD coin:* **sound, no finding.** The contract does not implement its own nullifier scheme and does not need to. `receiveShielded` routes the spend through Zswap, where nullifier uniqueness is enforced at the protocol layer, so a coin cannot be spent twice or replayed against the contract. Delegating this to audited protocol code rather than hand-rolling a commitment and nullifier scheme is the correct decision and is worth saying out loud in the judge-facing docs. The one caveat is nonce freshness for minting (H-02): reusing a nonce with the same value and recipient would produce an identical commitment, which the ledger should reject as a duplicate. That is a failed transaction, not a double-mint, so it is a usability issue rather than a security one.

**B. Security vulnerabilities**

- *Invariant enforcement and ordering:* correct. In all four circuits the invariant assertion precedes every state write. No rounding drain: the `>=` direction accumulates in the pool's favour.
- *Slippage:* M-01, non-functional.
- *Integer bounds:* no overflow or underflow found. Every downcast is preceded by its bound assertion (lines 273 to 274 before 277, 314 to 315 before 317, 368 to 369 before 371, 408 to 409 before 411). Every subtraction is preceded by its guard (`senderBalance >= amount` before line 142, `dy < y` before the `yBig - dyBig` terms, `poolBalance >= dy` before lines 333 and 422, `faucetBalance >= 50000000` before line 166). `wrap` bounds `amount` against `Uint<64>::MAX` at line 192 before the cast at line 198. This part of the contract is carefully done.
- *Access control:* H-03 on `init`. `addLiquidity` is guarded only by `x == 0 && y == 0` (line 226), which is a one-shot guard rather than an owner check; that is acceptable because the caller must fund it from their own balance, so there is nothing to steal by calling it. No other circuit needs restriction.
- *Witness-supplied and caller-supplied values:* M-04 on `recipient`. The `dy` parameter is caller-supplied across all four swaps but is adequately constrained by the invariant. `dx` in `privateSwapAkdToNight` is correctly taken from `coin.value` rather than as a separate parameter, which is exactly right and closes the obvious spoofing gap; the author called this out in the comment at lines 348 to 351 and deserves credit for it. `dx` in `privateSwapNightToAkd` is the opposite: fully unconstrained and backed by nothing, which is C-01.
- *Reentrancy-equivalent risks:* no cross-contract calls exist (the contract was deliberately merged into one to avoid them), so classic reentrancy does not apply. The Midnight-specific analogue is the guaranteed-versus-fallible phase split, where guaranteed-phase effects persist if a fallible-phase assertion fails. `swapNightToAkd` is the circuit to watch: `receiveUnshielded` at line 327 precedes `assert(poolBalance >= dy)` at line 331. If the receive lands in the guaranteed phase and that assertion fails in the fallible phase, the trader's tNIGHT is taken and no AKD is delivered. I could not determine phase assignment from source alone and am not asserting that it happens, but reordering the assertion above line 327 costs nothing and removes the question entirely. Flagging it here as a hardening recommendation rather than a numbered finding, because I cannot demonstrate the failure.
- *Other:* covered in the numbered findings.

**C. Architecture quality**

The public and private split is clean at the circuit level and easy to follow. Naming is consistent, the helper circuits (`callerKey`, `poolKey`, `faucetKey`, `balanceOf`, `hasClaimedFaucet`) are well chosen, and the comments explain reasoning rather than restating code, which is unusually good.

The main architectural weakness is duplication: the same twelve-line block of reserve reads, bound assertions, downcasts, and the invariant check appears four times with only the variable bindings differing (lines 268 to 282, 309 to 322, 361 to 376, 403 to 416). Four copies of a security-critical check is four places to fix when one of them is wrong, and it is how C-01 came to be structurally invisible: the private circuits look identical to the public ones at a glance, and the difference is what is absent rather than what is present. Extracting a single `pure circuit checkInvariant(x, dx, y, dy)` helper would make the divergence obvious.

Ledger state is minimal and correct. Six fields, each with a clear owner and a stated reason. `faucetAddress` duplicates what `faucetKey()` computes, but the comment at lines 53 to 56 justifies it (frontend read without a transaction) and the justification is sound.

**D. Code readiness**

- Dead code: I-04 (`akdColor`), I-05 (test scaffolding, unused `coin` bindings).
- TODOs and placeholders: none found in the contract. Clean.
- Assert messages: genuinely good. "faucet is empty, ask the deployer to top it up", "pool has insufficient tNIGHT custody for this swap", and "amount exceeds shielded mint bound (Uint<64>)" are actionable and name the fix. This is better than most production contracts. The one misleading message is "slippage: insufficient output" on an assertion that does not provide slippage protection (M-01).
- Clone-and-compile risk: I-03 (CI does not compile), plus the general unverified status in section 0.

---

## 4. Overall verdict

Two verdicts, because the contract changed during the engagement.

### As audited, commit `bad91f3`: not ready

The gap was not effort or polish. It was two circuits.

The engineering quality across most of this contract was already above what a hackathon submission usually shows. The arithmetic is careful, the assertion ordering is correct, the caller-identity binding is right, the color check is a real vulnerability the author found and fixed themselves, the comments explain reasoning rather than restating code, and delegating shielded-coin cryptography to Zswap instead of hand-rolling it is the mature call.

But a judge reading `privateSwapNightToAkd` end to end would have noticed that it mints real tokens and receives nothing, on a contract live at a published address. In a privacy-focused AMM competition, "the private swap gives away the pool for free" is the finding that ends the conversation. Worse, the two private circuits carried both the project's strongest claim and its worst defect. Separately, the README's Privacy Model made two specific claims that the public-transcript rule contradicts, on precisely the axis the review process scores.

### After remediation, 12 Sep 2026: ready to be judged on its merits

Every finding that would have decided the outcome is closed. The Critical is gone, both Highs that were fixable in the time available are fixed, and the false privacy claims have been replaced with an accurate account of the boundary in all four places they appeared.

What is left is a contract where all four swap circuits settle both legs for real, the supply mint cannot be front-run because there is no entry point to front-run, and the documentation describes what the code does rather than what the design intended. The remaining open findings (M-01, M-04, M-05, I-04 through I-06) are real but none of them is a fund-loss path, and each is now written down rather than discovered by a reviewer.

The change worth highlighting to a judge is not the code, it is the reasoning. The original design deliberately omitted the private path's tNIGHT leg to avoid a transparency leak, and the reasoning behind that was correct: `sendUnshielded` and `receiveUnshielded` really do publish the counterparty and the amount. The error was in the conclusion, not the analysis. A circuit whose AKD leg moves real value and whose tNIGHT leg moves none is not a privacy tradeoff, it is a one-way transfer. Choosing a transparent tNIGHT leg over a non-settling one, and saying plainly in the docs what that costs, is the correct resolution of a genuine platform constraint.

**Honest caveat on the remaining privacy story.** With the private path's tNIGHT leg now transparent, `privateSwapAkdToNight` publishes the trader's `UserAddress` as a payout destination.

This caveat was written as a secondary note. On-chain verification on 14 Sep showed it is the primary privacy finding of the whole audit, and that the High-severity finding it was appended to was false. Both private swaps publish the trader's unshielded address, the same address in each, and both amounts, visible in a block explorer without decoding anything. `privateSwapNightToAkd` is the better of the two only in that its AKD leg leaves the public ledger; its NIGHT leg still spends from and returns change to the trader's named address, so it identifies the trader just as plainly.

The accurate summary is therefore narrower than either the README or this audit originally said: **wrapping AKD removes a standing public balance and that part works; trading through either private circuit identifies you through the NIGHT leg.** The project should not claim the two directions are equally private, and should not claim either one is anonymous.

### What remains before Sep 28

Ordered by judging impact. Nothing here is a security blocker.

1. **Redeploy and re-verify.** The published addresses are still the pre-audit contract, and the README now says so explicitly rather than misleading a reviewer. Deploy the compiled contract, confirm the constructor minted to the deployer, seed liquidity, fund the faucet, then publish one verified transaction per circuit. This is the largest remaining item and the one a judge is most likely to check.

2. **Seed the pool well under the 4,000,000,000 cap.** M-05. Prevents the one-directional trading halt from being reachable during judging, without touching code.

3. **Watch the first CI run on this branch.** The `contract-compile` job is new and has never executed. It installs the toolchain from scratch, which is the step most likely to need adjusting, and it is worth having green before a judge sees the badge.

4. **Address the unshielded address leak, or document it prominently.** This replaces the old "decide on H-02" item, which is closed: H-02 was tested and refuted, and the witness refactor it recommended is already applied. The open question now is the real one. Both private swaps publish the trader's unshielded NIGHT address, and no wording change makes that untrue. Either constrain the private path to the direction that leaks least, or state the exposure plainly in the README next to the private-swap toggle so no user believes they are anonymous. A wrong belief about privacy is more dangerous than no privacy.

5. **Cleanup.** I-04 and I-05: delete `akdColor()`, which is unused by the frontend and costs a prover key, and remove the leftover test scaffolding from `contracts/src/test/`.

6. **Document M-04 prominently** rather than only as an implementation note, since it now applies to two circuits instead of one.

Items beyond this (computing `dy` on-chain for real slippage protection, adding a fee, `removeLiquidity`) are genuine improvements that will not change how this is judged in the time remaining.

---

*The original audit was performed by reading the complete source of `contracts/src/akad.compact`, `contracts/README.md`, the root `README.md`, the CI workflow, the build scripts, and the committed compiler artifacts. Compact execution semantics used in the privacy findings were verified against two independent Midnight reference sources, which agree that all exported circuit arguments form part of the public transcript. No transaction was submitted to any network during the audit. The remediation recorded above was applied afterwards and verified against a clean compile with compiler 0.31.1 and against the resulting artifacts, not against a live deployment: the post-audit contract has not been deployed at the time of writing.*

*Postscript, 14 Sep 2026. That sentence about two independent reference sources is exactly where this audit went wrong. Both sources said the same thing, neither was a transaction, and agreement between two documents is not evidence about a running system. H-02 was built on it and is false; M-02 borrowed the same premise and no longer stands. Both are marked in place rather than removed. The findings that survived, C-01, H-01 and H-03, were each reasoned from the contract's own control flow rather than from documentation about the platform, and the first two were later confirmed fixed by live transactions. That is the dividing line worth taking from this document: the findings grounded in code held up, and the finding grounded in a quotation did not.*
