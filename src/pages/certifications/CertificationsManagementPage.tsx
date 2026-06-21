import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, CheckCircle2, Plus, Search, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { IssueCertificationModal } from '../../components/certifications/IssueCertificationModal';
import { useDebounce } from '../../hooks/useDebounce';

type CertificationType =
  | 'javarista_level_1'
  | 'javarista_level_2'
  | 'javarista_level_3'
  | 'javarista_level_4'
  | 'javarista_level_5'
  | 'shift_leader'
  | 'store_leader'
  | 'java_champion';

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type Person = {
  _id?: string;
  name?: string;
  email?: string;
};

type Certification = {
  _id: string;
  user?: Person;
  type: CertificationType;
  issuedAt: string;
  issuedBy?: Person;
  certificateNumber: string;
  status: 'active' | 'revoked';
};

type VerifyResult = {
  valid: boolean;
  holderName?: string;
  type?: CertificationType;
  issuedAt?: string;
  status?: string;
  certificateNumber?: string;
};

const certificationTypes: { value: CertificationType; label: string }[] = [
  { value: 'javarista_level_1', label: 'JavaRista Level 1' },
  { value: 'javarista_level_2', label: 'JavaRista Level 2' },
  { value: 'javarista_level_3', label: 'JavaRista Level 3' },
  { value: 'javarista_level_4', label: 'JavaRista Level 4' },
  { value: 'javarista_level_5', label: 'JavaRista Level 5' },
  { value: 'shift_leader', label: 'Shift Leader' },
  { value: 'store_leader', label: 'Store Leader' },
  { value: 'java_champion', label: 'Java Champion' },
];

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message || 'Something went wrong';
}

function typeLabel(type?: string) {
  return certificationTypes.find((item) => item.value === type)?.label ?? '-';
}

async function getCertifications(params: { search?: string; type?: string; status?: string }) {
  const response = await adminApiClient.get<ApiEnvelope<Certification[]>>('/certifications', { params });
  return response.data.data;
}

async function revokeCertification(id: string) {
  const response = await adminApiClient.put<ApiEnvelope<Certification>>(`/certifications/${id}/revoke`);
  return response.data;
}

async function verifyCertificate(certNumber: string) {
  const response = await adminApiClient.get<ApiEnvelope<VerifyResult>>(`/certifications/verify/${encodeURIComponent(certNumber)}`);
  return response.data.data;
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((row) => (
        <tr key={row} className="border-b border-[#242424]">
          {[0, 1, 2, 3, 4, 5, 6].map((cell) => (
            <td key={cell} className="px-4 py-4">
              <div className="h-4 animate-pulse rounded bg-[#242424]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CertificationsManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [isIssueOpen, setIssueOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Certification | null>(null);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const certificationsQuery = useQuery({
    queryKey: ['certifications', debouncedSearch, type, status],
    queryFn: () => getCertifications({
      search: debouncedSearch || undefined,
      type: type || undefined,
      status: status || undefined,
    }),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeCertification,
    onSuccess: (response) => {
      toast.success(response.message || 'Certification revoked');
      setRevokeTarget(null);
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const verifyMutation = useMutation({
    mutationFn: verifyCertificate,
    onSuccess: (result) => setVerifyResult(result),
    onError: () => setVerifyResult({ valid: false }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Certifications</h1>
          <p className="mt-1 text-sm text-[#777]">Issue, revoke, and verify JavaRista certifications.</p>
        </div>
        <button type="button" onClick={() => setIssueOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323]">
          <Plus size={16} />
          Issue Certification
        </button>
      </div>

      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#2A2A2A] p-4">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by certificate number or user name"
              className="w-full rounded-lg border border-[#333] bg-[#111] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30"
            />
          </div>
          <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30">
            <option value="">All types</option>
            {certificationTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>

        {certificationsQuery.isError ? (
          <div className="p-5">
            <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
              <p className="text-red-300">{getErrorMessage(certificationsQuery.error)}</p>
              <button type="button" onClick={() => certificationsQuery.refetch()} className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/20">
                Try again
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="sticky top-0 bg-[#1A1A1A] text-xs uppercase text-[#666]">
                <tr className="border-b border-[#2A2A2A]">
                  <th className="px-4 py-3 font-medium">Certificate #</th>
                  <th className="px-4 py-3 font-medium">Holder name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Issued by</th>
                  <th className="px-4 py-3 font-medium">Issued at</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificationsQuery.isLoading ? <SkeletonRows /> : (certificationsQuery.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Award className="mx-auto mb-3 text-[#555]" size={30} />
                      <p className="text-sm text-[#777]">No certifications found</p>
                    </td>
                  </tr>
                ) : (certificationsQuery.data ?? []).map((cert, index) => (
                  <tr key={cert._id} className={`${index % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}>
                    <td className="px-4 py-3 font-medium text-white">{cert.certificateNumber}</td>
                    <td className="px-4 py-3 text-[#bbb]">{cert.user?.name ?? 'Unknown holder'}</td>
                    <td className="px-4 py-3 text-[#bbb]">{typeLabel(cert.type)}</td>
                    <td className="px-4 py-3 text-[#bbb]">{cert.issuedBy?.name ?? 'System'}</td>
                    <td className="px-4 py-3 text-[#999]">{cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3"><Badge variant={cert.status === 'active' ? 'success' : 'danger'}>{cert.status === 'active' ? 'Active' : 'Revoked'}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      {cert.status === 'active' ? (
                        <button type="button" onClick={() => setRevokeTarget(cert)} className="rounded-lg border border-red-900/60 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/20">
                          Revoke
                        </button>
                      ) : (
                        <span className="text-xs text-[#666]">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <h2 className="mb-4 text-base font-semibold text-white">Verification Tool</h2>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (verifyInput.trim()) verifyMutation.mutate(verifyInput.trim());
        }} className="flex flex-wrap gap-3">
          <input
            value={verifyInput}
            onChange={(event) => setVerifyInput(event.target.value)}
            placeholder="Verify a certificate number"
            className="min-w-64 flex-1 rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30"
          />
          <button type="submit" disabled={verifyMutation.isPending} className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323] disabled:opacity-50">
            {verifyMutation.isPending ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        {verifyResult && (
          <div className={`mt-4 rounded-lg border p-4 ${verifyResult.valid ? 'border-green-800/50 bg-green-900/20' : 'border-red-800/50 bg-red-900/20'}`}>
            {verifyResult.valid ? (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 text-green-400" size={20} />
                <div>
                  <p className="font-medium text-green-200">Valid certificate</p>
                  <p className="mt-1 text-sm text-green-100">{verifyResult.holderName} · {typeLabel(verifyResult.type)}</p>
                  <p className="mt-1 text-xs text-green-200/80">Issued {verifyResult.issuedAt ? new Date(verifyResult.issuedAt).toLocaleDateString() : '-'}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <XCircle className="text-red-400" size={20} />
                <p className="font-medium text-red-200">No certificate found with this number</p>
              </div>
            )}
          </div>
        )}
      </section>

      <IssueCertificationModal isOpen={isIssueOpen} onClose={() => setIssueOpen(false)} />

      <ConfirmDialog
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget._id)}
        title="Revoke certification?"
        message="Are you sure you want to revoke this certification?"
        confirmLabel="Revoke"
        loading={revokeMutation.isPending}
      />
    </div>
  );
}
