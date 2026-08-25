// ============================================================================
// Grant Review Recusal Graph — Card & Container Components
// ============================================================================

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  headerAction,
  footer,
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-workbench-surface border border-workbench-border rounded-lg shadow-subtle overflow-hidden flex flex-col',
          className
        )
      )}
      {...props}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-workbench-border bg-workbench-subtle/50">
          <div>
            {title && <h4 className="text-xs font-semibold text-white tracking-tight">{title}</h4>}
            {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className="p-4 flex-1">{children}</div>
      {footer && (
        <div className="px-4 py-2.5 border-t border-workbench-border bg-workbench-subtle/30 text-xs text-slate-400">
          {footer}
        </div>
      )}
    </div>
  );
};
