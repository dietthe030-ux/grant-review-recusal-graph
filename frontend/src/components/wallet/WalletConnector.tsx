// ============================================================================
// Grant Review Recusal Graph — Wallet Connector Button & Account Badge
// ============================================================================

import React from 'react';
import { useWallet } from '@/context/WalletContext';
import { truncateAddress } from '@/utils/formatters';
import { Wallet, AlertTriangle, LogOut, RefreshCw } from 'lucide-react';

export const WalletConnector: React.FC = () => {
  const {
    walletState,
    openChooser,
    disconnectWallet,
    switchToStudionet,
  } = useWallet();

  if (!walletState.isConnected || !walletState.account) {
    return (
      <button
        type="button"
        onClick={openChooser}
        className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-cobalt-600 hover:bg-cobalt-500 active:scale-95 border border-cobalt-500/50 rounded shadow-subtle transition-all"
      >
        <Wallet className="w-3.5 h-3.5" />
        <span>Connect Wallet</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Wrong Network Indicator */}
      {!walletState.isCorrectChain && (
        <button
          type="button"
          onClick={switchToStudionet}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-950/80 border border-amber-800 rounded hover:bg-amber-900 transition-colors"
          title="Click to switch wallet to GenLayer Studionet (61999)"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Switch to Studionet</span>
          <RefreshCw className="w-3 h-3 ml-0.5" />
        </button>
      )}

      {/* Connected Account Badge */}
      <div className="flex items-center gap-2 px-3 py-1 bg-workbench-surface border border-workbench-border rounded text-xs">
        {walletState.providerDetail && (
          <span
            className="w-4 h-4 rounded overflow-hidden flex items-center justify-center shrink-0"
            dangerouslySetInnerHTML={{ __html: walletState.providerDetail.info.icon }}
          />
        )}
        <span className="font-mono text-slate-200">
          {truncateAddress(walletState.account)}
        </span>
        {walletState.isCorrectChain ? (
          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Studionet
          </span>
        ) : (
          <span className="text-[10px] font-mono text-amber-400">
            Chain {walletState.chainId || '?'}
          </span>
        )}
        <button
          type="button"
          onClick={disconnectWallet}
          aria-label="Disconnect wallet"
          className="p-1 text-slate-400 hover:text-red-400 hover:bg-workbench-hover rounded transition-colors ml-1"
          title="Disconnect wallet"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
