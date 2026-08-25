// ============================================================================
// Grant Review Recusal Graph — Transaction Progress & Receipt Modal
// ============================================================================

import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { TxIntent } from '@/types';
import {
  truncateAddress,
  truncateHash,
  getExplorerTxUrl,
} from '@/utils/formatters';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export interface TxIntentModalProps {
  intent: TxIntent | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TxIntentModal: React.FC<TxIntentModalProps> = ({
  intent,
  isOpen,
  onClose,
}) => {
  if (!intent) return null;

  const isSuccess = intent.status === 'FINALIZED_SUCCESS';
  const isFailed =
    intent.status === 'FINALIZED_FAILURE' ||
    intent.status === 'REJECTED' ||
    intent.status === 'TIMED_OUT' ||
    intent.status === 'READBACK_FAILED';
  const isPending = intent.status === 'PRE_SUBMIT' || intent.status === 'SUBMITTED';

  return (
    <Modal
      isOpen={isOpen}
      onClose={isPending ? () => {} : onClose}
      title="Studionet Transaction Execution"
      subtitle={`Method: ${intent.method} (Account: ${truncateAddress(intent.account)})`}
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {/* Status Stage Indicator */}
        <div
          className={`p-4 rounded-lg border flex items-start gap-3 ${
            isSuccess
              ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
              : isFailed
              ? 'bg-red-950/50 border-red-800 text-red-200'
              : 'bg-cobalt-950/50 border-cobalt-800 text-cobalt-200'
          }`}
        >
          {isPending ? (
            <Loader2 className="w-5 h-5 text-cobalt-400 animate-spin shrink-0 mt-0.5" />
          ) : isSuccess ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}

          <div className="space-y-1">
            <h4 className="font-semibold text-white text-xs">
              {intent.status === 'PRE_SUBMIT' && 'Awaiting Signature in Wallet Extension'}
              {intent.status === 'SUBMITTED' && 'Transaction Submitted — Awaiting Consensus'}
              {intent.status === 'FINALIZED_SUCCESS' && 'Consensus Verified & Readback Confirmed'}
              {intent.status === 'FINALIZED_FAILURE' && 'Transaction Failed or Reverted'}
              {intent.status === 'REJECTED' && 'Transaction Signature Rejected'}
              {intent.status === 'TIMED_OUT' && 'Confirmation Polling Timed Out'}
              {intent.status === 'READBACK_FAILED' && 'Authoritative Readback Mismatch'}
            </h4>
            <p className="text-[11px] opacity-90 leading-relaxed">
              {intent.status === 'PRE_SUBMIT' &&
                'Please review and sign the transaction in your connected wallet.'}
              {intent.status === 'SUBMITTED' &&
                'GenLayer validators are independently executing the Intelligent Contract on Studionet.'}
              {intent.status === 'FINALIZED_SUCCESS' &&
                'Validators reached consensus. The contract state was verified on-chain.'}
              {intent.errorMessage && (
                <span className="block text-red-300 font-mono mt-1">{intent.errorMessage}</span>
              )}
            </p>
          </div>
        </div>

        {/* Intent & Receipt Details */}
        <div className="p-3 bg-workbench-bg border border-workbench-border rounded-md space-y-2 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Method:</span>
            <span className="text-slate-200 font-semibold">{intent.method}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Client Nonce:</span>
            <span className="text-slate-400">{intent.clientNonce}</span>
          </div>

          {intent.txHash && (
            <div className="flex justify-between items-center pt-1 border-t border-workbench-border">
              <span className="text-slate-500">Transaction Hash:</span>
              <a
                href={getExplorerTxUrl(intent.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cobalt-400 hover:underline flex items-center gap-1 font-bold"
              >
                <span>{truncateHash(intent.txHash, 8, 6)}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {intent.consensusResult && (
            <div className="flex justify-between pt-1 border-t border-workbench-border">
              <span className="text-slate-500">Consensus Result:</span>
              <span className="text-emerald-400 font-semibold">{intent.consensusResult}</span>
            </div>
          )}

          {intent.leaderResult && (
            <div className="flex justify-between">
              <span className="text-slate-500">Leader Execution:</span>
              <span className="text-emerald-400 font-semibold">{intent.leaderResult}</span>
            </div>
          )}
        </div>

        {!isPending && (
          <div className="pt-2 flex justify-end">
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
