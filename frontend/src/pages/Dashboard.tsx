import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Image,
  Sparkles,
  Files,
  ArrowRight,
  Folder,
  Layers,
  Database,
  ExternalLink,
} from 'lucide-react';
import { api, StatsResponse, FileItem } from '../api/client';
import { TiltCard } from '../components/TiltCard';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, filesData] = await Promise.all([
          api.getStats(),
          api.getFiles(undefined, undefined, 6, 0),
        ]);
        setStats(statsData);
        setRecentFiles(filesData.files);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleOpenFile = async (fileId: string) => {
    try {
      await api.openFile(fileId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6">
      {/* Hero Header in Mindly Editorial Style */}
      <div className="text-center space-y-4 pt-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-alabaster dark:border-white/10 bg-white/60 dark:bg-white/5 text-xs text-slate-600 dark:text-slate-300 shadow-sm">
          <span>✦</span> Local AI Digital Memory Assistant
        </div>
        <h1 className="text-5xl md:text-6xl font-serif text-charcoal dark:text-white tracking-tight leading-tight">
          A clearer mind <br />
          <span className="italic font-normal">for your digital world.</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-base">
          You don't need to remember where you saved it. Your local AI remembers every document,
          screenshot, decision, and project evolution.
        </p>

        {/* Quick Launch Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/search"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-onyx text-white dark:bg-white dark:text-onyx font-medium text-sm hover:opacity-90 transition-opacity shadow-md"
          >
            <Search size={16} />
            Search My World
          </Link>
          <Link
            to="/reconstruction"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-alabaster dark:border-white/10 bg-white/80 dark:bg-white/5 text-charcoal dark:text-white font-medium text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
            Project Reconstruction
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards with Subtle 3D Perspective Tilt */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TiltCard className="glass-card rounded-2xl p-5 shadow-soft border-pastel-lilacBorder/40">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Memories</span>
            <div className="w-8 h-8 rounded-full bg-pastel-lilac flex items-center justify-center text-purple-700">
              <Layers size={16} />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-charcoal dark:text-white">
            {loading ? '...' : stats?.total_chunks || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">Searchable text chunks indexed</p>
        </TiltCard>

        <TiltCard className="glass-card rounded-2xl p-5 shadow-soft border-pastel-peachBorder/40">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold">Indexed Files</span>
            <div className="w-8 h-8 rounded-full bg-pastel-peach flex items-center justify-center text-amber-700">
              <Files size={16} />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-charcoal dark:text-white">
            {loading ? '...' : stats?.indexed_files || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">PDFs, Docs, Slides, and Text</p>
        </TiltCard>

        <TiltCard className="glass-card rounded-2xl p-5 shadow-soft border-pastel-mintBorder/40">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold">Visual OCR</span>
            <div className="w-8 h-8 rounded-full bg-pastel-mint flex items-center justify-center text-emerald-800">
              <Image size={16} />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-charcoal dark:text-white">
            {loading ? '...' : stats?.total_images_ocr || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">Screenshots & scanned images</p>
        </TiltCard>

        <TiltCard className="glass-card rounded-2xl p-5 shadow-soft border-alabaster">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold">Folders Monitored</span>
            <div className="w-8 h-8 rounded-full bg-porcelain-200 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200">
              <Folder size={16} />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-charcoal dark:text-white">
            {loading ? '...' : stats?.total_folders || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">Configured local directories</p>
        </TiltCard>
      </div>

      {/* Recent Files Table */}
      <div className="glass-card rounded-3xl p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif font-bold text-charcoal dark:text-white">
              Recently Indexed Memories
            </h2>
            <p className="text-xs text-slate-500">Files digitized and searchable in local storage</p>
          </div>
          <Link
            to="/files"
            className="flex items-center gap-1.5 text-xs font-semibold text-onyx dark:text-white hover:underline"
          >
            View all files <ArrowRight size={14} />
          </Link>
        </div>

        {recentFiles.length === 0 ? (
          <div className="text-center py-10 text-slate-500 space-y-3">
            <Database size={32} className="mx-auto text-slate-400" />
            <p className="text-sm">No files indexed yet.</p>
            <Link
              to="/settings"
              className="inline-block px-4 py-2 rounded-full bg-onyx text-white dark:bg-white dark:text-onyx text-xs font-medium"
            >
              Configure Folders to Index
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-alabaster dark:divide-white/10">
            {recentFiles.map((file) => (
              <div
                key={file.id}
                className="py-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 px-3 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="text-[11px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-porcelain-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                    {file.extension.replace('.', '')}
                  </span>
                  <div className="truncate">
                    <p className="text-sm font-medium text-charcoal dark:text-white truncate">
                      {file.filename}
                    </p>
                    <p className="text-xs font-mono text-slate-400 truncate max-w-lg">
                      {file.path}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-400">
                    {(file.file_size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    onClick={() => handleOpenFile(file.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-onyx dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    title="Open original file in Windows default application"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
