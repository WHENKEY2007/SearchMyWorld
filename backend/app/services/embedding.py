import logging
import numpy as np
from typing import List, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self, model_name: str = settings.EMBEDDING_MODEL_NAME):
        self.model_name = model_name
        self._model = None
        self._is_available = None

    def _get_model(self):
        if self._model is None and self._is_available is not False:
            try:
                import torch
                from sentence_transformers import SentenceTransformer
                device = "cuda" if torch.cuda.is_available() else "cpu"
                logger.info(f"Loading local embedding model: {self.model_name} on {device.upper()}")
                self._model = SentenceTransformer(self.model_name, device=device)
                self._is_available = True
            except Exception as e:
                logger.warning(f"Could not load SentenceTransformer ({str(e)}). Using fallback pseudo-embeddings.")
                self._is_available = False
        return self._model

    def encode(self, texts: List[str], batch_size: int = 64) -> np.ndarray:
        """Generate dense vector embeddings for a list of text strings using GPU batching."""
        if not texts:
            return np.zeros((0, settings.EMBEDDING_DIM), dtype=np.float32)

        model = self._get_model()
        if model and self._is_available:
            embeddings = model.encode(
                texts,
                batch_size=batch_size,
                show_progress_bar=False,
                normalize_embeddings=True
            )
            return np.array(embeddings, dtype=np.float32)
        else:
            # Deterministic fallback embedding based on bag-of-characters/hash hashing
            return self._fallback_encode(texts)

    def encode_single(self, text: str) -> np.ndarray:
        return self.encode([text])[0]

    def _fallback_encode(self, texts: List[str]) -> np.ndarray:
        dim = settings.EMBEDDING_DIM
        result = np.zeros((len(texts), dim), dtype=np.float32)
        for i, text in enumerate(texts):
            words = text.lower().split()
            vec = np.zeros(dim, dtype=np.float32)
            for word in words:
                h = hash(word) % dim
                vec[h] += 1.0
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec /= norm
            result[i] = vec
        return result

    @staticmethod
    def cosine_similarity(query_vec: np.ndarray, doc_vecs: np.ndarray) -> np.ndarray:
        """Computes cosine similarity between query vector (1D) and document vectors (2D)."""
        if len(doc_vecs) == 0:
            return np.array([])
        # Ensure query vector is normalized
        q_norm = np.linalg.norm(query_vec)
        if q_norm > 0:
            query_vec = query_vec / q_norm

        dot_products = np.dot(doc_vecs, query_vec)
        # Assuming doc_vecs are already normalized
        return np.clip(dot_products, -1.0, 1.0)

embedding_service = EmbeddingService()
