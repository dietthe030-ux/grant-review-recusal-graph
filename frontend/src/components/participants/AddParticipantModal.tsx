// ============================================================================
// Grant Review Recusal Graph — Add Participant Modal (Applicant & Reviewer)
// ============================================================================

import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { validateAddress, validateOrcid } from '@/utils/validators';
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

export interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  roundId: number;
  role: 'APPLICANT' | 'REVIEWER';
  onAddApplicant: (
    roundId: number,
    wallet: string,
    orcid: string,
    institution: string
  ) => Promise<void>;
  onAddReviewer: (
    roundId: number,
    wallet: string,
    orcid: string,
    institution: string,
    isBackup: boolean
  ) => Promise<void>;
  isTransacting: boolean;
}

export const AddParticipantModal: React.FC<AddParticipantModalProps> = ({
  isOpen,
  onClose,
  roundId,
  role,
  onAddApplicant,
  onAddReviewer,
  isTransacting,
}) => {
  const [wallet, setWallet] = useState('');
  const [orcid, setOrcid] = useState('');
  const [institution, setInstitution] = useState('');
  const [isBackup, setIsBackup] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Live validation feedback
  const addressValidation = wallet ? validateAddress(wallet) : null;
  const orcidValidation = orcid ? validateOrcid(orcid) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const addrRes = validateAddress(wallet);
    if (!addrRes.isValid) {
      setFormError(addrRes.error || 'Invalid address');
      return;
    }

    const orcidRes = validateOrcid(orcid);
    if (!orcidRes.isValid) {
      setFormError(orcidRes.error || 'Invalid ORCID checksum');
      return;
    }

    if (!institution.trim()) {
      setFormError('Declared institution is required');
      return;
    }

    try {
      if (role === 'APPLICANT') {
        await onAddApplicant(roundId, addrRes.value!, orcidRes.value!, institution.trim());
      } else {
        await onAddReviewer(
          roundId,
          addrRes.value!,
          orcidRes.value!,
          institution.trim(),
          isBackup
        );
      }
      onClose();
      setWallet('');
      setOrcid('');
      setInstitution('');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to add participant');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={role === 'APPLICANT' ? 'Add Grant Applicant' : 'Add Panel Reviewer'}
      subtitle={`Registers actor with canonical ORCID on Round #${roundId} (Draft state)`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {formError && (
          <div className="p-3 bg-red-950/50 border border-red-900 rounded-md text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Wallet Address */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-300 font-medium">Wallet Address (0x hex)</label>
            {addressValidation && (
              <span
                className={`font-mono text-[10px] flex items-center gap-1 ${
                  addressValidation.isValid ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {addressValidation.isValid ? (
                  <>
                    <CheckCircle className="w-3 h-3" /> Valid 0x Hex
                  </>
                ) : (
                  'Invalid Address'
                )}
              </span>
            )}
          </div>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x2000000000000000000000000000000000002000"
            className="w-full px-3 py-2 bg-workbench-bg border border-workbench-border rounded text-white font-mono text-xs focus:outline-hidden focus:border-cobalt-500"
          />
        </div>

        {/* Canonical ORCID with ISO 7064 Checksum */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-300 font-medium">
              Canonical ORCID (ISO 7064 Mod 11,2)
            </label>
            {orcidValidation && (
              <span
                className={`font-mono text-[10px] flex items-center gap-1 ${
                  orcidValidation.isValid ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {orcidValidation.isValid ? (
                  <>
                    <CheckCircle className="w-3 h-3" /> Checksum Valid
                  </>
                ) : (
                  'Invalid Checksum'
                )}
              </span>
            )}
          </div>
          <input
            type="text"
            value={orcid}
            onChange={(e) => setOrcid(e.target.value)}
            placeholder="0000-0002-1825-0097"
            className="w-full px-3 py-2 bg-workbench-bg border border-workbench-border rounded text-white font-mono text-xs focus:outline-hidden focus:border-cobalt-500"
          />
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Used by GenLayer consensus validators to query public ORCID, PubMed, and NIH records.
          </span>
        </div>

        {/* Declared Institution */}
        <div>
          <label className="block text-slate-300 font-medium mb-1">
            Declared Institution / Affiliation
          </label>
          <input
            type="text"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="e.g. Stanford University School of Medicine"
            className="w-full px-3 py-2 bg-workbench-bg border border-workbench-border rounded text-white text-xs focus:outline-hidden focus:border-cobalt-500"
          />
        </div>

        {/* Reviewer Backup Role Checkbox */}
        {role === 'REVIEWER' && (
          <div className="flex items-center gap-2 p-3 bg-workbench-bg border border-workbench-border rounded-md">
            <input
              type="checkbox"
              id="is-backup-checkbox"
              checked={isBackup}
              onChange={(e) => setIsBackup(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-cobalt-600 focus:ring-cobalt-500"
            />
            <label htmlFor="is-backup-checkbox" className="text-slate-300 text-xs cursor-pointer select-none">
              <span className="font-semibold text-white">Reserve Backup Reviewer</span>
              <span className="block text-[11px] text-slate-400">
                Will be promoted in deterministic order if primary reviewer is recused.
              </span>
            </label>
          </div>
        )}

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isTransacting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isTransacting}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Add {role === 'APPLICANT' ? 'Applicant' : 'Reviewer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
