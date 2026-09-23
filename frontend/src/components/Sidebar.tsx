'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Server, 
  Cpu, 
  ShoppingBag, 
  LifeBuoy, 
  FileText, 
  Settings, 
  LayoutDashboard,
  Code2,
  Bot,
  Trophy,
  LogIn,
  Lock,
  UserPlus,
  Users,
  ShieldCheck,
  ShieldAlert,
  Sliders
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated, user, hasPermission, isAdmin } = useAuth();

  // Navigation items guarded by granular permissions
  const navItems = [
    { label: 'Overview', href: '/', icon: LayoutDashboard, permission: 'dashboard.view' },
    { label: 'Game Servers', href: '/servers', icon: Server, permission: 'servers.view' },
    { label: 'Visual Plugin Studio', href: '/studio', icon: Code2, badge: 'PRO', permission: 'studio.view' },
    { label: 'Client AI Agents', href: '/agents', icon: Bot, badge: 'Local SDK', permission: 'agents.view' },
    { label: 'Match & Tournaments', href: '/matches', icon: Trophy, permission: 'matches.view' },
    { label: 'Node Cluster', href: '/nodes', icon: Cpu, permission: 'nodes.view' },
    { label: 'Marketplace', href: '/plugins', icon: ShoppingBag, permission: 'plugins.view' },
    { label: 'Support Tickets', href: '/tickets', icon: LifeBuoy, permission: 'dashboard.view' },
    { label: 'Audit Logs', href: '/audit', icon: FileText, permission: 'activity.view' },
    { label: 'System Settings', href: '/settings', icon: Settings, permission: 'settings.view' },
  ];

  // Administration specific section
  const adminNavItems = [
    { label: 'User Directory', href: '/admin/users', icon: Users, permission: 'users.view' },
    { label: 'Roles & Permissions', href: '/admin/roles', icon: ShieldCheck, permission: 'roles.view' },
  ];

  if (!isAuthenticated) {
    return (
      <aside className="w-64 border-r border-cs2-border bg-cs2-surface flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
        <div className="space-y-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-cs2-muted px-3">
            Authentication Required
          </div>

          <div className="p-4 rounded-xl bg-cs2-card border border-cs2-border space-y-3">
            <div className="w-8 h-8 rounded-lg bg-cs2-orange/10 border border-cs2-orange/30 text-cs2-orange flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Management Locked</div>
              <p className="text-[11px] text-cs2-muted mt-1 leading-relaxed">
                Log in or create an account to access the panel.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <Link
                href="/login"
                className="w-full py-2 rounded-lg bg-cs2-orange text-black font-bold text-xs hover:bg-cs2-orangeHover transition flex items-center justify-center gap-1.5 shadow-md shadow-cs2-orange/20"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </Link>
              <Link
                href="/register"
                className="w-full py-2 rounded-lg bg-cs2-surface border border-cs2-border text-white font-semibold text-xs hover:border-cs2-orange hover:text-cs2-orange transition flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-cs2-card/30 border border-cs2-border text-[11px] text-cs2-muted text-center">
          CS2Panel &bull; Production Enterprise
        </div>
      </aside>
    );
  }

  // Filter allowed navigation items
  const allowedNavItems = navItems.filter((item) => hasPermission(item.permission));
  const allowedAdminItems = adminNavItems.filter((item) => hasPermission(item.permission));

  const primaryRole = user?.roles?.[0]?.name || (user?.role === 'superadmin' ? 'Super Administrator' : user?.role === 'admin' ? 'Administrator' : 'Standard User');

  return (
    <aside className="w-64 border-r border-cs2-border bg-cs2-surface flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-4">
        {/* Standard Management Links */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-cs2-muted px-3 mb-2">
            Navigation
          </div>
          <div className="space-y-1">
            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-cs2-orange text-black font-semibold shadow-lg shadow-cs2-orange/10'
                      : 'text-cs2-muted hover:text-white hover:bg-cs2-card'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                      isActive ? 'bg-black text-cs2-orange' : 'bg-cs2-orange/20 text-cs2-orange'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Administration Section (If permitted) */}
        {allowedAdminItems.length > 0 && (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-cs2-orange px-3 mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" />
              <span>Administration</span>
            </div>
            <div className="space-y-1">
              {allowedAdminItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-cs2-card border border-cs2-orange text-cs2-orange font-semibold'
                        : 'text-cs2-muted hover:text-white hover:bg-cs2-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* User Profile / Status Card */}
      <div className="p-3.5 rounded-xl bg-cs2-card/60 border border-cs2-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-white truncate max-w-[120px]">
            {user?.name || 'User'}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
            user?.is_superadmin || user?.role === 'superadmin' 
              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
              : user?.is_admin || user?.role === 'admin' 
                ? 'bg-cs2-orange/20 text-cs2-orange border border-cs2-orange/30' 
                : 'bg-cs2-card border border-cs2-border text-cs2-muted'
          }`}>
            {primaryRole}
          </span>
        </div>
        <div className="text-[11px] text-cs2-muted flex items-center justify-between">
          <span>Active Permissions</span>
          <span className="font-mono text-white">
            {user?.permissions?.includes('*') ? 'ALL (*)' : (user?.permissions?.length || 1)}
          </span>
        </div>
      </div>
    </aside>
  );
}
