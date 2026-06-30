import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { Modal } from '../ui/Modal';

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type AdminUser = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
};

type IssueCertificationForm = {
  userId: string;
  type: string;
  notes: string;
};

type IssuedCertification = {
  _id: string;
  certificateNumber: string;
};

type IssueCertificationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  prefilledUserId?: string;
  prefilledUserName?: string;
};

const certificationTypes = [
  { value: 'javarista_level_1', label: 'JavaRista Level 1' },
  { value: 'javarista_level_2', label: 'JavaRista Level 2' },
  { value: 'javarista_level_3', label: 'JavaRista Level 3' },
  { value: 'javarista_level_4', label: 'JavaRista Level 4' },
  { value: 'javarista_level_5', label: 'JavaRista Level 5' },
  { value: 'shift_supervisor', label: 'Shift Supervisor' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'java_champion', label: 'Java Champion' },
];

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message || 'Unable to issue certification';
}

async function getAdminUsers(search: string) {
  const response = await adminApiClient.get<ApiEnvelope<AdminUser[]>>('/admin/users', {
    params: { search: search || undefined, limit: 20 },
  });
  return response.data.data;
}

async function issueCertification(payload: IssueCertificationForm) {
  const response = await adminApiClient.post<ApiEnvelope<IssuedCertification>>('/certifications', payload);
  return response.data;
}

export function IssueCertificationModal({
  isOpen,
  onClose,
  prefilledUserId,
  prefilledUserName,
}: IssueCertificationModalProps) {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<IssueCertificationForm>({
    defaultValues: {
      userId: prefilledUserId ?? '',
      type: certificationTypes[0].value,
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ userId: prefilledUserId ?? '', type: certificationTypes[0].value, notes: '' });
    }
  }, [isOpen, prefilledUserId, reset]);

  const usersQuery = useQuery({
    queryKey: ['issue-certification-users', search],
    queryFn: () => getAdminUsers(search),
    enabled: isOpen && !prefilledUserId,
  });

  const issueMutation = useMutation({
    mutationFn: issueCertification,
    onSuccess: (response) => {
      toast.success(`Certification issued - #${response.data.certificateNumber}`);
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-team-performance'] });
      queryClient.invalidateQueries({ queryKey: ['user-performance'] });
      reset({ userId: prefilledUserId ?? '', type: certificationTypes[0].value, notes: '' });
      setSearch('');
      onClose();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Issue Certification" size="md">
      <form onSubmit={handleSubmit((data) => issueMutation.mutate(data))} className="space-y-4">
        {prefilledUserId ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">User</label>
            <div className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white">
              {prefilledUserName ?? 'Selected user'}
            </div>
            <input type="hidden" {...register('userId', { required: 'User is required' })} />
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="user-search" className="mb-1 block text-sm font-medium text-[#ccc]">Search users</label>
              <input
                id="user-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or email"
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30"
              />
            </div>
            <div>
              <label htmlFor="userId" className="mb-1 block text-sm font-medium text-[#ccc]">User</label>
              <select id="userId" {...register('userId', { required: 'User is required' })} className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30">
                <option value="">Select a user</option>
                {(usersQuery.data ?? []).map((user) => {
                  const id = user.id ?? user._id ?? '';
                  return <option key={id} value={id}>{user.name} - {user.email}</option>;
                })}
              </select>
              {usersQuery.isLoading && <p className="mt-1 text-xs text-[#777]">Loading users...</p>}
              {usersQuery.isError && <button type="button" onClick={() => usersQuery.refetch()} className="mt-2 text-xs font-medium text-red-300 hover:text-red-200">Retry user search</button>}
              {errors.userId && <p className="mt-1 text-sm text-red-400">{errors.userId.message}</p>}
            </div>
          </>
        )}

        <div>
          <label htmlFor="type" className="mb-1 block text-sm font-medium text-[#ccc]">Certification type</label>
          <select id="type" {...register('type', { required: 'Certification type is required' })} className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30">
            {certificationTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
          {errors.type && <p className="mt-1 text-sm text-red-400">{errors.type.message}</p>}
        </div>

        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium text-[#ccc]">Notes</label>
          <textarea id="notes" rows={4} {...register('notes')} className="w-full resize-none rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30" placeholder="Optional manager notes" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#333] px-4 py-2 text-sm font-medium text-[#ddd] hover:bg-[#242424]">Cancel</button>
          <button type="submit" disabled={issueMutation.isPending} className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323] disabled:cursor-not-allowed disabled:opacity-50">
            {issueMutation.isPending ? 'Issuing...' : 'Submit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
