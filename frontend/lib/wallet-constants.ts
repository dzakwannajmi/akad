// Network-agnostic constants only. Per-network values (indexer endpoints,
// contract address, wallet.connect() target) live in lib/networks.ts now
// that the network is user-selectable at runtime instead of fixed at
// build time -- see NetworkContext.
export const COMPATIBLE_CONNECTOR_API_VERSION = '4.x';
export const CONTRACT_PATH = process.env.NEXT_PUBLIC_AKAD_CONTRACT_PATH ?? '/contracts/akad';
export const PRIVATE_STATE_ID = 'akad-private-state';
export const PRIVATE_STATE_PASSWORD =
  process.env.NEXT_PUBLIC_PRIVATE_STATE_PASSWORD ?? 'akad-dev-only-password';
