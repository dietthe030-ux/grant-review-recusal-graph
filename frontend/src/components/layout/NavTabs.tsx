// ============================================================================
// Grant Review Recusal Graph — Navigation Tabs
// ============================================================================

import React from 'react';
import { ActiveTab } from '@/types';
import {
  Share2,
  Grid,
  Users,
  Search,
  UserCheck,
  History,
  FileCheck2,
} from 'lucide-react';

export interface NavTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  screenedCount: number;
  totalParticipants: number;
}

export const NavTabs: React.FC<NavTabsProps> = ({
  activeTab,
  onTabChange,
  screenedCount,
  totalParticipants,
}) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    {
      id: 'graph',
      label: 'Bipartite Recusal Graph',
      icon: <Share2 className="w-3.5 h-3.5" />,
    },
    {
      id: 'matrix',
      label: 'Matrix Projection',
      icon: <Grid className="w-3.5 h-3.5" />,
    },
    {
      id: 'participants',
      label: 'Cohort & Assignments',
      icon: <Users className="w-3.5 h-3.5" />,
      badge: totalParticipants > 0 ? totalParticipants : undefined,
    },
    {
      id: 'screening',
      label: 'Screening & Consensus',
      icon: <Search className="w-3.5 h-3.5" />,
      badge: screenedCount > 0 ? screenedCount : undefined,
    },
    {
      id: 'promotion',
      label: 'Backup Promotion & Quorum',
      icon: <UserCheck className="w-3.5 h-3.5" />,
    },
    {
      id: 'audit',
      label: 'Audit Events',
      icon: <History className="w-3.5 h-3.5" />,
    },
    {
      id: 'verification',
      label: 'Studionet Proof Matrix',
      icon: <FileCheck2 className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <nav className="w-full bg-workbench-bg border-b border-workbench-border overflow-x-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer select-none ${
                isActive
                  ? 'border-cobalt-500 text-white bg-workbench-surface/60 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-workbench-hover/40'
              }`}
            >
              <span className={isActive ? 'text-cobalt-400' : 'text-slate-500'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                    isActive
                      ? 'bg-cobalt-950 text-cobalt-300 border border-cobalt-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
