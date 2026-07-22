# Akad Frontend

Next.js app for Akad — landing page, swap interface, and wallet integration with Lace via the Midnight DApp Connector API.

## Structure

    app/
      page.tsx        landing page
      swap/            public swap interface
      deploy/          internal deploy/dev tooling (not part of the public flow)
    lib/
      wallet.ts               wallet detection + connect (DApp Connector API v4)
      providers.ts             Midnight.js provider setup (indexer, proof, private state)
      token-api.ts              deploy/init/wrap/unwrap calls for the token contract
      swap-api.ts                deploy/liquidity/swap calls for the swap contract
      bonding-curve.ts          constant-product math (mirrors the on-chain circuit)
      contracts/                compiled contract JS modules (bundled by webpack)
    public/contracts/           compiled ZK keys/zkir (fetched over HTTP by the wallet's proof pipeline)

## Setup

Install dependencies and configure environment:

    npm install
    cp .env.example .env.local
    npm run dev

Requires a Lace wallet (Midnight network set to **Preview**) with some tNIGHT for gas — see the [Preview faucet](https://faucet.preview.midnight.network/).

## Testing

    npm run test

## Notes

- Next.js 16 defaults to Turbopack; this project needs webpack (for WASM + `isomorphic-ws` support), so `dev`/`build` scripts pass `--webpack` explicitly.
- Contract deploy is a one-time operation done via `/deploy` (internal tooling) — end users only interact with `/swap`.
- See [docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) for integration issues encountered building this.
