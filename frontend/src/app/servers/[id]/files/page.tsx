'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ServerHeader from '@/components/ServerHeader';
import { Server } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import {
  FolderTree,
  FileText,
  Save,
  Check,
  RotateCcw,
  Folder,
  FileCode,
  ArrowUp,
  Plus,
  Trash2,
  FolderPlus,
  FilePlus,
  RefreshCw,
  Box,
  Settings,
  MapPin,
  ChevronRight,
  Sliders,
  X,
  AlertTriangle
} from 'lucide-react';

interface FileItem {
  name: string;
  is_dir: boolean;
  size: number;
}

const SHORTCUTS = [
  { label: 'Plugins', path: 'game/csgo/addons/counterstrikesharp/plugins', icon: Box },
  { label: 'Configs (cfg)', path: 'game/csgo/cfg', icon: Settings },
  { label: 'Maps', path: 'game/csgo/maps', icon: MapPin },
  { label: 'Metamod', path: 'game/csgo/addons/metamod', icon: Sliders },
  { label: 'Server Root', path: '.', icon: Folder },
];

export default function ServerFilesPage() {
  const params = useParams();
  const serverId = params.id as string;
  const [server, setServer] = useState<Server | null>(null);
  const [currentPath, setCurrentPath] = useState('game/csgo/addons/counterstrikesharp/plugins');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Modals
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newEntryName, setNewEntryName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);

  const loadFiles = useCallback((path: string) => {
    setLoading(true);
    fetchApi(`/servers/${serverId}/files/list?path=${encodeURIComponent(path === '.' ? '' : path)}`)
      .then((data) => {
        if (data && Array.isArray(data.files)) {
          // Sort folders first, then files alphabetically
          const sorted = data.files.sort((a: FileItem, b: FileItem) => {
            if (a.is_dir === b.is_dir) return a.name.localeCompare(b.name);
            return a.is_dir ? -1 : 1;
          });
          setFiles(sorted);
        } else {
          setFiles([]);
        }
      })
      .catch((err) => {
        console.error('Failed to list files:', err);
        setFiles([]);
      })
      .finally(() => setLoading(false));
  }, [serverId]);

  useEffect(() => {
    fetchApi(`/servers/${serverId}`)
      .then(setServer)
      .catch(() => {});

    loadFiles(currentPath);
  }, [serverId, currentPath, loadFiles]);

  const handleNavigate = (newPath: string) => {
    const clean = newPath.replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '') || '.';
    setCurrentPath(clean);
  };

  const handleGoUp = () => {
    if (currentPath === '.' || currentPath === '') return;
    const parts = currentPath.split('/');
    parts.pop();
    const upPath = parts.join('/') || '.';
    handleNavigate(upPath);
  };

  const handleSelectFile = (file: FileItem) => {
    if (file.is_dir) {
      const nextPath = currentPath === '.' ? file.name : `${currentPath}/${file.name}`;
      handleNavigate(nextPath);
      return;
    }

    const fullPath = currentPath === '.' ? file.name : `${currentPath}/${file.name}`;
    setSelectedFile(file.name);
    setIsDirty(false);

    fetchApi(`/servers/${serverId}/files/read?path=${encodeURIComponent(fullPath)}`)
      .then((data) => {
        if (data && data.content !== undefined) {
          setFileContent(data.content);
        }
      })
      .catch((err) => {
        alert(`Failed to read file: ${err.message}`);
      });
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    const fullPath = currentPath === '.' ? selectedFile : `${currentPath}/${selectedFile}`;
    try {
      await fetchApi(`/servers/${serverId}/files/write`, {
        method: 'POST',
        body: JSON.stringify({ path: fullPath, content: fileContent }),
      });
      setIsSaved(true);
      setIsDirty(false);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleCreateFile = async () => {
    if (!newEntryName.trim()) return;
    const fullPath = currentPath === '.' ? newEntryName.trim() : `${currentPath}/${newEntryName.trim()}`;
    try {
      await fetchApi(`/servers/${serverId}/files/write`, {
        method: 'POST',
        body: JSON.stringify({ path: fullPath, content: '' }),
      });
      setShowNewFileModal(false);
      setNewEntryName('');
      loadFiles(currentPath);
    } catch (err: any) {
      alert(`Failed to create file: ${err.message}`);
    }
  };

  const handleCreateFolder = async () => {
    if (!newEntryName.trim()) return;
    const fullPath = currentPath === '.' ? newEntryName.trim() : `${currentPath}/${newEntryName.trim()}`;
    try {
      await fetchApi(`/servers/${serverId}/files/mkdir`, {
        method: 'POST',
        body: JSON.stringify({ path: fullPath }),
      });
      setShowNewFolderModal(false);
      setNewEntryName('');
      loadFiles(currentPath);
    } catch (err: any) {
      alert(`Failed to create folder: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const fullPath = currentPath === '.' ? deleteTarget.name : `${currentPath}/${deleteTarget.name}`;
    try {
      await fetchApi(`/servers/${serverId}/files/delete`, {
        method: 'POST',
        body: JSON.stringify({ path: fullPath }),
      });
      if (selectedFile === deleteTarget.name) {
        setSelectedFile(null);
        setFileContent('');
      }
      setDeleteTarget(null);
      loadFiles(currentPath);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, fileContent, currentPath]);

  if (!server) return <div className="p-8 text-center text-cs2-muted">Loading files...</div>;

  // Split path for breadcrumbs
  const pathParts = currentPath === '.' ? [] : currentPath.split('/');

  return (
    <div className="space-y-6">
      <ServerHeader server={server} />

      {/* Quick Access Shortcuts Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-cs2-surface border border-cs2-border p-3 rounded-2xl">
        <span className="text-xs font-bold text-cs2-muted uppercase tracking-wider px-2">Quick Jump:</span>
        {SHORTCUTS.map((sc) => {
          const Icon = sc.icon;
          const isActive = currentPath === sc.path;
          return (
            <button
              key={sc.path}
              onClick={() => handleNavigate(sc.path)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                isActive
                  ? 'bg-cs2-orange text-black font-bold shadow-md shadow-cs2-orange/20'
                  : 'bg-cs2-card hover:bg-cs2-border text-gray-300 hover:text-white border border-cs2-border'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sc.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: File Explorer & Tree (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-cs2-surface border border-cs2-border flex flex-col overflow-hidden">
          {/* Header & Controls */}
          <div className="p-4 border-b border-cs2-border bg-cs2-card/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-cs2-orange" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">File Explorer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setNewEntryName(''); setShowNewFileModal(true); }}
                  title="New File"
                  className="p-1.5 rounded-lg bg-cs2-card hover:bg-cs2-border text-gray-300 hover:text-white transition border border-cs2-border"
                >
                  <FilePlus className="w-3.5 h-3.5 text-cs2-green" />
                </button>
                <button
                  onClick={() => { setNewEntryName(''); setShowNewFolderModal(true); }}
                  title="New Folder"
                  className="p-1.5 rounded-lg bg-cs2-card hover:bg-cs2-border text-gray-300 hover:text-white transition border border-cs2-border"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-cs2-blue" />
                </button>
                <button
                  onClick={() => loadFiles(currentPath)}
                  title="Refresh"
                  className="p-1.5 rounded-lg bg-cs2-card hover:bg-cs2-border text-gray-300 hover:text-white transition border border-cs2-border"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cs2-orange' : ''}`} />
                </button>
              </div>
            </div>

            {/* Breadcrumb Path Bar */}
            <div className="flex items-center gap-1 bg-black/40 px-3 py-2 rounded-xl text-xs font-mono text-gray-400 overflow-x-auto border border-cs2-border/60">
              <button
                onClick={() => handleNavigate('.')}
                className="hover:text-white text-cs2-orange font-bold flex items-center gap-1 shrink-0"
              >
                root
              </button>
              {pathParts.map((part, index) => {
                const subPath = pathParts.slice(0, index + 1).join('/');
                const isLast = index === pathParts.length - 1;
                return (
                  <React.Fragment key={subPath}>
                    <ChevronRight className="w-3.5 h-3.5 text-cs2-muted shrink-0" />
                    <button
                      onClick={() => handleNavigate(subPath)}
                      className={`hover:text-white truncate max-w-[120px] shrink-0 ${
                        isLast ? 'text-white font-bold' : 'text-gray-400'
                      }`}
                    >
                      {part}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Directory Items List */}
          <div className="flex-1 p-2 space-y-1 max-h-[560px] min-h-[400px] overflow-y-auto">
            {/* Go Up button */}
            {currentPath !== '.' && currentPath !== '' && (
              <button
                onClick={handleGoUp}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-cs2-card transition font-medium"
              >
                <ArrowUp className="w-4 h-4 text-cs2-orange" />
                <span>.. (Go Up)</span>
              </button>
            )}

            {loading && files.length === 0 ? (
              <div className="p-8 text-center text-xs text-cs2-muted">Loading directory contents...</div>
            ) : files.length === 0 ? (
              <div className="p-8 text-center text-xs text-cs2-muted">Directory is empty</div>
            ) : (
              files.map((f) => {
                const isSelected = selectedFile === f.name;
                return (
                  <div
                    key={f.name}
                    className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                      isSelected
                        ? 'bg-cs2-orange text-black font-bold shadow'
                        : 'text-gray-300 hover:text-white hover:bg-cs2-card/80'
                    }`}
                  >
                    <button
                      onClick={() => handleSelectFile(f)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                    >
                      {f.is_dir ? (
                        <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-black' : 'text-cs2-blue'}`} />
                      ) : (
                        <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-black' : 'text-cs2-orange'}`} />
                      )}
                      <span className="truncate font-mono">{f.name}</span>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      {!f.is_dir && (
                        <span className={`text-[10px] font-mono opacity-60 ${isSelected ? 'text-black' : 'text-gray-400'}`}>
                          {f.size > 1024 * 1024
                            ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
                            : `${Math.round(f.size / 1024) || 1} KB`}
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(f);
                        }}
                        title={`Delete ${f.is_dir ? 'Folder' : 'File'}`}
                        className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-cs2-border bg-cs2-card/30 text-[11px] text-cs2-muted flex items-center justify-between">
            <span>{files.length} items</span>
            <span className="text-cs2-green font-semibold">CS2 Isolated Instance Files</span>
          </div>
        </div>

        {/* Right: Code & Config Editor (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-cs2-surface border border-cs2-border flex flex-col overflow-hidden">
          {/* Editor Toolbar */}
          <div className="h-14 bg-cs2-card border-b border-cs2-border px-4 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-cs2-orange shrink-0" />
              <div className="truncate">
                <span className="text-xs font-bold text-white font-mono truncate">
                  {selectedFile ? `${currentPath === '.' ? '' : currentPath + '/'}${selectedFile}` : 'No file selected'}
                </span>
                {isDirty && <span className="ml-2 text-[10px] text-cs2-orange font-bold">• Unsaved changes</span>}
              </div>
            </div>

            {selectedFile && (
              <button
                onClick={handleSaveFile}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  isSaved
                    ? 'bg-cs2-green text-black shadow-lg shadow-cs2-green/20'
                    : 'bg-cs2-orange hover:bg-cs2-orangeHover text-black shadow-lg shadow-cs2-orange/20'
                }`}
              >
                {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSaved ? 'Saved!' : 'Save (Ctrl+S)'}</span>
              </button>
            )}
          </div>

          {/* Editor Body */}
          {selectedFile ? (
            <div className="relative flex-1 flex flex-col">
              <textarea
                value={fileContent}
                onChange={(e) => {
                  setFileContent(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full h-[540px] p-4 bg-black/90 text-gray-200 font-mono text-xs focus:outline-none resize-none leading-relaxed selection:bg-cs2-orange/30 border-none"
                spellCheck={false}
                placeholder="File is empty..."
              />
            </div>
          ) : (
            <div className="h-[540px] flex flex-col items-center justify-center p-8 text-center text-cs2-muted space-y-3 bg-black/40">
              <FolderTree className="w-12 h-12 text-cs2-border" />
              <div className="max-w-xs space-y-1">
                <p className="text-sm font-bold text-gray-300">Select a file to view or edit</p>
                <p className="text-xs text-gray-500">
                  Navigate folders on the left, open configs or plugin configs (.json, .cfg), or create new files.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: New File */}
      {showNewFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-cs2-surface border border-cs2-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-cs2-green" />
                <h3 className="text-sm font-bold text-white">Create New File</h3>
              </div>
              <button onClick={() => setShowNewFileModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">File Name (e.g. custom.cfg, admin.json)</label>
              <input
                type="text"
                value={newEntryName}
                onChange={(e) => setNewEntryName(e.target.value)}
                placeholder="filename.cfg"
                className="w-full bg-cs2-card border border-cs2-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cs2-orange font-mono"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewFileModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:bg-cs2-card"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cs2-green hover:bg-green-400 text-black transition"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Folder */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-cs2-surface border border-cs2-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-cs2-blue" />
                <h3 className="text-sm font-bold text-white">Create New Folder</h3>
              </div>
              <button onClick={() => setShowNewFolderModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Folder Name</label>
              <input
                type="text"
                value={newEntryName}
                onChange={(e) => setNewEntryName(e.target.value)}
                placeholder="my_folder"
                className="w-full bg-cs2-card border border-cs2-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cs2-orange font-mono"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:bg-cs2-card"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cs2-blue hover:bg-blue-400 text-white transition"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-cs2-surface border border-red-500/50 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete {deleteTarget.is_dir ? 'Folder' : 'File'}</h3>
                <p className="text-xs text-gray-400">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <div className="p-3 bg-black/50 rounded-xl border border-cs2-border font-mono text-xs text-red-300 truncate">
              {currentPath === '.' ? deleteTarget.name : `${currentPath}/${deleteTarget.name}`}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:bg-cs2-card"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
