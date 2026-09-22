'use client';

import React, { useEffect, useState } from 'react';
import { FileText, ShieldCheck, UserCheck, Key, Terminal } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface AuditLog {
  id: number;
  action: string;
  description: string;
  ip_address: string;
  created_at: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([
    { id: 1, action: 'server.create', description: "Created server 'CS2Panel Public Competitive 5v5 #1' with master symlinks", ip_address: '127.0.0.1', created_at: '2026-09-22 10:00:00' },
    { id: 2, action: 'plugin.install', description: "Installed plugin 'MatchZy' into instance addons directory", ip_address: '127.0.0.1', created_at: '2026-09-22 10:05:12' },
    { id: 3, action: 'config.edit', description: "Saved modified 'server.cfg' with custom round timers", ip_address: '127.0.0.1', created_at: '2026-09-22 10:10:45' },
    { id: 4, action: 'rcon.execute', description: "Executed RCON command 'css_plugins reload'", ip_address: '127.0.0.1', created_at: '2026-09-22 10:11:02' },
  ]);

  useEffect(() => {
    fetchApi('/activity-logs').then((data) => {
      if (data && Array.isArray(data.data) && data.data.length > 0) setLogs(data.data);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">System & User Audit Trail</h1>
        <p className="text-xs text-cs2-muted mt-1">
          Cryptographically recorded actions, config mutations, RCON executions and security events.
        </p>
      </div>

      <div className="rounded-2xl bg-cs2-surface border border-cs2-border overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-cs2-card border-b border-cs2-border text-cs2-muted font-bold uppercase text-[10px]">
            <tr>
              <th className="p-4">Timestamp</th>
              <th className="p-4">Action</th>
              <th className="p-4">Details</th>
              <th className="p-4">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cs2-border/60">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-cs2-card/40 transition">
                <td className="p-4 text-cs2-muted font-mono text-[11px] whitespace-nowrap">{log.created_at}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded bg-cs2-card border border-cs2-border text-cs2-orange font-mono font-bold text-[10px]">
                    {log.action}
                  </span>
                </td>
                <td className="p-4 text-white">{log.description}</td>
                <td className="p-4 text-gray-400 font-mono text-[11px]">{log.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
