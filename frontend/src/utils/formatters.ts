// ============================================================================
// Grant Review Recusal Graph — Display & Evidence Formatters
// ============================================================================

import {
  ConsensusOutcome,
  PairConsequence,
  RoundLifecycle,
  AssignmentStatus,
} from '@/types';
import { STUDIONET_EXPLORER_URL } from '@/config/constants';

/**
 * Truncates an Ethereum address with an ellipsis in the middle.
 */
export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address) return '';
  if (address.length <= startChars + endChars + 2) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Truncates a transaction hash or fingerprint.
 */
export function truncateHash(hash: string, startChars: number = 8, endChars: number = 6): string {
  if (!hash) return '';
  if (hash.length <= startChars + endChars + 2) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Formats unix timestamp (seconds) into ISO UTC string.
 */
export function formatTimestamp(timestampInSeconds: number): string {
  if (!timestampInSeconds || timestampInSeconds === 0) return 'Never';
  const date = new Date(timestampInSeconds * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

/**
 * Formats relative time (e.g. "5 minutes ago", "in 2 hours").
 */
export function formatRelativeTime(timestampInSeconds: number): string {
  if (!timestampInSeconds || timestampInSeconds === 0) return 'Never';
  const now = Math.floor(Date.now() / 1000);
  const diff = timestampInSeconds - now;
  const isPast = diff < 0;
  const absDiff = Math.abs(diff);

  if (absDiff < 60) return isPast ? `${absDiff}s ago` : `in ${absDiff}s`;
  if (absDiff < 3600) return isPast ? `${Math.floor(absDiff / 60)}m ago` : `in ${Math.floor(absDiff / 60)}m`;
  if (absDiff < 86400) return isPast ? `${Math.floor(absDiff / 3600)}h ago` : `in ${Math.floor(absDiff / 3600)}h`;
  return isPast ? `${Math.floor(absDiff / 86400)}d ago` : `in ${Math.floor(absDiff / 86400)}d`;
}

/**
 * Official evidence link generators.
 */
export function getOrcidUrl(orcid?: string): string {
  if (!orcid) return 'https://orcid.org/';
  const clean = orcid.trim();
  return `https://orcid.org/${clean}`;
}

export function getPubmedPmidUrl(pmid?: string): string {
  if (!pmid) return 'https://pubmed.ncbi.nlm.nih.gov/';
  const clean = pmid.trim();
  return `https://pubmed.ncbi.nlm.nih.gov/${clean}/`;
}

export function getNihReporterUrl(projectNum?: string): string {
  if (!projectNum) return 'https://reporter.nih.gov/';
  return `https://reporter.nih.gov/search/projects?filter=${encodeURIComponent(projectNum.trim())}`;
}

export function getExplorerTxUrl(txHash: string): string {
  return `${STUDIONET_EXPLORER_URL}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${STUDIONET_EXPLORER_URL}/address/${address}`;
}

/**
 * Outcome semantic descriptors, colors, and badge metadata.
 */
export interface OutcomeMetadata {
  label: string;
  description: string;
  consequence: PairConsequence;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  icon: string;
}

export function getOutcomeMetadata(outcome: ConsensusOutcome | 'UNSCREENED'): OutcomeMetadata {
  switch (outcome) {
    case 'DIRECT_RECENT_COLLABORATION':
      return {
        label: 'DIRECT_RECENT_COLLABORATION',
        description: 'Direct co-authorship or active grant co-investigation detected within 5-year policy window.',
        consequence: 'RECUSED',
        colorClass: 'text-red-400',
        bgClass: 'bg-red-950/40',
        borderClass: 'border-red-800/60',
        icon: 'AlertCircle',
      };
    case 'CURRENT_INSTITUTIONAL_OVERLAP':
      return {
        label: 'CURRENT_INSTITUTIONAL_OVERLAP',
        description: 'Active shared institutional affiliation observed on verified ORCID employment records.',
        consequence: 'RECUSED',
        colorClass: 'text-orange-400',
        bgClass: 'bg-orange-950/40',
        borderClass: 'border-orange-800/60',
        icon: 'Building2',
      };
    case 'HISTORICAL_RELATION_REVIEW':
      return {
        label: 'HISTORICAL_RELATION_REVIEW',
        description: 'Prior institutional or research association beyond 5-year policy boundary requiring administrator review.',
        consequence: 'MANUAL_HOLD',
        colorClass: 'text-yellow-400',
        bgClass: 'bg-yellow-950/40',
        borderClass: 'border-yellow-800/60',
        icon: 'Clock',
      };
    case 'NO_PUBLIC_CONFLICT_FOUND':
      return {
        label: 'NO_PUBLIC_CONFLICT_FOUND',
        description: 'Full public coverage completed across ORCID, PubMed, and NIH RePORTER with no policy conflicts detected.',
        consequence: 'ELIGIBLE',
        colorClass: 'text-emerald-400',
        bgClass: 'bg-emerald-950/40',
        borderClass: 'border-emerald-800/60',
        icon: 'CheckCircle2',
      };
    case 'UNRESOLVED':
      return {
        label: 'UNRESOLVED',
        description: 'Public evidence unavailable, oversized (>128KB), rate-limited (429), or validator disagreement. Fails closed.',
        consequence: 'EVIDENCE_HOLD',
        colorClass: 'text-purple-400',
        bgClass: 'bg-purple-950/40',
        borderClass: 'border-purple-800/60',
        icon: 'HelpCircle',
      };
    case 'UNSCREENED':
    default:
      return {
        label: 'UNSCREENED',
        description: 'Pair has not been screened by GenLayer validators on Studionet yet.',
        consequence: 'EVIDENCE_HOLD',
        colorClass: 'text-slate-400',
        bgClass: 'bg-slate-900/60',
        borderClass: 'border-slate-800',
        icon: 'Circle',
      };
  }
}

/**
 * Consequence badge styles.
 */
export function getConsequenceMetadata(consequence: PairConsequence) {
  switch (consequence) {
    case 'ELIGIBLE':
      return {
        label: 'ELIGIBLE',
        badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
      };
    case 'RECUSED':
      return {
        label: 'RECUSED',
        badgeClass: 'bg-red-950/60 text-red-300 border-red-800',
      };
    case 'MANUAL_HOLD':
      return {
        label: 'MANUAL_HOLD',
        badgeClass: 'bg-yellow-950/60 text-yellow-300 border-yellow-800',
      };
    case 'EVIDENCE_HOLD':
      return {
        label: 'EVIDENCE_HOLD',
        badgeClass: 'bg-purple-950/60 text-purple-300 border-purple-800',
      };
  }
}

/**
 * Lifecycle badge styles.
 */
export function getLifecycleMetadata(lifecycle: RoundLifecycle) {
  switch (lifecycle) {
    case 'DRAFT':
      return { label: 'DRAFT', badgeClass: 'bg-slate-900 text-slate-300 border-slate-700' };
    case 'FROZEN':
      return { label: 'FROZEN', badgeClass: 'bg-cyan-950/60 text-cyan-300 border-cyan-800' };
    case 'SCREENING':
      return { label: 'SCREENING', badgeClass: 'bg-blue-950/60 text-blue-300 border-blue-800' };
    case 'READY':
      return { label: 'READY', badgeClass: 'bg-teal-950/60 text-teal-300 border-teal-800' };
    case 'HOLD':
      return { label: 'HOLD', badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-800' };
    case 'ACTIVE':
      return { label: 'ACTIVE', badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-800' };
    case 'CLOSED':
      return { label: 'CLOSED', badgeClass: 'bg-neutral-900 text-neutral-400 border-neutral-700' };
    case 'CANCELLED':
      return { label: 'CANCELLED', badgeClass: 'bg-rose-950/60 text-rose-400 border-rose-800' };
  }
}

/**
 * Assignment status descriptors.
 */
export function getAssignmentStatusMetadata(status: AssignmentStatus) {
  switch (status) {
    case 'PLANNED':
      return { label: 'PLANNED', badgeClass: 'bg-slate-900 text-slate-400 border-slate-700' };
    case 'PRIMARY_ACTIVE':
      return { label: 'PRIMARY_ACTIVE', badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-800' };
    case 'BACKUP_ACTIVE':
      return { label: 'BACKUP_ACTIVE', badgeClass: 'bg-blue-950/60 text-blue-300 border-blue-800' };
    case 'BLOCKED':
      return { label: 'BLOCKED', badgeClass: 'bg-red-950/60 text-red-300 border-red-800' };
    case 'DECLINED':
      return { label: 'DECLINED', badgeClass: 'bg-neutral-900 text-neutral-400 border-neutral-700' };
  }
}
