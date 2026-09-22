'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Terminal, 
  FolderTree, 
  Sliders, 
  Package, 
  Map, 
  ShieldAlert, 
  Clock, 
  HardDrive, 
  BarChart3, 
  Play, 
  Square, 
  RotateCw, 
  Wrench,
  Activity
} from 'lucide-react';
import { Server } from '@/lib/types';
import { fetchApi } from '@/lib/api';

interface ServerHeaderProps {
  server: Server;
  onRefresh?: () => void;
}

export default function ServerHeader({ server, onRefresh }: ServerHeaderProps) {
  const pathname = usePathname();

  const handleAction = async (action: 'start' | 'stop' | 'restart' | 'repair-symlinks') => {
    try {
      await fetchApi(`/servers/${server.id}/${action}`, { method: 'POST' });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const tabs = [
    { label: 'Overview', href: `/servers/${server.id}`, icon: Activity },
    { label: 'Console', href: `/servers/${server.id}/console`, icon: Terminal },
    { label: 'Files & Configs', href: `/servers/${server.id}/files`, icon: FolderTree },
    { label: 'Cvar Settings', href: `/servers/${server.id}/config`, icon: Sliders },
    { label: 'Plugins & Mods', href: `/servers/${server.id}/plugins`, icon: Package },
    { label: 'Workshop Maps', href: `/servers/${server.id}/workshop`, icon: Map },
    { label: 'Bans & Admins', href: `/servers/${server.id}/bans`, icon: ShieldAlert },
    { label: 'Schedules (Cron)', href: `/servers/${server.id}/schedules`, icon: Clock },
    { label: 'Backups', href: `/servers/${server.id}/backups`, icon: HardDrive },
    { label: 'Player Stats', href: `/servers/${server.id}/stats`, icon: BarChart3 },
  ];

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-xl bg-cs2-surface border border-cs2-border">
        <div>
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${
                server.status === 'running' ? 'bg-cs2-green animate-pulse' : 'bg-cs2-muted'
              }`}
            />
            <h1 className="text-xl font-black text-white">{server.name}</h1>
            <span className="text-xs px-2.5 py-0.5 rounded bg-cs2-card border border-cs2-border font-mono text-cs2-orange">
              :{server.port}
            </span>
          </div>
          <div className="text-xs text-cs2-muted mt-1 flex items-center gap-3">
            <span>UUID: <span className="font-mono text-white">{server.uuid}</span></span>
            <span>Default Map: <span className="font-mono text-white">{server.default_map}</span></span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleAction('start')}
            className="px-3.5 py-2 rounded-lg bg-cs2-green hover:bg-emerald-500 text-black font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-cs2-green/10"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>Start</span>
          </button>
          <button
            onClick={() => handleAction('stop')}
            className="px-3.5 py-2 rounded-lg bg-cs2-red/20 hover:bg-cs2-red text-cs2-red hover:text-white border border-cs2-red/30 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Stop</span>
          </button>
          <button
            onClick={() => handleAction('restart')}
            className="px-3.5 py-2 rounded-lg bg-cs2-card hover:bg-cs2-border text-white font-bold text-xs flex items-center gap-1.5 transition border border-cs2-border"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
          <button
            onClick={() => handleAction('repair-symlinks')}
            className="px-3.5 py-2 rounded-lg bg-cs2-card hover:bg-cs2-orange hover:text-black text-cs2-muted font-bold text-xs flex items-center gap-1.5 transition border border-cs2-border"
            title="Check and rebuild symlinks to Master CS2"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Repair Symlinks</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-cs2-border pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-cs2-orange text-black shadow-md shadow-cs2-orange/10'
                  : 'text-cs2-muted hover:text-white hover:bg-cs2-card'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
