'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Code2, 
  Plus, 
  Search, 
  Layers, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  Bot, 
  Zap, 
  Cpu, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface PluginProjectData {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  version: string;
  author: string;
  graph_json?: any;
  versions_count?: number;
  created_at: string;
  updated_at: string;
}

export default function StudioHubPage() {
  const [projects, setProjects] = useState<PluginProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState('Gamemode');

  const loadProjects = () => {
    setLoading(true);
    fetchApi('/studio/projects')
      .then((data) => {
        if (Array.isArray(data)) {
          setProjects(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load projects:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      await fetchApi('/studio/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
          category: newProjectCategory,
        }),
      });
      setIsCreateModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      loadProjects();
    } catch (err: any) {
      alert(`Create project error: ${err.message}`);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
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
          <button 
            onClick={loadProjects}
            className="p-2 rounded-lg bg-cs2-surface hover:bg-cs2-border text-cs2-muted hover:text-white border border-cs2-border transition"
            title="Refresh Projects"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cs2-orange' : ''}`} />
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

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-cs2-card border border-cs2-border">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-cs2-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects by name or description..."
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

      {/* Empty State */}
      {filteredProjects.length === 0 && !loading && (
        <div className="p-12 rounded-2xl bg-cs2-card border border-cs2-border text-center space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-cs2-surface border border-cs2-border flex items-center justify-center text-cs2-muted mx-auto">
            <Code2 className="w-7 h-7 text-cs2-orange" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Visual Graph Projects Created</h3>
            <p className="text-xs text-cs2-muted mt-1 leading-relaxed">
              Create your first CS2 plugin visually using nodes (Events, Conditions, Actions) or generate it instantly with your local Ollama AI model.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-cs2-orange text-black font-bold text-xs inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Your First Plugin Graph
          </button>
        </div>
      )}

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
                        v{project.version}
                      </span>
                      <span>•</span>
                      <span>{project.category}</span>
                      <span>•</span>
                      <span>{project.versions_count || 1} snapshots</span>
                    </div>
                  </div>
                </div>

                <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 bg-cs2-green/10 text-cs2-green border border-cs2-green/20">
                  <CheckCircle2 className="w-3 h-3" /> GRAPH ACTIVE
                </span>
              </div>

              <p className="text-sm text-cs2-muted mt-3 line-clamp-2">
                {project.description || 'Custom CounterStrikeSharp plugin project.'}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-cs2-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-cs2-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>Updated: {new Date(project.updated_at).toLocaleDateString()}</span>
                <span>•</span>
                <span>Author: {project.author}</span>
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
          <div className="w-full max-w-lg rounded-2xl bg-cs2-card border border-cs2-border p-6 shadow-2xl space-y-5">
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
                  placeholder="e.g. CS2 Retakes Core, VIP Trails, Knife Vampirism"
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
                  <option value="Security">Security & Anti-Cheat (ESP Blocker, Filters)</option>
                  <option value="Tournament">Tournament & Scrims (MatchZy style, Pause)</option>
                  <option value="Utility">Utility & Chat (Tags, HUD, Messages)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your plugin behavior..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                />
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
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
