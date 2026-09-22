'use client';

import React, { useEffect, useState } from 'react';
import { Cpu, Server, HardDrive, Wifi, Plus, Play, CheckCircle2, ShieldCheck, Activity } from 'lucide-react';
import { Node } from '@/lib/types';
import { fetchApi } from '@/lib/api';

export default function NodesPage() {
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: 1,
      name: 'Node 01 - Frankfurt Master',
      fqdn: 'node01.cs2panel.local',
      ip_address: '127.0.0.1',
      daemon_port: 8080,
      sftp_port: 2022,
      location: 'EU-Frankfurt (AMD EPYC High Frequency)',
      is_active: true,
      total_ram_mb: 32768,
      total_disk_gb: 500,
      cpu_cores: 16,
      servers_count: 2,
    }
  ]);
  const [benchmarkData, setBenchmarkData] = useState<any>(null);
  const [runningBenchmark, setRunningBenchmark] = useState(false);

  useEffect(() => {
    fetchApi('/nodes')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setNodes(data);
      })
      .catch(() => {});
  }, []);

  const handleRunBenchmark = async (nodeId: number) => {
    setRunningBenchmark(true);
    try {
      const res = await fetchApi(`/nodes/${nodeId}/benchmark`);
      setBenchmarkData(res);
    } catch (err: any) {
      alert(`Benchmark failed: ${err.message}`);
    } finally {
      setRunningBenchmark(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Node Cluster & Go Daemon Agents</h1>
          <p className="text-xs text-cs2-muted mt-1">
            Manage distributed game server host machines running the CS2Panel Go Daemon.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {nodes.map((node) => (
          <div
            key={node.id}
            className="p-6 rounded-2xl bg-cs2-surface border border-cs2-border flex flex-col justify-between space-y-6"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cs2-card border border-cs2-border flex items-center justify-center text-cs2-orange">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{node.name}</h3>
                    <div className="text-xs text-cs2-muted">{node.location}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cs2-green/20 text-cs2-green border border-cs2-green/30 text-xs font-bold">
                  <div className="w-2 h-2 rounded-full bg-cs2-green animate-pulse" />
                  <span>ONLINE</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="p-3 rounded-xl bg-cs2-card border border-cs2-border">
                  <div className="text-[10px] text-cs2-muted uppercase font-bold">Daemon API</div>
                  <div className="text-xs font-mono text-white mt-0.5">{node.ip_address}:{node.daemon_port}</div>
                </div>
                <div className="p-3 rounded-xl bg-cs2-card border border-cs2-border">
                  <div className="text-[10px] text-cs2-muted uppercase font-bold">SFTP Port</div>
                  <div className="text-xs font-mono text-white mt-0.5">Port {node.sftp_port}</div>
                </div>
                <div className="p-3 rounded-xl bg-cs2-card border border-cs2-border">
                  <div className="text-[10px] text-cs2-muted uppercase font-bold">Allocated Servers</div>
                  <div className="text-xs font-bold text-cs2-orange mt-0.5">{node.servers_count || 2} Instances</div>
                </div>
                <div className="p-3 rounded-xl bg-cs2-card border border-cs2-border">
                  <div className="text-[10px] text-cs2-muted uppercase font-bold">Hardware</div>
                  <div className="text-xs text-white mt-0.5">{node.cpu_cores} Cores / {Math.round(node.total_ram_mb/1024)} GB RAM</div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-cs2-border flex items-center justify-between">
              <span className="text-xs text-cs2-green flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Master CS2 Ready (~40 GB)
              </span>

              <button
                onClick={() => handleRunBenchmark(node.id)}
                disabled={runningBenchmark}
                className="px-4 py-2 rounded-xl bg-cs2-orange hover:bg-cs2-orangeHover text-black text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{runningBenchmark ? 'Testing...' : 'Run Diagnostics'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Benchmark Results */}
      {benchmarkData && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-cs2-surface to-cs2-card border border-cs2-border space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Activity className="w-5 h-5 text-cs2-green" />
            <span>Diagnostics & Hardware Benchmark Results ({benchmarkData.node_name})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-cs2-card border border-cs2-border">
              <div className="text-xs text-cs2-muted">NVMe Read Speed</div>
              <div className="text-xl font-bold text-cs2-green mt-1">{benchmarkData.disk_read_mb_s} MB/s</div>
            </div>
            <div className="p-4 rounded-xl bg-cs2-card border border-cs2-border">
              <div className="text-xs text-cs2-muted">NVMe Write Speed</div>
              <div className="text-xl font-bold text-cs2-green mt-1">{benchmarkData.disk_write_mb_s} MB/s</div>
            </div>
            <div className="p-4 rounded-xl bg-cs2-card border border-cs2-border">
              <div className="text-xs text-cs2-muted">Network Latency</div>
              <div className="text-xl font-bold text-cs2-blue mt-1">{benchmarkData.network_latency_ms} ms</div>
            </div>
            <div className="p-4 rounded-xl bg-cs2-card border border-cs2-border">
              <div className="text-xs text-cs2-muted">CS2 Tickrate Stability</div>
              <div className="text-xl font-bold text-cs2-orange mt-1">{benchmarkData.cpu_tick_stability}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
