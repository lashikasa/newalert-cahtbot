from fastapi import FastAPI
from app.retrieval.newsapi import fetch_news

app = FastAPI(title="NewsRAG Backend")

@app.get("/")
def root():
    return {"message": "NewsRAG Backend is running"}

@app.get("/query")
def query_news(q: str):
    result = fetch_news(q)
    # If error returned, pass as JSON
    if isinstance(result, dict) and "error" in result:
        return {"query": q, "error": result["error"]}
    return {"query": q, "articles": result}