'use client';

import React, { useState } from 'react';
import { 
  Trophy, 
  Play, 
  Pause, 
  ShieldCheck, 
  Users, 
  Clock, 
  Layers, 
  Plus, 
  Download, 
  Radio, 
  CheckCircle2, 
  Award,
  Video,
  Swords
} from 'lucide-react';

interface Match {
  id: string;
  title: string;
  format: 'BO1' | 'BO3' | 'BO5';
  team1: { name: string; tag: string; score: number };
  team2: { name: string; tag: string; score: number };
  currentMap: string;
  status: 'live' | 'warmup' | 'knife' | 'paused' | 'finished';
  serverName: string;
  roundCurrent: number;
  maxRounds: number;
  demoUrl?: string;
  startTime: string;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([
    {
      id: 'm_scrim_navi_faze',
      title: 'Major Qualifier - Quarter Finals',
      format: 'BO3',
      team1: { name: 'Natus Vincere', tag: 'NAVI', score: 11 },
      team2: { name: 'FaZe Clan', tag: 'FaZe', score: 8 },
      currentMap: 'de_mirage',
      status: 'live',
      serverName: 'Warsaw Node-01 (128 Tick / Sub-tick)',
      roundCurrent: 19,
      maxRounds: 24,
      startTime: '35 mins ago'
    },
    {
      id: 'm_scrim_vitality_astralis',
      title: 'Community League Div 1',
      format: 'BO1',
      team1: { name: 'Team Vitality', tag: 'VIT', score: 13 },
      team2: { name: 'Astralis', tag: 'AST', score: 7 },
      currentMap: 'de_inferno',
      status: 'finished',
      serverName: 'Frankfurt Node-02',
      roundCurrent: 20,
      maxRounds: 24,
      demoUrl: 'https://demos.cs2panel.local/scrim_vitality_astralis.dem',
      startTime: '2 hours ago'
    }
  ]);

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
              MatchZy Protocol Native
            </span>
          </div>
          <p className="text-sm text-cs2-muted mt-1">
            Automated competitive matches with knife round coordinator, tactical pauses, automated GOTV demo recording, and live webhooks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cs2-orange hover:bg-cs2-orange/90 text-black text-sm font-semibold transition shadow-lg shadow-cs2-orange/20">
            <Plus className="w-4 h-4" />
            Create Match / Scrim
          </button>
        </div>
      </div>

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
                  <div className="text-xs text-cs2-muted">{match.serverName} • Map: <span className="text-white font-medium">{match.currentMap}</span></div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {match.status === 'live' && (
                  <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <Radio className="w-3.5 h-3.5" /> LIVE ROUND {match.roundCurrent}/{match.maxRounds}
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
                <div className="text-lg font-black text-white">{match.team1.name}</div>
                <div className="text-xs text-cs2-muted">[{match.team1.tag}]</div>
              </div>

              <div className="px-6 py-2 rounded-xl bg-cs2-card border border-cs2-border flex items-center gap-4">
                <span className="text-3xl font-black text-cs2-orange">{match.team1.score}</span>
                <span className="text-xs text-cs2-muted font-bold">:</span>
                <span className="text-3xl font-black text-white">{match.team2.score}</span>
              </div>

              <div className="flex-1 text-left pl-6">
                <div className="text-lg font-black text-white">{match.team2.name}</div>
                <div className="text-xs text-cs2-muted">[{match.team2.tag}]</div>
              </div>
            </div>

            {/* Match Controls & Demos */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <div className="flex items-center gap-2 text-cs2-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>Started: {match.startTime}</span>
              </div>

              <div className="flex items-center gap-2">
                {match.status === 'live' && (
                  <>
                    <button className="px-3 py-1.5 rounded-lg bg-cs2-surface hover:bg-cs2-border text-white font-medium border border-cs2-border flex items-center gap-1.5">
                      <Pause className="w-3.5 h-3.5 text-cs2-orange" />
                      Tactical Pause
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-cs2-surface hover:bg-cs2-border text-white font-medium border border-cs2-border flex items-center gap-1.5">
                      <Swords className="w-3.5 h-3.5 text-cs2-orange" />
                      Restart Knife Round
                    </button>
                  </>
                )}
                {match.demoUrl && (
                  <a
                    href={match.demoUrl}
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
    </div>
  );
}
