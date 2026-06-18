import { useMemo, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { Toggle } from '../../components/ui/Toggle';
import { useAuth } from '../../hooks/useAuth';
import { formatDateTime } from '../../utils/formatters';

type Tab = 'profile' | 'security' | 'app';
type PasswordField = 'current' | 'next' | 'confirm';
type DangerAction = 'brewLogs' | 'seedData' | null;

const tabs: Array<{ key: Tab; label: string }> = [
  { key: 'profile', label: 'Profile' },
  { key: 'security', label: 'Security' },
  { key: 'app', label: 'App Settings' },
];

function getInitials(name?: string) {
  if (!name) return 'A';

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function passwordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  return score;
}

function PasswordInput({
  label,
  value,
  visible,
  onChange,
  onToggle,
}: {
  label: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        label={label}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-9 text-[#666] hover:text-white transition-colors cursor-pointer"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        <Icon size={16} />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [fullName, setFullName] = useState(user?.name ?? '');
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [visiblePasswords, setVisiblePasswords] = useState<Record<PasswordField, boolean>>({
    current: false,
    next: false,
    confirm: false,
  });
  const [featureFlags, setFeatureFlags] = useState({
    premiumContent: true,
    registration: true,
    espressoDialIn: true,
    coffeeJournal: true,
  });
  const [dangerAction, setDangerAction] = useState<DangerAction>(null);

  const strength = useMemo(() => passwordStrength(passwords.next), [passwords.next]);
  const strengthLabel = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength];

  const updateProfileMutation = useMutation({
    mutationFn: () => authApi.updateProfile({ name: fullName.trim() }),
    onSuccess: (response) => {
      setUser(response.data.data);
      toast.success('Profile updated');
    },
    onError: () => toast.error('Unable to update profile'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => authApi.changePassword(passwords.current, passwords.next),
    onSuccess: () => {
      setPasswords({ current: '', next: '', confirm: '' });
      toast.success('Password updated');
    },
    onError: () => toast.error('Unable to update password'),
  });

  const handleSaveProfile = (event: FormEvent) => {
    event.preventDefault();

    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    updateProfileMutation.mutate();
  };

  const handlePasswordSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!passwords.current || !passwords.next || !passwords.confirm) {
      toast.error('Fill in all password fields');
      return;
    }

    if (passwords.next !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }

    changePasswordMutation.mutate();
  };

  const confirmDangerAction = () => {
    toast.success(dangerAction === 'brewLogs' ? 'Brew logs cleared' : 'Seed data reset');
    setDangerAction(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" />

      <div className="flex gap-1 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer font-medium ${
              activeTab === tab.key
                ? 'bg-[#D62B2B] text-white'
                : 'text-[#666] hover:text-white hover:bg-[#242424] border border-[#2A2A2A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <Card className="max-w-2xl">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="flex flex-col items-start gap-3">
              <div className="h-20 w-20 rounded-full bg-[#D62B2B] flex items-center justify-center text-2xl font-semibold text-white">
                {getInitials(user?.name)}
              </div>
              <button type="button" className="text-sm text-[#D62B2B] hover:text-white transition-colors cursor-pointer">
                Change Avatar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
              <Input label="Email" value={user?.email ?? ''} readOnly />
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-[#999] font-medium">Role</span>
                <div className="h-10 flex items-center">
                  <Badge variant="info">{user?.role ?? 'admin'}</Badge>
                </div>
              </div>
            </div>

            <Button type="submit" loading={updateProfileMutation.isPending}>
              Save Profile
            </Button>
          </form>
        </Card>
      )}

      {activeTab === 'security' && (
        <div className="space-y-5 max-w-2xl">
          <Card title="Change Password">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <PasswordInput
                label="Current Password"
                value={passwords.current}
                visible={visiblePasswords.current}
                onChange={(value) => setPasswords((current) => ({ ...current, current: value }))}
                onToggle={() => setVisiblePasswords((current) => ({ ...current, current: !current.current }))}
              />
              <div>
                <PasswordInput
                  label="New Password"
                  value={passwords.next}
                  visible={visiblePasswords.next}
                  onChange={(value) => setPasswords((current) => ({ ...current, next: value }))}
                  onToggle={() => setVisiblePasswords((current) => ({ ...current, next: !current.next }))}
                />
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-[#2A2A2A] overflow-hidden">
                    <div
                      className="h-full bg-[#D62B2B] transition-all"
                      style={{ width: `${Math.max(strength, 1) * 25}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-[#666]">Password strength: {strengthLabel}</p>
                </div>
              </div>
              <PasswordInput
                label="Confirm Password"
                value={passwords.confirm}
                visible={visiblePasswords.confirm}
                onChange={(value) => setPasswords((current) => ({ ...current, confirm: value }))}
                onToggle={() => setVisiblePasswords((current) => ({ ...current, confirm: !current.confirm }))}
              />
              <Button type="submit" loading={changePasswordMutation.isPending}>
                Update Password
              </Button>
            </form>
          </Card>

          <Card title="Active Sessions">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#666]">Browser</p>
                <p className="mt-1 text-white">Current browser</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#666]">Login Time</p>
                <p className="mt-1 text-white">{formatDateTime(new Date())}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#666]">IP</p>
                <p className="mt-1 text-white">192.168.0.1</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'app' && (
        <div className="space-y-5 max-w-3xl">
          <Card title="Feature Flags">
            <div className="divide-y divide-[#2A2A2A]">
              <FeatureFlag
                label="Premium Content Enabled"
                checked={featureFlags.premiumContent}
                onChange={(value) => setFeatureFlags((current) => ({ ...current, premiumContent: value }))}
              />
              <FeatureFlag
                label="New User Registration"
                checked={featureFlags.registration}
                onChange={(value) => setFeatureFlags((current) => ({ ...current, registration: value }))}
              />
              <FeatureFlag
                label="Espresso Dial-In Feature"
                checked={featureFlags.espressoDialIn}
                onChange={(value) => setFeatureFlags((current) => ({ ...current, espressoDialIn: value }))}
              />
              <FeatureFlag
                label="Coffee Journal"
                checked={featureFlags.coffeeJournal}
                onChange={(value) => setFeatureFlags((current) => ({ ...current, coffeeJournal: value }))}
              />
            </div>
          </Card>

          <Card title="Danger Zone" className="border-red-900/60">
            <div className="space-y-4">
              <DangerRow
                title="Clear all brew logs"
                description="Remove every recorded brew session from the admin dataset."
                action="Clear Brew Logs"
                onClick={() => setDangerAction('brewLogs')}
              />
              <DangerRow
                title="Reset seed data"
                description="Restore the application demo data to its seeded defaults."
                action="Reset Seed Data"
                onClick={() => setDangerAction('seedData')}
              />
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        isOpen={dangerAction !== null}
        onClose={() => setDangerAction(null)}
        onConfirm={confirmDangerAction}
        title={dangerAction === 'brewLogs' ? 'Clear all brew logs?' : 'Reset seed data?'}
        message="This action cannot be undone."
        confirmLabel="Confirm"
      />
    </div>
  );
}

function FeatureFlag({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <span className="text-sm text-white">{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function DangerRow({
  title,
  description,
  action,
  onClick,
}: {
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-red-900/40 bg-red-950/10 p-4">
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-1 text-xs text-[#999]">{description}</p>
      </div>
      <Button variant="danger" onClick={onClick}>
        {action}
      </Button>
    </div>
  );
}
