import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { storesApi, type Store, type CreateStorePayload, type StoreStatus, type StoreType } from '../../api/stores.api';
import adminApiClient from '../../api/adminApiClient';

interface UserOption {
  _id: string;
  name: string;
  role: string;
}

interface FormValues {
  name: string;
  storeNumber: string;
  status: StoreStatus;
  storeType: StoreType;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  expectedOpenDate: string;
  managerId: string;
  phone: string;
  email: string;
  isActive: boolean;
}

interface Props {
  store: Store | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function StoreFormModal({ store, onClose, onSuccess }: Props) {
  const isEdit = Boolean(store);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState(store?.coverPhoto ?? '');
  const [managerSearch, setManagerSearch] = useState('');
  const [managerOptions, setManagerOptions] = useState<UserOption[]>([]);
  const [managerLoading, setManagerLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: store?.name ?? '',
      storeNumber: store?.storeNumber ?? '',
      status: store?.status ?? 'open',
      storeType: store?.storeType ?? 'standard',
      street: store?.address.street ?? '',
      city: store?.address.city ?? '',
      state: store?.address.state ?? '',
      country: store?.address.country ?? '',
      postalCode: store?.address.postalCode ?? '',
      expectedOpenDate: store?.expectedOpenDate?.slice(0, 10) ?? '',
      managerId: typeof store?.managerId === 'object' ? store?.managerId?._id ?? '' : '',
      phone: store?.phone ?? '',
      email: store?.email ?? '',
      isActive: store?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (!managerSearch.trim()) return;
    const timer = setTimeout(async () => {
      setManagerLoading(true);
      try {
        const res = await adminApiClient.get<{ data: UserOption[] }>('/users', {
          params: { search: managerSearch, role: 'store_manager', limit: 10 },
        });
        setManagerOptions(res.data.data ?? []);
      } catch {
        setManagerOptions([]);
      } finally {
        setManagerLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [managerSearch]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError('');
    try {
      let coverPhotoUrl = store?.coverPhoto;

      if (coverFile) {
        const form = new FormData();
        form.append('photo', coverFile);
        const uploadRes = await adminApiClient.post<{ data: { url: string } }>(
          '/upload/recipe-photo',
          form,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        coverPhotoUrl = uploadRes.data.data?.url ?? coverPhotoUrl;
      }

      const payload: CreateStorePayload = {
        name: values.name,
        storeNumber: values.storeNumber,
        status: values.status,
        storeType: values.storeType,
        address: {
          street: values.street,
          city: values.city,
          state: values.state,
          country: values.country,
          postalCode: values.postalCode || undefined,
        },
        expectedOpenDate: values.expectedOpenDate || undefined,
        managerId: values.managerId || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        coverPhoto: coverPhotoUrl,
        isActive: values.isActive,
      };

      if (isEdit && store) {
        await storesApi.update(store._id, payload);
      } else {
        await storesApi.create(payload);
      }
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save store';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? 'Edit Store' : 'New Store'}
          </h2>
          <button onClick={onClose} className="text-[#666] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-lg px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Name + Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#666] mb-1">Store Name *</label>
              <input
                {...register('name', { required: 'Required' })}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#D62B2B]"
                placeholder="Java Times Caffè #4"
              />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-[#666] mb-1">Store Number *</label>
              <input
                {...register('storeNumber', { required: 'Required' })}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#D62B2B]"
                placeholder="004"
              />
              {errors.storeNumber && (
                <p className="text-xs text-red-400 mt-1">{errors.storeNumber.message}</p>
              )}
            </div>
          </div>

          {/* Status + Store Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#666] mb-1">Status</label>
              <select
                {...register('status')}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D62B2B]"
              >
                <option value="planning">Planning</option>
                <option value="construction">Construction</option>
                <option value="open">Open</option>
                <option value="temporarily_closed">Temporarily Closed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#666] mb-1">Store Type *</label>
              <select
                {...register('storeType', { required: 'Required' })}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D62B2B]"
              >
                <option value="standard">Standard</option>
                <option value="flagship">Flagship</option>
                <option value="kiosk">Kiosk</option>
                <option value="drive-thru">Drive-Thru</option>
              </select>
              {errors.storeType && <p className="text-xs text-red-400 mt-1">{errors.storeType.message}</p>}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs text-[#666] mb-1">Street</label>
            <input
              {...register('street')}
              className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#D62B2B]"
              placeholder="123 Main Street"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#666] mb-1">City</label>
              <input
                {...register('city')}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#D62B2B]"
                placeholder="New York"
              />
            </div>
            <div>
              <label className="block text-xs text-[#666] mb-1">State</label>
              <input
                {...register('state')}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#D62B2B]"
                placeholder="NY"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#666] mb-1">Country</label>
              <input
                {...register('country')}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#D62B2B]"
                placeholder="USA"
              />
            </div>
            <div>
              <label className="block text-xs text-[#666] mb-1">Postal Code</label>
              <input
                {...register('postalCode')}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#D62B2B]"
                placeholder="10001"
              />
            </div>
          </div>

          {/* Expected Open Date */}
          <div>
            <label className="block text-xs text-[#666] mb-1">Expected Open Date</label>
            <input
              {...register('expectedOpenDate')}
              type="date"
              className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D62B2B]"
            />
          </div>

          {/* Manager search */}
          <div>
            <label className="block text-xs text-[#666] mb-1">Manager (Store Leader)</label>
            <input
              value={managerSearch}
              onChange={(e) => setManagerSearch(e.target.value)}
              className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#D62B2B]"
              placeholder="Search by name..."
            />
            {managerLoading && <p className="text-xs text-[#555] mt-1">Searching...</p>}
            {managerOptions.length > 0 && (
              <div className="mt-1 bg-[#141414] border border-[#2A2A2A] rounded-lg overflow-hidden">
                {managerOptions.map((u) => (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => {
                      setManagerSearch(u.name);
                      setManagerOptions([]);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-[#ccc] hover:bg-[#242424] transition-colors"
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            )}
            <input type="hidden" {...register('managerId')} />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#666] mb-1">Phone</label>
              <input
                {...register('phone')}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#D62B2B]"
                placeholder="+1 555 000 0000"
              />
            </div>
            <div>
              <label className="block text-xs text-[#666] mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#D62B2B]"
                placeholder="store4@javatimes.com"
              />
            </div>
          </div>

          {/* Cover photo */}
          <div>
            <label className="block text-xs text-[#666] mb-1">Cover Photo</label>
            {coverPreview && (
              <img
                src={coverPreview}
                alt="Cover preview"
                className="w-full h-28 object-cover rounded-lg mb-2"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="w-full text-sm text-[#666] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#242424] file:text-[#ccc] hover:file:bg-[#2A2A2A] cursor-pointer"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <input
              {...register('isActive')}
              type="checkbox"
              id="isActive"
              className="w-4 h-4 accent-[#D62B2B]"
            />
            <label htmlFor="isActive" className="text-sm text-[#ccc]">
              Active
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-[#999] border border-[#2A2A2A] rounded-lg hover:border-[#333] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-semibold bg-[#D62B2B] hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
