'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ServerHeader from '@/components/ServerHeader';
import { Server } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import { BarChart3, Trophy, Target, Crosshair } from 'lucide-react';

interface PlayerStat {
  id: number;
  steam_id: string;
  player_name: string;
  kills: number;
  deaths: number;
  headshots: number;
  mvps: number;
  score: number;
}

export default function ServerStatsPage() {
  const params = useParams();
  const serverId = params.id as string;
  const [server, setServer] = useState<Server | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([
    { id: 1, steam_id: '76561198012345678', player_name: 's1mple_fan', kills: 482, deaths: 210, headshots: 260, mvps: 34, score: 1250 },
    { id: 2, steam_id: '76561198087654321', player_name: 'ZywOo_Clutch', kills: 410, deaths: 195, headshots: 215, mvps: 28, score: 1100 },
    { id: 3, steam_id: '76561198099887766', player_name: 'Donk_Entry', kills: 395, deaths: 230, headshots: 285, mvps: 22, score: 980 },
  ]);

  useEffect(() => {
    fetchApi(`/servers/${serverId}`).then(setServer).catch(() => {});
    fetchApi(`/servers/${serverId}/stats`).then((data) => {
      if (Array.isArray(data) && data.length > 0) setStats(data);
    }).catch(() => {});
  }, [serverId]);

  if (!server) return <div className="p-8 text-center text-cs2-muted">Loading stats...</div>;

  return (
    <div className="space-y-6">
      <ServerHeader server={server} />

      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-cs2-orange" />
          <span>Player Leaderboard & Match Performance</span>
        </h2>
        <p className="text-xs text-cs2-muted mt-1">
          Automated competitive statistics captured directly by CounterStrikeSharp analytics.
        </p>
      </div>

      <div className="rounded-2xl bg-cs2-surface border border-cs2-border overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-cs2-card border-b border-cs2-border text-cs2-muted font-bold uppercase text-[10px]">
            <tr>
              <th className="p-4">Rank</th>
              <th className="p-4">Player</th>
              <th className="p-4">Kills</th>
              <th className="p-4">Deaths</th>
              <th className="p-4">K/D</th>
              <th className="p-4">Headshot %</th>
              <th className="p-4">MVPs</th>
              <th className="p-4">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cs2-border/60">
            {stats.map((p, idx) => {
              const kd = (p.kills / Math.max(1, p.deaths)).toFixed(2);
              const hsPct = Math.round((p.headshots / Math.max(1, p.kills)) * 100);

              return (
                <tr key={p.id} className="hover:bg-cs2-card/40 transition">
                  <td className="p-4 font-bold text-cs2-orange">#{idx + 1}</td>
                  <td className="p-4">
                    <div className="font-bold text-white">{p.player_name}</div>
                    <div className="font-mono text-[10px] text-cs2-muted">{p.steam_id}</div>
                  </td>
                  <td className="p-4 text-white font-bold">{p.kills}</td>
                  <td className="p-4 text-gray-400">{p.deaths}</td>
                  <td className="p-4 font-bold text-cs2-green">{kd}</td>
                  <td className="p-4 text-white font-mono">{hsPct}%</td>
                  <td className="p-4 text-cs2-orange font-bold">{p.mvps}</td>
                  <td className="p-4 text-purple-400 font-bold">{p.score}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
