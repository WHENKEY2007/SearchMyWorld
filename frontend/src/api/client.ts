// API Client for SearchMyWorld Backend
const API_BASE = '/api';

export interface SearchResultItem {
  chunk_id: string;
  file_id: string;
  filename: string;
  path: string;
  extension?: string;
  page_number?: number;
  section_title?: string;
  snippet: string;
  full_content: string;
  relevance_score: number;
  matched_by: string[];
}

export interface SearchResponse {
  query: string;
  total_results: number;
  results: SearchResultItem[];
}

export interface ImageOCRResult {
  id: string;
  file_id: string;
  filename: string;
  path: string;
  extracted_text: string;
  modified_at?: string;
  file_size: number;
}

export interface FileItem {
  id: string;
  folder_id?: string;
  filename: string;
  path: string;
  extension: string;
  file_type: string;
  file_hash: string;
  file_size: number;
  created_at?: string;
  modified_at?: string;
  indexed_at?: string;
  indexing_status: string;
}

export interface FolderItem {
  id: string;
  path: string;
  created_at?: string;
  indexing_enabled: boolean;
}

export interface StatsResponse {
  total_folders: number;
  total_files: number;
  indexed_files: number;
  total_chunks: number;
  total_images_ocr: number;
  type_distribution: Record<string, number>;
  extension_distribution: Record<string, number>;
}

export interface IndexingStatus {
  total_files_discovered: number;
  processed_files: number;
  indexed_files: number;
  skipped_files: number;
  failed_files: number;
  current_file?: string;
  status: string;
  recent_files?: Array<{
    filename: string;
    extension: string;
    status: string;
    time: string;
  }>;
}

export interface TimelineItem {
  file_id: string;
  filename: string;
  path: string;
  extension: string;
  file_type: string;
  file_size: number;
  event_date: string;
  modified_date?: string;
  created_date?: string;
  indexed_date?: string;
  inferred_date?: string | null;
  raw_date?: string;
  indexing_status: string;
}

export interface TimelinePeriod {
  period: string;
  items: TimelineItem[];
}

export interface ProjectItem {
  id: string;
  project_name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export const api = {
  // Search
  search: async (query: string, extension?: string, fileType?: string, limit: number = 20): Promise<SearchResponse> => {
    const res = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, extension, file_type: fileType, limit }),
    });
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  // OCR Visual Search
  searchOcr: async (q: string = ''): Promise<ImageOCRResult[]> => {
    const res = await fetch(`${API_BASE}/search/ocr?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error('OCR search failed');
    return res.json();
  },

  // Files
  getFiles: async (extension?: string, fileType?: string, limit: number = 50, offset: number = 0): Promise<{ files: FileItem[]; total: number }> => {
    const params = new URLSearchParams();
    if (extension) params.append('extension', extension);
    if (fileType) params.append('file_type', fileType);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const res = await fetch(`${API_BASE}/files?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch files');
    return res.json();
  },

  getFileDetails: async (fileId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/files/${fileId}`);
    if (!res.ok) throw new Error('Failed to get file details');
    return res.json();
  },

  openFile: async (fileId: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/files/${fileId}/open`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to open file' }));
      throw new Error(err.detail || 'Failed to open file');
    }
    return res.json();
  },

  // Folders
  getFolders: async (): Promise<FolderItem[]> => {
    const res = await fetch(`${API_BASE}/folders`);
    if (!res.ok) throw new Error('Failed to fetch folders');
    return res.json();
  },

  addFolder: async (path: string): Promise<FolderItem> => {
    const res = await fetch(`${API_BASE}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to add folder' }));
      throw new Error(err.detail || 'Failed to add folder');
    }
    return res.json();
  },

  deleteFolder: async (folderId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/folders/${folderId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete folder');
  },

  openFolderPicker: async (): Promise<{ cancelled: boolean; path: string | null }> => {
    const res = await fetch(`${API_BASE}/folders/picker`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to open folder picker');
    return res.json();
  },

  // Indexing
  startIndexing: async (): Promise<{ message: string; status: string }> => {
    const res = await fetch(`${API_BASE}/index/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start indexing');
    return res.json();
  },

  getIndexingStatus: async (): Promise<IndexingStatus> => {
    const res = await fetch(`${API_BASE}/index/status`);
    if (!res.ok) throw new Error('Failed to fetch indexing status');
    return res.json();
  },

  clearMemory: async (): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/index/clear`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to clear memory');
    return res.json();
  },

  // Timeline
  getTimeline: async (limit: number = 100, dateType: string = 'modified'): Promise<{ date_type: string; timeline: TimelinePeriod[]; total_items: number }> => {
    const res = await fetch(`${API_BASE}/timeline?limit=${limit}&date_type=${dateType}`);
    if (!res.ok) throw new Error('Failed to fetch timeline');
    return res.json();
  },

  // Stats
  getStats: async (): Promise<StatsResponse> => {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  // Projects
  getProjects: async (): Promise<ProjectItem[]> => {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  createProject: async (name: string, description?: string): Promise<ProjectItem> => {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  deleteProject: async (projectId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/projects/${projectId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete project');
  },

  getProjectFiles: async (projectId: string): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/projects/${projectId}/files`);
    if (!res.ok) throw new Error('Failed to fetch project files');
    return res.json();
  },

  getProjectTasks: async (projectId: string): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`);
    if (!res.ok) throw new Error('Failed to fetch project tasks');
    return res.json();
  },

  getProjectDecisions: async (projectId: string): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/projects/${projectId}/decisions`);
    if (!res.ok) throw new Error('Failed to fetch project decisions');
    return res.json();
  },

  // Reconstruction & Intelligence
  reconstructProject: async (projectQuery: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/reconstruction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_query: projectQuery }),
    });
    if (!res.ok) throw new Error('Failed to reconstruct project');
    return res.json();
  },

  compareDocuments: async (fileIdA: string, fileIdB: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/comparison`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id_a: fileIdA, file_id_b: fileIdB }),
    });
    if (!res.ok) throw new Error('Failed to compare documents');
    return res.json();
  },

  chatWithMemory: async (query: string, conversationHistory?: any[]): Promise<any> => {
    const res = await fetch(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, conversation_history: conversationHistory }),
    });
    if (!res.ok) throw new Error('Assistant chat failed');
    return res.json();
  },
};
