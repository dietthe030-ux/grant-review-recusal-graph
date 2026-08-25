// ============================================================================
// Grant Review Recusal Graph — Component Integration Tests
// ============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WalletProvider } from '@/context/WalletContext';
import { WorkbenchHeader } from '@/components/layout/WorkbenchHeader';
import { StatusBanner } from '@/components/layout/StatusBanner';
import { ConflictLegend } from '@/components/graph/ConflictLegend';
import { BipartiteRecusalGraph } from '@/components/graph/BipartiteRecusalGraph';
import { EdgeInspector } from '@/components/graph/EdgeInspector';
import { VerificationPanel } from '@/components/audit/VerificationPanel';
import {
  Round,
  Participant,
  Assignment,
  PairAssessment,
  EffectivePanelResult,
} from '@/types';

describe('Frontend Component Integration', () => {
  const mockRound: Round = {
    id: 0,
    admin: '0x1eae8a65b33d4277ce0aa966e7ca9088b18531c8',
    client_nonce: 'pilot_nonce',
    title_hash: 'title_hash_0',
    title: 'Pilot Grant Round',
    policy_version: 'GRRG-V1',
    quorum: 2,
    freeze_deadline: 1800000000,
    acknowledge_deadline: 1800003600,
    lifecycle: 'ACTIVE',
    applicant_count: 2,
    reviewer_count: 2,
    backup_reviewer_count: 0,
    screened_pairs_count: 4,
    active_panel_fingerprint: 'fp_panel_active_00',
  };

  const mockApplicants: Participant[] = [
    {
      round_id: 0,
      index: 0,
      role: 'APPLICANT',
      wallet: '0x1000000000000000000000000000000000001000',
      orcid: '0000-0001-5109-3700',
      declared_institution: 'Stanford University',
      acknowledged: true,
      is_backup: false,
    },
    {
      round_id: 0,
      index: 1,
      role: 'APPLICANT',
      wallet: '0x1000000000000000000000000000000000001001',
      orcid: '0000-0002-1825-0011',
      declared_institution: 'MIT',
      acknowledged: true,
      is_backup: false,
    },
  ];

  const mockReviewers: Participant[] = [
    {
      round_id: 0,
      index: 0,
      role: 'PRIMARY_REVIEWER',
      wallet: '0x2000000000000000000000000000000000002000',
      orcid: '0000-0002-1825-0097',
      declared_institution: 'Johns Hopkins University',
      acknowledged: true,
      is_backup: false,
    },
    {
      round_id: 0,
      index: 1,
      role: 'PRIMARY_REVIEWER',
      wallet: '0x2000000000000000000000000000000000002001',
      orcid: '0000-0002-1694-233X',
      declared_institution: 'Harvard University',
      acknowledged: true,
      is_backup: false,
    },
  ];

  const mockAssignments: Assignment[] = [
    {
      round_id: 0,
      applicant_index: 0,
      primary_index: 0,
      backup_indexes: [1],
      backup_indexes_csv: '1',
      status: 'PRIMARY_ACTIVE',
      activated_reviewer: 0,
    },
    {
      round_id: 0,
      applicant_index: 1,
      primary_index: 1,
      backup_indexes: [0],
      backup_indexes_csv: '0',
      status: 'PRIMARY_ACTIVE',
      activated_reviewer: 1,
    },
  ];

  const mockAssessments = new Map<string, PairAssessment>([
    [
      '0-0',
      {
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
        shared_pmids: ['12345678'],
        shared_project_nums: [],
        observed_at: 1700000000,
        fingerprint: 'fp_00',
        retry_available: false,
      },
    ],
  ]);

  const mockEffectivePanel: EffectivePanelResult = {
    round_id: 0,
    lifecycle: 'ACTIVE',
    quorum: 2,
    panel_fingerprint: 'fp_panel_active_00',
    active_panel_fingerprint: 'fp_panel_active_00',
    assignments: [],
    primary_active_count: 2,
    backup_promoted_count: 0,
    eligible_count: 2,
    recused_count: 0,
    quorum_met: true,
  };

  it('renders WorkbenchHeader with brand title and Studionet Chain ID', () => {
    render(
      <WalletProvider>
        <WorkbenchHeader
          currentRoundId={0}
          onSelectRoundId={vi.fn()}
          onOpenCreateRound={vi.fn()}
        />
      </WalletProvider>
    );

    expect(screen.getByText('Grant Review Recusal Graph')).toBeInTheDocument();
    expect(screen.getByText('Chain 61999')).toBeInTheDocument();
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  it('renders StatusBanner with ACTIVE lifecycle and Quorum Preserved', () => {
    render(
      <StatusBanner
        round={mockRound}
        effectivePanel={mockEffectivePanel}
      />
    );

    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText(/Quorum:/)).toBeInTheDocument();
    expect(screen.getByText('MET')).toBeInTheDocument();
  });

  it('renders ConflictLegend with all standardized consensus outcomes', () => {
    render(<ConflictLegend />);

    expect(screen.getByText('ELIGIBLE')).toBeInTheDocument();
    expect(screen.getAllByText('RECUSED').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('MANUAL_HOLD')).toBeInTheDocument();
    expect(screen.getByText('EVIDENCE_HOLD')).toBeInTheDocument();
    expect(screen.getByText('Policy: GRRG-V1')).toBeInTheDocument();
  });

  it('renders BipartiteRecusalGraph with applicants and reviewers', () => {
    render(
      <BipartiteRecusalGraph
        round={mockRound}
        applicants={mockApplicants}
        reviewers={mockReviewers}
        assignments={mockAssignments}
        assessments={mockAssessments}
        onScreenPair={vi.fn()}
        isTransacting={false}
      />
    );

    expect(screen.getByText(/Applicant Cohort/)).toBeInTheDocument();
    expect(screen.getByText(/Reviewer Panel/)).toBeInTheDocument();
    expect(screen.getByText('Applicant #0')).toBeInTheDocument();
    expect(screen.getByText('Reviewer #0')).toBeInTheDocument();
  });

  it('renders EdgeInspector with 4 official cross-source statuses', () => {
    const assessment = mockAssessments.get('0-0')!;
    render(
      <EdgeInspector
        applicant={mockApplicants[0]}
        reviewer={mockReviewers[0]}
        assessment={assessment}
        assignment={mockAssignments[0]}
        round={mockRound}
        onScreenPair={vi.fn()}
        isTransacting={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('CURRENT_INSTITUTIONAL_OVERLAP')).toBeInTheDocument();
    expect(screen.getAllByText('HTTP 200').length).toBe(4);
    expect(screen.getByText('NCBI PubMed:')).toBeInTheDocument();
    expect(screen.getByText('NIH RePORTER:')).toBeInTheDocument();
  });

  it('renders VerificationPanel with exact Studionet deployment metadata and live proof rows', () => {
    render(<VerificationPanel />);

    expect(screen.getByText(/0x1EAE8A65b33d4277cE0Aa966e7CA9088b18531C8/i)).toBeInTheDocument();
    expect(
      screen.getByText(/271b3ab1bf8d9b985459fe976b805476974a8a79820415e42eafba631fdac626/)
    ).toBeInTheDocument();
    expect(screen.getByText('Institutional recusal')).toBeInTheDocument();
    expect(screen.getByText('Deterministic backup promotion')).toBeInTheDocument();
  });
});
