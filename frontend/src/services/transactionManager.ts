// ============================================================================
// Grant Review Recusal Graph — Transaction Manager (Authentic Finality & Calldata)
// ============================================================================

import {
  EIP1193Provider,
  TxIntent,
} from '@/types';
import {
  DEPLOYED_CONTRACT_ADDRESS,
  STUDIONET_CHAIN_ID,
  TX_POLL_INTERVAL_BASE_MS,
  TX_POLL_INTERVAL_MAX_MS,
  TX_TIMEOUT_MS,
  STUDIONET_RPC_URL,
} from '@/config/constants';
import { intentJournal } from './intentJournal';
import { rpcCoordinator } from './rpcCoordinator';
import { contractRepository } from './contractRepository';
import { abi, createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export interface TxExecutionResult {
  success: boolean;
  intent: TxIntent;
  txHash: string | null;
  readbackVerified: boolean;
  readbackData?: Record<string, unknown>;
  error?: string;
}

export interface GenLayerTxDetails {
  status: number | string; // 7 = FINALIZED
  resultName?: string; // 'MAJORITY_AGREE' | 'SUCCESS' | 'AGREE'
  txExecutionResultName?: string; // 'FINISHED_WITH_RETURN'
  consensus_data?: {
    finality?: string | number;
    votes?: Record<string, unknown>;
    leader_result?: string; // 'SUCCESS' | 'ERROR'
    consensus_result?: string; // 'MAJORITY_AGREE' | 'MAJORITY_DISAGREE'
  };
  leaderReceipt?: {
    execution_result?: string;
    vote?: string;
    result?: string;
    error?: string | null;
  };
  leader_execution?: string | { status: string };
  execution_result?: string;
  transaction_hash?: string;
  txReceipt?: string;
}

export class TransactionManager {
  private contractAddress: string;

  constructor(address: string = DEPLOYED_CONTRACT_ADDRESS) {
    this.contractAddress = address;
  }

  /**
   * Encodes state-modifying calldata using official GenLayer SDK binary encoding.
   */
  public encodeCalldata(method: string, args: unknown[]): string {
    const calldataObj = abi.calldata.makeCalldataObject(method, args as never, undefined);
    const encoded = abi.calldata.encode(calldataObj);
    return abi.transactions.serialize([encoded as never, false]);
  }

  /**
   * Submits a transaction to GenLayer Studionet with complete two-phase intent lifecycle.
   */
  public async executeTransaction(params: {
    provider: EIP1193Provider;
    account: string;
    method: string;
    args: unknown[];
    clientNonce?: string;
    onStatusChange?: (intent: TxIntent) => void;
  }): Promise<TxExecutionResult> {
    const clientNonce = params.clientNonce || `nonce_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const accountLower = params.account.toLowerCase();

    // 1. PRE-SUBMIT: Persist intent BEFORE prompting wallet extension
    let intent = intentJournal.createIntent({
      account: accountLower,
      method: params.method,
      canonicalArgs: params.args,
      clientNonce,
      contractAddress: this.contractAddress,
      chainId: STUDIONET_CHAIN_ID,
    });
    params.onStatusChange?.(intent);

    let txHash: string | null = null;

    try {
      // 2. Submit transaction via selected EIP-1193 provider using GenLayer SDK or encoded calldata
      try {
        const client = createClient({
          chain: studionet,
          endpoint: STUDIONET_RPC_URL,
          account: accountLower as `0x${string}`,
          provider: params.provider as never,
        });

        const hashResult = await client.writeContract({
          address: this.contractAddress as `0x${string}`,
          functionName: params.method,
          args: params.args as never,
          value: 0n,
        });

        txHash = typeof hashResult === 'string' ? hashResult : (hashResult as { hash?: string })?.hash || null;
      } catch {
        // Fallback to direct provider eth_sendTransaction with GenLayer serialized calldata
        const serializedCalldata = this.encodeCalldata(params.method, params.args);
        const txParams = {
          from: accountLower,
          to: this.contractAddress,
          data: serializedCalldata,
          value: '0x0',
        };

        const response = await params.provider.request({
          method: 'eth_sendTransaction',
          params: [txParams],
        });

        txHash = typeof response === 'string' ? response : (response as { hash?: string })?.hash || null;
      }

      if (!txHash) {
        throw new Error('Wallet did not return a valid transaction hash');
      }

      // 3. SUBMITTED: Hash obtained - immediately persist. NEVER resubmit automatically.
      intent = intentJournal.markHashSubmitted(intent.id, txHash)!;
      params.onStatusChange?.(intent);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isRejection =
        errorMsg.includes('4001') ||
        errorMsg.toLowerCase().includes('reject') ||
        errorMsg.toLowerCase().includes('denied') ||
        errorMsg.toLowerCase().includes('cancelled') ||
        errorMsg.toLowerCase().includes('user rejected');

      if (isRejection) {
        intent = intentJournal.markRejected(intent.id, 'User rejected transaction signature')!;
      } else {
        intent = intentJournal.updateIntent(intent.id, {
          status: 'PRE_SUBMIT',
          errorMessage: `Submission failed: ${errorMsg}`,
        })!;
      }
      params.onStatusChange?.(intent);

      return {
        success: false,
        intent,
        txHash: null,
        readbackVerified: false,
        error: intent.errorMessage,
      };
    }

    // 4. POLL FOR GENLAYER CONSENSUS FINALITY
    return await this.finalizeSubmittedIntent(intent, params.method, params.args, accountLower, params.onStatusChange);
  }

  /**
   * Polls, verifies consensus, and executes authoritative readback for a submitted intent.
   */
  public async finalizeSubmittedIntent(
    intent: TxIntent,
    method: string,
    args: unknown[],
    account: string,
    onStatusChange?: (intent: TxIntent) => void
  ): Promise<TxExecutionResult> {
    if (!intent.txHash) {
      throw new Error('Intent has no transaction hash');
    }

    const txHash = intent.txHash;

    try {
      const txDetails = await this.pollReceipt(txHash);

      // Verify consensus and leader execution
      const verification = this.verifyReceipt(txDetails);
      if (!verification.isSuccess) {
        intent = intentJournal.markFinalized(intent.id, false, {
          finalityStatus: verification.finalityStatus,
          errorMessage: verification.error,
          consensusResult: verification.consensusResult,
          leaderResult: verification.leaderResult,
        })!;
        onStatusChange?.(intent);

        return {
          success: false,
          intent,
          txHash,
          readbackVerified: false,
          error: verification.error,
        };
      }

      // Invalidate RPC read cache before readback to avoid stale cache
      rpcCoordinator.invalidateCache();

      // 5. AUTHORITATIVE READBACK: Verify on-chain state mutated as expected
      const readback = await this.performAuthoritativeReadback(method, args, account, intent.clientNonce);

      intent = intentJournal.markFinalized(intent.id, readback.verified, {
        finalityStatus: 7,
        readbackVerified: readback.verified,
        readbackData: readback.data,
        consensusResult: verification.consensusResult,
        leaderResult: verification.leaderResult,
      })!;
      onStatusChange?.(intent);

      return {
        success: readback.verified,
        intent,
        txHash,
        readbackVerified: readback.verified,
        readbackData: readback.data,
        error: readback.verified ? undefined : 'Authoritative post-transaction readback failed',
      };
    } catch (pollErr: unknown) {
      const errorMsg = pollErr instanceof Error ? pollErr.message : 'Transaction confirmation timed out';
      intent = intentJournal.updateIntent(intent.id, {
        status: 'TIMED_OUT',
        errorMessage: errorMsg,
      })!;
      onStatusChange?.(intent);

      return {
        success: false,
        intent,
        txHash,
        readbackVerified: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Polls Studionet for GenLayer transaction finality with exponential backoff and visibility pausing.
   */
  public async pollReceipt(txHash: string): Promise<GenLayerTxDetails> {
    const startTime = Date.now();
    let currentInterval = TX_POLL_INTERVAL_BASE_MS;

    while (Date.now() - startTime < TX_TIMEOUT_MS) {
      // Pause if document is hidden
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      try {
        // Query gen_getTransactionByHash via RPC coordinator
        const tx = await rpcCoordinator.call<GenLayerTxDetails>(
          'gen_getTransactionByHash',
          [txHash],
          { bypassCache: true }
        );

        if (tx && (tx.status !== undefined && tx.status !== null)) {
          const numStatus = typeof tx.status === 'string' ? parseInt(tx.status, 10) : tx.status;
          // Status 7 = FINALIZED, or string FINALIZED / CANCELED
          if (
            numStatus === 7 ||
            tx.status === 'FINALIZED' ||
            tx.status === 'CANCELED' ||
            numStatus === 8
          ) {
            return tx;
          }
        }
      } catch {
        // Fallback probe via getTransactionReceipt
        try {
          const receipt = await rpcCoordinator.call<GenLayerTxDetails>(
            'gen_getTransactionReceipt',
            [txHash],
            { bypassCache: true }
          );
          if (receipt && (receipt.status === 7 || receipt.status === '7' || receipt.status === 'FINALIZED')) {
            return receipt;
          }
        } catch {
          // Still pending
        }
      }

      await new Promise((resolve) => setTimeout(resolve, currentInterval));
      currentInterval = Math.min(currentInterval * 1.4, TX_POLL_INTERVAL_MAX_MS);
    }

    throw new Error(`Transaction confirmation timed out after 10 minutes (${txHash})`);
  }

  /**
   * Strictly verifies GenLayer finality (status 7), leader execution, and consensus outcome.
   * Rejects Ethereum 0x1 or status 5 (ACCEPTED) as finalized.
   */
  public verifyReceipt(tx: GenLayerTxDetails): {
    isSuccess: boolean;
    finalityStatus?: number;
    error?: string;
    consensusResult?: string;
    leaderResult?: string;
  } {
    if (!tx) {
      return { isSuccess: false, error: 'Empty transaction details returned from RPC' };
    }

    const rawStatus = tx.status;
    const numStatus = typeof rawStatus === 'string' ? parseInt(rawStatus, 10) : rawStatus;

    // Strict requirement: Reject status 0x1 (Ethereum receipt) or status 5 (ACCEPTED) as finalized
    if (rawStatus === '0x1' || rawStatus === '0x01' || rawStatus === 1) {
      return {
        isSuccess: false,
        error: 'Ethereum receipt 0x1 is insufficient: GenLayer consensus finality (status 7) required',
      };
    }

    const isFinalized = numStatus === 7 || rawStatus === 'FINALIZED';
    if (!isFinalized) {
      return {
        isSuccess: false,
        finalityStatus: isNaN(numStatus) ? undefined : numStatus,
        error: `Transaction not finalized (status: ${rawStatus})`,
      };
    }

    // Consensus evaluation
    const consensusResult = tx.resultName || tx.consensus_data?.consensus_result;

    if (!consensusResult) {
      return {
        isSuccess: false,
        finalityStatus: 7,
        error: 'Finalized transaction is missing a consensus result',
      };
    }

    // Reject consensus disagreements
    if (
      consensusResult === 'MAJORITY_DISAGREE' ||
      consensusResult === 'DISAGREE' ||
      consensusResult === 'DETERMINISTIC_VIOLATION' ||
      consensusResult === 'TIMEOUT' ||
      consensusResult === 'NO_MAJORITY'
    ) {
      return {
        isSuccess: false,
        finalityStatus: 7,
        error: `Validators reached consensus rejection: ${consensusResult}`,
        consensusResult,
      };
    }

    // Leader execution result
    const leaderResult =
      tx.txExecutionResultName ||
      tx.leaderReceipt?.execution_result ||
      tx.consensus_data?.leader_result ||
      (typeof tx.leader_execution === 'string' ? tx.leader_execution : tx.leader_execution?.status);

    if (!leaderResult) {
      return {
        isSuccess: false,
        finalityStatus: 7,
        error: 'Finalized transaction is missing a leader execution result',
        consensusResult,
      };
    }

    if (
      leaderResult === 'FINISHED_WITH_ERROR' ||
      leaderResult === 'ERROR' ||
      leaderResult === 'FAILED'
    ) {
      const errDetail = tx.leaderReceipt?.error || 'Leader execution reverted with error';
      return {
        isSuccess: false,
        finalityStatus: 7,
        error: `Contract execution failed: ${errDetail}`,
        consensusResult,
        leaderResult,
      };
    }

    return {
      isSuccess: true,
      finalityStatus: 7,
      consensusResult,
      leaderResult,
    };
  }

  /**
   * Reads back authoritative on-chain state for all 12 contract write methods.
   */
  public async executeReadback(
    method: string,
    args: unknown[],
    account: string,
    clientNonce: string = ''
  ): Promise<Record<string, unknown>> {
    const res = await this.performAuthoritativeReadback(method, args, account, clientNonce);
    return res.data;
  }

  public async performAuthoritativeReadback(
    method: string,
    args: unknown[],
    account: string,
    clientNonce: string
  ): Promise<{ verified: boolean; data: Record<string, unknown> }> {
    try {
      switch (method) {
        case 'create_round': {
          // Resolve round ID via get_round_id_by_nonce
          const nonce = String(args[0] || clientNonce);
          const resolvedRoundId = await contractRepository.getRoundIdByNonce(account, nonce);
          const round = await contractRepository.getRound(resolvedRoundId);
          return {
            verified: round.id === resolvedRoundId,
            data: { roundId: resolvedRoundId, lifecycle: round.lifecycle },
          };
        }

        case 'add_applicant': {
          const roundId = Number(args[0]);
          const wallet = String(args[1] || '').toLowerCase();
          const orcid = String(args[2] || '').trim();
          const round = await contractRepository.getRound(roundId);
          const applicant = await contractRepository.getParticipant(
            roundId,
            Math.max(0, round.applicant_count - 1),
            false
          );
          const matches =
            applicant.wallet.toLowerCase() === wallet || applicant.orcid === orcid;
          return { verified: matches, data: { applicantIndex: applicant.index } };
        }

        case 'add_reviewer': {
          const roundId = Number(args[0]);
          const wallet = String(args[1] || '').toLowerCase();
          const orcid = String(args[2] || '').trim();
          const isBackup = Boolean(args[4]);
          const round = await contractRepository.getRound(roundId);
          const totalRevs = round.reviewer_count + (round.backup_count || round.backup_reviewer_count || 0);
          const reviewer = await contractRepository.getParticipant(
            roundId,
            Math.max(0, totalRevs - 1),
            true
          );
          const matches =
            reviewer.wallet.toLowerCase() === wallet || reviewer.orcid === orcid;
          return {
            verified: matches && reviewer.is_backup === isBackup,
            data: { reviewerIndex: reviewer.index, isBackup },
          };
        }

        case 'set_assignment': {
          const roundId = Number(args[0]);
          const applicantIndex = Number(args[1]);
          const primaryIndex = Number(args[2]);
          const assignment = await contractRepository.getAssignment(roundId, applicantIndex);
          return {
            verified: assignment.primary_index === primaryIndex,
            data: {
              applicantIndex,
              primaryIndex: assignment.primary_index,
              backups: assignment.backup_indexes_csv,
            },
          };
        }

        case 'acknowledge_identity': {
          const roundId = Number(args[0]);
          const fullState = await contractRepository.loadFullRoundState(roundId);
          const participant = [...fullState.applicants, ...fullState.reviewers].find(
            (p) => p.wallet.toLowerCase() === account.toLowerCase()
          );
          return {
            verified: Boolean(participant?.acknowledged),
            data: { participantIndex: participant?.index, acknowledged: participant?.acknowledged },
          };
        }

        case 'decline_assignment': {
          const roundId = Number(args[0]);
          const fullState = await contractRepository.loadFullRoundState(roundId);
          const reviewer = fullState.reviewers.find(
            (p) => p.wallet.toLowerCase() === account.toLowerCase()
          );
          return {
            verified: reviewer?.declined === true,
            data: { reviewerIndex: reviewer?.index, declined: reviewer?.declined ?? false },
          };
        }

        case 'freeze_round': {
          const roundId = Number(args[0]);
          const round = await contractRepository.getRound(roundId);
          const isFrozen =
            round.lifecycle === 'FROZEN' ||
            round.lifecycle === 'SCREENING' ||
            round.lifecycle === 'READY' ||
            round.lifecycle === 'HOLD' ||
            round.lifecycle === 'ACTIVE';
          return { verified: isFrozen, data: { roundId, lifecycle: round.lifecycle } };
        }

        case 'screen_pair': {
          const roundId = Number(args[0]);
          const appIdx = Number(args[1]);
          const revIdx = Number(args[2]);
          const assessment = await contractRepository.getPairAssessment(roundId, appIdx, revIdx);
          return {
            verified: assessment.attempt > 0,
            data: {
              roundId,
              attempt: assessment.attempt,
              outcome: assessment.outcome,
              consequence: assessment.consequence,
            },
          };
        }

        case 'finalize_screening': {
          const roundId = Number(args[0]);
          const round = await contractRepository.getRound(roundId);
          const isFinalized = round.lifecycle === 'READY' || round.lifecycle === 'HOLD';
          return { verified: isFinalized, data: { roundId, lifecycle: round.lifecycle } };
        }

        case 'activate_panel': {
          const roundId = Number(args[0]);
          const round = await contractRepository.getRound(roundId);
          return {
            verified: round.lifecycle === 'ACTIVE' && Boolean(round.active_panel_fingerprint),
            data: {
              roundId,
              lifecycle: round.lifecycle,
              panelFingerprint: round.active_panel_fingerprint,
            },
          };
        }

        case 'close_round': {
          const roundId = Number(args[0]);
          const round = await contractRepository.getRound(roundId);
          return {
            verified: round.lifecycle === 'CLOSED',
            data: {
              roundId,
              lifecycle: round.lifecycle,
              panelFingerprint: round.active_panel_fingerprint,
            },
          };
        }

        case 'cancel_round': {
          const roundId = Number(args[0]);
          const round = await contractRepository.getRound(roundId);
          return {
            verified: round.lifecycle === 'CANCELLED',
            data: { roundId, lifecycle: round.lifecycle },
          };
        }

        default:
          return { verified: false, data: { error: `Unsupported readback method: ${method}` } };
      }
    } catch {
      return { verified: false, data: { error: 'Readback query failed' } };
    }
  }

  /**
   * Reconciles any submitted transactions from previous sessions on reload.
   */
  public async reconcilePendingIntents(
    onStatusChange?: (intent: TxIntent) => void
  ): Promise<void> {
    const pending = intentJournal.getPendingIntents();
    for (const intent of pending) {
      if (intent.status === 'SUBMITTED' && intent.txHash) {
        await this.finalizeSubmittedIntent(
          intent,
          intent.method,
          intent.canonicalArgs,
          intent.account,
          onStatusChange
        );
      }
    }
  }
}

export const transactionManager = new TransactionManager();
