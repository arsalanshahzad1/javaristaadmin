import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, ImageOff, QrCode, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import adminApiClient from '../../api/adminApiClient';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

type Person = { _id?: string; name?: string; email?: string };

type CertDetail = {
  _id: string;
  user?: Person;
  type: string;
  issuedAt: string;
  issuedBy?: Person;
  certificateNumber: string;
  status: 'active' | 'revoked';
  track?: string;
  notes?: string;
  badgeUrl?: string;
  badgePublicId?: string;
  expiresAt?: string;
  renewalReminderSentAt?: string;
};

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

const certTypeLabel: Record<string, string> = {
  javarista_level_1: 'JavaRista Level 1',
  javarista_level_2: 'JavaRista Level 2',
  javarista_level_3: 'JavaRista Level 3',
  javarista_level_4: 'JavaRista Level 4',
  javarista_level_5: 'JavaRista Level 5',
  shift_supervisor: 'Shift Supervisor',
  store_manager: 'Store Manager',
  java_champion: 'Java Champion',
};

function typeLabel(type?: string) {
  return type ? (certTypeLabel[type] ?? type) : '—';
}

function trackLabel(t?: string) {
  return t ? t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';
}

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message || 'Something went wrong';
}

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function expiryColor(expiresAt?: string) {
  if (!expiresAt) return '#888';
  const diff = new Date(expiresAt).getTime() - Date.now();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return '#ef4444';
  if (days <= 30) return '#f59e0b';
  return '#4ade80';
}

async function fetchCert(id: string): Promise<CertDetail> {
  const res = await adminApiClient.get<ApiEnvelope<CertDetail[]>>('/certifications');
  const list = res.data.data;
  const found = list.find((c) => c._id === id);
  if (!found) throw new Error('Certificate not found');
  return found;
}

async function revokeCertification(id: string) {
  const res = await adminApiClient.put<ApiEnvelope<CertDetail>>(`/certifications/${id}/revoke`);
  return res.data;
}

async function removeBadge(id: string) {
  const res = await adminApiClient.delete<ApiEnvelope<CertDetail>>(`/certifications/${id}/badge`);
  return res.data;
}

export function CertificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showRemoveBadgeConfirm, setShowRemoveBadgeConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const certQuery = useQuery({
    queryKey: ['cert-detail', id],
    queryFn: () => fetchCert(id!),
    enabled: !!id,
  });

  const cert = certQuery.data;

  useEffect(() => {
    if (!cert) return;
    const verifyUrl = `${window.location.origin}/verify/${cert.certificateNumber}`;
    QRCode.toDataURL(verifyUrl, { width: 160, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [cert?.certificateNumber]);

  const revokeMutation = useMutation({
    mutationFn: () => revokeCertification(id!),
    onSuccess: (res) => {
      toast.success(res.message || 'Certification revoked');
      setShowRevokeConfirm(false);
      void queryClient.invalidateQueries({ queryKey: ['cert-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['certifications'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const removeBadgeMutation = useMutation({
    mutationFn: () => removeBadge(id!),
    onSuccess: (res) => {
      toast.success(res.message || 'Badge removed');
      setShowRemoveBadgeConfirm(false);
      void queryClient.invalidateQueries({ queryKey: ['cert-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['certifications'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  async function handleBadgeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('badge', file);
      await adminApiClient.post(`/certifications/${id}/badge`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Badge uploaded');
      void queryClient.invalidateQueries({ queryKey: ['cert-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['certifications'] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDownloadCard() {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${cert?.certificateNumber ?? 'card'}.png`;
      a.click();
    } catch {
      toast.error('Failed to generate certificate card');
    }
  }

  if (certQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D62B2B] border-t-transparent" />
      </div>
    );
  }

  if (certQuery.isError || !cert) {
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-900/10 p-8 text-center">
        <p className="text-red-300">Certification not found.</p>
        <button type="button" onClick={() => navigate('/certifications')} className="mt-4 rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ccc] hover:bg-[#2A2A2A]">
          Back to Certifications
        </button>
      </div>
    );
  }

  const verifyUrl = `${window.location.origin}/verify/${cert.certificateNumber}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/certifications')} className="rounded-lg border border-[#333] p-2 text-[#888] hover:bg-[#242424]">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Certificate Detail</h1>
          <p className="text-sm text-[#777]">{cert.certificateNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left — Badge + QR */}
        <div className="space-y-4">
          {/* Badge */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <h2 className="mb-4 text-sm font-semibold text-[#999]">Badge Image</h2>
            <div className="flex flex-col items-center gap-4">
              {cert.badgeUrl ? (
                <img src={cert.badgeUrl} alt="Certificate badge" className="h-48 w-48 rounded-full object-cover ring-4 ring-[#D62B2B]/30" />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-full bg-[#2A2A2A] ring-4 ring-[#333]">
                  <div className="text-center">
                    <ImageOff size={32} className="mx-auto mb-2 text-[#555]" />
                    <span className="text-3xl font-black text-[#444]">
                      {typeLabel(cert.type).split(' ').map((w) => w[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBadgeUpload} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#D62B2B] px-3 py-2 text-xs font-medium text-white hover:bg-[#B92323] disabled:opacity-50"
                >
                  <Upload size={13} />
                  {uploading ? 'Uploading...' : cert.badgeUrl ? 'Replace' : 'Upload'}
                </button>
                {cert.badgeUrl && (
                  <button
                    type="button"
                    onClick={() => setShowRemoveBadgeConfirm(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-900/60 px-3 py-2 text-xs text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="mb-3 flex items-center gap-2">
              <QrCode size={16} className="text-[#888]" />
              <h2 className="text-sm font-semibold text-[#999]">Verification QR</h2>
            </div>
            {qrDataUrl ? (
              <div className="flex flex-col items-center gap-3">
                <img src={qrDataUrl} alt="QR Code" className="h-40 w-40 rounded-lg" />
                <p className="break-all text-center text-xs text-[#666]">{verifyUrl}</p>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#D62B2B] border-t-transparent" />
              </div>
            )}
          </div>
        </div>

        {/* Right — Details */}
        <div className="space-y-4 lg:col-span-2">
          {/* Certificate card (used for download) */}
          <div ref={cardRef} className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#D62B2B]">Java Times Caffè</p>
                <h2 className="mt-1 text-2xl font-black text-white">Certificate of Achievement</h2>
              </div>
              {cert.badgeUrl && (
                <img src={cert.badgeUrl} alt="badge" className="h-16 w-16 rounded-full object-cover" />
              )}
            </div>

            <p className="text-base text-[#ccc]">This certifies that</p>
            <p className="mt-1 text-2xl font-bold text-white">{cert.user?.name ?? '—'}</p>
            <p className="mt-1 text-sm text-[#999]">has successfully earned the</p>
            <p className="mt-1 text-xl font-bold text-[#D62B2B]">{typeLabel(cert.type)}</p>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#2A2A2A] pt-4 text-sm">
              <div>
                <p className="text-xs text-[#666]">Certificate #</p>
                <p className="font-mono font-semibold text-white">{cert.certificateNumber}</p>
              </div>
              <div>
                <p className="text-xs text-[#666]">Status</p>
                <Badge variant={cert.status === 'active' ? 'success' : 'danger'}>
                  {cert.status === 'active' ? 'Active' : 'Revoked'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-[#666]">Issued Date</p>
                <p className="text-[#ccc]">{formatDate(cert.issuedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-[#666]">Expiry Date</p>
                <p style={{ color: expiryColor(cert.expiresAt) }}>
                  {cert.expiresAt ? formatDate(cert.expiresAt) : 'No Expiry'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#666]">Issued By</p>
                <p className="text-[#ccc]">{cert.issuedBy?.name ?? 'System'}</p>
              </div>
              <div>
                <p className="text-xs text-[#666]">Track</p>
                <p className="text-[#ccc]">{trackLabel(cert.track)}</p>
              </div>
            </div>

            {qrDataUrl && (
              <div className="mt-4 flex items-center gap-3 border-t border-[#2A2A2A] pt-4">
                <img src={qrDataUrl} alt="QR" className="h-16 w-16" />
                <div>
                  <p className="text-xs text-[#666]">Verify online</p>
                  <p className="break-all text-xs text-[#888]">{verifyUrl}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownloadCard}
              className="inline-flex items-center gap-2 rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ccc] hover:bg-[#242424]"
            >
              <Download size={15} />
              Download Card
            </button>
            {cert.status === 'active' && (
              <button
                type="button"
                onClick={() => setShowRevokeConfirm(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-900/60 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-900/20"
              >
                Revoke Certification
              </button>
            )}
          </div>

          {/* Notes */}
          {cert.notes && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <p className="mb-1 text-xs font-semibold text-[#666]">Notes</p>
              <p className="text-sm text-[#ccc]">{cert.notes}</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showRevokeConfirm}
        onClose={() => setShowRevokeConfirm(false)}
        onConfirm={() => revokeMutation.mutate()}
        title="Revoke certification?"
        message="This will mark the certification as revoked. This cannot be undone."
        confirmLabel="Revoke"
        loading={revokeMutation.isPending}
      />
      <ConfirmDialog
        isOpen={showRemoveBadgeConfirm}
        onClose={() => setShowRemoveBadgeConfirm(false)}
        onConfirm={() => removeBadgeMutation.mutate()}
        title="Remove badge?"
        message="This will permanently delete the badge image from this certification."
        confirmLabel="Remove"
        loading={removeBadgeMutation.isPending}
      />
    </div>
  );
}
