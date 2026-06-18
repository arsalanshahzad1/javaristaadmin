import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = <Inbox size={36} strokeWidth={1.5} />,
  title = 'Nothing here',
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#666]">
      <span className="text-[#444]">{icon}</span>
      <p className="font-medium text-sm text-[#666]">{title}</p>
      {description && <p className="text-xs text-[#444] text-center max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
