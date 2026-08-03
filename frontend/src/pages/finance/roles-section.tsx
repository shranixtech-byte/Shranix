import {
  AlertCircle,
  Check,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Shield,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiRequest } from '@/services/api-client';

import { ErrorBanner, SaveButton, SectionCard } from './settings-ui';

// ── Constants ──────────────────────────────────────────────
interface RoleRecord {
  id: string;
  name: string;
  description?: string | null;
  isSystem?: boolean;
}
interface UserRecord {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

// 9 canonical actions — app ke guard codes se map (View→read, Edit→update …)
const MATRIX_ACTIONS = [
  { code: 'read', label: 'View' },
  { code: 'create', label: 'Create' },
  { code: 'update', label: 'Edit' },
  { code: 'delete', label: 'Delete' },
  { code: 'approve', label: 'Approve' },
  { code: 'export', label: 'Export' },
  { code: 'print', label: 'Print' },
  { code: 'cancel', label: 'Cancel' },
  { code: 'restore', label: 'Restore' },
];

const MATRIX_RESOURCES = [
  { code: 'sales', label: 'Sales', emoji: '🧾' },
  { code: 'purchase', label: 'Purchase', emoji: '🛒' },
  { code: 'inventory', label: 'Stock & Inventory', emoji: '📦' },
  { code: 'finance', label: 'Finance & Accounts', emoji: '💰' },
  { code: 'gst', label: 'GST', emoji: '🧾' },
  { code: 'items', label: 'Products & Items', emoji: '🏷️' },
  { code: 'companies', label: 'Company', emoji: '🏢' },
  { code: 'users', label: 'Users', emoji: '👥' },
  { code: 'roles', label: 'Roles', emoji: '🛡️' },
  { code: 'reports', label: 'Reports', emoji: '📈' },
  { code: 'workflow', label: 'Approvals', emoji: '✅' },
  { code: 'dms', label: 'Documents', emoji: '📄' },
  { code: 'ai', label: 'AI Assistant', emoji: '🤖' },
];

// Guard family mapping — masters.* → companies.read etc. (display accuracy)
const FAMILY: Record<string, string[]> = {
  masters: [
    'companies',
    'financial-years',
    'branches',
    'warehouses',
    'units',
    'categories',
    'brands',
    'tax-groups',
    'gst-rates',
  ],
  inventory: [
    'items',
    'item-groups',
    'item-variants',
    'item-pricing',
    'barcodes',
    'hsn-codes',
    'stock-opening',
    'item-images',
    'inventory-settings',
  ],
  assets: ['asset', 'asset-category'],
};

const ACTION_CODES = MATRIX_ACTIONS.map((a) => a.code);

function hasCoverage(perms: string[], resource: string, action: string): boolean {
  if (perms.includes('*.*')) {
    return true;
  }
  if (perms.includes(`${resource}.*`)) {
    return true;
  }
  if (perms.includes(`${resource}.${action}`)) {
    return true;
  }
  // Family wildcards (masters.* covers companies.read …)
  for (const [parent, kids] of Object.entries(FAMILY)) {
    if (kids.includes(resource) && perms.includes(`${parent}.*`)) {
      return true;
    }
  }
  return false;
}

// ── Component ──────────────────────────────────────────────
export function RolesSection() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [perms, setPerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Role form (create/edit)
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  // Users assignment
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roleUsers, setRoleUsers] = useState<string[]>([]);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);

  const selected = useMemo(
    () => roles.find((r) => r.id === selectedId) ?? null,
    [roles, selectedId],
  );
  const isFullAccess = perms.includes('*.*');
  const isSystem = selected?.isSystem === true;

  const loadRoles = useCallback(async () => {
    setError(null);
    try {
      const res = (await apiRequest<{ data?: RoleRecord[] }>('/roles')) as unknown;
      const rows = (
        Array.isArray(res) ? res : ((res as { data?: RoleRecord[] })?.data ?? [])
      ) as RoleRecord[];
      setRoles(rows);
      if (!rows.some((r) => r.id === selectedId)) {
        setSelectedId(rows[0]?.id ?? '');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedId]);

  const loadRoleDetail = useCallback(async (roleId: string) => {
    setError(null);
    try {
      const [pRes, uRes] = await Promise.all([
        apiRequest(`/roles/${roleId}/role-permissions`) as unknown,
        apiRequest(`/roles/${roleId}/users`) as unknown,
      ]);
      const pRows = ((pRes as { data?: Array<{ name: string }> })?.data ??
        (Array.isArray(pRes) ? pRes : [])) as Array<{ name: string }>;
      const uIds = ((uRes as { data?: string[] })?.data ??
        (Array.isArray(uRes) ? uRes : [])) as string[];
      setPerms(pRows.map((p) => p.name));
      setRoleUsers(uIds);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = (await apiRequest<{ data?: UserRecord[] }>('/users')) as unknown;
      const rows = (
        Array.isArray(res) ? res : ((res as { data?: UserRecord[] })?.data ?? [])
      ) as UserRecord[];
      setUsers(rows);
    } catch {
      /* users optional */
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadRoles(), loadUsers()]);
      setLoading(false);
    })();
  }, [loadRoles, loadUsers]);

  useEffect(() => {
    if (selectedId) {
      void loadRoleDetail(selectedId);
    }
  }, [selectedId, loadRoleDetail]);

  const selectRole = (id: string) => {
    setSelectedId(id);
    setMsg(null);
    setSaved(false);
    setEditing(false);
  };

  // ── Matrix toggles ────────────────────────────────────
  const cellChecked = (resource: string, action: string) => hasCoverage(perms, resource, action);

  const toggleCell = (resource: string, action: string) => {
    if (isFullAccess) {
      return;
    }
    const code = `${resource}.${action}`;
    setPerms((prev) => {
      if (prev.includes(code)) {
        return prev.filter((p) => p !== code);
      }
      if (prev.includes(`${resource}.*`)) {
        return prev;
      } // wildcard already grants — toggle without explicit code stays covered
      return [...prev, code];
    });
    setSaved(false);
  };

  const toggleColumn = (action: string) => {
    if (isFullAccess) {
      return;
    }
    const allChecked = MATRIX_RESOURCES.every((r) => cellChecked(r.code, action));
    setPerms((prev) => {
      const next = [...prev];
      for (const r of MATRIX_RESOURCES) {
        const code = `${r.code}.${action}`;
        const covered = hasCoverage(prev, r.code, action);
        if (allChecked) {
          // Uncheck column — only exact codes removable (wildcards stay server-side)
          if (next.includes(code)) {
            next.splice(next.indexOf(code), 1);
          }
        } else if (!covered && !next.includes(code)) {
          next.push(code);
        }
      }
      return next;
    });
    setSaved(false);
  };

  const rowAll = (resource: string) => {
    if (isFullAccess) {
      return;
    }
    setPerms((prev) => {
      const next = [...prev];
      for (const a of ACTION_CODES) {
        const code = `${resource}.${a}`;
        if (!hasCoverage(prev, resource, a) && !next.includes(code)) {
          next.push(code);
        }
      }
      return next;
    });
    setSaved(false);
  };

  const rowNone = (resource: string) => {
    if (isFullAccess) {
      return;
    }
    setPerms((prev) => {
      const next = prev.filter(
        (p) => !(p.startsWith(`${resource}.`) && ACTION_CODES.includes(p.split('.')[1])),
      );
      // Also drop the exact wildcard so partial-row tightening works server-side
      if (next.includes(`${resource}.*`)) {
        next.splice(next.indexOf(`${resource}.*`), 1);
      }
      return next;
    });
    setSaved(false);
  };

  const toggleAll = () => {
    if (isFullAccess) {
      return;
    }
    setPerms((prev) => {
      const allCovered = MATRIX_RESOURCES.every((r) =>
        ACTION_CODES.every((a) => hasCoverage(prev, r.code, a)),
      );
      const next = [...prev];
      if (allCovered) {
        // Clear all exact matrix codes (wildcards left for server to handle)
        return next.filter((p) => {
          const [res, act] = p.split('.');
          return !(MATRIX_RESOURCES.some((r) => r.code === res) && ACTION_CODES.includes(act));
        });
      }
      for (const r of MATRIX_RESOURCES) {
        for (const a of ACTION_CODES) {
          const code = `${r.code}.${a}`;
          if (!hasCoverage(prev, r.code, a) && !next.includes(code)) {
            next.push(code);
          }
        }
      }
      return next;
    });
    setSaved(false);
  };

  // ── Save / role CRUD ──────────────────────────────────
  const handleSavePermissions = async () => {
    if (!selected) {
      return;
    }
    if (selected.isSystem) {
      setMsg({ ok: false, text: 'System roles keep their seeded permissions' });
      return;
    }
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await apiRequest<{ message?: string }>(`/roles/${selected.id}/role-permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions: perms }),
      });
      setMsg({ ok: true, text: res?.message || 'Permissions updated ✅' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await loadRoleDetail(selected.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    setError(null);
    setMsg(null);
    if (!form.name.trim()) {
      setError('Role name is required');
      return;
    }
    setBusy(true);
    try {
      const created = await apiRequest<RoleRecord>('/roles', {
        method: 'POST',
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() }),
      });
      setForm({ name: '', description: '' });
      setEditing(false);
      await loadRoles();
      if (created?.id) {
        setSelectedId(created.id);
      }
      setMsg({ ok: true, text: 'Role created ✅ — now tick its permissions' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selected) {
      return;
    }
    setError(null);
    setMsg(null);
    if (!form.name.trim()) {
      setError('Role name is required');
      return;
    }
    setBusy(true);
    try {
      await apiRequest(`/roles/${selected.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() }),
      });
      setEditing(false);
      await loadRoles();
      setMsg({ ok: true, text: 'Role updated ✅' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteRole = async (role: RoleRecord) => {
    if (
      !window.confirm(`Delete role "${role.name}"? Users with this role will lose its permissions.`)
    ) {
      return;
    }
    setError(null);
    setMsg(null);
    try {
      await apiRequest(`/roles/${role.id}`, { method: 'DELETE' });
      setMsg({ ok: true, text: 'Role deleted' });
      setPerms([]);
      setRoleUsers([]);
      await loadRoles();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggleUserRole = async (userId: string) => {
    if (!selected) {
      return;
    }
    setTogglingUser(userId);
    setError(null);
    try {
      const has = roleUsers.includes(userId);
      if (has) {
        await apiRequest(`/roles/${userId}/assign/${selected.id}`, { method: 'DELETE' });
      } else {
        await apiRequest(`/roles/${userId}/assign/${selected.id}`, { method: 'POST' });
      }
      const uRes = (await apiRequest(`/roles/${selected.id}/users`)) as unknown;
      const uIds = ((uRes as { data?: string[] })?.data ??
        (Array.isArray(uRes) ? uRes : [])) as string[];
      setRoleUsers(uIds);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTogglingUser(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {msg && (
        <p
          className={`flex items-center gap-1.5 text-sm ${msg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
        >
          {msg.ok ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} {msg.text}
        </p>
      )}

      {/* Card 1 — Roles list + create/edit */}
      <SectionCard
        title="Roles"
        description="Create roles and control what each role can do — module by module"
        icon={<Shield className="h-5 w-5" />}
        tint="indigo"
      >
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          {/* Role list */}
          <div className="space-y-2">
            <button
              onClick={() => {
                setEditing(true);
                setForm({ name: '', description: '' });
                setMsg(null);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-2.5 text-sm font-semibold text-indigo-600 transition-colors hover:border-indigo-400 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400"
            >
              <Plus className="h-4 w-4" /> New Role
            </button>
            {roles.map((r) => (
              <div
                key={r.id}
                className={`group flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all ${
                  selectedId === r.id
                    ? 'border-indigo-400 bg-indigo-50 shadow-sm dark:border-indigo-600 dark:bg-indigo-900/20'
                    : 'border-slate-200 bg-white/80 hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-800/80'
                }`}
              >
                <button onClick={() => selectRole(r.id)} className="min-w-0 flex-1 text-left">
                  <p
                    className={`truncate text-sm font-semibold ${selectedId === r.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}
                  >
                    {r.name}
                    {r.isSystem && (
                      <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                        System
                      </span>
                    )}
                  </p>
                  {r.description && (
                    <p className="truncate text-[11px] text-slate-400">{r.description}</p>
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditing(true);
                    setForm({ name: r.name, description: r.description ?? '' });
                    setMsg(null);
                  }}
                  title="Edit role"
                  className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-indigo-600 group-hover:opacity-100 dark:hover:bg-slate-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {!r.isSystem && (
                  <button
                    onClick={() => handleDeleteRole(r)}
                    title="Delete role"
                    className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-950/50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Role create/edit form OR selected role info */}
          {editing ? (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-800 dark:bg-indigo-950/20">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {selected ? 'Edit Role' : 'New Role'}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Role Name *
                  </span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Cashier, Manager, Accountant"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Description
                  </span>
                  <input
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="What is this role for?"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={selected ? handleUpdateRole : handleCreateRole}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {selected ? 'Save Role' : 'Create Role'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
              </div>
            </div>
          ) : selected ? (
            <div className="rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {selected.name}
                {selected.isSystem && (
                  <span className="ml-2 text-[10px] font-medium text-slate-400">
                    System role — cannot be deleted
                  </span>
                )}
              </p>
              {selected.description && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {selected.description}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-400">
                Tick the permissions below, then press <b>Save Permissions</b>. Roles with{' '}
                <b>full access (*)</b> keep it and skip granular saving.
              </p>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700">
              Select or create a role to manage its permissions
            </div>
          )}
        </div>
      </SectionCard>

      {/* Card 2 — Permission matrix */}
      {selected && (
        <SectionCard
          title={`${selected.name} — Permissions`}
          description="Module × action matrix — View · Create · Edit · Delete · Approve · Export · Print · Cancel · Restore"
          icon={<ShieldCheck className="h-5 w-5" />}
          tint="violet"
        >
          {isFullAccess && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              This role has unrestricted access (*). Granular matrix saving is skipped — it always
              passes every check.
            </div>
          )}
          {isSystem && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              System roles keep their seeded permissions — copy the role if you need different
              access.
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-slate-200 p-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-700">
                    Module
                  </th>
                  {MATRIX_ACTIONS.map((a) => (
                    <th
                      key={a.code}
                      className="border-b border-slate-200 p-1.5 text-center dark:border-slate-700"
                    >
                      <button
                        type="button"
                        onClick={() => toggleColumn(a.code)}
                        disabled={isFullAccess || isSystem}
                        title={`Toggle all ${a.label}`}
                        className={`mx-auto flex w-14 items-center justify-center gap-1 rounded-lg px-1 py-1 text-[11px] font-semibold transition-colors ${
                          MATRIX_RESOURCES.every((r) => cellChecked(r.code, a.code))
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700/60 dark:text-slate-400'
                        } ${isFullAccess ? 'opacity-50' : ''}`}
                      >
                        <Check className="h-3 w-3" /> {a.label}
                      </button>
                    </th>
                  ))}
                  <th className="border-b border-slate-200 p-1.5 dark:border-slate-700">
                    <div className="flex w-16 flex-col gap-1">
                      <button
                        type="button"
                        onClick={toggleAll}
                        disabled={isFullAccess || isSystem}
                        className="rounded-lg bg-emerald-600 px-1 py-0.5 text-[10px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isFullAccess || isSystem) {
                            return;
                          }
                          setPerms((prev) =>
                            prev.filter((p) => {
                              const [res, act] = p.split('.');
                              return !(
                                MATRIX_RESOURCES.some((r) => r.code === res) &&
                                ACTION_CODES.includes(act)
                              );
                            }),
                          );
                          setSaved(false);
                        }}
                        disabled={isFullAccess || isSystem}
                        className="rounded-lg bg-rose-500 px-1 py-0.5 text-[10px] font-bold text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
                      >
                        None
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX_RESOURCES.map((r) => (
                  <tr key={r.code} className="group">
                    <td className="border-b border-slate-100 p-2 dark:border-slate-700/60">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {r.emoji} {r.label}
                      </p>
                    </td>
                    {MATRIX_ACTIONS.map((a) => {
                      const checked = cellChecked(r.code, a.code);
                      return (
                        <td
                          key={a.code}
                          className="border-b border-slate-100 p-1.5 text-center dark:border-slate-700/60"
                        >
                          <button
                            type="button"
                            onClick={() => toggleCell(r.code, a.code)}
                            disabled={isFullAccess || isSystem}
                            aria-label={`${r.label} ${a.label}`}
                            className={`mx-auto flex h-7 w-14 items-center justify-center rounded-lg border transition-all ${
                              checked
                                ? 'border-emerald-400 bg-emerald-500 text-white shadow-sm'
                                : 'border-slate-200 bg-white text-transparent hover:border-emerald-300 dark:border-slate-600 dark:bg-slate-800'
                            } ${isFullAccess ? 'opacity-60' : ''}`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      );
                    })}
                    <td className="border-b border-slate-100 p-1.5 dark:border-slate-700/60">
                      <div className="flex w-16 gap-1">
                        <button
                          type="button"
                          onClick={() => rowAll(r.code)}
                          disabled={isFullAccess || isSystem}
                          className="rounded bg-emerald-600 px-1 py-0.5 text-[9px] font-bold text-white opacity-0 transition-opacity hover:bg-emerald-700 disabled:opacity-0 group-hover:opacity-100"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => rowNone(r.code)}
                          disabled={isFullAccess || isSystem}
                          className="rounded bg-rose-500 px-1 py-0.5 text-[9px] font-bold text-white opacity-0 transition-opacity hover:bg-rose-600 disabled:opacity-0 group-hover:opacity-100"
                        >
                          None
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SaveButton
              busy={saving}
              saved={saved}
              onClick={handleSavePermissions}
              label="Save Permissions"
              disabled={isSystem}
            />
            <button
              type="button"
              onClick={() => {
                void loadRoleDetail(selected.id);
                setSaved(false);
                setMsg(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <RotateCcw className="h-4 w-4" /> Reload
            </button>
          </div>
        </SectionCard>
      )}

      {/* Card 3 — Users with this role */}
      {selected && (
        <SectionCard
          title={`${selected.name} — Assigned Users`}
          description="Tick users who should have this role (role permissions apply on top of module access)"
          icon={<Users className="h-5 w-5" />}
          tint="sky"
        >
          {users.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No users found — create users from the Users tab first.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => {
                const has = roleUsers.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUserRole(u.id)}
                    disabled={togglingUser === u.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                      has
                        ? 'border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-900/20'
                        : 'border-slate-200 bg-white/80 hover:border-sky-200 dark:border-slate-700 dark:bg-slate-800/80'
                    } disabled:opacity-50`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {u.firstName || u.email}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">{u.email}</p>
                    </div>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        has
                          ? 'border-sky-500 bg-sky-500 text-white'
                          : 'border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-slate-800'
                      }`}
                    >
                      {togglingUser === u.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
