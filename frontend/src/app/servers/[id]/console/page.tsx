'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import ServerHeader from '@/components/ServerHeader';
import { Server } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import { Terminal, Send, Trash2, Copy, Play, RotateCw } from 'lucide-react';

export default function ServerConsolePage() {
  const params = useParams();
  const serverId = params.id as string;
  const [server, setServer] = useState<Server | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const lastLogIndexRef = useRef(0);

  useEffect(() => {
    fetchApi(`/servers/${serverId}`)
      .then((data) => setServer(data))
      .catch(() => {});

    // Initial fetch
    fetchApi(`/servers/${serverId}/logs`)
      .then((data) => {
        if (data && Array.isArray(data.logs) && data.logs.length > 0) {
          setLogs(data.logs);
          lastLogIndexRef.current = data.logs.length;
        } else {
          setLogs([
            '>>> [CS2Panel] Connecting to Source 2 Server RCON Console...',
            '>>> [Engine] Source 2 Dedicated Server initialized',
            '>>> [CS2Panel] Ready for RCON commands (Type help or cvar name)',
          ]);
        }
      })
      .catch(() => {});

    // Poll new incoming log lines every 2 seconds
    const interval = setInterval(() => {
      fetchApi(`/servers/${serverId}/logs`)
        .then((data) => {
          if (!data || !Array.isArray(data.logs)) return;
          const totalCount = data.logs.length;
          if (totalCount > lastLogIndexRef.current) {
            const newLines = data.logs.slice(lastLogIndexRef.current);
            lastLogIndexRef.current = totalCount;
            setLogs((prev) => [...prev, ...newLines]);
          } else if (totalCount < lastLogIndexRef.current) {
            // Buffer was reset or server restarted
            lastLogIndexRef.current = totalCount;
            setLogs(data.logs);
          }
        })
        .catch(() => {});
    }, 2000);

    return () => clearInterval(interval);
  }, [serverId]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  useEffect(() => {
    if (isNearBottomRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const cmdToSend = command.trim();
    setLogs((prev) => [...prev, `> ${cmdToSend}`]);
    setCommandHistory((prev) => [...prev, cmdToSend]);
    setHistoryIndex(-1);
    setCommand('');
    isNearBottomRef.current = true;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }

    try {
      const res = await fetchApi(`/servers/${serverId}/rcon`, {
        method: 'POST',
        body: JSON.stringify({ command: cmdToSend }),
      });
      if (res && res.response) {
        setLogs((prev) => [...prev, res.response]);
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `[ERROR] RCON Failed: ${err.message}`]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCommand(commandHistory[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setCommand('');
      } else {
        setHistoryIndex(nextIndex);
        setCommand(commandHistory[nextIndex]);
      }
    }
  };

  const quickMacros = [
    { label: 'status', cmd: 'status' },
    { label: 'css_plugins list', cmd: 'css_plugins list' },
    { label: 'css_plugins reload', cmd: 'css_plugins reload' },
    { label: 'changelevel de_mirage', cmd: 'changelevel de_mirage' },
    { label: 'changelevel de_dust2', cmd: 'changelevel de_dust2' },
    { label: 'mp_restartgame 1', cmd: 'mp_restartgame 1' },
    { label: 'sv_cheats 1', cmd: 'sv_cheats 1' },
    { label: 'bot_kick', cmd: 'bot_kick' },
  ];

  const formatLogLine = (line: string) => {
    if (line.startsWith('>')) return <span className="text-cs2-orange font-bold">{line}</span>;
    if (line.includes('[ERROR]') || line.includes('CRASH')) return <span className="text-cs2-red">{line}</span>;
    if (line.includes('[Metamod') || line.includes('[CounterStrikeSharp]')) return <span className="text-cs2-green font-semibold">{line}</span>;
    if (line.includes('>>>')) return <span className="text-cs2-blue">{line}</span>;
    return <span className="text-gray-300">{line}</span>;
  };

  if (!server) {
    return (
      <div className="p-8 text-center text-cs2-muted">
        Loading server console...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ServerHeader server={server} onRefresh={() => fetchApi(`/servers/${serverId}`).then(setServer)} />

      {/* Macros */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-cs2-muted uppercase mr-1">Quick Macros:</span>
        {quickMacros.map((macro) => (
          <button
            key={macro.label}
            onClick={() => {
              setCommand(macro.cmd);
            }}
            className="px-2.5 py-1 rounded-md bg-cs2-surface hover:bg-cs2-card border border-cs2-border text-[11px] font-mono text-gray-300 hover:text-cs2-orange transition"
          >
            {macro.label}
          </button>
        ))}
      </div>

      {/* Terminal Container */}
      <div className="rounded-2xl bg-black/90 border border-cs2-border overflow-hidden flex flex-col h-[560px] shadow-2xl">
        {/* Terminal Title Bar */}
        <div className="h-10 bg-cs2-surface border-b border-cs2-border px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cs2-orange" />
            <span className="text-xs font-bold text-white tracking-wider">CS2 RCON TERMINAL (Subtick 128)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLogs([]);
                lastLogIndexRef.current = 0;
              }}
              className="p-1 rounded hover:bg-cs2-card text-cs2-muted hover:text-white transition text-xs flex items-center gap-1"
              title="Clear Terminal"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Terminal Logs Output */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1 select-text scroll-smooth"
        >
          {logs.map((line, idx) => (
            <div key={idx} className="leading-relaxed">
              {formatLogLine(line)}
            </div>
          ))}
        </div>

        {/* Command Input Bar */}
        <form onSubmit={handleSendCommand} className="p-3 bg-cs2-surface border-t border-cs2-border flex items-center gap-2">
          <span className="text-cs2-orange font-mono text-sm font-bold pl-2">{'>'}</span>
          <input
            type="text"
            placeholder="Enter CS2 RCON command (e.g. status, css_plugins, mp_roundtime 1.92)..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none placeholder:text-cs2-muted"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-cs2-orange hover:bg-cs2-orangeHover text-black font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Execute</span>
          </button>
        </form>
      </div>
    </div>
  );
}
