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
} from 'lucide-react';
import { api, SearchResultItem } from '../api/client';
import { TiltCard } from '../components/TiltCard';

const SAMPLE_QUERIES = [
  'Support Vector Machines classification',
  'Project proposal architecture',
  'Fourier Transform notes',
  'Database installation error',
  'Hackathon implementation timeline',
];

export const SmartSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<string | undefined>(undefined);
  const [openingId, setOpeningId] = useState<string | null>(null);

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
    { label: 'PDF Documents', ext: '.pdf' },
    { label: 'Word (.docx)', ext: '.docx' },
    { label: 'Presentations (.pptx)', ext: '.pptx' },
    { label: 'Text & Notes (.txt)', ext: '.txt' },
  ];

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      {/* Search Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-serif text-charcoal dark:text-white tracking-tight">
          Intelligent <span className="italic font-normal">File Search.</span>
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Search your personal documents by meaning and concept, not just exact filenames.
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

        {/* Group/deduplicate results by file_id */}
        {(() => {
          const uniqueResults = results.reduce<Array<SearchResultItem & { pages: number[] }>>((acc, curr) => {
            const existing = acc.find((item) => item.file_id === curr.file_id);
            if (!existing) {
              acc.push({
                ...curr,
                pages: curr.page_number ? [curr.page_number] : [],
              });
            } else if (curr.page_number && !existing.pages.includes(curr.page_number)) {
              existing.pages.push(curr.page_number);
            }
            return acc;
          }, []);

          return uniqueResults.map((res) => {
            const isOpening = openingId === res.file_id;
            const pagesStr = res.pages.length > 0 ? `Page ${res.pages.join(', ')}` : null;

            return (
              <TiltCard
                key={res.file_id}
                onClick={() => handleOpenFile(res.file_id)}
                className="glass-card rounded-2xl p-5 shadow-soft hover:shadow-soft-lg hover:border-purple-300 dark:hover:border-purple-500/40 transition-all border border-alabaster dark:border-white/10 group cursor-pointer flex items-center justify-between gap-4"
                title={`Click to open ${res.filename} in Windows`}
              >
                <div className="space-y-1.5 truncate flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-pastel-lilac text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                      {res.extension?.replace('.', '') || 'FILE'}
                    </span>
                    {pagesStr && (
                      <span className="text-[11px] text-slate-500 bg-porcelain-200 dark:bg-white/10 px-2 py-0.5 rounded-full">
                        {pagesStr}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      Match: {(res.relevance_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-charcoal dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-400 group-hover:underline transition-colors cursor-pointer truncate">
                    {res.filename}
                  </h3>
                  <p className="text-xs font-mono text-slate-400 truncate max-w-2xl">{res.path}</p>
                </div>

                {isOpening && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0 animate-pulse">
                    Opening in Windows...
                  </span>
                )}
              </TiltCard>
            );
          });
        })()}
      </div>
    </div>
  );
};
