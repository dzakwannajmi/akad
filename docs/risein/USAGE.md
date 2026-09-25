# Using Akad

A step by step walkthrough of every action the app supports, what each one does on chain, and
what it reveals to an observer. No prior Midnight experience assumed.

Live app: [akad-dzakwannajmis-projects.vercel.app](https://akad-dzakwannajmis-projects.vercel.app)

Current contract, Preprod: `2689c5c24d4f560ec4ce0be14641ad544bca382d524ebdcb2e69c152f179a51a`

---

## Before you start

**1. Install a wallet.** [1AM](https://1am.xyz) is recommended. Lace works for the public path but
hangs inside its own `balanceUnsealedTransaction` on shielded receive, which blocks `unwrap`.

**2. Switch the wallet to Preprod**, and switch the app to Preprod with the network toggle in the
header. Both must match or the wallet will refuse to connect.

**3. Get testnet funds** from the [Preprod faucet](https://faucet.preprod.midnight.network/).
You need tNIGHT, which the pool trades against, and DUST, which is generated from tNIGHT and pays
transaction fees. Wait for both to appear before continuing. Nothing here uses real money.

---

## The flow

### 1. Connect

Open the app, click **Launch App**, then **Connect wallet**. Confirm the network indicator reads
Preprod.

### 2. Claim AKD

A new wallet starts with zero AKD. The faucet control calls `claimFaucet()` and credits 50 AKD,
once per wallet, permanently. If it reports "faucet is empty, ask the deployer to top it up", the
on-chain faucet account needs refunding and nothing in the UI can fix that.

### 3. Public swap

Enter an AKD amount, review the quote, submit. This calls `swapAkdToNight(dx, dy, minOut,
recipient)`. Both legs settle for real: your AKD balance drops and real tNIGHT arrives from the
pool's own custody. Swapping back calls `swapNightToAkd(dx, dy, minOut)`.

This path is public by design. Your address and the amounts are visible on chain.

### 4. Wrap AKD to shielded

On the **Wrap** tab, enter an amount. `wrap(amount)` burns that public balance and mints you a
native Zswap shielded coin. Check your wallet: the shielded AKD shows as a shielded token with no
matching public balance row.

The coin's nonce is generated in your browser and never leaves it. The app stores it locally
because the wallet reports a shielded balance but cannot give back the nonce needed to spend a
specific coin. Clearing site data loses it.

### 5. Shielded swap, AKD to sNIGHT

On the **Swap** tab, open settings and choose **Private**, direction AKD to NIGHT. The amount is
locked to the value of your shielded coin, because the circuit spends the whole coin and makes no
change.

This calls `shieldedSwapAkdToNight(dy, minOut)`. Your shielded AKD coin goes in, a shielded sNIGHT
coin comes out, and **no address appears in the transaction at all**.

sNIGHT is this contract's shielded 1:1 claim on tNIGHT it holds in custody. It exists because
tNIGHT itself can never be private: Midnight's token documentation states that NIGHT "is an
unshielded token: its balances and transfers are always public". Pairing against a shielded token
is the only way a swap can avoid naming you.

### 6. Shielded swap back

Same toggle, direction NIGHT to AKD, calls `shieldedSwapNightToAkd(dy, minOut)`. Your sNIGHT coin
is spent and a fresh shielded AKD coin is minted to you. Again no address is published.

### 7. Redeem sNIGHT for real tNIGHT

On the **Wrap** tab, the sNIGHT panel shows your balance and a **Redeem for tNIGHT** button. This
calls `unwrapNight(recipient)` and sends real tNIGHT from the contract's custody to your wallet.

**This transaction does publish your address**, and that is deliberate. It is the pool boundary:
an observer learns that someone left the pool, not what they did inside it.

### 8. Unwrap AKD back to public

On the **Unwrap** tab, `unwrap()` sends your shielded AKD coin back to the contract and restores
your public balance. It takes no arguments at all; the coin comes from private state.

---

## What each action reveals

| Action | Address published | Amount recoverable | Notes |
|---|---|---|---|
| `claimFaucet()` | no | yes, fixed 50 AKD | Writes a public balance row for your key |
| `swapAkdToNight()` | **yes** | yes | Public path, transparent by design |
| `swapNightToAkd()` | **yes** | yes | Public path, transparent by design |
| `wrap()` | no | yes, from the balance delta | Removes your standing public balance |
| `unwrap()` | no | yes, from the balance delta | Zero public inputs to its proof |
| `shieldedSwapAkdToNight()` | **no** | yes, from the reserve delta | Verified on chain |
| `shieldedSwapNightToAkd()` | **no** | yes, from the reserve delta | Verified on chain |
| `unwrapNight()` | **yes** | yes | Pool boundary, deliberate |

Trade amounts are public on every path. A constant-product AMM prices from public reserves, so
the reserve delta is the trade size. That is true on every chain and Akad does not pretend
otherwise. What the shielded path removes is your identity, not the number.

---

## Verifying it yourself

Every action returns a transaction hash. Open it on
[explorer.1am.xyz](https://explorer.1am.xyz) with `?network=preprod` and read three fields:
`STATUS`, `EXECUTION SEGMENTS` (a `FAILED` segment means the effects were rolled back), and the
created and spent unshielded outputs. A shielded swap should show no unshielded outputs at all.

To measure the privacy properties rather than trust them, compile the contract and read the
number of public inputs to each circuit's proof:

```bash
cd contracts && compact compile src/akad.compact ../build/akad
cd .. && node scripts/zk-public-inputs.mjs
```

`unwrap` reports 0 public inputs and both shielded swaps report 2. Note that a low count does not
mean a circuit is private: ledger writes and unshielded transfers are separate channels, and the
script says so in its own header.

---

## If something goes wrong

See [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md). The three most common issues:

- **Wallet will not connect.** The wallet's network and the app's toggle do not match.
- **`unwrap` hangs forever.** Known Lace issue on shielded receive. Use 1AM.
- **A swap fails with "reserveAKD exceeds safe bound".** Reserves are capped at 4,000,000,000 base
  units. That direction is blocked until someone trades the other way.
