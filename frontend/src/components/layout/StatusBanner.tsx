// ============================================================================
// Grant Review Recusal Graph — Status & Quorum Banner
// ============================================================================

import React from 'react';
import { Round, EffectivePanelResult } from '@/types';
import {
  getLifecycleMetadata,
  formatTimestamp,
  formatRelativeTime,
  truncateHash,
} from '@/utils/formatters';
import {
  ShieldCheck,
  Clock,
  FileCheck,
  Check,
  AlertTriangle,
  XCircle,
  CheckCircle2,
} from 'lucide-react';

export interface StatusBannerProps {
  round: Round;
  effectivePanel: EffectivePanelResult | null;
  onCloseRound?: (roundId: number) => Promise<void>;
  onCancelRound?: (roundId: number) => Promise<void>;
  isTransacting?: boolean;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  round,
  effectivePanel,
  onCloseRound,
  onCancelRound,
  isTransacting = false,
}) => {
  const lifecycleMeta = getLifecycleMetadata(round.lifecycle);
  const isFrozen = round.lifecycle !== 'DRAFT';
  const quorumMet = effectivePanel ? effectivePanel.quorum_met : false;

  return (
    <div className="w-full bg-workbench-surface border-b border-workbench-border px-4 sm:px-6 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Left: Round Title, Lifecycle & Fingerprint */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span
            className={`px-2.5 py-0.5 rounded font-mono font-semibold border text-xs tracking-wider uppercase ${lifecycleMeta.badgeClass}`}
          >
            {lifecycleMeta.label}
          </span>

          <div className="flex items-center gap-1.5 font-medium text-white">
            <span>{round.title || `Round #${round.id}`}</span>
            <span className="text-slate-500 font-mono text-[11px]">({round.policy_version})</span>
          </div>

          {round.active_panel_fingerprint && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-workbench-bg border border-workbench-border rounded px-2 py-0.5">
              <span className="text-slate-500">Panel Hash:</span>
              <span className="text-slate-200">
                {truncateHash(round.active_panel_fingerprint, 8, 6)}
              </span>
            </div>
          )}
        </div>

        {/* Right: Quorum Metrics, Deadlines & Governance Actions */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
          {/* Quorum Progress */}
          <div className="flex items-center gap-1.5 bg-workbench-bg border border-workbench-border rounded px-2.5 py-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cobalt-400" />
            <span className="text-slate-400">Quorum:</span>
            <span className="font-semibold text-white">
              {effectivePanel
                ? `${effectivePanel.primary_active_count + effectivePanel.backup_promoted_count} / ${round.quorum}`
                : `Target ${round.quorum}`}
            </span>
            {effectivePanel && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded text-[10px] flex items-center gap-0.5 ${
                  quorumMet
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {quorumMet ? (
                  <>
                    <Check className="w-2.5 h-2.5" /> MET
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-2.5 h-2.5" /> HOLD
                  </>
                )}
              </span>
            )}
          </div>

          {/* Screening Progress */}
          <div className="flex items-center gap-1.5 bg-workbench-bg border border-workbench-border rounded px-2.5 py-1">
            <FileCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Screened:</span>
            <span className="text-slate-200 font-semibold">{round.screened_pairs_count} pairs</span>
          </div>

          {/* Deadlines */}
          {round.freeze_deadline > 0 && (
            <div
              className="flex items-center gap-1 text-slate-400"
              title={`Freeze Deadline: ${formatTimestamp(round.freeze_deadline)}`}
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{isFrozen ? 'Frozen' : `Freeze ${formatRelativeTime(round.freeze_deadline)}`}</span>
            </div>
          )}

          {/* Governance Action: Cancel Round (Draft only) */}
          {round.lifecycle === 'DRAFT' && onCancelRound && (
            <button
              type="button"
              disabled={isTransacting}
              onClick={() => {
                if (window.confirm(`Are you sure you want to cancel Round #${round.id}? This action is irreversible.`)) {
                  onCancelRound(round.id);
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-mono text-[11px] transition-colors disabled:opacity-50"
              title="Cancel draft round on Studionet"
            >
              <XCircle className="w-3 h-3" /> Cancel Round
            </button>
          )}

          {/* Governance Action: Close Round (Active only) */}
          {round.lifecycle === 'ACTIVE' && onCloseRound && (
            <button
              type="button"
              disabled={isTransacting}
              onClick={() => {
                if (window.confirm(`Are you sure you want to close Round #${round.id}?`)) {
                  onCloseRound(round.id);
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-mono text-[11px] transition-colors disabled:opacity-50"
              title="Close active round on Studionet"
            >
              <CheckCircle2 className="w-3 h-3" /> Close Round
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
