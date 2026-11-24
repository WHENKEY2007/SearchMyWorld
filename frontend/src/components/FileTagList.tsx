import React, { useState, useEffect } from 'react';
import { Tag as TagIcon, Plus, X, Check } from 'lucide-react';
import { api, TagItem } from '../api/client';

interface FileTagListProps {
  fileId: string;
  initialTags?: TagItem[];
  onTagChange?: () => void;
  compact?: boolean;
}

export const FileTagList: React.FC<FileTagListProps> = ({
  fileId,
  initialTags,
  onTagChange,
  compact = false,
}) => {
  const [tags, setTags] = useState<TagItem[]>(initialTags || []);
  const [isAdding, setIsAdding] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialTags) {
      setTags(initialTags);
    } else {
      loadTags();
    }
  }, [fileId]);

  const loadTags = async () => {
    try {
      const data = await api.getFileTags(fileId);
      setTags(data);
    } catch (err) {
      console.error('Failed to load file tags', err);
    }
  };

  const handleAddTag = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTagInput.trim().replace(/^#/, '');
    if (!trimmed) {
      setIsAdding(false);
      return;
    }
    setLoading(true);
    try {
      const added = await api.addFileTag(fileId, trimmed);
      setTags((prev) => [...prev.filter((t) => t.tag !== added.tag), added]);
      setNewTagInput('');
      setIsAdding(false);
      if (onTagChange) onTagChange();
    } catch (err) {
      console.error('Failed to add tag', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = async (tagStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.removeFileTag(fileId, tagStr);
      setTags((prev) => prev.filter((t) => t.tag !== tagStr));
      if (onTagChange) onTagChange();
    } catch (err) {
      console.error('Failed to remove tag', err);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {tags.map((t) => (
        <span
          key={t.id || t.tag}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
            compact ? 'text-[10px]' : 'text-xs'
          } bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50 group`}
        >
          <span>#{t.tag}</span>
          <button
            type="button"
            onClick={(e) => handleRemoveTag(t.tag, e)}
            className="opacity-60 hover:opacity-100 hover:text-red-500 transition-opacity p-0.5"
            title={`Remove #${t.tag}`}
          >
            <X size={compact ? 10 : 12} />
          </button>
        </span>
      ))}

      {isAdding ? (
        <form onSubmit={handleAddTag} className="inline-flex items-center gap-1">
          <input
            type="text"
            autoFocus
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            placeholder="tag..."
            className="px-2 py-0.5 text-xs rounded-full border border-indigo-400 bg-white dark:bg-black/40 text-charcoal dark:text-white outline-none w-20"
            disabled={loading}
          />
          <button
            type="submit"
            className="p-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
            title="Save tag"
          >
            <Check size={11} />
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X size={11} />
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-slate-300 dark:border-white/20 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 transition-colors ${
            compact ? 'text-[10px]' : 'text-xs'
          }`}
          title="Add a custom tag"
        >
          <Plus size={compact ? 10 : 12} />
          <span>Tag</span>
        </button>
      )}
    </div>
  );
};
