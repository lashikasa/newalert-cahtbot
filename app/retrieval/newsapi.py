import os
import requests
from dotenv import load_dotenv

# Load .env from project root
load_dotenv()

NEWSAPI_KEY = os.getenv("NEWSAPI_KEY")

def fetch_news(query: str, page_size: int = 5):
    """
    Fetch top news articles from NewsAPI for a given query.
    Handles API errors and returns empty list if there are no articles.
    """
    url = f"https://newsapi.org/v2/everything?q={query}&pageSize={page_size}&apiKey={NEWSAPI_KEY}"
    try:
        response = requests.get(url)
        data = response.json()

        # Check API status
        if data.get("status") != "ok":
            # Return a friendly error message instead of silent empty list
            print("NewsAPI Error:", data.get("message"))
            return {"error": data.get("message")}

        # Parse articles
        articles = []
        for article in data.get("articles", []):
            articles.append({
                "title": article.get("title"),
                "description": article.get("description"),
                "url": article.get("url"),
                "publishedAt": article.get("publishedAt"),
                "source": article.get("source", {}).get("name")
            })

        return articles

    except requests.exceptions.RequestException as e:
        # Network error or timeout
        print("Request Exception:", e)
        return {"error": str(e)}