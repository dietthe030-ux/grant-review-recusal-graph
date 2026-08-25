// ============================================================================
// Grant Review Recusal Graph — Badge Component
// ============================================================================

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'purple' | 'cyan' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-slate-800/80 text-slate-300 border-slate-700',
    success: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
    danger: 'bg-red-950/60 text-red-300 border-red-800',
    warning: 'bg-amber-950/60 text-amber-300 border-amber-800',
    purple: 'bg-purple-950/60 text-purple-300 border-purple-800',
    cyan: 'bg-cyan-950/60 text-cyan-300 border-cyan-800',
    neutral: 'bg-neutral-900 text-neutral-400 border-neutral-700',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center font-mono font-medium rounded border tracking-wide uppercase',
          variantStyles[variant],
          sizeStyles[size],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
};
