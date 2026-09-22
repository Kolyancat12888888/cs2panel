'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, Server, ArrowRight, ShieldCheck } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] flex flex-col justify-center items-center p-4 relative overflow-hidden text-white selection:bg-cs2-orange selection:text-black">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-cs2-orange/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cs2-orange/10 text-cs2-orange border border-cs2-orange/20 mb-2 shadow-lg shadow-cs2-orange/10">
            <Server className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">CS2Panel Login</h1>
          <p className="text-xs text-cs2-muted">Enter your administrator or user credentials to continue</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-medium animate-in fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="p-6 rounded-2xl bg-cs2-card border border-cs2-border shadow-2xl space-y-4 backdrop-blur-xl">
          <div>
            <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-cs2-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="admin@yourdomain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-sm text-white focus:outline-none focus:border-cs2-orange"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-cs2-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-cs2-surface border border-cs2-border text-sm text-white focus:outline-none focus:border-cs2-orange"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-cs2-orange hover:bg-cs2-orange/90 text-black font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-cs2-orange/20 disabled:opacity-50 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Panel'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-cs2-muted flex items-center justify-center gap-2">
          <span>First time here?</span>
          <Link href="/setup" className="text-cs2-orange hover:underline font-semibold">
            Run Setup Wizard
          </Link>
        </div>
      </div>
    </div>
  );
}
