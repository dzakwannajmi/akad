# How to Compile and Run Akad

Written so a reviewer with no prior context can get from a clean clone to a compiled contract and a working swap without asking questions.

Two independent things are described here. **Section A compiles the contract**, which is the part the hackathon's review process cares about most and needs no wallet. **Section B runs the demo**, which needs a Midnight wallet and testnet funds. You can do A without B.

---

## A. Compile the contract

### A1. Prerequisites

- macOS or Linux. On Windows, use WSL2.
- About 2 GB of free disk (the proving keys are large).
- Network access to `github.com` and `raw.githubusercontent.com`.

No Node.js, no Docker, and no wallet are needed for this section.

### A2. Install the Compact toolchain

Two steps: the `compact` developer tool, then the compiler itself.

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
```

This installs the `compact` binary to `$HOME/.local/bin` (or `$XDG_BIN_HOME` if set) and appends that directory to your shell profile. Either open a new shell or run:

```bash
export PATH="$HOME/.local/bin:$PATH"
compact --version
```

Then install the compiler version this project is pinned to:

```bash
compact update 0.31.1
compact list
```

`compact list` should show `0.31.1` among the installed toolchains. The pin matters: 0.31.1 is the version compatible with the Preview network, and it is the version recorded in the committed build artifacts (`contracts/managed/akad/compiler/contract-info.json`).

If `compact update` fails with a GitHub credentials or rate-limit error, the toolchain fetch is being blocked by a proxy or by GitHub's unauthenticated API limits. Set a personal access token (`export GITHUB_TOKEN=<your token>`) and retry, or run the install from a network without an intercepting proxy.

### A3. Clone and compile

```bash
git clone https://github.com/dzakwannajmi/akad.git
cd akad/contracts
compact compile src/akad.compact ../build/akad
```

Expect this to take a few minutes: the compiler generates a proving key and a verifying key for each of the 10 circuits. It prints each one as it goes, ending at `10/10`.

### A4. Verify the output

```bash
ls ../build/akad
# expected: compiler/  contract/  keys/  zkir/

cat ../build/akad/compiler/contract-info.json | head -5
# expected: "compiler-version": "0.31.1", "language-version": "0.23.0", "runtime-version": "0.16.0"

ls ../build/akad/keys | wc -l
# expected: 20  (a .prover and a .verifier for each of 10 circuits)
```

The circuits are `transfer`, `claimFaucet`, `recordTokenColor`, `wrap`, `unwrap`, `addLiquidity`, `swapAkdToNight`, `swapNightToAkd`, `shieldedSwapAkdToNight`, `shieldedSwapNightToAkd`, `unwrapNight`. There is deliberately no `init` circuit: the supply is minted by the contract's constructor at deploy time, so there is no initialisation call for anyone to front-run. If you see `init` in the list, you are not on this branch.

### A5. Compare against the committed artifacts

The repository commits its build output to `contracts/managed/akad/`, so you can check that what you just compiled matches what the author shipped:

```bash
cd ..    # repo root
diff <(node -e "console.log(require('./build/akad/compiler/contract-info.json').circuits.map(c=>c.name+'/'+c.arguments.length).join('\n'))") \
     <(node -e "console.log(require('./contracts/managed/akad/compiler/contract-info.json').circuits.map(c=>c.name+'/'+c.arguments.length).join('\n'))")
```

No output means the circuit set and signatures match. (Proving keys themselves are not byte-reproducible across machines, so do not expect the `keys/` binaries to be identical.)

### A6. Sync artifacts to the frontend

Only needed if you are going on to section B and want to deploy your own instance:

```bash
./scripts/sync-contract-artifacts.sh akad
```

This copies the compiled output into the three places that consume it: `frontend/lib/contracts/akad/contract` (the JS module loaded by `loadCompiledContract()`), `frontend/public/contracts/akad/{keys,zkir}` (the ZK assets served over HTTP to the proving provider), and `contracts/managed/akad` (the in-repo copy).

---

## B. Run the demo

### B1. Use the hosted app (fastest)

**https://akad-dzakwannajmis-projects.vercel.app**

Already deployed and pointed at live contracts. Skip to B3.

| Network | Contract address |
|---|---|
| Preview (default) | `676fb20d4062e293d6521bd8e70af202345f75406ba4922d66453148a9d636ae` |
| Preprod | `2689c5c24d4f560ec4ce0be14641ad544bca382d524ebdcb2e69c152f179a51a` |

Explorer: https://explorer.preview.midnight.network/contracts/stream/676fb20d4062e293d6521bd8e70af202345f75406ba4922d66453148a9d636ae

### B2. Or run it locally

Requires Node.js 22 and the compile from section A, including step A6.

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

The defaults in `.env.example` work as-is against the public Preview indexer. To point at the already-deployed Preview contract rather than deploying your own, set:

```
NEXT_PUBLIC_AKAD_CONTRACT_ADDRESS_PREVIEW=676fb20d4062e293d6521bd8e70af202345f75406ba4922d66453148a9d636ae
```

Leave `SUPABASE_URL` and `SUPABASE_SECRET_KEY` empty. They back an optional shared activity feed and nothing in the swap flow depends on them.

To deploy your own instance instead, use the app's `/deploy` page with a funded wallet, then paste the resulting address into the matching `NEXT_PUBLIC_AKAD_CONTRACT_ADDRESS_*` variable. The deploy transaction mints the full supply to the deploying wallet through the constructor, so the only remaining step before swaps work is `addLiquidity()` (the Seed Liquidity button on the same page), plus funding the faucet if you want other wallets to try it.

### B3. Set up a wallet

1. **Install 1AM** (recommended) or [Lace](https://www.lace.io/midnight).

   Use 1AM if you intend to try `unwrap` or the private swaps. On Lace, the shielded-receive transaction hangs inside the wallet's own `balanceUnsealedTransaction` and never returns. This is a wallet-side issue, not a contract one, but it will block you.

2. **Switch the wallet's network to Preview.**

3. **Get testnet funds** from the Preview faucet: **https://faucet.preview.midnight.network/**

   You need NIGHT (which is also what the pool trades against) and DUST, which is generated from NIGHT and pays transaction fees. Wait for both to appear in the wallet before continuing.

### B4. Walk the swap flow

1. Open the app and click **Launch App**.
2. **Connect wallet** on the swap page. Confirm the network indicator reads Preview.
3. **Claim AKD.** A new wallet starts at zero AKD. Use the faucet control in the app to call `claimFaucet()`, which credits 50 AKD, once per wallet, forever. If it fails with "faucet is empty, ask the deployer to top it up", the on-chain faucet account needs refunding and there is nothing you can do from the UI.
4. **Public swap.** Enter an AKD amount, review the quote, and submit. This calls `swapAkdToNight(dx, dy, minOut, recipient)`. Both legs settle for real: your AKD balance decreases and real tNIGHT arrives in your wallet from the pool's own custody.
5. **Swap back.** `swapNightToAkd(dx, dy, minOut)` moves real tNIGHT from your wallet into pool custody and credits AKD to your balance.
6. **Wrap to private.** Below the swap card, wrap an AKD amount. This calls `wrap(amount, nonce)`, burning the public balance and minting a native Zswap shielded coin to you. Check your wallet: the shielded AKD appears as a native shielded token, with no corresponding public balance row.
7. **Unwrap.** Sends the coin back to the contract and restores your public balance. **1AM only.**

### B5. Private swap: read this before trying it

The **Private** toggle in the swap card's settings calls `shieldedSwapAkdToNight` or `shieldedSwapNightToAkd`, trading shielded AKD against sNIGHT with no address published.

Both directions settle for real, the same as the public path, but move real value as shielded coins rather than through `sendUnshielded`/`receiveUnshielded`, so no address is published. This replaces an earlier design, `privateSwapAkdToNight`/`privateSwapNightToAkd`, which first shipped with the tNIGHT leg missing entirely (findings C-01 and H-01 in [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)), then was fixed to settle tNIGHT for real but published the trader's unshielded NIGHT address on every call. Both circuits were removed and replaced with the sNIGHT-pair design described above.

What the private path buys you, stated precisely: your AKD moves as a shielded Zswap coin instead of a public `balances` row. What it does not buy you: the tNIGHT leg is transparent, the trade size is visible in the reserve delta, and for the AKD to NIGHT direction the payout address is published as a circuit argument. See [MIDNIGHT_IMPLEMENTATION.md](./MIDNIGHT_IMPLEMENTATION.md) for the full boundary.

### B6. Verify on chain

**Do this rather than trusting the app's status text.** The frontend reports success as soon as the wallet returns a transaction id, which is before the chain has executed anything. A transaction can land as `PARTIAL_SUCCESS`, with its contract effects rolled back, and still look successful in the interface. On the explorer, three fields tell you what really happened: `STATUS`, `EXECUTION SEGMENTS` (any `FAILED` segment means the effects were reverted), and `SPENT INPUTS` (an unshielded token movement that shows zero spent inputs never actually moved anything).

Every action produces a transaction hash. Check it on:

- Night Scan: `https://explorer.preview.midnight.network/`
- 1AM explorer: `https://explorer.1am.xyz/tx/<hash>?network=preview` (or `?network=preprod`)

The root `README.md` keeps a table of verified transactions, one per circuit per network. Note that several rows are currently marked "pending re-verification" against the latest redeployed addresses.

---

## C. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `compact: command not found` | The installer's PATH edit has not taken effect. Run `export PATH="$HOME/.local/bin:$PATH"` or open a new shell |
| `compact update` fails with GitHub credentials or rate-limit errors | Toolchain fetch is being blocked. Set `GITHUB_TOKEN` and retry, or use a network without an intercepting proxy |
| Compile succeeds but the frontend loads an old contract | `scripts/sync-contract-artifacts.sh akad` was not run after compiling (step A6) |
| Wallet will not connect | Wallet network does not match the app's network toggle. Both must be Preview, or both Preprod |
| Transaction fails with "insufficient balance" | Claim from the in-app AKD faucet first (step B3.3). AKD and NIGHT are separate balances |
| No DUST / transactions will not submit | DUST is generated from NIGHT. Get NIGHT from the faucet and wait for DUST to appear |
| `unwrap` hangs and never completes | Known Lace issue: it stalls inside `balanceUnsealedTransaction` on shielded receive. Use 1AM |
| "faucet is empty, ask the deployer to top it up" | The on-chain faucet custody account has run dry. The deployer must refund it with `transfer(faucetAddress, amount)` |
| "pool has insufficient tNIGHT custody for this swap" | The pool's recorded `reserveNight` exceeds the tNIGHT it actually holds. See finding M-03 |
| "reserveAKD exceeds safe bound" | Reserves are capped at 4,000,000,000 base units (4,000 AKD). The AKD-in direction is blocked until someone trades the other way. See finding M-05 |
| The app says a transaction succeeded, but nothing changed on chain | Check the transaction on the explorer before believing the UI. The frontend reports success as soon as it receives a transaction id, so a `PARTIAL_SUCCESS` transaction whose effects were rolled back looks exactly like a real one in the interface. On the explorer, look at `STATUS`, `EXECUTION SEGMENTS` and `SPENT INPUTS`. |
| Seed Liquidity reports success but reserves stay at 0 and no NIGHT leaves the wallet | The transaction landed as `PARTIAL_SUCCESS` with `SPENT INPUTS: 0`: the wallet attached no unshielded NIGHT, so `receiveUnshielded` went unsatisfied and everything rolled back. This was hit three times during development and the root cause was never identified. It is not an amount problem and not a balance problem (both were ruled out by testing). The remedy that worked was a clean redeploy running the steps strictly in order: deploy, record token colour, seed liquidity, fund faucet. `addLiquidity` can be retried on the same deployment after a rollback, since a failed attempt leaves the reserves untouched. |

---

## D. Repository map

```
contracts/
  src/akad.compact          the contract (433 lines, everything the audit covers)
  managed/akad/             committed build output (compiler 0.31.1)
  README.md                 developer-facing contract notes
frontend/                   Next.js app: landing, swap UI, wallet integration, /deploy page
scripts/
  sync-contract-artifacts.sh   copies build output to the three places that consume it
docs/                       build notes, troubleshooting log, proposal, feedback
hackathon/                  this folder: judge-facing documentation
  ARCHITECTURE.md           contract architecture for a first-time reader
  SECURITY_AUDIT.md         independent security audit with findings and punch list
  MIDNIGHT_IMPLEMENTATION.md how Midnight privacy features are used
  HOW_TO_RUN.md             this file
```

Suggested reading order for a reviewer: `ARCHITECTURE.md`, then `MIDNIGHT_IMPLEMENTATION.md`, then `SECURITY_AUDIT.md`.
