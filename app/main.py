import os
import logging
import numpy as np
from datetime import datetime
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sentence_transformers import SentenceTransformer, util
from sklearn.cluster import KMeans

from apscheduler.schedulers.background import BackgroundScheduler

from app.retrieval.newsapi import fetch_news
from app.vectorstore.faiss_store import FAISSStore
from app.utils import chunk_text

import google.generativeai as genai

# ----------------------------
# Load env
# ----------------------------
load_dotenv()

# ----------------------------
# Logging
# ----------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ----------------------------
# FastAPI
# ----------------------------
app = FastAPI(title="NewsRAG Backend")

# ----------------------------
# CORS
# ----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Embedding Model
# ----------------------------
embed_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

def embed_texts(texts):
    embeddings = embed_model.encode(texts, convert_to_numpy=True)
    return embeddings.astype("float32")

# ----------------------------
# Gemini Setup
# ----------------------------
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# ----------------------------
# Chat Memory
# ----------------------------
chat_history = []

def add_message(role, text):

    chat_history.append({
        "role": role,
        "text": text
    })

    if len(chat_history) > 10:
        chat_history.pop(0)

def get_memory():

    context = ""

    for msg in chat_history:
        context += f"{msg['role']}: {msg['text']}\n"

    return context

# ----------------------------
# Ranking (Relevance + Recency)
# ----------------------------
def rank_articles(query, articles):

    query_emb = embed_texts([query])[0]

    ranked = []

    for article in articles:

        text = f"{article.get('title','')} {article.get('description','')}"

        emb = embed_texts([text])[0]

        similarity = util.cos_sim(query_emb, emb).item()

        recency_score = 0

        date = article.get("publishedAt")

        if date:
            try:
                published = datetime.fromisoformat(date.replace("Z",""))
                hours_old = (datetime.utcnow() - published).total_seconds() / 3600
                recency_score = max(0, 1 - hours_old / 48)
            except:
                pass

        score = similarity * 0.7 + recency_score * 0.3

        ranked.append((score, article))

    ranked.sort(reverse=True, key=lambda x: x[0])

    return [r[1] for r in ranked]

# ----------------------------
# Summarization
# ----------------------------
def summarize_chunks(question, retrieved_chunks):

    memory = get_memory()

    context = "\n\n".join(
        [f"[{i+1}] {c['text']}" for i, c in enumerate(retrieved_chunks)]
    )

    prompt = f"""
You are a news assistant.

Conversation history:
{memory}

Using the news context below, answer the question.

Rules:
- 2 to 4 sentences
- combine multiple sources
- cite sources [1][2]
- do not copy text

Context:
{context}

Question:
{question}
"""

    try:

        model = genai.GenerativeModel("gemini-1.5-flash")

        response = model.generate_content(prompt)

        return response.text

    except Exception as e:

        logger.warning("Summarization failed %s", e)

        return " ".join([c["text"] for c in retrieved_chunks[:2]])

# ----------------------------
# Confidence Score
# ----------------------------
def compute_confidence(answer, chunks):

    answer_emb = embed_texts([answer])[0]

    chunk_texts = [c["text"] for c in chunks]

    chunk_embs = embed_texts(chunk_texts)

    sims = util.cos_sim(answer_emb, chunk_embs).numpy().flatten()

    max_sim = float(np.max(sims))

    coverage = np.mean(sims > 0.6)

    return min(max_sim * coverage, 1.0)

# ----------------------------
# Trending Topics Detection
# ----------------------------
def detect_trending_topics(articles, clusters=5):

    titles = [a.get("title","") for a in articles if a.get("title")]

    if len(titles) < clusters:
        return titles

    embeddings = embed_texts(titles)

    kmeans = KMeans(n_clusters=clusters, random_state=0)

    labels = kmeans.fit_predict(embeddings)

    topic_map = {}

    for label, title in zip(labels, titles):
        topic_map.setdefault(label, []).append(title)

    topics = []

    for group in topic_map.values():
        topics.append(group[0])

    return topics

# ----------------------------
# Live News Streaming
# ----------------------------
latest_news = []

def update_news():

    global latest_news

    articles = fetch_news("breaking news")

    latest_news = articles[:10]

def start_scheduler():

    scheduler = BackgroundScheduler()

    scheduler.add_job(update_news, "interval", minutes=10)

    scheduler.start()

start_scheduler()

# ----------------------------
# Restricted Topics
# ----------------------------
SOCIAL_VIOLATION_KEYWORDS = [
    "violence",
    "illegal",
    "hate speech",
    "adult",
    "drugs",
    "terrorism"
]

# ----------------------------
# Query Endpoint
# ----------------------------
@app.get("/query")
def query_news(q: str, top_k: int = 4):

    if any(word in q.lower() for word in SOCIAL_VIOLATION_KEYWORDS):

        return {
            "query": q,
            "answer": "⚠️ This topic cannot be answered.",
            "is_violation": True
        }

    add_message("user", q)

    articles = fetch_news(q)

    if not articles:
        return {"error": "No news found"}

    articles = rank_articles(q, articles)

    chunks = []

    for article in articles:

        text = f"{article.get('title','')} {article.get('description','')}"

        for chunk in chunk_text(text, 200):

            chunks.append({
                "text": chunk,
                "source": article.get("url")
            })

    chunk_embeddings = embed_texts([c["text"] for c in chunks])

    dimension = chunk_embeddings.shape[1]

    store = FAISSStore(dimension)

    store.add(chunk_embeddings, chunks)

    query_embedding = embed_texts([q])

    retrieved = store.search(query_embedding, top_k=top_k)

    if not retrieved:
        return {"error": "No relevant news"}

    answer = summarize_chunks(q, retrieved)

    add_message("assistant", answer)

    confidence = compute_confidence(answer, retrieved)

    sources = {str(i+1): c["source"] for i, c in enumerate(retrieved)}

    return {
        "query": q,
        "answer": answer,
        "confidence": confidence,
        "sources": sources,
        "retrieved_chunks": retrieved,
        "is_violation": False
    }

# ----------------------------
# Live News Endpoint
# ----------------------------


@app.get("/trending-topics")
def get_trending(top_k: int = 8):
    articles = fetch_news("trending")  # updated function
    if isinstance(articles, dict) and "error" in articles:
        return {"articles": []}
    return {"articles": articles}


@app.get("/live-news")
def get_live(top_k: int = 8):
    articles = fetch_news("latest")  # updated function
    if isinstance(articles, dict) and "error" in articles:
        return {"articles": []}
    return {"articles": articles}

@app.get("/sports-news")
def get_sports_news():
    return {"articles": fetch_news("sports", page_size=8)}

@app.get("/weather-news")
def get_weather_news():
    return {"articles": fetch_news("weather", page_size=8)}

@app.get("/money-news")
def get_money_news(top_k: int = 5):
    articles = fetch_news("money")  # fetch money/finance news
    if isinstance(articles, dict) and "error" in articles:
        return {"articles": []}
    return {"articles": articles[:top_k]}


@app.get("/watch-news")
def get_watch_news(top_k: int = 5):
    articles = fetch_news("entertainment OR watch OR tv")  # fetch entertainment/watch news
    if isinstance(articles, dict) and "error" in articles:
        return {"articles": []}
    return {"articles": articles[:top_k]}