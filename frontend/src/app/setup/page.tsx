'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Server, 
  Bot, 
  Database, 
  CheckCircle2, 
  ArrowRight, 
  Key, 
  Mail, 
  User, 
  Lock, 
  Sparkles,
  Terminal,
  Cpu,
  Layers,
  HelpCircle
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function SetupWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Admin Account
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirm, setAdminConfirm] = useState('');

  // Step 2: Database & Queue
  const [dbDriver, setDbDriver] = useState('sqlite');
  const [queueDriver, setQueueDriver] = useState('sync'); // sync or redis
  const [cronConfigured, setCronConfigured] = useState(true);

  // Step 3: First Node (Remote Server)
  const [nodeName, setNodeName] = useState('Remote-Node-01');
  const [nodeIp, setNodeIp] = useState('127.0.0.1');
  const [nodePort, setNodePort] = useState('8888');
  const [nodeSftp, setNodeSftp] = useState('2222');
  const [masterCs2Path, setMasterCs2Path] = useState('/var/lib/pterodactyl/volumes/94654458-5da3-4306-9489-15697eae8112');
  const [nodeToken, setNodeToken] = useState('cs2panel_node_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));

  // Step 4: Client AI Agent
  const [agentName, setAgentName] = useState('My-Gaming-PC');
  const [localLlmUrl, setLocalLlmUrl] = useState('http://127.0.0.1:11434');

  // Handle Complete Setup
  const handleCompleteSetup = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Create Admin Account
      const regRes = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          password: adminPassword,
        }),
      });

      if (regRes.token) {
        localStorage.setItem('auth_token', regRes.token);
        localStorage.setItem('user', JSON.stringify(regRes.user));
      }

      // 2. Add First Node if configured
      if (nodeIp && nodeIp !== 'skipped') {
        try {
          await fetchApi('/nodes', {
            method: 'POST',
            body: JSON.stringify({
              name: nodeName,
              fqdn: nodeIp,
              ip_address: nodeIp,
              daemon_port: parseInt(nodePort),
              sftp_port: parseInt(nodeSftp),
              daemon_secret: nodeToken,
              master_path: masterCs2Path,
              location: 'Remote Dedicated Node',
            }),
          });
        } catch (e) {
          console.warn('Node registration deferred:', e);
        }
      }

      // Redirect to Dashboard
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Setup error. Please check fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] flex flex-col justify-center items-center p-4 relative overflow-hidden text-white selection:bg-cs2-orange selection:text-black">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cs2-orange/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="w-full max-w-2xl z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cs2-surface border border-cs2-border text-xs font-semibold text-cs2-orange">
            <Sparkles className="w-3.5 h-3.5" /> First-Run Installation Wizard
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">CS2Panel Initial Setup</h1>
          <p className="text-xs text-cs2-muted max-w-md mx-auto">
            Configure your root administrator account, database queues, initial game node cluster, and AI client agents.
          </p>
        </div>

        {/* Wizard Steps Indicator */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { num: 1, title: 'Admin Account' },
            { num: 2, title: 'Database & Queue' },
            { num: 3, title: 'Initial CS2 Node' },
            { num: 4, title: 'AI Client Agent' }
          ].map((s) => (
            <div
              key={s.num}
              className={`p-2.5 rounded-xl border text-center transition ${
                step === s.num
                  ? 'bg-cs2-card border-cs2-orange text-white'
                  : step > s.num
                  ? 'bg-cs2-card/40 border-cs2-green/40 text-cs2-green'
                  : 'bg-cs2-surface/40 border-cs2-border text-cs2-muted'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider">Step {s.num}</div>
              <div className="text-xs font-bold truncate mt-0.5">{s.title}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-medium animate-in fade-in">
            {error}
          </div>
        )}

        {/* Wizard Step Content Box */}
        <div className="p-6 rounded-2xl bg-cs2-card border border-cs2-border shadow-2xl space-y-5 backdrop-blur-xl">
          {/* STEP 1: Root Admin Account */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-cs2-border pb-3">
                <div className="w-10 h-10 rounded-xl bg-cs2-orange/10 text-cs2-orange border border-cs2-orange/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Create Root Administrator Account</h3>
                  <p className="text-xs text-cs2-muted">This will be your primary superuser account for the panel.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1">Admin Username</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-cs2-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Administrator"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-sm text-white focus:outline-none focus:border-cs2-orange"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-cs2-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="admin@yourdomain.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-sm text-white focus:outline-none focus:border-cs2-orange"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-cs2-muted absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-sm text-white focus:outline-none focus:border-cs2-orange"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-cs2-muted absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={adminConfirm}
                        onChange={(e) => setAdminConfirm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-sm text-white focus:outline-none focus:border-cs2-orange"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  disabled={!adminName || !adminEmail || !adminPassword || adminPassword !== adminConfirm}
                  onClick={() => setStep(2)}
                  className="px-5 py-2 rounded-lg bg-cs2-orange hover:bg-cs2-orange/90 text-black font-bold text-xs transition flex items-center gap-2 disabled:opacity-40"
                >
                  Next Step <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Database, Queues & Cron */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-cs2-border pb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Database Engine & Job Queues</h3>
                  <p className="text-xs text-cs2-muted">Choose your storage engine and background job scheduler.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-cs2-muted uppercase mb-2">Database Driver</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDbDriver('sqlite')}
                      className={`p-3 rounded-xl border text-left transition ${
                        dbDriver === 'sqlite' ? 'bg-cs2-orange/10 border-cs2-orange text-white' : 'bg-cs2-surface border-cs2-border text-cs2-muted'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">SQLite (Zero Setup)</div>
                      <div className="text-[11px] text-cs2-muted mt-1">Lightweight single-file database. Instant startup.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDbDriver('mysql')}
                      className={`p-3 rounded-xl border text-left transition ${
                        dbDriver === 'mysql' ? 'bg-cs2-orange/10 border-cs2-orange text-white' : 'bg-cs2-surface border-cs2-border text-cs2-muted'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">MySQL / MariaDB</div>
                      <div className="text-[11px] text-cs2-muted mt-1">For multi-node enterprise installations.</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-cs2-muted uppercase mb-2">Queue Worker Driver</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setQueueDriver('sync')}
                      className={`p-3 rounded-xl border text-left transition ${
                        queueDriver === 'sync' ? 'bg-cs2-orange/10 border-cs2-orange text-white' : 'bg-cs2-surface border-cs2-border text-cs2-muted'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">Sync Driver (No Redis required)</div>
                      <div className="text-[11px] text-cs2-muted mt-1">Processes events synchronously. Ideal for quick start.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQueueDriver('redis')}
                      className={`p-3 rounded-xl border text-left transition ${
                        queueDriver === 'redis' ? 'bg-cs2-orange/10 border-cs2-orange text-white' : 'bg-cs2-surface border-cs2-border text-cs2-muted'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">Redis Queue</div>
                      <div className="text-[11px] text-cs2-muted mt-1">Asynchronous high-throughput background jobs.</div>
                    </button>
                  </div>
                </div>

                {/* Cron Instruction */}
                <div className="p-3.5 rounded-xl bg-cs2-surface border border-cs2-border space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-cs2-orange">
                    <Terminal className="w-3.5 h-3.5" /> System Background Cron Schedule
                  </div>
                  <p className="text-[11px] text-cs2-muted">
                    To automate server crash supervisors, backup rotations, and schedules, add this to your system crontab:
                  </p>
                  <div className="p-2 rounded bg-black/80 font-mono text-[11px] text-cs2-green border border-cs2-border">
                    * * * * * cd /opt/cs2panel/backend &amp;&amp; php artisan schedule:run &gt;&gt; /dev/null 2&gt;&amp;1
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg bg-cs2-surface hover:bg-cs2-border text-white text-xs font-medium"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2 rounded-lg bg-cs2-orange hover:bg-cs2-orange/90 text-black font-bold text-xs transition flex items-center gap-2"
                >
                  Next: Configure Node <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Initial CS2 Node */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-cs2-border pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Connect First CS2 Dedicated Node</h3>
                    <p className="text-xs text-cs2-muted">Connect your remote Linux VPS or local Master CS2 server.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNodeIp('skipped');
                    setStep(4);
                  }}
                  className="text-xs text-cs2-muted hover:text-white px-2 py-1 rounded bg-cs2-surface border border-cs2-border"
                >
                  Skip for Now
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1">Node Display Name</label>
                    <input
                      type="text"
                      value={nodeName}
                      onChange={(e) => setNodeName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-xs text-white focus:outline-none focus:border-cs2-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1">Node IP / FQDN</label>
                    <input
                      type="text"
                      value={nodeIp}
                      onChange={(e) => setNodeIp(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-xs text-white focus:outline-none focus:border-cs2-orange"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1">Daemon API Port</label>
                    <input
                      type="text"
                      value={nodePort}
                      onChange={(e) => setNodePort(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-xs text-white focus:outline-none focus:border-cs2-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1">SFTP Port</label>
                    <input
                      type="text"
                      value={nodeSftp}
                      onChange={(e) => setNodeSftp(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-xs text-white focus:outline-none focus:border-cs2-orange"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1">Master CS2 Directory (~50 GB Base)</label>
                  <input
                    type="text"
                    value={masterCs2Path}
                    onChange={(e) => setMasterCs2Path(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-xs font-mono text-white focus:outline-none focus:border-cs2-orange"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1">Generated Cryptographic Node Secret</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={nodeToken}
                      className="w-full px-3 py-2 rounded-lg bg-black/70 border border-cs2-border text-xs font-mono text-cs2-orange select-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-lg bg-cs2-surface hover:bg-cs2-border text-white text-xs font-medium"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-5 py-2 rounded-lg bg-cs2-orange hover:bg-cs2-orange/90 text-black font-bold text-xs transition flex items-center gap-2"
                >
                  Next: Client AI Agent <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Client AI Agent */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-cs2-border pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cs2-green/10 text-cs2-green border border-cs2-green/20 flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Client AI Agent &amp; Visual Studio</h3>
                    <p className="text-xs text-cs2-muted">Local .NET 8 compiler &amp; Ollama acceleration setup.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCompleteSetup}
                  className="text-xs text-cs2-muted hover:text-white px-2 py-1 rounded bg-cs2-surface border border-cs2-border"
                >
                  Skip for Now
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-cs2-surface border border-cs2-border space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cs2-green" /> Outbound WebSocket Gateway Ready
                  </div>
                  <p className="text-[11px] text-cs2-muted leading-relaxed">
                    The Client Agent connects from your Windows/Linux PC outbound to this panel. Your local IP or ports will never be exposed.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1">Local PC Device Name</label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-xs text-white focus:outline-none focus:border-cs2-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1">Local Ollama LLM URL</label>
                    <input
                      type="text"
                      value={localLlmUrl}
                      onChange={(e) => setLocalLlmUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-xs text-white focus:outline-none focus:border-cs2-orange"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-black/80 border border-cs2-border text-xs font-mono text-cs2-orange flex items-center justify-between">
                  <span>powershell -ExecutionPolicy Bypass -File .\client-agent\installer\install.ps1</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 rounded-lg bg-cs2-surface hover:bg-cs2-border text-white text-xs font-medium"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCompleteSetup}
                  className="px-6 py-2.5 rounded-xl bg-cs2-orange hover:bg-cs2-orange/90 text-black font-extrabold text-xs transition flex items-center gap-2 shadow-lg shadow-cs2-orange/20 disabled:opacity-50"
                >
                  {loading ? 'Initializing CS2Panel...' : 'Complete Installation & Launch Panel'}
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
