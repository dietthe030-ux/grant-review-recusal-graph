// ============================================================================
// Grant Review Recusal Graph — Network & Contract Constants
// ============================================================================

export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_HEX = '0xf22f';
export const STUDIONET_RPC_URL = import.meta.env.VITE_GENLAYER_RPC_URL || 'https://studio.genlayer.com/api';
export const STUDIONET_EXPLORER_URL = import.meta.env.VITE_GENLAYER_EXPLORER_URL || 'https://explorer-studio.genlayer.com';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const DEPLOYED_CONTRACT_ADDRESS = (
  import.meta.env.VITE_CONTRACT_ADDRESS || '0x7304a94d1aE82C22fE52DB71b8D698D932AD1Dd9'
);

export const DEPLOYMENT_TX_HASH = '0xc95cab13549c3a3265a96d2a318841d1946eb06c302c54ad1e3d6349c6ad9381';
export const EXACT_SOURCE_SHA256 = '2e8f9a6639e148c2cb58a56ec40e38549abb8dd55037b68d13b56005bf49d10';
export const POLICY_VERSION = 'GRRG-V1';

// Domain Limits from Contract Specification
export const MAX_APPLICANTS = 4;
export const MAX_PRIMARY_REVIEWERS = 5;
export const MAX_BACKUP_REVIEWERS = 3;
export const MAX_TOTAL_PARTICIPANTS = 12;
export const MAX_PAIRS_PER_ROUND = 20;
export const MAX_EVENTS_PER_ROUND = 256;
export const MAX_EVENTS_PAGE_SIZE = 20;
export const MIN_QUORUM = 2;
export const MAX_QUORUM = 4;
export const MAX_ASSESSMENT_RETRIES = 3;

// RPC Coordinator & Polling Timing
export const READ_CACHE_TTL_MS = 8000; // 8 seconds TTL
export const TX_POLL_INTERVAL_BASE_MS = 2500; // 2.5s base
export const TX_POLL_INTERVAL_MAX_MS = 10000; // 10s max backoff
export const TX_TIMEOUT_MS = 600000; // 10 minutes max deadline
export const COOLDOWN_429_BASE_MS = 3000; // 3s base backoff on 429/5xx with jitter

// Supported EIP-6963 Wallets (exact set: MetaMask, OKX Wallet, Rabby)
export const SUPPORTED_WALLETS = [
  {
    rdns: 'io.metamask',
    name: 'MetaMask',
    icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 318.6 318.6"><path fill="%23E2761B" stroke="%23E2761B" stroke-linecap="round" stroke-linejoin="round" d="m274.1 35.5-99.5 73.9L194 65.4z"/><path fill="%23E4761B" stroke="%23E4761B" stroke-linecap="round" stroke-linejoin="round" d="m44.4 35.5 98.7 74.6-18.5-44.7z"/><path fill="%23E4761B" stroke="%23E4761B" stroke-linecap="round" stroke-linejoin="round" d="m238.3 206.8-28.5 42.2 56.8 15.6 16.3-57.1z"/><path fill="%23E4761B" stroke="%23E4761B" stroke-linecap="round" stroke-linejoin="round" d="m35.8 207.5 16.3 57.1 56.8-15.6-28.5-42.2z"/></svg>',
  },
  {
    rdns: 'com.okex.wallet',
    name: 'OKX Wallet',
    icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23000"/><path fill="%23fff" d="M30 30h16v16H30zm24 0h16v16H54zM30 54h16v16H30zm24 0h16v16H54z"/></svg>',
  },
  {
    rdns: 'io.rabby',
    name: 'Rabby Wallet',
    icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%237084FF"/><circle cx="50" cy="50" r="30" fill="%23fff"/></svg>',
  },
] as const;
