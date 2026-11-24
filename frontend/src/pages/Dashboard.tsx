import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Image as ImageIcon,
  Sparkles,
  Files,
  ArrowRight,
  Folder,
  Layers,
  Database,
  ExternalLink,
  Copy,
  Trash2,
  AlertTriangle,
  CheckCircle,
  FileText,
  HardDrive,
  X,
  RefreshCw,
  FolderCheck,
  ChevronRight,
  FileCheck2,
  Eye,
  Star,
  Clock,
  Bookmark,
} from 'lucide-react';
import {
  api,
  StatsResponse,
  FileItem,
  FolderStatsDetail,
  DuplicateSummaryResponse,
  DuplicateGroup,
  BookmarkItem,
  SmartCollectionItem,
} from '../api/client';
import { TiltCard } from '../components/TiltCard';
import { FileActionMenu } from '../components/FileActionMenu';
import { FileTagList } from '../components/FileTagList';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [spotlightQuery, setSpotlightQuery] = useState('');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [folderStats, setFolderStats] = useState<FolderStatsDetail[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [duplicates, setDuplicates] = useState<DuplicateSummaryResponse | null>(null);
  const [collections, setCollections] = useState<SmartCollectionItem[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<SmartCollectionItem | null>(null);
  const [collectionFiles, setCollectionFiles] = useState<FileItem[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // File List Modal State (Clickable Detailed Numbers)
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [fileModalTitle, setFileModalTitle] = useState('');
  const [fileModalExt, setFileModalExt] = useState<string | undefined>(undefined);
  const [fileModalFolderId, setFileModalFolderId] = useState<string | undefined>(undefined);
  const [modalFiles, setModalFiles] = useState<FileItem[]>([]);
  const [modalFilesLoading, setModalFilesLoading] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalSort, setModalSort] = useState<string>('modified_desc');

  // Duplicates / Delete Suggestions Modal State
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteActionStatus, setDeleteActionStatus] = useState<string | null>(null);
  const [previewDocModal, setPreviewDocModal] = useState<FileItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, recentData, foldersData, dupData, bookmarkData, collectionsData] = await Promise.all([
        api.getStats(),
        api.getRecentFiles(8).catch(() => []),
        api.getFolderStats(),
        api.getDuplicates(),
        api.getBookmarks().catch(() => []),
        api.getCollections().catch(() => []),
      ]);
      setStats(statsData);
      setRecentFiles(recentData);
      setFolderStats(foldersData);
      setDuplicates(dupData);
      setBookmarks(bookmarkData);
      setCollections(collectionsData);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCollection = async (c: SmartCollectionItem) => {
    setSelectedCollection(c);
    setCollectionLoading(true);
    try {
      const files = await api.getCollectionFiles(c.id, 50);
      setCollectionFiles(files);
    } catch (err) {
      console.error('Failed to load collection files', err);
    } finally {
      setCollectionLoading(false);
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenFile = async (fileId: string) => {
    try {
      await api.openFile(fileId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Open the Clickable Files Modal
  const openFileModal = async (
    title: string,
    folderId?: string,
    extension?: string
  ) => {
    setFileModalTitle(title);
    setFileModalFolderId(folderId);
    setFileModalExt(extension);
    setModalSearch('');
    setFileModalOpen(true);
    setModalFilesLoading(true);

    try {
      const res = await api.getFiles(
        extension,
        undefined,
        150,
        0,
        folderId === 'all' ? undefined : folderId,
        modalSort
      );
      setModalFiles(res.files);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch files');
    } finally {
      setModalFilesLoading(false);
    }
  };

  // Re-fetch modal files on sort change
  const handleModalSortChange = async (newSort: string) => {
    setModalSort(newSort);
    setModalFilesLoading(true);
    try {
      const res = await api.getFiles(
        fileModalExt,
        undefined,
        150,
        0,
        fileModalFolderId === 'all' ? undefined : fileModalFolderId,
        newSort
      );
      setModalFiles(res.files);
    } catch (err: any) {
      console.error(err);
    } finally {
      setModalFilesLoading(false);
    }
  };

  // Delete a duplicate suggestion file
  const handleDeleteDuplicate = async (fileId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This will delete the redundant copy from disk to free storage while keeping the original file safe.`)) {
      return;
    }

    setDeletingId(fileId);
    try {
      await api.deleteFile(fileId, true);
      setDeleteActionStatus(`Successfully deleted duplicate copy "${filename}".`);
      setTimeout(() => setDeleteActionStatus(null), 4000);

      // Refresh duplicates and folder stats
      const [updatedDups, updatedFolders, updatedStats] = await Promise.all([
        api.getDuplicates(),
        api.getFolderStats(),
        api.getStats(),
      ]);
      setDuplicates(updatedDups);
      setFolderStats(updatedFolders);
      setStats(updatedStats);
    } catch (err: any) {
      alert(err.message || 'Failed to delete duplicate file');
    } finally {
      setDeletingId(null);
    }
  };

  // Delete All Duplicate Suggestions Batch Action
  const handleDeleteAllDuplicates = async () => {
    if (!duplicates || duplicates.total_duplicate_files === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to delete all ${duplicates.total_duplicate_files} duplicate files? All primary originals will be kept safe, freeing ${(duplicates.total_reclaimable_bytes / 1024 / 1024).toFixed(1)} MB of storage.`
      )
    ) {
      return;
    }

    setDeletingId('all');
    let deletedCount = 0;
    try {
      for (const group of duplicates.groups) {
        for (const dup of group.duplicates) {
          try {
            await api.deleteFile(dup.id, true);
            deletedCount++;
          } catch (e) {
            console.error('Failed to delete', dup.filename, e);
          }
        }
      }
      setDeleteActionStatus(`Batch cleanup completed: Deleted ${deletedCount} duplicate copies.`);
      setTimeout(() => setDeleteActionStatus(null), 5000);

      // Refresh
      const [updatedDups, updatedFolders, updatedStats] = await Promise.all([
        api.getDuplicates(),
        api.getFolderStats(),
        api.getStats(),
      ]);
      setDuplicates(updatedDups);
      setFolderStats(updatedFolders);
      setStats(updatedStats);
    } finally {
      setDeletingId(null);
    }
  };

  // Calculate active folder stats
  const activeFolder =
    selectedFolderId === 'all'
      ? null
      : folderStats.find((f) => f.folder_id === selectedFolderId);

  // Aggregated totals for all folders
  const allFolderTotals = folderStats.reduce(
    (acc, f) => {
      acc.total_files += f.total_files;
      acc.indexed_files += f.indexed_files;
      acc.total_size_bytes += f.total_size_bytes;
      acc.duplicate_count += f.duplicate_count;
      acc.reclaimable_bytes += f.reclaimable_bytes;
      acc.delete_suggestions_count += f.delete_suggestions_count;
      Object.entries(f.extension_counts).forEach(([ext, cnt]) => {
        acc.extension_counts[ext] = (acc.extension_counts[ext] || 0) + cnt;
      });
      return acc;
    },
    {
      total_files: 0,
      indexed_files: 0,
      total_size_bytes: 0,
      duplicate_count: 0,
      reclaimable_bytes: 0,
      delete_suggestions_count: 0,
      extension_counts: {} as Record<string, number>,
    }
  );

  const displayData = activeFolder || allFolderTotals;

  // Filter modal files by user search
  const filteredModalFiles = modalFiles.filter(
    (f) =>
      f.filename.toLowerCase().includes(modalSearch.toLowerCase()) ||
      f.path.toLowerCase().includes(modalSearch.toLowerCase())
  );

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

        {/* Universal Spotlight Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (spotlightQuery.trim()) {
              navigate(`/search?q=${encodeURIComponent(spotlightQuery.trim())}`);
            } else {
              navigate('/search');
            }
          }}
          className="relative max-w-2xl mx-auto pt-2"
        >
          <div className="glass-card rounded-full p-2 pl-6 shadow-soft flex items-center border border-alabaster dark:border-white/10 focus-within:ring-2 focus-within:ring-onyx dark:focus-within:ring-white transition-all bg-white/80 dark:bg-onyx/80 backdrop-blur-md">
            <Search size={20} className="text-slate-400 mr-3 flex-shrink-0" />
            <input
              type="text"
              value={spotlightQuery}
              onChange={(e) => setSpotlightQuery(e.target.value)}
              placeholder="Search across all files, notes, code, PDFs, or screenshots..."
              className="w-full bg-transparent border-none outline-none text-charcoal dark:text-white placeholder:text-slate-400 text-sm"
            />
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-onyx text-white dark:bg-white dark:text-onyx font-medium text-xs hover:opacity-90 transition-opacity shadow-sm flex items-center gap-1.5 flex-shrink-0"
            >
              <span>Search</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>

        {/* Quick Launch & Suggestions */}
        <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-slate-500 pt-1">
          <span className="font-medium">Try:</span>
          {['Resume & CV', 'Project Roadmap', 'Invoices', 'Screenshots'].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
              className="px-3 py-1 rounded-full border border-alabaster dark:border-white/10 bg-white/60 dark:bg-white/5 hover:border-onyx/30 dark:hover:border-white/30 text-charcoal dark:text-white transition-colors"
            >
              {tag}
            </button>
          ))}
          <Link
            to="/visual"
            className="flex items-center gap-1 px-3 py-1 rounded-full border border-alabaster dark:border-white/10 bg-pastel-mint/30 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-medium hover:opacity-80 transition-opacity"
          >
            <ImageIcon size={12} />
            <span>Visual OCR</span>
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
              <ImageIcon size={16} />
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

      {/* ============================================================== */}
      {/* SMART COLLECTIONS (AUTOMATIC MEMORY BUCKETS)                   */}
      {/* ============================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif font-bold text-charcoal dark:text-white flex items-center gap-2">
              <span>✨ Smart Collections</span>
            </h2>
            <p className="text-xs text-slate-500">
              Auto-categorized by deep content inspection across invoices, credentials, study notes, and code.
            </p>
          </div>
          {selectedCollection && (
            <button
              onClick={() => setSelectedCollection(null)}
              className="text-xs text-slate-400 hover:text-charcoal dark:hover:text-white underline"
            >
              Close Collection
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {collections.map((c) => {
            const isSelected = selectedCollection?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => handleSelectCollection(c)}
                className={`glass-card p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] shadow-sm text-left ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-400/40'
                    : 'border-alabaster dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{c.icon}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-charcoal dark:text-white">
                    {c.count}
                  </span>
                </div>
                <h3 className="font-semibold text-xs text-charcoal dark:text-white truncate">
                  {c.title}
                </h3>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {c.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Selected Collection Inspector Drawer */}
        {selectedCollection && (
          <div className="glass-card rounded-2xl p-5 border border-indigo-200/60 dark:border-indigo-900/40 shadow-soft space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-alabaster dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedCollection.icon}</span>
                <div>
                  <h3 className="font-serif font-bold text-sm text-charcoal dark:text-white">
                    {selectedCollection.title} ({collectionFiles.length} files)
                  </h3>
                  <p className="text-xs text-slate-500">{selectedCollection.description}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCollection(null)}
                className="p-1 rounded-full text-slate-400 hover:text-charcoal dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {collectionLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading collection files...</div>
            ) : collectionFiles.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No indexed files matched this collection yet.</div>
            ) : (
              <div className="divide-y divide-alabaster dark:divide-white/10 max-h-72 overflow-y-auto">
                {collectionFiles.map((f) => (
                  <div key={f.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 px-2 rounded-xl transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-charcoal dark:text-white truncate">{f.filename}</p>
                      <p className="text-[11px] font-mono text-slate-400 truncate">{f.path}</p>
                      <div className="mt-1">
                        <FileTagList fileId={f.id} compact />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/assistant?fileId=${f.id}&fileName=${encodeURIComponent(f.filename)}`)}
                        className="px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-[11px] font-medium text-purple-700 dark:text-purple-300 flex items-center gap-1"
                      >
                        <Sparkles size={11} /> AI
                      </button>
                      <button
                        onClick={() => api.openFile(f.id)}
                        className="px-2 py-1 rounded-lg bg-onyx text-white dark:bg-white dark:text-onyx text-[11px] font-medium flex items-center gap-1"
                      >
                        <ExternalLink size={11} /> Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DETAILED FOLDER STORAGE BREAKDOWN & DUPLICATES SECTION         */}
      {/* ============================================================== */}
      <div className="glass-card rounded-3xl p-6 md:p-8 shadow-soft border border-alabaster dark:border-white/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-alabaster dark:border-white/10 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HardDrive size={20} className="text-slate-700 dark:text-slate-200" />
              <h2 className="text-2xl font-serif font-bold text-charcoal dark:text-white">
                Folder Memory & Storage Breakdown
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Click any count badge below to inspect matching files, duplicates, or delete suggestions.
            </p>
          </div>

          {/* Folder Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Folder:</span>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-alabaster dark:border-white/10 bg-white/80 dark:bg-onyx/80 text-xs font-semibold text-charcoal dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-onyx dark:focus:ring-white max-w-xs truncate"
            >
              <option value="all">📁 All Monitored Folders ({folderStats.length})</option>
              {folderStats.map((f) => (
                <option key={f.folder_id} value={f.folder_id}>
                  📂 {f.folder_path.split('\\').slice(-2).join('\\') || f.folder_path}
                </option>
              ))}
            </select>
            <button
              onClick={loadData}
              className="p-2 rounded-xl border border-alabaster dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 transition-colors"
              title="Refresh Folder Details"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {folderStats.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Folder size={36} className="mx-auto text-slate-400" />
            <h3 className="text-base font-serif font-semibold text-charcoal dark:text-white">
              No Folders Monitored Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your Desktop, Documents, or Pictures folders in Settings to analyze files, formats, and duplicates.
            </p>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-onyx text-white dark:bg-white dark:text-onyx text-xs font-medium"
            >
              Configure Folders in Settings
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Folder Header Banner */}
            <div className="p-4 rounded-2xl bg-porcelain-100/80 dark:bg-white/5 border border-alabaster dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-porcelain-200 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 flex-shrink-0">
                  <FolderCheck size={20} />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-charcoal dark:text-white truncate">
                    {activeFolder ? activeFolder.folder_path : 'All Monitored Folders Aggregated'}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500">
                    Storage: {(displayData.total_size_bytes / (1024 * 1024)).toFixed(2)} MB · Indexed:{' '}
                    {displayData.indexed_files} / {displayData.total_files}
                  </p>
                </div>
              </div>

              {/* Total Files Badge (Clickable!) */}
              <button
                onClick={() =>
                  openFileModal(
                    activeFolder
                      ? `All Files in ${activeFolder.folder_path.split('\\').pop()}`
                      : 'All Monitored Files',
                    selectedFolderId
                  )
                }
                className="px-4 py-2 rounded-xl bg-onyx text-white dark:bg-white dark:text-onyx text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm flex-shrink-0"
                title="Click to view all files"
              >
                <span>Total: {displayData.total_files} Files</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Clickable Extension Breakdown Cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                  Format Breakdown (Click any number to view files)
                </span>
                <span className="text-[11px] text-slate-400">
                  {Object.keys(displayData.extension_counts).length} formats found
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Object.entries(displayData.extension_counts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([ext, count]) => {
                    const cleanExt = ext.replace('.', '').toUpperCase();
                    const isPdf = ext === '.pdf';
                    const isImg = ext === '.png' || ext === '.jpg' || ext === '.jpeg';
                    const isDoc = ext === '.docx' || ext === '.doc';
                    const isPpt = ext === '.pptx' || ext === '.ppt';

                    return (
                      <button
                        key={ext}
                        onClick={() =>
                          openFileModal(
                            `${cleanExt} Files in ${
                              activeFolder
                                ? activeFolder.folder_path.split('\\').pop()
                                : 'All Folders'
                            }`,
                            selectedFolderId,
                            ext
                          )
                        }
                        className="group text-left p-3.5 rounded-2xl border border-alabaster dark:border-white/10 bg-white/60 dark:bg-white/5 hover:border-onyx dark:hover:border-white hover:shadow-soft transition-all"
                        title={`Click to view all ${count} ${cleanExt} files`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span
                            className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                              isPdf
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : isImg
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : isDoc
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                : isPpt
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-porcelain-200 text-slate-700 dark:bg-white/10 dark:text-slate-300'
                            }`}
                          >
                            .{cleanExt}
                          </span>
                          <ExternalLink
                            size={12}
                            className="text-slate-400 group-hover:text-onyx dark:group-hover:text-white transition-colors"
                          />
                        </div>
                        <div className="text-2xl font-serif font-bold text-charcoal dark:text-white">
                          {count}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {count === 1 ? '1 file' : `${count} files`}
                        </p>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Duplicates & Delete Suggestions Card (Clickable!) */}
            <div className="p-5 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-bold text-charcoal dark:text-white">
                    Duplicate Detection & Storage Optimization
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl">
                  Identified identical files across your folders using SHA-256 byte comparison.{' '}
                  <strong className="text-charcoal dark:text-white">
                    {displayData.duplicate_count} duplicate files
                  </strong>{' '}
                  found, wasting{' '}
                  <strong className="text-charcoal dark:text-white">
                    {(displayData.reclaimable_bytes / (1024 * 1024)).toFixed(2)} MB
                  </strong>{' '}
                  of disk space.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-shrink-0">
                <button
                  onClick={() => setDupModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-sm transition-colors flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  <span>Review {displayData.delete_suggestions_count} Delete Suggestions</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Starred Memories Section */}
      {bookmarks.length > 0 && (
        <div className="glass-card rounded-3xl p-6 shadow-soft space-y-4 border border-amber-200/50 dark:border-amber-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Star size={15} className="fill-amber-500 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold text-charcoal dark:text-white">
                  Starred Memories
                </h2>
                <p className="text-xs text-slate-500">Quick access to your most important bookmarked files</p>
              </div>
            </div>
            <Link
              to="/search"
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Search & Filter <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {bookmarks.slice(0, 4).map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-alabaster dark:border-white/10 hover:border-amber-300 dark:hover:border-amber-700/50 transition-all flex flex-col justify-between gap-2.5 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                      {b.extension.replace('.', '')}
                    </span>
                    <Star size={13} className="fill-amber-500 text-amber-500" />
                  </div>
                  <h4
                    onClick={() => handleOpenFile(b.file_id)}
                    className="text-xs font-semibold text-charcoal dark:text-white truncate cursor-pointer group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors"
                  >
                    {b.filename}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-400 truncate">{b.path}</p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-alabaster dark:border-white/10">
                  <button
                    onClick={() =>
                      navigate(
                        `/assistant?fileId=${b.file_id}&fileName=${encodeURIComponent(b.filename)}`
                      )
                    }
                    className="text-[11px] text-purple-600 dark:text-purple-400 font-medium hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={11} /> Ask AI
                  </button>
                  <FileActionMenu
                    file={{
                      id: b.file_id,
                      filename: b.filename,
                      path: b.path,
                      extension: b.extension,
                    }}
                    onPreview={() =>
                      setPreviewDocModal({
                        id: b.file_id,
                        filename: b.filename,
                        path: b.path,
                        extension: b.extension,
                        file_type: b.file_type,
                        file_size: b.file_size,
                        file_hash: '',
                        indexing_status: 'indexed',
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <span className="truncate max-w-md">{file.path}</span>
                      {file.modified_at && (
                        <span className="flex items-center gap-1 flex-shrink-0 text-[11px] text-slate-400">
                          <Clock size={11} /> {formatTimeAgo(file.modified_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    {(file.file_size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    onClick={() =>
                      navigate(
                        `/assistant?fileId=${file.id}&fileName=${encodeURIComponent(file.filename)}`
                      )
                    }
                    className="p-1.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                    title="Ask AI about this file"
                  >
                    <Sparkles size={15} />
                  </button>
                  <button
                    onClick={() => handleOpenFile(file.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-onyx dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    title="Open original file in Windows default application"
                  >
                    <ExternalLink size={15} />
                  </button>
                  <FileActionMenu
                    file={{
                      id: file.id,
                      filename: file.filename,
                      path: file.path,
                      extension: file.extension,
                    }}
                    onPreview={() => setPreviewDocModal(file)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* CLICKABLE FILES MODAL / DRAWER                                 */}
      {/* ============================================================== */}
      {fileModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col p-6 shadow-glow space-y-4">
            <div className="flex items-center justify-between border-b border-alabaster dark:border-white/10 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-charcoal dark:text-white">
                  {fileModalTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  Showing {filteredModalFiles.length} files matching your selection
                </p>
              </div>
              <button
                onClick={() => setFileModalOpen(false)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter and Sort Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by filename or path..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-alabaster dark:border-white/10 bg-white/60 dark:bg-white/5 text-xs text-charcoal dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-onyx"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs text-slate-500">Sort by:</span>
                <select
                  value={modalSort}
                  onChange={(e) => handleModalSortChange(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-alabaster dark:border-white/10 bg-white/60 dark:bg-white/5 text-xs text-charcoal dark:text-white focus:outline-none"
                >
                  <option value="modified_desc">Date Modified (Newest first)</option>
                  <option value="modified_asc">Date Modified (Oldest first)</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="size_desc">Size (Largest first)</option>
                </select>
              </div>
            </div>

            {/* File List Table */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {modalFilesLoading ? (
                <div className="text-center py-12 text-slate-400">Loading files...</div>
              ) : filteredModalFiles.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <FileText size={28} className="mx-auto text-slate-300" />
                  <p className="text-xs">No files match your search filter.</p>
                </div>
              ) : (
                <div className="divide-y divide-alabaster dark:divide-white/10">
                  {filteredModalFiles.map((file) => (
                    <div
                      key={file.id}
                      className="py-3 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-porcelain-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                          {file.extension.replace('.', '')}
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-charcoal dark:text-white truncate">
                            {file.filename}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400 truncate max-w-md">
                            {file.path}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-mono text-slate-500">
                            {(file.file_size / 1024).toFixed(1)} KB
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {file.modified_at
                              ? new Date(file.modified_at).toLocaleDateString()
                              : '-'}
                          </p>
                        </div>
                        <button
                          onClick={() => setPreviewDocModal(file)}
                          className="px-2 py-1 rounded-lg border border-alabaster dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1"
                          title="Preview inside SearchMyWorld"
                        >
                          <Eye size={12} />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => handleOpenFile(file.id)}
                          className="px-2.5 py-1 rounded-lg bg-onyx text-white dark:bg-white dark:text-onyx text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1"
                        >
                          <ExternalLink size={12} />
                          <span>Open</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DUPLICATE SUGGESTIONS & CLEANUP MODAL                          */}
      {/* ============================================================== */}
      {dupModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col p-6 shadow-glow space-y-4">
            <div className="flex items-center justify-between border-b border-alabaster dark:border-white/10 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-charcoal dark:text-white flex items-center gap-2">
                  <Trash2 size={20} className="text-amber-600 dark:text-amber-400" />
                  Duplicate Files & Delete Suggestions
                </h3>
                <p className="text-xs text-slate-500">
                  Total {duplicates?.total_duplicate_files || 0} redundant copies found (
                  {((duplicates?.total_reclaimable_bytes || 0) / (1024 * 1024)).toFixed(2)} MB reclaimable).
                  The original file is safely kept.
                </p>
              </div>
              <button
                onClick={() => setDupModalOpen(false)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Notification alert */}
            {deleteActionStatus && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle size={15} />
                <span>{deleteActionStatus}</span>
              </div>
            )}

            {/* Batch Cleanup Banner */}
            {duplicates && duplicates.total_duplicate_files > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between gap-3">
                <div className="text-xs text-amber-900 dark:text-amber-200">
                  Want to clean up all redundant copies at once?
                </div>
                <button
                  disabled={deletingId === 'all'}
                  onClick={handleDeleteAllDuplicates}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  <span>
                    {deletingId === 'all'
                      ? 'Deleting Duplicates...'
                      : `Delete All ${duplicates.total_duplicate_files} Suggested Duplicates`}
                  </span>
                </button>
              </div>
            )}

            {/* Duplicate Groups List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {!duplicates || duplicates.groups.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <CheckCircle size={32} className="mx-auto text-emerald-500" />
                  <p className="text-sm font-semibold text-charcoal dark:text-white">
                    No Duplicates Found!
                  </p>
                  <p className="text-xs text-slate-400">
                    Your indexed folders are cleanly deduplicated.
                  </p>
                </div>
              ) : (
                duplicates.groups.map((group, groupIdx) => (
                  <div
                    key={group.file_hash}
                    className="p-4 rounded-2xl border border-alabaster dark:border-white/10 bg-white/60 dark:bg-white/5 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs border-b border-alabaster dark:border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-charcoal dark:text-white">
                          Duplicate Group #{groupIdx + 1}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {(group.file_size / 1024).toFixed(1)} KB each · {group.total_copies} total copies
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        +{(group.reclaimable_bytes / 1024).toFixed(1)} KB reclaimable
                      </span>
                    </div>

                    {/* Primary File (Keep) */}
                    <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white uppercase tracking-wider flex-shrink-0">
                          KEEP ORIGINAL
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-charcoal dark:text-white truncate">
                            {group.primary_file.filename}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 truncate">
                            {group.primary_file.path}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenFile(group.primary_file.id)}
                        className="px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex-shrink-0"
                      >
                        Open
                      </button>
                    </div>

                    {/* Duplicate Copies (Suggested for Deletion) */}
                    <div className="space-y-2 pl-2">
                      {group.duplicates.map((dup) => (
                        <div
                          key={dup.id}
                          className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white uppercase tracking-wider flex-shrink-0">
                              DELETE COPY
                            </span>
                            <div className="truncate">
                              <p className="text-xs font-semibold text-charcoal dark:text-white truncate">
                                {dup.filename}
                              </p>
                              <p className="text-[10px] font-mono text-slate-500 truncate">
                                {dup.path}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleOpenFile(dup.id)}
                              className="px-2 py-1 rounded-lg text-slate-500 hover:text-charcoal dark:hover:text-white text-[11px]"
                              title="Inspect file before deleting"
                            >
                              Inspect
                            </button>
                            <button
                              disabled={deletingId === dup.id}
                              onClick={() => handleDeleteDuplicate(dup.id, dup.filename)}
                              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors shadow-sm flex items-center gap-1 disabled:opacity-50"
                            >
                              <Trash2 size={12} />
                              <span>{deletingId === dup.id ? 'Deleting...' : 'Delete'}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* In-App Document Preview Modal */}
      {previewDocModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col p-6 shadow-glow space-y-4">
            <div className="flex items-center justify-between border-b border-alabaster dark:border-white/10 pb-3">
              <div className="truncate pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-porcelain-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                    {previewDocModal.extension.replace('.', '')}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-charcoal dark:text-white truncate">
                    {previewDocModal.filename}
                  </h3>
                </div>
                <p className="text-xs font-mono text-slate-400 truncate mt-0.5">{previewDocModal.path}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenFile(previewDocModal.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-onyx text-white dark:bg-white dark:text-onyx text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <ExternalLink size={13} /> Open in Windows
                </button>
                <button
                  onClick={() => setPreviewDocModal(null)}
                  className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[420px] overflow-auto bg-porcelain-100/50 dark:bg-black/30 rounded-2xl p-2 border border-alabaster dark:border-white/10 flex items-center justify-center">
              {['.png', '.jpg', '.jpeg'].includes(previewDocModal.extension.toLowerCase()) ? (
                <img
                  src={`/api/files/${previewDocModal.id}/view`}
                  alt={previewDocModal.filename}
                  className="max-h-[65vh] object-contain rounded-xl shadow-lg"
                />
              ) : previewDocModal.extension.toLowerCase() === '.pdf' ? (
                <iframe
                  src={`/api/files/${previewDocModal.id}/view`}
                  title={previewDocModal.filename}
                  className="w-full h-[65vh] rounded-xl border-none shadow-sm"
                />
              ) : (
                <iframe
                  src={`/api/files/${previewDocModal.id}/view`}
                  title={previewDocModal.filename}
                  className="w-full h-[65vh] rounded-xl border-none shadow-sm bg-white dark:bg-black/40"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};