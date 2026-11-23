import React, { useEffect, useState } from 'react';
import {
  Files,
  ExternalLink,
  Search,
  Filter,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
  X,
} from 'lucide-react';
import { api, FileItem } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { FileActionMenu } from '../components/FileActionMenu';
import { Sparkles } from 'lucide-react';

export const MyFiles: React.FC = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterExt, setFilterExt] = useState<string | undefined>(undefined);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedFileChunks, setSelectedFileChunks] = useState<any[] | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const data = await api.getFiles(filterExt, undefined, 100, 0);
      setFiles(data.files);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [filterExt]);

  const handleOpenFile = async (fileId: string) => {
    try {
      await api.openFile(fileId);
    } catch (e: any) {
      alert(`Could not open file: ${e.message}`);
    }
  };

  const handleViewChunks = async (fileId: string, filename: string) => {
    try {
      const data = await api.getFileDetails(fileId);
      setSelectedFileChunks(data.chunks);
      setSelectedFileName(filename);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredFiles = files.filter((f) =>
    f.filename.toLowerCase().includes(searchFilter.toLowerCase()) ||
    f.path.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-charcoal dark:text-white tracking-tight">
            Indexed <span className="italic font-normal">Files.</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Total {total} files indexed and monitored in your local memory.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter file names..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-full border border-alabaster dark:border-white/10 bg-white/60 dark:bg-white/5 text-xs text-charcoal dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-onyx"
            />
          </div>

          <select
            value={filterExt || ''}
            onChange={(e) => setFilterExt(e.target.value || undefined)}
            className="px-3 py-1.5 rounded-full border border-alabaster dark:border-white/10 bg-white/60 dark:bg-white/5 text-xs text-charcoal dark:text-white focus:outline-none"
          >
            <option value="">All Formats</option>
            <option value=".pdf">PDF (.pdf)</option>
            <option value=".docx">Word (.docx)</option>
            <option value=".pptx">Presentations (.pptx)</option>
            <option value=".txt">Text (.txt)</option>
            <option value=".png">PNG Images</option>
            <option value=".jpg">JPG Images</option>
          </select>
        </div>
      </div>

      {/* Files Table */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-soft border border-alabaster dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-porcelain-200/60 dark:bg-white/5 border-b border-alabaster dark:border-white/10 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-5">Type</th>
                <th className="py-3 px-5">File Name & Path</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Modified</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-alabaster dark:divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Loading files...
                  </td>
                </tr>
              ) : filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 space-y-2">
                    <FileText size={28} className="mx-auto text-slate-300" />
                    <p>No matching files found.</p>
                  </td>
                </tr>
              ) : (
                filteredFiles.map((f) => (
                  <tr key={f.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-5">
                      <span className="font-mono font-bold uppercase px-2 py-0.5 rounded bg-porcelain-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        {f.extension.replace('.', '')}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 max-w-md">
                      <p className="font-semibold text-charcoal dark:text-white truncate">{f.filename}</p>
                      <p className="font-mono text-[11px] text-slate-400 truncate">{f.path}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {(f.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {f.modified_at ? new Date(f.modified_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {f.indexing_status === 'indexed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={13} /> Indexed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          <AlertCircle size={13} /> {f.indexing_status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() =>
                            navigate(
                              `/assistant?fileId=${f.id}&fileName=${encodeURIComponent(f.filename)}`
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/40 text-xs font-semibold text-purple-700 dark:text-purple-300 transition-colors flex items-center gap-1 shadow-sm"
                          title="Chat with this file using AI"
                        >
                          <Sparkles size={12} className="text-purple-600 dark:text-purple-400" />
                          <span>Ask AI</span>
                        </button>
                        <button
                          onClick={() => setPreviewFile(f)}
                          className="px-2.5 py-1 rounded-lg border border-alabaster dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                          title="Preview inside SearchMyWorld"
                        >
                          <Eye size={13} className="inline mr-1" />
                          Preview
                        </button>
                        <button
                          onClick={() => handleViewChunks(f.id, f.filename)}
                          className="px-2.5 py-1 rounded-lg border border-alabaster dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                          title="Inspect memory chunks"
                        >
                          <Layers size={13} className="inline mr-1" />
                          Chunks
                        </button>
                        <button
                          onClick={() => handleOpenFile(f.id)}
                          className="px-2.5 py-1 rounded-lg bg-onyx text-white dark:bg-white dark:text-onyx font-medium transition-opacity hover:opacity-90"
                          title="Open in Windows default application"
                        >
                          <ExternalLink size={13} className="inline mr-1" />
                          Open
                        </button>
                        <FileActionMenu
                          file={{
                            id: f.id,
                            filename: f.filename,
                            path: f.path,
                            extension: f.extension,
                          }}
                          onPreview={() => setPreviewFile(f)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chunks Inspector Drawer/Modal */}
      {selectedFileChunks && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col p-6 shadow-glow space-y-4">
            <div className="flex items-center justify-between border-b border-alabaster dark:border-white/10 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-charcoal dark:text-white">
                  Memory Chunks
                </h3>
                <p className="text-xs font-mono text-slate-500 truncate max-w-lg">{selectedFileName}</p>
              </div>
              <button
                onClick={() => setSelectedFileChunks(null)}
                className="px-3 py-1 rounded-full bg-porcelain-200 dark:bg-white/10 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {selectedFileChunks.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No chunks extracted for this file.</p>
              ) : (
                selectedFileChunks.map((c, i) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl bg-porcelain-100/90 dark:bg-white/5 border border-alabaster dark:border-white/10 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-mono">Chunk #{i + 1}</span>
                      {c.page_number && <span>Page {c.page_number}</span>}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                      {c.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* In-App Document Preview Modal */}
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

            <div className="flex-1 min-h-[420px] overflow-auto bg-porcelain-100/50 dark:bg-black/30 rounded-2xl p-2 border border-alabaster dark:border-white/10 flex items-center justify-center">
              {['.png', '.jpg', '.jpeg'].includes(previewFile.extension.toLowerCase()) ? (
                <img
                  src={`/api/files/${previewFile.id}/view`}
                  alt={previewFile.filename}
                  className="max-h-[65vh] object-contain rounded-xl shadow-lg"
                />
              ) : previewFile.extension.toLowerCase() === '.pdf' ? (
                <iframe
                  src={`/api/files/${previewFile.id}/view`}
                  title={previewFile.filename}
                  className="w-full h-[65vh] rounded-xl border-none shadow-sm"
                />
              ) : (
                <iframe
                  src={`/api/files/${previewFile.id}/view`}
                  title={previewFile.filename}
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
