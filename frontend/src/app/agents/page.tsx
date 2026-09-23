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
  Layers,
  Copy,
  Check,
  Key,
  Trash2,
  ExternalLink
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

interface ProvisionedTokenData {
  token: string;
  server_url: string;
  windows_cli: string;
  linux_cli: string;
  config_json: {
    platform_url: string;
    agent_token: string;
    heartbeat_seconds: number;
    local_llm_url: string;
  };
}

export default function ClientAgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'windows' | 'cli' | 'json'>('windows');
  
  const [tokenData, setTokenData] = useState<ProvisionedTokenData | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const generateNewToken = async () => {
    setTokenLoading(true);
    try {
      const res = await fetchApi('/agents/token', { method: 'POST' });
      // Fallback server_url to current browser origin if server is behind reverse proxy
      const origin = typeof window !== 'undefined' ? window.location.origin : (res.server_url || 'http://127.0.0.1:8000');
      const token = res.token || 'agt_' + Math.random().toString(36).substring(2, 15);
      
      setTokenData({
        token: token,
        server_url: origin,
        windows_cli: `.\\cs2agent.exe -server "${origin}" -token "${token}" -install-service`,
        linux_cli: `./cs2agent-linux-amd64 -server "${origin}" -token "${token}" -install-service`,
        config_json: {
          platform_url: origin,
          agent_token: token,
          heartbeat_seconds: 5,
          local_llm_url: 'http://127.0.0.1:11434'
        }
      });
    } catch (e) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000';
      const token = 'agt_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setTokenData({
        token: token,
        server_url: origin,
        windows_cli: `.\\cs2agent.exe -server "${origin}" -token "${token}" -install-service`,
        linux_cli: `./cs2agent-linux-amd64 -server "${origin}" -token "${token}" -install-service`,
        config_json: {
          platform_url: origin,
          agent_token: token,
          heartbeat_seconds: 5,
          local_llm_url: 'http://127.0.0.1:11434'
        }
      });
    } finally {
      setTokenLoading(false);
    }
  };

  const openConnectModal = () => {
    setInstallModalOpen(true);
    if (!tokenData) {
      generateNewToken();
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const deleteAgent = async (id: number) => {
    if (!confirm('Are you sure you want to disconnect and delete this agent node?')) return;
    try {
      await fetchApi(`/agents/${id}`, { method: 'DELETE' });
      setAgents((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      alert('Failed to delete agent: ' + (e instanceof Error ? e.message : String(e)));
    }
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
            Agents run locally on your gaming PC, friend's machine, or node server. They compile plugins via .NET 8, provide local Ollama LLM acceleration, and execute jobs with zero inward ports.
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
            onClick={openConnectModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cs2-orange hover:bg-cs2-orange/90 text-black text-sm font-semibold transition shadow-lg shadow-cs2-orange/20"
          >
            <Plus className="w-4 h-4" />
            Connect New Agent (Token & CLI)
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
              Connect your Windows PC or give a token to a friend to enable local .NET 8 compilation and Ollama GPU AI computation across your Swarm.
            </p>
          </div>
          <button
            onClick={openConnectModal}
            className="px-5 py-2.5 rounded-xl bg-cs2-orange text-black font-bold text-xs inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Connect Your Computer / Friend
          </button>
        </div>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div 
            key={agent.id}
            className="p-5 rounded-xl bg-cs2-card border border-cs2-border flex flex-col justify-between space-y-4 relative group"
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
                    <div className="text-xs text-cs2-muted mt-0.5">{agent.os} ({agent.arch}) • <span className="font-mono text-cs2-orange">{agent.agent_id}</span></div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right text-xs mr-2">
                    <div className="text-cs2-muted">Last Heartbeat</div>
                    <div className="text-white font-medium">{agent.last_heartbeat_at ? new Date(agent.last_heartbeat_at).toLocaleTimeString() : 'Recent'}</div>
                  </div>
                  <button
                    onClick={() => deleteAgent(agent.id)}
                    className="p-1.5 rounded-lg bg-cs2-surface hover:bg-red-500/20 text-cs2-muted hover:text-red-400 transition"
                    title="Remove Agent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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

      {/* Connect & Setup Modal */}
      {installModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-cs2-card border border-cs2-border p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-cs2-orange" />
                <h3 className="text-lg font-bold text-white">Connect Windows / Linux Client Agent</h3>
              </div>
              <button
                onClick={() => setInstallModalOpen(false)}
                className="text-cs2-muted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Generated Secret Token Banner */}
            <div className="p-4 rounded-xl bg-cs2-surface border border-cs2-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cs2-muted flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cs2-orange" /> Unique Agent Authentication Token
                </span>
                <button
                  onClick={generateNewToken}
                  disabled={tokenLoading}
                  className="text-xs text-cs2-orange hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${tokenLoading ? 'animate-spin' : ''}`} /> Regenerate
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 bg-black/70 p-2.5 rounded-lg border border-cs2-border">
                <span className="font-mono text-sm text-cs2-green font-semibold select-all break-all">
                  {tokenData?.token || 'Generating token...'}
                </span>
                <button
                  onClick={() => tokenData && copyToClipboard(tokenData.token, 'token')}
                  className="px-3 py-1.5 rounded bg-cs2-surface hover:bg-cs2-border text-xs text-white flex items-center gap-1.5 shrink-0 transition"
                >
                  {copiedKey === 'token' ? <Check className="w-3.5 h-3.5 text-cs2-green" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'token' ? 'Copied!' : 'Copy Token'}
                </button>
              </div>
            </div>

            {/* Tabs for Installation Methods */}
            <div className="space-y-3">
              <div className="flex gap-2 border-b border-cs2-border pb-2 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('windows')}
                  className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'windows' ? 'bg-cs2-orange text-black font-bold' : 'text-cs2-muted hover:text-white'}`}
                >
                  1. Windows 1-Click CLI (Recommended)
                </button>
                <button
                  onClick={() => setActiveTab('cli')}
                  className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'cli' ? 'bg-cs2-orange text-black font-bold' : 'text-cs2-muted hover:text-white'}`}
                >
                  2. Linux Daemon
                </button>
                <button
                  onClick={() => setActiveTab('json')}
                  className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'json' ? 'bg-cs2-orange text-black font-bold' : 'text-cs2-muted hover:text-white'}`}
                >
                  3. config.json
                </button>
              </div>

              {activeTab === 'windows' && (
                <div className="space-y-3 text-xs text-cs2-muted">
                  <p>
                    Open PowerShell / Terminal in the folder with <code className="text-white bg-cs2-surface px-1 py-0.5 rounded">cs2agent.exe</code> and run this command. It will write your token and register the agent in Windows Task Scheduler:
                  </p>
                  <div className="p-3.5 rounded-xl bg-black/90 border border-cs2-border font-mono text-xs text-cs2-orange flex items-center justify-between gap-3 select-all">
                    <span className="break-all">{tokenData?.windows_cli || 'Loading...'}</span>
                    <button
                      onClick={() => tokenData && copyToClipboard(tokenData.windows_cli, 'win_cli')}
                      className="px-3 py-1.5 rounded bg-cs2-surface hover:bg-cs2-border text-xs text-white flex items-center gap-1.5 shrink-0 transition"
                    >
                      {copiedKey === 'win_cli' ? <Check className="w-3.5 h-3.5 text-cs2-green" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'win_cli' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'cli' && (
                <div className="space-y-3 text-xs text-cs2-muted">
                  <p>
                    On Linux, run the agent with the <code className="text-white bg-cs2-surface px-1 py-0.5 rounded">-install-service</code> flag to generate and start a systemd background service:
                  </p>
                  <div className="p-3.5 rounded-xl bg-black/90 border border-cs2-border font-mono text-xs text-cs2-orange flex items-center justify-between gap-3 select-all">
                    <span className="break-all">{tokenData?.linux_cli || 'Loading...'}</span>
                    <button
                      onClick={() => tokenData && copyToClipboard(tokenData.linux_cli, 'lin_cli')}
                      className="px-3 py-1.5 rounded bg-cs2-surface hover:bg-cs2-border text-xs text-white flex items-center gap-1.5 shrink-0 transition"
                    >
                      {copiedKey === 'lin_cli' ? <Check className="w-3.5 h-3.5 text-cs2-green" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'lin_cli' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'json' && (
                <div className="space-y-3 text-xs text-cs2-muted">
                  <p>
                    Alternatively, save this content as <code className="text-white bg-cs2-surface px-1 py-0.5 rounded">~/.cs2panel/agent_config.json</code>:
                  </p>
                  <div className="p-3.5 rounded-xl bg-black/90 border border-cs2-border font-mono text-xs text-cs2-orange relative group">
                    <pre className="overflow-x-auto select-all">
                      {JSON.stringify(tokenData?.config_json, null, 2)}
                    </pre>
                    <button
                      onClick={() => tokenData && copyToClipboard(JSON.stringify(tokenData.config_json, null, 2), 'cfg_json')}
                      className="absolute top-3 right-3 px-3 py-1.5 rounded bg-cs2-surface hover:bg-cs2-border text-xs text-white flex items-center gap-1.5 transition"
                    >
                      {copiedKey === 'cfg_json' ? <Check className="w-3.5 h-3.5 text-cs2-green" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'cfg_json' ? 'Copied' : 'Copy JSON'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-cs2-surface border border-cs2-border text-xs space-y-1 text-cs2-muted">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cs2-green" /> Zero Inward Ports & NAT Traversal
              </div>
              <div>The Client Agent establishes an outbound persistent channel to the panel. Your friend doesn't need to open any ports or firewall settings.</div>
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
