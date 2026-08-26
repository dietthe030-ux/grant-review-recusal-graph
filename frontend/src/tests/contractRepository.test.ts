// ============================================================================
// Grant Review Recusal Graph — Contract Repository Integration Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { contractRepository } from '@/services/contractRepository';
import { rpcCoordinator } from '@/services/rpcCoordinator';

describe('Contract Repository (Public Reads & Authentic GenLayer RPC)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    rpcCoordinator.invalidateCache();
    rpcCoordinator.resetMetrics();
  });

  it('fetches round details via get_round', async () => {
    const mockRead = vi.spyOn(rpcCoordinator, 'readContract').mockResolvedValue({
      round_id: 0,
      admin: '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8',
      client_nonce: 'pilot_nonce',
      title_hash: 'abc123hash',
      title: 'Pilot Grant Round',
      policy_version: 'GRRG-V1',
      quorum: 2,
      freeze_deadline: 1800000000,
      acknowledge_deadline: 1800003600,
      lifecycle: 'ACTIVE',
      applicants_count: 2,
      primaries_count: 2,
      backups_count: 2,
      pairs_screened_count: 4,
      active_panel_fingerprint: 'fp_active_panel',
    });

    const round = await contractRepository.getRound(0);
    expect(mockRead).toHaveBeenCalledWith({
      address: expect.any(String),
      functionName: 'get_round',
      args: [0],
    });

    expect(round.id).toBe(0);
    expect(round.lifecycle).toBe('ACTIVE');
    expect(round.quorum).toBe(2);
    expect(round.applicant_count).toBe(2);
    expect(round.active_panel_fingerprint).toBe('fp_active_panel');
  });

  it('fetches participant details (applicant and reviewer)', async () => {
    const mockRead = vi.spyOn(rpcCoordinator, 'readContract').mockImplementation(async ({ args }) => {
      const isReviewer = Boolean(args?.[2]);
      if (isReviewer) {
        return {
          round_id: 0,
          index: 0,
          role: 'PRIMARY_REVIEWER',
          wallet: '0x2000000000000000000000000000000000002000',
          canonical_orcid: '0000-0002-1825-0097',
          declared_institution: 'Johns Hopkins University',
          is_acknowledged: true,
          is_declined: false,
          is_backup: false,
        };
      }
      return {
        round_id: 0,
        index: 0,
        role: 'APPLICANT',
        wallet: '0x1000000000000000000000000000000000001000',
        canonical_orcid: '0000-0001-5109-3700',
        declared_institution: 'Stanford University',
        is_acknowledged: true,
        is_declined: false,
        is_backup: false,
      };
    });

    const applicant = await contractRepository.getParticipant(0, 0, false);
    expect(applicant.role).toBe('APPLICANT');
    expect(applicant.orcid).toBe('0000-0001-5109-3700');
    expect(applicant.acknowledged).toBe(true);

    const reviewer = await contractRepository.getParticipant(0, 0, true);
    expect(reviewer.role).toBe('PRIMARY_REVIEWER');
    expect(reviewer.orcid).toBe('0000-0002-1825-0097');
    expect(reviewer.is_backup).toBe(false);

    expect(mockRead).toHaveBeenCalledTimes(2);
  });

  it('fetches assignment details for an applicant', async () => {
    vi.spyOn(rpcCoordinator, 'readContract').mockResolvedValue({
      round_id: 0,
      applicant_index: 0,
      primary_reviewer_index: 0,
      backup_indexes_csv: '1, 2',
      status: 'PRIMARY_ACTIVE',
      activated_reviewer_index: 0,
    });

    const assignment = await contractRepository.getAssignment(0, 0);
    expect(assignment.applicant_index).toBe(0);
    expect(assignment.primary_index).toBe(0);
    expect(assignment.backup_indexes).toEqual([1, 2]);
    expect(assignment.status).toBe('PRIMARY_ACTIVE');
    expect(assignment.activated_reviewer).toBe(0);
  });

  it('fetches pair assessment outcomes', async () => {
    vi.spyOn(rpcCoordinator, 'readContract').mockResolvedValue({
      round_id: 0,
      applicant_index: 0,
      reviewer_index: 0,
      attempt: 1,
      source_statuses: {
        orcid_applicant: 200,
        orcid_reviewer: 200,
        pubmed: 200,
        nih_reporter: 200,
      },
      outcome: 'CURRENT_INSTITUTIONAL_OVERLAP',
      consequence: 'RECUSED',
      reason_code: 'CURRENT_OR_RECENT_EMPLOYMENT_OVERLAP',
      evidence_ids: ['PMID:12345678'],
      observed_at: 1700000000,
      fingerprint: 'fp_assessment_00',
      explanation: 'Institutional overlap detected in ORCID',
    });

    const assessment = await contractRepository.getPairAssessment(0, 0, 0);
    expect(assessment.outcome).toBe('CURRENT_INSTITUTIONAL_OVERLAP');
    expect(assessment.consequence).toBe('RECUSED');
    expect(assessment.source_statuses.pubmed).toBe(200);
    expect(assessment.shared_pmids).toContain('PMID:12345678');
    expect(assessment.attempt).toBe(1);
  });

  it('fetches effective panel with quorum evaluation', async () => {
    vi.spyOn(rpcCoordinator, 'readContract').mockResolvedValue({
      round_id: 0,
      lifecycle: 'ACTIVE',
      quorum: 2,
      active_panel_fingerprint: 'panel_fp_01',
      assignments: [
        {
          applicant_index: 0,
          applicant_wallet: '0x1000',
          applicant_orcid: '0000-0001-5109-3700',
          assigned_reviewer_index: 0,
          active_reviewer_wallet: '0x2000',
          active_reviewer_orcid: '0000-0002-1825-0097',
          reviewer_role: 'PRIMARY_REVIEWER',
          status: 'PRIMARY_ACTIVE',
          consequence: 'ELIGIBLE',
        },
        {
          applicant_index: 1,
          applicant_wallet: '0x1001',
          applicant_orcid: '0000-0002-1825-0011',
          assigned_reviewer_index: 1,
          active_reviewer_wallet: '0x2001',
          active_reviewer_orcid: '0000-0002-1694-233X',
          reviewer_role: 'BACKUP_REVIEWER',
          status: 'BACKUP_ACTIVE',
          consequence: 'ELIGIBLE',
        },
      ],
    });

    const panel = await contractRepository.getEffectivePanel(0);
    expect(panel.quorum).toBe(2);
    expect(panel.eligible_count).toBe(2);
    expect(panel.quorum_met).toBe(true);
    expect(panel.primary_active_count).toBe(1);
    expect(panel.backup_promoted_count).toBe(1);
  });

  it('enforces pagination bounds on getEventPage (offset <= 1000, limit <= 50, max 20 pages)', async () => {
    const mockRead = vi.spyOn(rpcCoordinator, 'readContract').mockResolvedValue({
      round_id: 0,
      total_events: 100,
      offset: 1000,
      limit: 50,
      events: [
        {
          event_id: 1,
          event_type: 'ROUND_CREATED',
          actor: '0x123',
          timestamp: 1700000000,
          details: { quorum: 2 },
        },
      ],
    });

    // Pass excessive offset and limit
    await contractRepository.getEventPage(0, 5000, 200);

    // Must be clamped to offset 1000, limit 50
    expect(mockRead).toHaveBeenCalledWith({
      address: expect.any(String),
      functionName: 'get_event_page',
      args: [0, 1000, 50],
    });
  });

  it('resolves round ID by admin address and client nonce', async () => {
    vi.spyOn(rpcCoordinator, 'readContract').mockResolvedValue(3);

    const roundId = await contractRepository.getRoundIdByNonce(
      '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8',
      'pilot_nonce_123'
    );
    expect(roundId).toBe(3);
  });

  it('fetches upgrader address', async () => {
    vi.spyOn(rpcCoordinator, 'readContract').mockResolvedValue(
      '0x34b92E6553eaCA11A00A9d86d75d8a7881779D78'
    );

    const upgrader = await contractRepository.getUpgrader();
    expect(upgrader).toBe('0x34b92e6553eaca11a00a9d86d75d8a7881779d78');
  });

  it('propagates RPC errors cleanly in loadFullRoundState without falling back to mock data', async () => {
    vi.spyOn(rpcCoordinator, 'readContract').mockRejectedValue(new Error('Round 999 not found'));

    await expect(contractRepository.loadFullRoundState(999)).rejects.toThrow('Round 999 not found');
  });

  it('loads only assignment-configured assessment pairs', async () => {
    const pairCalls: unknown[][] = [];
    vi.spyOn(rpcCoordinator, 'readContract').mockImplementation(async ({ functionName, args }) => {
      if (functionName === 'get_round') {
        return { round_id: 0, applicants_count: 2, primaries_count: 2, backups_count: 1 };
      }
      if (functionName === 'get_participant') {
        return { wallet: '0x1', canonical_orcid: '', is_backup: Boolean(args?.[2]) };
      }
      if (functionName === 'get_assignment') {
        return Number(args?.[1]) === 0
          ? { primary_reviewer_index: 0, backup_indexes_csv: '1' }
          : { primary_reviewer_index: 2, backup_indexes_csv: '' };
      }
      if (functionName === 'get_pair_assessment') {
        pairCalls.push(args || []);
        return { attempt: 1, outcome: 'NO_PUBLIC_CONFLICT_FOUND', consequence: 'ELIGIBLE' };
      }
      if (functionName === 'get_effective_panel') return { assignments: [] };
      if (functionName === 'get_event_page') return { events: [], total_events: 0 };
      return {};
    });

    await contractRepository.loadFullRoundState(0);

    expect(pairCalls).toEqual([[0, 0, 0], [0, 0, 1], [0, 1, 2]]);
  });

  it('limits configured assessment read concurrency to five', async () => {
    let activePairReads = 0;
    let maxActivePairReads = 0;
    vi.spyOn(rpcCoordinator, 'readContract').mockImplementation(async ({ functionName, args }) => {
      if (functionName === 'get_round') {
        return { round_id: 0, applicants_count: 2, primaries_count: 2, backups_count: 3 };
      }
      if (functionName === 'get_participant') return { wallet: '0x1', canonical_orcid: '' };
      if (functionName === 'get_assignment') {
        return Number(args?.[1]) === 0
          ? { primary_reviewer_index: 0, backup_indexes_csv: '1,2,3' }
          : { primary_reviewer_index: 1, backup_indexes_csv: '0,2,3' };
      }
      if (functionName === 'get_pair_assessment') {
        activePairReads++;
        maxActivePairReads = Math.max(maxActivePairReads, activePairReads);
        await new Promise((resolve) => setTimeout(resolve, 5));
        activePairReads--;
        return { attempt: 1, outcome: 'NO_PUBLIC_CONFLICT_FOUND', consequence: 'ELIGIBLE' };
      }
      if (functionName === 'get_effective_panel') return { assignments: [] };
      if (functionName === 'get_event_page') return { events: [], total_events: 0 };
      return {};
    });

    await contractRepository.loadFullRoundState(0);

    expect(maxActivePairReads).toBe(5);
  });

  it('recovers already-screened non-assignment pairs without an unbounded burst', async () => {
    const pairCalls: unknown[][] = [];
    vi.spyOn(rpcCoordinator, 'readContract').mockImplementation(async ({ functionName, args }) => {
      if (functionName === 'get_round') {
        return {
          round_id: 0,
          applicants_count: 2,
          primaries_count: 2,
          backups_count: 1,
          pairs_screened_count: 4,
        };
      }
      if (functionName === 'get_participant') return { wallet: '0x1', canonical_orcid: '' };
      if (functionName === 'get_assignment') {
        return Number(args?.[1]) === 0
          ? { primary_reviewer_index: 0, backup_indexes_csv: '1' }
          : { primary_reviewer_index: 2, backup_indexes_csv: '' };
      }
      if (functionName === 'get_pair_assessment') {
        pairCalls.push(args || []);
        const key = `${args?.[1]}-${args?.[2]}`;
        if (!['0-0', '0-1', '1-2', '1-1'].includes(key)) throw new Error('Unscreened');
        return { attempt: 1, outcome: 'NO_PUBLIC_CONFLICT_FOUND', consequence: 'ELIGIBLE' };
      }
      if (functionName === 'get_effective_panel') return { assignments: [] };
      if (functionName === 'get_event_page') return { events: [], total_events: 0 };
      return {};
    });

    const state = await contractRepository.loadFullRoundState(0);

    expect(state.assessments.size).toBe(4);
    expect(pairCalls).toContainEqual([0, 1, 1]);
  });
});
