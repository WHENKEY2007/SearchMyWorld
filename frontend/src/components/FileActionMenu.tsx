import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  MessageSquareText,
  Eye,
  FileSearch,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export interface FileActionItem {
  id: string;
  filename: string;
  path: string;
  extension?: string;
  snippet?: string;
}

interface FileActionMenuProps {
  file: FileActionItem;
  onPreview?: (file: FileActionItem) => void;
  className?: string;
  variant?: 'button' | 'icon';
}

export const FileActionMenu: React.FC<FileActionMenuProps> = ({
  file,
  onPreview,
  className = '',
  variant = 'icon',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [opening, setOpening] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleAskAI = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    navigate(`/assistant?fileId=${file.id}&fileName=${encodeURIComponent(file.filename)}`);
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onPreview) {
      onPreview(file);
    }
  };

  const handleFindSimilar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    // Strip common extension and numbers to get semantic query
    const baseName = file.filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[0-9_-]+/g, ' ')
      .trim();
    navigate(`/search?q=${encodeURIComponent(baseName || file.filename)}`);
  };

  const handleOpenDesktop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpening(true);
    try {
      await api.openFile(file.id);
    } catch (err: any) {
      alert(`Could not open file: ${err.message}`);
    } finally {
      setTimeout(() => {
        setOpening(false);
        setIsOpen(false);
      }, 600);
    }
  };

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(file.path);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setIsOpen(false);
    }, 1200);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      {variant === 'icon' ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-charcoal dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title="File actions"
        >
          <MoreVertical size={16} />
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-alabaster dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors"
        >
          <MoreVertical size={14} />
          <span>Actions</span>
        </button>
      )}

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1.5 w-52 rounded-2xl bg-white/95 dark:bg-onyx-card/95 backdrop-blur-xl border border-alabaster dark:border-white/10 shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
        >
          {/* File Name Header */}
          <div className="px-3 py-1.5 border-b border-alabaster dark:border-white/10 mb-1">
            <p className="font-semibold text-charcoal dark:text-white truncate" title={file.filename}>
              {file.filename}
            </p>
            <p className="text-[10px] text-slate-400 font-mono truncate">{file.path}</p>
          </div>

          {/* Action 1: Ask AI About This File */}
          <button
            onClick={handleAskAI}
            className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors font-medium"
          >
            <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
            <span>Ask AI about this file</span>
          </button>

          {/* Action 2: Quick Preview */}
          {onPreview && (
            <button
              onClick={handlePreview}
              className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Eye size={14} className="text-slate-500" />
              <span>In-App Preview</span>
            </button>
          )}

          {/* Action 3: Find Similar */}
          <button
            onClick={handleFindSimilar}
            className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <FileSearch size={14} className="text-slate-500" />
            <span>Find Similar Documents</span>
          </button>

          {/* Action 4: Open in Default Application */}
          <button
            onClick={handleOpenDesktop}
            className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <ExternalLink size={14} className="text-slate-500" />
            <span>{opening ? 'Opening...' : 'Open on Computer'}</span>
          </button>

          {/* Action 5: Copy Path */}
          <button
            onClick={handleCopyPath}
            className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors border-t border-alabaster dark:border-white/10 mt-1 pt-2"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Path Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} className="text-slate-500" />
                <span>Copy File Path</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
