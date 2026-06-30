import { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Toggle } from '../../../components/ui/Toggle';
import type { RoleManualItem, ManualItemType } from '../../../api/roleManuals.api';

const ITEM_TYPES: { value: ManualItemType; label: string }[] = [
  { value: 'document', label: 'Document' },
  { value: 'video', label: 'Video' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'certification', label: 'Certification' },
  { value: 'reading', label: 'Reading' },
];

const URL_TYPES: ManualItemType[] = ['document', 'video'];
const TEXT_TYPES: ManualItemType[] = ['reading'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: ManualItemType;
    title: string;
    description: string;
    contentUrl: string;
    contentText: string;
    isRequired: boolean;
    order: number;
    estimatedMinutes: number | undefined;
  }) => void;
  isLoading?: boolean;
  initial?: RoleManualItem | null;
  defaultOrder?: number;
}

export function ItemFormModal({ isOpen, onClose, onSubmit, isLoading, initial, defaultOrder = 0 }: Props) {
  const [type, setType] = useState<ManualItemType>('document');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [contentText, setContentText] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [order, setOrder] = useState(0);
  const [estimatedMinutes, setEstimatedMinutes] = useState('');

  useEffect(() => {
    if (initial) {
      setType(initial.type);
      setTitle(initial.title);
      setDescription(initial.description ?? '');
      setContentUrl(initial.contentUrl ?? '');
      setContentText(initial.contentText ?? '');
      setIsRequired(initial.isRequired);
      setOrder(initial.order);
      setEstimatedMinutes(initial.estimatedMinutes !== undefined ? String(initial.estimatedMinutes) : '');
    } else {
      setType('document');
      setTitle('');
      setDescription('');
      setContentUrl('');
      setContentText('');
      setIsRequired(false);
      setOrder(defaultOrder);
      setEstimatedMinutes('');
    }
  }, [initial, isOpen, defaultOrder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      type,
      title: title.trim(),
      description: description.trim(),
      contentUrl: contentUrl.trim(),
      contentText: contentText.trim(),
      isRequired,
      order,
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
    });
  };

  const labelClass = 'block text-xs font-medium text-[#aaa] mb-1';
  const inputClass =
    'w-full rounded-lg border border-[#333] bg-[#242424] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#D62B2B] focus:outline-none';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit Item' : 'Add Item'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ManualItemType)}
              className={inputClass}
            >
              {ITEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Order</label>
            <input
              type="number"
              min={0}
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Title *</label>
          <input
            type="text"
            required
            placeholder="Item title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            placeholder="Optional description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        {URL_TYPES.includes(type) && (
          <div>
            <label className={labelClass}>Content URL</label>
            <input
              type="url"
              placeholder="https://..."
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {TEXT_TYPES.includes(type) && (
          <div>
            <label className={labelClass}>Content Text</label>
            <textarea
              placeholder="Rich text content..."
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              rows={5}
              className={`${inputClass} resize-none`}
            />
          </div>
        )}

        <div>
          <label className={labelClass}>Estimated Minutes</label>
          <input
            type="number"
            min={0}
            placeholder="e.g. 15"
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-3">
          <Toggle checked={isRequired} onChange={setIsRequired} />
          <span className="text-sm text-[#aaa]">Required</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[#aaa] hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323] disabled:opacity-50"
          >
            {isLoading ? 'Saving…' : initial ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
