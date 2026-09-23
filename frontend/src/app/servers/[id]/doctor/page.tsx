'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ServerHeader from '@/components/ServerHeader';
import { Server } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Wrench, 
  Terminal, 
  Check, 
  Cpu, 
  Zap,
  Sparkles
} from 'lucide-react';

interface Incident {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING';
  culprit: string;
  message: string;
  solution: string;
  detected_at: string;
}

interface DoctorStatus {
  health_score: number;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  incidents: Incident[];
  total_incidents: number;
  last_scanned_at: string;
}

export default function ServerCrashDoctorPage() {
  const params = useParams();
  const serverId = params.id as string;
  const [server, setServer] = useState<Server | null>(null);
  const [doctorData, setDoctorData] = useState<DoctorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolvedMsg, setResolvedMsg] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchApi(`/servers/${serverId}`),
      fetchApi(`/servers/${serverId}/doctor/status`),
    ])
      .then(([srv, doc]) => {
        if (srv) setServer(srv);
        if (doc?.success && doc.data) setDoctorData(doc.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [serverId]);

  const handleAutoHeal = async () => {
    setResolving(true);
    setResolvedMsg(null);
    try {
      const res = await fetchApi(`/servers/${serverId}/doctor/resolve`, { method: 'POST' });
      if (res?.success) {
        setResolvedMsg('Auto-Healer executed: problematic hooks isolated and clean restart scheduled.');
        setTimeout(loadData, 2000);
      }
    } catch (err: any) {
      alert(`Auto-heal error: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  if (!server) return <div className="p-8 text-center text-cs2-muted">Loading server sentinel...</div>;

  const score = doctorData?.health_score ?? 100;
  const status = doctorData?.status ?? 'HEALTHY';

  return (
    <div className="space-y-6">
      <ServerHeader server={server} />

      {/* Sentinel Health Gauge Card */}
      <div className="p-6 rounded-2xl bg-cs2-surface border border-cs2-border flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${
            status === 'HEALTHY'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : status === 'DEGRADED'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">AI Crash Doctor & Sentinel</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                status === 'HEALTHY'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : status === 'DEGRADED'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {status}
              </span>
            </div>
            <p className="text-xs text-cs2-muted mt-0.5">
              Live kernel log inspection & Metamod/CSSharp crash isolation engine.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-black font-mono text-white">{score}%</div>
            <div className="text-[10px] uppercase font-bold text-cs2-muted">Health Index</div>
          </div>

          {status !== 'HEALTHY' && (
            <button
              onClick={handleAutoHeal}
              disabled={resolving}
              className="px-4 py-2.5 rounded-xl bg-cs2-orange hover:bg-cs2-orangeHover text-black font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-cs2-orange/20"
            >
              <Wrench className={`w-4 h-4 ${resolving ? 'animate-spin' : ''}`} />
              <span>{resolving ? 'Healing...' : '1-Click Auto-Heal'}</span>
            </button>
          )}

          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-cs2-card border border-cs2-border text-cs2-muted hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {resolvedMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{resolvedMsg}</span>
        </div>
      )}

      {/* Incidents Feed */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-cs2-orange" />
          <span>Real-Time Anomaly & Incident Reports</span>
        </h3>

        {!doctorData?.incidents || doctorData.incidents.length === 0 ? (
          <div className="p-8 rounded-2xl bg-cs2-surface border border-cs2-border text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">All Systems Operational</h4>
            <p className="text-xs text-cs2-muted max-w-md mx-auto">
              No crash signatures, null-pointer exceptions, or segmentation faults detected in recent server execution logs.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {doctorData.incidents.map((inc, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-cs2-surface border border-red-500/30 space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="font-bold text-white text-xs">{inc.culprit}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold uppercase">
                    {inc.severity}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-black/60 font-mono text-xs text-red-300 border border-red-500/20">
                  {inc.message}
                </div>

                <div className="p-3 rounded-xl bg-cs2-card/60 border border-cs2-border space-y-1">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Diagnostic Recommendation</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed font-mono">
                    {inc.solution}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
