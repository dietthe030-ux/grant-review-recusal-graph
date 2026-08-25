// ============================================================================
// Grant Review Recusal Graph — Callout / Alert Component
// ============================================================================

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  icon?: React.ReactNode;
}

export const Callout: React.FC<CalloutProps> = ({
  variant = 'info',
  title,
  icon,
  children,
  className,
  ...props
}) => {
  const variantConfig = {
    info: {
      bg: 'bg-blue-950/40 border-blue-900/60 text-blue-300',
      icon: <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />,
    },
    warning: {
      bg: 'bg-amber-950/40 border-amber-900/60 text-amber-300',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
    },
    error: {
      bg: 'bg-red-950/40 border-red-900/60 text-red-300',
      icon: <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />,
    },
    success: {
      bg: 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300',
      icon: <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
    },
  };

  const current = variantConfig[variant];

  return (
    <div
      className={twMerge(
        clsx(
          'p-3.5 rounded-md border text-xs leading-relaxed flex items-start gap-2.5',
          current.bg,
          className
        )
      )}
      {...props}
    >
      {icon || current.icon}
      <div className="space-y-1 flex-1">
        {title && <h5 className="font-semibold tracking-tight">{title}</h5>}
        <div className="text-[11px] opacity-90">{children}</div>
      </div>
    </div>
  );
};
