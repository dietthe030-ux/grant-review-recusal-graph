// ============================================================================
// Grant Review Recusal Graph — Workbench Header
// ============================================================================

import React, { useState } from 'react';
import { WalletConnector } from '@/components/wallet/WalletConnector';
import {
  DEPLOYED_CONTRACT_ADDRESS,
  STUDIONET_CHAIN_ID,
} from '@/config/constants';
import { truncateAddress, getExplorerAddressUrl } from '@/utils/formatters';
import { rpcCoordinator } from '@/services/rpcCoordinator';
import {
  ShieldCheck,
  ExternalLink,
  Activity,
  PlusCircle,
  Layers,
} from 'lucide-react';

export interface WorkbenchHeaderProps {
  currentRoundId: number;
  onSelectRoundId: (roundId: number) => void;
  onOpenCreateRound: () => void;
}

export const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = ({
  currentRoundId,
  onSelectRoundId,
  onOpenCreateRound,
}) => {
  const [showRpcStats, setShowRpcStats] = useState(false);
  const rpcStats = rpcCoordinator.getMetrics();

  return (
    <header className="sticky top-0 z-40 w-full bg-workbench-surface border-b border-workbench-border shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand & Contract Target */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-cobalt-600/20 border border-cobalt-500/40 flex items-center justify-center text-cobalt-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2 truncate">
                <span>Grant Review Recusal Graph</span>
                <span className="hidden md:inline-flex px-1.5 py-0.5 text-[10px] font-mono font-normal bg-cobalt-950 text-cobalt-300 border border-cobalt-800 rounded">
                  Intelligent Contract
                </span>
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <a
                  href={getExplorerAddressUrl(DEPLOYED_CONTRACT_ADDRESS)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cobalt-400 flex items-center gap-0.5 underline underline-offset-2"
                  title="View Contract on Studionet Explorer"
                >
                  <span>{truncateAddress(DEPLOYED_CONTRACT_ADDRESS, 6, 4)}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-400">Chain {STUDIONET_CHAIN_ID}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Round Selector & Controls */}
        <div className="flex items-center gap-2">
          {/* Round Selector */}
          <div className="flex items-center bg-workbench-bg border border-workbench-border rounded px-2 py-1 text-xs">
            <Layers className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
            <span className="text-slate-400 mr-1 text-[11px]">Round:</span>
            <select
              value={currentRoundId}
              onChange={(e) => onSelectRoundId(Number(e.target.value))}
              className="bg-transparent text-white font-mono text-xs focus:outline-hidden cursor-pointer"
            >
              <option value={0} className="bg-workbench-surface text-slate-100">
                #0 (Pilot Round)
              </option>
              <option value={1} className="bg-workbench-surface text-slate-100">
                #1 (Round 1)
              </option>
              <option value={2} className="bg-workbench-surface text-slate-100">
                #2 (Round 2)
              </option>
              <option value={3} className="bg-workbench-surface text-slate-100">
                #3 (Round 3)
              </option>
            </select>
          </div>

          {/* Create Round Action */}
          <button
            type="button"
            onClick={onOpenCreateRound}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-workbench-subtle hover:bg-workbench-hover border border-workbench-border rounded transition-colors"
            title="Create New Round on Studionet"
          >
            <PlusCircle className="w-3.5 h-3.5 text-cobalt-400" />
            <span>New Round</span>
          </button>

          {/* RPC Stats Indicator */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRpcStats(!showRpcStats)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-workbench-hover rounded border border-workbench-border transition-colors"
              title="Inspect Shared RPC Coordinator Metrics"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>

            {showRpcStats && (
              <div className="absolute right-0 mt-2 w-64 p-3 bg-workbench-surface border border-workbench-border rounded-lg shadow-modal text-xs z-50 space-y-2">
                <div className="flex items-center justify-between border-b border-workbench-border pb-1 font-semibold text-white">
                  <span>RPC Coordinator</span>
                  <span className="text-[10px] font-mono text-slate-400">8s TTL Cache</span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Calls:</span>
                    <span>{rpcStats.totalCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cache Hits:</span>
                    <span className="text-emerald-400">{rpcStats.cacheHits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coalesced Requests:</span>
                    <span className="text-blue-400">{rpcStats.coalescedCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Throttled (429):</span>
                    <span className="text-amber-400">{rpcStats.throttledCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Failed Calls:</span>
                    <span className="text-red-400">{rpcStats.failedCalls}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Injected Wallet Connector */}
          <WalletConnector />
        </div>
      </div>
    </header>
  );
};
