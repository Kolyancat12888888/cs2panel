'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckSquare, 
  Square, 
  RefreshCw, 
  Lock, 
  Users, 
  X,
  CheckCircle2
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Role, Permission } from '@/lib/types';

export default function RolesAdminPage() {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionsModules, setPermissionsModules] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);

  // Modal states
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);
  const [roleForm, setRoleForm] = useState({
    name: '',
    slug: '',
    description: '',
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetchApi('/admin/roles'),
        fetchApi('/admin/roles/permissions'),
      ]);

      if (rolesRes?.success && rolesRes.roles) {
        setRoles(rolesRes.roles);
      }
      if (permsRes?.success && permsRes.modules) {
        setPermissionsModules(permsRes.modules);
      }
    } catch (err: any) {
      setMsg({ text: err?.message || 'Failed to load roles and permissions', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setRoleForm({ name: '', slug: '', description: '' });
    setSelectedPermIds([]);
    setIsCreateOpen(true);
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetchApi('/admin/roles', {
        method: 'POST',
        body: JSON.stringify({
          ...roleForm,
          permission_ids: selectedPermIds,
        }),
      });

      if (res.success) {
        setMsg({ text: 'Role created successfully!', type: 'success' });
        setIsCreateOpen(false);
        loadData();
      } else {
        setMsg({ text: res.message || 'Error creating role', type: 'error' });
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Error creating role', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (r: Role) => {
    setEditingRole(r);
    setRoleForm({
      name: r.name,
      slug: r.slug,
      description: r.description || '',
    });
    setSelectedPermIds((r.permissions || []).map((p) => p.id));
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetchApi(`/admin/roles/${editingRole.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: roleForm.name,
          description: roleForm.description,
          permission_ids: selectedPermIds,
        }),
      });

      if (res.success) {
        setMsg({ text: 'Role and permissions updated!', type: 'success' });
        setEditingRole(null);
        loadData();
      } else {
        setMsg({ text: res.message || 'Error updating role', type: 'error' });
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Error updating role', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (r: Role) => {
    if (r.is_system) {
      alert('System roles cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete the role "${r.name}"?`)) return;

    try {
      const res = await fetchApi(`/admin/roles/${r.id}`, { method: 'DELETE' });
      if (res.success) {
        setMsg({ text: 'Role deleted.', type: 'success' });
        loadData();
      } else {
        setMsg({ text: res.message || 'Could not delete role', type: 'error' });
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Error deleting role', type: 'error' });
    }
  };

  const togglePermission = (id: number) => {
    setSelectedPermIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleModulePermissions = (perms: Permission[]) => {
    const ids = perms.map((p) => p.id);
    const allSelected = ids.every((id) => selectedPermIds.includes(id));
    if (allSelected) {
      setSelectedPermIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedPermIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  if (!hasPermission('roles.view')) {
    return (
      <div className="p-8 text-center text-cs2-muted">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-1">Access Restricted</h2>
        <p>You do not have permission to view system roles and permissions.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-cs2-orange" />
            <h1 className="text-2xl font-bold text-white">Roles & Permissions Matrix</h1>
          </div>
          <p className="text-sm text-cs2-muted mt-1">
            Configure system roles, access policies, and permission boundaries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-lg bg-cs2-card border border-cs2-border text-cs2-muted hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {hasPermission('roles.manage') && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-lg bg-cs2-orange text-black font-bold text-sm hover:bg-cs2-orangeHover transition flex items-center gap-2 shadow-lg shadow-cs2-orange/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create Role</span>
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-sm flex items-center justify-between ${
          msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((r) => {
          const permCount = r.permissions?.length || 0;
          return (
            <div
              key={r.id}
              className="p-5 rounded-2xl bg-cs2-surface border border-cs2-border flex flex-col justify-between space-y-4 hover:border-cs2-border/80 transition shadow-lg"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    r.slug === 'superadmin'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : r.slug === 'admin'
                        ? 'bg-cs2-orange/20 text-cs2-orange border border-cs2-orange/30'
                        : 'bg-cs2-card border border-cs2-border text-cs2-muted'
                  }`}>
                    {r.is_system ? 'System Role' : 'Custom Role'}
                  </span>

                  <div className="flex items-center gap-1 text-xs text-cs2-muted">
                    <Users className="w-3.5 h-3.5" />
                    <span>{r.users_count || 0}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{r.name}</h3>
                  <div className="text-xs text-cs2-muted font-mono">{r.slug}</div>
                </div>

                <p className="text-xs text-cs2-muted line-clamp-2">
                  {r.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-2 border-t border-cs2-border/60 flex items-center justify-between">
                <div className="text-xs text-cs2-muted">
                  <span className="font-bold text-white font-mono">{permCount}</span> permissions
                </div>

                {hasPermission('roles.manage') && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(r)}
                      className="p-1.5 rounded-lg bg-cs2-card hover:bg-cs2-orange/20 hover:text-cs2-orange text-cs2-muted transition"
                      title="Edit Role & Permissions"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {!r.is_system && (
                      <button
                        onClick={() => handleDeleteRole(r)}
                        className="p-1.5 rounded-lg bg-cs2-card hover:bg-red-500/20 hover:text-red-400 text-cs2-muted transition"
                        title="Delete Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT ROLE MODAL WITH PERMISSION MATRIX */}
      {(isCreateOpen || editingRole) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cs2-surface border border-cs2-border rounded-2xl w-full max-w-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-cs2-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cs2-orange" />
                  <span>{isCreateOpen ? 'Create New Role' : `Edit Role: ${editingRole?.name}`}</span>
                </h3>
                <p className="text-xs text-cs2-muted mt-0.5">
                  Assign the exact operational boundaries and API permissions for this role.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingRole(null);
                }}
                className="text-cs2-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={isCreateOpen ? handleCreateRole : handleUpdateRole} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-cs2-muted block mb-1">Role Display Name</label>
                  <input
                    type="text"
                    required
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    placeholder="e.g. Tournament Moderator"
                    className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-cs2-muted block mb-1">Role Slug / Identifier</label>
                  <input
                    type="text"
                    required
                    disabled={!isCreateOpen}
                    value={roleForm.slug}
                    onChange={(e) => setRoleForm({ ...roleForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                    placeholder="e.g. tournament_mod"
                    className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange disabled:opacity-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-cs2-muted block mb-1">Description</label>
                <input
                  type="text"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Responsibilities and access scope for this role..."
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                />
              </div>

              {/* PERMISSION MATRIX */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Granular Permission Matrix</h4>
                  <div className="text-xs text-cs2-orange font-mono">
                    {selectedPermIds.length} Selected
                  </div>
                </div>

                {Object.entries(permissionsModules).map(([moduleName, perms]) => {
                  const moduleIds = perms.map((p) => p.id);
                  const isAllModuleSelected = moduleIds.every((id) => selectedPermIds.includes(id));

                  return (
                    <div key={moduleName} className="p-3.5 rounded-xl bg-cs2-card/50 border border-cs2-border space-y-2.5">
                      <div className="flex items-center justify-between border-b border-cs2-border/40 pb-1.5">
                        <span className="text-xs font-bold text-cs2-orange uppercase tracking-wider">{moduleName}</span>
                        <button
                          type="button"
                          onClick={() => toggleModulePermissions(perms)}
                          className="text-[11px] text-cs2-muted hover:text-white transition flex items-center gap-1"
                        >
                          {isAllModuleSelected ? <CheckSquare className="w-3.5 h-3.5 text-cs2-orange" /> : <Square className="w-3.5 h-3.5" />}
                          <span>{isAllModuleSelected ? 'Deselect Module' : 'Select All'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {perms.map((p) => {
                          const isChecked = selectedPermIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 cursor-pointer transition ${
                                isChecked ? 'bg-cs2-orange/10 border-cs2-orange/40 text-white' : 'bg-cs2-card border-cs2-border text-cs2-muted hover:text-white'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePermission(p.id)}
                                className="mt-0.5 rounded bg-cs2-card border-cs2-border text-cs2-orange focus:ring-cs2-orange"
                              />
                              <div>
                                <div className="font-semibold text-white">{p.name}</div>
                                <div className="text-[10px] text-cs2-muted font-mono">{p.slug}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 border-t border-cs2-border pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingRole(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-cs2-card border border-cs2-border text-cs2-muted hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-cs2-orange text-black font-bold text-sm hover:bg-cs2-orangeHover transition"
                >
                  {saving ? 'Saving...' : isCreateOpen ? 'Create Role' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
