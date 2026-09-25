# Rise In Submission Evidence

This folder holds the evidence map for the Rise In x Midnight "New Moon to Full" builder program.
It is kept separate on purpose: the repository's root `README.md` is the submission for the
[Midnight Korea Hackathon 2026](https://www.hackathon.midnightkorea.org/), and mixing two
programs into one document serves neither reviewer well.

Every Rise In artifact lives in this folder: the user lists ([`USERS.md`](USERS.md),
[`LAUNCH_USERS.md`](LAUNCH_USERS.md)), the feedback loop ([`FEEDBACK.md`](FEEDBACK.md)) and the
original program proposal ([`PROPOSAL.md`](PROPOSAL.md)). Everything referenced below lives in the repository. Nothing here depends on an external
spreadsheet or a link that could change.

---

## Level 5, Full Moon

| Requirement | Evidence | Where |
|---|---|---|
| 50 Preprod user wallet addresses, with dates | 50 unique wallets, each with a date, the features tested, and a transaction hash. Every hash verified on the Preprod indexer. | [`USERS.md`](USERS.md) |
| Feedback documentation with "What We Heard" and "What We Changed" | Verbatim quotes from 70 responses grouped into five themes, then a change log where every entry names a commit or a transaction hash | [`FEEDBACK.md`](FEEDBACK.md) |
| Feedback acted on, tied to code changes | Each "What We Changed" item names the commit message behind it and, where the change is on chain, the transaction that proves it | [`FEEDBACK.md`](FEEDBACK.md#what-we-changed) |
| Revised documentation, user-validation section | Both user lists, each with the verification method and the exact indexer query, plus the feedback loop built on them | [`USERS.md`](USERS.md), [`LAUNCH_USERS.md`](LAUNCH_USERS.md), [`FEEDBACK.md`](FEEDBACK.md) |
| Usage documentation | Step by step walkthrough of every action, with what each one reveals on chain | [`USAGE.md`](USAGE.md) |
| Minimum 20 commits | 58 commits on `main` | [commit history](https://github.com/dzakwannajmi/akad/commits/main) |

## Level 6, Supermoon

| Requirement | Evidence | Where |
|---|---|---|
| Final Preprod contract deployment | `2689c5c24d4f560ec4ce0be14641ad544bca382d524ebdcb2e69c152f179a51a`, with a per-circuit table of verified transactions | [`README.md`](../../README.md#verified-transactions) |
| Feedback improvements shipped | Real settlement on both swap paths, then the shielded sNIGHT pairing, each with on-chain proof | [`FEEDBACK.md`](FEEDBACK.md#what-we-changed) |
| 20 launch user wallet addresses, distinct from Level 5 | 20 unique wallets, zero overlap with `USERS.md`, split at a real four hour gap in the data | [`LAUNCH_USERS.md`](LAUNCH_USERS.md) |
| Complete final README | Contract address, live demo, demo video, privacy model, end to end flows, local setup, CI | [`README.md`](../../README.md) |
| Brand assets and X profile | [@akadtok](https://x.com/akadtok), assets under `frontend/public/brand` and `frontend/components/brand` | repository |
| Minimum 30 commits | 58 commits on `main` | [commit history](https://github.com/dzakwannajmi/akad/commits/main) |

---

## What changed since the previous review

The previous review did not fail on the quality of the work. It failed because the mandatory
artifacts were not present as files a reviewer could open. The response spreadsheet was linked
but not in the repository, and the commit history was not part of what was judged. Each gap is
now closed with a file rather than a link.

**The user lists are real and independently checkable.** Every one of the 70 transaction hashes
submitted by testers was queried against the public Preprod indexer:

- 70 of 70 resolve on chain.
- 70 of 70 settled with status `SUCCESS`.
- Every one calls an Akad circuit on one of the two deployed Preprod contracts.
- All 70 wallet addresses are unique and validly formatted.

Where a circuit publishes an unshielded address, the claimed wallet was compared against the
on-chain counterparty. Fifteen rows could be checked that way and fifteen matched. The rest call
circuits that publish no address at all, which is the privacy property this contract exists for,
and that limit is documented in the user lists rather than glossed over. One row submitted a hash
belonging to another wallet in the same list, most likely a copy-paste slip, and it is flagged in
place rather than deleted or counted as a clean match.

Both user lists include the exact GraphQL query used, so the verification can be repeated by
anyone without trusting this repository's summary of it.

**The feedback loop names its own open items.** `FEEDBACK.md` ends with three requests that
have not been addressed: in-app transaction status, tooltips and a first-run tutorial, and fee
information. Listing them is more useful to a reviewer than an all-green table.
