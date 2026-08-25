// ============================================================================
// Grant Review Recusal Graph — Create Round Modal
// ============================================================================

import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import {
  validateQuorum,
  validateDeadlines,
  validateClientNonce,
} from '@/utils/validators';
import { PlusCircle, AlertCircle } from 'lucide-react';

export interface CreateRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRound: (
    title: string,
    quorum: number,
    freezeDeadline: number,
    ackDeadline: number,
    clientNonce: string
  ) => Promise<void>;
  isTransacting: boolean;
}

export const CreateRoundModal: React.FC<CreateRoundModalProps> = ({
  isOpen,
  onClose,
  onCreateRound,
  isTransacting,
}) => {
  const [title, setTitle] = useState('');
  const [quorum, setQuorum] = useState<number>(2);
  const [freezeDays, setFreezeDays] = useState<number>(7);
  const [ackDays, setAckDays] = useState<number>(14);
  const [clientNonce, setClientNonce] = useState(`round_${Date.now()}`);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate Quorum
    const quorumRes = validateQuorum(quorum);
    if (!quorumRes.isValid) {
      setFormError(quorumRes.error || 'Invalid quorum');
      return;
    }

    // Calculate timestamps
    const now = Math.floor(Date.now() / 1000);
    const freezeDeadline = now + freezeDays * 86400;
    const ackDeadline = now + ackDays * 86400;

    const deadlineRes = validateDeadlines(freezeDeadline, ackDeadline, now);
    if (!deadlineRes.isValid) {
      setFormError(deadlineRes.error || 'Invalid deadlines');
      return;
    }

    // Validate Nonce
    const nonceRes = validateClientNonce(clientNonce);
    if (!nonceRes.isValid) {
      setFormError(nonceRes.error || 'Invalid client nonce');
      return;
    }

    try {
      await onCreateRound(
        title.trim() || `Research Integrity Round #${Date.now()}`,
        quorum,
        freezeDeadline,
        ackDeadline,
        clientNonce.trim()
      );
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create round');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Grant Review Round"
      subtitle="Initializes an immutable grant review cohort on GenLayer Studionet (GRRG-V1)"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {formError && (
          <div className="p-3 bg-red-950/50 border border-red-900 rounded-md text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div>
          <label className="block text-slate-300 font-medium mb-1">
            Round Title / Call Identifier
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 2026 Biotechnology Frontier Grant Review"
            className="w-full px-3 py-2 bg-workbench-bg border border-workbench-border rounded text-white placeholder-slate-500 focus:outline-hidden focus:border-cobalt-500 text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Quorum Threshold (2 to 4)
            </label>
            <input
              type="number"
              min={2}
              max={4}
              value={quorum}
              onChange={(e) => setQuorum(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-workbench-bg border border-workbench-border rounded text-white font-mono focus:outline-hidden focus:border-cobalt-500 text-xs"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Required non-recused reviewers per applicant
            </span>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Policy Version
            </label>
            <input
              type="text"
              disabled
              value="GRRG-V1 (Fixed)"
              className="w-full px-3 py-2 bg-slate-900 border border-workbench-border rounded text-slate-400 font-mono text-xs cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Freeze Period (Days)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={freezeDays}
              onChange={(e) => setFreezeDays(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-workbench-bg border border-workbench-border rounded text-white font-mono focus:outline-hidden focus:border-cobalt-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Ack Period (Days)
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={ackDays}
              onChange={(e) => setAckDays(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-workbench-bg border border-workbench-border rounded text-white font-mono focus:outline-hidden focus:border-cobalt-500 text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1">
            Client Idempotency Nonce
          </label>
          <input
            type="text"
            value={clientNonce}
            onChange={(e) => setClientNonce(e.target.value)}
            className="w-full px-3 py-2 bg-workbench-bg border border-workbench-border rounded text-white font-mono text-xs focus:outline-hidden focus:border-cobalt-500"
          />
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Guarantees idempotent round creation by (admin, nonce)
          </span>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isTransacting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isTransacting}
            leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
          >
            Create Round on Studionet
          </Button>
        </div>
      </form>
    </Modal>
  );
};
