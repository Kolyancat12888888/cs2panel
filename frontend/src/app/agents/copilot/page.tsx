'use client';

import React, { useEffect, useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  Code2, 
  Copy, 
  Check, 
  Wand2, 
  Terminal, 
  Zap, 
  ShieldCheck, 
  RefreshCw,
  ExternalLink,
  Cpu,
  Layers
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';

interface ModelOption {
  name: string;
  available_nodes: number;
  recommended: boolean;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  codeSnippet?: string;
  model?: string;
  timestamp: string;
}

export default function AiCopilotPage() {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState('qwen3-14b-tools:latest');
  const [totalNodes, setTotalNodes] = useState(1);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content: "👋 Welcome to **CS2Panel AI Copilot & Neural Code Architect**!\n\nI can help you build CounterStrikeSharp plugins, debug Metamod crashes, tune server configurations, or design custom visual node logic. Ask me anything or select a prompt preset below.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  useEffect(() => {
    fetchApi('/copilot/models')
      .then((res) => {
        if (res?.success && res.models) {
          setModels(res.models);
          if (res.models.length > 0) {
            setSelectedModel(res.models[0].name);
          }
          if (res.total_swarm_agents) {
            setTotalNodes(res.total_swarm_agents);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt;
    if (!promptToSend.trim() || isGenerating) return;

    const userMsg: Message = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputPrompt('');
    setIsGenerating(true);

    try {
      const res = await fetchApi('/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: promptToSend,
          model: selectedModel,
        }),
      });

      let responseText = res?.response || res?.message || 'Neural generation completed.';
      let codeSnippet = '';

      // Extract C# code block if present
      const codeMatch = responseText.match(/```(?:csharp|cs)?([\s\S]*?)```/);
      if (codeMatch) {
        codeSnippet = codeMatch[1].trim();
      }

      const botMsg: Message = {
        id: 'bot_' + Date.now(),
        sender: 'assistant',
        content: responseText,
        codeSnippet: codeSnippet || undefined,
        model: selectedModel,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot_err_' + Date.now(),
          sender: 'assistant',
          content: `⚠️ Neural Inference Error: ${err.message || 'Swarm worker unreachable'}. Ensure a Client Agent is online with Ollama.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const promptPresets = [
    { label: 'VIP Vampire Bloodlust', prompt: 'Write a CounterStrikeSharp C# plugin where VIP players gain +35 HP on kill, +50 HP on headshot with green CenterHtml popups.' },
    { label: 'Spawn Protection Shield', prompt: 'Write a CSSharp plugin granting 4 seconds godmode invulnerability on player spawn with visual chat notifications.' },
    { label: 'Killstreak Sound Announcer', prompt: 'Write a CSSharp plugin tracking player killstreaks (3=Killing Spree, 5=Rampage, 10=Godlike) with broadcast sounds.' },
    { label: 'Anti-AFK Spectator Mover', prompt: 'Write a CSSharp watchdog plugin moving players stationary for > 45 seconds to spectator team.' },
  ];

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4 flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cs2-border pb-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cs2-orange" />
            <span>AI Copilot & Neural Code Architect</span>
          </h1>
          <p className="text-xs text-cs2-muted mt-0.5">
            Decentralized Swarm Assistant • Powered by local Ollama workers ({totalNodes} active nodes).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cs2-surface border border-cs2-border text-xs">
            <Bot className="w-3.5 h-3.5 text-cs2-orange" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
            >
              {models.map((m) => (
                <option key={m.name} value={m.name} className="bg-cs2-surface text-white">
                  {m.name} {m.recommended ? '★' : ''}
                </option>
              ))}
            </select>
          </div>

          <Link
            href="/studio"
            className="px-3 py-1.5 rounded-lg bg-cs2-card border border-cs2-border hover:border-cs2-orange text-cs2-muted hover:text-white text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Code2 className="w-3.5 h-3.5 text-cs2-orange" />
            <span>Open Visual Studio</span>
          </Link>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[11px] font-bold text-cs2-muted shrink-0 uppercase tracking-wider">Presets:</span>
        {promptPresets.map((p) => (
          <button
            key={p.label}
            onClick={() => handleSend(p.prompt)}
            className="px-3 py-1 rounded-full bg-cs2-card/70 border border-cs2-border hover:border-cs2-orange hover:text-white text-cs2-muted text-xs shrink-0 transition"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl bg-cs2-surface border border-cs2-border shadow-inner">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-cs2-muted">
              <span>{m.sender === 'user' ? 'You' : `AI Copilot (${m.model || selectedModel})`}</span>
              <span>&bull;</span>
              <span>{m.timestamp}</span>
            </div>

            <div
              className={`p-4 rounded-2xl max-w-3xl text-xs space-y-3 leading-relaxed shadow-lg ${
                m.sender === 'user'
                  ? 'bg-cs2-orange text-black font-medium rounded-tr-none'
                  : 'bg-cs2-card border border-cs2-border text-gray-200 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>

              {m.codeSnippet && (
                <div className="rounded-xl overflow-hidden border border-cs2-border/80 bg-black/80 mt-2">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-cs2-card/90 border-b border-cs2-border text-[11px] text-cs2-muted">
                    <span className="font-mono text-cs2-orange font-bold">CounterStrikeSharp C#</span>
                    <button
                      onClick={() => copyToClipboard(m.codeSnippet!, m.id)}
                      className="flex items-center gap-1 text-cs2-muted hover:text-white transition"
                    >
                      {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === m.id ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <pre className="p-3 font-mono text-[11px] text-emerald-400 overflow-x-auto leading-tight">
                    <code>{m.codeSnippet}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-center gap-2 text-xs text-cs2-orange animate-pulse p-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Swarm Agent is generating response via Ollama neural pipeline...</span>
          </div>
        )}
      </div>

      {/* Input Prompt Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="Ask AI Copilot to generate plugins, analyze configs, or explain Metamod hooks..."
          disabled={isGenerating}
          className="flex-1 px-4 py-3 rounded-xl bg-cs2-surface border border-cs2-border text-white text-xs focus:outline-none focus:border-cs2-orange shadow-lg"
        />
        <button
          type="submit"
          disabled={isGenerating || !inputPrompt.trim()}
          className="px-5 py-3 rounded-xl bg-cs2-orange text-black font-bold text-xs hover:bg-cs2-orangeHover transition flex items-center gap-2 shadow-lg shadow-cs2-orange/20 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>Generate</span>
        </button>
      </form>
    </div>
  );
}
