// ============================================================================
// Grant Review Recusal Graph — Domain Types & Schemas
// ============================================================================

export type RoundLifecycle =
  | 'DRAFT'
  | 'FROZEN'
  | 'SCREENING'
  | 'READY'
  | 'HOLD'
  | 'ACTIVE'
  | 'CLOSED'
  | 'CANCELLED';

export type ConsensusOutcome =
  | 'DIRECT_RECENT_COLLABORATION'
  | 'CURRENT_INSTITUTIONAL_OVERLAP'
  | 'HISTORICAL_RELATION_REVIEW'
  | 'NO_PUBLIC_CONFLICT_FOUND'
  | 'UNRESOLVED';

export type PairConsequence =
  | 'RECUSED'
  | 'ELIGIBLE'
  | 'MANUAL_HOLD'
  | 'EVIDENCE_HOLD';

export type ParticipantRole =
  | 'APPLICANT'
  | 'PRIMARY_REVIEWER'
  | 'BACKUP_REVIEWER';

export type AssignmentStatus =
  | 'PLANNED'
  | 'PRIMARY_ACTIVE'
  | 'BACKUP_ACTIVE'
  | 'BLOCKED'
  | 'DECLINED';

export interface SourceStatuses {
  orcid_applicant: number;
  orcid_reviewer: number;
  pubmed: number;
  nih_reporter: number;
}

export interface Round {
  id: number;
  admin: string;
  client_nonce?: string;
  title_hash: string;
  title?: string;
  policy_version: string;
  quorum: number;
  freeze_deadline: number;
  acknowledge_deadline: number;
  lifecycle: RoundLifecycle;
  applicant_count: number;
  reviewer_count: number;
  backup_count?: number;
  backup_reviewer_count?: number;
  assignment_count?: number;
  screened_pairs_count: number;
  active_panel_fingerprint: string;
}

export interface Participant {
  index: number;
  round_id: number;
  role: ParticipantRole;
  wallet: string;
  orcid: string;
  declared_institution: string;
  acknowledged: boolean;
  declined?: boolean;
  is_backup: boolean;
}

export interface Assignment {
  round_id: number;
  applicant_index: number;
  primary_index: number;
  backup_indexes: number[];
  backup_indexes_csv: string;
  status: AssignmentStatus;
  activated_reviewer: number; // -1 if not activated
}

export interface PairAssessment {
  round_id: number;
  applicant_index: number;
  reviewer_index: number;
  attempt: number;
  source_statuses: SourceStatuses;
  outcome: ConsensusOutcome;
  consequence: PairConsequence;
  reason_code: string;
  shared_pmids: string[];
  shared_project_nums: string[];
  observed_at: number;
  fingerprint: string;
  retry_available: boolean;
}

export interface AuditEvent {
  id: number;
  round_id: number;
  sequence: number;
  event_type: string;
  actor: string;
  payload: Record<string, unknown>;
  timestamp: number;
  tx_hash?: string;
}

export interface AuditEventPage {
  events: AuditEvent[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface EffectivePanelAssignment {
  applicant_index: number;
  applicant_wallet: string;
  applicant_orcid: string;
  active_reviewer_index: number;
  active_reviewer_wallet: string;
  active_reviewer_orcid: string;
  is_backup: boolean;
  assignment_status: AssignmentStatus;
  consequence: PairConsequence;
}

export interface EffectivePanelResult {
  round_id: number;
  quorum: number;
  eligible_count: number;
  primary_active_count: number;
  backup_promoted_count: number;
  recused_count?: number;
  quorum_met: boolean;
  lifecycle?: RoundLifecycle;
  panel_fingerprint: string;
  active_panel_fingerprint?: string;
  assignments: EffectivePanelAssignment[];
}

export interface FullRoundState {
  round: Round;
  applicants: Participant[];
  reviewers: Participant[];
  assignments: Assignment[];
  assessments: Map<string, PairAssessment>;
  effectivePanel: EffectivePanelResult | null;
  recentEvents: AuditEventPage;
}

// ----------------------------------------------------------------------------
// EIP-6963 Multi-Injected Provider Discovery Types
// ----------------------------------------------------------------------------

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

export interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: 'eip6963:announceProvider';
  detail: EIP6963ProviderDetail;
}

export type SupportedWalletRDNS = 'io.metamask' | 'com.okex.wallet' | 'io.rabby';

export interface WalletAccountState {
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  isCorrectChain: boolean;
  providerDetail: EIP6963ProviderDetail | null;
  error: string | null;
}

// ----------------------------------------------------------------------------
// Intent Journaling & Transaction Lifecycle Types
// ----------------------------------------------------------------------------

export type TxIntentStatus =
  | 'PRE_SUBMIT'
  | 'SUBMITTED'
  | 'FINALIZED_SUCCESS'
  | 'FINALIZED_FAILURE'
  | 'REJECTED'
  | 'TIMED_OUT'
  | 'READBACK_FAILED';

export interface TxIntent {
  id: string;
  chainId: number;
  contractAddress: string;
  account: string;
  method: string;
  canonicalArgs: unknown[];
  clientNonce: string;
  status: TxIntentStatus;
  txHash: string | null;
  createdAt: number;
  updatedAt: number;
  finalityStatus?: number; // 7 = FINALIZED
  consensusResult?: string; // 'MAJORITY_AGREE' | 'MAJORITY_DISAGREE' | 'UNDETERMINED'
  leaderResult?: string; // 'SUCCESS' | 'ERROR'
  errorMessage?: string;
  readbackVerified: boolean;
  readbackData?: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// UI & Navigation Types
// ----------------------------------------------------------------------------

export type ActiveTab =
  | 'graph'
  | 'matrix'
  | 'participants'
  | 'screening'
  | 'promotion'
  | 'audit'
  | 'verification';

export type UserRole =
  | 'GUEST'
  | 'ADMIN'
  | 'APPLICANT'
  | 'REVIEWER'
  | 'ASSESSOR'
  | 'AUDITOR';
