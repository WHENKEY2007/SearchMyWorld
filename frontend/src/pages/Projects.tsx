import React, { useEffect, useState } from 'react';
import { FolderGit2, Plus, FileText, CheckCircle2, AlertCircle, ArrowRight, Trash2 } from 'lucide-react';
import { api, ProjectItem } from '../api/client';
import { Link } from 'react-router-dom';
import { TiltCard } from '../components/TiltCard';

export const Projects: React.FC = () => {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleDeleteProject = async (projId: string, projName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete project "${projName}"? Your original documents and files on disk will NOT be affected.`
      )
    )
      return;
    try {
      await api.deleteProject(projId);
      loadProjects();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      await api.createProject(newProjectName.trim(), newProjectDesc.trim() || undefined);
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
      loadProjects();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-charcoal dark:text-white tracking-tight">
            Connected <span className="italic font-normal">Projects.</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Group related documents, decisions, error screenshots, and code under projects.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-onyx text-white dark:bg-white dark:text-onyx text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-3xl p-8 space-y-3">
          <FolderGit2 size={36} className="mx-auto text-slate-300" />
          <h3 className="text-lg font-serif font-semibold text-charcoal dark:text-white">
            No projects detected yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create a project or run indexing on your project directories to group documents automatically.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-full bg-onyx text-white dark:bg-white dark:text-onyx text-xs font-medium"
          >
            Create First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <TiltCard
              key={proj.id}
              className="glass-card rounded-2xl p-6 shadow-soft border border-alabaster dark:border-white/10 flex flex-col justify-between space-y-4 hover:shadow-soft-lg transition-all group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-pastel-lilac flex items-center justify-center text-purple-700">
                    <FolderGit2 size={20} />
                  </div>
                  <button
                    onClick={() => handleDeleteProject(proj.id, proj.project_name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Delete project"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3 className="text-base font-semibold text-charcoal dark:text-white group-hover:text-purple-700 transition-colors">
                  {proj.project_name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {proj.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-alabaster dark:border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Updated {proj.updated_at ? new Date(proj.updated_at).toLocaleDateString() : 'recently'}
                </span>
                <Link
                  to="/reconstruction"
                  className="flex items-center gap-1 text-xs font-semibold text-onyx dark:text-white hover:underline"
                >
                  Reconstruct <ArrowRight size={13} />
                </Link>
              </div>
            </TiltCard>
          ))}
        </div>
      )}

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="glass-card rounded-3xl max-w-md w-full p-6 shadow-glow space-y-4"
          >
            <h3 className="font-serif font-bold text-lg text-charcoal dark:text-white">
              Create New Project
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g., Signify AI / Fraud Detection"
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-alabaster dark:border-white/10 bg-white/60 dark:bg-white/5 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Description (optional)
                </label>
                <textarea
                  rows={3}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Goals, target users, or context..."
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-alabaster dark:border-white/10 bg-white/60 dark:bg-white/5 text-sm outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-full border border-alabaster dark:border-white/10 text-xs font-semibold text-slate-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-onyx text-white dark:bg-white dark:text-onyx text-xs font-semibold"
              >
                Save Project
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
