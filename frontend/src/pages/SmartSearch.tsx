import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  FileText,
  Filter,
  Sparkles,
  Layers,
  FileCode,
  Tag,
  Eye,
  X,
  Copy,
  Check,
  Calendar,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { api, SearchResultItem } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { FileActionMenu } from '../components/FileActionMenu';

const SAMPLE_QUERIES = [
  'Support Vector Machines classification',
  'Project proposal architecture',
  'Fourier Transform notes',
  'Database installation error',
  'Hackathon implementation timeline',
];

export const SmartSearch: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<string | undefined>(undefined);
  const [openingId, setOpeningId] = useState<string | null>(null);

  // In-App Document Preview Modal
  const [previewFile, setPreviewFile] = useState<{
    id: string;
    filename: string;
    path: string;
    extension: string;
    snippet?: string;
  } | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Sorting and Filtering
  const [sortOrder, setSortOrder] = useState<'relevance' | 'filename'>('relevance');

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const q = customQuery !== undefined ? customQuery : query;
    if (!q.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const data = await api.search(q, selectedExtension);
      setResults(data.results);
    } catch (err) {
      console.error(err);
      alert('Search failed. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async (fileId: string) => {
    try {
      setOpeningId(fileId);
      await api.openFile(fileId);
    } catch (err: any) {
      alert(`Could not open file: ${err.message}`);
    } finally {
      setTimeout(() => setOpeningId(null), 1500);
    }
  };

  const filterTabs = [
    { label: 'All Formats', ext: undefined },
    { label: 'Screenshots & Images', ext: '.png' },
    { label: 'PDF Documents', ext: '.pdf' },
    { label: 'Word (.docx)', ext: '.docx' },
    { label: 'Presentations (.pptx)', ext: '.pptx' },
    { label: 'Text & Notes (.txt)', ext: '.txt' },
    { label: 'Code & Data (.py, .json, .csv)', ext: '.json' },
  ];

  // Highlight matched search keywords inside text snippet
  const renderHighlightedText = (text: string, q: string) => {
    if (!q.trim()) return text;
    const words = q
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (words.length === 0) return text;
    const regex = new RegExp(`(${words.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          className="bg-amber-200 dark:bg-amber-500/40 text-charcoal dark:text-white font-medium rounded px-0.5"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      {/* Search Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-serif text-charcoal dark:text-white tracking-tight">
          Intelligent <span className="italic font-normal">File Search.</span>
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Search your personal documents by meaning and concept with live keyword highlighting and instant in-app preview.
        </p>
      </div>

      {/* Main Search Bar Form */}
      <form onSubmit={(e) => handleSearch(e)} className="relative max-w-3xl mx-auto">
        <div className="glass-card rounded-full p-2 pl-6 shadow-soft flex items-center border border-alabaster dark:border-white/10 focus-within:ring-2 focus-within:ring-onyx dark:focus-within:ring-white transition-all">
          <Search size={20} className="text-slate-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything (e.g., 'Where did I explain the machine learning model?')"
            className="w-full bg-transparent border-none outline-none text-charcoal dark:text-white placeholder:text-slate-400 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-full bg-onyx text-white dark:bg-white dark:text-onyx font-medium text-xs hover:opacity-90 transition-opacity shadow-sm flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
          >
            {loading ? <Sparkles size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </button>
        </div>
      </form>

      {/* Format Filter Tabs & Sample Queries */}
      <div className="space-y-3">
        <div className="flex items-center justify-center flex-wrap gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => {
                setSelectedExtension(tab.ext);
                if (query.trim()) {
                  api.search(query, tab.ext).then((res) => setResults(res.results));
                }
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedExtension === tab.ext
                  ? 'bg-onyx text-white dark:bg-white dark:text-onyx shadow-sm'
                  : 'bg-porcelain-200 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Suggestion Pills */}
        <div className="flex items-center justify-center flex-wrap gap-1.5 pt-1">
          <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles size={11} /> Try:
          </span>
          {SAMPLE_QUERIES.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setQuery(sample);
                handleSearch(undefined, sample);
              }}
              className="text-[11px] px-2.5 py-1 rounded-full border border-alabaster dark:border-white/10 text-slate-500 hover:text-onyx dark:hover:text-white hover:bg-black/5 transition-colors"
            >
              "{sample}"
            </button>
          ))}
        </div>
      </div>

      {/* Search Results Feed */}
      <div className="space-y-4 pt-4">
        {searched && (
          <div className="flex items-center justify-between text-xs text-slate-500 px-2">
            <span>
              Found <strong className="text-charcoal dark:text-white">{results.length}</strong> matching memory passages
            </span>
            <span>Hybrid: SQLite FTS5 (BM25) + Local Dense Embeddings</span>
          </div>
        )}

        {searched && results.length === 0 && !loading && (
          <div className="text-center py-16 glass-card rounded-3xl p-8 space-y-3">
            <FileText size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-serif font-semibold text-charcoal dark:text-white">
              No matching memories found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try rephrasing your question or make sure the folders containing your notes are indexed in Settings.
            </p>
          </div>
        )}

        {/* Deduplicate and Render Results */}
        {(() => {
          const uniqueResults = results.reduce<
            Array<SearchResultItem & { pages: number[]; snippets: string[] }>
          >((acc, curr) => {
            const existing = acc.find((item) => item.file_id === curr.file_id);
            if (!existing) {
              acc.push({
                ...curr,
                pages: curr.page_number ? [curr.page_number] : [],
                snippets: curr.snippet ? [curr.snippet] : [],
              });
            } else {
              if (curr.page_number && !existing.pages.includes(curr.page_number)) {
                existing.pages.push(curr.page_number);
              }
              if (curr.snippet && !existing.snippets.includes(curr.snippet)) {
                existing.snippets.push(curr.snippet);
              }
            }
            return acc;
          }, []);

          return uniqueResults.map((res) => {
            const isOpening = openingId === res.file_id;
            const pagesStr = res.pages.length > 0 ? `Page ${res.pages.join(', ')}` : null;
            const isImg = ['.png', '.jpg', '.jpeg'].includes((res.extension || '').toLowerCase());
            const primarySnippet = res.snippets[0] || res.snippet;

            return (
              <div
                key={res.file_id}
                className="glass-card rounded-2xl p-5 shadow-soft hover:shadow-soft-lg hover:border-purple-300 dark:hover:border-purple-500/40 transition-all border border-alabaster dark:border-white/10 group space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {isImg ? (
                      <img
                        src={`/api/files/${res.file_id}/view`}
                        alt={res.filename}
                        className="w-16 h-16 object-cover rounded-xl shadow-sm flex-shrink-0 border border-alabaster dark:border-white/10 mt-1 cursor-pointer"
                        onClick={() =>
                          setPreviewFile({
                            id: res.file_id,
                            filename: res.filename,
                            path: res.path,
                            extension: res.extension || '',
                            snippet: primarySnippet,
                          })
                        }
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-pastel-lilac/70 dark:bg-purple-950/60 flex items-center justify-center text-purple-700 dark:text-purple-300 flex-shrink-0 mt-0.5">
                        <FileText size={20} />
                      </div>
                    )}

                    <div className="space-y-1 truncate flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-porcelain-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                          {res.extension?.replace('.', '') || 'DOC'}
                        </span>
                        {pagesStr && (
                          <span className="text-[11px] text-slate-500 bg-porcelain-200 dark:bg-white/10 px-2 py-0.5 rounded-full">
                            {pagesStr}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          Relevance: {(res.relevance_score * 100).toFixed(0)}%
                        </span>
                      </div>

                      <h3
                        onClick={() => handleOpenFile(res.file_id)}
                        className="text-base font-semibold text-charcoal dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-400 group-hover:underline transition-colors cursor-pointer truncate"
                      >
                        {res.filename}
                      </h3>
                      <p className="text-xs font-mono text-slate-400 truncate max-w-2xl">{res.path}</p>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() =>
                        navigate(
                          `/assistant?fileId=${res.file_id}&fileName=${encodeURIComponent(res.filename)}`
                        )
                      }
                      className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/40 text-xs font-semibold text-purple-700 dark:text-purple-300 transition-colors flex items-center gap-1 shadow-sm"
                      title="Chat with this document using AI"
                    >
                      <Sparkles size={12} className="text-purple-600 dark:text-purple-400" />
                      <span>Ask AI</span>
                    </button>

                    <button
                      onClick={() =>
                        setPreviewFile({
                          id: res.file_id,
                          filename: res.filename,
                          path: res.path,
                          extension: res.extension || '',
                          snippet: primarySnippet,
                        })
                      }
                      className="px-2.5 py-1.5 rounded-xl border border-alabaster dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1"
                      title="Quick Preview inside SearchMyWorld"
                    >
                      <Eye size={12} />
                      <span>Preview</span>
                    </button>

                    <button
                      onClick={() => handleOpenFile(res.file_id)}
                      className="px-2.5 py-1.5 rounded-xl bg-onyx text-white dark:bg-white dark:text-onyx text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 shadow-sm"
                      title="Open in Windows default application"
                    >
                      <ExternalLink size={12} />
                      <span>{isOpening ? 'Opening...' : 'Open'}</span>
                    </button>

                    <FileActionMenu
                      file={{
                        id: res.file_id,
                        filename: res.filename,
                        path: res.path,
                        extension: res.extension || '',
                        snippet: primarySnippet,
                      }}
                      onPreview={() =>
                        setPreviewFile({
                          id: res.file_id,
                          filename: res.filename,
                          path: res.path,
                          extension: res.extension || '',
                          snippet: primarySnippet,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Grounded Match Snippet with Highlighted Keywords */}
                {primarySnippet && (
                  <div className="p-3.5 rounded-xl bg-porcelain-100/90 dark:bg-white/5 border border-alabaster dark:border-white/10">
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3 select-text">
                      {renderHighlightedText(primarySnippet, query)}
                    </p>
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>

      {/* ============================================================== */}
      {/* IN-APP UNIVERSAL DOCUMENT PREVIEW MODAL                         */}
      {/* ============================================================== */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col p-6 shadow-glow space-y-4">
            <div className="flex items-center justify-between border-b border-alabaster dark:border-white/10 pb-3">
              <div className="truncate pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-porcelain-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                    {previewFile.extension.replace('.', '')}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-charcoal dark:text-white truncate">
                    {previewFile.filename}
                  </h3>
                </div>
                <p className="text-xs font-mono text-slate-400 truncate mt-0.5">{previewFile.path}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenFile(previewFile.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-onyx text-white dark:bg-white dark:text-onyx text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <ExternalLink size={13} /> Open in Windows
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Document Content Frame */}
            <div className="flex-1 min-h-[400px] overflow-auto bg-porcelain-100/50 dark:bg-black/30 rounded-2xl p-2 border border-alabaster dark:border-white/10">
              {['.png', '.jpg', '.jpeg'].includes(previewFile.extension.toLowerCase()) ? (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <img
                    src={`/api/files/${previewFile.id}/view`}
                    alt={previewFile.filename}
                    className="max-h-[60vh] object-contain rounded-xl shadow-lg"
                  />
                </div>
              ) : previewFile.extension.toLowerCase() === '.pdf' ? (
                <iframe
                  src={`/api/files/${previewFile.id}/view`}
                  title={previewFile.filename}
                  className="w-full h-[60vh] rounded-xl border-none shadow-sm"
                />
              ) : (
                <div className="p-4 space-y-3 font-mono text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                  <div className="flex items-center justify-between border-b border-alabaster dark:border-white/10 pb-2">
                    <span className="text-slate-400">Grounded Text Passage</span>
                    <button
                      onClick={() => {
                        if (previewFile.snippet) {
                          navigator.clipboard.writeText(previewFile.snippet);
                          setCopiedSnippet(true);
                          setTimeout(() => setCopiedSnippet(false), 2000);
                        }
                      }}
                      className="text-xs text-onyx dark:text-white flex items-center gap-1 hover:underline"
                    >
                      {copiedSnippet ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      {copiedSnippet ? 'Copied' : 'Copy Passage'}
                    </button>
                  </div>
                  <p>{previewFile.snippet || 'Loading document contents...'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};