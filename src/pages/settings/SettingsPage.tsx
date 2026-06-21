import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, LogOut, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { authApi } from '../../api/auth.api';
import { adminAuthStorage } from '../../api/adminAuthStorage';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

type PasswordForm = {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message ?? 'Something went wrong';
}

async function changePassword({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) {
  const res = await adminApiClient.put<ApiEnvelope<void>>('/users/change-password', { oldPassword, newPassword });
  return res.data;
}

function PasswordInput({
  label,
  error,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[#ccc]">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-sm text-white pr-10 outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/20 transition-colors"
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors cursor-pointer"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <Icon size={15} />
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const storedUser = adminAuthStorage.getUser();
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PasswordForm>({
    defaultValues: { oldPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success('Password updated successfully');
      reset();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const onPasswordSubmit = (data: PasswordForm) => {
    changePasswordMutation.mutate({ oldPassword: data.oldPassword, newPassword: data.newPassword });
  };

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    adminAuthStorage.clearSession();
    logout();
    navigate('/login');
  };

  const handleTestConnection = async () => {
    setTestStatus('loading');
    try {
      await adminApiClient.get('/auth/me');
      setTestStatus('success');
    } catch {
      setTestStatus('error');
    }
  };

  const displayUser = user ?? storedUser;
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-white mb-1">Settings</h1>
        <p className="text-sm text-[#666]">Manage your account and view app configuration.</p>
      </div>

      {/* ── My Account ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-[#999] uppercase tracking-widest">My Account</h2>

        {/* Identity */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#D62B2B] flex items-center justify-center text-lg font-semibold text-white flex-shrink-0">
              {displayUser?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-white font-medium leading-tight">{displayUser?.name ?? '—'}</p>
              <p className="text-sm text-[#666] mt-0.5">{displayUser?.email ?? '—'}</p>
              <div className="mt-2">
                <Badge variant="info">{displayUser?.role ?? 'admin'}</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Change password */}
        <Card title="Change Password">
          <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
            <PasswordInput
              label="Current Password"
              autoComplete="current-password"
              error={errors.oldPassword?.message}
              {...register('oldPassword', { required: 'Current password is required' })}
            />
            <PasswordInput
              label="New Password"
              autoComplete="new-password"
              error={errors.newPassword?.message}
              {...register('newPassword', {
                required: 'New password is required',
                minLength: { value: 8, message: 'Must be at least 8 characters' },
              })}
            />
            <PasswordInput
              label="Confirm New Password"
              autoComplete="new-password"
              error={errors.confirmNewPassword?.message}
              {...register('confirmNewPassword', {
                required: 'Please confirm your new password',
                validate: (val) => val === watch('newPassword') || 'Passwords do not match',
              })}
            />
            <Button type="submit" loading={changePasswordMutation.isPending}>
              Update Password
            </Button>
          </form>
        </Card>

        {/* Logout */}
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">Sign out</p>
              <p className="text-xs text-[#666] mt-0.5">End your current admin session.</p>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut size={14} />
              Logout
            </Button>
          </div>
        </Card>
      </section>

      {/* ── App Configuration ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-[#999] uppercase tracking-widest">App Configuration</h2>

        <Card title="Reference">
          <dl className="space-y-4 text-sm">
            <div className="flex flex-col gap-1">
              <dt className="text-[#555] text-xs uppercase tracking-wide">API Base URL</dt>
              <dd className="text-white font-mono break-all">{apiBaseUrl}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-[#555] text-xs uppercase tracking-wide">Admin Role</dt>
              <dd>
                <Badge variant="info">{displayUser?.role ?? 'admin'}</Badge>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-[#555] text-xs uppercase tracking-wide">Admin ID</dt>
              <dd className="text-white font-mono text-xs">{displayUser?._id ?? '—'}</dd>
            </div>
          </dl>
        </Card>

        <Card title="API Health">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTestConnection}
              disabled={testStatus === 'loading'}
            >
              {testStatus === 'loading' ? (
                <Loader2 size={13} className="animate-spin" />
              ) : null}
              Test API Connection
            </Button>

            {testStatus === 'success' && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-400">
                <CheckCircle size={13} />
                Connected
              </span>
            )}
            {testStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                <XCircle size={13} />
                Unreachable
              </span>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
