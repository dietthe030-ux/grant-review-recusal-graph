// ============================================================================
// Grant Review Recusal Graph — Edge & Pair Evidence Inspector
// ============================================================================

import React from 'react';
import {
  Participant,
  PairAssessment,
  Assignment,
  Round,
} from '@/types';
import {
  getOutcomeMetadata,
  getOrcidUrl,
  getPubmedPmidUrl,
  getNihReporterUrl,
  formatTimestamp,
  truncateAddress,
  truncateHash,
} from '@/utils/formatters';
import { Button } from '@/components/common/Button';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Building,
  User,
  Fingerprint,
  RefreshCw,
  Search,
} from 'lucide-react';

export interface EdgeInspectorProps {
  applicant: Participant | null;
  reviewer: Participant | null;
  assessment: PairAssessment | null;
  assignment: Assignment | null;
  round: Round;
  onScreenPair: (applicantIndex: number, reviewerIndex: number) => Promise<void>;
  isTransacting: boolean;
  onClose: () => void;
}

export const EdgeInspector: React.FC<EdgeInspectorProps> = ({
  applicant,
  reviewer,
  assessment,
  assignment,
  round,
  onScreenPair,
  isTransacting,
  onClose,
}) => {
  if (!applicant || !reviewer) return null;

  const outcome = assessment ? assessment.outcome : 'UNSCREENED';
  const meta = getOutcomeMetadata(outcome);
  const isScreenable =
    round.lifecycle === 'FROZEN' ||
    round.lifecycle === 'SCREENING' ||
    round.lifecycle === 'HOLD' ||
    round.lifecycle === 'READY';

  const canRetry =
    Boolean(assessment) &&
    assessment!.outcome === 'UNRESOLVED' &&
    assessment!.attempt < 3 &&
    isScreenable;

  return (
    <div className="w-full bg-workbench-surface border border-workbench-border rounded-lg shadow-panel overflow-hidden text-slate-100 flex flex-col">
      {/* Inspector Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-workbench-border bg-workbench-subtle">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-cobalt-400" />
          <h3 className="text-xs font-semibold text-white tracking-tight">
            Pair Inspector (Applicant #{applicant.index} & Reviewer #{reviewer.index})
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-workbench-hover rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 text-xs overflow-y-auto max-h-[600px]">
        {/* Consensus Verdict & Consequence Banner */}
        <div className={`p-3.5 rounded-md border ${meta.bgClass} ${meta.borderClass} space-y-1.5`}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold uppercase text-slate-300">
              Consensus Consequence
            </span>
            <span className={`font-mono font-bold text-xs ${meta.colorClass}`}>
              {meta.consequence}
            </span>
          </div>
          <div className="font-semibold text-white text-xs">{meta.label}</div>
          <p className="text-[11px] text-slate-300 leading-relaxed">{meta.description}</p>
        </div>

        {/* Pair Identities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Applicant Node Details */}
          <div className="p-3 bg-workbench-bg border border-workbench-border rounded-md space-y-2">
            <div className="flex items-center justify-between border-b border-workbench-border pb-1">
              <span className="font-medium text-slate-200 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-400" /> Applicant #{applicant.index}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                  applicant.acknowledged
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}
              >
                {applicant.acknowledged ? 'ACKNOWLEDGED' : 'PENDING ACK'}
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Wallet:</span>
                <span className="text-slate-300">{truncateAddress(applicant.wallet)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ORCID:</span>
                <a
                  href={getOrcidUrl(applicant.orcid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cobalt-400 hover:underline flex items-center gap-1"
                >
                  <span>{applicant.orcid}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="flex items-start gap-1 pt-1 text-slate-400 font-sans text-[11px]">
                <Building className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                <span className="truncate">{applicant.declared_institution}</span>
              </div>
            </div>
          </div>

          {/* Reviewer Node Details */}
          <div className="p-3 bg-workbench-bg border border-workbench-border rounded-md space-y-2">
            <div className="flex items-center justify-between border-b border-workbench-border pb-1">
              <span className="font-medium text-slate-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-cobalt-400" /> Reviewer #{reviewer.index}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                  reviewer.is_backup
                    ? 'bg-purple-950 text-purple-300 border-purple-800'
                    : 'bg-blue-950 text-blue-300 border-blue-800'
                }`}
              >
                {reviewer.is_backup ? 'BACKUP' : 'PRIMARY'}
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Wallet:</span>
                <span className="text-slate-300">{truncateAddress(reviewer.wallet)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ORCID:</span>
                <a
                  href={getOrcidUrl(reviewer.orcid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cobalt-400 hover:underline flex items-center gap-1"
                >
                  <span>{reviewer.orcid}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="flex items-start gap-1 pt-1 text-slate-400 font-sans text-[11px]">
                <Building className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                <span className="truncate">{reviewer.declared_institution}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Official Cross-Source Coverage Details */}
        {assessment && (
          <div className="p-3 bg-workbench-bg border border-workbench-border rounded-md space-y-2.5">
            <div className="flex items-center justify-between border-b border-workbench-border pb-1 font-semibold text-white">
              <span>Public Evidence Source Statuses</span>
              <span className="font-mono text-[10px] text-slate-400">
                Attempt {assessment.attempt}/3
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div className="p-2 rounded bg-workbench-surface border border-workbench-border">
                <div className="text-[10px] text-slate-500">ORCID App:</div>
                <div className="font-bold text-emerald-400">
                  HTTP {assessment.source_statuses.orcid_applicant}
                </div>
              </div>
              <div className="p-2 rounded bg-workbench-surface border border-workbench-border">
                <div className="text-[10px] text-slate-500">ORCID Rev:</div>
                <div className="font-bold text-emerald-400">
                  HTTP {assessment.source_statuses.orcid_reviewer}
                </div>
              </div>
              <div className="p-2 rounded bg-workbench-surface border border-workbench-border">
                <div className="text-[10px] text-slate-500">NCBI PubMed:</div>
                <div className="font-bold text-emerald-400">
                  HTTP {assessment.source_statuses.pubmed}
                </div>
              </div>
              <div className="p-2 rounded bg-workbench-surface border border-workbench-border">
                <div className="text-[10px] text-slate-500">NIH RePORTER:</div>
                <div className="font-bold text-emerald-400">
                  HTTP {assessment.source_statuses.nih_reporter}
                </div>
              </div>
            </div>

            {/* Shared PMIDs or Grants */}
            {assessment.shared_pmids && assessment.shared_pmids.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-red-300">
                  Shared Co-Authored PMIDs ({assessment.shared_pmids.length}):
                </span>
                <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                  {assessment.shared_pmids.map((pmid) => (
                    <a
                      key={pmid}
                      href={getPubmedPmidUrl(pmid)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 hover:underline flex items-center gap-0.5"
                    >
                      PMID:{pmid} <ExternalLink className="w-2 h-2" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {assessment.shared_project_nums && assessment.shared_project_nums.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-red-300">
                  Shared NIH Grant Projects ({assessment.shared_project_nums.length}):
                </span>
                <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                  {assessment.shared_project_nums.map((proj) => (
                    <a
                      key={proj}
                      href={getNihReporterUrl(proj)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 hover:underline flex items-center gap-0.5"
                    >
                      NIH:{proj} <ExternalLink className="w-2 h-2" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Assessment Metadata */}
            <div className="pt-2 border-t border-workbench-border space-y-1 font-mono text-[10px] text-slate-400">
              <div className="flex justify-between">
                <span>Observed Time:</span>
                <span className="text-slate-300">{formatTimestamp(assessment.observed_at)}</span>
              </div>
              {assessment.fingerprint && (
                <div className="flex justify-between">
                  <span>Pair Fingerprint:</span>
                  <span className="text-slate-300 font-mono">
                    {truncateHash(assessment.fingerprint, 8, 6)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assignment Relation in Panel */}
        {assignment && assignment.applicant_index === applicant.index && (
          <div className="p-3 bg-workbench-bg border border-workbench-border rounded-md space-y-1 text-slate-300 font-mono text-[11px]">
            <div className="font-semibold text-white font-sans text-xs">Assignment Role</div>
            <div>
              Status: <span className="text-cobalt-400">{assignment.status}</span>
            </div>
            <div>
              Primary Reviewer: Index #{assignment.primary_index}
            </div>
            <div>
              Ordered Backups: {assignment.backup_indexes_csv || 'None'}
            </div>
          </div>
        )}

        {/* Public limitation notice */}
        <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
          <strong className="text-slate-300">Scope Notice:</strong> Public-evidence screening signal only.
          Absence of public records does not prove absence of private, family, or financial conflict.
        </div>

        {/* Action Button: Screen Pair or Retry */}
        <div className="pt-2">
          {!assessment && isScreenable && (
            <Button
              variant="primary"
              className="w-full"
              isLoading={isTransacting}
              leftIcon={<Search className="w-3.5 h-3.5" />}
              onClick={() => onScreenPair(applicant.index, reviewer.index)}
            >
              Screen Pair via GenLayer Consensus
            </Button>
          )}

          {canRetry && (
            <Button
              variant="secondary"
              className="w-full border-purple-800 text-purple-300 hover:bg-purple-950"
              isLoading={isTransacting}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => onScreenPair(applicant.index, reviewer.index)}
            >
              Retry Screening (Attempt {assessment!.attempt + 1}/3)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
