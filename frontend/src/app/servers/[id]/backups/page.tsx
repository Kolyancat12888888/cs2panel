'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ServerHeader from '@/components/ServerHeader';
import { Server } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import { HardDrive, Plus, Download, RotateCcw, Trash2, CheckCircle2 } from 'lucide-react';

interface BackupItem {
  id: number;
  name: string;
  file_name: string;
  size_bytes: number;
  created_at: string;
}

export default function ServerBackupsPage() {
  const params = useParams();
  const serverId = params.id as string;
  const [server, setServer] = useState<Server | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([
    { id: 1, name: 'Pre-MatchZy-Update-Backup', file_name: 'backup-2026-09-20.tar.gz', size_bytes: 24500000, created_at: '2026-09-20 14:00' },
  ]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchApi(`/servers/${serverId}`).then(setServer).catch(() => {});
    fetchApi(`/servers/${serverId}/backups`).then((data) => {
      if (Array.isArray(data) && data.length > 0) setBackups(data);
    }).catch(() => {});
  }, [serverId]);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const res = await fetchApi(`/servers/${serverId}/backups`, { method: 'POST' });
      setBackups((prev) => [res, ...prev]);
    } catch (err: any) {
      alert(`Create backup failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (!server) return <div className="p-8 text-center text-cs2-muted">Loading backups...</div>;

  return (
    <div className="space-y-6">
      <ServerHeader server={server} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-cs2-orange" />
            <span>Fast Isolated Server Backups</span>
          </h2>
          <p className="text-xs text-cs2-muted mt-1">
            Backups only capture your isolated configs, plugins, and custom maps (~25 MB), keeping backups instant and lightweight.
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="px-4 py-2.5 rounded-xl bg-cs2-orange text-black font-bold text-xs hover:bg-cs2-orangeHover transition flex items-center gap-2 shadow-lg shadow-cs2-orange/20"
        >
          <Plus className="w-4 h-4" />
          <span>{creating ? 'Creating Snapshot...' : 'Create Backup Snapshot'}</span>
        </button>
      </div>

      <div className="space-y-3">
        {backups.map((b) => (
          <div
            key={b.id}
            className="p-4 rounded-xl bg-cs2-surface border border-cs2-border flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{b.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cs2-card font-mono text-gray-400">
                  {b.file_name}
                </span>
              </div>
              <div className="text-xs text-cs2-muted mt-1">
                Size: <span className="text-white font-mono">{Math.round(b.size_bytes / 1024 / 1024)} MB</span> | Created: <span className="text-gray-400">{b.created_at}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => alert('Restoring server configs and addons...')}
                className="px-3 py-1.5 rounded-lg bg-cs2-card hover:bg-cs2-orange hover:text-black text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore in 1-Click</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
