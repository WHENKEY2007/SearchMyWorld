import React, { useEffect, useState } from 'react';
import { Clock, Calendar, FileText, Sparkles, Edit3, PlusCircle, CheckCircle2 } from 'lucide-react';
import { api, TimelinePeriod, TimelineItem } from '../api/client';

export const MyTimeline: React.FC = () => {
  const [timeline, setTimeline] = useState<TimelinePeriod[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateType, setDateType] = useState<'modified' | 'created' | 'indexed'>('modified');
  const [openingId, setOpeningId] = useState<string | null>(null);

  const fetchTimeline = async (type: 'modified' | 'created' | 'indexed') => {
    setLoading(true);
    try {
      const data = await api.getTimeline(100, type);
      setTimeline(data.timeline);
      setTotalItems(data.total_items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline(dateType);
  }, [dateType]);

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

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-serif text-charcoal dark:text-white tracking-tight">
          Personal <span className="italic font-normal">Memory Timeline.</span>
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Explore your files and digital memories in chronological order with verified timestamp auditing.
        </p>

        {/* Date Mode Toggle Filter Bar */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-porcelain-200/70 dark:bg-white/5 border border-alabaster dark:border-white/10 gap-1.5 mt-2 shadow-sm">
          <button
            onClick={() => setDateType('modified')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              dateType === 'modified'
                ? 'bg-onyx text-white dark:bg-white dark:text-onyx shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-charcoal dark:hover:text-white'
            }`}
          >
            <Edit3 size={13} />
            Last Modified
          </button>

          <button
            onClick={() => setDateType('created')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              dateType === 'created'
                ? 'bg-onyx text-white dark:bg-white dark:text-onyx shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-charcoal dark:hover:text-white'
            }`}
          >
            <PlusCircle size={13} />
            Date Created
          </button>

          <button
            onClick={() => setDateType('indexed')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              dateType === 'indexed'
                ? 'bg-onyx text-white dark:bg-white dark:text-onyx shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-charcoal dark:hover:text-white'
            }`}
          >
            <Sparkles size={13} />
            Date Indexed
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2">
          <Clock size={24} className="animate-spin text-slate-400" />
          <span className="text-xs">Loading chronological timeline...</span>
        </div>
      ) : timeline.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-3xl p-8 space-y-3">
          <Clock size={36} className="mx-auto text-slate-300" />
          <h3 className="text-lg font-serif font-semibold text-charcoal dark:text-white">
            No timeline data available
          </h3>
          <p className="text-xs text-slate-500">Add folders in Settings to see your chronological history.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-alabaster dark:border-white/10 ml-6 pl-8 space-y-12">
          {timeline.map((group) => (
            <div key={group.period} className="relative space-y-4">
              {/* Timeline Node Dot */}
              <div className="absolute -left-[41px] top-1 w-5 h-5 rounded-full border-4 border-porcelain-100 dark:border-onyx-300 bg-onyx dark:bg-white" />

              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-slate-400" />
                <h2 className="text-lg font-serif font-bold text-charcoal dark:text-white">
                  {group.period}
                </h2>
                <span className="text-xs text-slate-400">({group.items.length} files)</span>
              </div>

              {/* Items in this period */}
              <div className="grid grid-cols-1 gap-3">
                {group.items.map((item) => (
                  <div
                    key={item.file_id}
                    onClick={() => handleOpenFile(item.file_id)}
                    className="glass-card rounded-2xl p-4 shadow-soft border border-alabaster dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-soft-lg hover:border-purple-300 dark:hover:border-purple-600 transition-all cursor-pointer group"
                    title="Click anywhere to open native file on your computer"
                  >
                    <div className="flex items-start gap-3 overflow-hidden">
                      <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-lg bg-porcelain-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 flex-shrink-0 mt-0.5">
                        {item.extension.replace('.', '')}
                      </span>
                      <div className="truncate space-y-1.5">
                        <p className="text-sm font-semibold text-charcoal dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                          {item.filename}
                        </p>

                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {/* Active view date badge */}
                          <span className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md bg-porcelain-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[11px]">
                            {dateType === 'created' ? (
                              <>
                                <PlusCircle size={11} className="text-blue-500" /> Created: {item.created_date || item.event_date}
                              </>
                            ) : dateType === 'indexed' ? (
                              <>
                                <Sparkles size={11} className="text-amber-500" /> Indexed: {item.indexed_date || item.event_date}
                              </>
                            ) : (
                              <>
                                <Edit3 size={11} className="text-emerald-500" /> Modified: {item.modified_date || item.event_date}
                              </>
                            )}
                          </span>

                          {/* Smart Inferred Date (from filename) if present */}
                          {item.inferred_date && (
                            <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 text-[10px]" title="Original date extracted from document filename">
                              <Sparkles size={11} /> Document Date: {item.inferred_date}
                            </span>
                          )}

                          <span className="font-mono text-[11px] text-slate-400 truncate max-w-xs hidden sm:inline">
                            {item.path}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                      <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {openingId === item.file_id ? 'Opening...' : 'Open File ↗'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
