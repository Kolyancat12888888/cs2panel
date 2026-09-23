'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ServerHeader from '@/components/ServerHeader';
import { Server, Plugin } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import {
  Package,
  Download,
  Check,
  ExternalLink,
  RotateCcw,
  Zap,
  FolderTree,
  Search,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Cpu
} from 'lucide-react';

export default function ServerPluginsPage() {
  const params = useParams();
  const serverId = params.id as string;
  const [server, setServer] = useState<Server | null>(null);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [installingEngine, setInstallingEngine] = useState(false);
  const [reloadingPlugins, setReloadingPlugins] = useState(false);
  const [installing, setInstalling] = useState<number | null>(null);
  const [installedList, setInstalledList] = useState<number[]>([2]); // CustomAccess is installed
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    fetchApi(`/servers/${serverId}`).then(setServer).catch(() => {});
    fetchApi('/plugins')
      .then((data) => {
        if (Array.isArray(data)) setPlugins(data);
      })
      .catch(() => {});
  }, [serverId]);

  const handleInstallEngine = async () => {
    setInstallingEngine(true);
    try {
      const res = await fetchApi(`/servers/${serverId}/plugins/install-engine`, {
        method: 'POST',
      });
      showToast(res.message || 'CounterStrikeSharp and Metamod installed successfully!');
    } catch (err: any) {
      alert(`Installation failed: ${err.message}`);
    } finally {
      setInstallingEngine(false);
    }
  };

  const handleReloadPlugins = async () => {
    setReloadingPlugins(true);
    try {
      const res = await fetchApi(`/servers/${serverId}/plugins/reload`, {
        method: 'POST',
      });
      showToast(res.message || 'Dispatched css_plugins reload to server');
    } catch (err: any) {
      alert(`Reload failed: ${err.message}`);
    } finally {
      setReloadingPlugins(false);
    }
  };

  const handleInstallPlugin = async (pluginId: number) => {
    setInstalling(pluginId);
    try {
      const res = await fetchApi(`/servers/${serverId}/plugins/${pluginId}/install`, {
        method: 'POST',
      });
      setInstalledList((prev) => [...prev, pluginId]);
      showToast(res.message || 'Plugin installed successfully!');
    } catch (err: any) {
      alert(`Install plugin failed: ${err.message}`);
    } finally {
      setInstalling(null);
    }
  };

  if (!server) return <div className="p-8 text-center text-cs2-muted">Loading plugins...</div>;

  const filteredPlugins = plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <ServerHeader server={server} />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-cs2-green text-black px-4 py-3 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Core Engine Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-cs2-surface via-cs2-card to-cs2-surface border border-cs2-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-cs2-orange/10 border border-cs2-orange/30 text-cs2-orange shrink-0">
            <Cpu className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">CounterStrikeSharp & Metamod Engine</h2>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cs2-green/20 text-cs2-green border border-cs2-green/30">
                <Check className="w-3 h-3" /> Metamod 2.0 (git1411) & CSS (.NET 8)
              </span>
            </div>
            <p className="text-xs text-cs2-muted max-w-xl">
              Powers all C# and C++ custom plugins, admin systems, match managers, and VIP perks on this dedicated server.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href={`/servers/${serverId}/files`}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cs2-card hover:bg-cs2-border text-gray-300 hover:text-white border border-cs2-border flex items-center gap-1.5 transition"
          >
            <FolderTree className="w-3.5 h-3.5 text-cs2-orange" />
            <span>Open Plugins Folder</span>
          </Link>

          <button
            onClick={handleReloadPlugins}
            disabled={reloadingPlugins}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cs2-card hover:bg-cs2-border text-gray-300 hover:text-white border border-cs2-border flex items-center gap-1.5 transition"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${reloadingPlugins ? 'animate-spin text-cs2-orange' : ''}`} />
            <span>Reload (`css_plugins reload`)</span>
          </button>

          <button
            onClick={handleInstallEngine}
            disabled={installingEngine}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-cs2-orange hover:bg-cs2-orangeHover text-black flex items-center gap-1.5 transition shadow-lg shadow-cs2-orange/20"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{installingEngine ? 'Installing...' : 'Install / Repair Engine'}</span>
          </button>
        </div>
      </div>

      {/* Marketplace Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-cs2-orange" />
            <span>Verified CS2 Plugin Marketplace</span>
          </h2>
          <p className="text-xs text-cs2-muted mt-0.5">
            Install curated community plugins into this server's isolated addons directory in 1-click.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plugins..."
            className="w-full bg-cs2-surface border border-cs2-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-cs2-orange"
          />
        </div>
      </div>

      {/* Plugins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPlugins.map((plugin) => {
          const isInstalled = installedList.includes(plugin.id);
          const isBusy = installing === plugin.id;

          return (
            <div
              key={plugin.id}
              className="p-5 rounded-2xl bg-cs2-surface border border-cs2-border hover:border-cs2-orange/40 transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-base">{plugin.name}</h3>
                    <div className="text-[11px] text-cs2-muted mt-0.5 flex items-center gap-2">
                      <span>{plugin.category}</span>
                      <span>•</span>
                      <span>by {plugin.author}</span>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-cs2-card text-cs2-orange border border-cs2-border shrink-0">
                    v{plugin.version}
                  </span>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
                  {plugin.description}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-cs2-card border border-cs2-border text-cs2-orange font-semibold">
                    CSS (.NET 8)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-cs2-card border border-cs2-border text-cs2-blue font-semibold">
                    Metamod
                  </span>
                  <span className="text-[10px] text-cs2-muted ml-auto font-mono">
                    {plugin.install_count} installs
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-cs2-border flex items-center justify-between">
                {plugin.github_repo ? (
                  <a
                    href={`https://github.com/${plugin.github_repo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cs2-muted hover:text-white flex items-center gap-1 transition"
                  >
                    <span>GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-xs text-cs2-muted">Verified</span>
                )}

                <button
                  onClick={() => handleInstallPlugin(plugin.id)}
                  disabled={isInstalled || isBusy}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    isInstalled
                      ? 'bg-cs2-green/20 text-cs2-green border border-cs2-green/30'
                      : 'bg-cs2-orange hover:bg-cs2-orangeHover text-black shadow-md shadow-cs2-orange/20'
                  }`}
                >
                  {isInstalled ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Installed</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>{isBusy ? 'Installing...' : '1-Click Install'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
