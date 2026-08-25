// ============================================================================
// Grant Review Recusal Graph — Interactive Bipartite Graph Visualization
// ============================================================================

import React, { useState, useRef } from 'react';
import {
  Participant,
  PairAssessment,
  Assignment,
  Round,
} from '@/types';
import {
  getOutcomeMetadata,
  truncateAddress,
} from '@/utils/formatters';
import { EdgeInspector } from './EdgeInspector';
import { ConflictLegend } from './ConflictLegend';
import {
  User,
  ShieldCheck,
  Building,
  Table as TableIcon,
  Share2,
} from 'lucide-react';

export interface BipartiteRecusalGraphProps {
  round: Round;
  applicants: Participant[];
  reviewers: Participant[];
  assignments: Assignment[];
  assessments: Map<string, PairAssessment>;
  onScreenPair: (applicantIndex: number, reviewerIndex: number) => Promise<void>;
  isTransacting: boolean;
}

export const BipartiteRecusalGraph: React.FC<BipartiteRecusalGraphProps> = ({
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

  const [hoveredPair, setHoveredPair] = useState<{
    applicantIndex: number;
    reviewerIndex: number;
  } | null>(null);

  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  const containerRef = useRef<HTMLDivElement>(null);

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
      {/* Top Controls & Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <ConflictLegend />
        <div className="flex items-center gap-2 self-end">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'graph' ? 'table' : 'graph')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-workbench-surface hover:bg-workbench-hover border border-workbench-border rounded text-slate-200 transition-colors"
          >
            {viewMode === 'graph' ? (
              <>
                <TableIcon className="w-3.5 h-3.5 text-cobalt-400" />
                <span>Table View</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-cobalt-400" />
                <span>Graph View</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace Layout: Graph + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left / Center Graph Area */}
        <div
          className={`space-y-4 ${
            selectedPair ? 'lg:col-span-7' : 'lg:col-span-12'
          } transition-all`}
        >
          {viewMode === 'graph' ? (
            <div
              ref={containerRef}
              className="bg-workbench-surface border border-workbench-border rounded-lg p-4 sm:p-6 shadow-subtle min-h-[500px] flex flex-col justify-between relative overflow-hidden"
            >
              {/* Header column labels */}
              <div className="flex items-center justify-between border-b border-workbench-border pb-3 text-xs font-semibold text-slate-300">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  <span>Applicant Cohort ({applicants.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cobalt-400" />
                  <span>Reviewer Panel ({reviewers.length})</span>
                </div>
              </div>

              {/* Bipartite Graph Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 my-6 relative">
                {/* Left Column: Applicants */}
                <div className="space-y-3 z-10">
                  {applicants.length === 0 ? (
                    <div className="p-4 border border-dashed border-workbench-border rounded text-center text-xs text-slate-500">
                      No applicants added yet.
                    </div>
                  ) : (
                    applicants.map((applicant) => {
                      const isSelected = selectedPair?.applicantIndex === applicant.index;
                      const isHovered = hoveredPair?.applicantIndex === applicant.index;

                      return (
                        <div
                          key={applicant.index}
                          tabIndex={0}
                          role="button"
                          aria-label={`Select Applicant ${applicant.index}`}
                          onClick={() => {
                            // Default select pair with first reviewer
                            const revIdx = reviewers[0]?.index ?? 0;
                            setSelectedPair({
                              applicantIndex: applicant.index,
                              reviewerIndex: revIdx,
                            });
                          }}
                          onMouseEnter={() =>
                            setHoveredPair((prev) => ({
                              applicantIndex: applicant.index,
                              reviewerIndex: prev?.reviewerIndex ?? 0,
                            }))
                          }
                          onMouseLeave={() => setHoveredPair(null)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer text-xs ${
                            isSelected
                              ? 'bg-blue-950/40 border-cobalt-500 shadow-panel'
                              : isHovered
                              ? 'bg-workbench-hover border-slate-600'
                              : 'bg-workbench-bg border-workbench-border hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-400" />
                              Applicant #{applicant.index}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                applicant.acknowledged
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : 'bg-slate-900 text-slate-400 border-slate-700'
                              }`}
                            >
                              {applicant.acknowledged ? 'ACK' : 'PENDING'}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 truncate">
                            {applicant.orcid}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 truncate">
                            <Building className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{applicant.declared_institution}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Right Column: Reviewers */}
                <div className="space-y-3 z-10">
                  {reviewers.length === 0 ? (
                    <div className="p-4 border border-dashed border-workbench-border rounded text-center text-xs text-slate-500">
                      No reviewers added yet.
                    </div>
                  ) : (
                    reviewers.map((reviewer) => {
                      const isSelected = selectedPair?.reviewerIndex === reviewer.index;
                      const isHovered = hoveredPair?.reviewerIndex === reviewer.index;

                      return (
                        <div
                          key={reviewer.index}
                          tabIndex={0}
                          role="button"
                          aria-label={`Select Reviewer ${reviewer.index}`}
                          onClick={() => {
                            const appIdx = applicants[0]?.index ?? 0;
                            setSelectedPair({
                              applicantIndex: appIdx,
                              reviewerIndex: reviewer.index,
                            });
                          }}
                          onMouseEnter={() =>
                            setHoveredPair((prev) => ({
                              applicantIndex: prev?.applicantIndex ?? 0,
                              reviewerIndex: reviewer.index,
                            }))
                          }
                          onMouseLeave={() => setHoveredPair(null)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer text-xs ${
                            isSelected
                              ? 'bg-cobalt-950/40 border-cobalt-500 shadow-panel'
                              : isHovered
                              ? 'bg-workbench-hover border-slate-600'
                              : 'bg-workbench-bg border-workbench-border hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-white flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  reviewer.is_backup ? 'bg-purple-400' : 'bg-cobalt-400'
                                }`}
                              />
                              Reviewer #{reviewer.index}
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
                          <div className="text-[11px] font-mono text-slate-400 truncate">
                            {reviewer.orcid}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 truncate">
                            <Building className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{reviewer.declared_institution}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Pair Connection Matrix Quick Actions */}
              <div className="pt-4 border-t border-workbench-border flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>Click any applicant or reviewer node to inspect cross-source evidence.</span>
                <span className="font-mono">Total Pairs: {applicants.length * reviewers.length}</span>
              </div>
            </div>
          ) : (
            /* Dense Table Projection View */
            <div className="bg-workbench-surface border border-workbench-border rounded-lg shadow-subtle overflow-hidden">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-workbench-subtle border-b border-workbench-border text-[11px] font-semibold text-slate-400 uppercase">
                  <tr>
                    <th className="px-4 py-3">Applicant</th>
                    <th className="px-4 py-3">Reviewer</th>
                    <th className="px-4 py-3">Outcome</th>
                    <th className="px-4 py-3">Consequence</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-workbench-border">
                  {applicants.flatMap((app) =>
                    reviewers.map((rev) => {
                      const pairKey = `${app.index}-${rev.index}`;
                      const assessment = assessments.get(pairKey);
                      const outcome = assessment ? assessment.outcome : 'UNSCREENED';
                      const meta = getOutcomeMetadata(outcome);

                      return (
                        <tr
                          key={pairKey}
                          onClick={() =>
                            setSelectedPair({
                              applicantIndex: app.index,
                              reviewerIndex: rev.index,
                            })
                          }
                          className="hover:bg-workbench-hover/60 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 font-mono">
                            Applicant #{app.index} ({truncateAddress(app.wallet)})
                          </td>
                          <td className="px-4 py-3 font-mono">
                            Reviewer #{rev.index} ({rev.is_backup ? 'Backup' : 'Primary'})
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px]">
                            <span className={meta.colorClass}>{meta.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[10px] border ${meta.bgClass} ${meta.borderClass} ${meta.colorClass}`}
                            >
                              {meta.consequence}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              className="text-cobalt-400 hover:underline font-mono text-[11px]"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Edge Inspector Drawer / Panel */}
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
