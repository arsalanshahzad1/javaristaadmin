import { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useFileUpload, type UploadEndpoint } from '../../hooks/useFileUpload';

interface MultiImageUploadProps {
  endpoint: UploadEndpoint;
  onUploaded: (urls: string[]) => void;
  currentUrls?: string[];
  maxFiles?: number;
  label?: string;
}

export function MultiImageUpload({
  endpoint,
  onUploaded,
  currentUrls = [],
  maxFiles = 5,
  label,
}: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>(currentUrls);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const { upload, isUploading, progress, error: uploadError } = useFileUpload({ endpoint });

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (urls.length >= maxFiles) {
      setRemoveError(`Maximum ${maxFiles} photos allowed`);
      return;
    }

    setRemoveError(null);
    const result = await upload(file);

    if (result) {
      const next = [...urls, result.url];
      setUrls(next);
      onUploaded(next);
    }

    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (index: number) => {
    const next = urls.filter((_, i) => i !== index);
    setUrls(next);
    onUploaded(next);
  };

  const displayError = removeError ?? uploadError;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-[#ccc]">{label}</label>
      )}

      <div className="flex flex-wrap gap-3">
        {urls.map((url, i) => (
          <div key={i} className="relative h-24 w-24 flex-shrink-0">
            <img
              src={url}
              alt={`Photo ${i + 1}`}
              className="h-full w-full rounded-lg border border-[#333] object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#D62B2B] text-white shadow hover:bg-[#A01E1E]"
            >
              <X size={10} />
            </button>
          </div>
        ))}

        {isUploading && (
          <div className="flex h-24 w-24 flex-shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-[#333] bg-[#1a1a1a]">
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[#2a2a2a]">
              <div
                className="h-full rounded-full bg-[#D62B2B] transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-[#666]">{progress}%</span>
          </div>
        )}

        {urls.length < maxFiles && !isUploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#333] bg-[#111] text-[#555] transition-colors hover:border-[#D62B2B] hover:text-[#D62B2B]"
          >
            <Plus size={20} />
            <span className="text-[10px]">Add Photo</span>
          </button>
        )}
      </div>

      {displayError && (
        <p className="text-xs text-red-400">{displayError}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
