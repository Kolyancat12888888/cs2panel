'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const userRaw = searchParams.get('user');

    if (token && userRaw) {
      try {
        const user = JSON.parse(decodeURIComponent(userRaw));
        login(token, user);
        router.push('/');
        return;
      } catch (e) {
        console.error('Failed to parse OAuth callback payload', e);
      }
    }

    const error = searchParams.get('error');
    if (error) {
      router.push(`/login?error=${encodeURIComponent(error)}`);
    } else {
      router.push('/login');
    }
  }, [searchParams, login, router]);

  return (
    <div className="min-h-screen bg-[#090a0f] flex flex-col items-center justify-center space-y-4 text-white">
      <Loader2 className="w-8 h-8 text-cs2-orange animate-spin" />
      <p className="text-xs text-cs2-muted font-medium">Finalizing social authentication...</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-white text-xs">Loading...</div>}>
      <CallbackHandler />
    </Suspense>
  );
}
