// ============================================================================
// Grant Review Recusal Graph — Transaction Manager & Intent Journal Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transactionManager } from '@/services/transactionManager';
import { intentJournal } from '@/services/intentJournal';
import { contractRepository } from '@/services/contractRepository';
import { rpcCoordinator } from '@/services/rpcCoordinator';

describe('Transaction Manager & Intent Journal (Strict GenLayer Consensus)', () => {
  beforeEach(() => {
    intentJournal.clearAll();
    vi.restoreAllMocks();
  });

  it('creates pre-submit intent and updates to submitted when wallet returns txHash', () => {
    const intent = intentJournal.createIntent({
      account: '0x1234567890123456789012345678901234567890',
      method: 'freeze_round',
      canonicalArgs: [0],
      clientNonce: 'test_nonce_1',
    });

    expect(intent.status).toBe('PRE_SUBMIT');
    expect(intent.method).toBe('freeze_round');
    expect(intent.txHash).toBeNull();

    const submitted = intentJournal.markHashSubmitted(intent.id, '0xabcdef123456');
    expect(submitted?.status).toBe('SUBMITTED');
    expect(submitted?.txHash).toBe('0xabcdef123456');
  });

  it('marks rejected when user declines signature in wallet', () => {
    const intent = intentJournal.createIntent({
      account: '0x1234567890123456789012345678901234567890',
      method: 'create_round',
      canonicalArgs: [],
      clientNonce: 'nonce_reject',
    });

    const rejected = intentJournal.markRejected(intent.id, 'User rejected signature');
    expect(rejected?.status).toBe('REJECTED');
    expect(rejected?.errorMessage).toContain('rejected');
  });

  it('verifies receipt with status 7 (FINALIZED), leader SUCCESS, and consensus agreement', () => {
    const validReceipt = {
      status: 7,
      consensus_data: {
        consensus_result: 'MAJORITY_AGREE',
        leader_result: 'SUCCESS',
      },
    };

    const verification = transactionManager.verifyReceipt(validReceipt);
    expect(verification.isSuccess).toBe(true);
    expect(verification.consensusResult).toBe('MAJORITY_AGREE');
    expect(verification.leaderResult).toBe('SUCCESS');
  });

  it('verifies the exact finalized Studio transaction shape', () => {
    const verification = transactionManager.verifyReceipt({
      status: 7,
      statusName: 'FINALIZED',
      result_name: 'MAJORITY_AGREE',
      consensus_data: {
        votes: { '0xvalidator': 'agree' },
        leader_receipt: [{ vote: 'agree', execution_result: 'SUCCESS' }],
      },
    });

    expect(verification).toMatchObject({
      isSuccess: true,
      finalityStatus: 7,
      consensusResult: 'MAJORITY_AGREE',
      leaderResult: 'SUCCESS',
    });
  });

  it('rejects Ethereum-style receipt status 0x1 or status 1 (requires GenLayer status 7)', () => {
    const ethReceipt = {
      status: 1, // Ethereum receipt status 0x1
      consensus_data: {
        consensus_result: 'MAJORITY_AGREE',
        leader_result: 'SUCCESS',
      },
    };

    const verification = transactionManager.verifyReceipt(ethReceipt);
    expect(verification.isSuccess).toBe(false);
    expect(verification.error).toContain('Ethereum receipt 0x1 is insufficient');
  });

  it('rejects status 5 (ACCEPTED) as not finalized yet', () => {
    const pendingReceipt = {
      status: 5, // ACCEPTED
      consensus_data: {
        consensus_result: 'PENDING',
        leader_result: 'PENDING',
      },
    };

    const verification = transactionManager.verifyReceipt(pendingReceipt);
    expect(verification.isSuccess).toBe(false);
    expect(verification.error).toContain('Transaction not finalized (status: 5)');
  });

  it('rejects receipt if consensus disagreed (MAJORITY_DISAGREE)', () => {
    const disagreedReceipt = {
      status: 7,
      consensus_data: {
        consensus_result: 'MAJORITY_DISAGREE',
        leader_result: 'SUCCESS',
      },
    };

    const verification = transactionManager.verifyReceipt(disagreedReceipt);
    expect(verification.isSuccess).toBe(false);
    expect(verification.error).toContain('MAJORITY_DISAGREE');
  });

  it('rejects receipt if leader execution returned ERROR', () => {
    const errorReceipt = {
      status: 7,
      consensus_data: {
        consensus_result: 'MAJORITY_AGREE',
        leader_result: 'ERROR',
      },
    };

    const verification = transactionManager.verifyReceipt(errorReceipt);
    expect(verification.isSuccess).toBe(false);
    expect(verification.error).toContain('reverted');
  });

  it('surfaces the exact Studio rollback payload', () => {
    const verification = transactionManager.verifyReceipt({
      status: 7,
      result_name: 'MAJORITY_AGREE',
      consensus_data: {
        leader_receipt: [{
          execution_result: 'ERROR',
          result: {
            status: 'rollback',
            payload: 'Primary pair (1, 1) remains in EVIDENCE_HOLD',
          },
        }],
      },
    });

    expect(verification.isSuccess).toBe(false);
    expect(verification.error).toContain('Primary pair (1, 1) remains in EVIDENCE_HOLD');
  });

  it('fails closed on an unknown finalized consensus result', () => {
    const verification = transactionManager.verifyReceipt({
      status: 7,
      result_name: 'UNKNOWN_RESULT',
      consensus_data: { leader_receipt: [{ execution_result: 'SUCCESS' }] },
    });

    expect(verification.isSuccess).toBe(false);
    expect(verification.error).toContain('UNKNOWN_RESULT');
  });

  it('fails closed when finalized leader execution is not SUCCESS', () => {
    const verification = transactionManager.verifyReceipt({
      status: 7,
      result_name: 'MAJORITY_AGREE',
      consensus_data: { leader_receipt: [{ execution_result: 'PENDING' }] },
    });

    expect(verification.isSuccess).toBe(false);
    expect(verification.leaderResult).toBe('PENDING');
  });

  it('performs authoritative action-specific readback for create_round (resolving round ID)', async () => {
    const mockGetRoundId = vi.spyOn(contractRepository, 'getRoundIdByNonce').mockResolvedValue(5);
    const mockGetRound = vi.spyOn(contractRepository, 'getRound').mockResolvedValue({
      id: 5,
      admin: '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8',
      client_nonce: 'unique_nonce_5',
      title_hash: 'hash5',
      title: 'Round 5',
      policy_version: 'GRRG-V1',
      quorum: 2,
      freeze_deadline: 1800000000,
      acknowledge_deadline: 1800003600,
      lifecycle: 'DRAFT',
      applicant_count: 0,
      reviewer_count: 0,
      backup_reviewer_count: 0,
      screened_pairs_count: 0,
      active_panel_fingerprint: '',
    });

    const readbackResult = await transactionManager.executeReadback(
      'create_round',
      ['unique_nonce_5', 'Round 5', 2, 1800000000, 1800003600],
      '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8',
      'unique_nonce_5'
    );

    expect(mockGetRoundId).toHaveBeenCalledWith(
      '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8',
      'unique_nonce_5'
    );
    expect(mockGetRound).toHaveBeenCalledWith(5);
    expect(readbackResult).toEqual({ roundId: 5, lifecycle: 'DRAFT' });
  });

  it('performs authoritative action-specific readback for freeze_round', async () => {
    const mockGetRound = vi.spyOn(contractRepository, 'getRound').mockResolvedValue({
      id: 0,
      admin: '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8',
      client_nonce: 'nonce_0',
      title_hash: 'hash0',
      title: 'Round 0',
      policy_version: 'GRRG-V1',
      quorum: 2,
      freeze_deadline: 1800000000,
      acknowledge_deadline: 1800003600,
      lifecycle: 'FROZEN',
      applicant_count: 2,
      reviewer_count: 2,
      backup_reviewer_count: 0,
      screened_pairs_count: 0,
      active_panel_fingerprint: '',
    });

    const readbackResult = await transactionManager.executeReadback(
      'freeze_round',
      [0],
      '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8'
    );

    expect(mockGetRound).toHaveBeenCalledWith(0);
    expect(readbackResult).toEqual({ roundId: 0, lifecycle: 'FROZEN' });
  });

  it('performs authoritative action-specific readback for activate_panel', async () => {
    vi.spyOn(contractRepository, 'getRound').mockResolvedValue({
      id: 0,
      admin: '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8',
      client_nonce: 'nonce_0',
      title_hash: 'hash0',
      title: 'Round 0',
      policy_version: 'GRRG-V1',
      quorum: 2,
      freeze_deadline: 1800000000,
      acknowledge_deadline: 1800003600,
      lifecycle: 'ACTIVE',
      applicant_count: 2,
      reviewer_count: 2,
      backup_reviewer_count: 0,
      screened_pairs_count: 4,
      active_panel_fingerprint: 'panel_fp_01',
    });

    const readbackResult = await transactionManager.executeReadback(
      'activate_panel',
      [0],
      '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8'
    );

    expect(readbackResult).toEqual({
      roundId: 0,
      lifecycle: 'ACTIVE',
      panelFingerprint: 'panel_fp_01',
    });
  });

  it('performs authoritative action-specific readback for close_round', async () => {
    vi.spyOn(contractRepository, 'getRound').mockResolvedValue({
      id: 0,
      admin: '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8',
      client_nonce: 'nonce_0',
      title_hash: 'hash0',
      title: 'Round 0',
      policy_version: 'GRRG-V1',
      quorum: 2,
      freeze_deadline: 1800000000,
      acknowledge_deadline: 1800003600,
      lifecycle: 'CLOSED',
      applicant_count: 2,
      reviewer_count: 2,
      backup_reviewer_count: 0,
      screened_pairs_count: 4,
      active_panel_fingerprint: 'panel_fp_01',
    });

    const readbackResult = await transactionManager.executeReadback(
      'close_round',
      [0],
      '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8'
    );

    expect(readbackResult).toEqual({
      roundId: 0,
      lifecycle: 'CLOSED',
      panelFingerprint: 'panel_fp_01',
    });
  });

  it('performs authoritative action-specific readback for cancel_round', async () => {
    vi.spyOn(contractRepository, 'getRound').mockResolvedValue({
      id: 1,
      admin: '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8',
      client_nonce: 'nonce_1',
      title_hash: 'hash1',
      title: 'Round 1',
      policy_version: 'GRRG-V1',
      quorum: 2,
      freeze_deadline: 1800000000,
      acknowledge_deadline: 1800003600,
      lifecycle: 'CANCELLED',
      applicant_count: 0,
      reviewer_count: 0,
      backup_reviewer_count: 0,
      screened_pairs_count: 0,
      active_panel_fingerprint: '',
    });

    const readbackResult = await transactionManager.executeReadback(
      'cancel_round',
      [1],
      '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8'
    );

    expect(readbackResult).toEqual({
      roundId: 1,
      lifecycle: 'CANCELLED',
    });
  });

  it('reconciles pending SUBMITTED transactions on page reload without auto-resubmitting', async () => {
    // Create an unfinalized SUBMITTED intent in the journal
    const intent = intentJournal.createIntent({
      account: '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8',
      method: 'freeze_round',
      canonicalArgs: [0],
      clientNonce: 'reload_nonce_1',
    });
    intentJournal.markHashSubmitted(intent.id, '0xdeadbeef123456');

    const readClient = (transactionManager as unknown as {
      readClient: { getTransaction: () => Promise<unknown> };
    }).readClient;
    const transactionProbe = vi.spyOn(readClient, 'getTransaction').mockResolvedValue({
      status: 7,
      result_name: 'MAJORITY_AGREE',
      consensus_data: { leader_receipt: [{ execution_result: 'SUCCESS' }] },
    });
    const legacyRpcProbe = vi.spyOn(rpcCoordinator, 'call');

    vi.spyOn(contractRepository, 'getRound').mockResolvedValue({
      id: 0,
      admin: '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8',
      client_nonce: 'nonce_0',
      title_hash: 'hash0',
      title: 'Round 0',
      policy_version: 'GRRG-V1',
      quorum: 2,
      freeze_deadline: 1800000000,
      acknowledge_deadline: 1800003600,
      lifecycle: 'FROZEN',
      applicant_count: 2,
      reviewer_count: 2,
      backup_reviewer_count: 0,
      screened_pairs_count: 0,
      active_panel_fingerprint: '',
    });

    await transactionManager.reconcilePendingIntents();

    const reconciled = intentJournal.getIntent(intent.id);
    expect(reconciled?.status).toBe('FINALIZED_SUCCESS');
    expect(reconciled?.finalityStatus).toBe(7);
    expect(transactionProbe).toHaveBeenCalledTimes(1);
    expect(legacyRpcProbe).not.toHaveBeenCalledWith(
      'gen_getTransactionByHash',
      expect.anything(),
      expect.anything()
    );
  });
});
