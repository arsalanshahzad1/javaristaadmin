import { useState } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({ value, onChange, placeholder = 'Type and press Enter', className }: TagInputProps) {
  const [input, setInput] = useState('');

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val.endsWith(',')) {
      addTag(val.slice(0, -1));
      setInput('');
    } else {
      setInput(val);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(input);
      setInput('');
    } else if (e.key === 'Backspace' && input === '') {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className={`flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-amber-500${className ? ` ${className}` : ''}`}>
      {value.map((tag) => (
        <span key={tag} className="bg-amber-100 text-amber-800 text-sm px-2 py-0.5 rounded-full flex items-center gap-1">
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="text-amber-600 hover:text-amber-900 ml-1"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-w-40 flex-1 bg-transparent px-1 py-1 text-sm outline-none"
      />
    </div>
  );
}
