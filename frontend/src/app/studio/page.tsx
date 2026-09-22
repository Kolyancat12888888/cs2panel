'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Code2, 
  Plus, 
  Search, 
  Filter, 
  Play, 
  Layers, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  Download,
  Upload,
  Cpu,
  Bot,
  Zap,
  Tag,
  Sparkles
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  nodeCount: number;
  lastEdited: string;
  status: 'compiled' | 'draft' | 'building' | 'deployed';
  assignedAgent?: string;
  author: string;
}

export default function StudioHubPage() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState('Gamemode');

  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'proj_warmup_arenas',
      name: '1v1 Multi-Arena Pro',
      description: 'Dynamic 1v1 arenas with queue system, weapon voting, elo rating, and automatic spawning logic.',
      category: 'Gamemode',
      version: 'v2.4.0',
      nodeCount: 42,
      lastEdited: '10 minutes ago',
      status: 'compiled',
      assignedAgent: 'DESKTOP-RYZEN9 (Local SDK)',
      author: 'Admin',
    },
    {
      id: 'proj_vip_store',
      name: 'Ultimate VIP & Credits Core',
      description: 'In-game HTML HUD menu, custom tag system, jump trails, double jump logic, and SQLite database storage.',
      category: 'Economy',
      version: 'v1.1.2',
      nodeCount: 68,
      lastEdited: '1 hour ago',
      status: 'deployed',
      assignedAgent: 'DESKTOP-RYZEN9 (Local SDK)',
      author: 'Admin',
    },
    {
      id: 'proj_anticheat_radar',
      name: 'Anti-Wallhack Radar Blocker',
      description: 'Transmits player dormancy data selectively to prevent ESP radar exploit feeds during competitive play.',
      category: 'Security',
      version: 'v1.0.0',
      nodeCount: 19,
      lastEdited: '2 days ago',
      status: 'draft',
      author: 'Admin',
    },
    {
      id: 'proj_matchzy_plus',
      name: 'Tournament Scrim Scorer',
      description: 'Auto demo recorder, live webhook broadcaster to Discord, knife round coordinator, and tactical timeout.',
      category: 'Tournament',
      version: 'v3.0.1',
      nodeCount: 85,
      lastEdited: '3 hours ago',
      status: 'compiled',
      assignedAgent: 'DEV-WORKSTATION',
      author: 'TournamentMaster',
    }
  ]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const newProj: Project = {
      id: `proj_${Date.now().toString(36)}`,
      name: newProjectName,
      description: newProjectDesc || 'Created with CS2 Visual Graph Studio',
      category: newProjectCategory,
      version: 'v1.0.0',
      nodeCount: 3,
      lastEdited: 'Just now',
      status: 'draft',
      author: 'You',
    };

    setProjects([newProj, ...projects]);
    setIsCreateModalOpen(false);
    setNewProjectName('');
    setNewProjectDesc('');
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory === 'all' || p.category.toLowerCase() === filterCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Code2 className="w-7 h-7 text-cs2-orange" />
              Visual CS2 Plugin Studio
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-cs2-orange/20 text-cs2-orange border border-cs2-orange/30 text-xs font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Node Engine v2.0
            </span>
          </div>
          <p className="text-sm text-cs2-muted mt-1">
            Build production CounterStrikeSharp & Metamod C# plugins with interactive visual nodes, live simulation, and instant 1-click deployment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cs2-card hover:bg-cs2-border text-white text-sm font-medium border border-cs2-border transition">
            <Upload className="w-4 h-4 text-cs2-muted" />
            Import .cs2graph
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cs2-orange hover:bg-cs2-orange/90 text-black text-sm font-semibold transition shadow-lg shadow-cs2-orange/20"
          >
            <Plus className="w-4 h-4" />
            Create Plugin Graph
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-cs2-card border border-cs2-border flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-cs2-muted">Active Graph Projects</div>
            <div className="text-2xl font-bold text-white mt-1">{projects.length}</div>
          </div>
          <div className="p-3 rounded-lg bg-cs2-orange/10 text-cs2-orange">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-cs2-card border border-cs2-border flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-cs2-muted">Connected Client Agents</div>
            <div className="text-2xl font-bold text-cs2-green mt-1">2 Online</div>
          </div>
          <div className="p-3 rounded-lg bg-cs2-green/10 text-cs2-green">
            <Bot className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-cs2-card border border-cs2-border flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-cs2-muted">Build Engine</div>
            <div className="text-2xl font-bold text-white mt-1">.NET 8.0 SDK</div>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-cs2-card border border-cs2-border flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-cs2-muted">Ready Node Blocks</div>
            <div className="text-2xl font-bold text-white mt-1">112 Nodes</div>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
            <Cpu className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-cs2-card border border-cs2-border">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-cs2-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects, categories or nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-sm text-white placeholder-cs2-muted focus:outline-none focus:border-cs2-orange"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'gamemode', 'economy', 'security', 'tournament', 'utility'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition ${
                filterCategory === cat
                  ? 'bg-cs2-orange text-black font-semibold'
                  : 'bg-cs2-surface text-cs2-muted hover:text-white border border-cs2-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProjects.map((project) => (
          <div 
            key={project.id}
            className="p-5 rounded-xl bg-cs2-card border border-cs2-border hover:border-cs2-orange/50 transition-all flex flex-col justify-between group shadow-sm hover:shadow-lg hover:shadow-black/40"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cs2-surface border border-cs2-border flex items-center justify-center text-cs2-orange group-hover:scale-105 transition">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <div>
                    <Link 
                      href={`/studio/${project.id}`}
                      className="text-base font-bold text-white hover:text-cs2-orange flex items-center gap-1.5 transition"
                    >
                      {project.name}
                      <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition text-cs2-orange" />
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-cs2-muted mt-0.5">
                      <span className="px-1.5 py-0.5 rounded bg-cs2-surface border border-cs2-border text-[11px] font-mono">
                        {project.version}
                      </span>
                      <span>•</span>
                      <span>{project.category}</span>
                      <span>•</span>
                      <span>{project.nodeCount} graph nodes</span>
                    </div>
                  </div>
                </div>

                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                  project.status === 'compiled'
                    ? 'bg-cs2-green/10 text-cs2-green border border-cs2-green/20'
                    : project.status === 'deployed'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                }`}>
                  {project.status === 'compiled' && <CheckCircle2 className="w-3 h-3" />}
                  {project.status === 'deployed' && <Zap className="w-3 h-3" />}
                  {project.status.toUpperCase()}
                </span>
              </div>

              <p className="text-sm text-cs2-muted mt-3 line-clamp-2">
                {project.description}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-cs2-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-cs2-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>Edited {project.lastEdited}</span>
                {project.assignedAgent && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-white font-medium">
                      <Bot className="w-3 h-3 text-cs2-orange" />
                      {project.assignedAgent}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/studio/${project.id}`}
                  className="px-3 py-1.5 rounded-lg bg-cs2-orange hover:bg-cs2-orange/90 text-black font-semibold text-xs transition flex items-center gap-1.5"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Open Canvas
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-cs2-card border border-cs2-border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-6 h-6 text-cs2-orange" />
                <h3 className="text-lg font-bold text-white">Create New Visual Plugin Graph</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-cs2-muted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">
                  Plugin Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS2 Retakes Pro, Killstreak HUD, Custom Shop"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">
                  Category
                </label>
                <select
                  value={newProjectCategory}
                  onChange={(e) => setNewProjectCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                >
                  <option value="Gamemode">Gamemode (Retakes, DM, Arenas, Surf, KZ)</option>
                  <option value="Economy">Economy & VIP (Shop, Credits, Ranks)</option>
                  <option value="Security">Security & Anti-Cheat (ESP Blocker, Speedhack Filter)</option>
                  <option value="Tournament">Tournament & Scrims (MatchZy style, Pause, Demo)</option>
                  <option value="Utility">Utility & Chat (Tags, Advertisements, HUD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your plugin behavior and goals..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div className="p-3 rounded-lg bg-cs2-surface border border-cs2-border text-xs text-cs2-muted space-y-1">
                <div className="flex items-center gap-1.5 text-white font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-cs2-orange" />
                  Auto-Populated Starter Nodes
                </div>
                <p>New projects initialize with Event: PluginLoad, Hook: OnTick, and Logger: PrintToServer nodes.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-cs2-surface hover:bg-cs2-border text-white text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cs2-orange hover:bg-cs2-orange/90 text-black font-semibold text-sm transition"
                >
                  Create & Launch Studio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
