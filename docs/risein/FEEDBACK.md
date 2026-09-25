# Feedback and Community Testing

Real people tried the live app on Midnight Preprod, then reported back through a public form
that asks for their wallet address and a transaction hash from their own session, so every
response is tied to usage that anyone can check on chain rather than to an unverifiable claim.

**70 responses. 70 unique wallets. 70 transaction hashes, every one verified on Preprod.**
Average rating 4.4 out of 5 (44 fives, 11 fours, 15 threes).

The wallet lists are in [`USERS.md`](USERS.md) (50 wallets) and
[`LAUNCH_USERS.md`](LAUNCH_USERS.md) (20 wallets, no overlap), each with the verification
method and the exact GraphQL query used, so the check can be repeated independently.

- Try it: [akad-dzakwannajmis-projects.vercel.app](https://akad-dzakwannajmis-projects.vercel.app)
- Give feedback: [forms.gle/dfwnHbQKNsZtm6DF7](https://forms.gle/dfwnHbQKNsZtm6DF7)
- Raw responses: [public response spreadsheet](https://docs.google.com/spreadsheets/d/1zu7t4H6PT3U2Y-WKDxBRs5Bgxmd6qQ2KHYS7sBgr7jE/edit?usp=sharing)
- Walkthrough: [demo video](https://youtu.be/NAkaJpubq-U)

---

## What We Heard

Quotes below are verbatim from the response spreadsheet, nothing paraphrased or invented.

### 1. People could not tell what the private path actually did (20 responses touched this)

> "The app was easy to use but I was not immediately sure what the wrap function did."

> "I was slightly confused about the difference between wrap and private swap."

> "The private swap feature is useful, but the process could show more confirmation details."

> "The basic flow works, but I needed some time to understand the private features."

> "I needed more context about what happens after wrapping AKD."

### 2. Transaction status was unclear (8 responses)

> "I was unsure whether the transaction had completed successfully at first."

> "I would like to see clearer feedback after a transaction is completed."

> "The application feels polished, but transaction status could be more detailed."

> "I would add clearer error messages when a transaction cannot be completed."

### 3. No transaction history (2 responses)

> "More detailed transaction history would make the app more useful."

> "I would like to see a transaction history page."

### 4. Terminology and guidance for first-time users (14 responses)

> "Would be helpful to have a small tooltip explaining each transaction type."

> "The concept is interesting but first-time users may need more explanation."

> "The interface is good, although the privacy terminology could be explained better."

> "Unwrap worked, but I think the terminology could be made more beginner-friendly."

### 5. Fees (1 response)

> "More information about fees and transaction costs would be helpful."

---

## What We Changed

Each item below names the concern it answers, the change, and the evidence. Where a change is
partial or still open, it says so. Nothing here is listed as done without a commit or a
transaction hash behind it.

### The private swap was not doing what testers thought, so we made it real

**Answers theme 1.** Chasing down why testers could not tell what the private swap did turned up
something worse than unclear wording. The circuits were not settling the NIGHT leg at all.
`privateSwapAkdToNight` accepted the trader's shielded AKD coin and paid back nothing;
`privateSwapNightToAkd` minted real AKD without ever receiving tNIGHT. Testers could not tell
what the private swap did on the NIGHT side because it did nothing.

Both were fixed to move real value, then verified on chain rather than assumed.

- Commit: `fix(contracts): settle real tNIGHT on the private swap path, replace init() with a constructor`
- Commit: `Wire real tNIGHT settlement into the public swap path`

**Answers theme 1 as well.** The fix above made the private path settle, but it introduced a
different problem that only showed up once real transactions were inspected: the NIGHT leg
published the trader's unshielded address in the clear, the same address in both directions, so
the two "private" swaps were linkable to one wallet by anyone opening a block explorer.

Midnight's own token documentation states that NIGHT can never be private: "NIGHT is an
unshielded token: its balances and transfers are always public, and holding NIGHT at a shielded
address does not make it private." No amount of care inside the circuit could fix that.

So the pairing changed. Trades now run shielded AKD against sNIGHT, a shielded 1:1 claim on
tNIGHT the contract holds in custody, and no address appears in a swap at all. Transparency
moved to the boundary: entering and leaving the pool is visible, the trades between are not.

Verified on Preprod against contract `2689c5c24d4f560ec4ce0be14641ad544bca382d524ebdcb2e69c152f179a51a`:

| What it proves | Transaction |
|---|---|
| Shielded AKD in, shielded sNIGHT out, no address published | [`9b3279472c`](https://explorer.1am.xyz/tx/9b3279472c483cc84381f357455bd4acbd7ad33235b271def35d515da025f3de?network=preprod) |
| Shielded sNIGHT in, shielded AKD out, no address published | [`db36fb3411`](https://explorer.1am.xyz/tx/db36fb3411411f3265c66e844c8f1935b928a45cd332568342a4070d6f60de7f?network=preprod) |
| sNIGHT redeemed for real tNIGHT, proving the 1:1 claim | [`1f50267947`](https://explorer.1am.xyz/tx/1f50267947ee63e9d0cc54866238402c585731142b499a7521c51778cd12cc41?network=preprod) |
| The leak this replaced, for comparison: same wallet named in the clear | [`e09aa8d677`](https://explorer.1am.xyz/tx/e09aa8d67739fb510eb3739aafdae762974af9d53296c1cc4d6952e072605609?network=preprod) |

### Swaps move real tokens on both legs now

**Answers theme 1 and the trust question underneath it.** What the app called a swap is now a
swap of real value in both directions, on the public path and the shielded path alike. The
AKD leg was always real; the NIGHT leg is now real too, settled through the contract's own
custody rather than left out of the circuit.

- Commit: `Wire real tNIGHT settlement into the public swap path`
- Commit: `docs: update deployed contract addresses and verified tx proof after tNIGHT redeploy`

### Every privacy claim is now checkable rather than asserted

**Answers theme 2 and theme 4.** Testers who could not tell what had happened had no way to
check. Now they do.

`scripts/zk-public-inputs.mjs` prints the number of public inputs to each circuit's ZK proof,
read straight from the compiler's own output, so the privacy properties can be measured from a
clean clone instead of taken on trust:

```
cd contracts && compact compile src/akad.compact ../build/akad
node scripts/zk-public-inputs.mjs
```

The README's Privacy Model section was rewritten to state plainly what is public and what is
not, including the parts that are not private, and every claim in it was checked against a live
transaction rather than against platform documentation.

### A pool page with live reserves and a transaction history

**Answers theme 3, and partly theme 2.** A dedicated pool page reads reserves straight from the
contract and lists every wrap, unwrap and swap made through Akad, verified against the chain and
shown for every user rather than only the current session.

### Still open, and not being claimed as done

Listing these is more useful to a reviewer than pretending the list is empty.

- **In-app transaction status.** Theme 2 is only partly answered. Actions are recorded and
  linkable to the explorer, but the app still does not show a live pending or confirmed state
  during a transaction, and error messages are still raw.
- **Tooltips and a first-run tutorial.** Theme 4 asked for per-action explanations inside the
  interface. The documentation improved; the interface copy did not, beyond the shielded-swap
  panel.
- **Fee and cost information.** Theme 5 is not addressed at all. Nothing in the app shows what a
  transaction will cost before it is submitted.
