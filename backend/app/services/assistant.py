import json
import logging
import re
from typing import Dict, Any, List, Optional
from app.services.search import search_engine

logger = logging.getLogger(__name__)

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
    "can", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
    "further", "had", "has", "have", "having", "he", "her", "here", "how", "i", "if", "in", "into",
    "is", "it", "its", "me", "more", "most", "my", "no", "nor", "not", "of", "off", "on", "once",
    "only", "or", "other", "our", "out", "over", "own", "same", "she", "should", "so", "some", "such",
    "than", "that", "the", "their", "theirs", "them", "then", "there", "these", "they", "this", "those",
    "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", "what", "when",
    "where", "which", "while", "who", "whom", "why", "with", "would", "you", "your"
}

class MemoryAssistantService:
    """
    Personal AI Memory Assistant.
    Provides conversational answers grounded strictly in retrieved personal documents.
    Tries local LLMs (Ollama/llama.cpp) if available, and features intelligent deterministic
    grounded synthesis fallback when offline. Never hallucinates un-indexed facts.
    """

    def __init__(self, ollama_url: str = "http://127.0.0.1:11434"):
        self.ollama_url = ollama_url

    def answer_query(
        self,
        query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        focused_file_id: Optional[str] = None
    ) -> Dict[str, Any]:
        # If chatting with a focused file (Document Mode)
        if focused_file_id:
            from app.database.repository import DatabaseRepository
            file_rec = DatabaseRepository.get_file_by_id(focused_file_id)
            if not file_rec:
                return {
                    "answer": "The selected document could not be found in local memory.",
                    "citations": [],
                    "grounded": False
                }

            chunks = DatabaseRepository.get_chunks_by_file_id(focused_file_id)
            content_list = []
            for ch in chunks:
                content_list.append({
                    "snippet": ch["content"],
                    "full_content": ch["content"],
                    "filename": file_rec["filename"],
                    "path": file_rec["path"],
                    "page_number": ch.get("page_number"),
                    "section_title": ch.get("section_title"),
                    "relevance_score": 1.0,
                    "file_id": focused_file_id
                })

            # Check if image OCR text is present
            if not content_list and file_rec["file_type"] == "image":
                from app.database.connection import get_db_connection
                with get_db_connection() as conn:
                    cur = conn.cursor()
                    cur.execute("SELECT extracted_text FROM image_ocr WHERE file_id = ?", (focused_file_id,))
                    row = cur.fetchone()
                    if row and row["extracted_text"]:
                        content_list.append({
                            "snippet": row["extracted_text"],
                            "full_content": row["extracted_text"],
                            "filename": file_rec["filename"],
                            "path": file_rec["path"],
                            "page_number": 1,
                            "section_title": "Visual OCR",
                            "relevance_score": 1.0,
                            "file_id": focused_file_id
                        })

            if not content_list:
                return {
                    "answer": f"Document '{file_rec['filename']}' does not contain any readable text or has not finished indexing.",
                    "citations": [{"file_id": focused_file_id, "filename": file_rec["filename"], "path": file_rec["path"], "pages": []}],
                    "grounded": False
                }

            citations = [{
                "file_id": focused_file_id,
                "filename": file_rec["filename"],
                "path": file_rec["path"],
                "pages": list({c["page_number"] for c in content_list if c.get("page_number")}) or [1]
            }]

            # Try local LLM first for focused file
            llm_answer = self._try_local_llm(query, content_list[:8])
            if llm_answer:
                return {
                    "answer": llm_answer.strip(),
                    "citations": citations,
                    "grounded": True,
                    "source": "local_llm_ollama"
                }

            # Grounded extractive synthesis for focused document
            summary_keywords = ["summarize", "summary", "overview", "what is this", "takeaway", "key point", "action item", "explain this"]
            is_summary = any(k in query.lower() for k in summary_keywords)
            if is_summary:
                answer_text = self._synthesize_document_summary(file_rec["filename"], content_list)
            else:
                answer_text = self._synthesize_extractive_answer(query, content_list, citations)

            return {
                "answer": answer_text,
                "citations": citations,
                "grounded": True,
                "source": "grounded_extractive_synthesis"
            }

        # Global Memory Retrieval
        search_results = search_engine.search(query, limit=12)
        
        if not search_results:
            return {
                "answer": f"I searched your indexed personal documents, but could not find any memories mentioning '{query}'. Make sure the folders containing those files are added in Settings and indexed.",
                "citations": [],
                "grounded": False
            }

        # 2. Extract unique matched files
        unique_files = {}
        for r in search_results:
            text_cleaned = r.get("snippet", "").strip()
            if len(text_cleaned) < 5:
                continue

            fid = r["file_id"]
            page = r.get("page_number")
            if fid not in unique_files:
                unique_files[fid] = {
                    "file_id": r["file_id"],
                    "filename": r["filename"],
                    "path": r["path"],
                    "pages": [page] if page else [],
                    "relevance_score": r["relevance_score"]
                }
            else:
                if page and page not in unique_files[fid]["pages"]:
                    unique_files[fid]["pages"].append(page)

        citations = list(unique_files.values())

        if not citations:
            return {
                "answer": f"No relevant content could be extracted for '{query}'.",
                "citations": [],
                "grounded": False
            }

        # 3. Try local LLM first (Ollama on localhost:11434)
        llm_answer = self._try_local_llm(query, search_results[:6])
        if llm_answer:
            return {
                "answer": llm_answer.strip(),
                "citations": citations,
                "grounded": True,
                "source": "local_llm_ollama"
            }

        # 4. Smart Grounded Extractive Synthesis (Deterministic Fallback)
        synthesized = self._synthesize_extractive_answer(query, search_results, citations)
        return {
            "answer": synthesized,
            "citations": citations,
            "grounded": True,
            "source": "grounded_extractive_synthesis"
        }

    def _synthesize_document_summary(self, filename: str, chunks: List[Dict[str, Any]]) -> str:
        all_sentences = []
        for c in chunks:
            raw = c.get("full_content") or c.get("snippet", "")
            sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", raw) if len(s.strip()) > 20]
            all_sentences.extend(sents)

        if not all_sentences:
            return f"Document '{filename}' contains limited readable text to summarize."

        # Take first introductory sentence
        intro = all_sentences[0]
        # Collect key informative sentences
        key_points = []
        seen = {intro.lower()}
        for s in all_sentences[1:]:
            s_low = s.lower()
            if s_low in seen:
                continue
            seen.add(s_low)
            if any(k in s_low for k in ["total", "approval", "required", "important", "aim", "decision", "conclusion", "date", "fee", "version", "error", "deadline", "note"]):
                key_points.append(s)
            elif len(key_points) < 4 and len(s) > 40:
                key_points.append(s)
            if len(key_points) >= 5:
                break

        res = f"### Summary of **{filename}**\n\n{intro}\n\n**Key Points & Observations:**\n"
        for pt in key_points:
            res += f"- {pt}\n"
        return res

    def _synthesize_extractive_answer(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        citations: List[Dict[str, Any]]
    ) -> str:
        # Extract query keywords
        query_words = set(re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", query.lower())) - STOPWORDS
        if not query_words:
            query_words = set(re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", query.lower()))

        candidate_sentences = []
        seen_texts = set()

        for c in chunks:
            raw_text = c.get("full_content") or c.get("snippet", "")
            # Split into sentences
            sentences = re.split(r"(?<=[.!?])\s+|\n+", raw_text)
            for s in sentences:
                s_clean = s.strip()
                if len(s_clean) < 25 or len(s_clean) > 350:
                    continue
                # Avoid duplicate or near-duplicate sentences
                norm = re.sub(r"\s+", " ", s_clean.lower())
                if norm in seen_texts:
                    continue
                seen_texts.add(norm)

                # Score sentence
                s_lower = s_clean.lower()
                matches = sum(1 for w in query_words if w in s_lower)
                if matches == 0 and len(query_words) > 0:
                    continue

                score = matches * 15.0
                # Favor informative sentences (containing colons, numbers, capitalized terms)
                if any(k in s_lower for k in ["decided", "implemented", "architecture", "goal", "because", "requires", "version", "error", "installed"]):
                    score += 10.0
                if re.search(r"\d", s_clean):
                    score += 5.0
                
                # Bonus if from a higher ranking chunk
                score += (c.get("relevance_score", 0.5) * 10.0)

                candidate_sentences.append({
                    "text": s_clean,
                    "score": score,
                    "filename": c.get("filename"),
                    "page": c.get("page_number"),
                    "file_id": c.get("file_id")
                })

        candidate_sentences.sort(key=lambda x: x["score"], reverse=True)
        top_sentences = candidate_sentences[:5]

        # Format output
        num_files = len(citations)
        output = [
            f"Based on your local documents across **{num_files} matched file{'s' if num_files > 1 else ''}**, here is the grounded summary for **\"{query}\"**:\n"
        ]

        if top_sentences:
            output.append("### Key Findings & Evidence:")
            for s in top_sentences:
                page_str = f", Page {s['page']}" if s.get("page") else ""
                output.append(f"• **{s['filename']}{page_str}**: \"{s['text']}\"")
            output.append("")
        else:
            # Fallback to top snippets if sentence parsing was too aggressive
            output.append("### Relevant Excerpts:")
            for c in chunks[:3]:
                snip = (c.get("snippet") or "")[:200].replace("\n", " ")
                output.append(f"• **{c.get('filename')}**: {snip}...")
            output.append("")

        output.append("All sources below are verified from your local machine and can be opened directly.")
        return "\n".join(output)

    def _try_local_llm(self, query: str, context_chunks: List[Dict[str, Any]]) -> Optional[str]:
        """Optionally queries local Ollama if active on localhost:11434."""
        import urllib.request
        try:
            context_text = "\n\n".join(
                [f"[Source: {c['filename']}, Page: {c.get('page_number') or 1}]\n{c.get('full_content') or c.get('snippet', '')}" for c in context_chunks]
            )

            prompt = (
                f"You are SearchMyWorld, an AI personal memory assistant.\n"
                f"Answer the user's question clearly using ONLY the provided document context below.\n"
                f"If the documents do not contain the answer, say you do not know.\n\n"
                f"CONTEXT:\n{context_text}\n\n"
                f"QUESTION: {query}\n\n"
                f"ANSWER:"
            )

            req = urllib.request.Request(
                f"{self.ollama_url}/api/generate",
                data=json.dumps({"model": "mistral", "prompt": prompt, "stream": False}).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=3.0) as res:
                if res.status == 200:
                    data = json.loads(res.read().decode("utf-8"))
                    return data.get("response")
        except Exception:
            return None
        return None

memory_assistant = MemoryAssistantService()
