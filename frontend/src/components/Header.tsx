import React, { useState, useEffect } from 'react';
import { Sun, Moon, RefreshCw, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { api, IndexingStatus } from '../api/client';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [status, setStatus] = useState<IndexingStatus | null>(null);
  const [triggering, setTriggering] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await api.getIndexingStatus();
      setStatus(data);
    } catch {
      // ignore in offline/initial
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleStartIndexing = async () => {
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

  const isIndexing = status?.status === 'indexing' || triggering;

  return (
    <header className="h-16 px-8 flex items-center justify-between border-b border-alabaster dark:border-white/10 bg-porcelain-100/80 dark:bg-onyx-300/80 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
          Personal Knowledge Environment
        </h1>
      </div>

      <div className="flex items-center gap-3.5">
        {/* Indexing Indicator & Trigger */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-alabaster dark:border-white/10 bg-white/70 dark:bg-white/5 text-xs text-slate-600 dark:text-slate-300">
          <span
            className={`w-2 h-2 rounded-full ${
              isIndexing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
            }`}
          />
          <span className="font-medium">
            {isIndexing
              ? `Indexing: ${status?.current_file || 'Processing...'}`
              : 'Memory Synchronized'}
          </span>
          <button
            onClick={handleStartIndexing}
            disabled={isIndexing}
            className="ml-1 p-1 hover:text-onyx dark:hover:text-white disabled:opacity-50 transition-colors"
            title="Scan folders and update index"
          >
            <RefreshCw size={12} className={isIndexing ? 'animate-spin' : ''} />
          </button>
        </div>

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
