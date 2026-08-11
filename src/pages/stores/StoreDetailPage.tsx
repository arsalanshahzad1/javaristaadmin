import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Mail, Phone, User, MapPin, Trash2, Upload, Plus } from 'lucide-react';
import { storesApi, type StoreStatus, type StoreEmployee } from '../../api/stores.api';
import { StoreFormModal } from './StoreFormModal';
import { CreateEmployeeModal } from './CreateEmployeeModal';
import { useAuth } from '../../hooks/useAuth';
import { ADMIN_ROLES } from '../../types';

const STATUS_STYLES: Record<StoreStatus, { label: string; className: string }> = {
  planning: { label: 'Planning', className: 'bg-[#2A2A2A] text-[#999]' },
  construction: { label: 'Construction', className: 'bg-amber-900/30 text-amber-400' },
  open: { label: 'Open', className: 'bg-green-900/30 text-green-400' },
  temporarily_closed: { label: 'Temp. Closed', className: 'bg-orange-900/30 text-orange-400' },
  closed: { label: 'Closed', className: 'bg-red-900/30 text-red-400' },
};

interface Props {
  idOverride?: string;
  hideBackButton?: boolean;
}

export function StoreDetailPage({ idOverride, hideBackButton }: Props = {}) {
  const params = useParams<{ id: string }>();
  const id = idOverride ?? params.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isCorporate = Boolean(user && ADMIN_ROLES.includes(user.role));
  const [editOpen, setEditOpen] = useState(false);
  const [employeeModal, setEmployeeModal] = useState<{ open: boolean; employee: StoreEmployee | null }>({
    open: false,
    employee: null,
  });
  const [activeTab, setActiveTab] = useState<'info' | 'employees'>('info');
  const [uploading, setUploading] = useState(false);

  const { data: store, isLoading } = useQuery({
    queryKey: ['store', id],
    queryFn: () => storesApi.getById(id!),
    enabled: Boolean(id),
  });

  const { data: employees = [], refetch: refetchEmployees } = useQuery<StoreEmployee[]>({
    queryKey: ['store-employees', id],
    queryFn: () => storesApi.listEmployees(id!),
    enabled: Boolean(id),
  });

  const deactivateEmployeeMutation = useMutation({
    mutationFn: (employeeId: string) => storesApi.deactivateEmployee(id!, employeeId),
    onSuccess: () => refetchEmployees(),
  });

  const removePhotoMutation = useMutation({
    mutationFn: (photoUrl: string) => storesApi.removePhoto(id!, photoUrl),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['store', id] }),
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      await storesApi.addPhoto(id, file);
      queryClient.invalidateQueries({ queryKey: ['store', id] });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="h-48 bg-[#1A1A1A] rounded-xl animate-pulse mb-6" />
        <div className="h-32 bg-[#1A1A1A] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-6 text-center text-[#666]">
        Store not found.{' '}
        <button onClick={() => navigate('/stores')} className="text-[#D62B2B] hover:underline">
          Back to stores
        </button>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[store.status] ?? STATUS_STYLES.planning;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      {!hideBackButton && (
        <button
          onClick={() => navigate('/stores')}
          className="flex items-center gap-1.5 text-sm text-[#666] hover:text-white mb-5 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Stores
        </button>
      )}

      {/* Header card */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden mb-5">
        <div className="h-40 bg-[#141414] relative">
          {store.coverPhoto ? (
            <img src={store.coverPhoto} alt={store.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 size={48} className="text-[#333]" />
            </div>
          )}
        </div>
        <div className="px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-white">{store.name}</h1>
              <span className="text-xs text-[#555] bg-[#242424] px-1.5 py-0.5 rounded font-mono">
                #{store.storeNumber}
              </span>
            </div>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyle.className}`}>
              {statusStyle.label}
            </span>
          </div>
          {isCorporate && (
            <button
              onClick={() => setEditOpen(true)}
              className="px-4 py-2 text-sm font-semibold bg-[#D62B2B] hover:bg-red-700 text-white rounded-lg transition-colors flex-shrink-0"
            >
              Edit Store
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-[#2A2A2A]">
        {(['info', 'employees'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-[#D62B2B]'
                : 'text-[#666] hover:text-[#ccc]'
            }`}
          >
            {tab === 'employees' ? `Employees (${employees.length})` : 'Info'}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="space-y-5">
          {/* Info grid */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Store Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow
                icon={<MapPin size={14} />}
                label="Address"
                value={[
                  store.address.street,
                  store.address.city,
                  store.address.state,
                  store.address.country,
                ]
                  .filter(Boolean)
                  .join(', ') || '—'}
              />
              <InfoRow
                icon={<Phone size={14} />}
                label="Phone"
                value={store.phone || '—'}
              />
              <InfoRow
                icon={<Mail size={14} />}
                label="Email"
                value={store.email || '—'}
              />
              <InfoRow
                icon={<User size={14} />}
                label="Manager"
                value={
                  typeof store.managerId === 'object' && store.managerId
                    ? store.managerId.name
                    : '—'
                }
              />
              {store.openedAt && (
                <InfoRow
                  icon={<Building2 size={14} />}
                  label="Opened"
                  value={new Date(store.openedAt).toLocaleDateString()}
                />
              )}
              {store.expectedOpenDate && (
                <InfoRow
                  icon={<Building2 size={14} />}
                  label="Expected Open"
                  value={new Date(store.expectedOpenDate).toLocaleDateString()}
                />
              )}
            </div>
          </div>

          {/* Operating hours */}
          {store.operatingHours && store.operatingHours.length > 0 && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Operating Hours</h2>
              <div className="space-y-1">
                {store.operatingHours.map((h, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-[#1F1F1F] last:border-0">
                    <span className="text-[#999]">{h.day}</span>
                    <span className={h.isClosed ? 'text-[#555]' : 'text-white'}>
                      {h.isClosed ? 'Closed' : `${h.open} – ${h.close}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photos */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Photos</h2>
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#ccc] hover:text-white bg-[#242424] hover:bg-[#2A2A2A] rounded-lg transition-colors cursor-pointer">
                <Upload size={12} />
                {uploading ? 'Uploading…' : 'Add Photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            {store.photos.length === 0 ? (
              <p className="text-sm text-[#555]">No photos yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {store.photos.map((url, i) => (
                  <div key={i} className="relative group aspect-video rounded-lg overflow-hidden bg-[#141414]">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhotoMutation.mutate(url)}
                      className="absolute top-1 right-1 p-1 bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setEmployeeModal({ open: true, employee: null })}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-[#D62B2B] hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Plus size={14} />
              New Employee
            </button>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
            {employees.length === 0 ? (
              <div className="py-12 text-center text-[#555]">No employees assigned to this store.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="text-left px-4 py-3 text-xs text-[#666] font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-xs text-[#666] font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-xs text-[#666] font-medium">Role</th>
                    <th className="text-left px-4 py-3 text-xs text-[#666] font-medium">Employee Role</th>
                    <th className="text-right px-4 py-3 text-xs text-[#666] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp._id} className="border-b border-[#1F1F1F] last:border-0 hover:bg-[#1F1F1F]">
                      <td className="px-4 py-3 text-white">{emp.name}</td>
                      <td className="px-4 py-3 text-[#999]">{emp.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-[#242424] text-[#aaa] px-2 py-0.5 rounded">
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#999]">{emp.employeeRoleId?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setEmployeeModal({ open: true, employee: emp })}
                          className="text-xs text-[#999] hover:text-white mr-3 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deactivateEmployeeMutation.mutate(emp._id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {editOpen && (
        <StoreFormModal
          store={store}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['store', id] });
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            setEditOpen(false);
          }}
        />
      )}

      {employeeModal.open && (
        <CreateEmployeeModal
          storeId={id!}
          isStoreManager={!isCorporate}
          employee={employeeModal.employee}
          onClose={() => setEmployeeModal({ open: false, employee: null })}
          onSuccess={() => {
            refetchEmployees();
            setEmployeeModal({ open: false, employee: null });
          }}
        />
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-[#555] mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-[#555]">{label}</p>
        <p className="text-sm text-[#ccc] mt-0.5">{value}</p>
      </div>
    </div>
  );
}
