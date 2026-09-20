// ============================================================================
// Grant Review Recusal Graph — Static Release Evidence & Deployment Manifest
// ============================================================================

import React from 'react';
import {
  DEPLOYED_CONTRACT_ADDRESS,
  DEPLOYMENT_TX_HASH,
  EXACT_SOURCE_SHA256,
} from '@/config/constants';
import {
  truncateHash,
  getExplorerTxUrl,
  getExplorerAddressUrl,
} from '@/utils/formatters';
import { FileCheck, ExternalLink, ShieldCheck, Info } from 'lucide-react';

export const VerificationPanel: React.FC = () => {
  const releaseEvidenceMatrix = [
    {
      risk: 'Exact deployment parity',
      tx: '0x22ac54cd04c89ca6a4882361271f658b1bd186d4117b6beca6904f6bad3a56a9',
      result: 'Deployed bytes SHA matches; upgrader matches',
      badge: 'VERIFIED',
    },
    {
      risk: 'Configured pair screening',
      tx: '0x15f1825a5d50dd3837579ff06468053bbe156fdc626bb83013af54d642029a2b',
      result: 'UNRESOLVED / EVIDENCE_HOLD / SOURCE_UNAVAILABLE_OR_INCOMPLETE',
      badge: 'HOLD',
    },
    {
      risk: 'Unauthorized retry rejection',
      tx: '0xe0f5afcb1730fb4bccd14495de1945c6f3ac13f3d034b8b44a35ace68c15f58a',
      result: 'Non-admin retry rejected; assessment fingerprint unchanged',
      badge: 'REJECTED',
    },
    {
      risk: 'Freeze round',
      tx: '0xf76bf6fb788fe99feaec4449e0de88c8d0c50c52d5e9ea132ce3d7d0c0510f4e',
      result: 'FROZEN; cohort and policy locked',
      badge: 'FROZEN',
    },
    {
      risk: 'Authorized retry attempt 2',
      tx: '0x8656da5403147d3016feece4287bf763599d25646b88b53a7259cdc4f941ab28',
      result: 'Attempt 2 persisted as UNRESOLVED / EVIDENCE_HOLD',
      badge: 'RETRY',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Notice Callout */}
      <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-lg text-blue-200 text-xs flex items-center gap-2.5">
        <Info className="w-4 h-4 text-blue-400 shrink-0" />
        <span>
          <strong>Static Release Evidence:</strong> The first rows record the corrected deployment and reviewer remediation. Historical rows from the superseded deployment are retained and labeled in the release record. Live round data is loaded on-demand via the workbench tabs.
        </span>
      </div>

      {/* Contract Details Header */}
      <div className="p-5 bg-workbench-surface border border-workbench-border rounded-lg shadow-subtle space-y-3 text-xs">
        <div className="flex items-center justify-between border-b border-workbench-border pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cobalt-400" />
            <h3 className="text-sm font-semibold text-white">
              Studio Next Deployment Release Evidence
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[10px]">
            STATIC RELEASE EVIDENCE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
          <div className="space-y-1">
            <span className="text-slate-500">Contract Address:</span>
            <div className="flex items-center gap-1 text-slate-200">
              <span>{DEPLOYED_CONTRACT_ADDRESS}</span>
              <a
                href={getExplorerAddressUrl(DEPLOYED_CONTRACT_ADDRESS)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cobalt-400 hover:underline"
              >
                <ExternalLink className="w-3 h-3 inline ml-1" />
              </a>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500">Deployment Transaction:</span>
            <div className="flex items-center gap-1 text-slate-200">
              <span>{DEPLOYMENT_TX_HASH}</span>
              <a
                href={getExplorerTxUrl(DEPLOYMENT_TX_HASH)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cobalt-400 hover:underline"
              >
                <ExternalLink className="w-3 h-3 inline ml-1" />
              </a>
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <span className="text-slate-500">Exact Source SHA-256:</span>
            <div className="text-slate-300 font-mono bg-workbench-bg p-2 rounded border border-workbench-border">
              {EXACT_SOURCE_SHA256}
            </div>
          </div>
        </div>
      </div>

      {/* Release Proof Matrix Table */}
      <div className="bg-workbench-surface border border-workbench-border rounded-lg shadow-subtle overflow-hidden">
        <div className="px-4 py-3 border-b border-workbench-border bg-workbench-subtle/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-cobalt-400" />
            <h4 className="text-xs font-semibold text-white">
              Verified Consensus Proof Log (Release Evidence)
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Source: deployments/studionet.json
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-workbench-subtle border-b border-workbench-border text-[11px] font-semibold text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-3">Risk / Criterion</th>
                <th className="px-4 py-3">Transaction Hash</th>
                <th className="px-4 py-3">Authoritative Result</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-workbench-border font-mono text-[11px]">
              {releaseEvidenceMatrix.map((item, idx) => (
                <tr key={idx} className="hover:bg-workbench-hover/40 transition-colors">
                  <td className="px-4 py-3 font-sans font-medium text-white">
                    {item.risk}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={getExplorerTxUrl(item.tx)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cobalt-400 hover:underline flex items-center gap-1"
                    >
                      <span>{truncateHash(item.tx, 8, 6)}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </td>
                  <td className="px-4 py-3 font-sans text-slate-300">
                    {item.result}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {item.badge}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
