// ============================================================================
// Grant Review Recusal Graph — Screening & Consensus Panel
// ============================================================================

import React, { useState } from 'react';
import {
  Round,
  Participant,
  PairAssessment,
} from '@/types';
import {
  getOutcomeMetadata,
  formatTimestamp,
  truncateAddress,
} from '@/utils/formatters';
import { Button } from '@/components/common/Button';
import {
  Search,
  CheckCircle2,
  Play,
  RotateCw,
} from 'lucide-react';

export interface ScreeningPanelProps {
  round: Round;
  applicants: Participant[];
  reviewers: Participant[];
  assessments: Map<string, PairAssessment>;
  onScreenPair: (applicantIndex: number, reviewerIndex: number) => Promise<void>;
  onFinalizeScreening: (roundId: number) => Promise<void>;
  isTransacting: boolean;
}

export const ScreeningPanel: React.FC<ScreeningPanelProps> = ({
  round,
  applicants,
  reviewers,
  assessments,
  onScreenPair,
  onFinalizeScreening,
  isTransacting,
}) => {
  const [activeTabFilter, setActiveTabFilter] = useState<string>('ALL');

  const totalPairs = applicants.length * reviewers.length;
  const screenedCount = assessments.size;
  const isFrozenOrScreening =
    round.lifecycle === 'FROZEN' ||
    round.lifecycle === 'SCREENING' ||
    round.lifecycle === 'HOLD';

  return (
    <div className="space-y-6">
      {/* Top Banner: Progress & Finalize Screening Action */}
      <div className="p-4 bg-workbench-surface border border-workbench-border rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-cobalt-400" />
            <h3 className="text-xs font-semibold text-white">
              GenLayer Nondeterministic Screening & Consensus
            </h3>
          </div>
          <p className="text-[11px] text-slate-400">
            Permissionless assessors trigger independent validator web queries across ORCID, PubMed, and NIH RePORTER.
          </p>
          <div className="flex items-center gap-3 pt-1 text-xs font-mono">
            <span className="text-slate-400">Screening Progress:</span>
            <span className="font-bold text-white">
              {screenedCount} / {totalPairs} Pairs Screened
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Finalize Screening Action */}
          <Button
            variant="primary"
            size="md"
            className="bg-teal-600 hover:bg-teal-500 border-teal-500/50"
            isLoading={isTransacting}
            disabled={!isFrozenOrScreening || screenedCount === 0}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            onClick={() => onFinalizeScreening(round.id)}
          >
            Finalize Screening
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-workbench-border pb-2 text-xs font-medium">
        {['ALL', 'ELIGIBLE', 'RECUSED', 'HOLD', 'UNSCREENED'].map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveTabFilter(filter)}
            className={`px-3 py-1 rounded transition-colors ${
              activeTabFilter === filter
                ? 'bg-cobalt-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-workbench-hover'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Screened Pairs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {applicants.flatMap((app) =>
          reviewers.map((rev) => {
            const pairKey = `${app.index}-${rev.index}`;
            const assessment = assessments.get(pairKey);
            const outcome = assessment ? assessment.outcome : 'UNSCREENED';
            const meta = getOutcomeMetadata(outcome);

            // Filter logic
            if (activeTabFilter === 'ELIGIBLE' && meta.consequence !== 'ELIGIBLE') return null;
            if (activeTabFilter === 'RECUSED' && meta.consequence !== 'RECUSED') return null;
            if (
              activeTabFilter === 'HOLD' &&
              meta.consequence !== 'MANUAL_HOLD' &&
              meta.consequence !== 'EVIDENCE_HOLD'
            )
              return null;
            if (activeTabFilter === 'UNSCREENED' && assessment) return null;

            return (
              <div
                key={pairKey}
                className="p-4 bg-workbench-surface border border-workbench-border rounded-lg shadow-subtle space-y-3 text-xs flex flex-col justify-between"
              >
                {/* Header: Pair Identities */}
                <div className="flex items-start justify-between border-b border-workbench-border pb-2">
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>Applicant #{app.index}</span>
                      <span className="text-slate-500">×</span>
                      <span>Reviewer #{rev.index}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {truncateAddress(app.wallet)} × {truncateAddress(rev.wallet)}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] border ${meta.bgClass} ${meta.borderClass} ${meta.colorClass}`}
                  >
                    {meta.consequence}
                  </span>
                </div>

                {/* Outcome & Reason */}
                <div className="space-y-1">
                  <div className="font-semibold text-slate-200 text-xs">{meta.label}</div>
                  <p className="text-[11px] text-slate-400 leading-tight">{meta.description}</p>
                </div>

                {/* Evidence Details */}
                {assessment ? (
                  <div className="space-y-2 pt-2 border-t border-workbench-border font-mono text-[10px]">
                    <div className="grid grid-cols-4 gap-1 text-center">
                      <div className="p-1 bg-workbench-bg rounded border border-workbench-border">
                        <div className="text-slate-500">ORCID A</div>
                        <div className="text-emerald-400 font-bold">
                          {assessment.source_statuses.orcid_applicant}
                        </div>
                      </div>
                      <div className="p-1 bg-workbench-bg rounded border border-workbench-border">
                        <div className="text-slate-500">ORCID R</div>
                        <div className="text-emerald-400 font-bold">
                          {assessment.source_statuses.orcid_reviewer}
                        </div>
                      </div>
                      <div className="p-1 bg-workbench-bg rounded border border-workbench-border">
                        <div className="text-slate-500">PubMed</div>
                        <div className="text-emerald-400 font-bold">
                          {assessment.source_statuses.pubmed}
                        </div>
                      </div>
                      <div className="p-1 bg-workbench-bg rounded border border-workbench-border">
                        <div className="text-slate-500">NIH</div>
                        <div className="text-emerald-400 font-bold">
                          {assessment.source_statuses.nih_reporter}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between text-slate-400 pt-1">
                      <span>Attempt: {assessment.attempt}/3</span>
                      <span>Observed: {formatTimestamp(assessment.observed_at)}</span>
                    </div>

                    {assessment.outcome === 'UNRESOLVED' && assessment.attempt < 3 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full mt-2 border-purple-800 text-purple-300 hover:bg-purple-950"
                        isLoading={isTransacting}
                        leftIcon={<RotateCw className="w-3 h-3" />}
                        onClick={() => onScreenPair(app.index, rev.index)}
                      >
                        Retry Screening (Attempt {assessment.attempt + 1}/3)
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-workbench-border flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-500">Unscreened</span>
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={isTransacting}
                      leftIcon={<Play className="w-3 h-3" />}
                      onClick={() => onScreenPair(app.index, rev.index)}
                    >
                      Screen Pair
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
