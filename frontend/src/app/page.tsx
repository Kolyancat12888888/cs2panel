'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Server as ServerIcon, Cpu, HardDrive, Users, Activity, Play, Square, RotateCw, Terminal, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Server } from '@/lib/types';
import { fetchApi } from '@/lib/api';

export default function DashboardPage() {
  const [servers, setServers] = useState<Server[]>([
    {
      id: 1,
      uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'CS2Panel Public Competitive 5v5 #1',
      port: 27015,
      rcon_port: 27015,
      tv_port: 27020,
      default_map: 'de_mirage',
      game_type: 0,
      game_mode: 1,
      max_players: 12,
      status: 'running',
      cpu_limit: 200,
      memory_limit_mb: 4096,
      disk_limit_mb: 10240,
      has_css: true,
      has_metamod: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      uuid: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      name: 'CS2Panel FFA Deathmatch & Retakes #2',
      port: 27025,
      rcon_port: 27025,
      tv_port: 27030,
      default_map: 'de_dust2',
      game_type: 1,
      game_mode: 2,
      max_players: 18,
      status: 'offline',
      cpu_limit: 200,
      memory_limit_mb: 4096,
      disk_limit_mb: 10240,
      has_css: true,
      has_metamod: true,
      created_at: new Date().toISOString(),
    }
  ]);

  useEffect(() => {
    fetchApi('/servers')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setServers(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-cs2-surface via-cs2-card to-cs2-surface border border-cs2-border relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cs2-orange/20 text-cs2-orange border border-cs2-orange/30">
              Pterodactyl-Style Architecture
            </span>
            <span className="flex items-center gap-1 text-xs text-cs2-green font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Shared Master Active
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">
            CS2 Dedicated Server Orchestration
          </h1>
          <p className="text-sm text-cs2-muted max-w-xl">
            Single Master Instance (~40 GB) powering multiple isolated CS2 game servers with zero disk duplication and custom addons per instance.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <Link
            href="/servers"
            className="px-5 py-2.5 rounded-xl bg-cs2-orange text-black font-bold text-sm hover:bg-cs2-orangeHover transition shadow-lg shadow-cs2-orange/20 flex items-center gap-2"
          >
            <ServerIcon className="w-4 h-4" />
            <span>Deploy New Server</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-cs2-surface border border-cs2-border flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-cs2-muted uppercase tracking-wider">Active CS2 Servers</div>
            <div className="text-2xl font-black text-white mt-1">
              {servers.filter(s => s.status === 'running').length} / {servers.length}
            </div>
            <div className="text-[11px] text-cs2-green mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cs2-green" /> 100% Node Uptime
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cs2-card border border-cs2-border flex items-center justify-center text-cs2-orange">
            <ServerIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-cs2-surface border border-cs2-border flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-cs2-muted uppercase tracking-wider">Master Storage Saved</div>
            <div className="text-2xl font-black text-white mt-1">~78.4 GB</div>
            <div className="text-[11px] text-cs2-orange mt-1">Symlinked VPK & Engine</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cs2-card border border-cs2-border flex items-center justify-center text-cs2-blue">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-cs2-surface border border-cs2-border flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-cs2-muted uppercase tracking-wider">Metamod & CSS</div>
            <div className="text-2xl font-black text-white mt-1">git1411</div>
            <div className="text-[11px] text-cs2-green mt-1">Latest .NET 8 Runtime</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cs2-card border border-cs2-border flex items-center justify-center text-cs2-green">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-cs2-surface border border-cs2-border flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-cs2-muted uppercase tracking-wider">Node CPU Load</div>
            <div className="text-2xl font-black text-white mt-1">8.2%</div>
            <div className="text-[11px] text-cs2-muted mt-1">16 Cores AMD EPYC</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cs2-card border border-cs2-border flex items-center justify-center text-purple-400">
            <Cpu className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Servers Table Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ServerIcon className="w-5 h-5 text-cs2-orange" />
            <span>Managed Game Servers</span>
          </h2>
          <Link href="/servers" className="text-xs text-cs2-orange hover:underline font-semibold">
            View All ({servers.length})
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {servers.map((server) => (
            <div
              key={server.id}
              className="p-5 rounded-xl bg-cs2-surface border border-cs2-border hover:border-cs2-orange/40 transition group relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        server.status === 'running'
                          ? 'bg-cs2-green animate-pulse'
                          : 'bg-cs2-muted'
                      }`}
                    />
                    <span className="font-bold text-white group-hover:text-cs2-orange transition">
                      {server.name}
                    </span>
                  </div>
                  <div className="text-xs text-cs2-muted mt-1">
                    Port: <span className="text-white font-mono">{server.port}</span> | Map: <span className="text-white font-mono">{server.default_map}</span> | Slots: <span className="text-white font-mono">{server.max_players}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/servers/${server.id}/console`}
                    className="p-2 rounded-lg bg-cs2-card hover:bg-cs2-border text-cs2-muted hover:text-white transition"
                    title="Open RCON Web Console"
                  >
                    <Terminal className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/servers/${server.id}`}
                    className="px-3 py-1.5 rounded-lg bg-cs2-card hover:bg-cs2-orange hover:text-black text-xs font-bold text-white transition"
                  >
                    Manage
                  </Link>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-cs2-border/60 flex items-center justify-between text-xs text-cs2-muted">
                <div>UUID: <span className="font-mono text-[10px] text-cs2-muted">{server.uuid.substring(0, 13)}...</span></div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cs2-card text-[10px] text-cs2-orange font-semibold">
                    CSS + Metamod
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
