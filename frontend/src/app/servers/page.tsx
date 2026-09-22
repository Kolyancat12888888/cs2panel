'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Server as ServerIcon, Plus, Play, Square, Terminal, Settings, HardDrive, Cpu, ShieldCheck } from 'lucide-react';
import { Server, Node } from '@/lib/types';
import { fetchApi } from '@/lib/api';

export default function ServersListPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newServer, setNewServer] = useState({
    name: '',
    node_id: 1,
    port: 27015,
    default_map: 'de_mirage',
    has_css: true,
    has_metamod: true,
  });

  const loadData = () => {
    fetchApi('/servers')
      .then((data) => {
        if (Array.isArray(data)) setServers(data);
      })
      .catch(() => {});

    fetchApi('/nodes')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setNodes(data);
          setNewServer((s) => ({ ...s, node_id: data[0].id }));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/servers', {
        method: 'POST',
        body: JSON.stringify(newServer),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Create server error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Dedicated CS2 Servers</h1>
          <p className="text-xs text-cs2-muted mt-1">
            Instantly deploy Counter-Strike 2 servers powered by shared master symlinks.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-cs2-orange text-black font-bold text-xs hover:bg-cs2-orangeHover transition flex items-center gap-2 shadow-lg shadow-cs2-orange/20"
        >
          <Plus className="w-4 h-4" />
          <span>Deploy Server</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {servers.map((server) => (
          <div
            key={server.id}
            className="p-5 rounded-2xl bg-cs2-surface border border-cs2-border hover:border-cs2-orange/50 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        server.status === 'running' ? 'bg-cs2-green animate-pulse' : 'bg-cs2-muted'
                      }`}
                    />
                    <h3 className="font-bold text-white text-base">{server.name}</h3>
                  </div>
                  <div className="text-xs text-cs2-muted mt-1">
                    Port: <span className="font-mono text-white">{server.port}</span> | Map: <span className="font-mono text-white">{server.default_map}</span>
                  </div>
                </div>

                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cs2-card border border-cs2-border text-cs2-orange">
                  {server.status}
                </span>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-cs2-card/50 border border-cs2-border space-y-2 text-xs">
                <div className="flex justify-between text-cs2-muted">
                  <span>Architecture:</span>
                  <span className="text-cs2-green font-semibold">Master Symlinked</span>
                </div>
                <div className="flex justify-between text-cs2-muted">
                  <span>Mods Framework:</span>
                  <span className="text-white font-medium">Metamod + CSS</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-cs2-border flex items-center justify-between">
              <Link
                href={`/servers/${server.id}/console`}
                className="p-2 rounded-lg bg-cs2-card hover:bg-cs2-border text-cs2-muted hover:text-white transition"
                title="RCON Console"
              >
                <Terminal className="w-4 h-4" />
              </Link>
              <Link
                href={`/servers/${server.id}`}
                className="px-4 py-2 rounded-lg bg-cs2-orange hover:bg-cs2-orangeHover text-black text-xs font-bold transition"
              >
                Manage Server
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-cs2-surface border border-cs2-border rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-white">Deploy New CS2 Server</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-cs2-muted block mb-1">Server Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Public CS2 5v5"
                  value={newServer.name}
                  onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-cs2-muted block mb-1">Target Node</label>
                <select
                  value={newServer.node_id}
                  onChange={(e) => setNewServer({ ...newServer, node_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs focus:outline-none focus:border-cs2-orange"
                >
                  {nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.name} ({node.ip_address})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-cs2-muted block mb-1">Port</label>
                  <input
                    type="number"
                    value={newServer.port}
                    onChange={(e) => setNewServer({ ...newServer, port: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs focus:outline-none focus:border-cs2-orange"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-cs2-muted block mb-1">Default Map</label>
                  <select
                    value={newServer.default_map}
                    onChange={(e) => setNewServer({ ...newServer, default_map: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs focus:outline-none focus:border-cs2-orange"
                  >
                    <option value="de_mirage">de_mirage</option>
                    <option value="de_dust2">de_dust2</option>
                    <option value="de_inferno">de_inferno</option>
                    <option value="de_nuke">de_nuke</option>
                    <option value="de_anubis">de_anubis</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="install_css"
                  checked={newServer.has_css}
                  onChange={(e) => setNewServer({ ...newServer, has_css: e.target.checked })}
                  className="rounded bg-cs2-card border-cs2-border text-cs2-orange focus:ring-0"
                />
                <label htmlFor="install_css" className="text-xs text-white">
                  Pre-install Metamod:Source git1411 + CounterStrikeSharp
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-cs2-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-cs2-card text-xs font-bold text-cs2-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cs2-orange text-black text-xs font-bold hover:bg-cs2-orangeHover"
                >
                  Create & Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
