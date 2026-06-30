import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../../api/adminApiClient';
import { Modal } from '../../../components/ui/Modal';

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

type CertPath = {
  _id: string;
  title: string;
  description?: string;
  track: string;
  targetRoles: string[];
  certifications: string[];
  isActive: boolean;
  estimatedWeeks?: number;
};

type CertOption = { _id: string; type: string; track?: string };

type PathFormValues = {
  title: string;
  description: string;
  track: string;
  targetRoles: string[];
  certifications: string[];
  isActive: boolean;
  estimatedWeeks: string;
};

const TRACKS = ['coffee', 'leadership', 'operations', 'specialty_beverage', 'food_safety', 'custom'];
const ALL_ROLES = [
  'owner', 'ceo', 'coo', 'cfo', 'regional_manager', 'area_manager',
  'store_manager', 'assistant_manager', 'shift_supervisor', 'barista',
  'trainee', 'investor', 'hr_manager', 'marketing_manager',
];

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message || 'Something went wrong';
}

function fieldClass() {
  return 'w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30';
}

async function savePath(payload: { id?: string; values: PathFormValues }) {
  const body = {
    ...payload.values,
    estimatedWeeks: payload.values.estimatedWeeks ? Number(payload.values.estimatedWeeks) : undefined,
  };
  const response = payload.id
    ? await adminApiClient.put<ApiEnvelope<CertPath>>(`/certifications/paths/${payload.id}`, body)
    : await adminApiClient.post<ApiEnvelope<CertPath>>('/certifications/paths', body);
  return response.data;
}

async function getCerts() {
  const response = await adminApiClient.get<ApiEnvelope<CertOption[]>>('/certifications');
  return response.data.data;
}

const empty: PathFormValues = {
  title: '',
  description: '',
  track: 'coffee',
  targetRoles: [],
  certifications: [],
  isActive: true,
  estimatedWeeks: '',
};

export function CertificationPathFormModal({ isOpen, onClose, path }: { isOpen: boolean; onClose: () => void; path: CertPath | null }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PathFormValues>({ defaultValues: empty });
  const targetRoles = watch('targetRoles');
  const selectedCerts = watch('certifications');

  const certsQuery = useQuery({ queryKey: ['certifications-list'], queryFn: getCerts, enabled: isOpen });

  useEffect(() => {
    if (isOpen) {
      reset(path ? {
        title: path.title,
        description: path.description ?? '',
        track: path.track,
        targetRoles: path.targetRoles ?? [],
        certifications: path.certifications ?? [],
        isActive: path.isActive,
        estimatedWeeks: path.estimatedWeeks != null ? String(path.estimatedWeeks) : '',
      } : empty);
    }
  }, [isOpen, path, reset]);

  const mutation = useMutation({
    mutationFn: savePath,
    onSuccess: (response) => {
      toast.success(response.message || 'Path saved');
      queryClient.invalidateQueries({ queryKey: ['certification-paths'] });
      onClose();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function toggleRole(role: string) {
    const current = targetRoles ?? [];
    const updated = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    reset({ ...watch(), targetRoles: updated });
  }

  function toggleCert(certId: string) {
    const current = selectedCerts ?? [];
    const updated = current.includes(certId) ? current.filter((c) => c !== certId) : [...current, certId];
    reset({ ...watch(), certifications: updated });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={path ? 'Edit Pathway' : 'New Pathway'} size="xl">
      <form onSubmit={handleSubmit((values) => mutation.mutate({ id: path?._id, values }))} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Title</label>
            <input {...register('title', { required: 'Title is required' })} className={fieldClass()} />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Track</label>
            <select {...register('track')} className={fieldClass()}>
              {TRACKS.map((t) => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#ccc]">Description</label>
          <textarea rows={3} {...register('description')} className={`${fieldClass()} resize-none`} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Estimated Weeks</label>
            <input type="number" min={1} {...register('estimatedWeeks')} className={fieldClass()} placeholder="Optional" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-[#ccc]">
              <input type="checkbox" {...register('isActive')} className="h-4 w-4 accent-[#D62B2B]" /> Active
            </label>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#ccc]">Target Roles</label>
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map((role) => {
              const selected = (targetRoles ?? []).includes(role);
              return (
                <button key={role} type="button" onClick={() => toggleRole(role)} className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${selected ? 'border-[#D62B2B] bg-[#D62B2B]/20 text-white' : 'border-[#333] text-[#777] hover:border-[#555]'}`}>
                  {role}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#ccc]">Certifications (ordered)</label>
          {certsQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded-lg bg-[#242424]" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {(certsQuery.data ?? []).map((cert) => {
                const selected = (selectedCerts ?? []).includes(cert._id);
                return (
                  <button key={cert._id} type="button" onClick={() => toggleCert(cert._id)} className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${selected ? 'border-[#D62B2B] bg-[#D62B2B]/20 text-white' : 'border-[#333] text-[#777] hover:border-[#555]'}`}>
                    {cert.type.replace(/_/g, ' ')}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ddd] hover:bg-[#242424]">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323] disabled:opacity-50">{mutation.isPending ? 'Saving...' : 'Save Pathway'}</button>
        </div>
      </form>
    </Modal>
  );
}
