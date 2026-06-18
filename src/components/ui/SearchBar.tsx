import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search…', className = '' }: SearchBarProps) {
  const [input, setInput] = useState(value);
  const debounced = useDebounce(input, 400);

  useEffect(() => {
    onChange(debounced);
  }, [debounced, onChange]);

  useEffect(() => {
    if (value !== '') return;

    const id = window.setTimeout(() => setInput(''), 0);
    return () => window.clearTimeout(id);
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-8 py-2 text-sm text-white
          placeholder-[#555] outline-none focus:border-[#D62B2B] transition-colors w-full"
      />
      {input && (
        <button
          type="button"
          onClick={() => { setInput(''); onChange(''); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
