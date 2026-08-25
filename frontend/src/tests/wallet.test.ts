// ============================================================================
// Grant Review Recusal Graph — Wallet Discovery & Network Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { walletService } from '@/services/wallet';
import { STUDIONET_CHAIN_ID, STUDIONET_CHAIN_HEX } from '@/config/constants';

describe('EIP-6963 Wallet Discovery Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters discovered providers to supported wallets only (MetaMask, OKX, Rabby)', () => {
    const providers = walletService.getUniqueSupportedProviders();
    const rdnsList = providers.map((p) => p.info.rdns);

    // Should only contain supported set
    const allowed = ['io.metamask', 'com.okex.wallet', 'io.rabby'];
    for (const rdns of rdnsList) {
      expect(allowed).toContain(rdns);
    }
  });

  it('connects to valid provider and checks Chain ID 61999', async () => {
    const mockProvider = {
      request: vi.fn().mockImplementation(async ({ method }) => {
        if (method === 'eth_requestAccounts') {
          return ['0x1234567890123456789012345678901234567890'];
        }
        if (method === 'eth_chainId') {
          return STUDIONET_CHAIN_HEX;
        }
        return null;
      }),
    };

    const mockDetail = {
      info: {
        uuid: 'test-mm',
        name: 'MetaMask',
        icon: '<svg></svg>',
        rdns: 'io.metamask',
      },
      provider: mockProvider,
    };

    const result = await walletService.connect(mockDetail);
    expect(result.isConnected).toBe(true);
    expect(result.account).toBe('0x1234567890123456789012345678901234567890');
    expect(result.chainId).toBe(STUDIONET_CHAIN_ID);
    expect(result.isCorrectChain).toBe(true);
  });

  it('handles user rejection gracefully without crashing', async () => {
    const mockProvider = {
      request: vi.fn().mockRejectedValue(new Error('User rejected the request')),
    };

    const mockDetail = {
      info: {
        uuid: 'test-reject',
        name: 'Rabby',
        icon: '<svg></svg>',
        rdns: 'io.rabby',
      },
      provider: mockProvider,
    };

    const result = await walletService.connect(mockDetail);
    expect(result.isConnected).toBe(false);
    expect(result.account).toBeNull();
    expect(result.error).toContain('User rejected');
  });

  it('switches or adds Studionet chain on 4902 code', async () => {
    const requestMock = vi.fn().mockImplementation(async ({ method }) => {
      if (method === 'wallet_switchEthereumChain') {
        const err = new Error('Unrecognized chain ID');
        (err as unknown as { code: number }).code = 4902;
        throw err;
      }
      if (method === 'wallet_addEthereumChain') {
        return null;
      }
      return null;
    });

    const mockProvider = { request: requestMock };
    const success = await walletService.switchToStudionet(mockProvider);
    expect(success).toBe(true);
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'wallet_addEthereumChain' })
    );
  });
});
