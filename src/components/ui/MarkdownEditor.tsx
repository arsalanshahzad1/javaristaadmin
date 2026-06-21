import { useRef, useMemo } from 'react';
import { Bold, Heading, Italic, List, ListOrdered } from 'lucide-react';
import { marked } from 'marked';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  rows?: number;
}

export function MarkdownEditor({ value, onChange, placeholder, label, rows = 12 }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewHtml = useMemo(() => marked.parse(value || '', { async: false }) as string, [value]);

  function insertMarkdown(before: string, after = '') {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${before}${after}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}${before}${selected || 'text'}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + (selected || 'text').length,
      );
    });
  }

  return (
    <div>
      {label && <label className="mb-1 block text-sm font-medium text-[#ccc]">{label}</label>}
      <div className="flex gap-1 mb-1">
        <button type="button" onClick={() => insertMarkdown('**', '**')} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-100" title="Bold">
          <Bold size={13} />
        </button>
        <button type="button" onClick={() => insertMarkdown('*', '*')} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-100" title="Italic">
          <Italic size={13} />
        </button>
        <button type="button" onClick={() => insertMarkdown('## ', '')} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-100" title="Heading">
          <Heading size={13} />
        </button>
        <button type="button" onClick={() => insertMarkdown('- ', '')} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-100" title="Bullet List">
          <List size={13} />
        </button>
        <button type="button" onClick={() => insertMarkdown('1. ', '')} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-100" title="Numbered List">
          <ListOrdered size={13} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30 resize-y font-mono"
        />
        <div
          className="prose text-sm border border-gray-200 rounded-lg p-3 min-h-[200px] bg-gray-50 overflow-auto"
          dangerouslySetInnerHTML={{
            __html: previewHtml || '<p style="color:#999">Preview will appear here</p>',
          }}
        />
      </div>
    </div>
  );
}
