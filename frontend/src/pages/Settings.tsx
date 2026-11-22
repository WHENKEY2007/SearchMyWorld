import React, { useEffect, useState } from 'react';
import {
  Folder,
  Plus,
  Trash2,
  RefreshCw,
  Database,
  ShieldCheck,
  Moon,
  Sun,
  HardDrive,
  AlertTriangle,
} from 'lucide-react';
import { api, FolderItem, IndexingStatus } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [newFolderPath, setNewFolderPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<IndexingStatus | null>(null);
  const [clearing, setClearing] = useState(false);
  const [msg, setMsg] = useState('');

  const loadFolders = async () => {
    try {
      const data = await api.getFolders();
      setFolders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async () => {
    try {
      const s = await api.getIndexingStatus();
      setStatus(s);
    } catch {}
  };

  useEffect(() => {
    loadFolders();
    loadStatus();
  }, []);

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderPath.trim()) return;
    try {
      await api.addFolder(newFolderPath.trim());
      setNewFolderPath('');
      setMsg('Folder added successfully. Start indexing to scan its files.');
      loadFolders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBrowseNativeFolder = async () => {
    try {
      const res = await api.openFolderPicker();
      if (!res.cancelled && res.path) {
        setNewFolderPath(res.path);
        await api.addFolder(res.path);
        setNewFolderPath('');
        setMsg(`Added folder: ${res.path}`);
        loadFolders();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Remove this folder from indexing configuration? Original files will NOT be deleted.')) return;
    try {
      await api.deleteFolder(folderId);
      loadFolders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStartIndexing = async () => {
    try {
      await api.startIndexing();
      setMsg('Background indexing initiated.');
      loadStatus();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleClearMemory = async () => {
    if (
      !confirm(
        'Are you sure you want to clear all indexed memories, embeddings, and search tables? Your ORIGINAL files on disk will NOT be touched.'
      )
    )
      return;

    setClearing(true);
    try {
      await api.clearMemory();
      setMsg('Indexed memory cleared successfully.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-10">
      <div>
        <h1 className="text-3xl font-serif text-charcoal dark:text-white tracking-tight">
          System <span className="italic font-normal">Settings.</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage monitored directories, local AI preferences, and digital memory storage.
        </p>
      </div>

      {msg && (
        <div className="p-3.5 rounded-2xl bg-pastel-mint/50 dark:bg-emerald-950/40 border border-pastel-mintBorder text-xs text-emerald-800 dark:text-emerald-300">
          {msg}
        </div>
      )}

      {/* 1. Monitored Folders */}
      <div className="glass-card rounded-3xl p-6 shadow-soft space-y-5 border border-alabaster dark:border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-bold text-charcoal dark:text-white">
              Monitored Folders
            </h2>
            <p className="text-xs text-slate-500">
              Only explicitly selected folders are scanned. Original documents are never moved or modified.
            </p>
          </div>
          <button
            onClick={handleStartIndexing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-onyx text-white dark:bg-white dark:text-onyx text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={13} />
            Scan & Index All
          </button>
        </div>

        {/* Add Folder Form */}
        <form onSubmit={handleAddFolder} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            required
            value={newFolderPath}
            onChange={(e) => setNewFolderPath(e.target.value)}
            placeholder="Folder path (or click Browse to choose from Windows Explorer)"
            className="flex-1 px-4 py-2 rounded-xl border border-alabaster dark:border-white/10 bg-white/60 dark:bg-white/5 text-xs text-charcoal dark:text-white placeholder:text-slate-400 outline-none"
          />
          <button
            type="button"
            onClick={handleBrowseNativeFolder}
            className="px-4 py-2 rounded-xl border border-alabaster dark:border-white/10 bg-white/70 dark:bg-white/5 text-xs font-semibold text-charcoal dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
            title="Open native Windows folder dialog"
          >
            <Folder size={14} className="text-amber-500" />
            Browse...
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-onyx text-white dark:bg-white dark:text-onyx text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Add Folder
          </button>
        </form>

        {/* Folders List */}
        <div className="divide-y divide-alabaster dark:divide-white/10 pt-2">
          {folders.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No folders added yet. Add a folder above to start indexing.
            </p>
          ) : (
            folders.map((f) => (
              <div key={f.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded-lg bg-porcelain-200 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 flex-shrink-0">
                    <Folder size={16} />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-mono font-medium text-charcoal dark:text-white truncate">
                      {f.path}
                    </p>
                    <p className="text-[11px] text-slate-400">Status: Active Monitored</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteFolder(f.id)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Remove from monitoring"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Theme & Appearance */}
      <div className="glass-card rounded-3xl p-6 shadow-soft space-y-4 border border-alabaster dark:border-white/10">
        <h2 className="text-lg font-serif font-bold text-charcoal dark:text-white">
          Appearance & Typography
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-charcoal dark:text-white">Active Theme Mode</p>
            <p className="text-xs text-slate-500">
              Currently using {theme === 'light' ? 'Light Porcelain (Editorial)' : 'Dark Obsidian'}.
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-alabaster dark:border-white/10 bg-white/70 dark:bg-white/5 text-xs font-semibold text-charcoal dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            Toggle Mode
          </button>
        </div>
      </div>

      {/* 3. Memory & Database Management */}
      <div className="glass-card rounded-3xl p-6 shadow-soft space-y-4 border border-alabaster dark:border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-bold text-charcoal dark:text-white">
              Local Memory Management
            </h2>
            <p className="text-xs text-slate-500">
              Clear search indexes, vector embeddings, and chunk metadata without affecting original user files.
            </p>
          </div>
          <button
            onClick={handleClearMemory}
            disabled={clearing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <Database size={13} />
            {clearing ? 'Clearing...' : 'Clear Search Database'}
          </button>
        </div>
      </div>

      {/* 4. Privacy & Security Assurance */}
      <div className="p-5 rounded-2xl bg-porcelain-200/50 dark:bg-white/5 border border-alabaster dark:border-white/10 flex items-start gap-3.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        <ShieldCheck size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-charcoal dark:text-white">Local-First Architecture Guarantee</p>
          <p className="mt-1">
            SearchMyWorld runs all OCR, embedding models, and search queries locally on your machine.
            Your documents, screenshots, and project memories are never uploaded to any remote server or cloud AI provider.
          </p>
        </div>
      </div>
    </div>
  );
};
