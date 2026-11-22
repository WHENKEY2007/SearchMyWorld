import React, { useEffect, useState } from 'react';
import { Clock, Calendar, ExternalLink, FileText, Sparkles } from 'lucide-react';
import { api, TimelinePeriod } from '../api/client';

export const MyTimeline: React.FC = () => {
  const [timeline, setTimeline] = useState<TimelinePeriod[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const data = await api.getTimeline(100);
        setTimeline(data.timeline);
        setTotalItems(data.total_items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, []);

  const handleOpenFile = async (fileId: string) => {
    try {
      await api.openFile(fileId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-serif text-charcoal dark:text-white tracking-tight">
          Personal <span className="italic font-normal">Memory Timeline.</span>
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Explore your files and digital memories in chronological order of when they were created and edited.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading timeline memories...</div>
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
                    className="glass-card rounded-2xl p-4 shadow-soft border border-alabaster dark:border-white/10 flex items-center justify-between hover:shadow-soft-lg transition-all group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-porcelain-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        {item.extension.replace('.', '')}
                      </span>
                      <div className="truncate">
                        <p className="text-sm font-semibold text-charcoal dark:text-white truncate">
                          {item.filename}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-2">
                          <span>{item.event_date}</span>
                          <span>•</span>
                          <span className="font-mono truncate max-w-sm">{item.path}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenFile(item.file_id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-onyx dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                      title="Open file"
                    >
                      <ExternalLink size={15} />
                    </button>
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
