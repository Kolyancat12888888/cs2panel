'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Server, 
  Cpu, 
  ShoppingBag, 
  ShieldAlert, 
  LifeBuoy, 
  FileText, 
  Settings, 
  LayoutDashboard,
  Code2,
  Bot,
  Trophy,
  LogIn,
  Lock,
  UserPlus
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();

  const navItems = [
    { label: 'Overview', href: '/', icon: LayoutDashboard },
    { label: 'Game Servers', href: '/servers', icon: Server },
    { label: 'Visual Plugin Studio', href: '/studio', icon: Code2, badge: 'PRO' },
    { label: 'Client AI Agents', href: '/agents', icon: Bot, badge: 'Local SDK' },
    { label: 'Match & Tournaments', href: '/matches', icon: Trophy },
    { label: 'Node Cluster', href: '/nodes', icon: Cpu },
    { label: 'Marketplace', href: '/plugins', icon: ShoppingBag },
    { label: 'Support Tickets', href: '/tickets', icon: LifeBuoy },
    { label: 'Audit Logs', href: '/audit', icon: FileText },
    { label: 'System Settings', href: '/settings', icon: Settings },
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
                Log in or create an account to access game servers, visual studio and node clusters.
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
          CS2Panel &bull; Shared Master v1.0.0
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-r border-cs2-border bg-cs2-surface flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-cs2-muted px-3 mb-2">
          Management
        </div>
        {navItems.map((item) => {
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

      <div className="p-4 rounded-xl bg-cs2-card/50 border border-cs2-border">
        <div className="text-xs font-bold text-white mb-1">Master CS2 Status</div>
        <div className="text-[11px] text-cs2-muted mb-2">Build 1411 (git1411 Metamod)</div>
        <div className="w-full bg-cs2-border h-1.5 rounded-full overflow-hidden">
          <div className="bg-cs2-green h-full w-[100%]" />
        </div>
        <div className="text-[10px] text-cs2-green font-medium mt-1">Ready for 1-Click Instances</div>
      </div>
    </aside>
  );
}
