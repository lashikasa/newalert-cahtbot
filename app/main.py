# main.py
import os
import logging
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer, util
from app.retrieval.newsapi import fetch_news
from app.vectorstore.faiss_store import FAISSStore
from app.utils import chunk_text

# ----------------------------
# Load environment variables
# ----------------------------
load_dotenv()

# ----------------------------
# FastAPI app
# ----------------------------
app = FastAPI(title="NewsRAG Backend")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ----------------------------
# CORS Setup for Next.js frontend
# ----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Embedding model: MiniLM
# ----------------------------
embed_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

def embed_texts(texts: list) -> np.ndarray:
    embeddings = embed_model.encode(texts, convert_to_numpy=True)
    return embeddings.astype("float32")

# ----------------------------
# Gemini Pro client (optional)
# ----------------------------
try:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
except Exception:
    genai = None
    logger.warning("Gemini client not available. Generative API calls will fail.")

# ----------------------------
# Helper: compute confidence
# ----------------------------
def compute_confidence(answer_text, retrieved_chunks):
    answer_emb = embed_texts([answer_text])[0]
    chunk_texts = [c['text'] for c in retrieved_chunks]
    chunk_embs = embed_texts(chunk_texts)
    sims = util.cos_sim(answer_emb, chunk_embs).numpy().flatten()
    max_sim = float(np.max(sims))
    coverage = np.mean(sims >= 0.7)
    confidence = max_sim * coverage
    return min(confidence, 1.0)

# ----------------------------
# Restricted keywords
# ----------------------------
SOCIAL_VIOLATION_KEYWORDS = [
    "violence", "illegal", "hate speech", "adult content", "drugs", "terrorism"
]

# ----------------------------
# /query endpoint
# ----------------------------
@app.get("/query")
def query_news(q: str, top_k: int = 3, chunk_size: int = 200):
    # 0️⃣ Restricted keyword check
    if any(word.lower() in q.lower() for word in SOCIAL_VIOLATION_KEYWORDS):
        return {
            "query": q,
            "answer": "⚠️ Sorry, I cannot provide information on that topic due to content policies.",
            "is_violation": True,
            "sources": {},
            "retrieved_chunks": []
        }

    # 1️⃣ Fetch news
    articles = fetch_news(q)
    if isinstance(articles, dict) and "error" in articles:
        return {"query": q, "error": articles["error"], "is_violation": False}

    # 2️⃣ Chunk articles
    all_chunks = []
    for article in articles:
        text = f"{article.get('title', '')} {article.get('description', '')}"
        url = article.get('url', '')
        chunks = chunk_text(text, chunk_size)
        for chunk in chunks:
            all_chunks.append({"text": chunk, "source": url})

    if not all_chunks:
        return {"query": q, "error": "No article chunks available", "is_violation": False}

    # 3️⃣ Embed chunks
    try:
        chunk_embeddings = embed_texts([c['text'] for c in all_chunks])
    except Exception as e:
        return {"query": q, "error": f"Embedding failed: {e}", "is_violation": False}

    # 4️⃣ FAISS store
    dimension = chunk_embeddings.shape[1]
    store = FAISSStore(dimension)
    store.add(chunk_embeddings, all_chunks)

    # 5️⃣ Embed query
    try:
        query_embedding = embed_texts([q])
    except Exception as e:
        return {"query": q, "error": f"Embedding failed: {e}", "is_violation": False}

    # 6️⃣ Retrieve top-K chunks
    retrieved_chunks = store.search(query_embedding, top_k=top_k)
    if not retrieved_chunks:
        return {"query": q, "error": "No relevant chunks found", "is_violation": False}

    # 7️⃣ Prepare context
    context = "\n\n".join([f"[{i+1}] {c['text']}" for i, c in enumerate(retrieved_chunks)])
    source_mapping = {str(i+1): c.get("source", "") for i, c in enumerate(retrieved_chunks)}

    prompt = f"""
You are a helpful assistant. Summarize the question using the context below. 
- Provide a concise 2-4 sentence answer.
- Cite sources in brackets [1], [2], etc.
- Do not copy text verbatim.
- Only use the context provided.

Context:
{context}

Question:
{q}
"""

    # 8️⃣ Generate answer
    answer = None
    try:
        if genai is not None:
            model = genai.GenerativeModel("gemini-3.1-pro-preview")
            response = model.generate_content(prompt)
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
        if answer is None:
            answer = "\n".join([f"[{i+1}] {c['text']}" for i, c in enumerate(retrieved_chunks)])
    except Exception as e:
        logger.warning("LLM generation failed, returning chunks instead: %s", e)
        answer = "\n".join([f"[{i+1}] {c['text']}" for i, c in enumerate(retrieved_chunks)])

    # 9️⃣ Compute confidence
    confidence_score = compute_confidence(answer, retrieved_chunks)

    # 10️⃣ Return
    return {
        "query": q,
        "answer": answer,
        "confidence": confidence_score,
        "sources": source_mapping,
        "retrieved_chunks": retrieved_chunks,
        "is_violation": False
    }

# ----------------------------
# /trending endpoint
# ----------------------------
@app.get("/trending")
def get_trending(top_k: int = 3):
    articles = fetch_news("trending")  # Or general trending query
    if isinstance(articles, dict) and "error" in articles:
        return {"error": articles["error"], "articles": []}

    trending_titles = [a.get("title", "") for a in articles[:top_k]]
    return {"articles": trending_titles}