# SearchMyWorld

> **"You don't need to remember where you saved it. Your AI remembers."**  
> *Category: AI-Powered Personal Digital Memory and Intelligent Information Retrieval System*  
> *Primary Platform: Windows Desktop (Local-First AI)*

---

## 🌟 Overview

**SearchMyWorld** is an AI-powered personal digital memory system designed to turn your computer into an interconnected, searchable knowledge environment. It doesn't just find filenames — it remembers document contents, reads text inside error screenshots and diagrams via local OCR, traces technical decisions, and reconstructs the complete development history of your projects with verifiable evidence.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────┐
│              Windows Desktop Shell (WebView2)              │
│       - Native desktop window (1280 x 820 px)              │
│       - Native Windows Explorer folder picker dialog       │
│       - Auto-starts & terminates local background backend  │
└─────────────────────────────┬──────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────┐
│           Frontend (React 18 + TypeScript + Vite)          │
│       - Mindly Warm Editorial Porcelain Theme              │
│       - Instrument Serif + Plus Jakarta Sans + JetBrains   │
│       - 9 Dedicated Local Workspaces                       │
└─────────────────────────────┬──────────────────────────────┘
                              │ REST (127.0.0.1:8000)
┌─────────────────────────────▼──────────────────────────────┐
│            Backend Engine (Python 3.11 / FastAPI)          │
│  ┌─────────────────────────┐   ┌─────────────────────────┐ │
│  │ Document Extractors     │   │ Local AI & Search       │ │
│  │ - PyMuPDF (PDF)         │   │ - sentence-transformers │ │
│  │ - python-docx (DOCX)    │   │ - RapidOCR (Screenshots)│ │
│  │ - python-pptx (PPTX)    │   │ - SQLite FTS5 (BM25)    │ │
│  │ - TXT / Markdown        │   │ - Hybrid RRF Fusion     │ │
│  └─────────────────────────┘   └─────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Flagship Project Memory Reconstruction Engine       │   │
│  │ - 5-Tier Evidence-Based Status Classification       │   │
│  │ - Architectural Evolution & Conflict Detection      │   │
│  │ - Grounded Multi-Turn Conversational Memory         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────┬──────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────┐
│            Local SQLite Database (WAL Mode + FTS5)         │
│  - 100% Offline • Zero Cloud Telemetry • Non-Destructive   │
└────────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Run

### One-Click Desktop Launch (Recommended)
Simply double-click:
```cmd
start.bat
```
or run in PowerShell:
```powershell
.\start.ps1
```
This automatically spins up the local backend, loads the built frontend bundle, and opens the native Windows desktop window.

### Manual Development Launch
**Terminal 1 (Backend):**
```powershell
cd backend
.\.venv\Scripts\activate
python run.py
```
*(Backend active on `http://127.0.0.1:8000`, interactive API docs at `http://127.0.0.1:8000/docs`)*

**Terminal 2 (Frontend Dev Server):**
```powershell
cd frontend
npm run dev
```
*(Frontend active on `http://localhost:5173`)*

---

## 🧭 The 9 Workspaces

1. **Dashboard (`/`):** Central control panel with real-time statistics (chunks, indexed files, OCR records, monitored folders), quick-launch actions, and recently indexed documents.
2. **Smart Search (`/search`):** Natural language hybrid search combining SQLite FTS5 BM25 with local dense embeddings via Reciprocal Rank Fusion ($k=60$). Filter by format (PDF, DOCX, PPTX, TXT) and open original files with one click.
3. **Visual Memory (`/visual`):** Search screenshots, terminal errors, and code captures using local RapidOCR. Includes instant OCR text copying and image viewer launch.
4. **My Files (`/files`):** Status explorer for all indexed documents, sizes, modification dates, and a **Memory Chunks Inspector drawer** to examine raw chunks and page provenance.
5. **My Timeline (`/timeline`):** Chronological activity feed grouped by month/period, strictly separating filesystem timestamps from document content dates.
6. **Projects (`/projects`):** Project workspaces, file associations, and technical decision logs.
7. **Project Reconstruction (`/reconstruction` — *Flagship*):**
   * **5-Tier Evidence Classification:** *Proposed*, *In Progress*, *Verified Implemented*, *Pending*, *Unknown*.
   * Verifiable evidence quotations with source filename and page numbers.
   * Architectural evolution comparisons and contradiction detection across documents.
8. **AI Memory Assistant (`/assistant`):** Multi-turn conversational memory assistant grounded strictly in personal documents with verifiable citations.
9. **Settings (`/settings`):** Monitored folder management with the **Native Windows Folder Browser Dialog**, non-destructive search database clear/vacuum, and Light/Dark theme switching.

---

## 🛡️ Privacy & Security Guarantees
* **100% Local Processing:** Embeddings, OCR, and search run entirely on localhost without transmitting documents to the cloud.
* **Non-Destructive:** SearchMyWorld never moves, modifies, or deletes original files on disk. Removing an indexed record or clearing the search database only clears the local index.
* **Untrusted File Input:** File contents are treated strictly as data strings and are never executed as scripts.
