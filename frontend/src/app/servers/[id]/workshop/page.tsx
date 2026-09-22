'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ServerHeader from '@/components/ServerHeader';
import { Server, WorkshopMap } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import { Map, Check, Play, ExternalLink } from 'lucide-react';

export default function ServerWorkshopPage() {
  const params = useParams();
  const serverId = params.id as string;
  const [server, setServer] = useState<Server | null>(null);
  const [maps, setMaps] = useState<WorkshopMap[]>([]);
  const [activeMap, setActiveMap] = useState<string>('');

  useEffect(() => {
    fetchApi(`/servers/${serverId}`).then((s) => {
      setServer(s);
      if (s) setActiveMap(s.default_map);
    }).catch(() => {});

    fetchApi('/workshop/maps').then((data) => {
      if (Array.isArray(data)) setMaps(data);
    }).catch(() => {});
  }, [serverId]);

  const handleSetMap = async (mapName: string) => {
    try {
      await fetchApi(`/servers/${serverId}/workshop/set-map`, {
        method: 'POST',
        body: JSON.stringify({ map_name: mapName }),
      });
      setActiveMap(mapName);
    } catch (err: any) {
      alert(`Failed to set map: ${err.message}`);
    }
  };

  if (!server) return <div className="p-8 text-center text-cs2-muted">Loading maps...</div>;

  return (
    <div className="space-y-6">
      <ServerHeader server={server} />

      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Map className="w-5 h-5 text-cs2-orange" />
          <span>Steam Workshop & Competitive Map Pool</span>
        </h2>
        <p className="text-xs text-cs2-muted mt-1">
          Switch active map or add workshop maps directly into the server's map rotation cycle.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {maps.map((m) => {
          const isCurrent = activeMap === m.map_name;

          return (
            <div
              key={m.id}
              className="p-5 rounded-2xl bg-cs2-surface border border-cs2-border hover:border-cs2-orange/40 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">{m.title}</h3>
                  {isCurrent && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cs2-green/20 text-cs2-green border border-cs2-green/30">
                      Active Map
                    </span>
                  )}
                </div>

                <div className="text-xs font-mono text-cs2-muted mt-1">
                  Workshop ID: <span className="text-gray-300">{m.workshop_id}</span>
                </div>

                <div className="mt-4 flex items-center gap-1.5 flex-wrap">
                  {m.game_mode_tags && m.game_mode_tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-cs2-card text-cs2-muted font-mono">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleSetMap(m.map_name)}
                disabled={isCurrent}
                className={`mt-5 w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  isCurrent
                    ? 'bg-cs2-card text-cs2-muted cursor-default'
                    : 'bg-cs2-orange hover:bg-cs2-orangeHover text-black'
                }`}
              >
                {isCurrent ? (
                  <>
                    <Check className="w-4 h-4 text-cs2-green" />
                    <span>Currently Running</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Change to this Map</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
