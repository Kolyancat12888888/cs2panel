'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ServerHeader from '@/components/ServerHeader';
import { Server } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import { Clock, Plus, Trash2, ToggleLeft, ToggleRight, Play } from 'lucide-react';

interface ScheduleItem {
  id: number;
  name: string;
  cron_expression: string;
  action_type: string;
  payload?: string;
  is_active: boolean;
}

export default function ServerSchedulesPage() {
  const params = useParams();
  const serverId = params.id as string;
  const [server, setServer] = useState<Server | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([
    { id: 1, name: 'Daily Morning Restart', cron_expression: '0 5 * * *', action_type: 'restart', is_active: true },
    { id: 2, name: 'Backup Configs & Addons', cron_expression: '0 4 * * 0', action_type: 'backup', is_active: true },
  ]);

  useEffect(() => {
    fetchApi(`/servers/${serverId}`).then(setServer).catch(() => {});
    fetchApi(`/servers/${serverId}/schedules`).then((data) => {
      if (Array.isArray(data) && data.length > 0) setSchedules(data);
    }).catch(() => {});
  }, [serverId]);

  if (!server) return <div className="p-8 text-center text-cs2-muted">Loading schedules...</div>;

  return (
    <div className="space-y-6">
      <ServerHeader server={server} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cs2-orange" />
            <span>Server Cron Schedules & Automated Tasks</span>
          </h2>
          <p className="text-xs text-cs2-muted mt-1">
            Automate server restarts, map changes, backups and custom RCON commands by time or interval.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {schedules.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl bg-cs2-surface border border-cs2-border flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-white text-sm">{item.name}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cs2-card border border-cs2-border font-mono text-cs2-orange">
                  {item.cron_expression}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cs2-blue/20 text-cs2-blue">
                  {item.action_type}
                </span>
              </div>
              <div className="text-xs text-cs2-muted mt-1">
                Status: <span className={item.is_active ? 'text-cs2-green font-semibold' : 'text-cs2-muted'}>{item.is_active ? 'Active' : 'Disabled'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSchedules((prev) =>
                    prev.map((s) => (s.id === item.id ? { ...s, is_active: !s.is_active } : s))
                  );
                }}
                className="p-2 rounded-lg bg-cs2-card hover:bg-cs2-border text-white text-xs font-bold transition"
              >
                {item.is_active ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
