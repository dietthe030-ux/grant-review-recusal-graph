// ============================================================================
// Grant Review Recusal Graph — Audit Event Log Panel
// ============================================================================

import React, { useState } from 'react';
import { AuditEventPage } from '@/types';
import {
  formatTimestamp,
  truncateAddress,
  truncateHash,
  getExplorerTxUrl,
} from '@/utils/formatters';
import {
  History,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Code2,
} from 'lucide-react';

export interface AuditLogPanelProps {
  roundId: number;
  recentEvents: AuditEventPage;
}

export const AuditLogPanel: React.FC<AuditLogPanelProps> = ({
  roundId,
  recentEvents,
}) => {
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);

  const events = recentEvents.events;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-workbench-surface border border-workbench-border rounded-lg shadow-subtle">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cobalt-400" />
            <h3 className="text-xs font-semibold text-white">
              Append-Only Audit Event Log (Round #{roundId})
            </h3>
          </div>
          <p className="text-[11px] text-slate-400">
            Immutable on-chain event sequence recording every cohort change, screening consensus, and activation.
          </p>
        </div>
        <span className="font-mono text-xs text-slate-400">
          Total Events: {recentEvents.total}
        </span>
      </div>

      {/* Events Table */}
      <div className="bg-workbench-surface border border-workbench-border rounded-lg shadow-subtle overflow-hidden">
        {events.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No audit events recorded for this round yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-workbench-subtle border-b border-workbench-border text-[11px] font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-3">Seq</th>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Timestamp (UTC)</th>
                  <th className="px-4 py-3">Tx Hash</th>
                  <th className="px-4 py-3 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-workbench-border font-mono text-[11px]">
                {events.map((event) => {
                  const isExpanded = expandedEventId === event.id;

                  return (
                    <React.Fragment key={event.id}>
                      <tr className="hover:bg-workbench-hover/40 transition-colors">
                        <td className="px-4 py-3 text-slate-500 font-bold">
                          #{event.sequence}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px]">
                            {event.event_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {truncateAddress(event.actor)}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {formatTimestamp(event.timestamp)}
                        </td>
                        <td className="px-4 py-3">
                          {event.tx_hash ? (
                            <a
                              href={getExplorerTxUrl(event.tx_hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cobalt-400 hover:underline flex items-center gap-1"
                            >
                              <span>{truncateHash(event.tx_hash, 6, 4)}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedEventId(isExpanded ? null : event.id)
                            }
                            className="text-cobalt-400 hover:text-white flex items-center gap-1 ml-auto font-mono text-[11px]"
                          >
                            <Code2 className="w-3 h-3" />
                            <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Payload JSON Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={6} className="px-4 py-3">
                            <pre className="p-3 bg-black/60 border border-workbench-border rounded text-[11px] font-mono text-emerald-300 overflow-x-auto">
                              {JSON.stringify(event.payload, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-workbench-border bg-workbench-subtle/30 text-xs text-slate-400">
          <span>Page {recentEvents.page + 1}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={recentEvents.page === 0}
              className="p-1 rounded border border-workbench-border hover:bg-workbench-hover disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!recentEvents.has_more}
              className="p-1 rounded border border-workbench-border hover:bg-workbench-hover disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
