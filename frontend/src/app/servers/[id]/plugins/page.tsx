'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ServerHeader from '@/components/ServerHeader';
import { Server, Plugin } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import { Package, Download, Check, ExternalLink, Star } from 'lucide-react';

export default function ServerPluginsPage() {
  const params = useParams();
  const serverId = params.id as string;
  const [server, setServer] = useState<Server | null>(null);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [installing, setInstalling] = useState<number | null>(null);
  const [installedList, setInstalledList] = useState<number[]>([]);

  useEffect(() => {
    fetchApi(`/servers/${serverId}`).then(setServer).catch(() => {});
    fetchApi('/plugins').then((data) => {
      if (Array.isArray(data)) setPlugins(data);
    }).catch(() => {});
  }, [serverId]);

  const handleInstallPlugin = async (pluginId: number) => {
    setInstalling(pluginId);
    try {
      await fetchApi(`/servers/${serverId}/plugins/${pluginId}/install`, {
        method: 'POST',
      });
      setInstalledList((prev) => [...prev, pluginId]);
    } catch (err: any) {
      alert(`Install plugin failed: ${err.message}`);
    } finally {
      setInstalling(null);
    }
  };

  if (!server) return <div className="p-8 text-center text-cs2-muted">Loading plugins...</div>;

  return (
    <div className="space-y-6">
      <ServerHeader server={server} />

      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-cs2-orange" />
          <span>CounterStrikeSharp & Metamod Plugin Marketplace</span>
        </h2>
        <p className="text-xs text-cs2-muted mt-1">
          Install verified CS2 community plugins into this server's isolated addons directory in 1-click.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {plugins.map((plugin) => {
          const isInstalled = installedList.includes(plugin.id);
          const isBusy = installing === plugin.id;

          return (
            <div
              key={plugin.id}
              className="p-5 rounded-2xl bg-cs2-surface border border-cs2-border hover:border-cs2-orange/40 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-white text-base">{plugin.name}</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cs2-card text-cs2-orange">
                    v{plugin.version}
                  </span>
                </div>

                <div className="text-[11px] text-cs2-muted mt-1 flex items-center gap-2">
                  <span>Author: {plugin.author}</span>
                  <span>•</span>
                  <span className="text-cs2-green">{plugin.install_count} installs</span>
                </div>

                <p className="text-xs text-cs2-muted mt-3 leading-relaxed">
                  {plugin.description}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cs2-card border border-cs2-border text-cs2-orange font-semibold">
                    CSS (.NET 8)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cs2-card border border-cs2-border text-cs2-blue font-semibold">
                    Metamod git1411
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-cs2-border flex items-center justify-between">
                {plugin.github_repo && (
                  <a
                    href={`https://github.com/${plugin.github_repo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cs2-muted hover:text-white flex items-center gap-1"
                  >
                    <span>GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                <button
                  onClick={() => handleInstallPlugin(plugin.id)}
                  disabled={isInstalled || isBusy}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    isInstalled
                      ? 'bg-cs2-green/20 text-cs2-green border border-cs2-green/30'
                      : 'bg-cs2-orange hover:bg-cs2-orangeHover text-black'
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
