'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi, getApiBase } from '@/lib/api';

interface OAuthProvider {
  id: number;
  provider: string;
  name: string;
}

export default function OAuthSocialButtons() {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/auth/oauth/providers')
      .then((data) => {
        if (Array.isArray(data)) {
          setProviders(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || providers.length === 0) {
    return null;
  }

  const handleProviderClick = (provider: string) => {
    // Navigate to backend OAuth redirect endpoint
    const apiBase = getApiBase();
    const backendBase = apiBase.endsWith('/api/v1') ? apiBase.slice(0, -7) : apiBase;
    window.location.href = `${backendBase}/auth/oauth/${provider}/redirect`;
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'steam':
        return (
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M11.979 0C5.642 0 .471 4.908.021 11.141l6.452 2.664a3.67 3.67 0 0 1 2.37-.845c.24 0 .474.024.703.07l2.846-4.135a3.78 3.78 0 0 1-.09-.817c0-2.106 1.713-3.818 3.818-3.818 2.105 0 3.818 1.712 3.818 3.818s-1.713 3.818-3.818 3.818c-.28 0-.549-.034-.81-.096l-4.113 2.86c.045.222.07.45.07.684 0 1.956-1.48 3.56-3.385 3.786l-2.43 3.447C8.163 23.49 9.99 24 11.979 24c6.627 0 12-5.373 12-12S18.606 0 11.979 0z" />
          </svg>
        );
      case 'discord':
        return (
          <svg className="w-4 h-4 fill-current text-[#5865F2]" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
        );
      case 'github':
        return (
          <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
        );
      case 'google':
        return (
          <svg className="w-4 h-4 fill-current text-red-400" viewBox="0 0 24 24">
            <path d="M12.24 10.285V13.8h6.887C18.2 16.14 16.14 18 12.24 18c-3.315 0-6-2.685-6-6s2.685-6 6-6c1.47 0 2.805.54 3.84 1.425l2.67-2.67C17.07 3.195 14.79 2.25 12.24 2.25 6.855 2.25 2.49 6.615 2.49 12s4.365 9.75 9.75 9.75c5.625 0 9.345-3.96 9.345-9.525 0-.645-.06-1.275-.18-1.94H12.24z" />
          </svg>
        );
      case 'vkontakte':
        return (
          <svg className="w-4 h-4 fill-current text-[#0077FF]" viewBox="0 0 24 24">
            <path d="M12.96 17.5c-5.83 0-9.15-4-9.29-10.65h2.91c.1 4.88 2.24 6.94 3.94 7.37V6.85h2.74v4.21c1.68-.18 3.42-2.09 4.02-4.21h2.74c-.45 2.61-2.37 4.52-3.71 5.3 1.34.63 3.53 2.29 4.35 5.35h-3.02c-.64-2-2.24-3.54-4.36-3.75v3.75h-.32z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-cs2-border"></div>
        <span className="flex-shrink mx-3 text-[11px] font-semibold text-cs2-muted uppercase tracking-wider">
          Or continue with
        </span>
        <div className="flex-grow border-t border-cs2-border"></div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {providers.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handleProviderClick(p.provider)}
            className="flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl bg-cs2-surface border border-cs2-border hover:border-cs2-orange/40 hover:bg-cs2-card text-white text-xs font-semibold transition"
          >
            {getProviderIcon(p.provider)}
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
