// ============================================================================
// Grant Review Recusal Graph — 2D Matrix Projection View
// ============================================================================

import React, { useState } from 'react';
import {
  Participant,
  PairAssessment,
  Round,
  Assignment,
} from '@/types';
import { getOutcomeMetadata, truncateAddress } from '@/utils/formatters';
import { EdgeInspector } from '@/components/graph/EdgeInspector';
import { ShieldCheck, User, Grid as GridIcon } from 'lucide-react';

export interface MatrixProjectionProps {
  round: Round;
  applicants: Participant[];
  reviewers: Participant[];
  assignments: Assignment[];
  assessments: Map<string, PairAssessment>;
  onScreenPair: (applicantIndex: number, reviewerIndex: number) => Promise<void>;
  isTransacting: boolean;
}

export const MatrixProjection: React.FC<MatrixProjectionProps> = ({
  round,
  applicants,
  reviewers,
  assignments,
  assessments,
  onScreenPair,
  isTransacting,
}) => {
  const [selectedPair, setSelectedPair] = useState<{
    applicantIndex: number;
    reviewerIndex: number;
  } | null>(null);

  // Calculate statistics across matrix
  let eligibleCount = 0;
  let recusedCount = 0;
  let holdCount = 0;
  let unscreenedCount = 0;

  for (const app of applicants) {
    for (const rev of reviewers) {
      const assessment = assessments.get(`${app.index}-${rev.index}`);
      if (!assessment) {
        unscreenedCount++;
      } else if (assessment.consequence === 'ELIGIBLE') {
        eligibleCount++;
      } else if (assessment.consequence === 'RECUSED') {
        recusedCount++;
      } else {
        holdCount++;
      }
    }
  }

  const selectedApplicant = selectedPair
    ? applicants.find((a) => a.index === selectedPair.applicantIndex) || null
    : null;

  const selectedReviewer = selectedPair
    ? reviewers.find((r) => r.index === selectedPair.reviewerIndex) || null
    : null;

  const selectedAssessment = selectedPair
    ? assessments.get(`${selectedPair.applicantIndex}-${selectedPair.reviewerIndex}`) || null
    : null;

  const selectedAssignment = selectedPair
    ? assignments.find((a) => a.applicant_index === selectedPair.applicantIndex) || null
    : null;

  return (
    <div className="space-y-4">
      {/* Matrix Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
        <div className="p-3 bg-workbench-surface border border-workbench-border rounded-lg">
          <div className="text-[11px] text-slate-400">Total Matrix Pairs</div>
          <div className="text-lg font-bold text-white mt-0.5">
            {applicants.length * reviewers.length}
          </div>
        </div>
        <div className="p-3 bg-emerald-950/30 border border-emerald-900/60 rounded-lg">
          <div className="text-[11px] text-emerald-400">Eligible Pairs</div>
          <div className="text-lg font-bold text-emerald-300 mt-0.5">{eligibleCount}</div>
        </div>
        <div className="p-3 bg-red-950/30 border border-red-900/60 rounded-lg">
          <div className="text-[11px] text-red-400">Recused Pairs</div>
          <div className="text-lg font-bold text-red-300 mt-0.5">{recusedCount}</div>
        </div>
        <div className="p-3 bg-purple-950/30 border border-purple-900/60 rounded-lg">
          <div className="text-[11px] text-purple-400">Holds / Unresolved</div>
          <div className="text-lg font-bold text-purple-300 mt-0.5">{holdCount}</div>
        </div>
        <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="text-[11px] text-slate-400">Unscreened Pairs</div>
          <div className="text-lg font-bold text-slate-300 mt-0.5">{unscreenedCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Matrix Grid */}
        <div className={`${selectedPair ? 'lg:col-span-7' : 'lg:col-span-12'} transition-all`}>
          <div className="bg-workbench-surface border border-workbench-border rounded-lg p-4 sm:p-6 shadow-subtle overflow-x-auto">
            <div className="flex items-center justify-between border-b border-workbench-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <GridIcon className="w-4 h-4 text-cobalt-400" />
                <h3 className="text-xs font-semibold text-white tracking-tight">
                  Conflict Cross-Matrix Projection
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Rows: Applicants × Columns: Reviewers
              </span>
            </div>

            {applicants.length === 0 || reviewers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-workbench-border rounded">
                Cohort incomplete. Please add applicants and reviewers in the Cohort tab.
              </div>
            ) : (
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 border border-workbench-border bg-workbench-subtle text-left text-slate-400 font-semibold text-[11px]">
                      Applicant \ Reviewer
                    </th>
                    {reviewers.map((rev) => (
                      <th
                        key={rev.index}
                        className="p-2 border border-workbench-border bg-workbench-subtle text-slate-300 font-mono text-[11px] min-w-[120px]"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-cobalt-400" />
                          <span>Rev #{rev.index}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal truncate">
                          {rev.is_backup ? '(Backup)' : '(Primary)'}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applicants.map((app) => (
                    <tr key={app.index}>
                      <td className="p-2 border border-workbench-border bg-workbench-subtle/50 text-left font-mono font-medium text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-blue-400" />
                          <span>App #{app.index}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal truncate">
                          {truncateAddress(app.wallet)}
                        </div>
                      </td>
                      {reviewers.map((rev) => {
                        const pairKey = `${app.index}-${rev.index}`;
                        const assessment = assessments.get(pairKey);
                        const outcome = assessment ? assessment.outcome : 'UNSCREENED';
                        const meta = getOutcomeMetadata(outcome);
                        const isSelected =
                          selectedPair?.applicantIndex === app.index &&
                          selectedPair?.reviewerIndex === rev.index;

                        return (
                          <td
                            key={rev.index}
                            onClick={() =>
                              setSelectedPair({
                                applicantIndex: app.index,
                                reviewerIndex: rev.index,
                              })
                            }
                            className={`p-2 border border-workbench-border cursor-pointer transition-all ${
                              isSelected
                                ? 'ring-2 ring-cobalt-500 bg-workbench-hover z-10'
                                : 'hover:bg-workbench-hover/80'
                            }`}
                          >
                            <div
                              className={`p-2 rounded border ${meta.bgClass} ${meta.borderClass} space-y-1`}
                            >
                              <div
                                className={`font-mono text-[10px] font-bold ${meta.colorClass} truncate`}
                              >
                                {meta.consequence}
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono">
                                {assessment ? `Attempt ${assessment.attempt}/3` : 'Unscreened'}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Selected Pair Inspector Side Drawer */}
        {selectedPair && (
          <div className="lg:col-span-5">
            <EdgeInspector
              applicant={selectedApplicant}
              reviewer={selectedReviewer}
              assessment={selectedAssessment}
              assignment={selectedAssignment}
              round={round}
              onScreenPair={onScreenPair}
              isTransacting={isTransacting}
              onClose={() => setSelectedPair(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
