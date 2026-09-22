'use client';

import React, { useEffect, useState } from 'react';
import { 
  Trophy, 
  Play, 
  Pause, 
  Clock, 
  Plus, 
  Download, 
  Radio, 
  CheckCircle2, 
  Swords,
  RefreshCw,
  Server
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface MatchGameData {
  id: number;
  match_id: string;
  server_id: number;
  title: string;
  format: 'BO1' | 'BO3' | 'BO5';
  team_1_name: string;
  team_2_name: string;
  team_1_score: number;
  team_2_score: number;
  current_map: string;
  status: 'warmup' | 'knife' | 'live' | 'paused' | 'finished';
  gotv_demo_url?: string;
  server?: {
    name: string;
  };
  created_at: string;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchGameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMatch, setNewMatch] = useState({
    server_id: 1,
    title: '',
    format: 'BO1',
    team_1_name: 'Team Alpha',
    team_2_name: 'Team Bravo',
    current_map: 'de_mirage',
  });

  const loadData = () => {
    setLoading(true);
    fetchApi('/matches')
      .then((data) => {
        if (Array.isArray(data)) setMatches(data);
      })
      .catch((err) => console.error('Failed to load matches:', err))
      .finally(() => setLoading(false));

    fetchApi('/servers')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setServers(data);
          setNewMatch((m) => ({ ...m, server_id: data[0].id }));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatch.title.trim()) return;

    try {
      await fetchApi('/matches', {
        method: 'POST',
        body: JSON.stringify(newMatch),
      });
      setIsModalOpen(false);
      setNewMatch({
        server_id: servers[0]?.id || 1,
        title: '',
        format: 'BO1',
        team_1_name: 'Team Alpha',
        team_2_name: 'Team Bravo',
        current_map: 'de_mirage',
      });
      loadData();
    } catch (err: any) {
      alert(`Create match error: ${err.message}`);
    }
  };

  const handleKnife = async (matchId: number) => {
    try {
      await fetchApi(`/matches/${matchId}/knife`, { method: 'POST' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePause = async (matchId: number) => {
    try {
      await fetchApi(`/matches/${matchId}/pause`, { method: 'POST' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUnpause = async (matchId: number) => {
    try {
      await fetchApi(`/matches/${matchId}/unpause`, { method: 'POST' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Trophy className="w-7 h-7 text-cs2-orange" />
              Tournament & Scrim Match Manager
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-cs2-orange/20 text-cs2-orange border border-cs2-orange/30 text-xs font-semibold flex items-center gap-1">
              MatchZy Native Engine
            </span>
          </div>
          <p className="text-sm text-cs2-muted mt-1">
            Automated competitive matches with knife round coordinator, tactical pauses, automated GOTV demo recording, and live webhooks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-cs2-surface hover:bg-cs2-border text-cs2-muted hover:text-white border border-cs2-border transition"
            title="Refresh Matches"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cs2-orange' : ''}`} />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cs2-orange hover:bg-cs2-orange/90 text-black text-sm font-semibold transition shadow-lg shadow-cs2-orange/20"
          >
            <Plus className="w-4 h-4" />
            Create Match / Scrim
          </button>
        </div>
      </div>

      {/* Empty State */}
      {matches.length === 0 && !loading && (
        <div className="p-12 rounded-2xl bg-cs2-card border border-cs2-border text-center space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-cs2-surface border border-cs2-border flex items-center justify-center text-cs2-muted mx-auto">
            <Trophy className="w-7 h-7 text-cs2-orange" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Active Tournament Matches</h3>
            <p className="text-xs text-cs2-muted mt-1 leading-relaxed">
              Launch competitive BO1, BO3 or BO5 series with knife rounds, automatic demo recording, and MatchZy coordination.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-cs2-orange text-black font-bold text-xs inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Schedule New Match
          </button>
        </div>
      )}

      {/* Matches Grid */}
      <div className="grid grid-cols-1 gap-4">
        {matches.map((match) => (
          <div 
            key={match.id}
            className="p-5 rounded-xl bg-cs2-card border border-cs2-border flex flex-col space-y-4"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-md bg-cs2-surface border border-cs2-border text-xs font-bold text-white uppercase">
                  {match.format}
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">{match.title}</h3>
                  <div className="text-xs text-cs2-muted">{match.server?.name || 'Assigned Server'} • Map: <span className="text-white font-medium">{match.current_map}</span></div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {match.status === 'live' && (
                  <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <Radio className="w-3.5 h-3.5" /> LIVE MATCH
                  </span>
                )}
                {match.status === 'knife' && (
                  <span className="px-2.5 py-1 rounded-full bg-cs2-orange/10 text-cs2-orange border border-cs2-orange/20 text-xs font-bold flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5" /> KNIFE ROUND
                  </span>
                )}
                {match.status === 'paused' && (
                  <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs font-bold flex items-center gap-1.5">
                    <Pause className="w-3.5 h-3.5" /> PAUSED
                  </span>
                )}
                {match.status === 'finished' && (
                  <span className="px-2.5 py-1 rounded-full bg-cs2-green/10 text-cs2-green border border-cs2-green/20 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
                  </span>
                )}
              </div>
            </div>

            {/* Scoreboard Banner */}
            <div className="p-4 rounded-xl bg-cs2-surface border border-cs2-border flex items-center justify-around text-center">
              <div className="flex-1 text-right pr-6">
                <div className="text-lg font-black text-white">{match.team_1_name}</div>
              </div>

              <div className="px-6 py-2 rounded-xl bg-cs2-card border border-cs2-border flex items-center gap-4">
                <span className="text-3xl font-black text-cs2-orange">{match.team_1_score}</span>
                <span className="text-xs text-cs2-muted font-bold">:</span>
                <span className="text-3xl font-black text-white">{match.team_2_score}</span>
              </div>

              <div className="flex-1 text-left pl-6">
                <div className="text-lg font-black text-white">{match.team_2_name}</div>
              </div>
            </div>

            {/* Match Controls */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <div className="flex items-center gap-2 text-cs2-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>Created: {new Date(match.created_at).toLocaleTimeString()}</span>
              </div>

              <div className="flex items-center gap-2">
                {match.status === 'warmup' && (
                  <button 
                    onClick={() => handleKnife(match.id)}
                    className="px-3 py-1.5 rounded-lg bg-cs2-orange hover:bg-cs2-orange/90 text-black font-semibold flex items-center gap-1.5"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    Start Knife Round
                  </button>
                )}
                {match.status === 'live' && (
                  <button 
                    onClick={() => handlePause(match.id)}
                    className="px-3 py-1.5 rounded-lg bg-cs2-surface hover:bg-cs2-border text-white font-medium border border-cs2-border flex items-center gap-1.5"
                  >
                    <Pause className="w-3.5 h-3.5 text-cs2-orange" />
                    Tactical Pause
                  </button>
                )}
                {match.status === 'paused' && (
                  <button 
                    onClick={() => handleUnpause(match.id)}
                    className="px-3 py-1.5 rounded-lg bg-cs2-green hover:bg-cs2-green/90 text-black font-semibold flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Resume Match
                  </button>
                )}
                {match.gotv_demo_url && (
                  <a
                    href={match.gotv_demo_url}
                    className="px-3 py-1.5 rounded-lg bg-cs2-surface hover:bg-cs2-border text-cs2-green font-medium border border-cs2-border flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download GOTV Demo (.dem)
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-cs2-card border border-cs2-border p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-cs2-orange" />
                <h3 className="text-lg font-bold text-white">Create Match / Scrim Series</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-cs2-muted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Target Game Server</label>
                <select
                  value={newMatch.server_id}
                  onChange={(e) => setNewMatch({ ...newMatch, server_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                >
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.port})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Tournament / Scrim Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Major Qualifiers Final, Clan War #1"
                  value={newMatch.title}
                  onChange={(e) => setNewMatch({ ...newMatch, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Format</label>
                  <select
                    value={newMatch.format}
                    onChange={(e) => setNewMatch({ ...newMatch, format: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                  >
                    <option value="BO1">Best of 1 (BO1)</option>
                    <option value="BO3">Best of 3 (BO3)</option>
                    <option value="BO5">Best of 5 (BO5)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Map</label>
                  <select
                    value={newMatch.current_map}
                    onChange={(e) => setNewMatch({ ...newMatch, current_map: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                  >
                    <option value="de_mirage">de_mirage</option>
                    <option value="de_inferno">de_inferno</option>
                    <option value="de_dust2">de_dust2</option>
                    <option value="de_nuke">de_nuke</option>
                    <option value="de_anubis">de_anubis</option>
                    <option value="de_ancient">de_ancient</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Team 1 Name</label>
                  <input
                    type="text"
                    value={newMatch.team_1_name}
                    onChange={(e) => setNewMatch({ ...newMatch, team_1_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Team 2 Name</label>
                  <input
                    type="text"
                    value={newMatch.team_2_name}
                    onChange={(e) => setNewMatch({ ...newMatch, team_2_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-white text-sm focus:outline-none focus:border-cs2-orange"
                  />
                </div>
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
                  Create & Launch Match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
