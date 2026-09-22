'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Server, Activity, Shield, Terminal, LifeBuoy, Bell, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { fetchApi } from '@/lib/api';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [nodesOnline, setNodesOnline] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchApi('/nodes')
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setNodesOnline(true);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="h-16 border-b border-cs2-border bg-cs2-surface/80 backdrop-blur sticky top-0 z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cs2-orange flex items-center justify-center font-black text-black shadow-lg shadow-cs2-orange/20">
            CS2
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-wider">CS2PANEL</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-cs2-border text-cs2-orange font-semibold">SHARED-MASTER</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {isAuthenticated && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-cs2-card border border-cs2-border text-xs text-cs2-muted">
            <div className={`w-2 h-2 rounded-full ${nodesOnline ? 'bg-cs2-green animate-pulse' : 'bg-amber-400'}`} />
            <span>{nodesOnline ? 'NODE ONLINE' : 'NO ACTIVE NODES'}</span>
          </div>
        )}

        {isAuthenticated && (
          <button className="p-2 rounded-md hover:bg-cs2-card text-cs2-muted hover:text-white transition" title="Notifications">
            <Bell className="w-4 h-4" />
          </button>
        )}

        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 pl-4 border-l border-cs2-border">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-cs2-orange object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-cs2-orange/20 border border-cs2-orange text-cs2-orange flex items-center justify-center font-bold text-xs">
                {initials}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-white">{user.name}</div>
              <div className="text-[10px] text-cs2-muted">{user.email}</div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-cs2-muted hover:text-red-400 transition ml-1"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-4 border-l border-cs2-border">
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs font-semibold hover:border-cs2-orange hover:text-cs2-orange transition flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </Link>
            <Link
              href="/register"
              className="px-3.5 py-1.5 rounded-lg bg-cs2-orange text-black text-xs font-bold hover:bg-cs2-orangeHover transition flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
