import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  HelpCircle,
  AlertTriangle,
  FileText,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { api, ProjectItem } from '../api/client';

interface FeatureEvidence {
  feature_name: string;
  status: 'proposed' | 'in_progress' | 'verified_implemented' | 'pending' | 'unknown';
  evidence_quote: string;
  source_file: string;
  page_number?: number;
  file_id: string;
  notes?: string;
}

export const ProjectReconstruction: React.FC = () => {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectTitle, setProjectTitle] = useState('');
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'features' | 'evolution' | 'decisions'>('features');

  // Evidence state
  const [features, setFeatures] = useState<FeatureEvidence[]>([]);
  const [evolutionData, setEvolutionData] = useState<any>(null);
  const [decisionsData, setDecisionsData] = useState<any[]>([]);
  const [conflictsData, setConflictsData] = useState<any[]>([]);
  const [ideaData, setIdeaData] = useState<any>(null);

  useEffect(() => {
    api.getProjects().then((projs) => {
      setProjects(projs);
      if (projs.length > 0) {
        setSelectedProjectId(projs[0].id);
        setProjectTitle(projs[0].project_name);
        triggerReconstruction(projs[0].project_name);
      }
    });
  }, []);

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    try {
      const projs = await api.autoDetectProjects();
      setProjects(projs);
      if (projs.length > 0) {
        setSelectedProjectId(projs[0].id);
        setProjectTitle(projs[0].project_name);
        triggerReconstruction(projs[0].project_name);
      } else {
        alert('No distinct project folders detected yet. Make sure folders are added in Settings.');
      }
    } catch (e: any) {
      alert(e.message || 'Auto-detection failed');
    } finally {
      setIsDetecting(false);
    }
  };

  const triggerReconstruction = async (title: string) => {
    setIsReconstructing(true);
    try {
      const data = await api.reconstructProject(title);
      if (data.feature_analysis && data.feature_analysis.length > 0) {
        setFeatures(data.feature_analysis);
      }
      setEvolutionData(data.architectural_evolution);
      setDecisionsData(data.decisions);
      setConflictsData(data.conflicts || []);
      setIdeaData(data.original_idea);
    } catch (e) {
      console.error(e);
    } finally {
      setIsReconstructing(false);
    }
  };

  const handleReconstruct = () => {
    triggerReconstruction(projectTitle);
  };

  const getStatusBadge = (status: FeatureEvidence['status']) => {
    switch (status) {
      case 'verified_implemented':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            <CheckCircle2 size={13} /> Verified Implemented
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
            <Clock size={13} /> In Progress
          </span>
        );
      case 'proposed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
            <Sparkles size={13} /> Proposed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            <AlertTriangle size={13} /> Pending (Unfinished)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            <HelpCircle size={13} /> Unknown Status
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      {/* Flagship Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-pastel-lilacBorder bg-pastel-lilac/40 text-purple-800 dark:text-purple-300 text-xs font-semibold">
          <Sparkles size={13} /> Flagship Feature
        </div>
        <h1 className="text-4xl md:text-5xl font-serif text-charcoal dark:text-white tracking-tight">
          Project Memory <span className="italic font-normal">Reconstruction Engine.</span>
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Reconstruct the complete development history of any project from distributed documents with strict evidence citations.
        </p>
      </div>

      {/* Project Selector Bar */}
      <div className="glass-card rounded-2xl p-4 shadow-soft border border-alabaster dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Target Project:</span>
          {projects.length > 0 ? (
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                const p = projects.find((x) => x.id === e.target.value);
                if (p) setProjectTitle(p.project_name);
              }}
              className="px-3.5 py-1.5 rounded-xl border border-alabaster dark:border-white/10 bg-white/70 dark:bg-white/5 text-xs text-charcoal dark:text-white font-medium outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="e.g. Thesis, Screenshots, Q3 Report"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-alabaster dark:border-white/10 bg-white/70 dark:bg-white/5 text-xs text-charcoal dark:text-white font-medium"
            />
          )}

          <button
            onClick={handleAutoDetect}
            disabled={isDetecting}
            className="px-3 py-1.5 rounded-xl border border-alabaster dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors"
            title="Scan monitored folders to automatically identify project clusters"
          >
            {isDetecting ? 'Detecting...' : '✦ Auto-Detect from Folders'}
          </button>
        </div>

        <button
          onClick={handleReconstruct}
          disabled={isReconstructing || !projectTitle}
          className="w-full sm:w-auto px-6 py-2 rounded-full bg-onyx text-white dark:bg-white dark:text-onyx text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          <Sparkles size={14} className={isReconstructing ? 'animate-spin' : ''} />
          {isReconstructing ? 'Analyzing Evidence...' : 'Reconstruct Project'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-alabaster dark:border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('features')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'features'
              ? 'bg-onyx text-white dark:bg-white dark:text-onyx'
              : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          Evidence-Based Feature Classification
        </button>
        <button
          onClick={() => setActiveTab('evolution')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'evolution'
              ? 'bg-onyx text-white dark:bg-white dark:text-onyx'
              : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          Architectural Evolution & Scope
        </button>
        <button
          onClick={() => setActiveTab('decisions')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'decisions'
              ? 'bg-onyx text-white dark:bg-white dark:text-onyx'
              : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          Decisions & Historical Milestones
        </button>
      </div>

      {/* TAB 1: 5-Tier Feature Classification */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-porcelain-200/60 dark:bg-white/5 border border-alabaster dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <ShieldCheck size={16} className="text-purple-600" />
              Evidence Principle: A proposal mentioning a feature is never treated as proof of implementation.
            </span>
            <span className="text-slate-400">5 Status Tiers</span>
          </div>

          {features.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-3xl p-8 space-y-3">
              <Layers size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
              <h3 className="text-base font-serif font-semibold text-charcoal dark:text-white">
                No Project Reconstruction Generated Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Select a project above or click <strong>"✦ Auto-Detect from Folders"</strong> to scan your documents, extract decisions, feature evolution, and milestones.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {features.map((item, idx) => (
                <div
                  key={idx}
                  className="glass-card rounded-2xl p-5 shadow-soft border border-alabaster dark:border-white/10 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-charcoal dark:text-white">
                      {item.feature_name}
                    </h3>
                    <div>{getStatusBadge(item.status)}</div>
                  </div>

                  {/* Evidence Passage with Citation */}
                  <div className="p-3.5 rounded-xl bg-porcelain-100/90 dark:bg-white/5 border border-alabaster dark:border-white/10 space-y-2">
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed italic">
                      "{item.evidence_quote}"
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-alabaster dark:border-white/10">
                      <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                        <FileText size={13} /> {item.source_file} {item.page_number ? `(Page ${item.page_number})` : ''}
                      </span>
                      <span className="font-mono text-[10px]">Verified Provenance</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Architectural Evolution */}
      {activeTab === 'evolution' && (
        <div className="glass-card rounded-3xl p-6 shadow-soft space-y-6">
          <h3 className="font-serif font-bold text-xl text-charcoal dark:text-white">
            Architecture & Design Evolution
          </h3>
          {evolutionData && (evolutionData.initial_points?.length > 0 || evolutionData.modified_points?.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-porcelain-200/50 dark:bg-white/5 border border-alabaster dark:border-white/10 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  Initial Proposal / Early Design
                </span>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-4 leading-relaxed">
                  {(evolutionData.initial_points || []).map((pt: any, i: number) => (
                    <li key={i}>
                      <span>{pt.description}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">Source: {pt.source_file}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-pastel-mint/30 dark:bg-emerald-950/20 border border-pastel-mintBorder/60 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Current / Modified Evolution
                </span>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-4 leading-relaxed">
                  {(evolutionData.modified_points || []).map((pt: any, i: number) => (
                    <li key={i}>
                      <span>{pt.description}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">Source: {pt.source_file}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-400">
              No architectural shift documents found for this project yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Decisions & Historical Milestones */}
      {activeTab === 'decisions' && (
        <div className="glass-card rounded-3xl p-6 shadow-soft space-y-4">
          <h3 className="font-serif font-bold text-xl text-charcoal dark:text-white">
            Documented Technical Decisions
          </h3>
          {decisionsData.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No explicit decisions detected in indexed documents for this project.
            </div>
          ) : (
            <div className="divide-y divide-alabaster dark:divide-white/10">
              {decisionsData.map((d: any, i: number) => (
                <div key={i} className="py-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-charcoal dark:text-white">
                      Decision: {d.decision || d.decision_description}
                    </span>
                    <span className="text-slate-400">{d.decision_date || 'Documented'}</span>
                  </div>
                  {d.rationale && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">{d.rationale}</p>
                  )}
                  <p className="text-[11px] text-slate-400 italic">Source: {d.source_file || d.filename}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
