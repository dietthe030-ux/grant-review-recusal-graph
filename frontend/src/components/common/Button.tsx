// ============================================================================
// Grant Review Recusal Graph — Button Component
// ============================================================================

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-cobalt-600 hover:bg-cobalt-500 text-white border border-cobalt-500/50 shadow-subtle active:scale-[0.98]',
    secondary:
      'bg-workbench-subtle hover:bg-workbench-hover text-slate-200 border border-workbench-border hover:border-slate-600 active:scale-[0.98]',
    danger:
      'bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 active:scale-[0.98]',
    outline:
      'bg-transparent hover:bg-workbench-subtle text-slate-300 border border-workbench-border hover:border-slate-600 active:scale-[0.98]',
    ghost:
      'bg-transparent hover:bg-workbench-hover text-slate-400 hover:text-slate-200 border-transparent',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 rounded',
    md: 'text-xs font-medium px-3.5 py-2 gap-2 rounded-md',
    lg: 'text-sm font-semibold px-4 py-2.5 gap-2 rounded-md',
  };

  return (
    <button
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center transition-all disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none cursor-pointer',
          variantStyles[variant],
          sizeStyles[size],
          className
        )
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
