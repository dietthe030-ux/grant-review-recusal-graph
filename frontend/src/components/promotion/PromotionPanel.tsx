// ============================================================================
// Grant Review Recusal Graph — Backup Promotion & Quorum Activation Panel
// ============================================================================

import React from 'react';
import {
  Round,
  EffectivePanelResult,
  Participant,
  Assignment,
} from '@/types';
import {
  truncateAddress,
  getOrcidUrl,
} from '@/utils/formatters';
import { Button } from '@/components/common/Button';
import {
  CheckCircle,
  UserCheck,
  ArrowRight,
  Fingerprint,
  ExternalLink,
} from 'lucide-react';

export interface PromotionPanelProps {
  round: Round;
  effectivePanel: EffectivePanelResult | null;
  applicants: Participant[];
  reviewers: Participant[];
  assignments: Assignment[];
  onActivatePanel: (roundId: number) => Promise<void>;
  isTransacting: boolean;
}

export const PromotionPanel: React.FC<PromotionPanelProps> = ({
  round,
  effectivePanel,
  applicants,
  reviewers,
  assignments,
  onActivatePanel,
  isTransacting,
}) => {
  const isReady = round.lifecycle === 'READY';
  const isActive = round.lifecycle === 'ACTIVE';
  const quorumMet = effectivePanel?.quorum_met ?? false;

  return (
    <div className="space-y-6">
      {/* Top Banner: Panel Activation Action & Quorum Status */}
      <div className="p-5 bg-workbench-surface border border-workbench-border rounded-lg shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-cobalt-400" />
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Deterministic Backup Promotion & Quorum Preservation
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            When a primary reviewer is recused due to public evidence, GenLayer contract logic automatically
            promotes ordered backup reviewers without allowing administrator discretion.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 font-mono text-xs">
            <span className="text-slate-400">Target Quorum:</span>
            <span className="font-bold text-white">{round.quorum} Reviewers</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Active Panel Status:</span>
            <span
              className={`px-2 py-0.5 rounded font-bold text-xs ${
                quorumMet
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}
            >
              {quorumMet ? 'QUORUM PRESERVED (READY)' : 'INSUFFICIENT REVIEWERS (HOLD)'}
            </span>
          </div>
        </div>

        {/* Panel Activation Button */}
        <div>
          {isReady && (
            <Button
              variant="primary"
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/50 shadow-panel"
              isLoading={isTransacting}
              leftIcon={<CheckCircle className="w-4 h-4" />}
              onClick={() => onActivatePanel(round.id)}
            >
              Activate Review Panel
            </Button>
          )}

          {isActive && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-950/80 border border-emerald-800 rounded text-emerald-300 font-mono text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Panel Activated on Studionet</span>
            </div>
          )}
        </div>
      </div>

      {/* Active Panel Fingerprint Banner */}
      {round.active_panel_fingerprint && (
        <div className="p-3 bg-workbench-surface border border-workbench-border rounded-lg flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Fingerprint className="w-4 h-4 text-cobalt-400" />
            <span>Immutable Active Panel Fingerprint:</span>
          </div>
          <span className="font-bold text-slate-200">
            {round.active_panel_fingerprint}
          </span>
        </div>
      )}

      {/* Effective Assignment Breakdown Cards */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
          Effective Panel Allocations ({effectivePanel?.assignments.length ?? 0} Applicants)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {effectivePanel && effectivePanel.assignments.length > 0 ? (
            effectivePanel.assignments.map((alloc) => {
              const applicant = applicants.find((a) => a.index === alloc.applicant_index);
              const activeReviewer = reviewers.find(
                (r) => r.index === alloc.active_reviewer_index
              );
              const assignment = assignments.find(
                (a) => a.applicant_index === alloc.applicant_index
              );
              const primaryReviewer = assignment
                ? reviewers.find((r) => r.index === assignment.primary_index)
                : null;

              return (
                <div
                  key={alloc.applicant_index}
                  className="p-4 bg-workbench-surface border border-workbench-border rounded-lg shadow-subtle space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-workbench-border pb-2">
                    <span className="font-semibold text-white text-xs">
                      Applicant #{alloc.applicant_index} {applicant ? `(${applicant.declared_institution})` : ''}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] border ${
                        alloc.is_backup
                          ? 'bg-blue-950 text-blue-300 border-blue-800'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}
                    >
                      {alloc.assignment_status}
                    </span>
                  </div>

                  {/* Promotion Step Diagram */}
                  <div className="p-3 bg-workbench-bg border border-workbench-border rounded-md space-y-2">
                    {/* Primary Reviewer status */}
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-slate-500">Planned Primary:</span>
                      <span
                        className={
                          alloc.is_backup
                            ? 'line-through text-red-400 font-medium'
                            : 'text-emerald-400 font-medium'
                        }
                      >
                        Reviewer #{primaryReviewer?.index ?? assignment?.primary_index}
                        {alloc.is_backup ? ' (RECUSED)' : ' (ACTIVE)'}
                      </span>
                    </div>

                    {/* If backup was promoted */}
                    {alloc.is_backup && (
                      <div className="flex items-center justify-between font-mono text-[11px] pt-1 border-t border-workbench-border">
                        <span className="text-blue-400 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" /> Promoted Backup:
                        </span>
                        <span className="text-blue-300 font-bold">
                          Reviewer #{alloc.active_reviewer_index} (Backup)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Active Reviewer Details */}
                  {activeReviewer && (
                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Active Reviewer Wallet:</span>
                        <span className="text-slate-300">
                          {truncateAddress(activeReviewer.wallet)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">ORCID:</span>
                        <a
                          href={getOrcidUrl(activeReviewer.orcid)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cobalt-400 hover:underline flex items-center gap-1"
                        >
                          <span>{activeReviewer.orcid}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-2 p-8 text-center text-xs text-slate-500 border border-dashed border-workbench-border rounded">
              Panel has not been finalized yet. Complete screening in the Screening tab to view effective allocations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
