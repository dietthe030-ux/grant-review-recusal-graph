// ============================================================================
// Grant Review Recusal Graph — Contract Interaction Hook
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  TxIntent,
  FullRoundState,
} from '@/types';
import { contractRepository } from '@/services/contractRepository';
import { transactionManager, TxExecutionResult } from '@/services/transactionManager';
import { useWallet } from '@/context/WalletContext';
import { EIP1193Provider } from '@/types';

export function useContract() {
  const { walletState } = useWallet();
  const [currentRoundId, setCurrentRoundId] = useState<number>(0);
  const [fullState, setFullState] = useState<FullRoundState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIntent, setActiveIntent] = useState<TxIntent | null>(null);
  const [isTransacting, setIsTransacting] = useState<boolean>(false);

  const fetchState = useCallback(async (roundId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const state = await contractRepository.loadFullRoundState(roundId);
      setFullState(state);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load round state from GenLayer Studionet';
      setError(msg);
      setFullState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState(currentRoundId);
  }, [currentRoundId, fetchState]);

  // Reconcile pending intents on mount
  useEffect(() => {
    transactionManager.reconcilePendingIntents((intent) => {
      setActiveIntent({ ...intent });
    }).catch(() => {});
  }, []);

  const refreshState = useCallback(async () => {
    await fetchState(currentRoundId);
  }, [currentRoundId, fetchState]);

  const executeWrite = useCallback(
    async (method: string, args: unknown[], clientNonce?: string): Promise<TxExecutionResult> => {
      if (!walletState.isConnected || !walletState.account || !walletState.providerDetail) {
        throw new Error('Wallet must be connected to submit transactions');
      }

      setIsTransacting(true);
      setActiveIntent(null);

      try {
        const result = await transactionManager.executeTransaction({
          provider: walletState.providerDetail.provider as EIP1193Provider,
          account: walletState.account,
          method,
          args,
          clientNonce,
          onStatusChange: (intent) => {
            setActiveIntent({ ...intent });
          },
        });

        if (result.success) {
          // If round creation succeeded, auto-transition to newly created round ID if resolved
          if (method === 'create_round' && result.readbackData?.roundId !== undefined) {
            const newId = Number(result.readbackData.roundId);
            if (!isNaN(newId)) {
              setCurrentRoundId(newId);
            }
          }
          await refreshState();
        }

        return result;
      } finally {
        setIsTransacting(false);
      }
    },
    [walletState, refreshState]
  );

  return {
    currentRoundId,
    setCurrentRoundId,
    fullState,
    isLoading,
    error,
    refreshState,
    isTransacting,
    activeIntent,
    setActiveIntent,
    executeWrite,
  };
}
