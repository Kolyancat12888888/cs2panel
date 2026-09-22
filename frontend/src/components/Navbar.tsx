'use client';

import React from 'react';
import Link from 'next/link';
import { Server, Activity, Shield, Terminal, LifeBuoy, Bell } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="h-16 border-b border-cs2-border bg-cs2-surface/80 backdrop-blur sticky top-0 z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-cs2-orange flex items-center justify-center font-black text-black shadow-lg shadow-cs2-orange/20">
          CS2
        </div>
        <div>
          <span className="font-bold text-lg text-white tracking-wider">CS2PANEL</span>
          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-cs2-border text-cs2-orange font-semibold">SHARED-MASTER</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-cs2-card border border-cs2-border text-xs text-cs2-muted">
          <div className="w-2 h-2 rounded-full bg-cs2-green animate-pulse" />
          <span>DAEMON ONLINE</span>
        </div>

        <button className="p-2 rounded-md hover:bg-cs2-card text-cs2-muted hover:text-white transition">
          <Bell className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-cs2-border">
          <div className="w-8 h-8 rounded-full bg-cs2-orange/20 border border-cs2-orange text-cs2-orange flex items-center justify-center font-bold text-xs">
            AD
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-white">Administrator</div>
            <div className="text-[10px] text-cs2-muted">admin@cs2panel.local</div>
          </div>
        </div>
      </div>
    </header>
  );
}
