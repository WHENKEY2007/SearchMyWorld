from typing import Dict, Any, List
from app.database.repository import DatabaseRepository

class DocumentComparisonEngine:
    """
    Module 7: Document Understanding & Comparison Engine.
    Compares two versions or related documents (e.g. proposal vs. final report)
    and highlights scope changes, added requirements, removed features, and unchanged objectives.
    """

    def compare_documents(self, file_id_a: str, file_id_b: str) -> Dict[str, Any]:
        file_a = DatabaseRepository.get_file_by_id(file_id_a)
        file_b = DatabaseRepository.get_file_by_id(file_id_b)

        if not file_a or not file_b:
            raise ValueError("One or both files not found in local memory")

        chunks_a = DatabaseRepository.get_chunks_by_file_id(file_id_a)
        chunks_b = DatabaseRepository.get_chunks_by_file_id(file_id_b)

        sentences_a = set()
        for c in chunks_a:
            for s in c["content"].split("."):
                cleaned = s.strip()
                if len(cleaned) > 20:
                    sentences_a.add(cleaned)

        sentences_b = set()
        for c in chunks_b:
            for s in c["content"].split("."):
                cleaned = s.strip()
                if len(cleaned) > 20:
                    sentences_b.add(cleaned)

        # Simple semantic overlap
        unchanged = []
        only_in_a = []
        only_in_b = []

        for sa in sentences_a:
            matched = False
            for sb in sentences_b:
                # Basic token overlap
                words_a = set(sa.lower().split())
                words_b = set(sb.lower().split())
                if words_a and words_b:
                    jaccard = len(words_a & words_b) / len(words_a | words_b)
                    if jaccard > 0.6:
                        unchanged.append({"point": sa, "citation_a": file_a["filename"], "citation_b": file_b["filename"]})
                        matched = True
                        break
            if not matched:
                only_in_a.append({"point": sa, "source": file_a["filename"]})

        for sb in sentences_b:
            matched = False
            for sa in sentences_a:
                words_a = set(sa.lower().split())
                words_b = set(sb.lower().split())
                if words_a and words_b:
                    jaccard = len(words_a & words_b) / len(words_a | words_b)
                    if jaccard > 0.6:
                        matched = True
                        break
            if not matched:
                only_in_b.append({"point": sb, "source": file_b["filename"]})

        return {
            "document_a": {
                "id": file_a["id"],
                "filename": file_a["filename"],
                "modified_at": file_a["modified_at"],
                "chunks_count": len(chunks_a)
            },
            "document_b": {
                "id": file_b["id"],
                "filename": file_b["filename"],
                "modified_at": file_b["modified_at"],
                "chunks_count": len(chunks_b)
            },
            "summary": {
                "unchanged_points_count": len(unchanged),
                "removed_or_only_in_a_count": len(only_in_a),
                "newly_introduced_in_b_count": len(only_in_b)
            },
            "unchanged_points": unchanged[:8],
            "removed_from_b": only_in_a[:8],
            "newly_introduced_in_b": only_in_b[:8]
        }

document_comparison_engine = DocumentComparisonEngine()
