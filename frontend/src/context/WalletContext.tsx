// ============================================================================
// Grant Review Recusal Graph — Wallet Context (EIP-6963 + Studionet)
// ============================================================================

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  EIP6963ProviderDetail,
  WalletAccountState,
  EIP1193Provider,
} from '@/types';
import { walletService } from '@/services/wallet';
import { STUDIONET_CHAIN_ID } from '@/config/constants';

interface WalletContextValue {
  walletState: WalletAccountState;
  discoveredProviders: EIP6963ProviderDetail[];
  isChooserOpen: boolean;
  openChooser: () => void;
  closeChooser: () => void;
  connectWallet: (providerDetail: EIP6963ProviderDetail) => Promise<boolean>;
  disconnectWallet: () => void;
  switchToStudionet: () => Promise<boolean>;
}

const initialWalletState: WalletAccountState = {
  isConnected: false,
  account: null,
  chainId: null,
  isCorrectChain: false,
  providerDetail: null,
  error: null,
};

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // CRITICAL REQUIREMENT: Every page load starts completely disconnected.
  const [walletState, setWalletState] = useState<WalletAccountState>(initialWalletState);
  const [discoveredProviders, setDiscoveredProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [isChooserOpen, setIsChooserOpen] = useState<boolean>(false);

  // Initialize EIP-6963 provider discovery
  useEffect(() => {
    const cleanupInit = walletService.init();
    const cleanupSubscribe = walletService.subscribe((providers) => {
      setDiscoveredProviders(providers);
    });

    return () => {
      cleanupInit();
      cleanupSubscribe();
    };
  }, []);

  // Listen to provider account and chain changes when connected
  useEffect(() => {
    if (!walletState.isConnected || !walletState.providerDetail) return;

    const provider = walletState.providerDetail.provider as EIP1193Provider;
    if (!provider || typeof provider.on !== 'function') return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accList = accounts as string[];
      if (!accList || accList.length === 0) {
        // Disconnected from wallet extension
        setWalletState(initialWalletState);
      } else {
        setWalletState((prev) => ({
          ...prev,
          account: accList[0].toLowerCase(),
        }));
      }
    };

    const handleChainChanged = (chainIdHex: unknown) => {
      const chainId = parseInt(chainIdHex as string, 16);
      setWalletState((prev) => ({
        ...prev,
        chainId,
        isCorrectChain: chainId === STUDIONET_CHAIN_ID,
      }));
    };

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);

    return () => {
      if (typeof provider.removeListener === 'function') {
        provider.removeListener('accountsChanged', handleAccountsChanged);
        provider.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [walletState.isConnected, walletState.providerDetail]);

  const openChooser = useCallback(() => setIsChooserOpen(true), []);
  const closeChooser = useCallback(() => setIsChooserOpen(false), []);

  const connectWallet = useCallback(
    async (providerDetail: EIP6963ProviderDetail): Promise<boolean> => {
      setWalletState((prev) => ({ ...prev, error: null }));
      const result = await walletService.connect(providerDetail);

      setWalletState(result);

      if (result.isConnected) {
        setIsChooserOpen(false);
        return true;
      }
      return false;
    },
    []
  );

  const disconnectWallet = useCallback(() => {
    setWalletState(initialWalletState);
  }, []);

  const switchToStudionet = useCallback(async (): Promise<boolean> => {
    if (!walletState.providerDetail) return false;
    try {
      await walletService.switchToStudionet(walletState.providerDetail.provider);
      setWalletState((prev) => ({
        ...prev,
        chainId: STUDIONET_CHAIN_ID,
        isCorrectChain: true,
      }));
      return true;
    } catch (err: unknown) {
      setWalletState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Network switch failed',
      }));
      return false;
    }
  }, [walletState.providerDetail]);

  return (
    <WalletContext.Provider
      value={{
        walletState,
        discoveredProviders,
        isChooserOpen,
        openChooser,
        closeChooser,
        connectWallet,
        disconnectWallet,
        switchToStudionet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
