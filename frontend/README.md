# Akad Frontend

Next.js app for Akad: landing page, swap interface, and wallet integration (1AM and Lace) via the Midnight DApp Connector API.

## Structure

    app/
      page.tsx        landing page
      swap/            swap, wrap/unwrap, and private-swap interface (tabbed widget)
      activity/        contract-wide activity feed (every wrap/unwrap/swap, cross-wallet)
      changelog/       real project history, pulled from git log
      roadmap/         where Akad could go next
      faucet/          public AKD faucet claim page
      deploy/          internal deploy/dev tooling (not part of the public flow)
      api/activity/    activity feed API route (Supabase-backed, indexer-verified before insert)
    lib/
      wallet.ts                          wallet detection + connect (DApp Connector API v4)
      wallet-constants.ts                shared wallet/network constants
      providers.ts                       Midnight.js provider setup (indexer, proof, private state)
      memory-private-state-provider.ts   in-memory private-state provider
      akad-api.ts                        deploy/init/wrap/unwrap/swap/private-swap calls for the merged akad.compact contract
      activity-api.ts                    client for the activity feed API
      bonding-curve.ts                   constant-product math (mirrors the on-chain circuit)
      networks.ts                        per-network (Preview/Preprod) config and the active-network store
      supabase-admin.ts                  server-side Supabase client for the activity API route
      contracts/                         compiled contract JS modules (bundled by webpack)
    contexts/NetworkContext.tsx    React state for the active network, wired to lib/networks.ts
    public/contracts/              compiled ZK keys/zkir (fetched over HTTP by the wallet's proof pipeline)

## Setup

Install dependencies and configure environment:

    npm install
    cp .env.example .env.local
    npm run dev

Requires a Midnight wallet, **1AM** (recommended) or Lace, with the network set to **Preview** (default) or **Preprod**, and some NIGHT for gas. See the [Preview faucet](https://faucet.preview.midnight.network/), or claim AKD from the in-app faucet at `/faucet` once connected.

## Testing

    npm run test

## Notes

- Next.js 16 defaults to Turbopack; this project needs webpack (for WASM + `isomorphic-ws` support), so `dev`/`build` scripts pass `--webpack` explicitly.
- Contract deploy is a one-time operation done via `/deploy` (internal tooling). End users only interact with `/swap`, `/faucet`, and `/activity`.
- `unwrap` is verified on 1AM; Lace hangs inside its own `balanceUnsealedTransaction` on shielded receive. See [docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) for that and other integration issues encountered building this.
