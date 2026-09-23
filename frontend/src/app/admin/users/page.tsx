'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Trash2, 
  Ban, 
  CheckCircle2, 
  RefreshCw, 
  Server, 
  Edit3, 
  X,
  Lock,
  SlidersHorizontal
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { User, Role, Permission } from '@/lib/types';

export default function UsersAdminPage() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionsModules, setPermissionsModules] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permUser, setPermUser] = useState<User | null>(null);
  const [userPermsMap, setUserPermsMap] = useState<Record<number, boolean>>({});

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    steam_id: '',
    server_limit: 2,
    role_ids: [] as number[],
    is_banned: false,
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.append('search', search);
      if (selectedRole) q.append('role', selectedRole);

      const [usersRes, rolesRes, permsRes] = await Promise.all([
        fetchApi(`/admin/users?${q.toString()}`),
        fetchApi('/admin/roles'),
        fetchApi('/admin/roles/permissions'),
      ]);

      if (usersRes?.success && usersRes.data) {
        setUsers(usersRes.data);
      }
      if (rolesRes?.success && rolesRes.roles) {
        setRoles(rolesRes.roles);
      }
      if (permsRes?.success && permsRes.modules) {
        setPermissionsModules(permsRes.modules);
      }
    } catch (err: any) {
      setMsg({ text: err?.message || 'Failed to load user management directory', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, selectedRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    const defaultUserRole = roles.find((r) => r.slug === 'user')?.id;
    setFormData({
      name: '',
      email: '',
      password: '',
      steam_id: '',
      server_limit: 2,
      role_ids: defaultUserRole ? [defaultUserRole] : [],
      is_banned: false,
    });
    setIsCreateOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetchApi('/admin/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (res.success) {
        setMsg({ text: 'User created successfully!', type: 'success' });
        setIsCreateOpen(false);
        loadData();
      } else {
        setMsg({ text: res.message || 'Error creating user', type: 'error' });
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Error creating user', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      steam_id: u.steam_id || '',
      server_limit: u.server_limit || 2,
      role_ids: (u.roles || []).map((r) => r.id),
      is_banned: !!u.is_banned,
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    setMsg(null);
    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        steam_id: formData.steam_id,
        server_limit: Number(formData.server_limit),
        role_ids: formData.role_ids,
        is_banned: formData.is_banned,
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await fetchApi(`/admin/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setMsg({ text: 'User profile updated!', type: 'success' });
        setEditingUser(null);
        loadData();
      } else {
        setMsg({ text: res.message || 'Error updating user', type: 'error' });
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Error updating user', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBan = async (u: User) => {
    try {
      const res = await fetchApi(`/admin/users/${u.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_banned: !u.is_banned }),
      });
      if (res.success) {
        setMsg({ text: `User ${u.name} ${!u.is_banned ? 'suspended' : 're-activated'}.`, type: 'success' });
        loadData();
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to toggle suspension', type: 'error' });
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (!confirm(`Are you sure you want to permanently delete user "${u.name}" (${u.email})?`)) return;
    try {
      const res = await fetchApi(`/admin/users/${u.id}`, { method: 'DELETE' });
      if (res.success) {
        setMsg({ text: 'User deleted permanently.', type: 'success' });
        loadData();
      } else {
        setMsg({ text: res.message || 'Could not delete user', type: 'error' });
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Error deleting user', type: 'error' });
    }
  };

  const handleOpenPerms = async (u: User) => {
    try {
      const res = await fetchApi(`/admin/users/${u.id}`);
      if (res.success && res.user) {
        setPermUser(res.user);
        const map: Record<number, boolean> = {};
        if (res.user.direct_permissions) {
          res.user.direct_permissions.forEach((dp: any) => {
            map[dp.id] = dp.granted;
          });
        }
        setUserPermsMap(map);
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to load user permissions', type: 'error' });
    }
  };

  const handleSavePerms = async () => {
    if (!permUser) return;
    setSaving(true);
    try {
      const permsArray = Object.entries(userPermsMap).map(([id, granted]) => ({
        permission_id: Number(id),
        granted: Boolean(granted),
      }));

      const res = await fetchApi(`/admin/users/${permUser.id}/permissions`, {
        method: 'POST',
        body: JSON.stringify({ permissions: permsArray }),
      });

      if (res.success) {
        setMsg({ text: 'Custom permissions updated!', type: 'success' });
        setPermUser(null);
        loadData();
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Error saving permissions', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission('users.view')) {
    return (
      <div className="p-8 text-center text-cs2-muted">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-1">Access Restricted</h2>
        <p>You do not have permission to view the user management directory.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-cs2-orange" />
            <h1 className="text-2xl font-bold text-white">User Directory & RBAC</h1>
          </div>
          <p className="text-sm text-cs2-muted mt-1">
            Enterprise user management, granular permission assignment, and security access controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-lg bg-cs2-card border border-cs2-border text-cs2-muted hover:text-white transition"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {hasPermission('users.create') && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-lg bg-cs2-orange text-black font-bold text-sm hover:bg-cs2-orangeHover transition flex items-center gap-2 shadow-lg shadow-cs2-orange/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create User</span>
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

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-cs2-surface border border-cs2-border flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-cs2-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, steam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.slug}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl bg-cs2-surface border border-cs2-border overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-cs2-card border-b border-cs2-border text-[11px] uppercase tracking-wider text-cs2-muted font-bold">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Roles</th>
                <th className="py-3 px-4">Permissions</th>
                <th className="py-3 px-4">Servers Limit</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cs2-border/50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-cs2-muted">
                    No users matching search filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isWildcard = u.permissions?.includes('*');
                  const permCount = isWildcard ? 'ALL (*)' : u.permissions?.length || 1;

                  return (
                    <tr key={u.id} className="hover:bg-cs2-card/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-cs2-card border border-cs2-border flex items-center justify-center font-bold text-cs2-orange overflow-hidden">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              u.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {u.is_banned && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                  BANNED
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-cs2-muted">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(u.roles && u.roles.length > 0) ? (
                            u.roles.map((r) => (
                              <span
                                key={r.id}
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  r.slug === 'superadmin'
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : r.slug === 'admin'
                                      ? 'bg-cs2-orange/20 text-cs2-orange border border-cs2-orange/30'
                                      : 'bg-cs2-card border border-cs2-border text-cs2-muted'
                                }`}
                              >
                                {r.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cs2-card border border-cs2-border text-cs2-muted">
                              User
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className={`px-2 py-0.5 rounded ${
                          isWildcard ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-cs2-card text-cs2-muted'
                        }`}>
                          {permCount} perms
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-cs2-muted">
                        <div className="flex items-center gap-1">
                          <Server className="w-3.5 h-3.5 text-cs2-orange" />
                          <span>{u.servers_count || 0} / {u.server_limit}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs ${
                          u.is_banned ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_banned ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          {u.is_banned ? 'Suspended' : 'Active'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasPermission('users.edit') && (
                            <>
                              <button
                                onClick={() => handleOpenPerms(u)}
                                className="p-2 rounded-lg bg-cs2-card hover:bg-purple-500/20 hover:text-purple-400 text-cs2-muted transition"
                                title="Custom Permission Overrides"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(u)}
                                className="p-2 rounded-lg bg-cs2-card hover:bg-cs2-orange/20 hover:text-cs2-orange text-cs2-muted transition"
                                title="Edit Profile & Roles"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleBan(u)}
                                className={`p-2 rounded-lg bg-cs2-card transition ${
                                  u.is_banned ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-amber-400 hover:bg-amber-500/20'
                                }`}
                                title={u.is_banned ? 'Re-activate Account' : 'Suspend Account'}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {hasPermission('users.delete') && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-2 rounded-lg bg-cs2-card hover:bg-red-500/20 hover:text-red-400 text-cs2-muted transition"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cs2-surface border border-cs2-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cs2-orange" />
                <span>Create New User</span>
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-cs2-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-cs2-muted block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-cs2-muted block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-cs2-muted block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-cs2-muted block mb-1">Server Limit</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.server_limit}
                    onChange={(e) => setFormData({ ...formData, server_limit: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-cs2-muted block mb-1">Primary Role</label>
                  <select
                    value={formData.role_ids[0] || ''}
                    onChange={(e) => setFormData({ ...formData, role_ids: [parseInt(e.target.value)] })}
                    className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg bg-cs2-card border border-cs2-border text-cs2-muted hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-cs2-orange text-black font-bold text-sm hover:bg-cs2-orangeHover transition"
                >
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cs2-surface border border-cs2-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cs2-orange" />
                <span>Edit User: {editingUser.name}</span>
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-cs2-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-cs2-muted block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-cs2-muted block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-cs2-muted block mb-1">
                  Change Password <span className="text-[10px] text-cs2-muted">(leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="New password..."
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-cs2-muted block mb-1">Server Limit</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.server_limit}
                    onChange={(e) => setFormData({ ...formData, server_limit: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-cs2-muted block mb-1">Primary Role</label>
                  <select
                    value={formData.role_ids[0] || ''}
                    onChange={(e) => setFormData({ ...formData, role_ids: [parseInt(e.target.value)] })}
                    className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_banned}
                    onChange={(e) => setFormData({ ...formData, is_banned: e.target.checked })}
                    className="rounded bg-cs2-card border-cs2-border text-red-500 focus:ring-red-500"
                  />
                  <span className="text-xs text-red-400 font-semibold">Suspend / Ban this user from login</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-lg bg-cs2-card border border-cs2-border text-cs2-muted hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-cs2-orange text-black font-bold text-sm hover:bg-cs2-orangeHover transition"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM PERMISSIONS OVERRIDE MODAL */}
      {permUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cs2-surface border border-cs2-border rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-cs2-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-purple-400" />
                  <span>Custom Permissions: {permUser.name}</span>
                </h3>
                <p className="text-xs text-cs2-muted mt-0.5">
                  Direct permissions take precedence over role-inherited permissions.
                </p>
              </div>
              <button onClick={() => setPermUser(null)} className="text-cs2-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {Object.entries(permissionsModules).map(([moduleName, perms]) => (
                <div key={moduleName} className="p-3.5 rounded-xl bg-cs2-card/40 border border-cs2-border space-y-2.5">
                  <div className="text-xs font-bold text-cs2-orange uppercase tracking-wider">{moduleName}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {perms.map((p) => {
                      const isChecked = Boolean(userPermsMap[p.id]);
                      return (
                        <label
                          key={p.id}
                          className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 cursor-pointer transition ${
                            isChecked ? 'bg-purple-500/10 border-purple-500/40 text-white' : 'bg-cs2-card border-cs2-border text-cs2-muted hover:text-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setUserPermsMap({
                                ...userPermsMap,
                                [p.id]: e.target.checked,
                              });
                            }}
                            className="mt-0.5 rounded bg-cs2-card border-cs2-border text-purple-500 focus:ring-purple-500"
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
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t border-cs2-border pt-3">
              <button
                type="button"
                onClick={() => setPermUser(null)}
                className="px-4 py-2 rounded-lg bg-cs2-card border border-cs2-border text-cs2-muted hover:text-white text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePerms}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition"
              >
                {saving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
