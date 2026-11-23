import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, RefreshCw, CheckCircle2, AlertCircle, Clock, ChevronDown, FileText, ArrowRight, Square } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { api, IndexingStatus } from '../api/client';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [status, setStatus] = useState<IndexingStatus | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [showProgressMenu, setShowProgressMenu] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    try {
      const data = await api.getIndexingStatus();
      setStatus(data);
    } catch {
      // offline/initial
    }
  };

  const isIndexing = status?.status === 'indexing' || triggering;

  useEffect(() => {
    fetchStatus();
    // Dynamic polling: fast when indexing or popup open, relaxed when idle
    const pollTime = (isIndexing || showProgressMenu) ? 800 : 4000;
    const interval = setInterval(fetchStatus, pollTime);
    return () => clearInterval(interval);
  }, [isIndexing, showProgressMenu]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowProgressMenu(false);
      }
    };
    if (showProgressMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProgressMenu]);

  const handleStartIndexing = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setTriggering(true);
      await api.startIndexing();
      await fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setTriggering(false);
    }
  };

  const handleStopIndexing = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.stopIndexing();
      await fetchStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const total = status?.total_files_discovered || 0;
  const processed = status?.processed_files || 0;
  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  return (
    <header className="h-16 px-8 flex items-center justify-between border-b border-alabaster dark:border-white/10 bg-porcelain-100/80 dark:bg-onyx-300/80 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
          Personal Knowledge Environment
        </h1>
      </div>

      <div className="flex items-center gap-3.5 relative" ref={popoverRef}>
        {/* Indexing Indicator & Popover Trigger */}
        <div
          onClick={() => setShowProgressMenu(!showProgressMenu)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-alabaster dark:border-white/10 bg-white/70 dark:bg-white/5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-all select-none shadow-sm"
          title="Click to view indexing progress & activity"
        >
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isIndexing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
            }`}
          />
          <span className="font-medium truncate max-w-xs">
            {isIndexing
              ? total > 0
                ? `Indexing: ${processed}/${total} (${percent}%)`
                : `Indexing: ${status?.current_file || 'Scanning...'}`
              : 'Memory Synchronized'}
          </span>

          <ChevronDown size={13} className={`text-slate-400 transition-transform ${showProgressMenu ? 'rotate-180' : ''}`} />

          {isIndexing ? (
            <button
              onClick={handleStopIndexing}
              className="ml-1 px-1.5 py-0.5 rounded bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 transition-colors flex items-center gap-1 font-semibold text-[10px]"
              title="Stop indexing process"
            >
              <Square size={10} className="fill-current" /> Stop
            </button>
          ) : (
            <button
              onClick={handleStartIndexing}
              className="ml-0.5 p-1 hover:text-onyx dark:hover:text-white transition-colors"
              title="Scan folders and update index"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>

        {/* Live Indexing Progress Drawer / Popover */}
        {showProgressMenu && (
          <div className="absolute top-12 right-12 w-80 sm:w-96 glass-card rounded-2xl p-4 shadow-soft-lg border border-alabaster dark:border-white/10 space-y-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-alabaster dark:border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isIndexing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                <h3 className="font-serif font-bold text-sm text-charcoal dark:text-white">
                  {isIndexing ? 'Active Indexing in Progress' : 'Indexing Engine Status'}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {isIndexing ? `${percent}%` : 'Synchronized'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-porcelain-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${isIndexing ? Math.max(5, percent) : 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span>{processed} of {total} files inspected</span>
                <span>{status?.indexed_files || 0} indexed</span>
              </div>
            </div>

            {/* Stop Button in Popover */}
            {isIndexing && (
              <button
                onClick={handleStopIndexing}
                className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 border border-red-200 transition-colors"
              >
                <Square size={12} className="fill-current" /> Stop Indexing Process
              </button>
            )}

            {/* Currently Processing File */}
            {isIndexing && status?.current_file && (
              <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Currently Processing:</span>
                <p className="font-mono text-[11px] truncate">{status.current_file}</p>
              </div>
            )}

            {/* Recent Files Stream */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Recent Activity
              </span>
              {status?.recent_files && status.recent_files.length > 0 ? (
                <div className="max-h-40 overflow-y-auto divide-y divide-alabaster dark:divide-white/5 space-y-1 pr-1 text-xs">
                  {status.recent_files.slice(0, 6).map((f, i) => (
                    <div key={i} className="py-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        {f.status === 'indexed' ? (
                          <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                        ) : f.status === 'skipped' ? (
                          <Clock size={13} className="text-slate-400 flex-shrink-0" />
                        ) : (
                          <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                        )}
                        <span className="font-medium text-charcoal dark:text-white truncate">{f.filename}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                        {f.status === 'indexed' ? 'Indexed' : f.status === 'skipped' ? 'Unchanged' : 'Failed'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2 italic text-center">
                  All monitored files are current.
                </p>
              )}
            </div>

            {/* Link to My Files */}
            <div className="pt-2 border-t border-alabaster dark:border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Total in Database: {status?.indexed_files || 0}</span>
              <Link
                to="/files"
                onClick={() => setShowProgressMenu(false)}
                className="text-xs font-semibold text-onyx dark:text-white hover:underline flex items-center gap-1"
              >
                Browse All Files <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full border border-alabaster dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-onyx dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-300 transform active:scale-90"
          title={`Switch to ${theme === 'light' ? 'Dark Obsidian' : 'Light Porcelain'} mode`}
        >
          <div className="transition-transform duration-300 transform rotate-0 dark:rotate-180">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </div>
        </button>
      </div>
    </header>
  );
};
