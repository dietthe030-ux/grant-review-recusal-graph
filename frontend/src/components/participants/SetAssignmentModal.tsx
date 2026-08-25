// ============================================================================
// Grant Review Recusal Graph — Set Assignment Modal
// ============================================================================

import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Participant } from '@/types';
import { validateBackupCsv } from '@/utils/validators';
import { Link2, AlertCircle } from 'lucide-react';

export interface SetAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  roundId: number;
  applicants: Participant[];
  reviewers: Participant[];
  onSetAssignment: (
    roundId: number,
    applicantIndex: number,
    primaryIndex: number,
    backupCsv: string
  ) => Promise<void>;
  isTransacting: boolean;
}

export const SetAssignmentModal: React.FC<SetAssignmentModalProps> = ({
  isOpen,
  onClose,
  roundId,
  applicants,
  reviewers,
  onSetAssignment,
  isTransacting,
}) => {
  const [applicantIndex, setApplicantIndex] = useState<number>(0);
  const [primaryIndex, setPrimaryIndex] = useState<number>(0);
  const [backupCsv, setBackupCsv] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const maxRevIndex = reviewers.length - 1;
    const backupRes = validateBackupCsv(backupCsv, primaryIndex, maxRevIndex);

    if (!backupRes.isValid) {
      setFormError(backupRes.error || 'Invalid backup CSV format');
      return;
    }

    try {
      await onSetAssignment(roundId, applicantIndex, primaryIndex, backupCsv.trim());
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to set assignment');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Reviewer Assignment & Backups"
      subtitle={`Binds an applicant to a planned primary reviewer and fallback backups (Round #${roundId})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {formError && (
          <div className="p-3 bg-red-950/50 border border-red-900 rounded-md text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Applicant Selection */}
        <div>
          <label className="block text-slate-300 font-medium mb-1">Select Applicant</label>
          <select
            value={applicantIndex}
            onChange={(e) => setApplicantIndex(parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 bg-workbench-bg border border-workbench-border rounded text-white font-mono text-xs focus:outline-hidden focus:border-cobalt-500"
          >
            {applicants.map((a) => (
              <option key={a.index} value={a.index} className="bg-workbench-surface">
                Applicant #{a.index} ({a.orcid} — {a.declared_institution})
              </option>
            ))}
          </select>
        </div>

        {/* Primary Reviewer Selection */}
        <div>
          <label className="block text-slate-300 font-medium mb-1">
            Planned Primary Reviewer
          </label>
          <select
            value={primaryIndex}
            onChange={(e) => setPrimaryIndex(parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 bg-workbench-bg border border-workbench-border rounded text-white font-mono text-xs focus:outline-hidden focus:border-cobalt-500"
          >
            {reviewers
              .filter((r) => !r.is_backup)
              .map((r) => (
                <option key={r.index} value={r.index} className="bg-workbench-surface">
                  Reviewer #{r.index} ({r.orcid} — {r.declared_institution})
                </option>
              ))}
          </select>
        </div>

        {/* Ordered Backup Reviewers CSV */}
        <div>
          <label className="block text-slate-300 font-medium mb-1">
            Ordered Backup Reviewer Indexes (CSV)
          </label>
          <input
            type="text"
            value={backupCsv}
            onChange={(e) => setBackupCsv(e.target.value)}
            placeholder="e.g. 2, 3"
            className="w-full px-3 py-2 bg-workbench-bg border border-workbench-border rounded text-white font-mono text-xs focus:outline-hidden focus:border-cobalt-500"
          />
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Comma-separated reviewer indexes to be promoted in sequence if primary is recused. Max 3.
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
            leftIcon={<Link2 className="w-3.5 h-3.5" />}
          >
            Save Assignment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
