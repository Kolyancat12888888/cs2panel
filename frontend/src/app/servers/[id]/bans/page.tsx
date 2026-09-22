'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ServerHeader from '@/components/ServerHeader';
import { Server, Ban, AdminPrivilege } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import { ShieldAlert, ShieldCheck, UserX, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export default function ServerBansAdminsPage() {
  const params = useParams();
  const serverId = params.id as string;
  const [server, setServer] = useState<Server | null>(null);
  const [bans, setBans] = useState<Ban[]>([]);
  const [admins, setAdmins] = useState<AdminPrivilege[]>([]);
  const [newBan, setNewBan] = useState({
    player_name: '',
    steam_id: '',
    ban_type: 'ban',
    reason: 'Cheating / Aimbot',
    duration_minutes: 0,
  });

  const loadData = () => {
    fetchApi(`/servers/${serverId}`).then(setServer).catch(() => {});
    fetchApi(`/servers/${serverId}/bans`).then((data) => {
      if (Array.isArray(data)) setBans(data);
    }).catch(() => {});
    fetchApi(`/servers/${serverId}/admins`).then((data) => {
      if (Array.isArray(data)) setAdmins(data);
    }).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, [serverId]);

  const handleCreateBan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi(`/servers/${serverId}/bans`, {
        method: 'POST',
        body: JSON.stringify(newBan),
      });
      setNewBan({ player_name: '', steam_id: '', ban_type: 'ban', reason: '', duration_minutes: 0 });
      loadData();
    } catch (err: any) {
      alert(`Add ban failed: ${err.message}`);
    }
  };

  const handleUnban = async (banId: number) => {
    try {
      await fetchApi(`/bans/${banId}/unban`, { method: 'POST' });
      loadData();
    } catch (err: any) {
      alert(`Unban failed: ${err.message}`);
    }
  };

  if (!server) return <div className="p-8 text-center text-cs2-muted">Loading bans...</div>;

  return (
    <div className="space-y-6">
      <ServerHeader server={server} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Ban Form */}
        <div className="rounded-2xl bg-cs2-surface border border-cs2-border p-5 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <UserX className="w-4 h-4 text-cs2-red" />
            <span>Issue Player Punishment</span>
          </h3>

          <form onSubmit={handleCreateBan} className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-cs2-muted block mb-1">Player Name</label>
              <input
                type="text"
                required
                placeholder="ToxicPlayer123"
                value={newBan.player_name}
                onChange={(e) => setNewBan({ ...newBan, player_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs focus:outline-none focus:border-cs2-orange"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-cs2-muted block mb-1">SteamID64</label>
              <input
                type="text"
                placeholder="76561198000000000"
                value={newBan.steam_id}
                onChange={(e) => setNewBan({ ...newBan, steam_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs focus:outline-none focus:border-cs2-orange font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-cs2-muted block mb-1">Type</label>
                <select
                  value={newBan.ban_type}
                  onChange={(e) => setNewBan({ ...newBan, ban_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs focus:outline-none focus:border-cs2-orange"
                >
                  <option value="ban">Server Ban</option>
                  <option value="mute">Voice Mute</option>
                  <option value="gag">Chat Gag</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-cs2-muted block mb-1">Duration</label>
                <select
                  value={newBan.duration_minutes}
                  onChange={(e) => setNewBan({ ...newBan, duration_minutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs focus:outline-none focus:border-cs2-orange"
                >
                  <option value={0}>Permanent</option>
                  <option value={60}>1 Hour</option>
                  <option value={1440}>1 Day</option>
                  <option value={10080}>7 Days</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-cs2-muted block mb-1">Reason</label>
              <input
                type="text"
                required
                value={newBan.reason}
                onChange={(e) => setNewBan({ ...newBan, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs focus:outline-none focus:border-cs2-orange"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-cs2-red hover:bg-red-600 text-white font-bold text-xs transition"
            >
              Apply Punishment & RCON Kick
            </button>
          </form>
        </div>

        {/* Bans List */}
        <div className="lg:col-span-2 rounded-2xl bg-cs2-surface border border-cs2-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cs2-orange" />
              <span>Active Server Bans ({bans.length})</span>
            </h3>
          </div>

          <div className="space-y-2">
            {bans.length === 0 ? (
              <div className="text-center py-8 text-xs text-cs2-muted">
                No active bans recorded on this server.
              </div>
            ) : (
              bans.map((ban) => (
                <div
                  key={ban.id}
                  className="p-3.5 rounded-xl bg-cs2-card border border-cs2-border flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{ban.player_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cs2-red/20 text-cs2-red font-semibold uppercase">
                        {ban.ban_type}
                      </span>
                      {ban.is_unbanned && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cs2-green/20 text-cs2-green font-semibold">
                          Unbanned
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-cs2-muted mt-1">
                      Reason: <span className="text-gray-300">{ban.reason}</span> | Admin: <span className="text-gray-300">{ban.admin_name}</span> | SteamID: <span className="font-mono text-gray-400">{ban.steam_id || 'N/A'}</span>
                    </div>
                  </div>

                  {!ban.is_unbanned && (
                    <button
                      onClick={() => handleUnban(ban.id)}
                      className="px-3 py-1.5 rounded-lg bg-cs2-border hover:bg-cs2-green hover:text-black text-white text-xs font-bold transition"
                    >
                      Unban
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
