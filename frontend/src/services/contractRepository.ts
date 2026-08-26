// ============================================================================
// Grant Review Recusal Graph — Contract Repository (Authentic GenLayer RPC)
// ============================================================================

import {
  Round,
  Participant,
  Assignment,
  PairAssessment,
  EffectivePanelResult,
  AuditEventPage,
  AuditEvent,
  RoundLifecycle,
  ConsensusOutcome,
  PairConsequence,
  AssignmentStatus,
  FullRoundState,
} from '@/types';
import {
  DEPLOYED_CONTRACT_ADDRESS,
  MAX_EVENTS_PAGE_SIZE,
  MAX_PAIRS_PER_ROUND,
} from '@/config/constants';
import { rpcCoordinator } from './rpcCoordinator';

export class ContractRepository {
  private contractAddress: string;

  constructor(address: string = DEPLOYED_CONTRACT_ADDRESS) {
    this.contractAddress = address;
  }

  /**
   * Executes a read-only call to the Intelligent Contract via gen_call.
   */
  public async callView<T>(functionName: string, args: unknown[] = []): Promise<T> {
    return await rpcCoordinator.readContract<T>({
      address: this.contractAddress,
      functionName,
      args,
    });
  }

  /**
   * Returns round details by round ID.
   */
  public async getRound(roundId: number): Promise<Round> {
    const raw = await this.callView<Record<string, unknown>>('get_round', [roundId]);
    return this.normalizeRound(roundId, raw);
  }

  /**
   * Returns participant details (applicant or reviewer).
   */
  public async getParticipant(
    roundId: number,
    participantIndex: number,
    isReviewer: boolean = false
  ): Promise<Participant> {
    const raw = await this.callView<Record<string, unknown>>('get_participant', [
      roundId,
      participantIndex,
      isReviewer,
    ]);

    const roleStr = String(raw.role || (isReviewer ? 'PRIMARY_REVIEWER' : 'APPLICANT'));
    const isBackup = Boolean(raw.is_backup || roleStr === 'BACKUP_REVIEWER');

    return {
      index: participantIndex,
      round_id: roundId,
      role: isReviewer ? (isBackup ? 'BACKUP_REVIEWER' : 'PRIMARY_REVIEWER') : 'APPLICANT',
      wallet: String(raw.wallet || '').toLowerCase(),
      orcid: String(raw.canonical_orcid || raw.orcid || '').trim(),
      declared_institution: String(raw.declared_institution || '').trim(),
      acknowledged: Boolean(raw.is_acknowledged ?? raw.acknowledged),
      declined: Boolean(raw.is_declined ?? raw.declined),
      is_backup: isBackup,
    };
  }

  /**
   * Returns assignment details for an applicant index.
   */
  public async getAssignment(roundId: number, applicantIndex: number): Promise<Assignment> {
    const raw = await this.callView<Record<string, unknown>>('get_assignment', [
      roundId,
      applicantIndex,
    ]);

    const backupCsv = String(raw.backup_indexes_csv || '').trim();
    const backupIndexes = backupCsv
      ? backupCsv
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n))
      : [];

    const activatedIdx = Number(raw.activated_reviewer_index ?? raw.activated_reviewer ?? -1);

    return {
      round_id: roundId,
      applicant_index: applicantIndex,
      primary_index: Number(raw.primary_reviewer_index ?? raw.primary_index ?? 0),
      backup_indexes: backupIndexes,
      backup_indexes_csv: backupCsv,
      status: (raw.status as AssignmentStatus) || 'PLANNED',
      activated_reviewer: activatedIdx === 255 ? -1 : activatedIdx,
    };
  }

  /**
   * Returns consensus assessment outcome for a specific applicant-reviewer pair.
   */
  public async getPairAssessment(
    roundId: number,
    applicantIndex: number,
    reviewerIndex: number
  ): Promise<PairAssessment> {
    const raw = await this.callView<Record<string, unknown>>('get_pair_assessment', [
      roundId,
      applicantIndex,
      reviewerIndex,
    ]);

    const sourceStatuses = (raw.source_statuses as Record<string, number>) || {
      orcid_applicant: 0,
      orcid_reviewer: 0,
      pubmed: 0,
      nih_reporter: 0,
    };

    const evidenceIds = Array.isArray(raw.evidence_ids)
      ? (raw.evidence_ids as string[])
      : Array.isArray(raw.shared_pmids)
      ? (raw.shared_pmids as string[])
      : [];

    return {
      round_id: roundId,
      applicant_index: applicantIndex,
      reviewer_index: reviewerIndex,
      attempt: Number(raw.attempt ?? 0),
      source_statuses: {
        orcid_applicant: Number(sourceStatuses.orcid_applicant ?? 0),
        orcid_reviewer: Number(sourceStatuses.orcid_reviewer ?? 0),
        pubmed: Number(sourceStatuses.pubmed ?? 0),
        nih_reporter: Number(sourceStatuses.nih_reporter ?? 0),
      },
      outcome: (raw.outcome as ConsensusOutcome) || 'UNRESOLVED',
      consequence: (raw.consequence as PairConsequence) || 'EVIDENCE_HOLD',
      reason_code: String(raw.reason_code || 'UNSCREENED'),
      shared_pmids: evidenceIds,
      shared_project_nums: Array.isArray(raw.shared_project_nums)
        ? (raw.shared_project_nums as string[])
        : [],
      observed_at: Number(raw.observed_at ?? 0),
      fingerprint: String(raw.fingerprint || ''),
      retry_available: Boolean(raw.retry_available ?? Number(raw.attempt ?? 0) < 3),
    };
  }

  /**
   * Returns effective panel calculation and quorum preservation analysis.
   */
  public async getEffectivePanel(roundId: number): Promise<EffectivePanelResult> {
    const raw = await this.callView<Record<string, unknown>>('get_effective_panel', [roundId]);

    const rawAssignments = Array.isArray(raw.assignments) ? raw.assignments : [];
    let eligibleCount = 0;
    let primaryActiveCount = 0;
    let backupPromotedCount = 0;

    const assignments = rawAssignments.map((a: Record<string, unknown>) => {
      const isBackup =
        a.reviewer_role === 'BACKUP_REVIEWER' ||
        Boolean(a.is_backup) ||
        a.status === 'BACKUP_ACTIVE';
      const status = (a.status as AssignmentStatus) || 'PLANNED';
      const assignedIdx = Number(a.assigned_reviewer_index ?? a.active_reviewer_index ?? -1);

      if (status === 'PRIMARY_ACTIVE') {
        primaryActiveCount++;
        eligibleCount++;
      } else if (status === 'BACKUP_ACTIVE') {
        backupPromotedCount++;
        eligibleCount++;
      }

      return {
        applicant_index: Number(a.applicant_index ?? 0),
        applicant_wallet: String(a.applicant_wallet || '').toLowerCase(),
        applicant_orcid: String(a.applicant_orcid || ''),
        active_reviewer_index: assignedIdx === 255 ? -1 : assignedIdx,
        active_reviewer_wallet: String(a.active_reviewer_wallet || '').toLowerCase(),
        active_reviewer_orcid: String(a.active_reviewer_orcid || ''),
        is_backup: isBackup,
        assignment_status: status,
        consequence: (a.consequence as PairConsequence) || 'ELIGIBLE',
      };
    });

    const quorum = Number(raw.quorum ?? 2);
    const quorumMet = eligibleCount >= quorum;

    return {
      round_id: roundId,
      quorum,
      eligible_count: eligibleCount,
      primary_active_count: primaryActiveCount,
      backup_promoted_count: backupPromotedCount,
      quorum_met: quorumMet,
      lifecycle: (raw.lifecycle as RoundLifecycle) || 'DRAFT',
      panel_fingerprint: String(raw.active_panel_fingerprint || raw.panel_fingerprint || ''),
      assignments,
    };
  }

  /**
   * Returns paginated audit events for a round.
   * Enforces offset & limit bounded to maximum 20 pages.
   */
  public async getEventPage(
    roundId: number,
    offset: number = 0,
    limit: number = MAX_EVENTS_PAGE_SIZE
  ): Promise<AuditEventPage> {
    // Bound parameters: max 20 pages (limit max 50, offset max 1000)
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const safeOffset = Math.min(Math.max(0, offset), 1000);

    const raw = await this.callView<Record<string, unknown>>('get_event_page', [
      roundId,
      safeOffset,
      safeLimit,
    ]);

    const rawEvents = Array.isArray(raw.events) ? raw.events : [];
    const events: AuditEvent[] = rawEvents.map((e: Record<string, unknown>, idx: number) => ({
      id: Number(e.event_id ?? e.id ?? safeOffset + idx),
      round_id: roundId,
      sequence: Number(e.sequence ?? safeOffset + idx),
      event_type: String(e.event_type || 'UNKNOWN_EVENT'),
      actor: String(e.actor || '').toLowerCase(),
      payload: (e.details as Record<string, unknown>) || (e.payload as Record<string, unknown>) || {},
      timestamp: Number(e.timestamp ?? 0),
      tx_hash: e.tx_hash ? String(e.tx_hash) : undefined,
    }));

    const totalEvents = Number(raw.total_events ?? raw.total ?? events.length);
    const pageNumber = Math.floor(safeOffset / safeLimit);
    const hasMore = safeOffset + events.length < totalEvents;

    return {
      events,
      total: totalEvents,
      page: pageNumber,
      page_size: safeLimit,
      has_more: hasMore,
    };
  }

  /**
   * Resolves round ID by creator admin address and client nonce.
   */
  public async getRoundIdByNonce(admin: string, clientNonce: string): Promise<number> {
    const raw = await this.callView<number>('get_round_id_by_nonce', [
      admin.toLowerCase(),
      clientNonce,
    ]);
    return Number(raw);
  }

  /**
   * Returns upgrader address.
   */
  public async getUpgrader(): Promise<string> {
    const raw = await this.callView<string>('get_upgrader', []);
    return String(raw || '').toLowerCase();
  }

  /**
   * Coordinates fetching the complete state for a round in a single sequential pipeline.
   * Public reads function without requiring a connected wallet.
   */
  public async loadFullRoundState(roundId: number): Promise<FullRoundState> {
    const round = await this.getRound(roundId);

    // Fetch applicants
    const applicants = await Promise.all(
      Array.from({ length: round.applicant_count }, (_, i) =>
        this.getParticipant(roundId, i, false)
      )
    );

    // Fetch primary + backup reviewers
    const totalReviewers = round.reviewer_count + (round.backup_count || round.backup_reviewer_count || 0);
    const reviewers = await Promise.all(
      Array.from({ length: totalReviewers }, (_, i) =>
        this.getParticipant(roundId, i, true)
      )
    );

    // Fetch assignments
    const assignmentResults = await Promise.allSettled(
      Array.from({ length: round.applicant_count }, (_, i) =>
        this.getAssignment(roundId, i)
      )
    );
    const assignments: Assignment[] = assignmentResults.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : []
    );

    // Fetch assessments for all applicant-reviewer pairs
    const assessments = new Map<string, PairAssessment>();
    const configuredPairKeys = Array.from(
      new Map(
        assignments.flatMap((assignment) =>
          [assignment.primary_index, ...assignment.backup_indexes].map((r) => [
            `${assignment.applicant_index}-${r}`,
            { a: assignment.applicant_index, r },
          ] as const)
        )
      ).values()
    );
    if (configuredPairKeys.length > MAX_PAIRS_PER_ROUND) {
      throw new Error(`Configured pair count exceeds contract cap (${MAX_PAIRS_PER_ROUND})`);
    }
    const loadAssessmentBatches = async (pairKeys: Array<{ a: number; r: number }>) => {
      for (let offset = 0; offset < pairKeys.length; offset += 5) {
        const batch = pairKeys.slice(offset, offset + 5);
        const results = await Promise.allSettled(
          batch.map(({ a, r }) => this.getPairAssessment(roundId, a, r))
        );
        results.forEach((result, i) => {
          if (result.status === 'fulfilled' && result.value.attempt > 0) {
            const { a, r } = batch[i];
            assessments.set(`${a}-${r}`, result.value);
          }
        });
        if (assessments.size >= round.screened_pairs_count) break;
      }
    };
    await loadAssessmentBatches(configuredPairKeys);

    if (assessments.size < round.screened_pairs_count) {
      const configured = new Set(configuredPairKeys.map(({ a, r }) => `${a}-${r}`));
      const remainingPairKeys = Array.from({ length: round.applicant_count }, (_, a) =>
        Array.from({ length: totalReviewers }, (_, r) => ({ a, r }))
      ).flat().filter(({ a, r }) => !configured.has(`${a}-${r}`));
      await loadAssessmentBatches(remainingPairKeys);
    }

    // Effective panel calculation (available after screening or when freeze)
    const emptyEvents: AuditEventPage = {
      events: [],
      total: 0,
      page: 0,
      page_size: MAX_EVENTS_PAGE_SIZE,
      has_more: false,
    };
    const [panelResult, eventsResult] = await Promise.allSettled([
      this.getEffectivePanel(roundId),
      this.getEventPage(roundId, 0, MAX_EVENTS_PAGE_SIZE),
    ]);
    const effectivePanel: EffectivePanelResult | null =
      panelResult.status === 'fulfilled' ? panelResult.value : null;
    const recentEvents = eventsResult.status === 'fulfilled' ? eventsResult.value : emptyEvents;

    return {
      round,
      applicants,
      reviewers,
      assignments,
      assessments,
      effectivePanel,
      recentEvents,
    };
  }

  private normalizeRound(roundId: number, raw: Record<string, unknown>): Round {
    const applicantsCount = Number(raw.applicants_count ?? raw.applicant_count ?? 0);
    const primariesCount = Number(raw.primaries_count ?? raw.reviewer_count ?? 0);
    const backupsCount = Number(raw.backups_count ?? raw.backup_count ?? 0);
    const screenedCount = Number(raw.pairs_screened_count ?? raw.screened_pairs_count ?? 0);

    return {
      id: Number(raw.round_id ?? roundId),
      admin: String(raw.admin || '').toLowerCase(),
      title_hash: String(raw.title_hash || ''),
      title: raw.title ? String(raw.title) : undefined,
      policy_version: String(raw.policy_version || 'GRRG-V1'),
      quorum: Number(raw.quorum ?? 2),
      freeze_deadline: Number(raw.freeze_deadline ?? 0),
      acknowledge_deadline: Number(raw.acknowledge_deadline ?? 0),
      lifecycle: (raw.lifecycle as RoundLifecycle) || 'DRAFT',
      applicant_count: applicantsCount,
      reviewer_count: primariesCount,
      backup_count: backupsCount,
      assignment_count: Number(raw.assignment_count ?? applicantsCount),
      screened_pairs_count: screenedCount,
      active_panel_fingerprint: String(raw.active_panel_fingerprint || ''),
    };
  }
}

export const contractRepository = new ContractRepository();
