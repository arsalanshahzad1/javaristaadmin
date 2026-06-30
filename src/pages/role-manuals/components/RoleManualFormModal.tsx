import { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Toggle } from '../../../components/ui/Toggle';
import type { RoleManual } from '../../../api/roleManuals.api';

const ALL_ROLES = [
  'owner',
  'ceo',
  'coo',
  'cfo',
  'regional_manager',
  'area_manager',
  'store_manager',
  'assistant_manager',
  'shift_supervisor',
  'barista',
  'trainee',
  'investor',
  'hr_manager',
  'marketing_manager',
] as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    targetRole: string;
    title: string;
    description: string;
    version: string;
    isActive: boolean;
  }) => void;
  isLoading?: boolean;
  initial?: RoleManual | null;
}

export function RoleManualFormModal({ isOpen, onClose, onSubmit, isLoading, initial }: Props) {
  const [targetRole, setTargetRole] = useState('barista');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initial) {
      setTargetRole(initial.targetRole);
      setTitle(initial.title);
      setDescription(initial.description ?? '');
      setVersion(initial.version);
      setIsActive(initial.isActive);
    } else {
      setTargetRole('barista');
      setTitle('');
      setDescription('');
      setVersion('1.0');
      setIsActive(true);
    }
  }, [initial, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ targetRole, title: title.trim(), description: description.trim(), version: version.trim() || '1.0', isActive });
  };

  const labelClass = 'block text-xs font-medium text-[#aaa] mb-1';
  const inputClass =
    'w-full rounded-lg border border-[#333] bg-[#242424] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#D62B2B] focus:outline-none';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit Manual' : 'New Role Manual'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Target Role</label>
          <select
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className={inputClass}
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Barista Manual"
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
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className={labelClass}>Version</label>
          <input
            type="text"
            placeholder="1.0"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-3">
          <Toggle checked={isActive} onChange={setIsActive} />
          <span className="text-sm text-[#aaa]">Active</span>
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
            {isLoading ? 'Saving…' : initial ? 'Save Changes' : 'Create Manual'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
