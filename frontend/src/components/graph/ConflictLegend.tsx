// ============================================================================
// Grant Review Recusal Graph — Conflict & Consensus Legend
// ============================================================================

import React from 'react';
import { getOutcomeMetadata } from '@/utils/formatters';
import { ConsensusOutcome } from '@/types';

export const ConflictLegend: React.FC = () => {
  const outcomes: ConsensusOutcome[] = [
    'NO_PUBLIC_CONFLICT_FOUND',
    'DIRECT_RECENT_COLLABORATION',
    'CURRENT_INSTITUTIONAL_OVERLAP',
    'HISTORICAL_RELATION_REVIEW',
    'UNRESOLVED',
  ];

  return (
    <div className="bg-workbench-surface border border-workbench-border rounded-lg p-3 text-xs space-y-2">
      <div className="flex items-center justify-between border-b border-workbench-border pb-1.5">
        <span className="font-semibold text-white tracking-tight">Consensus Outcomes & Policy Consequences</span>
        <span className="font-mono text-[11px] text-slate-400">Policy: GRRG-V1</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-[11px]">
        {outcomes.map((outcome) => {
          const meta = getOutcomeMetadata(outcome);
          return (
            <div
              key={outcome}
              className={`p-2 rounded border ${meta.bgClass} ${meta.borderClass} flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-mono font-semibold ${meta.colorClass} truncate`}>
                  {meta.consequence}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {outcome === 'DIRECT_RECENT_COLLABORATION' ? '5-Yr Window' : ''}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 leading-tight">
                {meta.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
