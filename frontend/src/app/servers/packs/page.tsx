'use client';

import React, { useEffect, useState } from 'react';
import { 
  Trophy, 
  Crosshair, 
  Zap, 
  Flame, 
  Swords, 
  Layers, 
  Check, 
  Play, 
  Sparkles, 
  Server, 
  ShieldCheck, 
  X,
  RefreshCw
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Node } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface ServerPack {
  id: string;
  name: string;
  category: string;
  tagline: string;
  icon: string;
  badge: string;
  features: string[];
  default_map: string;
  required_ram_mb: number;
  max_players: number;
}

export default function ServerPacksPage() {
  const router = useRouter();
  const [packs, setPacks] = useState<ServerPack[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<ServerPack | null>(null);

  const [deployForm, setDeployForm] = useState({
    server_name: '',
    node_id: 1,
    port: 27015,
  });
  const [deploying, setDeploying] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    Promise.all([fetchApi('/server-packs'), fetchApi('/nodes')])
      .then(([packsRes, nodesRes]) => {
        if (packsRes?.success && packsRes.packs) {
          setPacks(packsRes.packs);
        }
        if (Array.isArray(nodesRes) && nodesRes.length > 0) {
          setNodes(nodesRes);
          setDeployForm((f) => ({ ...f, node_id: nodesRes[0].id }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleOpenDeploy = (pack: ServerPack) => {
    setSelectedPack(pack);
    setDeployForm({
      server_name: `My CS2 ${pack.name}`,
      node_id: nodes[0]?.id || 1,
      port: 27015 + Math.floor(Math.random() * 50) * 10,
    });
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPack) return;
    setDeploying(true);
    setMsg(null);

    try {
      const res = await fetchApi('/server-packs/deploy', {
        method: 'POST',
        body: JSON.stringify({
          pack_id: selectedPack.id,
          server_name: deployForm.server_name,
          node_id: deployForm.node_id,
          port: deployForm.port,
        }),
      });

      if (res.success && res.server) {
        setMsg({ text: `Server Pack deployed successfully! Redirecting...`, type: 'success' });
        setTimeout(() => {
          router.push(`/servers/${res.server.id}`);
        }, 1500);
      } else {
        setMsg({ text: res.message || 'Deployment error', type: 'error' });
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Deployment failed', type: 'error' });
    } finally {
      setDeploying(false);
    }
  };

  const getPackIcon = (name: string) => {
    switch (name) {
      case 'Trophy': return <Trophy className="w-5 h-5 text-cs2-orange" />;
      case 'Crosshair': return <Crosshair className="w-5 h-5 text-red-400" />;
      case 'Zap': return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'Flame': return <Flame className="w-5 h-5 text-orange-500" />;
      case 'Swords': return <Swords className="w-5 h-5 text-purple-400" />;
      default: return <Layers className="w-5 h-5 text-cs2-orange" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-cs2-orange" />
          <h1 className="text-2xl font-bold text-white">1-Click Ready Server Packs</h1>
        </div>
        <p className="text-sm text-cs2-muted mt-1">
          Deploy pre-configured, production-tuned Counter-Strike 2 game modes with all required Metamod & CSSharp plugins pre-installed.
        </p>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Packs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {packs.map((pack) => (
          <div
            key={pack.id}
            className="p-6 rounded-2xl bg-cs2-surface border border-cs2-border hover:border-cs2-orange/60 transition flex flex-col justify-between space-y-5 shadow-xl group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-cs2-card border border-cs2-border flex items-center justify-center">
                  {getPackIcon(pack.icon)}
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-cs2-card border border-cs2-border text-cs2-orange">
                  {pack.badge}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-cs2-orange transition">
                  {pack.name}
                </h3>
                <p className="text-xs text-cs2-muted mt-1 leading-relaxed">
                  {pack.tagline}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-cs2-card/50 border border-cs2-border space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-cs2-muted tracking-wider mb-1">
                  Pre-configured Features:
                </div>
                {pack.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-cs2-border/60 flex items-center justify-between">
              <div className="text-[11px] text-cs2-muted">
                Map: <span className="font-mono text-white">{pack.default_map}</span> &bull; Max: <span className="font-mono text-white">{pack.max_players}P</span>
              </div>

              <button
                onClick={() => handleOpenDeploy(pack)}
                className="px-4 py-2 rounded-xl bg-cs2-orange hover:bg-cs2-orangeHover text-black font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-cs2-orange/20"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Deploy Pack</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DEPLOY MODAL */}
      {selectedPack && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cs2-surface border border-cs2-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cs2-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cs2-orange" />
                <h3 className="text-base font-bold text-white">Deploy: {selectedPack.name}</h3>
              </div>
              <button onClick={() => setSelectedPack(null)} className="text-cs2-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeploy} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-cs2-muted block mb-1">Server Name</label>
                <input
                  type="text"
                  required
                  value={deployForm.server_name}
                  onChange={(e) => setDeployForm({ ...deployForm, server_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-cs2-muted block mb-1">Target Compute Node</label>
                <select
                  value={deployForm.node_id}
                  onChange={(e) => setDeployForm({ ...deployForm, node_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs focus:outline-none focus:border-cs2-orange"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.ip_address})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-cs2-muted block mb-1">Game Port</label>
                <input
                  type="number"
                  required
                  value={deployForm.port}
                  onChange={(e) => setDeployForm({ ...deployForm, port: parseInt(e.target.value) || 27015 })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs font-mono focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cs2-border">
                <button
                  type="button"
                  onClick={() => setSelectedPack(null)}
                  className="px-4 py-2 rounded-lg bg-cs2-card border border-cs2-border text-cs2-muted hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deploying}
                  className="px-4 py-2 rounded-lg bg-cs2-orange text-black font-bold text-xs hover:bg-cs2-orangeHover transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {deploying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-black" />}
                  <span>{deploying ? 'Provisioning...' : '1-Click Deploy'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
