// ============================================================================
// Grant Review Recusal Graph — EIP-6963 Wallet Chooser Modal
// ============================================================================

import React, { useEffect, useRef } from 'react';
import { useWallet } from '@/context/WalletContext';
import { SUPPORTED_WALLETS } from '@/config/constants';
import { X, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

export const WalletChooserModal: React.FC = () => {
  const {
    isChooserOpen,
    closeChooser,
    discoveredProviders,
    connectWallet,
    walletState,
  } = useWallet();

  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isChooserOpen) {
        closeChooser();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChooserOpen, closeChooser]);

  if (!isChooserOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-chooser-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-workbench-surface border border-workbench-border rounded-lg shadow-modal overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-workbench-border bg-workbench-subtle">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cobalt-500" />
            <h2 id="wallet-chooser-title" className="text-base font-semibold tracking-tight text-white">
              Connect Browser Wallet
            </h2>
          </div>
          <button
            type="button"
            onClick={closeChooser}
            aria-label="Close wallet selector"
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-workbench-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Select a supported browser extension wallet to sign transactions on GenLayer Studionet (Chain 61999).
            Sessions are never persisted across page reloads.
          </p>

          {walletState.error && (
            <div className="p-3 rounded-md bg-red-950/50 border border-red-900/80 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{walletState.error}</span>
            </div>
          )}

          {/* Provider List */}
          <div className="space-y-2">
            {SUPPORTED_WALLETS.map((walletConfig) => {
              const announced = discoveredProviders.find(
                (p) => p.info.rdns === walletConfig.rdns
              );

              return (
                <div
                  key={walletConfig.rdns}
                  className="flex items-center justify-between p-3 rounded-md border border-workbench-border bg-workbench-bg hover:border-slate-600 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={announced?.info.icon || walletConfig.icon}
                      alt={`${announced?.info.name || walletConfig.name} logo`}
                      className="w-8 h-8 rounded bg-slate-800 p-1 shrink-0 object-contain"
                    />
                    <div>
                      <div className="text-sm font-medium text-white flex items-center gap-2">
                        {announced?.info.name || walletConfig.name}
                        {announced && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                            Detected
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {walletConfig.rdns}
                      </span>
                    </div>
                  </div>

                  {announced ? (
                    <button
                      type="button"
                      onClick={() => connectWallet(announced)}
                      className="px-3 py-1.5 text-xs font-medium bg-cobalt-600 hover:bg-cobalt-500 text-white rounded transition-colors active:scale-95"
                    >
                      Connect
                    </button>
                  ) : (
                    <a
                      href={
                        walletConfig.rdns === 'io.metamask'
                          ? 'https://metamask.io/download/'
                          : walletConfig.rdns === 'com.okex.wallet'
                          ? 'https://www.okx.com/web3'
                          : 'https://rabby.io/'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-cobalt-400 underline underline-offset-2"
                    >
                      Install <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-workbench-border text-[11px] text-slate-500 flex items-center justify-between">
            <span>Protocol: EIP-6963 Standard</span>
            <span>Target: Chain 61999 (0xf22f)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
