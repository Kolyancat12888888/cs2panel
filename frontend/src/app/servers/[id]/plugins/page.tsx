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
  Cpu,
  Layers,
  Sparkles,
  Send,
  Sliders,
  Workflow
} from 'lucide-react';

interface StudioProject {
  id: number;
  name: string;
  slug: string;
  category: string;
  version: string;
  description: string;
  author: string;
  versions_count?: number;
  updated_at: string;
}

export default function ServerPluginsPage() {
  const params = useParams();
  const serverId = params.id as string;
  const [server, setServer] = useState<Server | null>(null);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [studioProjects, setStudioProjects] = useState<StudioProject[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'studio' | 'marketplace'>('all');
  
  const [installingEngine, setInstallingEngine] = useState(false);
  const [reloadingPlugins, setReloadingPlugins] = useState(false);
  const [deployingProjectId, setDeployingProjectId] = useState<number | null>(null);
  const [installingPluginId, setInstallingPluginId] = useState<number | null>(null);
  const [installedPlugins, setInstalledPlugins] = useState<number[]>([]);
  const [deployedStudioProjects, setDeployedStudioProjects] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    fetchApi(`/servers/${serverId}`).then(setServer).catch(() => {});
    
    // Load Community Marketplace Plugins
    fetchApi('/plugins')
      .then((data) => {
        if (Array.isArray(data)) setPlugins(data);
      })
      .catch(() => {});

    // Load User's Visual Plugin Studio Projects
    fetchApi('/studio/projects')
      .then((data) => {
        if (Array.isArray(data)) setStudioProjects(data);
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

  const handleDeployStudioProject = async (projectId: number) => {
    setDeployingProjectId(projectId);
    try {
      const res = await fetchApi(`/studio/projects/${projectId}/deploy`, {
        method: 'POST',
        body: JSON.stringify({ server_id: serverId }),
      });
      setDeployedStudioProjects((prev) => [...prev, projectId]);
      showToast(res.message || 'Studio project deployed to server!');
    } catch (err: any) {
      alert(`Deployment failed: ${err.message}`);
    } finally {
      setDeployingProjectId(null);
    }
  };

  const handleInstallPlugin = async (pluginId: number) => {
    setInstallingPluginId(pluginId);
    try {
      const res = await fetchApi(`/servers/${serverId}/plugins/${pluginId}/install`, {
        method: 'POST',
      });
      setInstalledPlugins((prev) => [...prev, pluginId]);
      showToast(res.message || 'Plugin verified and active!');
    } catch (err: any) {
      alert(`Install plugin failed: ${err.message}`);
    } finally {
      setInstallingPluginId(null);
    }
  };

  if (!server) return <div className="p-8 text-center text-cs2-muted">Loading plugins...</div>;

  const filteredMarketplace = plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredStudio = studioProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <ServerHeader server={server} />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-cs2-green text-black px-5 py-3 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
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

      {/* Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cs2-border pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-cs2-orange text-black shadow-md shadow-cs2-orange/20'
                : 'bg-cs2-card hover:bg-cs2-border text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Plugins ({studioProjects.length + plugins.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'studio'
                ? 'bg-cs2-orange text-black shadow-md shadow-cs2-orange/20'
                : 'bg-cs2-card hover:bg-cs2-border text-gray-400 hover:text-white'
            }`}
          >
            <Workflow className="w-3.5 h-3.5 text-purple-400" />
            <span>My Studio Projects ({studioProjects.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'marketplace'
                ? 'bg-cs2-orange text-black shadow-md shadow-cs2-orange/20'
                : 'bg-cs2-card hover:bg-cs2-border text-gray-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-cs2-blue" />
            <span>Marketplace ({plugins.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plugins & studio projects..."
            className="w-full bg-cs2-surface border border-cs2-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-cs2-orange"
          />
        </div>
      </div>

      {/* Section 1: My Custom Studio Projects */}
      {(activeTab === 'all' || activeTab === 'studio') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">My Visual Plugin Studio Projects</h3>
            </div>
            <Link
              href="/studio"
              className="text-xs text-cs2-orange hover:underline font-bold flex items-center gap-1"
            >
              <span>Create New in Studio</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {filteredStudio.length === 0 ? (
            <div className="p-8 rounded-2xl bg-cs2-surface border border-cs2-border text-center space-y-3">
              <Workflow className="w-10 h-10 text-cs2-border mx-auto" />
              <p className="text-sm font-bold text-gray-300">No Studio Projects Found</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Create visual node graphs (.cs2graph) in Plugin Studio, compile with AI, and deploy them here with 1-click.
              </p>
              <Link
                href="/studio"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open Visual Plugin Studio</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStudio.map((project) => {
                const isDeployed = deployedStudioProjects.includes(project.id);
                const isBusy = deployingProjectId === project.id;

                return (
                  <div
                    key={project.id}
                    className="p-5 rounded-2xl bg-cs2-surface border border-purple-500/30 hover:border-purple-500/60 transition flex flex-col justify-between space-y-4 shadow-lg shadow-purple-950/10"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-white text-base flex items-center gap-2">
                            <span>{project.name}</span>
                          </h4>
                          <div className="text-[11px] text-purple-300 mt-0.5 flex items-center gap-2 font-mono">
                            <span>{project.category}</span>
                            <span>•</span>
                            <span>v{project.version || '1.0.0'}</span>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                          Custom Studio
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
                        {project.description || 'Custom CS2 plugin built with Visual Studio'}
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-cs2-card border border-cs2-border text-cs2-orange font-semibold">
                          CSS (.NET 8)
                        </span>
                        <span className="text-[10px] text-cs2-muted ml-auto font-mono text-[10px]">
                          {project.versions_count || 1} versions
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-cs2-border flex items-center justify-between gap-2">
                      <Link
                        href={`/studio/${project.id}`}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition font-medium"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>Edit Graph</span>
                      </Link>

                      <button
                        onClick={() => handleDeployStudioProject(project.id)}
                        disabled={isBusy}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                          isDeployed
                            ? 'bg-cs2-green/20 text-cs2-green border border-cs2-green/30'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                        }`}
                      >
                        {isDeployed ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Deployed & Active</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>{isBusy ? 'Deploying...' : 'Deploy to Server'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Section 2: Verified Community Marketplace */}
      {(activeTab === 'all' || activeTab === 'marketplace') && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-cs2-orange" />
            <h3 className="text-base font-bold text-white">Verified CS2 Community Plugins</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMarketplace.map((plugin) => {
              const isInstalled = installedPlugins.includes(plugin.id);
              const isBusy = installingPluginId === plugin.id;

              return (
                <div
                  key={plugin.id}
                  className="p-5 rounded-2xl bg-cs2-surface border border-cs2-border hover:border-cs2-orange/40 transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-white text-base">{plugin.name}</h4>
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
      )}
    </div>
  );
}
