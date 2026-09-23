'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ServerHeader from '@/components/ServerHeader';
import { Server } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import { 
  HardDrive, 
  DownloadCloud, 
  Copy, 
  Check, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  Zap, 
  Layers
} from 'lucide-react';

interface Asset {
  filename: string;
  size_bytes: number;
  compressed: boolean;
  bz2_size_bytes: number;
  last_synced_at: string;
}

export default function FastDlPage() {
  const params = useParams();
  const serverId = params.id as string;
  const [server, setServer] = useState<Server | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [fastDlUrl, setFastDlUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchApi(`/servers/${serverId}`),
      fetchApi(`/servers/${serverId}/fastdl/assets`),
    ])
      .then(([srv, fdl]) => {
        if (srv) setServer(srv);
        if (fdl?.success && fdl.assets) {
          setAssets(fdl.assets);
          setFastDlUrl(fdl.fastdl_url || `https://cs2.hfl-nodes.pro/api/v1/fastdl/${serverId}/`);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [serverId]);

  const handleRebuild = async () => {
    setRebuilding(true);
    setMsg(null);
    try {
      const res = await fetchApi(`/servers/${serverId}/fastdl/rebuild`, { method: 'POST' });
      if (res?.success) {
        setMsg('FastDL .bz2 batch compression started in background.');
        setTimeout(loadData, 2000);
      }
    } catch (err: any) {
      alert(`FastDL rebuild error: ${err.message}`);
    } finally {
      setRebuilding(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(`sv_downloadurl "${fastDlUrl}"`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!server) return <div className="p-8 text-center text-cs2-muted">Loading FastDL...</div>;

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  return (
    <div className="space-y-6">
      <ServerHeader server={server} />

      {/* FastDL Info Card */}
      <div className="p-6 rounded-2xl bg-cs2-surface border border-cs2-border space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cs2-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cs2-orange/10 border border-cs2-orange/30 text-cs2-orange flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">High-Speed FastDL HTTP Compression (.bz2)</h2>
              <p className="text-xs text-cs2-muted mt-0.5">
                Automatically compresses custom maps, sounds, and models so players connect instantly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRebuild}
              disabled={rebuilding}
              className="px-4 py-2 rounded-xl bg-cs2-orange hover:bg-cs2-orangeHover text-black font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-cs2-orange/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rebuilding ? 'animate-spin' : ''}`} />
              <span>{rebuilding ? 'Compressing...' : 'Rebuild .bz2 Cache'}</span>
            </button>
          </div>
        </div>

        {/* Copy Box */}
        <div>
          <label className="text-xs font-semibold text-cs2-muted block mb-1">
            Server Download URL Configuration (Auto-injected into server.cfg)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={`sv_downloadurl "${fastDlUrl}"`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-cs2-card border border-cs2-border text-white text-xs font-mono select-all focus:outline-none"
            />
            <button
              onClick={copyUrl}
              className="px-4 py-2.5 rounded-xl bg-cs2-card border border-cs2-border hover:border-cs2-orange text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cs2-orange" />}
              <span>{copied ? 'Copied' : 'Copy cvar'}</span>
            </button>
          </div>
        </div>

        {msg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{msg}</span>
          </div>
        )}
      </div>

      {/* Assets Table */}
      <div className="rounded-2xl bg-cs2-surface border border-cs2-border overflow-hidden shadow-xl">
        <div className="p-4 border-b border-cs2-border flex items-center justify-between bg-cs2-card/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <DownloadCloud className="w-4 h-4 text-cs2-orange" />
            <span>Indexed FastDL Assets ({assets.length})</span>
          </h3>
          <span className="text-[11px] text-cs2-muted font-mono">Brotli / Bzip2 Compression Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-cs2-card border-b border-cs2-border text-[10px] uppercase tracking-wider text-cs2-muted font-bold">
              <tr>
                <th className="py-3 px-4">Asset Path</th>
                <th className="py-3 px-4">Original Size</th>
                <th className="py-3 px-4">Compressed (.bz2)</th>
                <th className="py-3 px-4">Compression Ratio</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cs2-border/40">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-cs2-muted">
                    No custom assets indexed for this server.
                  </td>
                </tr>
              ) : (
                assets.map((asset, i) => {
                  const ratio = asset.bz2_size_bytes > 0 ? (100 - (asset.bz2_size_bytes / asset.size_bytes * 100)).toFixed(0) : 0;
                  return (
                    <tr key={i} className="hover:bg-cs2-card/40 transition font-mono">
                      <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-cs2-orange" />
                        <span>{asset.filename}</span>
                      </td>
                      <td className="py-3 px-4 text-cs2-muted">{formatBytes(asset.size_bytes)}</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">{formatBytes(asset.bz2_size_bytes)}</td>
                      <td className="py-3 px-4 text-cs2-orange">-{ratio}% saved</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                          READY
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
