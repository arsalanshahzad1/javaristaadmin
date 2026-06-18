interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors
        focus:outline-none cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        ${checked ? 'bg-[#D62B2B]' : 'bg-[#2E2E2E]'}`}
    >
      <span
        className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform
          ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`}
      />
      {label && <span className="ml-2 text-sm text-[#999]">{label}</span>}
    </button>
  );
}
