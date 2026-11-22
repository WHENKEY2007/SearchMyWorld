<div align="center">

# 🌐 SearchMyWorld

**"You don't need to remember where you saved it. Your AI remembers."**

*A Privacy-First, Local-First Personal Digital Memory & Hybrid Information Retrieval System for Windows.*

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PyTorch CUDA](https://img.shields.io/badge/PyTorch-CUDA_Accelerated-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
[![SQLite](https://img.shields.io/badge/SQLite-FTS5_BM25-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)
[![Local-First](https://img.shields.io/badge/Privacy-100%25_Offline-success?style=for-the-badge)](https://github.com/WHENKEY2007/SearchMyWorld)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [The 9 Dedicated Workspaces](#-the-9-dedicated-workspaces)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [One-Click Launch (Recommended)](#one-click-launch-recommended)
  - [Manual Developer Setup](#manual-developer-setup)
- [Engineering Highlights](#-engineering-highlights)
- [Privacy & Security Guarantees](#-privacy--security-guarantees)
- [License](#-license)

---

## 🌟 Overview

Developers, researchers, and students routinely generate thousands of scattered digital artifacts: lecture slides, code screenshots, error logs, project proposals, architectural diagrams, and documentation across `Downloads`, `Desktop`, and local drives. 

Traditional desktop search is fundamentally broken—it relies on exact filename matches or brittle keyword lookups. If you saved an architecture design as `diagram_final_v2.png`, standard search can never help you find *"the document discussing database sharding"*.

**SearchMyWorld** bridges this gap:
- **Understands Content, Not Just Names:** Reads inside PDFs, Word documents, PowerPoint presentations, Markdown, and text files.
- **Reads Images via Local OCR:** Transcribes and indexes text within screenshots, whiteboard sketches, terminal errors, and infographics.
- **Hybrid Retrieval (RRF $k=60$):** Combines probabilistic lexical search (SQLite FTS5 BM25) with dense semantic vector embeddings (`all-MiniLM-L6-v2`) in CUDA VRAM.
- **Flagship Project Reconstruction:** Automatically assembles scattered notes into an evidence-backed chronological project development history with multi-tier status auditing.
- **100% Offline & Private:** Zero cloud dependencies, zero telemetry, and zero document uploads.

---

## ✨ Key Features

- **🚀 Hybrid Semantic & Lexical Retrieval:** State-of-the-art Reciprocal Rank Fusion ($k=60$) guarantees that exact keywords (e.g. error codes, variable names) and conceptual queries (e.g. *"how does authentication work?"*) rank at the very top.
- **⚡ Hardware-Accelerated Vector Embeddings:** Uses PyTorch with native CUDA execution on NVIDIA RTX GPUs, with automatic seamless fallback to CPU when dedicated GPUs are unavailable.
- **🔍 100% Local Optical Character Recognition (OCR):** Powered by RapidOCR and ONNX Runtime, converting images and screenshots into searchable text locally.
- **📑 Provenance & Page Accuracy:** Every snippet citations tracks source file paths, exact page numbers, slide indices, and similarity confidence scores.
- **📂 Native Windows Desktop Integration:** Click directly on any retrieved file to launch it in its default desktop application (Word, Adobe Acrobat, Edge, Chrome, Photos).
- **⏱️ Dual-Axis Chronological Timeline:** Distinguishes between filesystem modified timestamps and dates mentioned inside document text.
- **🎨 Warm Editorial Porcelain UI:** Designed with classic editorial typography (**Instrument Serif**, **Plus Jakarta Sans**, **JetBrains Mono**), floating cards, and full Light/Dark mode support.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    User Desktop & Browser Interface                     │
│  - React 18 + TypeScript + Tailwind CSS                                 │
│  - Mindly Warm Editorial Porcelain Aesthetic (Light & Dark Mode)        │
│  - Single-Page Application (SPA) routing with instant offline load      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ REST API (127.0.0.1:8000)
┌────────────────────────────────────▼────────────────────────────────────┐
│                  FastAPI High-Throughput Backend                        │
│                                                                         │
│  ┌──────────────────────────────┐    ┌───────────────────────────────┐  │
│  │     Document Extractors      │    │     Local AI & Embeddings     │  │
│  │ - PyMuPDF (PDF streams)      │    │ - sentence-transformers       │  │
│  │ - python-docx (Word)         │    │ - all-MiniLM-L6-v2 (384-dim)  │  │
│  │ - python-pptx (Slides)       │    │ - PyTorch CUDA Acceleration   │  │
│  │ - RapidOCR (Image Text)      │    │ - RapidOCR ONNX Engine        │  │
│  │ - TXT / Markdown Chunker     │    │ - Reciprocal Rank Fusion      │  │
│  └──────────────────────────────┘    └───────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │             Project Memory Reconstruction Engine                  │  │
│  │ - 5-Tier Verifiable Evidence Status Classification                │  │
│  │ - Multi-Document Contradiction & Evolution Analysis               │  │
│  │ - Grounded Conversational Memory Assistant                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Local Disk I/O & WAL Mode
┌────────────────────────────────────▼────────────────────────────────────┐
│                 Local Storage & SQLite Database Engine                  │
│  - Path: ~/.searchmyworld/searchmyworld.db                              │
│  - SQLite FTS5 BM25 Full-Text Virtual Table (Porter Stemming)           │
│  - Binary float32 BLOB Vector Storage (Cosine Similarity Index)         │
│  - SHA-256 Incremental File Hashes (Zero redundant indexing)           │
│  - 100% Offline • Zero Cloud Telemetry • Non-Destructive Storage        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🧭 The 9 Dedicated Workspaces

| Workspace | Route | Description |
| :--- | :--- | :--- |
| **Dashboard** | `/` | Real-time control center tracking total indexed files, chunk counts, OCR records, active monitored folders, and storage health. |
| **Smart Search** | `/search` | Natural language hybrid search combining BM25 keyword matching with dense semantic embeddings. Filter by `.pdf`, `.docx`, `.pptx`, or `.txt`. |
| **Visual Memory** | `/visual` | Optical Character Recognition gallery allowing you to search text embedded inside screenshots, terminal outputs, diagrams, and photos. |
| **My Files** | `/files` | Document manager displaying indexed metadata, file sizes, modification dates, and an interactive **Memory Chunks Inspector drawer**. |
| **My Timeline** | `/timeline` | Chronological activity feed grouping files by month/year, cleanly separating filesystem timestamps from document internal dates. |
| **Projects** | `/projects` | Dedicated workspaces to group documents, manage project file associations, and track decisions. |
| **Project Reconstruction** | `/reconstruction` | **Flagship Engine:** Audits projects across 5 status tiers (*Proposed*, *In Progress*, *Verified Implemented*, *Pending*, *Unknown*) with cited evidence quotes. |
| **AI Assistant** | `/assistant` | Grounded conversational assistant answering queries using only indexed files, citing source documents and page numbers. |
| **Settings** | `/settings` | Manage monitored directories via the **Native Windows Folder Browser Dialog**, trigger manual re-indexing, or clear the search database. |

---

## 🛠️ Technology Stack

### Backend & Machine Learning
* **Language:** Python 3.11+
* **Web Framework:** [FastAPI](https://fastapi.tiangolo.com) + [Uvicorn](https://www.uvicorn.org) (ASGI high-concurrency server)
* **Embedding Model:** [`sentence-transformers`](https://www.sbert.net) (`all-MiniLM-L6-v2`, 384-dimensional dense vectors)
* **Hardware Acceleration:** [PyTorch](https://pytorch.org) with NVIDIA CUDA 12.1+ support and automatic CPU fallback
* **OCR Engine:** [`RapidOCR`](https://github.com/RapidAI/RapidOCR) with ONNX Runtime (100% offline text extraction)
* **Parsers:** `PyMuPDF` (`fitz`), `python-docx`, `python-pptx`, `Pillow` (PIL)
* **Validation & Schemas:** Pydantic v2

### Database & Information Retrieval
* **Database Engine:** SQLite 3 in WAL (Write-Ahead Logging) mode
* **Full-Text Search:** SQLite FTS5 with Porter Stemming and BM25 scoring
* **Vector Search:** Direct binary float32 cosine similarity indexing
* **Ranking Algorithm:** Reciprocal Rank Fusion (RRF, $k=60$)
* **Change Detection:** Cryptographic SHA-256 file hashing for instantaneous incremental updates

### Frontend & User Interface
* **Framework:** React 18 with TypeScript
* **Build Tool:** Vite 5 (instant Hot Module Replacement, optimized static bundling)
* **Styling:** Tailwind CSS with custom editorial design tokens
* **Icons:** Lucide React
* **Client-Side Routing:** React Router v6 with backend SPA fallback handler

---

## 🚀 Getting Started

### Prerequisites
* **Operating System:** Windows 10 or 11 (64-bit)
* **Python:** Python 3.10 or 3.11 installed and added to system `PATH`
* *(Optional)* **GPU:** NVIDIA discrete graphics card (RTX / GTX) for CUDA acceleration. A dedicated GPU is **not** required; the system runs seamlessly on CPU.

---

### One-Click Launch (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/WHENKEY2007/SearchMyWorld.git
   cd SearchMyWorld
   ```

2. **Run the launcher:**
   Double-click:
   ```cmd
   start.bat
   ```
   *or run in PowerShell:*
   ```powershell
   .\start.ps1
   ```

> **Note on First Run:**  
> The script will automatically detect that you are running for the first time, create a virtual environment (`.venv`), install all required dependencies from `requirements.txt`, launch the backend, and open your browser at **`http://127.0.0.1:8000`**. You do **not** need Node.js or npm installed.

---

### Manual Developer Setup

If you wish to modify the frontend code or run development servers:

#### 1. Backend Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```
*API and Swagger documentation will be live at `http://127.0.0.1:8000/docs`.*

#### 2. Frontend Setup (Requires Node.js 18+)
```powershell
cd frontend
npm install
npm run dev
```
*Vite dev server will be live at `http://localhost:5173`.*

#### 3. Run Automated Tests
```powershell
cd backend
.\.venv\Scripts\activate
pytest -v
```

---

## ⚡ Engineering Highlights

### 1. Reciprocal Rank Fusion (RRF)
SearchMyWorld avoids arbitrary weight tuning between vector cosine distances and BM25 scores by implementing Reciprocal Rank Fusion:
$$\text{RRF Score}(d) = \sum_{m \in \{\text{BM25}, \text{Dense}\}} \frac{1}{k + r_m(d)}$$
where $k=60$ and $r_m(d)$ represents the ordinal rank of document $d$ within retrieval system $m$. This guarantees that exact keyword hits (such as function signatures or variable names) are not overshadowed by broad semantic similarity.

### 2. Incremental Indexing Engine
Scanning thousands of files does not mean re-reading them. SearchMyWorld computes a SHA-256 hash of each document during indexing. On subsequent runs:
- Files with identical hashes are skipped in sub-millisecond time.
- Modified files are updated automatically.
- Deleted files have their corresponding chunks and vector entries removed cleanly from the SQLite FTS5 index.

---

## 🛡️ Privacy & Security Guarantees

* **Zero Cloud Telemetry:** No user documents, text snippets, queries, or image frames are ever transmitted over the internet.
* **Non-Destructive Storage:** SearchMyWorld treats your filesystem as read-only. It never modifies, moves, renames, or deletes your original files.
* **Database Isolation:** All search indexes and embeddings are stored locally in `~/.searchmyworld/` in your user directory, completely segregated from the application code.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ for privacy-minded developers, researchers, and learners.</sub>
</div>
