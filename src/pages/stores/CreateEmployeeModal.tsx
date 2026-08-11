import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Eye, EyeOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { storesApi, type StoreEmployee } from '../../api/stores.api';
import { employeeRolesApi } from '../../api/employeeRoles.api';

const FRONT_LINE_ROLES = ['barista', 'trainee', 'shift_supervisor', 'assistant_manager'];
const ALL_STORE_ROLES = ['store_manager', 'assistant_manager', 'shift_supervisor', 'barista', 'trainee'];

const ROLE_LABELS: Record<string, string> = {
  store_manager: 'Store Manager',
  assistant_manager: 'Assistant Manager',
  shift_supervisor: 'Shift Supervisor',
  barista: 'Barista',
  trainee: 'Trainee',
};

interface FormValues {
  name: string;
  email: string;
  password: string;
  role: string;
  employeeRoleId: string;
}

interface Props {
  storeId: string;
  isStoreManager: boolean;
  employee?: StoreEmployee | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateEmployeeModal({ storeId, isStoreManager, employee, onClose, onSuccess }: Props) {
  const isEdit = Boolean(employee);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const availableRoles = isStoreManager ? FRONT_LINE_ROLES : ALL_STORE_ROLES;

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: employee?.name ?? '',
      email: employee?.email ?? '',
      password: '',
      role: employee?.role ?? availableRoles[0],
      employeeRoleId: employee?.employeeRoleId?._id ?? '',
    },
  });

  const { data: assignableRoles = [] } = useQuery({
    queryKey: ['assignable-employee-roles'],
    queryFn: async () => {
      const res = await employeeRolesApi.assignable();
      return res.data.data;
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError('');
    try {
      if (isEdit && employee) {
        await storesApi.updateEmployee(storeId, employee._id, {
          name: values.name,
          role: values.role,
          employeeRoleId: values.employeeRoleId || null,
        });
      } else {
        await storesApi.createEmployee(storeId, {
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role,
          employeeRoleId: values.employeeRoleId || null,
        });
      }
      onSuccess();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? 'Edit Employee' : 'New Employee'}
          </h2>
          <button onClick={onClose} className="text-[#666] hover:text-dark transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <Input
            label="Full Name"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />

          <Input
            label="Email"
            type="email"
            disabled={isEdit}
            error={errors.email?.message}
            {...register('email', { required: 'Email is required' })}
          />

          {!isEdit && (
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                error={errors.password?.message}
                hint="At least 8 characters"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Must be at least 8 characters' },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-[#666] hover:text-dark transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#999] font-medium">Role</label>
            <select
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] transition-colors"
              {...register('role', { required: true })}
            >
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role] ?? role}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#999] font-medium">Employee Role (optional)</label>
            <select
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] transition-colors"
              {...register('employeeRoleId')}
            >
              <option value="">None</option>
              {assignableRoles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 mt-2">
            <Button type="button" variant="ghost" fullWidth onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth loading={loading}>
              {isEdit ? 'Save Changes' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}