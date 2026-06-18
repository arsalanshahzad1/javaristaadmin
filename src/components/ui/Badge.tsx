import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  children: React.ReactNode;
}

const variants: Record<string, string> = {
  success: 'bg-green-900/30 text-green-400 border-green-800/50',
  warning: 'bg-orange-900/30 text-orange-400 border-orange-800/50',
  danger: 'bg-red-900/30 text-red-400 border-red-800/50',
  info: 'bg-blue-900/30 text-blue-400 border-blue-800/50',
  default: 'bg-[#2E2E2E] text-[#999] border-[#3a3a3a]',
};

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variants[variant]}`}>
      {children}
    </span>
  );
}
