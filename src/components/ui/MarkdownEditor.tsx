import { useRef, useMemo, useState } from 'react';
import { Bold, Heading, Italic, List, ListOrdered, Code, Quote, Link as LinkIcon, Eye, Edit3, Maximize2, Minimize2 } from 'lucide-react';
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
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const previewHtml = useMemo(() => {
    try {
      return marked.parse(value || '', { async: false }) as string;
    } catch {
      return '<p style="color: #ef4444;">Error rendering markdown</p>';
    }
  }, [value]);

  const wordCount = useMemo(() => {
    const text = value?.trim() || '';
    return text ? text.split(/\s+/).length : 0;
  }, [value]);

  function insertMarkdown(before: string, after = '', placeholderText = 'text') {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${before}${after}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const insertText = selected || placeholderText;
    const next = `${value.slice(0, start)}${before}${insertText}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const newCursorPos = start + before.length;
      const newSelectionEnd = newCursorPos + insertText.length;
      textarea.setSelectionRange(newCursorPos, newSelectionEnd);
    });
  }

  function insertLink() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    
    if (selected) {
      const url = prompt('Enter URL:', 'https://');
      if (url) {
        insertMarkdown(`[${selected}](`, ')', '');
      }
    } else {
      insertMarkdown('[', '](https://example.com)', 'link text');
    }
  }

  const toolbarButtons = [
    { icon: Bold, action: () => insertMarkdown('**', '**'), label: 'Bold' },
    { icon: Italic, action: () => insertMarkdown('*', '*'), label: 'Italic' },
    { icon: Heading, action: () => insertMarkdown('## ', ''), label: 'Heading' },
    { icon: List, action: () => insertMarkdown('- ', ''), label: 'Bullet List' },
    { icon: ListOrdered, action: () => insertMarkdown('1. ', ''), label: 'Numbered List' },
    { icon: Quote, action: () => insertMarkdown('> ', ''), label: 'Quote' },
    { icon: Code, action: () => insertMarkdown('```\n', '\n```'), label: 'Code Block' },
    { icon: LinkIcon, action: insertLink, label: 'Link' },
  ];

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[#ccc]">{label}</label>
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <span>{wordCount} words</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-[#2A2A2A] bg-[#1A1A1A] p-2">
        {toolbarButtons.map(({ icon: Icon, action, label }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            className="rounded-md p-1.5 text-[#999] transition-all hover:bg-[#2A2A2A] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#D62B2B]/30 group relative"
            title={label}
          >
            <Icon size={16} />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#333] px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
              {label}
            </span>
          </button>
        ))}
        
        <div className="ml-auto flex items-center gap-1 border-l border-[#2A2A2A] pl-2">
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`rounded-md p-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-[#D62B2B]/30 ${
              isPreviewMode ? 'bg-[#D62B2B]/20 text-[#D62B2B]' : 'text-[#999] hover:bg-[#2A2A2A] hover:text-white'
            }`}
            title={isPreviewMode ? 'Show Editor' : 'Show Preview'}
          >
            {isPreviewMode ? <Edit3 size={16} /> : <Eye size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-md p-1.5 text-[#999] transition-all hover:bg-[#2A2A2A] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#D62B2B]/30"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Editor Container */}
      <div 
        className={`rounded-b-lg border border-[#2A2A2A] bg-[#1A1A1A] transition-all ${
          isExpanded ? 'fixed inset-4 z-50 shadow-2xl' : ''
        }`}
        style={isExpanded ? { height: 'calc(100vh - 2rem)' } : {}}
      >
        {isExpanded && (
          <div 
            className="absolute right-2 top-2 z-10 cursor-pointer rounded-full bg-[#2A2A2A] p-1 text-[#999] hover:bg-[#333] hover:text-white transition-colors"
            onClick={() => setIsExpanded(false)}
          >
            <Minimize2 size={16} />
          </div>
        )}

        <div className={`grid ${isPreviewMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} h-full`}>
          {/* Textarea */}
          {(!isPreviewMode || !isExpanded) && (
            <div className={isPreviewMode ? 'block' : 'border-r border-[#2A2A2A]'}>
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={isPreviewMode ? rows : rows}
                className="h-full w-full resize-y rounded-lg bg-transparent px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#D62B2B]/30 font-mono"
                style={{ minHeight: '200px' }}
              />
            </div>
          )}

          {/* Preview */}
          {(isPreviewMode || !isExpanded) && (
            <div 
              className={`${isPreviewMode ? 'block' : 'block'} h-full overflow-auto p-4`}
              style={{ minHeight: '200px' }}
            >
              {value ? (
                <div 
                  className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-[#ccc] prose-a:text-[#D62B2B] prose-a:no-underline hover:prose-a:underline prose-code:text-[#D62B2B] prose-pre:bg-[#111] prose-pre:border prose-pre:border-[#2A2A2A]"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#555]">
                  Preview will appear here
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between border-t border-[#2A2A2A] px-4 py-1.5 text-xs text-[#555]">
          <div className="flex items-center gap-4">
            <span>{wordCount} words</span>
            <span>{value?.length || 0} characters</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${value ? 'bg-green-500' : 'bg-gray-500'}`} />
            <span>{value ? 'Content ready' : 'Empty'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}