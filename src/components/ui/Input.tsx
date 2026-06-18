import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-[#999] font-medium">{label}</label>}
      <input
        className={`bg-[#1A1A1A] border ${error ? 'border-red-600' : 'border-[#2A2A2A]'}
          rounded-lg px-3 py-2 text-sm text-white placeholder-[#555]
          outline-none focus:border-[#D62B2B] transition-colors w-full
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}`}
        {...props}
      />
      {hint && !error && <span className="text-xs text-[#555]">{hint}</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
