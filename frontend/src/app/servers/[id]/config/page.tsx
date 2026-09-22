'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ServerHeader from '@/components/ServerHeader';
import { Server, CvarPreset } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import { Sliders, Sparkles, Check, Play } from 'lucide-react';

export default function ServerConfigPage() {
  const params = useParams();
  const serverId = params.id as string;
  const [server, setServer] = useState<Server | null>(null);
  const [presets, setPresets] = useState<CvarPreset[]>([]);
  const [appliedPreset, setAppliedPreset] = useState<number | null>(null);

  useEffect(() => {
    fetchApi(`/servers/${serverId}`).then(setServer).catch(() => {});
    fetchApi('/cvars/presets').then((data) => {
      if (Array.isArray(data)) setPresets(data);
    }).catch(() => {});
  }, [serverId]);

  const handleApplyPreset = async (presetId: number) => {
    try {
      await fetchApi(`/servers/${serverId}/cvars/apply-preset/${presetId}`, {
        method: 'POST',
      });
      setAppliedPreset(presetId);
      setTimeout(() => setAppliedPreset(null), 3000);
    } catch (err: any) {
      alert(`Apply preset failed: ${err.message}`);
    }
  };

  if (!server) return <div className="p-8 text-center text-cs2-muted">Loading config...</div>;

  return (
    <div className="space-y-6">
      <ServerHeader server={server} />

      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cs2-orange" />
          <span>1-Click Game Mode Presets & Rules</span>
        </h2>
        <p className="text-xs text-cs2-muted mt-1">
          Apply complete rule sets, round timers, freeze times, and match parameters directly to server.cfg in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="p-5 rounded-2xl bg-cs2-surface border border-cs2-border hover:border-cs2-orange/40 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base">{preset.name}</h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cs2-card text-cs2-orange">
                  {preset.game_mode}
                </span>
              </div>
              <p className="text-xs text-cs2-muted mt-2 leading-relaxed">
                {preset.description}
              </p>

              <div className="mt-4 p-3 rounded-xl bg-cs2-card border border-cs2-border space-y-1 font-mono text-[11px] text-gray-300">
                {Object.entries(preset.cvars_json).slice(0, 4).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-cs2-muted">{k}</span>
                    <span className="text-cs2-orange font-bold">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleApplyPreset(preset.id)}
              className={`mt-5 w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                appliedPreset === preset.id
                  ? 'bg-cs2-green text-black'
                  : 'bg-cs2-orange hover:bg-cs2-orangeHover text-black'
              }`}
            >
              {appliedPreset === preset.id ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Preset Applied!</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Apply Preset</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
