// ============================================================================
// Grant Review Recusal Graph — Workbench Footer & Trust Disclosures
// ============================================================================

import React from 'react';
import {
  DEPLOYED_CONTRACT_ADDRESS,
  STUDIONET_CHAIN_ID,
  STUDIONET_RPC_URL,
} from '@/config/constants';
import { truncateAddress, getExplorerAddressUrl } from '@/utils/formatters';
import { ShieldCheck, ExternalLink } from 'lucide-react';

export const WorkbenchFooter: React.FC = () => {
  return (
    <footer className="w-full bg-workbench-surface border-t border-workbench-border mt-12 py-8 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trust Boundaries */}
          <div className="space-y-2">
            <h5 className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cobalt-400" />
              <span>Trust & Scope Boundaries</span>
            </h5>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Grant Review Recusal Graph evaluates public co-authorship, ORCID employment affiliations, and NIH grant
              co-investigations on-chain. It does not evaluate private financial disclosures, familial ties, or final
              funding outcomes.
            </p>
          </div>

          {/* Network & Contract */}
          <div className="space-y-2 font-mono text-[11px]">
            <h5 className="font-semibold text-white font-sans text-xs">Contract Deployment</h5>
            <div>
              <span className="text-slate-500">Address: </span>
              <a
                href={getExplorerAddressUrl(DEPLOYED_CONTRACT_ADDRESS)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cobalt-400 hover:underline"
              >
                {truncateAddress(DEPLOYED_CONTRACT_ADDRESS, 8, 6)}
                <ExternalLink className="w-2.5 h-2.5 inline ml-1" />
              </a>
            </div>
            <div>
              <span className="text-slate-500">Chain: </span>
              <span className="text-slate-200">GenLayer Studionet ({STUDIONET_CHAIN_ID})</span>
            </div>
            <div>
              <span className="text-slate-500">RPC: </span>
              <span className="text-slate-400 truncate">{STUDIONET_RPC_URL}</span>
            </div>
          </div>

          {/* External Evidence Authorities */}
          <div className="space-y-2 text-[11px]">
            <h5 className="font-semibold text-white text-xs">Public Evidence Authorities</h5>
            <ul className="space-y-1 font-mono text-[11px]">
              <li>
                <a
                  href="https://orcid.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cobalt-400 flex items-center gap-1"
                >
                  <span>ORCID Public API v3.0</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </li>
              <li>
                <a
                  href="https://pubmed.ncbi.nlm.nih.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cobalt-400 flex items-center gap-1"
                >
                  <span>NCBI PubMed E-Utilities</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </li>
              <li>
                <a
                  href="https://reporter.nih.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cobalt-400 flex items-center gap-1"
                >
                  <span>NIH RePORTER API v2</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-workbench-border flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>Grant Review Recusal Graph (GRRG-V1) — GenLayer Studionet Workbench</span>
          <span>EIP-6963 Wallet Standard — Every reload starts disconnected</span>
        </div>
      </div>
    </footer>
  );
};
