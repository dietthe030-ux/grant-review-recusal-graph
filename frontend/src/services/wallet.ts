// ============================================================================
// Grant Review Recusal Graph — EIP-6963 Wallet Service
// ============================================================================

import {
  EIP6963ProviderDetail,
  EIP6963AnnounceProviderEvent,
  EIP1193Provider,
  WalletAccountState,
  SupportedWalletRDNS,
} from '@/types';
import {
  STUDIONET_CHAIN_ID,
  STUDIONET_CHAIN_HEX,
  STUDIONET_RPC_URL,
  STUDIONET_EXPLORER_URL,
  SUPPORTED_WALLETS,
} from '@/config/constants';

class WalletService {
  private discoveredProviders: Map<string, EIP6963ProviderDetail> = new Map();
  private listeners: Set<(providers: EIP6963ProviderDetail[]) => void> = new Set();

  public init(): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleAnnouncement = (event: Event) => {
      const announceEvent = event as unknown as EIP6963AnnounceProviderEvent;
      if (!announceEvent.detail || !announceEvent.detail.info) return;

      const { info, provider } = announceEvent.detail;
      // Index by RDNS and UUID
      this.discoveredProviders.set(info.rdns, { info, provider });
      this.discoveredProviders.set(info.uuid, { info, provider });
      this.notifyListeners();
    };

    window.addEventListener('eip6963:announceProvider', handleAnnouncement);

    // Request providers to announce themselves
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    // Legacy fallback check for supported extensions if no EIP-6963 emitted immediately
    this.checkLegacyProviders();

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnouncement);
    };
  }

  private checkLegacyProviders(): void {
    if (typeof window === 'undefined') return;

    const win = window as unknown as {
      ethereum?: EIP1193Provider & { isMetaMask?: boolean; isRabby?: boolean };
      okxwallet?: EIP1193Provider;
      rabby?: EIP1193Provider;
    };

    // MetaMask fallback
    if (win.ethereum?.isMetaMask && !this.discoveredProviders.has('io.metamask')) {
      this.discoveredProviders.set('io.metamask', {
        info: {
          uuid: 'legacy-metamask',
          name: 'MetaMask',
          icon: SUPPORTED_WALLETS[0].icon,
          rdns: 'io.metamask',
        },
        provider: win.ethereum,
      });
    }

    // OKX Wallet fallback
    if (win.okxwallet && !this.discoveredProviders.has('com.okex.wallet')) {
      this.discoveredProviders.set('com.okex.wallet', {
        info: {
          uuid: 'legacy-okx',
          name: 'OKX Wallet',
          icon: SUPPORTED_WALLETS[1].icon,
          rdns: 'com.okex.wallet',
        },
        provider: win.okxwallet,
      });
    }

    // Rabby fallback
    if ((win.rabby || win.ethereum?.isRabby) && !this.discoveredProviders.has('io.rabby')) {
      this.discoveredProviders.set('io.rabby', {
        info: {
          uuid: 'legacy-rabby',
          name: 'Rabby Wallet',
          icon: SUPPORTED_WALLETS[2].icon,
          rdns: 'io.rabby',
        },
        provider: win.rabby || win.ethereum!,
      });
    }
  }

  public subscribe(callback: (providers: EIP6963ProviderDetail[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getUniqueSupportedProviders());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    const unique = this.getUniqueSupportedProviders();
    this.listeners.forEach((listener) => listener(unique));
  }

  public getUniqueSupportedProviders(): EIP6963ProviderDetail[] {
    const result: EIP6963ProviderDetail[] = [];
    const supportedRdnsSet = new Set<string>(SUPPORTED_WALLETS.map((w) => w.rdns));

    // Dedup by RDNS
    const seenRdns = new Set<string>();

    for (const detail of this.discoveredProviders.values()) {
      if (supportedRdnsSet.has(detail.info.rdns) && !seenRdns.has(detail.info.rdns)) {
        seenRdns.add(detail.info.rdns);
        result.push(detail);
      }
    }

    return result;
  }

  public getProviderByRdns(rdns: SupportedWalletRDNS): EIP6963ProviderDetail | undefined {
    return this.discoveredProviders.get(rdns);
  }

  /**
   * Connects to a specific provider by RDNS or UUID.
   * Prompts user for eth_requestAccounts and inspects chainId.
   */
  public async connect(providerDetail: EIP6963ProviderDetail): Promise<WalletAccountState> {
    const provider = providerDetail.provider;
    if (!provider || typeof provider.request !== 'function') {
      throw new Error(`Provider for ${providerDetail.info.name} does not support EIP-1193 interface`);
    }

    try {
      const accounts = (await provider.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts authorized in wallet');
      }

      const chainIdHex = (await provider.request({
        method: 'eth_chainId',
      })) as string;

      const chainId = parseInt(chainIdHex, 16);
      const isCorrectChain = chainId === STUDIONET_CHAIN_ID;

      return {
        isConnected: true,
        account: accounts[0].toLowerCase(),
        chainId,
        isCorrectChain,
        providerDetail,
        error: null,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'User rejected wallet connection';
      return {
        isConnected: false,
        account: null,
        chainId: null,
        isCorrectChain: false,
        providerDetail,
        error: errorMsg,
      };
    }
  }

  /**
   * Requests wallet to switch to GenLayer Studionet (61999 / 0xf22f).
   * Automatically falls back to wallet_addEthereumChain if not registered yet.
   */
  public async switchToStudionet(provider: EIP1193Provider): Promise<boolean> {
    if (!provider || typeof provider.request !== 'function') {
      throw new Error('Invalid provider instance');
    }

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: STUDIONET_CHAIN_HEX }],
      });
      return true;
    } catch (switchError: unknown) {
      const err = switchError as { code?: number; message?: string };
      // Error code 4902 indicates chain has not been added to wallet yet
      if (err.code === 4902 || err.message?.includes('Unrecognized chain') || err.message?.includes('4902')) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: STUDIONET_CHAIN_HEX,
                chainName: 'GenLayer Studionet',
                rpcUrls: [STUDIONET_RPC_URL],
                nativeCurrency: {
                  name: 'GEN',
                  symbol: 'GEN',
                  decimals: 18,
                },
                blockExplorerUrls: [STUDIONET_EXPLORER_URL],
              },
            ],
          });
          return true;
        } catch (addError) {
          throw new Error(
            addError instanceof Error
              ? `Failed to add GenLayer Studionet: ${addError.message}`
              : 'Failed to add GenLayer Studionet to wallet'
          );
        }
      }
      throw new Error(
        switchError instanceof Error
          ? `Failed to switch to Studionet: ${switchError.message}`
          : 'Failed to switch network'
      );
    }
  }
}

export const walletService = new WalletService();
