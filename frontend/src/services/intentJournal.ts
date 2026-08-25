// ============================================================================
// Grant Review Recusal Graph — Transaction Intent Journal
// ============================================================================

import { TxIntent, TxIntentStatus } from '@/types';
import { STUDIONET_CHAIN_ID, DEPLOYED_CONTRACT_ADDRESS } from '@/config/constants';

const STORAGE_KEY = 'grrg_transaction_intents_v1';

class IntentJournal {
  private intents: Map<string, TxIntent> = new Map();
  private listeners: Set<(intents: TxIntent[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: TxIntent[] = JSON.parse(raw);
        for (const item of parsed) {
          this.intents.set(item.id, item);
        }
      }
    } catch {
      // Storage unavailable or corrupted
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.from(this.intents.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Ignore quota errors
    }
    this.notifyListeners();
  }

  public subscribe(callback: (intents: TxIntent[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getAllIntents());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    const list = this.getAllIntents();
    this.listeners.forEach((fn) => fn(list));
  }

  public createIntent(params: {
    account: string;
    method: string;
    canonicalArgs: unknown[];
    clientNonce: string;
    contractAddress?: string;
    chainId?: number;
  }): TxIntent {
    const id = `intent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();

    const intent: TxIntent = {
      id,
      chainId: params.chainId ?? STUDIONET_CHAIN_ID,
      contractAddress: params.contractAddress ?? DEPLOYED_CONTRACT_ADDRESS,
      account: params.account.toLowerCase(),
      method: params.method,
      canonicalArgs: params.canonicalArgs,
      clientNonce: params.clientNonce,
      status: 'PRE_SUBMIT',
      txHash: null,
      createdAt: now,
      updatedAt: now,
      readbackVerified: false,
    };

    this.intents.set(id, intent);
    this.saveToStorage();
    return intent;
  }

  public updateIntent(id: string, patch: Partial<TxIntent>): TxIntent | undefined {
    const existing = this.intents.get(id);
    if (!existing) return undefined;

    const updated: TxIntent = {
      ...existing,
      ...patch,
      updatedAt: Date.now(),
    };

    this.intents.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  public markHashSubmitted(id: string, txHash: string): TxIntent | undefined {
    return this.updateIntent(id, {
      txHash,
      status: 'SUBMITTED',
    });
  }

  public markRejected(id: string, reason: string): TxIntent | undefined {
    return this.updateIntent(id, {
      status: 'REJECTED',
      errorMessage: reason,
    });
  }

  public markFinalized(
    id: string,
    success: boolean,
    details: {
      finalityStatus?: number;
      consensusResult?: string;
      leaderResult?: string;
      errorMessage?: string;
      readbackVerified?: boolean;
      readbackData?: Record<string, unknown>;
    }
  ): TxIntent | undefined {
    const status: TxIntentStatus = success
      ? details.readbackVerified === false
        ? 'READBACK_FAILED'
        : 'FINALIZED_SUCCESS'
      : 'FINALIZED_FAILURE';

    return this.updateIntent(id, {
      status,
      ...details,
    });
  }

  public getIntent(id: string): TxIntent | undefined {
    return this.intents.get(id);
  }

  public getAllIntents(): TxIntent[] {
    return Array.from(this.intents.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getPendingIntents(account?: string): TxIntent[] {
    return this.getAllIntents().filter((i) => {
      const isPending = i.status === 'PRE_SUBMIT' || i.status === 'SUBMITTED';
      if (!isPending) return false;
      if (account) return i.account.toLowerCase() === account.toLowerCase();
      return true;
    });
  }

  public clearAll(): void {
    this.intents.clear();
    this.saveToStorage();
  }
}

export const intentJournal = new IntentJournal();
