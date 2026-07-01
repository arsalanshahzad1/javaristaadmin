import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldCheck, Users, Edit2, PowerOff, ChevronDown, ChevronUp, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import { employeeRolesApi, type EmployeeRoleDoc, type PermissionRegistry } from '../../api/employeeRoles.api';

// ── Helpers ─────────────────────────────────────────────────────────────────

function getErrorMessage(err: unknown) {
  return (err as AxiosError<{ message?: string }>).response?.data?.message ?? 'Something went wrong';
}

// ── Permission Checklist ─────────────────────────────────────────────────────

function PermissionChecklist({
  registry,
  selected,
  onChange,
}: {
  registry: PermissionRegistry;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(Object.keys(registry.groups)));

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  function toggleGroup(keys: string[]) {
    const next = new Set(selected);
    const allChecked = keys.every((k) => next.has(k));
    if (allChecked) keys.forEach((k) => next.delete(k));
    else keys.forEach((k) => next.add(k));
    onChange(next);
  }

  function toggleSection(group: string) {
    const next = new Set(expanded);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setExpanded(next);
  }

  return (
    <div className="space-y-3">
      {Object.entries(registry.groups).map(([group, keys]) => {
        const allChecked = keys.every((k) => selected.has(k));
        const someChecked = keys.some((k) => selected.has(k));
        const open = expanded.has(group);
        return (
          <div key={group} className="rounded-lg border border-[#2A2A2A] overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(group)}
              className="flex w-full items-center justify-between bg-[#1A1A1A] px-4 py-2.5 text-left"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked; }}
                  onChange={() => toggleGroup(keys)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 accent-[#D62B2B]"
                />
                <span className="text-sm font-semibold text-white">{group}</span>
                <span className="text-xs text-[#666]">
                  {keys.filter((k) => selected.has(k)).length}/{keys.length}
                </span>
              </div>
              {open ? <ChevronUp size={14} className="text-[#666]" /> : <ChevronDown size={14} className="text-[#666]" />}
            </button>
            {open && (
              <div className="divide-y divide-[#242424]">
                {keys.map((key) => (
                  <label key={key} className="flex cursor-pointer items-start gap-3 bg-[#111] px-5 py-2.5 hover:bg-[#161616]">
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      onChange={() => toggle(key)}
                      className="mt-0.5 h-4 w-4 accent-[#D62B2B]"
                    />
                    <div>
                      <p className="text-xs font-mono text-[#D62B2B]">{key}</p>
                      <p className="text-xs text-[#888] mt-0.5">{registry.permissions[key]}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Role Form Modal ──────────────────────────────────────────────────────────

function RoleModal({
  registry,
  initial,
  onClose,
  onSave,
  saving,
}: {
  registry: PermissionRegistry;
  initial?: EmployeeRoleDoc;
  onClose: () => void;
  onSave: (data: { name: string; description: string; permissions: string[] }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [permissions, setPermissions] = useState<Set<string>>(new Set(initial?.permissions ?? []));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    onSave({ name: name.trim(), description: description.trim(), permissions: [...permissions] });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[#2A2A2A] bg-[#141414]">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
          <h2 className="text-base font-semibold text-white">
            {initial ? 'Edit Employee Role' : 'Create Employee Role'}
          </h2>
          <button type="button" onClick={onClose} className="text-[#666] hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col min-h-0 flex-1">
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#aaa] mb-1.5">Role Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lead Barista"
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#aaa] mb-1.5">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this role's responsibilities"
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[#aaa]">Permissions</label>
                <span className="text-xs text-[#666]">{permissions.size} selected</span>
              </div>
              <PermissionChecklist registry={registry} selected={permissions} onChange={setPermissions} />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-[#2A2A2A] px-5 py-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ddd] hover:bg-[#242424]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#b82424] disabled:opacity-50"
            >
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Deactivate Dialog ─────────────────────────────────────────────────

function ConfirmDeactivate({
  role,
  onClose,
  onConfirm,
  loading,
}: {
  role: EmployeeRoleDoc;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#2A2A2A] bg-[#141414] p-6">
        <h2 className="text-base font-semibold text-white">Deactivate role?</h2>
        {role.assignedUserCount > 0 ? (
          <p className="mt-2 text-sm text-red-300">
            This role still has <strong>{role.assignedUserCount}</strong> user(s) assigned.
            Reassign them first before deactivating.
          </p>
        ) : (
          <p className="mt-2 text-sm text-[#888]">
            "<strong className="text-white">{role.name}</strong>" will be deactivated. No users are
            currently assigned — you can re-activate it later from the edit dialog.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ddd] hover:bg-[#242424]">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || role.assignedUserCount > 0}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-40"
          >
            {loading ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function EmployeeRolesPage() {
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EmployeeRoleDoc | null>(null);
  const [deactivating, setDeactivating] = useState<EmployeeRoleDoc | null>(null);

  const rolesQuery = useQuery({
    queryKey: ['employee-roles', showInactive],
    queryFn: () => employeeRolesApi.list({ includeInactive: showInactive }).then((r) => r.data.data),
  });

  const permissionsQuery = useQuery({
    queryKey: ['employee-permissions'],
    queryFn: () => employeeRolesApi.getPermissions().then((r) => r.data.data),
    staleTime: Infinity,
  });

  const createMutation = useMutation({
    mutationFn: employeeRolesApi.create,
    onSuccess: () => {
      toast.success('Role created');
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ['employee-roles'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof employeeRolesApi.update>[1] }) =>
      employeeRolesApi.update(id, body),
    onSuccess: () => {
      toast.success('Role updated');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['employee-roles'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => employeeRolesApi.deactivate(id),
    onSuccess: () => {
      toast.success('Role deactivated');
      setDeactivating(null);
      queryClient.invalidateQueries({ queryKey: ['employee-roles'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const roles = rolesQuery.data ?? [];
  const registry = permissionsQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Employee Roles</h1>
          <p className="mt-1 text-sm text-[#777]">
            Define custom roles with granular permissions. Assign them to store-level employees
            from the Users screen.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[#aaa] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 accent-[#D62B2B]"
            />
            Show inactive
          </label>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#b82424]"
          >
            <Plus size={16} />
            New Role
          </button>
        </div>
      </div>

      {rolesQuery.isError && (
        <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm text-red-300">
          Failed to load roles. <button type="button" onClick={() => rolesQuery.refetch()} className="underline">Retry</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rolesQuery.isLoading
          ? [0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]" />
            ))
          : roles.map((role) => (
              <div
                key={role._id}
                className={`flex flex-col rounded-xl border bg-[#1A1A1A] p-5 ${
                  role.isActive ? 'border-[#2A2A2A]' : 'border-dashed border-[#3A3A3A] opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-white">{role.name}</h3>
                    {role.description && (
                      <p className="mt-0.5 text-xs text-[#777] line-clamp-2">{role.description}</p>
                    )}
                  </div>
                  {!role.isActive && (
                    <span className="shrink-0 rounded border border-yellow-700/60 bg-yellow-900/20 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="mt-4 flex gap-4 text-xs text-[#666]">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={12} className="text-[#D62B2B]" />
                    {role.permissionCount} permission{role.permissionCount !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {role.assignedUserCount} user{role.assignedUserCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {role.permissions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {role.permissions.slice(0, 4).map((p) => (
                      <span key={p} className="rounded bg-[#242424] px-1.5 py-0.5 font-mono text-[10px] text-[#D62B2B]">
                        {p}
                      </span>
                    ))}
                    {role.permissions.length > 4 && (
                      <span className="rounded bg-[#242424] px-1.5 py-0.5 text-[10px] text-[#666]">
                        +{role.permissions.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-4 flex gap-2 pt-2 border-t border-[#242424]">
                  <button
                    type="button"
                    onClick={() => setEditing(role)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                  {role.isActive && (
                    <button
                      type="button"
                      onClick={() => setDeactivating(role)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/20"
                    >
                      <PowerOff size={12} />
                      Deactivate
                    </button>
                  )}
                  {!role.isActive && (
                    <button
                      type="button"
                      onClick={() => updateMutation.mutate({ id: role._id, body: { isActive: true } })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-green-900/60 px-3 py-1.5 text-xs text-green-300 hover:bg-green-900/20"
                    >
                      Re-activate
                    </button>
                  )}
                </div>
              </div>
            ))}
      </div>

      {registry && creating && (
        <RoleModal
          registry={registry}
          onClose={() => setCreating(false)}
          onSave={(data) => createMutation.mutate(data)}
          saving={createMutation.isPending}
        />
      )}

      {registry && editing && (
        <RoleModal
          registry={registry}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => updateMutation.mutate({ id: editing._id, body: data })}
          saving={updateMutation.isPending}
        />
      )}

      {deactivating && (
        <ConfirmDeactivate
          role={deactivating}
          onClose={() => setDeactivating(null)}
          onConfirm={() => deactivateMutation.mutate(deactivating._id)}
          loading={deactivateMutation.isPending}
        />
      )}
    </div>
  );
}
