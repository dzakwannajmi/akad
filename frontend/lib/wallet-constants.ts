export const COMPATIBLE_CONNECTOR_API_VERSION = '4.x';
export const NETWORK_ID = process.env.NEXT_PUBLIC_NETWORK_ID ?? 'preview';
export const INDEXER_HTTP =
  process.env.NEXT_PUBLIC_INDEXER_HTTP ?? 'https://indexer.preview.midnight.network/api/v4/graphql';
export const INDEXER_WS =
  process.env.NEXT_PUBLIC_INDEXER_WS ?? 'wss://indexer.preview.midnight.network/api/v4/graphql/ws';
export const CONTRACT_PATH = process.env.NEXT_PUBLIC_TOKEN_CONTRACT_PATH ?? '/contracts/token';
export const PRIVATE_STATE_ID = 'akad-token-private-state';
export const PRIVATE_STATE_PASSWORD =
  process.env.NEXT_PUBLIC_PRIVATE_STATE_PASSWORD ?? 'akad-dev-only-password';
export const SWAP_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_SWAP_CONTRACT_ADDRESS ?? '';
export const TOKEN_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS ?? '';
