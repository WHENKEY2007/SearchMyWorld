import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Search,
  ExternalLink,
  Copy,
  Check,
  FileSearch,
  Eye,
} from 'lucide-react';
import { api, ImageOCRResult } from '../api/client';

export const VisualMemory: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ImageOCRResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const data = await api.searchOcr(query);
      setResults(data);
    } catch (err) {
      console.error(err);
      alert('Visual OCR search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async (fileId: string) => {
    try {
      await api.openFile(fileId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sampleOCRQueries = ['ModuleNotFoundError', 'Database error', 'Terminal error', 'React Dashboard'];

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-serif text-charcoal dark:text-white tracking-tight">
          Visual <span className="italic font-normal">Memory Search.</span>
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Find screenshots, error screens, and diagrams by searching the visible text inside them using local OCR.
        </p>
      </div>

      {/* OCR Search Bar */}
      <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto">
        <div className="glass-card rounded-full p-2 pl-6 shadow-soft flex items-center border border-alabaster dark:border-white/10 focus-within:ring-2 focus-within:ring-onyx dark:focus-within:ring-white transition-all">
          <Search size={20} className="text-slate-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search text in screenshots (e.g., 'ModuleNotFoundError', '404 Not Found')"
            className="w-full bg-transparent border-none outline-none text-charcoal dark:text-white placeholder:text-slate-400 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-full bg-onyx text-white dark:bg-white dark:text-onyx font-medium text-xs hover:opacity-90 transition-opacity shadow-sm flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
          >
            <ImageIcon size={14} />
            Search Images
          </button>
        </div>
      </form>

      {/* Suggestion tags */}
      <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-slate-500">
        <span>Try searching:</span>
        {sampleOCRQueries.map((s) => (
          <button
            key={s}
            onClick={() => {
              setQuery(s);
              api.searchOcr(s).then(setResults);
              setSearched(true);
            }}
            className="px-2.5 py-1 rounded-full border border-alabaster dark:border-white/10 hover:text-onyx dark:hover:text-white transition-colors"
          >
            "{s}"
          </button>
        ))}
      </div>

      {/* Results Grid */}
      <div className="space-y-4 pt-4">
        {searched && (
          <div className="text-xs text-slate-500 px-2">
            Found <strong className="text-charcoal dark:text-white">{results.length}</strong> matching screenshots
          </div>
        )}

        {searched && results.length === 0 && !loading && (
          <div className="text-center py-16 glass-card rounded-3xl p-8 space-y-3">
            <FileSearch size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-serif font-semibold text-charcoal dark:text-white">
              No matching screenshots found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Make sure the folders containing your screenshots (like Pictures or Downloads) are added in Settings.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((item) => (
            <div
              key={item.id}
              className="glass-card rounded-2xl p-5 shadow-soft border border-alabaster dark:border-white/10 space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-pastel-mint text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    IMAGE / SCREENSHOT
                  </span>
                  <button
                    onClick={() => handleOpenFile(item.file_id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-onyx dark:hover:text-white transition-colors"
                    title="Open original image on Windows"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>

                <h3 className="text-sm font-semibold text-charcoal dark:text-white truncate">
                  {item.filename}
                </h3>
                <p className="text-xs font-mono text-slate-400 truncate">{item.path}</p>
              </div>

              {/* Extracted Text Box */}
              <div className="relative mt-2 p-3 rounded-xl bg-porcelain-100/90 dark:bg-white/5 border border-alabaster dark:border-white/10">
                <button
                  onClick={() => handleCopyText(item.extracted_text, item.id)}
                  className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-onyx dark:hover:text-white transition-colors"
                  title="Copy extracted OCR text"
                >
                  {copiedId === item.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
                <p className="text-xs font-mono text-slate-600 dark:text-slate-300 line-clamp-4 leading-relaxed pr-6">
                  {item.extracted_text || '[No text detected]'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
