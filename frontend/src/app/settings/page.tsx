'use client';

import React, { useState } from 'react';
import { Settings, Key, ShieldCheck, HardDrive, Check, Save } from 'lucide-react';

export default function SettingsPage() {
  const [steamApiKey, setSteamApiKey] = useState('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
  const [masterPath, setMasterPath] = useState('/opt/cs2panel/master_cs2');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-white">System & Master Instance Settings</h1>
        <p className="text-xs text-cs2-muted mt-1">
          Configure global Steam Web API credentials, SteamCMD master paths and security policies.
        </p>
      </div>

      <form onSubmit={handleSave} className="p-6 rounded-2xl bg-cs2-surface border border-cs2-border space-y-5">
        <div>
          <label className="text-xs font-semibold text-white flex items-center gap-2 mb-1">
            <Key className="w-3.5 h-3.5 text-cs2-orange" />
            <span>Steam Web API Key</span>
          </label>
          <input
            type="text"
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

        <div className="pt-4 border-t border-cs2-border flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-cs2-orange hover:bg-cs2-orangeHover text-black font-bold text-xs flex items-center gap-2 transition"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Saved!' : 'Save System Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
