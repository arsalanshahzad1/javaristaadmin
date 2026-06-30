import { useRef } from 'react';
import { FileText, Upload } from 'lucide-react';
import { useFileUpload, type UploadEndpoint } from '../../hooks/useFileUpload';

interface FileUploadButtonProps {
  endpoint: UploadEndpoint;
  onUploaded: (url: string, publicId: string, file: File) => void;
  accept?: string;
  label?: string;
  currentUrl?: string;
  disabled?: boolean;
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(url) || url.includes('/image/');
}

function isPdfUrl(url: string) {
  return /\.pdf(\?|$)/i.test(url) || url.includes('/raw/');
}

export function FileUploadButton({
  endpoint,
  onUploaded,
  accept = 'image/*',
  label = 'Upload File',
  currentUrl,
  disabled = false,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, error, progress } = useFileUpload({ endpoint });

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await upload(file);
    if (inputRef.current) inputRef.current.value = '';
    if (result) onUploaded(result.url, result.publicId, file);
  };

  return (
    <div className="flex flex-col gap-2">
      {currentUrl && (
        <div className="flex items-center gap-3">
          {isImageUrl(currentUrl) ? (
            <img
              src={currentUrl}
              alt="Current upload"
              className="h-16 w-16 rounded-lg border border-[#333] object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-[#333] bg-[#1a1a1a]">
              <FileText size={24} className="text-[#666]" />
            </div>
          )}
          <span className="max-w-[180px] truncate text-xs text-[#666]">
            {isPdfUrl(currentUrl) ? 'PDF uploaded' : 'Image uploaded'}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-[#333] bg-[#1a1a1a] px-4 py-2 text-sm text-[#ccc] transition-colors hover:border-[#D62B2B] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload size={14} />
          {isUploading ? `Uploading… ${progress}%` : label}
        </button>

        {isUploading && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2a2a2a]">
            <div
              className="h-full rounded-full bg-[#D62B2B] transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || isUploading}
        onChange={handleChange}
      />
    </div>
  );
}
