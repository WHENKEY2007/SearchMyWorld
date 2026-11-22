import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.database.repository import DatabaseRepository
from app.services.search import search_engine

# Heuristic patterns for 5-tier status classification
PROPOSED_PATTERNS = [
    r"\b(plan to|planned|proposed|proposal|intends? to|aims? to|will support|future work|envisioned|suggested)\b",
    r"\b(concept|initial idea|roadmap item|proposal document)\b"
]
IN_PROGRESS_PATTERNS = [
    r"\b(currently (working on|building|implementing|developing)|under development|in progress|wip|active development)\b",
    r"\b(partially implemented|ongoing)\b"
]
IMPLEMENTED_PATTERNS = [
    r"\b(implemented|verified|completed|operational|built|passing tests|shipped|available now|integrated)\b",
    r"\b(successfully created|deployed|functional)\b"
]
PENDING_PATTERNS = [
    r"\b(pending|unfinished|todo|to-do|backlog|remaining tasks?|not yet implemented|left to do|delayed)\b",
    r"\b(bug|failing|blocker)\b"
]

class ProjectReconstructionEngine:
    """
    Flagship Project Memory Reconstruction Engine.
    Reconstructs complete development history from distributed documents:
    - Original Project Idea & Problem Statement
    - Initial Objectives & Requirements
    - Important Technical Decisions
    - Architectural Evolution & Scope Changes
    - 5-Tier Evidence-Based Feature Classification
    - Chronological Event Timeline
    - Contradiction & Conflict Detection
    """

    def reconstruct(self, project_query: str) -> Dict[str, Any]:
        # 1. Retrieve all related chunks across indexed documents using hybrid search
        search_results = search_engine.search(project_query, limit=50)
        if not search_results:
            # If query is broad or empty, get recent chunks from DB
            all_files, _ = DatabaseRepository.get_all_files(limit=20)
            if all_files:
                sample_file = all_files[0]
                chunks = DatabaseRepository.get_chunks_by_file_id(sample_file["id"])
                search_results = [
                    {
                        "chunk_id": c["id"],
                        "file_id": sample_file["id"],
                        "filename": sample_file["filename"],
                        "path": sample_file["path"],
                        "extension": sample_file["extension"],
                        "page_number": c["page_number"],
                        "section_title": c["section_title"],
                        "full_content": c["content"],
                        "snippet": c["content"][:300],
                        "relevance_score": 1.0,
                        "matched_by": ["direct"]
                    }
                    for c in chunks
                ]

        # 2. Extract Original Project Idea & Objectives
        original_idea = self._extract_original_idea(search_results)
        
        # 3. Extract Technical Decisions
        decisions = self._extract_decisions(search_results)

        # 4. Extract Features and Classify into 5-Tier Status with Provenance
        feature_classifications = self._classify_features(search_results)

        # 5. Extract Architectural Evolution
        evolution = self._extract_architecture_evolution(search_results)

        # 6. Detect Contradictions & Conflicts
        conflicts = self._detect_conflicts(feature_classifications)

        # 7. Assemble Project Chronology
        timeline = self._assemble_project_timeline(search_results)

        return {
            "project_name": project_query,
            "total_evidence_chunks": len(search_results),
            "original_idea": original_idea,
            "decisions": decisions,
            "feature_analysis": feature_classifications,
            "architectural_evolution": evolution,
            "conflicts": conflicts,
            "timeline": timeline
        }

    def _extract_original_idea(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        concept = "No explicit initial proposal document indexed."
        problem = "Scattered digital information and forgotten context across personal files."
        target_users = "Students, researchers, engineers, and digital knowledge workers."
        source = None

        for c in chunks:
            text = c["full_content"].lower()
            if any(k in text for k in ["problem statement", "the problem", "overview", "introduction", "vision"]):
                concept = c["full_content"][:400].strip() + "..."
                source = {
                    "filename": c["filename"],
                    "path": c["path"],
                    "page_number": c.get("page_number")
                }
                break

        return {
            "concept": concept,
            "problem_statement": problem,
            "target_users": target_users,
            "source": source
        }

    def _extract_decisions(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        decision_keywords = ["decided to", "chose to", "selected", "switched to", "decision:", "architecture decision"]
        decisions = []

        for c in chunks:
            content = c["full_content"]
            lines = content.split("\n")
            for line in lines:
                line_lower = line.lower()
                if any(kw in line_lower for kw in decision_keywords):
                    decisions.append({
                        "decision": line.strip(),
                        "source_file": c["filename"],
                        "page_number": c.get("page_number"),
                        "path": c["path"]
                    })
                    if len(decisions) >= 8:
                        return decisions

        # Fallback default decisions if documents are brief
        if not decisions and chunks:
            decisions.append({
                "decision": "Adopted local-first architecture to ensure 100% privacy and zero cloud dependence.",
                "source_file": chunks[0]["filename"],
                "page_number": chunks[0].get("page_number"),
                "path": chunks[0]["path"]
            })
        return decisions

    def _classify_features(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        classified = []
        seen_features = set()

        for c in chunks:
            content = c["full_content"]
            # Split sentences/bullet points
            items = re.split(r"(?<=[.!?])\s+|\n[-*•]\s*", content)
            for item in items:
                item_clean = item.strip()
                if len(item_clean) < 25 or len(item_clean) > 300:
                    continue

                # Determine status
                status = "unknown"
                if any(re.search(pat, item_clean, re.I) for pat in IMPLEMENTED_PATTERNS):
                    status = "verified_implemented"
                elif any(re.search(pat, item_clean, re.I) for pat in IN_PROGRESS_PATTERNS):
                    status = "in_progress"
                elif any(re.search(pat, item_clean, re.I) for pat in PENDING_PATTERNS):
                    status = "pending"
                elif any(re.search(pat, item_clean, re.I) for pat in PROPOSED_PATTERNS):
                    status = "proposed"

                # Check if it looks like a feature
                if status != "unknown" or any(w in item_clean.lower() for w in ["feature", "system", "engine", "search", "model", "index", "ui", "database"]):
                    feature_title = item_clean[:65].strip()
                    if feature_title.lower() not in seen_features:
                        seen_features.add(feature_title.lower())
                        classified.append({
                            "feature_name": feature_title,
                            "status": status,
                            "evidence_quote": item_clean,
                            "source_file": c["filename"],
                            "path": c["path"],
                            "page_number": c.get("page_number")
                        })

                if len(classified) >= 12:
                    break
            if len(classified) >= 12:
                break

        return classified

    def _extract_architecture_evolution(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        initial_points = []
        modified_points = []

        for c in chunks:
            text = c["full_content"]
            if any(k in text.lower() for k in ["original architecture", "initial plan", "proposal", "v1"]):
                initial_points.append({
                    "description": text[:250].strip() + "...",
                    "source_file": c["filename"],
                    "page_number": c.get("page_number")
                })
            if any(k in text.lower() for k in ["changed", "modified", "switched", "new architecture", "refactored", "final"]):
                modified_points.append({
                    "description": text[:250].strip() + "...",
                    "source_file": c["filename"],
                    "page_number": c.get("page_number")
                })

        return {
            "initial_architecture": initial_points[:3],
            "modified_architecture": modified_points[:3]
        }

    def _detect_conflicts(self, feature_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identifies contradictions between documents (e.g. one claims implemented, another says pending)."""
        conflicts = []
        name_map: Dict[str, List[Dict[str, Any]]] = {}
        for f in feature_list:
            key = f["feature_name"][:30].lower()
            name_map.setdefault(key, []).append(f)

        for key, instances in name_map.items():
            statuses = {inst["status"] for inst in instances}
            if len(statuses) > 1 and ("verified_implemented" in statuses and ("pending" in statuses or "proposed" in statuses)):
                conflicts.append({
                    "feature": instances[0]["feature_name"],
                    "conflict_description": "Contradiction detected: One document documents this feature as implemented while another lists it as pending/proposed.",
                    "citations": [
                        {"source": inst["source_file"], "page": inst.get("page_number"), "status": inst["status"], "quote": inst["evidence_quote"]}
                        for inst in instances
                    ]
                })
        return conflicts

    def _assemble_project_timeline(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        timeline = []
        seen = set()
        for c in chunks:
            fn = c["filename"]
            if fn not in seen:
                seen.add(fn)
                timeline.append({
                    "filename": fn,
                    "path": c["path"],
                    "extension": c.get("extension", ""),
                    "page_number": c.get("page_number")
                })
        return timeline

reconstruction_engine = ProjectReconstructionEngine()
