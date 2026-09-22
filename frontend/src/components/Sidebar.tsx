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
  Trophy
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

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
