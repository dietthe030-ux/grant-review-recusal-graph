// ============================================================================
// Grant Review Recusal Graph — Main Workbench Application
// ============================================================================

import React, { useState } from 'react';
import { ActiveTab } from '@/types';
import { useContract } from '@/hooks/useContract';
import { WorkbenchHeader } from '@/components/layout/WorkbenchHeader';
import { StatusBanner } from '@/components/layout/StatusBanner';
import { NavTabs } from '@/components/layout/NavTabs';
import { WorkbenchFooter } from '@/components/layout/WorkbenchFooter';
import { BipartiteRecusalGraph } from '@/components/graph/BipartiteRecusalGraph';
import { MatrixProjection } from '@/components/matrix/MatrixProjection';
import { ParticipantPanel } from '@/components/participants/ParticipantPanel';
import { ScreeningPanel } from '@/components/screening/ScreeningPanel';
import { PromotionPanel } from '@/components/promotion/PromotionPanel';
import { AuditLogPanel } from '@/components/audit/AuditLogPanel';
import { VerificationPanel } from '@/components/audit/VerificationPanel';
import { WalletChooserModal } from '@/components/wallet/WalletChooserModal';
import { CreateRoundModal } from '@/components/round/CreateRoundModal';
import { TxIntentModal } from '@/components/audit/TxIntentModal';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('graph');
  const [isCreateRoundOpen, setIsCreateRoundOpen] = useState(false);

  const {
    currentRoundId,
    setCurrentRoundId,
    fullState,
    isLoading,
    error,
    refreshState,
    isTransacting,
    activeIntent,
    setActiveIntent,
    executeWrite,
  } = useContract();

  // Transaction Write Handlers (12 Contract Write Methods)
  const handleCreateRound = async (
    title: string,
    quorum: number,
    freezeDeadline: number,
    ackDeadline: number,
    clientNonce: string
  ) => {
    await executeWrite(
      'create_round',
      [clientNonce, title, quorum, freezeDeadline, ackDeadline],
      clientNonce
    );
  };

  const handleAddApplicant = async (
    roundId: number,
    wallet: string,
    orcid: string,
    institution: string
  ) => {
    await executeWrite('add_applicant', [roundId, wallet, orcid, institution]);
  };

  const handleAddReviewer = async (
    roundId: number,
    wallet: string,
    orcid: string,
    institution: string,
    isBackup: boolean
  ) => {
    await executeWrite('add_reviewer', [roundId, wallet, orcid, institution, isBackup]);
  };

  const handleSetAssignment = async (
    roundId: number,
    applicantIndex: number,
    primaryIndex: number,
    backupCsv: string
  ) => {
    await executeWrite('set_assignment', [
      roundId,
      applicantIndex,
      primaryIndex,
      backupCsv,
    ]);
  };

  const handleFreezeRound = async (roundId: number) => {
    await executeWrite('freeze_round', [roundId]);
  };

  const handleScreenPair = async (applicantIndex: number, reviewerIndex: number) => {
    await executeWrite('screen_pair', [currentRoundId, applicantIndex, reviewerIndex]);
  };

  const handleFinalizeScreening = async (roundId: number) => {
    await executeWrite('finalize_screening', [roundId]);
  };

  const handleActivatePanel = async (roundId: number) => {
    await executeWrite('activate_panel', [roundId]);
  };

  const handleAcknowledgeIdentity = async (roundId: number) => {
    await executeWrite('acknowledge_identity', [roundId]);
  };

  const handleDeclineAssignment = async (roundId: number) => {
    await executeWrite('decline_assignment', [roundId]);
  };

  const handleCloseRound = async (roundId: number) => {
    await executeWrite('close_round', [roundId]);
  };

  const handleCancelRound = async (roundId: number) => {
    await executeWrite('cancel_round', [roundId]);
  };

  return (
    <div className="min-h-screen bg-workbench-bg text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <WorkbenchHeader
        currentRoundId={currentRoundId}
        onSelectRoundId={setCurrentRoundId}
        onOpenCreateRound={() => setIsCreateRoundOpen(true)}
      />

      {/* Round Lifecycle & Quorum Status Banner */}
      {fullState && (
        <StatusBanner
          round={fullState.round}
          effectivePanel={fullState.effectivePanel}
          onCloseRound={handleCloseRound}
          onCancelRound={handleCancelRound}
          isTransacting={isTransacting}
        />
      )}

      {/* Navigation Tabs */}
      <NavTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        screenedCount={fullState?.assessments.size ?? 0}
        totalParticipants={
          (fullState?.applicants.length ?? 0) + (fullState?.reviewers.length ?? 0)
        }
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Callout with Actionable Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-800/80 rounded-lg text-red-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                <strong>RPC Error:</strong> {error}
              </span>
            </div>
            <button
              type="button"
              onClick={refreshState}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-red-900 hover:bg-red-800 text-white font-mono text-[11px] shrink-0 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Retry RPC
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && !fullState && (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-cobalt-500 animate-spin" />
            <span className="text-xs font-mono">
              Loading Round #{currentRoundId} from GenLayer Studionet...
            </span>
          </div>
        )}

        {/* Empty State when no round state is loaded */}
        {!isLoading && !fullState && !error && (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3 border border-dashed border-workbench-border rounded-lg bg-workbench-surface">
            <span className="text-sm font-medium text-slate-300">
              No state loaded for Round #{currentRoundId}
            </span>
            <button
              type="button"
              onClick={refreshState}
              className="px-3 py-1.5 rounded bg-cobalt-600 hover:bg-cobalt-500 text-white font-mono text-xs transition-colors"
            >
              Load Round #{currentRoundId}
            </button>
          </div>
        )}

        {/* Tab Views */}
        {fullState && (
          <>
            {activeTab === 'graph' && (
              <BipartiteRecusalGraph
                round={fullState.round}
                applicants={fullState.applicants}
                reviewers={fullState.reviewers}
                assignments={fullState.assignments}
                assessments={fullState.assessments}
                onScreenPair={handleScreenPair}
                isTransacting={isTransacting}
              />
            )}

            {activeTab === 'matrix' && (
              <MatrixProjection
                round={fullState.round}
                applicants={fullState.applicants}
                reviewers={fullState.reviewers}
                assignments={fullState.assignments}
                assessments={fullState.assessments}
                onScreenPair={handleScreenPair}
                isTransacting={isTransacting}
              />
            )}

            {activeTab === 'participants' && (
              <ParticipantPanel
                round={fullState.round}
                applicants={fullState.applicants}
                reviewers={fullState.reviewers}
                assignments={fullState.assignments}
                onAddApplicant={handleAddApplicant}
                onAddReviewer={handleAddReviewer}
                onSetAssignment={handleSetAssignment}
                onFreezeRound={handleFreezeRound}
                onAcknowledgeIdentity={handleAcknowledgeIdentity}
                onDeclineAssignment={handleDeclineAssignment}
                isTransacting={isTransacting}
              />
            )}

            {activeTab === 'screening' && (
              <ScreeningPanel
                round={fullState.round}
                applicants={fullState.applicants}
                reviewers={fullState.reviewers}
                assessments={fullState.assessments}
                onScreenPair={handleScreenPair}
                onFinalizeScreening={handleFinalizeScreening}
                isTransacting={isTransacting}
              />
            )}

            {activeTab === 'promotion' && (
              <PromotionPanel
                round={fullState.round}
                effectivePanel={fullState.effectivePanel}
                applicants={fullState.applicants}
                reviewers={fullState.reviewers}
                assignments={fullState.assignments}
                onActivatePanel={handleActivatePanel}
                isTransacting={isTransacting}
              />
            )}

            {activeTab === 'audit' && (
              <AuditLogPanel
                roundId={fullState.round.id}
                recentEvents={fullState.recentEvents}
              />
            )}

            {activeTab === 'verification' && <VerificationPanel />}
          </>
        )}
      </main>

      {/* Footer & Trust Disclosures */}
      <WorkbenchFooter />

      {/* Modals */}
      <WalletChooserModal />

      {isCreateRoundOpen && (
        <CreateRoundModal
          isOpen={isCreateRoundOpen}
          onClose={() => setIsCreateRoundOpen(false)}
          onCreateRound={handleCreateRound}
          isTransacting={isTransacting}
        />
      )}

      {activeIntent && (
        <TxIntentModal
          intent={activeIntent}
          isOpen={Boolean(activeIntent)}
          onClose={() => setActiveIntent(null)}
        />
      )}
    </div>
  );
};
