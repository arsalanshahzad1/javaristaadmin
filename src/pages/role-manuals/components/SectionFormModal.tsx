import { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import type { RoleManualSection } from '../../../api/roleManuals.api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; order: number }) => void;
  isLoading?: boolean;
  initial?: RoleManualSection | null;
  defaultOrder?: number;
}

export function SectionFormModal({ isOpen, onClose, onSubmit, isLoading, initial, defaultOrder = 0 }: Props) {
  const [title, setTitle] = useState('');
  const [order, setOrder] = useState(0);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setOrder(initial.order);
    } else {
      setTitle('');
      setOrder(defaultOrder);
    }
  }, [initial, isOpen, defaultOrder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), order });
  };

  const labelClass = 'block text-xs font-medium text-[#aaa] mb-1';
  const inputClass =
    'w-full rounded-lg border border-[#333] bg-[#242424] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#D62B2B] focus:outline-none';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit Section' : 'Add Section'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Section Title *</label>
          <input
            type="text"
            required
            autoFocus
            placeholder="e.g. Coffee Foundations"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
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
            {isLoading ? 'Saving…' : initial ? 'Save Changes' : 'Add Section'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
