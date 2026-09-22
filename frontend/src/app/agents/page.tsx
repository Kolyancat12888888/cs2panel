'use client';

import React, { useEffect, useState } from 'react';
import { 
  Bot, 
  Cpu, 
  HardDrive, 
  Download, 
  Clock, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  Plus, 
  RefreshCw,
  Terminal,
  Layers
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface AgentData {
  id: number;
  agent_id: string;
  device_id: string;
  device_name: string;
  status: string;
  os: string;
  arch: string;
  cpu_usage: number;
  ram_usage_mb: number;
  active_job_id?: string;
  capabilities?: Record<string, boolean>;
  last_heartbeat_at?: string;
  created_at: string;
}

export default function ClientAgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const loadAgents = () => {
    setLoading(true);
    fetchApi('/agents')
      .then((data) => {
        if (Array.isArray(data)) {
          setAgents(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load agents:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Bot className="w-7 h-7 text-cs2-orange" />
              Client AI Agents Hub
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-cs2-green/10 text-cs2-green border border-cs2-green/20 text-xs font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Secure Outbound WS
            </span>
          </div>
          <p className="text-sm text-cs2-muted mt-1">
            Agents run locally on your gaming PC or dev machine. They compile plugins via .NET 8, provide local Ollama LLM acceleration, and execute jobs with zero open inward ports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAgents}
            className="p-2 rounded-lg bg-cs2-surface hover:bg-cs2-border text-cs2-muted hover:text-white border border-cs2-border transition"
            title="Refresh Agents"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cs2-orange' : ''}`} />
          </button>
          <button 
            onClick={() => setInstallModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cs2-orange hover:bg-cs2-orange/90 text-black text-sm font-semibold transition shadow-lg shadow-cs2-orange/20"
          >
            <Download className="w-4 h-4" />
            Connect New Agent (PowerShell)
          </button>
        </div>
      </div>

      {/* Empty State */}
      {agents.length === 0 && !loading && (
        <div className="p-12 rounded-2xl bg-cs2-card border border-cs2-border text-center space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-cs2-surface border border-cs2-border flex items-center justify-center text-cs2-muted mx-auto">
            <Bot className="w-7 h-7 text-cs2-orange" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Client Agents Connected Yet</h3>
            <p className="text-xs text-cs2-muted mt-1 leading-relaxed">
              Connect your Windows PC or Linux machine using our 1-click PowerShell installer to enable local .NET 8 compilation and Ollama AI code generation.
            </p>
          </div>
          <button
            onClick={() => setInstallModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-cs2-orange text-black font-bold text-xs inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Connect Your Computer
          </button>
        </div>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div 
            key={agent.id}
            className="p-5 rounded-xl bg-cs2-card border border-cs2-border flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-cs2-surface border border-cs2-border flex items-center justify-center text-cs2-orange">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{agent.device_name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                        agent.status === 'ready' || agent.status === 'busy'
                          ? 'bg-cs2-green/10 text-cs2-green border border-cs2-green/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-cs2-green animate-pulse" />
                        {agent.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-cs2-muted mt-0.5">{agent.os} ({agent.arch}) • {agent.agent_id}</div>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div className="text-cs2-muted">Last Heartbeat</div>
                  <div className="text-white font-medium">{agent.last_heartbeat_at ? new Date(agent.last_heartbeat_at).toLocaleTimeString() : 'Recent'}</div>
                </div>
              </div>

              {/* Hardware Stats */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 rounded-lg bg-cs2-surface border border-cs2-border">
                  <div className="flex items-center justify-between text-xs text-cs2-muted mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cs2-orange" /> CPU Load
                    </span>
                    <span className="text-white font-mono font-medium">{agent.cpu_usage}%</span>
                  </div>
                  <div className="w-full bg-cs2-border h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cs2-orange h-full" style={{ width: `${Math.min(100, agent.cpu_usage)}%` }} />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-cs2-surface border border-cs2-border">
                  <div className="flex items-center justify-between text-xs text-cs2-muted mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-blue-400" /> RAM Used
                    </span>
                    <span className="text-white font-mono font-medium">{agent.ram_usage_mb} MB</span>
                  </div>
                  <div className="w-full bg-cs2-border h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${Math.min(100, (agent.ram_usage_mb / 16384) * 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* Capabilities & SDKs */}
              <div className="mt-4 space-y-2">
                <div className="text-xs font-semibold text-cs2-muted uppercase tracking-wider">
                  Discovered Local Capabilities
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {agent.capabilities && Object.entries(agent.capabilities).map(([key, val]) => (
                    <span key={key} className="px-2 py-1 rounded bg-cs2-surface border border-cs2-border text-xs font-mono text-cs2-orange flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {key}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-cs2-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-cs2-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>Connected: {new Date(agent.created_at).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-cs2-green font-medium">
                  {agent.active_job_id ? `Active Job: ${agent.active_job_id}` : 'Idle (Ready for Jobs)'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Install Instruction Modal */}
      {installModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-cs2-card border border-cs2-border p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-cs2-orange" />
                <h3 className="text-lg font-bold text-white">Connect Windows/Linux Client Agent</h3>
              </div>
              <button
                onClick={() => setInstallModalOpen(false)}
                className="text-cs2-muted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm text-cs2-muted">
              <p>
                Run this single command in PowerShell on your Windows PC to download, register, and start the background Agent service:
              </p>

              <div className="p-4 rounded-xl bg-black/80 border border-cs2-border font-mono text-xs text-cs2-orange flex items-center justify-between select-all">
                <span>powershell -ExecutionPolicy Bypass -File .\client-agent\installer\install.ps1</span>
              </div>

              <div className="p-3 rounded-lg bg-cs2-surface border border-cs2-border text-xs space-y-1">
                <div className="font-semibold text-white">Zero Inward Ports / Zero Firewall Setup</div>
                <div>The Client Agent connects outbound to the panel WebSocket. Your IP and ports are never exposed.</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInstallModalOpen(false)}
                className="px-5 py-2 rounded-lg bg-cs2-orange text-black font-semibold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
