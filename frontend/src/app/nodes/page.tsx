'use client';

import React, { useEffect, useState } from 'react';
import { Cpu, Server, HardDrive, Plus, CheckCircle2, ShieldCheck, Activity, RefreshCw, Key, Download } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface LiveNode {
  id: number;
  name: string;
  fqdn: string;
  ip_address: string;
  daemon_port: number;
  sftp_port: number;
  location: string;
  is_active: boolean;
  servers_count: number;
  hardware: {
    cpu_model: string;
    cpu_cores: number;
    cpu_usage_pct: number;
    ram_total_mb: number;
    ram_used_mb: number;
    ram_usage_pct: number;
    disk_total_gb: number;
    disk_free_gb: number;
    disk_usage_pct: number;
    os: string;
    uptime_seconds: number;
  };
  master_healthy: boolean;
  master_message: string;
}

export default function NodesPage() {
  const [nodes, setNodes] = useState<LiveNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNode, setNewNode] = useState({
    name: '',
    fqdn: '',
    ip_address: '',
    daemon_port: 8888,
    sftp_port: 2222,
    daemon_secret: '',
    master_path: '/var/lib/pterodactyl/volumes/94654458-5da3-4306-9489-15697eae8112',
    location: 'Remote Linux Node',
  });

  const loadNodes = () => {
    setLoading(true);
    fetchApi('/nodes')
      .then((data) => {
        if (Array.isArray(data)) setNodes(data);
      })
      .catch((err) => console.error('Failed to load nodes:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNodes();
    const interval = setInterval(loadNodes, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/nodes', {
        method: 'POST',
        body: JSON.stringify(newNode),
      });
      setIsModalOpen(false);
      setNewNode({
        name: '',
        fqdn: '',
        ip_address: '',
        daemon_port: 8888,
        sftp_port: 2222,
        daemon_secret: '',
        master_path: '/var/lib/pterodactyl/volumes/94654458-5da3-4306-9489-15697eae8112',
        location: 'Remote Linux Node',
      });
      loadNodes();
    } catch (err: any) {
      alert(`Create node error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Node Cluster &amp; Real Hardware Telemetry</h1>
          <p className="text-xs text-cs2-muted mt-1">
            Real CPU, Memory, Disk, and Master CS2 integrity reported directly from your CS2 Daemon hosts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadNodes}
            className="p-2 rounded-lg bg-cs2-surface hover:bg-cs2-border text-cs2-muted hover:text-white border border-cs2-border transition"
            title="Refresh Nodes"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cs2-orange' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cs2-orange hover:bg-cs2-orange/90 text-black text-xs font-bold transition shadow-lg shadow-cs2-orange/10"
          >
            <Plus className="w-4 h-4" />
            Add Node
          </button>
        </div>
      </div>

      {nodes.length === 0 && !loading && (
        <div className="p-12 rounded-2xl bg-cs2-card border border-cs2-border text-center space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-cs2-surface border border-cs2-border flex items-center justify-center text-cs2-muted mx-auto">
            <Server className="w-7 h-7 text-cs2-orange" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Host Nodes Connected</h3>
            <p className="text-xs text-cs2-muted mt-1 leading-relaxed">
              Connect your first dedicated server machine running the Go Daemon to start provisioning symlink-isolated CS2 instances.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-cs2-orange text-black font-bold text-xs inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Connect Initial Node
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {nodes.map((node) => (
          <div
            key={node.id}
            className="p-6 rounded-2xl bg-cs2-surface border border-cs2-border hover:border-cs2-orange/30 transition flex flex-col justify-between space-y-6"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">{node.name}</h3>
                  <div className="text-xs text-cs2-muted font-mono mt-0.5">
                    {node.ip_address}:{node.daemon_port} • SFTP: {node.sftp_port}
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                    node.is_active
                      ? 'bg-cs2-green/10 text-cs2-green border border-cs2-green/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${node.is_active ? 'bg-cs2-green animate-pulse' : 'bg-red-500'}`} />
                  {node.is_active ? 'ONLINE (DAEMON CONNECTED)' : 'OFFLINE / UNREACHABLE'}
                </span>
              </div>

              {/* Real Hardware Information */}
              <div className="mt-4 p-3 rounded-xl bg-cs2-card/60 border border-cs2-border space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cs2-orange" />
                  <span>{node.hardware.cpu_model} ({node.hardware.cpu_cores} Cores)</span>
                </div>
                <div className="text-[11px] text-cs2-muted font-mono">
                  OS: {node.hardware.os} • Uptime: {Math.floor(node.hardware.uptime_seconds / 3600)}h {Math.floor((node.hardware.uptime_seconds % 3600) / 60)}m
                </div>
              </div>

              {/* Hardware Usage Gauges */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 rounded-xl bg-cs2-card border border-cs2-border space-y-1">
                  <div className="text-[11px] text-cs2-muted font-bold flex items-center justify-between">
                    <span>CPU Load</span>
                    <span className="text-white font-mono">{node.hardware.cpu_usage_pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-cs2-border h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cs2-orange h-full transition-all"
                      style={{ width: `${Math.min(100, node.hardware.cpu_usage_pct)}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cs2-card border border-cs2-border space-y-1">
                  <div className="text-[11px] text-cs2-muted font-bold flex items-center justify-between">
                    <span>RAM Used</span>
                    <span className="text-white font-mono">{node.hardware.ram_used_mb} / {node.hardware.ram_total_mb} MB</span>
                  </div>
                  <div className="w-full bg-cs2-border h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all"
                      style={{ width: `${Math.min(100, node.hardware.ram_usage_pct)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Master CS2 Integrity Status */}
              <div className="mt-4 p-3 rounded-xl bg-cs2-card border border-cs2-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${node.master_healthy ? 'bg-cs2-green' : 'bg-yellow-500'}`} />
                  <div>
                    <div className="text-xs font-bold text-white">Master CS2 Base Status</div>
                    <div className="text-[11px] text-cs2-muted">{node.master_message}</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-cs2-orange">{node.servers_count} CS2 Instances</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Node Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-cs2-card border border-cs2-border p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-6 h-6 text-cs2-orange" />
                <h3 className="text-lg font-bold text-white">Connect CS2 Dedicated Host Node</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-cs2-muted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Node Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frankfurt Dedicated #1"
                  value={newNode.name}
                  onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Host IP / FQDN</label>
                  <input
                    type="text"
                    required
                    placeholder="127.0.0.1 or node.domain.com"
                    value={newNode.ip_address}
                    onChange={(e) => setNewNode({ ...newNode, ip_address: e.target.value, fqdn: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Daemon API Port</label>
                  <input
                    type="number"
                    value={newNode.daemon_port}
                    onChange={(e) => setNewNode({ ...newNode, daemon_port: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Master CS2 Directory (~50 GB Path)</label>
                <input
                  type="text"
                  value={newNode.master_path}
                  onChange={(e) => setNewNode({ ...newNode, master_path: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-xs font-mono text-white focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Daemon Secret Token</label>
                <input
                  type="text"
                  placeholder="Leave empty to auto-generate secure crypto token"
                  value={newNode.daemon_secret}
                  onChange={(e) => setNewNode({ ...newNode, daemon_secret: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-xs font-mono text-cs2-orange focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-cs2-surface hover:bg-cs2-border text-white text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cs2-orange hover:bg-cs2-orange/90 text-black font-semibold text-sm"
                >
                  Connect Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
