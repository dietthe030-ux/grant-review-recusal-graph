// ============================================================================
// Grant Review Recusal Graph — Participant & Cohort Management Panel
// ============================================================================

import React, { useState } from 'react';
import {
  Round,
  Participant,
  Assignment,
} from '@/types';
import {
  truncateAddress,
  getOrcidUrl,
  getAssignmentStatusMetadata,
} from '@/utils/formatters';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/common/Button';
import { AddParticipantModal } from './AddParticipantModal';
import { SetAssignmentModal } from './SetAssignmentModal';
import {
  UserPlus,
  Lock,
  CheckCircle,
  ExternalLink,
  Building,
  ShieldCheck,
  User,
  Link2,
} from 'lucide-react';

export interface ParticipantPanelProps {
  round: Round;
  applicants: Participant[];
  reviewers: Participant[];
  assignments: Assignment[];
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
  onSetAssignment: (
    roundId: number,
    applicantIndex: number,
    primaryIndex: number,
    backupCsv: string
  ) => Promise<void>;
  onFreezeRound: (roundId: number) => Promise<void>;
  onAcknowledgeIdentity: (roundId: number) => Promise<void>;
  onDeclineAssignment: (roundId: number) => Promise<void>;
  isTransacting: boolean;
}

export const ParticipantPanel: React.FC<ParticipantPanelProps> = ({
  round,
  applicants,
  reviewers,
  assignments,
  onAddApplicant,
  onAddReviewer,
  onSetAssignment,
  onFreezeRound,
  onAcknowledgeIdentity,
  onDeclineAssignment,
  isTransacting,
}) => {
  const { walletState } = useWallet();
  const [modalRole, setModalRole] = useState<'APPLICANT' | 'REVIEWER' | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  const isDraft = round.lifecycle === 'DRAFT';

  // Find if current connected user is a participant needing acknowledgement
  const matchingParticipant = walletState.account
    ? [...applicants, ...reviewers].find(
        (p) => p.wallet.toLowerCase() === walletState.account?.toLowerCase()
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Participant Identity Acknowledge Banner */}
      {matchingParticipant && !matchingParticipant.acknowledged && (
        <div className="p-4 bg-cobalt-950/60 border border-cobalt-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-cobalt-400" />
              <span>Identity Acknowledgement Required</span>
            </div>
            <p className="text-slate-300">
              Your connected wallet ({truncateAddress(matchingParticipant.wallet)}) is enrolled as a{' '}
              <strong className="text-white">{matchingParticipant.role}</strong> with ORCID{' '}
              <strong className="text-white font-mono">{matchingParticipant.orcid}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              isLoading={isTransacting}
              onClick={() => onAcknowledgeIdentity(round.id)}
            >
              Acknowledge Identity
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="text-red-300 hover:bg-red-950/80"
              isLoading={isTransacting}
              onClick={() => onDeclineAssignment(round.id)}
            >
              Decline
            </Button>
          </div>
        </div>
      )}

      {/* Admin Setup & Freeze Action Bar */}
      {isDraft && (
        <div className="p-4 bg-workbench-surface border border-workbench-border rounded-lg flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold text-white">Cohort Draft Configuration</h3>
            <p className="text-[11px] text-slate-400">
              Add up to 4 applicants, 5 primary reviewers, 3 backups, configure assignments, and freeze.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              onClick={() => setModalRole('APPLICANT')}
              disabled={applicants.length >= 4}
            >
              Add Applicant ({applicants.length}/4)
            </Button>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              onClick={() => setModalRole('REVIEWER')}
              disabled={reviewers.length >= 8}
            >
              Add Reviewer ({reviewers.length}/8)
            </Button>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Link2 className="w-3.5 h-3.5" />}
              onClick={() => setIsAssignmentModalOpen(true)}
              disabled={applicants.length === 0 || reviewers.length === 0}
            >
              Configure Assignment
            </Button>

            <Button
              variant="primary"
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-500 border-cyan-500/50"
              leftIcon={<Lock className="w-3.5 h-3.5" />}
              isLoading={isTransacting}
              onClick={() => onFreezeRound(round.id)}
              disabled={applicants.length === 0 || reviewers.length === 0}
            >
              Freeze Round
            </Button>
          </div>
        </div>
      )}

      {/* Immutable Frozen Notice */}
      {!isDraft && (
        <div className="p-3 bg-cyan-950/30 border border-cyan-900/60 rounded-lg flex items-center gap-2 text-xs text-cyan-300">
          <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            Cohort and policy parameters are <strong>FROZEN</strong>. Identities and assignments are immutable.
          </span>
        </div>
      )}

      {/* Applicants & Reviewers Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applicants Card */}
        <div className="bg-workbench-surface border border-workbench-border rounded-lg shadow-subtle overflow-hidden">
          <div className="px-4 py-3 border-b border-workbench-border bg-workbench-subtle/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-semibold text-white">Applicants Cohort</h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {applicants.length} / 4 registered
            </span>
          </div>

          <div className="p-4 space-y-3">
            {applicants.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-workbench-border rounded">
                No applicants registered in this round yet.
              </div>
            ) : (
              applicants.map((app) => (
                <div
                  key={app.index}
                  className="p-3 rounded-md bg-workbench-bg border border-workbench-border space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Applicant #{app.index}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        app.acknowledged
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      {app.acknowledged ? 'ACKNOWLEDGED' : 'PENDING ACK'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500">Wallet: </span>
                      <span className="text-slate-300">{truncateAddress(app.wallet)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">ORCID: </span>
                      <a
                        href={getOrcidUrl(app.orcid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cobalt-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>{app.orcid}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Building className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{app.declared_institution}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reviewers Card */}
        <div className="bg-workbench-surface border border-workbench-border rounded-lg shadow-subtle overflow-hidden">
          <div className="px-4 py-3 border-b border-workbench-border bg-workbench-subtle/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cobalt-400" />
              <h4 className="text-xs font-semibold text-white">Reviewer Panel</h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {reviewers.length} / 8 registered
            </span>
          </div>

          <div className="p-4 space-y-3">
            {reviewers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-workbench-border rounded">
                No reviewers registered in this round yet.
              </div>
            ) : (
              reviewers.map((rev) => (
                <div
                  key={rev.index}
                  className="p-3 rounded-md bg-workbench-bg border border-workbench-border space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Reviewer #{rev.index}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                          rev.is_backup
                            ? 'bg-purple-950 text-purple-300 border-purple-800'
                            : 'bg-blue-950 text-blue-300 border-blue-800'
                        }`}
                      >
                        {rev.is_backup ? 'BACKUP' : 'PRIMARY'}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        rev.acknowledged
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      {rev.acknowledged ? 'ACKNOWLEDGED' : 'PENDING ACK'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500">Wallet: </span>
                      <span className="text-slate-300">{truncateAddress(rev.wallet)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">ORCID: </span>
                      <a
                        href={getOrcidUrl(rev.orcid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cobalt-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>{rev.orcid}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Building className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{rev.declared_institution}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Planned Assignments Table */}
      <div className="bg-workbench-surface border border-workbench-border rounded-lg shadow-subtle overflow-hidden">
        <div className="px-4 py-3 border-b border-workbench-border bg-workbench-subtle/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-cobalt-400" />
            <h4 className="text-xs font-semibold text-white">Configured Assignments & Backups</h4>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {assignments.length} assignments bound
          </span>
        </div>

        <div className="p-4">
          {assignments.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-workbench-border rounded">
              No assignments configured yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="border-b border-workbench-border text-[11px] font-semibold text-slate-400 uppercase bg-workbench-subtle/30">
                  <tr>
                    <th className="px-3 py-2">Applicant</th>
                    <th className="px-3 py-2">Primary Reviewer</th>
                    <th className="px-3 py-2">Ordered Backup Indexes</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Active Reviewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-workbench-border font-mono text-[11px]">
                  {assignments.map((asgn) => {
                    const statusMeta = getAssignmentStatusMetadata(asgn.status);
                    return (
                      <tr key={asgn.applicant_index} className="hover:bg-workbench-hover/40">
                        <td className="px-3 py-2.5 text-white">
                          Applicant #{asgn.applicant_index}
                        </td>
                        <td className="px-3 py-2.5 text-slate-200">
                          Reviewer #{asgn.primary_index}
                        </td>
                        <td className="px-3 py-2.5 text-slate-400">
                          {asgn.backup_indexes_csv || 'None'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] border ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-300">
                          {asgn.activated_reviewer >= 0
                            ? `Reviewer #${asgn.activated_reviewer}`
                            : 'Not Activated'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalRole && (
        <AddParticipantModal
          isOpen={Boolean(modalRole)}
          onClose={() => setModalRole(null)}
          roundId={round.id}
          role={modalRole}
          onAddApplicant={onAddApplicant}
          onAddReviewer={onAddReviewer}
          isTransacting={isTransacting}
        />
      )}

      {isAssignmentModalOpen && (
        <SetAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          roundId={round.id}
          applicants={applicants}
          reviewers={reviewers}
          onSetAssignment={onSetAssignment}
          isTransacting={isTransacting}
        />
      )}
    </div>
  );
};
