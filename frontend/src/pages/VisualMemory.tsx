import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Search,
  ExternalLink,
  Copy,
  Check,
  FileSearch,
  Sparkles,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { api, ImageOCRResult } from '../api/client';
import { TiltCard } from '../components/TiltCard';

export const VisualMemory: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ImageOCRResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const loadScreenshots = async (searchQuery: string = '') => {
    setLoading(true);
    try {
      const data = await api.searchOcr(searchQuery);
      setResults(data);
    } catch (err) {
      console.error('Visual OCR search failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Automatically load all recent screenshots & images with OCR text on page open
    loadScreenshots('');
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    loadScreenshots(query);
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

  const handleCopyText = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sampleOCRQueries = [
    'Theme',
    'Certificate',
    'CodeChef',
    'India',
    'Architecture',
    'Validation',
    'Government',
    'OpenCV',
  ];

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-pastel-mintBorder bg-pastel-mint/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          <Sparkles size={13} /> On-Device RapidOCR Vision
        </div>
        <h1 className="text-4xl md:text-5xl font-serif text-charcoal dark:text-white tracking-tight">
          Visual <span className="italic font-normal">Memory & Screenshots.</span>
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Every screenshot, diagram, and picture scanned on your computer is searchable by the visible words inside it.
        </p>
      </div>

      {/* OCR Search Bar */}
      <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto">
        <div className="glass-card rounded-full p-2 pl-6 shadow-soft flex items-center border border-alabaster dark:border-white/10 focus-within:ring-2 focus-within:ring-purple-400 dark:focus-within:ring-purple-500 transition-all">
          <Search size={20} className="text-slate-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) {
                loadScreenshots('');
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
                loadScreenshots('');
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
              loadScreenshots(s);
            }}
            className="px-3 py-1 rounded-full border border-alabaster dark:border-white/10 bg-white/60 dark:bg-white/5 hover:border-purple-300 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
          >
            "{s}"
          </button>
        ))}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-2 pt-2 text-xs text-slate-500">
        <span>
          Showing <strong className="text-charcoal dark:text-white">{results.length}</strong> {query ? `matches for "${query}"` : 'recent visual memories with extracted text'}
        </span>
        <span className="font-mono text-[11px] text-slate-400">100% Local OCR</span>
      </div>

      {/* Results Grid with Real Image Previews */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-2">
          <RefreshCw size={24} className="animate-spin text-slate-400" />
          <span className="text-xs">Scanning visual memories...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-3xl p-8 space-y-3">
          <FileSearch size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-serif font-semibold text-charcoal dark:text-white">
            No screenshots found matching "{query}"
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try a different search word, or click one of the suggested tags above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((item) => (
            <TiltCard
              key={item.id}
              onClick={() => handleOpenFile(item.file_id)}
              className="glass-card rounded-2xl p-4 shadow-soft border border-alabaster dark:border-white/10 flex flex-col justify-between gap-3 hover:shadow-soft-lg hover:border-purple-300 dark:hover:border-purple-500/40 transition-all cursor-pointer group"
              title="Click anywhere to open full image on your computer"
            >
              <div className="space-y-3">
                {/* Visual Thumbnail */}
                <div className="relative overflow-hidden rounded-xl bg-porcelain-200 dark:bg-white/5 border border-alabaster dark:border-white/10 h-44 flex items-center justify-center group-hover:scale-[1.01] transition-transform">
                  <img
                    src={`/api/files/${item.file_id}/view`}
                    alt={item.filename}
                    loading="lazy"
                    onError={(e) => {
                      // Fallback icon if image cannot be rendered
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-onyx/80 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm shadow-md">
                      <Eye size={13} /> {openingId === item.file_id ? 'Opening...' : 'Open Image ↗'}
                    </span>
                  </div>
                </div>

                {/* Metadata */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-pastel-mint text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      OCR DETECTED
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(item.file_size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-charcoal dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate mt-1.5">
                    {item.filename}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400 truncate">{item.path}</p>
                </div>

                {/* Extracted OCR Text Box with 1-Click Copy */}
                <div className="relative p-3 rounded-xl bg-porcelain-100/90 dark:bg-white/5 border border-alabaster dark:border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <span>Extracted Text</span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyText(e, item.extracted_text, item.id)}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-charcoal dark:hover:text-white transition-colors flex items-center gap-1"
                      title="Copy extracted text to clipboard"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check size={12} className="text-emerald-600" />
                          <span className="text-[10px] text-emerald-600 lowercase font-sans">copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span className="text-[10px] lowercase font-sans">copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed break-words">
                    {item.extracted_text}
                  </p>
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      )}
    </div>
  );
};
