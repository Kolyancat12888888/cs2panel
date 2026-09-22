'use client';

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, User, ArrowRight, UserPlus, LogIn, Server } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import OAuthSocialButtons from '@/components/OAuthSocialButtons';

function RegisterForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      if (data.token && data.user) {
        login(data.token, data.user);
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Create Account</h1>
          <p className="text-xs text-cs2-muted">Register to deploy and orchestrate CS2 Dedicated Servers</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-medium animate-in fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="p-6 rounded-2xl bg-cs2-card border border-cs2-border shadow-2xl space-y-4 backdrop-blur-xl">
          <div>
            <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Full Name / Nickname</label>
            <div className="relative">
              <User className="w-4 h-4 text-cs2-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="e.g. CounterStrikePlayer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-cs2-surface border border-cs2-border text-sm text-white focus:outline-none focus:border-cs2-orange"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-cs2-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="user@yourdomain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-cs2-surface border border-cs2-border text-sm text-white focus:outline-none focus:border-cs2-orange"
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
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-cs2-surface border border-cs2-border text-sm text-white focus:outline-none focus:border-cs2-orange"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cs2-muted uppercase mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-cs2-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-cs2-surface border border-cs2-border text-sm text-white focus:outline-none focus:border-cs2-orange"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-cs2-orange hover:bg-cs2-orangeHover text-black font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-cs2-orange/20 disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating Account...' : 'Register Account'}
            <ArrowRight className="w-4 h-4" />
          </button>

          <OAuthSocialButtons />
        </form>

        <div className="text-center text-xs text-cs2-muted flex items-center justify-center gap-2">
          <span>Already have an account?</span>
          <Link href="/login" className="text-cs2-orange hover:underline font-semibold flex items-center gap-1">
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-white text-xs">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
