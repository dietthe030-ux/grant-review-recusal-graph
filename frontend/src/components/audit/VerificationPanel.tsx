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
      tx: '0xc95cab13549c3a3265a96d2a318841d1946eb06c302c54ad1e3d6349c6ad9381',
      result: 'Deployed bytes SHA matches; upgrader matches',
      badge: 'VERIFIED',
    },
    {
      risk: 'Configured pair screening',
      tx: '0xa1f02a3be7f2e0d1c2a4e0f6c4f83e5b0ed5cef97a2e8533ba7a422c523dfb19',
      result: 'UNRESOLVED / EVIDENCE_HOLD / OVERSIZED_RESPONSE',
      badge: 'HOLD',
    },
    {
      risk: 'Unconfigured pair rejection',
      tx: '0x055e71222bbad8d70db147b8abe15a1e0f36df23b6075974fc1cf8b91ac39bf9',
      result: 'Configured-pair guard rejected reviewer index 1',
      badge: 'REJECTED',
    },
    {
      risk: 'Freeze round',
      tx: '0x45cd58beca10517f8bf9d7a53102d70225106a32b1cf44026dba459c82c6919a',
      result: 'FROZEN; cohort and policy locked',
      badge: 'FROZEN',
    },
    {
      risk: 'Applicant 0 acknowledgement',
      tx: '0xe49587b4f6453105f036048ce2cb16dfe73a7486b5a8f401b998d380980c1930',
      result: 'Identity acknowledged on-chain',
      badge: 'ACKNOWLEDGED',
    },
    {
      risk: 'Applicant 1 acknowledgement',
      tx: '0x64e583e55ba43d2e3953d856a32a98bd0c795d2ebcbdd2dec5db32185652abb6',
      result: 'Identity acknowledged on-chain',
      badge: 'ACKNOWLEDGED',
    },
    {
      risk: 'Reviewer acknowledgement',
      tx: '0x3a8b5038ee233a8aae9ec7305ca6a1e6d2c9db28b7d4aead02488c62842c5751',
      result: 'Assignment acknowledged on-chain',
      badge: 'ACKNOWLEDGED',
    },
    {
      risk: 'Exact oversized classification',
      tx: '0x579886f7ea801c24b910b2ee54e87fd5c0aebcbb44ccccb8b305798d2c338727',
      result: 'UNRESOLVED / EVIDENCE_HOLD / OVERSIZED_RESPONSE',
      badge: 'HOLD',
    },
    {
      risk: 'Deterministic backup promotion',
      tx: '0xea5563ade59107e015da2f83291604871d181ecbce1c6443b9f76f8a0c509564',
      result: 'App 0 BACKUP_ACTIVE Reviewer 1; App 1 PRIMARY_ACTIVE Reviewer 0',
      badge: 'PROMOTED',
    },
    {
      risk: 'Happy lifecycle finalize',
      tx: '0x7bbe5efdaaf0d7e9939605eea779606d48345dddce99853dc3e3b4552d183970',
      result: 'READY; quorum met',
      badge: 'READY',
    },
    {
      risk: 'Happy lifecycle activate',
      tx: '0xb89a836a909bd7b83e5ab59c49fcd7db0357b507cc55ba85a3268b33ffe3da1c',
      result: 'ACTIVE; two primary assignments authorized',
      badge: 'ACTIVE',
    },
    {
      risk: 'Happy lifecycle close',
      tx: '0xe94ec050b15e5d778607433d041bf30ad2991b0490b9a06d58283ca846bb2684',
      result: 'CLOSED; fingerprint 00dc58dbcf45af45288e0b9fcd704084ca46a51b7e267809e93d6ceba635b58c',
      badge: 'CLOSED',
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
              Studionet Deployment Release Evidence
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
