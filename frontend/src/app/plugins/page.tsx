'use client';

import React, { useEffect, useState } from 'react';
import { Package, Download, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
import { Plugin } from '@/lib/types';
import { fetchApi } from '@/lib/api';

export default function GlobalPluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);

  useEffect(() => {
    fetchApi('/plugins').then((data) => {
      if (Array.isArray(data)) setPlugins(data);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">CS2 Plugin & Addon Hub</h1>
        <p className="text-xs text-cs2-muted mt-1">
          Explore curated plugins built on CounterStrikeSharp and Metamod:Source git1411.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {plugins.map((plugin) => (
          <div
            key={plugin.id}
            className="p-5 rounded-2xl bg-cs2-surface border border-cs2-border hover:border-cs2-orange/40 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-white text-base">{plugin.name}</h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cs2-card text-cs2-orange">
                  v{plugin.version}
                </span>
              </div>

              <div className="text-[11px] text-cs2-muted mt-1 flex items-center gap-2">
                <span>By {plugin.author}</span>
                <span>•</span>
                <span className="text-cs2-green">{plugin.install_count} Installs</span>
              </div>

              <p className="text-xs text-cs2-muted mt-3 leading-relaxed">
                {plugin.description}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-cs2-border flex items-center justify-between">
              <span className="text-[10px] px-2 py-0.5 rounded bg-cs2-card font-mono text-cs2-orange">
                .NET 8 Plugin
              </span>

              {plugin.github_repo && (
                <a
                  href={`https://github.com/${plugin.github_repo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cs2-muted hover:text-white flex items-center gap-1"
                >
                  <span>Repository</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
