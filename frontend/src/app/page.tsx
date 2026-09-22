'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Server as ServerIcon, Cpu, HardDrive, Users, Activity, Play, Square, RotateCw, Terminal, CheckCircle2, ShieldCheck, Plus, ServerOff } from 'lucide-react';
import { Server, Node } from '@/lib/types';
import { fetchApi } from '@/lib/api';

export default function DashboardPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchApi('/servers').catch(() => []),
      fetchApi('/nodes').catch(() => []),
    ]).then(([serversData, nodesData]) => {
      if (Array.isArray(serversData)) setServers(serversData);
      if (Array.isArray(nodesData)) setNodes(nodesData);
      setLoading(false);
    });
  }, []);

  const totalServers = servers.length;
  const runningServers = servers.filter(s => s.status === 'running').length;
  const primaryNode = nodes[0];
  const diskSavedGb = totalServers > 0 ? (totalServers * 38.5).toFixed(1) : '0';

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-cs2-surface via-cs2-card to-cs2-surface border border-cs2-border relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cs2-orange/20 text-cs2-orange border border-cs2-orange/30">
              Pterodactyl-Style Architecture
            </span>
            {nodes.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-cs2-green font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> {nodes.length} Active Node{nodes.length > 1 ? 's' : ''} Connected
              </span>
            )}
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
              {runningServers} / {totalServers}
            </div>
            <div className="text-[11px] text-cs2-green mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cs2-green" /> {totalServers > 0 ? `${Math.round((runningServers / totalServers) * 100)}% Online` : 'No Servers'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cs2-card border border-cs2-border flex items-center justify-center text-cs2-orange">
            <ServerIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-cs2-surface border border-cs2-border flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-cs2-muted uppercase tracking-wider">Master Storage Saved</div>
            <div className="text-2xl font-black text-white mt-1">~{diskSavedGb} GB</div>
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
            <div className="text-xs font-semibold text-cs2-muted uppercase tracking-wider">Node Hardware Load</div>
            <div className="text-2xl font-black text-white mt-1">
              {primaryNode?.telemetry?.cpu_usage_pct !== undefined ? `${primaryNode.telemetry.cpu_usage_pct.toFixed(1)}%` : '0.0%'}
            </div>
            <div className="text-[11px] text-cs2-muted mt-1 truncate max-w-[130px]">
              {primaryNode?.telemetry?.cpu_model ? primaryNode.telemetry.cpu_model : (nodes.length > 0 ? `${nodes[0].name}` : 'No Nodes Connected')}
            </div>
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
          {servers.length > 0 && (
            <Link href="/servers" className="text-xs text-cs2-orange hover:underline font-semibold">
              View All ({servers.length})
            </Link>
          )}
        </div>

        {servers.length === 0 ? (
          <div className="p-12 rounded-2xl bg-cs2-surface border border-cs2-border text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-cs2-card border border-cs2-border flex items-center justify-center text-cs2-muted">
              <ServerOff className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No CS2 Game Servers Provisioned</h3>
              <p className="text-xs text-cs2-muted max-w-md">
                You haven&apos;t created any game servers yet. Deploy your first instance in 1-click using the shared master installation.
              </p>
            </div>
            <Link
              href="/servers"
              className="px-5 py-2.5 rounded-xl bg-cs2-orange text-black font-bold text-xs hover:bg-cs2-orangeHover transition flex items-center gap-2 shadow-lg shadow-cs2-orange/20"
            >
              <Plus className="w-4 h-4" />
              <span>Deploy First Instance</span>
            </Link>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
