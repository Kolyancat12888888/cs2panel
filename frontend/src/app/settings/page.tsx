'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Key, ShieldCheck, HardDrive, Check, Save, Share2, Globe, CheckCircle2, Lock, ToggleLeft, ToggleRight } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface OAuthProviderConfig {
  id?: number;
  provider: string;
  name: string;
  is_enabled: boolean;
  client_id: string;
  client_secret: string;
  redirect_url: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'oauth'>('general');
  const [steamApiKey, setSteamApiKey] = useState('');
  const [masterPath, setMasterPath] = useState('/var/lib/pterodactyl/volumes/94654458-5da3-4306-9489-15697eae8112');
  const [saved, setSaved] = useState(false);

  // OAuth Providers
  const [providers, setProviders] = useState<OAuthProviderConfig[]>([
    { provider: 'steam', name: 'Steam OpenID', is_enabled: false, client_id: '', client_secret: '', redirect_url: 'http://localhost:3000/auth/callback/steam' },
    { provider: 'discord', name: 'Discord OAuth2', is_enabled: false, client_id: '', client_secret: '', redirect_url: 'http://localhost:3000/auth/callback/discord' },
    { provider: 'github', name: 'GitHub OAuth', is_enabled: false, client_id: '', client_secret: '', redirect_url: 'http://localhost:3000/auth/callback/github' },
    { provider: 'google', name: 'Google Cloud OAuth', is_enabled: false, client_id: '', client_secret: '', redirect_url: 'http://localhost:3000/auth/callback/google' },
    { provider: 'vkontakte', name: 'VKontakte (VK ID)', is_enabled: false, client_id: '', client_secret: '', redirect_url: 'http://localhost:3000/auth/callback/vkontakte' },
  ]);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);

  useEffect(() => {
    fetchApi('/admin/oauth/providers')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProviders((prev) =>
            prev.map((p) => {
              const remote = data.find((d: any) => d.provider === p.provider);
              return remote ? { ...p, ...remote, client_id: remote.client_id || '', client_secret: remote.client_secret || '' } : p;
            })
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleGeneralSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleUpdateProviderField = (providerKey: string, field: keyof OAuthProviderConfig, value: any) => {
    setProviders((prev) =>
      prev.map((p) => (p.provider === providerKey ? { ...p, [field]: value } : p))
    );
  };

  const handleSaveProvider = async (provider: OAuthProviderConfig) => {
    setSavingProvider(provider.provider);
    try {
      await fetchApi(`/admin/oauth/providers/${provider.provider}`, {
        method: 'POST',
        body: JSON.stringify({
          name: provider.name,
          is_enabled: provider.is_enabled,
          client_id: provider.client_id,
          client_secret: provider.client_secret,
          redirect_url: provider.redirect_url,
        }),
      });
      alert(`OAuth Provider '${provider.name}' updated successfully!`);
    } catch (err: any) {
      alert(`Failed to save provider: ${err.message}`);
    } finally {
      setSavingProvider(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-white">System & Security Settings</h1>
        <p className="text-xs text-cs2-muted mt-1">
          Configure master instance paths, background queues, and Socialite OAuth authentication providers.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cs2-border gap-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'general'
              ? 'border-cs2-orange text-cs2-orange'
              : 'border-transparent text-cs2-muted hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>General & Master CS2</span>
        </button>
        <button
          onClick={() => setActiveTab('oauth')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'oauth'
              ? 'border-cs2-orange text-cs2-orange'
              : 'border-transparent text-cs2-muted hover:text-white'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>OAuth Social Providers (Socialite)</span>
        </button>
      </div>

      {activeTab === 'general' && (
        <form onSubmit={handleGeneralSave} className="p-6 rounded-2xl bg-cs2-surface border border-cs2-border space-y-5">
          <div>
            <label className="text-xs font-semibold text-white flex items-center gap-2 mb-1">
              <Key className="w-3.5 h-3.5 text-cs2-orange" />
              <span>Steam Web API Key</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 4F8A2B9C0E1D2F3A4B5C6D7E8F9A0B1C"
              value={steamApiKey}
              onChange={(e) => setSteamApiKey(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs font-mono focus:outline-none focus:border-cs2-orange"
            />
            <p className="text-[11px] text-cs2-muted mt-1">
              Required for Steam OpenID avatar resolution and Steam Workshop map downloads.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-white flex items-center gap-2 mb-1">
              <HardDrive className="w-3.5 h-3.5 text-cs2-blue" />
              <span>Master CS2 Dedicated Server Path</span>
            </label>
            <input
              type="text"
              value={masterPath}
              onChange={(e) => setMasterPath(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs font-mono focus:outline-none focus:border-cs2-orange"
            />
            <p className="text-[11px] text-cs2-muted mt-1">
              Shared directory containing immutable ~40 GB game files and VPK archives.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-cs2-card border border-cs2-border space-y-2">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cs2-green" />
              <span>Background Cron Queue Worker</span>
            </div>
            <p className="text-[11px] text-cs2-muted">
              Add this cron job to your server to process scheduled jobs and backups every minute:
            </p>
            <code className="block p-2 rounded bg-black/60 font-mono text-[11px] text-cs2-orange border border-cs2-border">
              * * * * * cd /opt/cs2panel/backend && php artisan schedule:run &gt;&gt; /dev/null 2&gt;&amp;1
            </code>
          </div>

          <div className="pt-4 border-t border-cs2-border flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-cs2-orange hover:bg-cs2-orangeHover text-black font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-cs2-orange/20"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saved ? 'Saved!' : 'Save System Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'oauth' && (
        <div className="space-y-4">
          <p className="text-xs text-cs2-muted">
            Configure Socialite OAuth providers (`socialiteproviders/*`). When enabled, social login buttons will automatically appear on the Login and Registration screens.
          </p>

          <div className="space-y-4">
            {providers.map((provider) => (
              <div
                key={provider.provider}
                className="p-5 rounded-2xl bg-cs2-surface border border-cs2-border space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-white text-sm">{provider.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-cs2-card border border-cs2-border text-cs2-orange">
                      {provider.provider}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpdateProviderField(provider.provider, 'is_enabled', !provider.is_enabled)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      provider.is_enabled
                        ? 'bg-cs2-green/20 text-cs2-green border border-cs2-green/40'
                        : 'bg-cs2-card text-cs2-muted border border-cs2-border'
                    }`}
                  >
                    <span>{provider.is_enabled ? 'ENABLED' : 'DISABLED'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-semibold text-cs2-muted block mb-1">
                      {provider.provider === 'steam' ? 'Steam API Key' : 'Client ID / App ID'}
                    </label>
                    <input
                      type="text"
                      placeholder={provider.provider === 'steam' ? 'Steam Web API Key' : 'Client ID'}
                      value={provider.client_id}
                      onChange={(e) => handleUpdateProviderField(provider.provider, 'client_id', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs font-mono focus:outline-none focus:border-cs2-orange"
                    />
                  </div>

                  {provider.provider !== 'steam' && (
                    <div>
                      <label className="text-[11px] font-semibold text-cs2-muted block mb-1">
                        Client Secret
                      </label>
                      <input
                        type="password"
                        placeholder="Client Secret"
                        value={provider.client_secret}
                        onChange={(e) => handleUpdateProviderField(provider.provider, 'client_secret', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs font-mono focus:outline-none focus:border-cs2-orange"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="text-[11px] font-semibold text-cs2-muted block mb-1">
                      Callback / Redirect URI
                    </label>
                    <input
                      type="text"
                      value={provider.redirect_url}
                      onChange={(e) => handleUpdateProviderField(provider.provider, 'redirect_url', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs font-mono focus:outline-none focus:border-cs2-orange"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={savingProvider === provider.provider}
                    onClick={() => handleSaveProvider(provider)}
                    className="px-4 py-2 rounded-xl bg-cs2-orange hover:bg-cs2-orangeHover text-black font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingProvider === provider.provider ? 'Saving...' : 'Save Provider'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
