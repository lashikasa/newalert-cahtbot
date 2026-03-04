# main.py
import os
import logging
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI

# Load environment variables
load_dotenv()

# ----------------------------
# Embeddings: Local MiniLM
# ----------------------------
from sentence_transformers import SentenceTransformer

embed_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

def embed_texts(texts: list) -> np.ndarray:
    """Generate embeddings using local MiniLM model"""
    embeddings = embed_model.encode(texts, convert_to_numpy=True)
    return embeddings.astype("float32")

# ----------------------------
# Gemini Pro Generative Model
# ----------------------------
try:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
except Exception:
    genai = None
    logging.warning("Gemini client not available. Generative API calls will fail.")

# ----------------------------
# Utility Imports
# ----------------------------
from app.retrieval.newsapi import fetch_news
from app.vectorstore.faiss_store import FAISSStore
from app.utils import chunk_text

# ----------------------------
# FastAPI setup
# ----------------------------
app = FastAPI(title="NewsRAG Backend")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ----------------------------
# API Endpoint
# ----------------------------
@app.get("/query")
def query_news(q: str, top_k: int = 3, chunk_size: int = 200):
    # 1️⃣ Fetch articles
    articles = fetch_news(q)
    if isinstance(articles, dict) and "error" in articles:
        return {"query": q, "error": articles["error"]}

    # 2️⃣ Chunk articles
    all_chunks = []
    for article in articles:
        text = f"{article.get('title', '')} {article.get('description', '')}"
        chunks = chunk_text(text, chunk_size)
        all_chunks.extend(chunks)

    if not all_chunks:
        return {"query": q, "error": "No article chunks available"}

    # 3️⃣ Embed chunks locally
    try:
        chunk_embeddings = embed_texts(all_chunks)
    except Exception as e:
        return {"query": q, "error": f"Embedding failed: {e}"}

    # 4️⃣ Initialize FAISS
    dimension = chunk_embeddings.shape[1]
    store = FAISSStore(dimension)
    store.add(chunk_embeddings, all_chunks)

    # 5️⃣ Embed query locally
    try:
        query_embedding = embed_texts([q])
    except Exception as e:
        return {"query": q, "error": f"Embedding failed: {e}"}

    # 6️⃣ Retrieve top-K chunks
    retrieved_chunks = store.search(query_embedding, top_k=top_k)
    if not retrieved_chunks:
        return {"query": q, "error": "No relevant chunks found"}

    # 7️⃣ Generate answer using Gemini Pro
    answer = None
    if genai is not None:
        context = "\n\n".join(retrieved_chunks)
        prompt = f"""
Answer the question using only the context below.

Context:
{context}

Question:
{q}

Provide concise answer and cite sources if possible.
"""
        try:
            model = genai.GenerativeModel("gemini-3.1-pro-preview")
            response = model.generate_content(prompt)
            logger.info("LLM raw response: %s", repr(response))

            # Defensive extraction of text
            if hasattr(response, "text"):
                answer = getattr(response, "text")
            elif isinstance(response, dict):
                answer = response.get("text") or response.get("content")
            else:
                candidates = getattr(response, "candidates", None) or getattr(response, "outputs", None)
                if candidates and len(candidates) > 0:
                    first = candidates[0]
                    if isinstance(first, dict):
                        answer = first.get("text") or first.get("content")
                    else:
                        answer = getattr(first, "text", None) or getattr(first, "content", None)
        except Exception as e:
            # Fallback if quota exceeded or any other error
            logger.warning("LLM generation failed, returning chunks instead: %s", e)
            answer = "\n".join(retrieved_chunks)

    else:
        # Fallback if Gemini is not available at all
        answer = "\n".join(retrieved_chunks)

    # 8️⃣ Return final response
    return {
        "query": q,
        "answer": answer,
        "sources": retrieved_chunks,
        "retrieved_chunks": retrieved_chunks
    }