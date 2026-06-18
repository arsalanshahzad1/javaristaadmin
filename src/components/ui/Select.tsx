import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
  placeholder?: string;
}

export function Select({ label, options, error, placeholder, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-[#999] font-medium">{label}</label>}
      <select
        className={`bg-[#1A1A1A] border ${error ? 'border-red-600' : 'border-[#2A2A2A]'}
          rounded-lg px-3 py-2 text-sm text-white outline-none
          focus:border-[#D62B2B] transition-colors cursor-pointer w-full
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" className="bg-[#1A1A1A]">{placeholder}</option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#1A1A1A]">
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
