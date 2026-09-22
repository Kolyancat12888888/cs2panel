'use client';

import React, { useState } from 'react';
import { 
  Bot, 
  Cpu, 
  HardDrive, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Layers, 
  Zap, 
  Code2, 
  Download, 
  RefreshCw,
  Clock,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface AgentNode {
  id: string;
  name: string;
  os: string;
  status: 'online' | 'offline' | 'busy';
  ip: string;
  cpuUsage: number;
  ramUsage: number;
  dotnetSdk: string;
  installedSdks: string[];
  activeJobs: number;
  lastHeartbeat: string;
  uptime: string;
}

export default function ClientAgentsPage() {
  const [agents, setAgents] = useState<AgentNode[]>([
    {
      id: 'agent_desktop_ryzen9',
      name: 'DESKTOP-RYZEN9',
      os: 'Windows 11 Pro 64-bit',
      status: 'online',
      ip: '192.168.1.105 (Outbound WS)',
      cpuUsage: 14,
      ramUsage: 42,
      dotnetSdk: '.NET 8.0.204',
      installedSdks: ['CounterStrikeSharp v1411', 'Metamod:Source v1282', 'Ollama (DeepSeek-Coder:6.7b)'],
      activeJobs: 0,
      lastHeartbeat: '2 seconds ago',
      uptime: '14h 32m'
    },
    {
      id: 'agent_dev_workstation',
      name: 'DEV-WORKSTATION-X',
      os: 'Ubuntu 24.04 LTS',
      status: 'online',
      ip: '10.0.0.12 (Outbound WS)',
      cpuUsage: 28,
      ramUsage: 61,
      dotnetSdk: '.NET 8.0.100',
      installedSdks: ['CounterStrikeSharp v1411', 'LM Studio (Qwen2.5-Coder:7b)'],
      activeJobs: 1,
      lastHeartbeat: '1 second ago',
      uptime: '3d 8h'
    }
  ]);

  const [installModalOpen, setInstallModalOpen] = useState(false);

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
            Agents run locally on your development machine or Windows PC. They compile C# plugins via .NET 8, provide local AI copilot acceleration, and execute background tasks without exposing inward ports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setInstallModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cs2-orange hover:bg-cs2-orange/90 text-black text-sm font-semibold transition shadow-lg shadow-cs2-orange/20"
          >
            <Download className="w-4 h-4" />
            Connect New Agent (PowerShell)
          </button>
        </div>
      </div>

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
                      <h3 className="text-base font-bold text-white">{agent.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cs2-green/10 text-cs2-green border border-cs2-green/20 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cs2-green animate-pulse" />
                        ONLINE
                      </span>
                    </div>
                    <div className="text-xs text-cs2-muted mt-0.5">{agent.os} • {agent.ip}</div>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div className="text-cs2-muted">Last Ping</div>
                  <div className="text-white font-medium">{agent.lastHeartbeat}</div>
                </div>
              </div>

              {/* Hardware Stats */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 rounded-lg bg-cs2-surface border border-cs2-border">
                  <div className="flex items-center justify-between text-xs text-cs2-muted mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cs2-orange" /> CPU Load
                    </span>
                    <span className="text-white font-mono font-medium">{agent.cpuUsage}%</span>
                  </div>
                  <div className="w-full bg-cs2-border h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cs2-orange h-full" style={{ width: `${agent.cpuUsage}%` }} />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-cs2-surface border border-cs2-border">
                  <div className="flex items-center justify-between text-xs text-cs2-muted mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-blue-400" /> RAM Memory
                    </span>
                    <span className="text-white font-mono font-medium">{agent.ramUsage}%</span>
                  </div>
                  <div className="w-full bg-cs2-border h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${agent.ramUsage}%` }} />
                  </div>
                </div>
              </div>

              {/* Capabilities & SDKs */}
              <div className="mt-4 space-y-2">
                <div className="text-xs font-semibold text-cs2-muted uppercase tracking-wider">
                  Available Compilers & Local LLMs
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-1 rounded bg-cs2-surface border border-cs2-border text-xs font-mono text-cs2-orange flex items-center gap-1">
                    <Zap className="w-3 h-3" /> {agent.dotnetSdk}
                  </span>
                  {agent.installedSdks.map((sdk, idx) => (
                    <span key={idx} className="px-2 py-1 rounded bg-cs2-surface border border-cs2-border text-xs font-mono text-cs2-muted">
                      {sdk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="pt-3 border-t border-cs2-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-cs2-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>Uptime: {agent.uptime}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-cs2-green font-medium">
                  {agent.activeJobs === 0 ? 'Idle (Ready for Jobs)' : `${agent.activeJobs} Active Compilation Job`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Installation Instruction Modal */}
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

              <div className="p-4 rounded-xl bg-black/80 border border-cs2-border font-mono text-xs text-cs2-orange flex items-center justify-between">
                <span>powershell -ExecutionPolicy Bypass -File .\client-agent\installer\install.ps1</span>
              </div>

              <div className="p-3 rounded-lg bg-cs2-surface border border-cs2-border text-xs space-y-1">
                <div className="font-semibold text-white">Zero Firewall Configuration Needed</div>
                <div>The Client Agent establishes an outgoing secure WebSocket connection to the Control Plane. Your local IP or ports are never exposed to the internet.</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInstallModalOpen(false)}
                className="px-5 py-2 rounded-lg bg-cs2-orange text-black font-semibold text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
