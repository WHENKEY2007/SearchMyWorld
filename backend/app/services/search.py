import logging
import numpy as np
from typing import List, Dict, Any, Optional
from app.database.repository import DatabaseRepository
from app.services.embedding import embedding_service

logger = logging.getLogger(__name__)

class HybridSearchEngine:
    def __init__(self, rrf_k: int = 60):
        self.rrf_k = rrf_k

    def search(
        self,
        query: str,
        limit: int = 20,
        extension_filter: Optional[str] = None,
        file_type_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes hybrid retrieval:
        1. Lexical search using SQLite FTS5 (BM25 ranking).
        2. Semantic dense vector cosine similarity search.
        3. Reciprocal Rank Fusion (RRF) to merge and rank results.
        """
        if not query.strip():
            return []

        # 1. Lexical Retrieval via SQLite FTS5
        lexical_raw = DatabaseRepository.search_fts(query, limit=limit * 2)
        
        # 2. Semantic Dense Retrieval
        embeddings_records = DatabaseRepository.get_all_embeddings()
        semantic_raw = []
        if embeddings_records:
            query_vec = embedding_service.encode_single(query)
            doc_vecs = np.array([r["vector"] for r in embeddings_records], dtype=np.float32)
            similarities = embedding_service.cosine_similarity(query_vec, doc_vecs)

            # Sort indices descending by similarity
            top_indices = np.argsort(similarities)[::-1][:limit * 2]
            for rank_idx, idx in enumerate(top_indices):
                score = float(similarities[idx])
                if score > 0.05: # Minimum threshold
                    rec = embeddings_records[idx]
                    semantic_raw.append({
                        "chunk_id": rec["chunk_id"],
                        "file_id": rec["file_id"],
                        "content": rec["content"],
                        "filename": rec["filename"],
                        "path": rec["path"],
                        "extension": rec["extension"],
                        "page_number": rec["page_number"],
                        "section_title": rec["section_title"],
                        "score": score
                    })

        # 3. Reciprocal Rank Fusion (RRF)
        rrf_scores: Dict[str, float] = {}
        chunk_metadata: Dict[str, Dict[str, Any]] = {}
        matched_by: Dict[str, List[str]] = {}

        # Process Lexical Rankings
        for rank, item in enumerate(lexical_raw):
            cid = item["chunk_id"]
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (self.rrf_k + rank + 1))
            chunk_metadata[cid] = item
            matched_by.setdefault(cid, []).append("lexical")

        # Process Semantic Rankings
        for rank, item in enumerate(semantic_raw):
            cid = item["chunk_id"]
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (self.rrf_k + rank + 1))
            if cid not in chunk_metadata:
                chunk_metadata[cid] = item
            matched_by.setdefault(cid, []).append("semantic")

        # Sort all chunks by fused RRF score
        sorted_chunk_ids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)

        results = []
        for cid in sorted_chunk_ids:
            meta = chunk_metadata[cid]

            # Filter out chunks with minimal alphanumeric content (e.g. OCR noise boxes)
            content_str = meta.get("content", "").strip()
            if sum(c.isalnum() for c in content_str) < 4:
                continue

            # Apply filters
            if extension_filter and meta.get("extension", "").lower() != extension_filter.lower():
                continue

            results.append({
                "chunk_id": cid,
                "file_id": meta["file_id"],
                "filename": meta["filename"],
                "path": meta["path"],
                "extension": meta.get("extension"),
                "page_number": meta.get("page_number"),
                "section_title": meta.get("section_title"),
                "snippet": meta["content"][:350] + ("..." if len(meta["content"]) > 350 else ""),
                "full_content": meta["content"],
                "relevance_score": round(rrf_scores[cid], 4),
                "matched_by": matched_by.get(cid, [])
            })

            if len(results) >= limit:
                break

        return results

search_engine = HybridSearchEngine()
