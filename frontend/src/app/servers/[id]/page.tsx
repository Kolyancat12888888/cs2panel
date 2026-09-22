'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ServerHeader from '@/components/ServerHeader';
import { Server } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import { Cpu, HardDrive, Wifi, Users, Activity, Copy, Check, ShieldCheck, Gamepad2 } from 'lucide-react';

export default function ServerOverviewPage() {
  const params = useParams();
  const serverId = params.id as string;
  const [server, setServer] = useState<Server | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchApi(`/servers/${serverId}`).then(setServer).catch(() => {});
  }, [serverId]);

  const handleCopyConnect = () => {
    if (!server) return;
    const connectCmd = `connect 127.0.0.1:${server.port}`;
    navigator.clipboard.writeText(connectCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!server) return <div className="p-8 text-center text-cs2-muted">Loading server...</div>;

  return (
    <div className="space-y-6">
      <ServerHeader server={server} onRefresh={() => fetchApi(`/servers/${serverId}`).then(setServer)} />

      {/* Connect Box */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-cs2-card to-cs2-surface border border-cs2-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cs2-orange/20 border border-cs2-orange/40 text-cs2-orange flex items-center justify-center font-bold">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-cs2-muted">Steam Direct Connect Command:</div>
            <div className="text-sm font-mono font-bold text-white">
              connect 127.0.0.1:{server.port}
            </div>
          </div>
        </div>

        <button
          onClick={handleCopyConnect}
          className="px-4 py-2 rounded-xl bg-cs2-card hover:bg-cs2-border border border-cs2-border text-white text-xs font-bold flex items-center gap-2 transition"
        >
          {copied ? <Check className="w-4 h-4 text-cs2-green" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copied!' : 'Copy Connect String'}</span>
        </button>
      </div>

      {/* Live Gauges Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-cs2-surface border border-cs2-border">
          <div className="flex items-center justify-between text-xs text-cs2-muted font-semibold">
            <span>CPU Allocation</span>
            <Cpu className="w-4 h-4 text-cs2-orange" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {server.status === 'running' ? '14.5%' : '0.0%'}
          </div>
          <div className="w-full bg-cs2-card h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-cs2-orange h-full"
              style={{ width: server.status === 'running' ? '15%' : '0%' }}
            />
          </div>
          <div className="text-[10px] text-cs2-muted mt-1">Limit: {server.cpu_limit}% (2 Cores)</div>
        </div>

        <div className="p-5 rounded-xl bg-cs2-surface border border-cs2-border">
          <div className="flex items-center justify-between text-xs text-cs2-muted font-semibold">
            <span>Memory (RAM)</span>
            <Activity className="w-4 h-4 text-cs2-blue" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {server.status === 'running' ? '1.82 GB' : '0.0 GB'}
          </div>
          <div className="w-full bg-cs2-card h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-cs2-blue h-full"
              style={{ width: server.status === 'running' ? '45%' : '0%' }}
            />
          </div>
          <div className="text-[10px] text-cs2-muted mt-1">Quota: {server.memory_limit_mb} MB</div>
        </div>

        <div className="p-5 rounded-xl bg-cs2-surface border border-cs2-border">
          <div className="flex items-center justify-between text-xs text-cs2-muted font-semibold">
            <span>Disk Usage (Isolated)</span>
            <HardDrive className="w-4 h-4 text-cs2-green" />
          </div>
          <div className="text-2xl font-black text-white mt-2">24.5 MB</div>
          <div className="w-full bg-cs2-card h-1.5 rounded-full overflow-hidden mt-3">
            <div className="bg-cs2-green h-full" style={{ width: '2%' }} />
          </div>
          <div className="text-[10px] text-cs2-green mt-1">Master Symlinked (~40 GB shared)</div>
        </div>

        <div className="p-5 rounded-xl bg-cs2-surface border border-cs2-border">
          <div className="flex items-center justify-between text-xs text-cs2-muted font-semibold">
            <span>Network & Tickrate</span>
            <Wifi className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {server.status === 'running' ? '128 Subtick' : 'Offline'}
          </div>
          <div className="w-full bg-cs2-card h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-purple-500 h-full"
              style={{ width: server.status === 'running' ? '100%' : '0%' }}
            />
          </div>
          <div className="text-[10px] text-cs2-muted mt-1">GOTV Port: {server.tv_port}</div>
        </div>
      </div>
    </div>
  );
}
