import React, { useEffect, useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Search,
  ExternalLink,
  Copy,
  Check,
  FileSearch,
  Sparkles,
  Eye,
  ChevronDown,
  LayoutGrid,
  List,
  Table,
  Columns,
  Grid3X3,
  Maximize2,
  Minimize2,
  Calendar,
  ArrowUpDown,
  X,
  PanelRight,
  PanelRightClose,
  Download,
  Clock,
  HardDrive,
  RefreshCw,
  BoxSelect,
  Layers,
} from 'lucide-react';
import { api, ImageOCRResult, OCRBoxItem } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { FileActionMenu } from '../components/FileActionMenu';
import { TiltCard } from '../components/TiltCard';

type ViewMode =
  | 'extra-large'
  | 'large'
  | 'medium'
  | 'small'
  | 'list'
  | 'details'
  | 'tiles'
  | 'content';

type SortMode =
  | 'relevance'
  | 'date_desc'
  | 'date_asc'
  | 'name_asc'
  | 'name_desc'
  | 'size_desc';

export const VisualMemory: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ImageOCRResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  // View Options (Matching Windows File Explorer Menu)
  const [viewMode, setViewMode] = useState<ViewMode>('large');
  const [previewPaneOpen, setPreviewPaneOpen] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ImageOCRResult | null>(null);

  // Sort Options
  const [sortMode, setSortMode] = useState<SortMode>('relevance');

  // Dropdown states
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Lightbox Modal
  const [lightboxItem, setLightboxItem] = useState<ImageOCRResult | null>(null);

  // Bounding box overlay & copy image state
  const [showBoxes, setShowBoxes] = useState(true);
  const [copiedImageId, setCopiedImageId] = useState<string | null>(null);
  const [hoveredBoxText, setHoveredBoxText] = useState<string | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setViewDropdownOpen(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (e?: React.FormEvent, customQ?: string, customSort?: SortMode) => {
    if (e) e.preventDefault();
    const q = customQ !== undefined ? customQ : query;
    const s = customSort !== undefined ? customSort : sortMode;
    setLoading(true);
    try {
      const data = await api.searchOcr(q, s);
      setResults(data);
      if (data.length > 0) {
        setSelectedItem(data[0]);
      }
    } catch (err) {
      console.error('Visual OCR search failed', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial image OCR memories
  useEffect(() => {
    handleSearch(undefined, '', 'relevance');
  }, []);

  const handleSortChange = async (newSort: SortMode) => {
    setSortMode(newSort);
    setSortDropdownOpen(false);
    handleSearch(undefined, query, newSort);
  };

  const handleOpenFile = async (fileId: string) => {
    setOpeningId(fileId);
    try {
      await api.openFile(fileId);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setTimeout(() => setOpeningId(null), 800);
    }
  };

  const handleCopyText = (textOrEvent: React.MouseEvent | string, textOrId?: string, idParam?: string) => {
    let text = '';
    let id = '';
    if (typeof textOrEvent === 'string') {
      text = textOrEvent;
      id = textOrId || '';
    } else {
      textOrEvent.stopPropagation();
      text = textOrId || '';
      id = idParam || '';
    }
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyImage = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/view`);
      if (!response.ok) throw new Error('Failed to fetch image data');
      const blob = await response.blob();
      // Most browser clipboard APIs require image/png
      let pngBlob = blob;
      if (blob.type !== 'image/png') {
        // Convert to PNG canvas blob
        const img = new window.Image();
        const url = URL.createObjectURL(blob);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          pngBlob = await new Promise((res) => canvas.toBlob((b) => res(b || blob), 'image/png')) || blob;
        }
        URL.revokeObjectURL(url);
      }
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob })
      ]);
      setCopiedImageId(fileId);
      setTimeout(() => setCopiedImageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy image to clipboard:', err);
      alert('Could not copy image directly to clipboard. You can download or open it.');
    }
  };

  const sampleOCRQueries = [
    'install',
    'ModuleNotFoundError',
    'Database error',
    'Terminal error',
    'React Dashboard',
    'Architecture',
    'Theme',
    'Certificate',
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-pastel-mintBorder bg-pastel-mint/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          <Sparkles size={13} /> On-Device RapidOCR Vision
        </div>
        <h1 className="text-4xl md:text-5xl font-serif text-charcoal dark:text-white tracking-tight">
          Visual <span className="italic font-normal">Memory & Screenshots.</span>
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Every screenshot, diagram, and picture scanned on your computer is searchable by the visible words inside it with high-resolution previews.
        </p>
      </div>

      {/* OCR Search Bar */}
      <form onSubmit={(e) => handleSearch(e)} className="relative max-w-3xl mx-auto">
        <div className="glass-card rounded-full p-2 pl-6 shadow-soft flex items-center border border-alabaster dark:border-white/10 focus-within:ring-2 focus-within:ring-purple-400 dark:focus-within:ring-purple-500 transition-all">
          <Search size={20} className="text-slate-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) {
                handleSearch(undefined, '');
              }
            }}
            placeholder="Search words inside your screenshots, certificates, or diagrams..."
            className="w-full bg-transparent border-none outline-none text-charcoal dark:text-white placeholder:text-slate-400 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                handleSearch(undefined, '');
              }}
              className="px-2 text-xs text-slate-400 hover:text-charcoal dark:hover:text-white mr-1"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-full bg-onyx text-white dark:bg-white dark:text-onyx font-medium text-xs hover:opacity-90 transition-opacity shadow-sm flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <ImageIcon size={14} />}
            Search Images
          </button>
        </div>
      </form>

      {/* Suggestion tags from user's actual files */}
      <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-slate-500">
        <span className="font-medium">Found in your screenshots:</span>
        {sampleOCRQueries.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setQuery(s);
              handleSearch(undefined, s);
            }}
            className="px-3 py-1 rounded-full border border-alabaster dark:border-white/10 bg-white/60 dark:bg-white/5 hover:border-purple-300 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
          >
            "{s}"
          </button>
        ))}
      </div>

      {/* ============================================================== */}
      {/* WINDOWS EXPLORER TOOLBAR: SORT & VIEW DROPDOWNS                 */}
      {/* ============================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 px-1 border-b border-alabaster dark:border-white/10 pb-3">
        <div className="text-xs text-slate-500">
          Found <strong className="text-charcoal dark:text-white">{results.length}</strong> visual memories
          {query ? ` for "${query}"` : ''}
        </div>

        <div className="flex items-center gap-2">
          {/* SORT DROPDOWN */}
          <div className="relative" ref={sortMenuRef}>
            <button
              onClick={() => {
                setSortDropdownOpen(!sortDropdownOpen);
                setViewDropdownOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-alabaster dark:border-white/10 bg-white/70 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold text-charcoal dark:text-white transition-colors"
            >
              <ArrowUpDown size={14} />
              <span>Sort</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {sortDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 rounded-2xl glass-card shadow-glow border border-alabaster dark:border-white/10 py-1.5 z-40 text-xs text-charcoal dark:text-white animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Sort By
                </div>
                <button
                  onClick={() => handleSortChange('relevance')}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10 ${
                    sortMode === 'relevance' ? 'font-bold text-onyx dark:text-white' : ''
                  }`}
                >
                  <span>Relevance (Best match)</span>
                  {sortMode === 'relevance' && <Check size={14} className="text-emerald-500" />}
                </button>
                <button
                  onClick={() => handleSortChange('date_desc')}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10 ${
                    sortMode === 'date_desc' ? 'font-bold text-onyx dark:text-white' : ''
                  }`}
                >
                  <span>Original Date (Newest first)</span>
                  {sortMode === 'date_desc' && <Check size={14} className="text-emerald-500" />}
                </button>
                <button
                  onClick={() => handleSortChange('date_asc')}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10 ${
                    sortMode === 'date_asc' ? 'font-bold text-onyx dark:text-white' : ''
                  }`}
                >
                  <span>Original Date (Oldest first)</span>
                  {sortMode === 'date_asc' && <Check size={14} className="text-emerald-500" />}
                </button>
                <button
                  onClick={() => handleSortChange('name_asc')}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10 ${
                    sortMode === 'name_asc' ? 'font-bold text-onyx dark:text-white' : ''
                  }`}
                >
                  <span>Name (A to Z)</span>
                  {sortMode === 'name_asc' && <Check size={14} className="text-emerald-500" />}
                </button>
                <button
                  onClick={() => handleSortChange('name_desc')}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10 ${
                    sortMode === 'name_desc' ? 'font-bold text-onyx dark:text-white' : ''
                  }`}
                >
                  <span>Name (Z to A)</span>
                  {sortMode === 'name_desc' && <Check size={14} className="text-emerald-500" />}
                </button>
                <button
                  onClick={() => handleSortChange('size_desc')}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10 ${
                    sortMode === 'size_desc' ? 'font-bold text-onyx dark:text-white' : ''
                  }`}
                >
                  <span>File Size (Largest first)</span>
                  {sortMode === 'size_desc' && <Check size={14} className="text-emerald-500" />}
                </button>
              </div>
            )}
          </div>

          {/* VIEW DROPDOWN (Matches Windows Explorer View Menu exactly!) */}
          <div className="relative" ref={viewMenuRef}>
            <button
              onClick={() => {
                setViewDropdownOpen(!viewDropdownOpen);
                setSortDropdownOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-alabaster dark:border-white/10 bg-white/70 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold text-charcoal dark:text-white transition-colors"
            >
              <LayoutGrid size={14} />
              <span>View</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {viewDropdownOpen && (
              <div className="absolute right-0 mt-1 w-60 rounded-2xl glass-card shadow-glow border border-alabaster dark:border-white/10 py-2 z-40 text-xs text-charcoal dark:text-white animate-in fade-in zoom-in-95">
                {/* Icons views */}
                <button
                  onClick={() => {
                    setViewMode('extra-large');
                    setViewDropdownOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <Maximize2 size={14} className="text-slate-500" /> Extra large icons
                  </span>
                  {viewMode === 'extra-large' && <span className="w-1.5 h-1.5 rounded-full bg-onyx dark:bg-white" />}
                </button>
                <button
                  onClick={() => {
                    setViewMode('large');
                    setViewDropdownOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <Grid3X3 size={14} className="text-slate-500" /> Large icons
                  </span>
                  {viewMode === 'large' && <span className="w-1.5 h-1.5 rounded-full bg-onyx dark:bg-white" />}
                </button>
                <button
                  onClick={() => {
                    setViewMode('medium');
                    setViewDropdownOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <LayoutGrid size={14} className="text-slate-500" /> Medium icons
                  </span>
                  {viewMode === 'medium' && <span className="w-1.5 h-1.5 rounded-full bg-onyx dark:bg-white" />}
                </button>
                <button
                  onClick={() => {
                    setViewMode('small');
                    setViewDropdownOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <Minimize2 size={14} className="text-slate-500" /> Small icons
                  </span>
                  {viewMode === 'small' && <span className="w-1.5 h-1.5 rounded-full bg-onyx dark:bg-white" />}
                </button>

                <div className="my-1.5 border-t border-alabaster dark:border-white/10" />

                <button
                  onClick={() => {
                    setViewMode('list');
                    setViewDropdownOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <List size={14} className="text-slate-500" /> List
                  </span>
                  {viewMode === 'list' && <span className="w-1.5 h-1.5 rounded-full bg-onyx dark:bg-white" />}
                </button>
                <button
                  onClick={() => {
                    setViewMode('details');
                    setViewDropdownOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <Table size={14} className="text-slate-500" /> Details
                  </span>
                  {viewMode === 'details' && <span className="w-1.5 h-1.5 rounded-full bg-onyx dark:bg-white" />}
                </button>
                <button
                  onClick={() => {
                    setViewMode('tiles');
                    setViewDropdownOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <Columns size={14} className="text-slate-500" /> Tiles
                  </span>
                  {viewMode === 'tiles' && <span className="w-1.5 h-1.5 rounded-full bg-onyx dark:bg-white" />}
                </button>
                <button
                  onClick={() => {
                    setViewMode('content');
                    setViewDropdownOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-500" /> Content
                  </span>
                  {viewMode === 'content' && <span className="w-1.5 h-1.5 rounded-full bg-onyx dark:bg-white" />}
                </button>

                <div className="my-1.5 border-t border-alabaster dark:border-white/10" />

                {/* Pane Toggles */}
                <button
                  onClick={() => {
                    setPreviewPaneOpen(!previewPaneOpen);
                    setViewDropdownOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <PanelRight size={14} className="text-slate-500" /> Preview pane
                  </span>
                  {previewPaneOpen && <span className="w-1.5 h-1.5 rounded-full bg-onyx dark:bg-white" />}
                </button>
              </div>
            )}
          </div>

          {/* Quick toggle for Preview Pane */}
          <button
            onClick={() => setPreviewPaneOpen(!previewPaneOpen)}
            className={`p-1.5 rounded-xl border border-alabaster dark:border-white/10 transition-colors ${
              previewPaneOpen
                ? 'bg-onyx text-white dark:bg-white dark:text-onyx'
                : 'bg-white/70 dark:bg-white/5 text-slate-500 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title={previewPaneOpen ? 'Hide Preview Pane' : 'Show Preview Pane'}
          >
            {previewPaneOpen ? <PanelRightClose size={15} /> : <PanelRight size={15} />}
          </button>
        </div>
      </div>

      {/* Empty State */}
      {results.length === 0 && !loading && (
        <div className="text-center py-16 glass-card rounded-3xl p-8 space-y-3">
          <FileSearch size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-serif font-semibold text-charcoal dark:text-white">
            No matching screenshots found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Make sure the folders containing your screenshots (like Pictures or Screenshots) are configured in Settings.
          </p>
        </div>
      )}

      {/* Main Content Area (Optionally split with Preview Pane) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Results View Container */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {loading ? (
            <div className="py-20 text-center text-slate-400">Loading visual memories...</div>
          ) : viewMode === 'details' ? (
            /* ========================================================== */
            /* DETAILS VIEW (TABLE)                                       */
            /* ========================================================== */
            <div className="glass-card rounded-2xl overflow-hidden border border-alabaster dark:border-white/10 shadow-soft">
              <table className="w-full text-left text-xs">
                <thead className="bg-porcelain-200/60 dark:bg-white/5 border-b border-alabaster dark:border-white/10 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Preview</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Path</th>
                    <th className="py-2.5 px-3">Original Date</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">Extracted Text</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-alabaster dark:divide-white/10">
                  {results.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`cursor-pointer transition-colors ${
                        selectedItem?.id === item.id
                          ? 'bg-porcelain-200/80 dark:bg-white/10'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <td className="py-2 px-3">
                        <img
                          src={`/api/files/${item.file_id}/view`}
                          alt={item.filename}
                          className="w-12 h-8 object-cover rounded-lg shadow-sm"
                          loading="lazy"
                        />
                      </td>
                      <td className="py-2 px-3 font-semibold text-charcoal dark:text-white max-w-[180px] truncate">
                        {item.filename}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-400 max-w-[200px] truncate">
                        {item.path}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-500">
                        {item.modified_at
                          ? new Date(item.modified_at).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-500">
                        {(item.file_size / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-2 px-3 max-w-[200px] truncate font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {item.extracted_text || '[No text]'}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxItem(item);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-onyx dark:hover:text-white"
                          title="View High Resolution"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFile(item.file_id);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-onyx dark:hover:text-white"
                          title="Open Original on Windows"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'list' ? (
            /* ========================================================== */
            /* LIST VIEW                                                  */
            /* ========================================================== */
            <div className="glass-card rounded-2xl divide-y divide-alabaster dark:divide-white/10 border border-alabaster dark:border-white/10 shadow-soft">
              {results.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    selectedItem?.id === item.id
                      ? 'bg-porcelain-200/80 dark:bg-white/10'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={`/api/files/${item.file_id}/view`}
                      alt={item.filename}
                      className="w-14 h-10 object-cover rounded-lg shadow-sm flex-shrink-0"
                      loading="lazy"
                    />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-charcoal dark:text-white truncate">
                        {item.filename}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 truncate">
                        {item.path}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                    <span className="text-slate-400 font-mono">
                      {(item.file_size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxItem(item);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-onyx dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                      title="Inspect"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenFile(item.file_id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-onyx dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                      title="Open on Windows"
                    >
                      <ExternalLink size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'tiles' ? (
            /* ========================================================== */
            /* TILES VIEW                                                 */
            /* ========================================================== */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`glass-card rounded-2xl p-3 border border-alabaster dark:border-white/10 shadow-soft flex items-center gap-3 cursor-pointer transition-all ${
                    selectedItem?.id === item.id
                      ? 'ring-2 ring-onyx dark:ring-white bg-porcelain-200/60 dark:bg-white/10'
                      : 'hover:shadow-md'
                  }`}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxItem(item);
                    }}
                    className="w-20 h-20 rounded-xl overflow-hidden bg-black/5 flex-shrink-0 relative group"
                  >
                    <img
                      src={`/api/files/${item.file_id}/view`}
                      alt={item.filename}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Eye size={16} className="text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-charcoal dark:text-white truncate">
                      {item.filename}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      {item.path}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {(item.file_size / 1024).toFixed(1)} KB ·{' '}
                      {item.modified_at
                        ? new Date(item.modified_at).toLocaleDateString()
                        : ''}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFile(item.file_id);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-onyx dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                    title="Open on Windows"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : viewMode === 'content' ? (
            /* ========================================================== */
            /* CONTENT VIEW (Rich horizontal cards with OCR snippet)     */
            /* ========================================================== */
            <div className="space-y-4">
              {results.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`glass-card rounded-2xl p-4 shadow-soft border border-alabaster dark:border-white/10 flex flex-col md:flex-row gap-4 cursor-pointer transition-all ${
                    selectedItem?.id === item.id
                      ? 'ring-2 ring-onyx dark:ring-white bg-porcelain-200/40 dark:bg-white/10'
                      : 'hover:shadow-md'
                  }`}
                >
                  {/* Image Preview with Hover Action */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxItem(item);
                    }}
                    className="w-full md:w-56 h-36 rounded-xl overflow-hidden bg-black/5 dark:bg-black/30 flex-shrink-0 relative group"
                  >
                    <img
                      src={`/api/files/${item.file_id}/view`}
                      alt={item.filename}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                      <span className="p-2 rounded-full bg-white/90 text-charcoal shadow-md">
                        <Eye size={16} />
                      </span>
                    </div>
                  </div>

                  {/* Metadata and OCR text */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-pastel-mint text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          IMAGE / SCREENSHOT
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyText(item.extracted_text, item.id);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-onyx dark:hover:text-white"
                            title="Copy OCR text"
                          >
                            {copiedId === item.id ? (
                              <Check size={14} className="text-emerald-500" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenFile(item.file_id);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-onyx dark:hover:text-white"
                            title="Open on Windows"
                          >
                            <ExternalLink size={15} />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-sm font-semibold text-charcoal dark:text-white truncate mt-1">
                        {item.filename}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-400 truncate">
                        {item.path}
                      </p>
                    </div>

                    {/* OCR snippet */}
                    <div className="p-2.5 rounded-xl bg-porcelain-100/90 dark:bg-white/5 border border-alabaster dark:border-white/10">
                      <p className="text-xs font-mono text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                        {item.extracted_text || '[No text detected]'}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>{(item.file_size / 1024).toFixed(1)} KB</span>
                      <span>·</span>
                      <span>
                        {item.modified_at
                          ? new Date(item.modified_at).toLocaleDateString()
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ========================================================== */
            /* GRID VIEWS (EXTRA LARGE, LARGE, MEDIUM, SMALL)             */
            /* ========================================================== */
            <div
              className={`grid gap-4 ${
                viewMode === 'extra-large'
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : viewMode === 'large'
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                  : viewMode === 'medium'
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                  : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5'
              }`}
            >
              {results.map((item) => {
                const isExtraLarge = viewMode === 'extra-large';
                const isLarge = viewMode === 'large';
                const isSmall = viewMode === 'small';

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`glass-card rounded-2xl p-3 shadow-soft border border-alabaster dark:border-white/10 flex flex-col justify-between cursor-pointer transition-all group ${
                      selectedItem?.id === item.id
                        ? 'ring-2 ring-onyx dark:ring-white bg-porcelain-200/50 dark:bg-white/10'
                        : 'hover:shadow-md'
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Image Preview with Hover Overlay */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxItem(item);
                        }}
                        className={`w-full rounded-xl overflow-hidden bg-black/5 dark:bg-black/30 relative ${
                          isExtraLarge
                            ? 'h-64'
                            : isLarge
                            ? 'h-44'
                            : isSmall
                            ? 'h-24'
                            : 'h-32'
                        }`}
                      >
                        <img
                          src={`/api/files/${item.file_id}/view`}
                          alt={item.filename}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="p-2 rounded-full bg-white/90 text-charcoal shadow-md">
                            <Eye size={15} />
                          </span>
                        </div>
                      </div>

                      {/* Title & Metadata */}
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-pastel-mint text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            IMG
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {(item.file_size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <h3 className="text-xs font-semibold text-charcoal dark:text-white truncate mt-1">
                          {item.filename}
                        </h3>
                        {!isSmall && (
                          <p className="text-[10px] font-mono text-slate-400 truncate">
                            {item.path}
                          </p>
                        )}
                      </div>

                      {/* OCR Excerpt (for Extra Large and Large modes) */}
                      {(isExtraLarge || isLarge) && (
                        <div className="p-2 rounded-xl bg-porcelain-100/90 dark:bg-white/5 border border-alabaster dark:border-white/10">
                          <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                            {item.extracted_text || '[No text detected]'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-alabaster dark:border-white/10 mt-2">
                      <span className="text-[10px] text-slate-400">
                        {item.modified_at
                          ? new Date(item.modified_at).toLocaleDateString()
                          : '-'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyText(item.extracted_text, item.id);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-onyx dark:hover:text-white"
                          title="Copy OCR text"
                        >
                          {copiedId === item.id ? (
                            <Check size={13} className="text-emerald-500" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFile(item.file_id);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-onyx dark:hover:text-white"
                          title="Open on Windows"
                        >
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* PREVIEW PANE (Windows File Explorer Style Side Panel)          */}
        {/* ============================================================== */}
        {previewPaneOpen && (
          <div className="w-full lg:w-96 flex-shrink-0 glass-card rounded-3xl p-5 shadow-soft border border-alabaster dark:border-white/10 space-y-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between border-b border-alabaster dark:border-white/10 pb-3">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Preview Pane
              </span>
              <button
                onClick={() => setPreviewPaneOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-charcoal dark:hover:text-white"
                title="Close Preview Pane"
              >
                <PanelRightClose size={15} />
              </button>
            </div>

            {selectedItem ? (
              <div className="space-y-4">
                {/* Large Preview Image with Bounding Box Overlay */}
                <div className="relative">
                  <div
                    onClick={() => setLightboxItem(selectedItem)}
                    className="rounded-2xl overflow-hidden bg-black/5 dark:bg-black/30 max-h-64 flex items-center justify-center cursor-pointer relative group border border-alabaster dark:border-white/10"
                  >
                    <div className="relative inline-block max-w-full max-h-64">
                      <img
                        src={`/api/files/${selectedItem.file_id}/view`}
                        alt={selectedItem.filename}
                        className="w-full h-auto max-h-64 object-contain transition-transform group-hover:scale-[1.02]"
                      />

                      {/* RapidOCR Word Bounding Box Highlights */}
                      {showBoxes && selectedItem.boxes && selectedItem.boxes.length > 0 && selectedItem.img_width && selectedItem.img_height && (
                        <div className="absolute inset-0 pointer-events-auto">
                          {selectedItem.boxes.map((b, idx) => {
                            const xs = b.box.map(p => p[0]);
                            const ys = b.box.map(p => p[1]);
                            const minX = Math.min(...xs);
                            const maxX = Math.max(...xs);
                            const minY = Math.min(...ys);
                            const maxY = Math.max(...ys);
                            const left = `${(minX / selectedItem.img_width!) * 100}%`;
                            const top = `${(minY / selectedItem.img_height!) * 100}%`;
                            const width = `${((maxX - minX) / selectedItem.img_width!) * 100}%`;
                            const height = `${((maxY - minY) / selectedItem.img_height!) * 100}%`;
                            const isQueryMatch = query.trim() !== '' && b.text.toLowerCase().includes(query.toLowerCase());

                            return (
                              <div
                                key={idx}
                                style={{ left, top, width, height }}
                                title={`${b.text} (${Math.round(b.confidence * 100)}%)`}
                                onMouseEnter={() => setHoveredBoxText(b.text)}
                                onMouseLeave={() => setHoveredBoxText(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyText(b.text, `box-${idx}`);
                                }}
                                className={`absolute rounded transition-all cursor-pointer ${
                                  isQueryMatch
                                    ? 'bg-amber-400/40 border-2 border-amber-500 shadow-md ring-1 ring-amber-300'
                                    : 'border border-cyan-400/70 bg-cyan-400/15 hover:bg-cyan-400/35 hover:border-cyan-300'
                                }`}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      <span className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium flex items-center gap-1 shadow">
                        <Maximize2 size={11} /> Fullscreen
                      </span>
                    </div>
                  </div>

                  {/* Lens & Copy Controls Bar */}
                  <div className="flex items-center justify-between mt-2 px-1">
                    <button
                      type="button"
                      onClick={() => setShowBoxes(!showBoxes)}
                      className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors font-medium ${
                        showBoxes
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400'
                          : 'bg-black/5 dark:bg-white/5 border-alabaster dark:border-white/10 text-slate-500 hover:text-charcoal dark:hover:text-white'
                      }`}
                      title="Toggle Google Lens-style OCR highlights"
                    >
                      <BoxSelect size={13} />
                      <span>{showBoxes ? 'Lens Boxes Active' : 'Show Word Boxes'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyImage(selectedItem.file_id)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-alabaster dark:border-white/10 bg-white dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 text-charcoal dark:text-white flex items-center gap-1.5 font-medium transition-colors shadow-xs"
                      title="Copy raw screenshot to clipboard"
                    >
                      {copiedImageId === selectedItem.file_id ? (
                        <>
                          <Check size={13} className="text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Image Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy Image</span>
                        </>
                      )}
                    </button>
                  </div>

                  {hoveredBoxText && (
                    <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-sm text-white text-[11px] font-mono truncate">
                      Detected: <span className="text-cyan-300 font-semibold">{hoveredBoxText}</span> (click box to copy)
                    </div>
                  )}
                </div>

                {/* File Details */}
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-charcoal dark:text-white break-words">
                    {selectedItem.filename}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400 break-all">
                    {selectedItem.path}
                  </p>
                </div>

                {/* Metadata Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-porcelain-100/80 dark:bg-white/5 border border-alabaster dark:border-white/10">
                    <span className="text-[10px] text-slate-400 block">File Size</span>
                    <span className="font-mono font-semibold text-charcoal dark:text-white">
                      {(selectedItem.file_size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-porcelain-100/80 dark:bg-white/5 border border-alabaster dark:border-white/10">
                    <span className="text-[10px] text-slate-400 block">Date Modified</span>
                    <span className="text-xs font-semibold text-charcoal dark:text-white">
                      {selectedItem.modified_at
                        ? new Date(selectedItem.modified_at).toLocaleDateString()
                        : '-'}
                    </span>
                  </div>
                </div>

                {/* Full Extracted OCR Text Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Extracted Text</span>
                    <button
                      onClick={() => handleCopyText(selectedItem.extracted_text, selectedItem.id)}
                      className="text-[11px] text-onyx dark:text-white font-medium hover:underline flex items-center gap-1"
                    >
                      {copiedId === selectedItem.id ? (
                        <>
                          <Check size={12} className="text-emerald-500" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy All
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3 rounded-2xl bg-porcelain-100/90 dark:bg-white/5 border border-alabaster dark:border-white/10 max-h-48 overflow-y-auto">
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
                      {selectedItem.extracted_text || '[No text detected in this image]'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons: Ask AI & Open Original */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() =>
                      navigate(
                        `/assistant?fileId=${selectedItem.file_id}&fileName=${encodeURIComponent(
                          selectedItem.filename
                        )}`
                      )
                    }
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={14} />
                    <span>Ask AI About This</span>
                  </button>
                  <button
                    onClick={() => handleOpenFile(selectedItem.file_id)}
                    className="py-2.5 px-3.5 rounded-xl bg-onyx text-white dark:bg-white dark:text-onyx font-medium text-xs shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                    title="Open in Windows Default App"
                  >
                    <ExternalLink size={14} />
                    <span>Open</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 text-xs">
                Select an image from the left to preview it here.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* HIGH RESOLUTION LIGHTBOX MODAL                                 */}
      {/* ============================================================== */}
      {lightboxItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col p-6 shadow-glow space-y-4">
            <div className="flex items-center justify-between border-b border-alabaster dark:border-white/10 pb-3">
              <div className="truncate pr-4">
                <h3 className="font-serif font-bold text-lg text-charcoal dark:text-white truncate">
                  {lightboxItem.filename}
                </h3>
                <p className="text-xs font-mono text-slate-400 truncate">{lightboxItem.path}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBoxes(!showBoxes)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    showBoxes
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-white/10 border-white/20 text-slate-300 hover:text-white'
                  }`}
                  title="Toggle bounding box highlights"
                >
                  <BoxSelect size={13} />
                  <span>{showBoxes ? 'Lens Boxes ON' : 'Show Boxes'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyImage(lightboxItem.file_id)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  title="Copy image to clipboard"
                >
                  {copiedImageId === lightboxItem.file_id ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-emerald-300">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy Image</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    const item = lightboxItem;
                    setLightboxItem(null);
                    navigate(
                      `/assistant?fileId=${item.file_id}&fileName=${encodeURIComponent(item.filename)}`
                    );
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Sparkles size={13} /> Ask AI
                </button>
                <button
                  onClick={() => handleOpenFile(lightboxItem.file_id)}
                  className="px-3 py-1.5 rounded-xl bg-onyx text-white dark:bg-white dark:text-onyx text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <ExternalLink size={13} /> Open
                </button>
                <button
                  onClick={() => setLightboxItem(null)}
                  className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* High-res image display with Lens Overlays */}
            <div className="flex-1 min-h-[300px] overflow-auto flex items-center justify-center bg-black/40 rounded-2xl p-2 relative">
              <div className="relative inline-block max-w-full max-h-[60vh]">
                <img
                  src={`/api/files/${lightboxItem.file_id}/view`}
                  alt={lightboxItem.filename}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl block"
                />

                {showBoxes && lightboxItem.boxes && lightboxItem.boxes.length > 0 && lightboxItem.img_width && lightboxItem.img_height && (
                  <div className="absolute inset-0 pointer-events-auto">
                    {lightboxItem.boxes.map((b, idx) => {
                      const xs = b.box.map(p => p[0]);
                      const ys = b.box.map(p => p[1]);
                      const minX = Math.min(...xs);
                      const maxX = Math.max(...xs);
                      const minY = Math.min(...ys);
                      const maxY = Math.max(...ys);
                      const left = `${(minX / lightboxItem.img_width!) * 100}%`;
                      const top = `${(minY / lightboxItem.img_height!) * 100}%`;
                      const width = `${((maxX - minX) / lightboxItem.img_width!) * 100}%`;
                      const height = `${((maxY - minY) / lightboxItem.img_height!) * 100}%`;
                      const isQueryMatch = query.trim() !== '' && b.text.toLowerCase().includes(query.toLowerCase());

                      return (
                        <div
                          key={idx}
                          style={{ left, top, width, height }}
                          title={`${b.text} (${Math.round(b.confidence * 100)}%)`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyText(b.text, `lightbox-box-${idx}`);
                          }}
                          className={`absolute rounded transition-all cursor-pointer ${
                            isQueryMatch
                              ? 'bg-amber-400/40 border-2 border-amber-400 shadow-lg ring-1 ring-amber-200'
                              : 'border border-cyan-400/70 bg-cyan-400/15 hover:bg-cyan-400/40 hover:border-cyan-200'
                          }`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* OCR Text bottom drawer in modal */}
            <div className="p-3 rounded-2xl bg-porcelain-100/90 dark:bg-white/5 border border-alabaster dark:border-white/10 max-h-32 overflow-y-auto">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-500">Detected OCR Text:</span>
                <button
                  onClick={() => handleCopyText(lightboxItem.extracted_text, lightboxItem.id)}
                  className="text-slate-400 hover:text-charcoal dark:hover:text-white flex items-center gap-1 text-[11px]"
                >
                  {copiedId === lightboxItem.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  Copy
                </button>
              </div>
              <p className="text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap select-text">
                {lightboxItem.extracted_text || '[No text detected]'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};