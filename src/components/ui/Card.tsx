import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export function Card({ children, className = '', title, action }: CardProps) {
  const hasHeader = title || action;
  return (
    <div className={`bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl ${className}`}>
      {hasHeader && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
          {title && <h3 className="text-sm font-medium text-white">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
