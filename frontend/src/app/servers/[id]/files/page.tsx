'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ServerHeader from '@/components/ServerHeader';
import { Server } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import { FolderTree, FileText, Save, Check, RotateCcw, Folder, FileCode } from 'lucide-react';

interface FileItem {
  name: string;
  is_dir: boolean;
  size: number;
}

export default function ServerFilesPage() {
  const params = useParams();
  const serverId = params.id as string;
  const [server, setServer] = useState<Server | null>(null);
  const [currentPath, setCurrentPath] = useState('game/csgo/cfg');
  const [files, setFiles] = useState<FileItem[]>([
    { name: 'server.cfg', is_dir: false, size: 1024 },
    { name: 'gamemode_competitive.cfg', is_dir: false, size: 2048 },
    { name: 'autoexec.cfg', is_dir: false, size: 512 },
    { name: 'banned_user.cfg', is_dir: false, size: 128 },
  ]);
  const [selectedFile, setSelectedFile] = useState<string | null>('server.cfg');
  const [fileContent, setFileContent] = useState<string>(`// CS2Panel Generated server.cfg
hostname "CS2 Dedicated Server powered by CS2Panel"
sv_cheats 0
sv_lan 0
mp_roundtime 1.92
mp_freezetime 5
mp_warmuptime 60
mp_buytime 20
mp_c4timer 40
mp_maxrounds 24
sv_talk_enemy_living 0
sv_talk_enemy_dead 0
sv_deadtalk 1

// Metamod & CounterStrikeSharp
// css_plugins reload
`);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    fetchApi(`/servers/${serverId}`)
      .then(setServer)
      .catch(() => {});

    loadFiles(currentPath);
  }, [serverId, currentPath]);

  const loadFiles = (path: string) => {
    fetchApi(`/servers/${serverId}/files/list?path=${encodeURIComponent(path)}`)
      .then((data) => {
        if (data && Array.isArray(data.files)) {
          setFiles(data.files);
        }
      })
      .catch(() => {});
  };

  const handleSelectFile = (fileName: string) => {
    setSelectedFile(fileName);
    const fullPath = `${currentPath}/${fileName}`;
    fetchApi(`/servers/${serverId}/files/read?path=${encodeURIComponent(fullPath)}`)
      .then((data) => {
        if (data && data.content !== undefined) {
          setFileContent(data.content);
        }
      })
      .catch(() => {});
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    const fullPath = `${currentPath}/${selectedFile}`;
    try {
      await fetchApi(`/servers/${serverId}/files/write`, {
        method: 'POST',
        body: JSON.stringify({ path: fullPath, content: fileContent }),
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  if (!server) return <div className="p-8 text-center text-cs2-muted">Loading files...</div>;

  return (
    <div className="space-y-6">
      <ServerHeader server={server} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Tree / File Explorer */}
        <div className="lg:col-span-1 rounded-2xl bg-cs2-surface border border-cs2-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-cs2-orange" />
              <span className="text-xs font-bold text-white uppercase">Explorer</span>
            </div>
            <span className="text-[10px] text-cs2-muted font-mono">{currentPath}</span>
          </div>

          <div className="space-y-1">
            {files.map((f) => (
              <button
                key={f.name}
                onClick={() => {
                  if (!f.is_dir) handleSelectFile(f.name);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition ${
                  selectedFile === f.name
                    ? 'bg-cs2-orange text-black font-bold'
                    : 'text-cs2-muted hover:text-white hover:bg-cs2-card'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {f.is_dir ? (
                    <Folder className="w-3.5 h-3.5 text-cs2-blue shrink-0" />
                  ) : (
                    <FileCode className="w-3.5 h-3.5 text-cs2-orange shrink-0" />
                  )}
                  <span className="truncate">{f.name}</span>
                </div>
                {!f.is_dir && (
                  <span className="text-[10px] opacity-70">
                    {Math.round(f.size / 1024) || 1} KB
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-cs2-border text-[11px] text-cs2-muted">
            <span className="text-cs2-green font-semibold">Isolated folder:</span> Only user configs and addons are editable; engine core is protected.
          </div>
        </div>

        {/* Right Code Editor */}
        <div className="lg:col-span-3 rounded-2xl bg-cs2-surface border border-cs2-border flex flex-col overflow-hidden">
          {/* Editor Toolbar */}
          <div className="h-12 bg-cs2-card border-b border-cs2-border px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cs2-orange" />
              <span className="text-xs font-bold text-white font-mono">
                {selectedFile || 'No file selected'}
              </span>
            </div>

            <button
              onClick={handleSaveFile}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                isSaved
                  ? 'bg-cs2-green text-black'
                  : 'bg-cs2-orange hover:bg-cs2-orangeHover text-black'
              }`}
            >
              {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaved ? 'Saved!' : 'Save Config (Ctrl+S)'}</span>
            </button>
          </div>

          {/* Editor Body */}
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            className="w-full h-[520px] p-4 bg-black/80 text-gray-200 font-mono text-xs focus:outline-none resize-none leading-relaxed"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
