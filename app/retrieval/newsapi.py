import os
import requests
from dotenv import load_dotenv

# Load .env from project root
load_dotenv()

NEWSAPI_KEY = os.getenv("NEWSAPI_KEY")


def fetch_news(query: str, page_size: int = 5):
    """
    Fetch top news articles from NewsAPI for a given query.
    Returns articles with title, description, url, source, image/video info.
    """
    url = f"https://newsapi.org/v2/everything?q={query}&pageSize={page_size}&apiKey={NEWSAPI_KEY}"

    try:
        response = requests.get(url)
        data = response.json()

        if data.get("status") != "ok":
            print("NewsAPI Error:", data.get("message"))
            return {"error": data.get("message")}

        articles = []
        for article in data.get("articles", []):
            # Default media: image from NewsAPI
            media_url = article.get("urlToImage") or ""
            media_type = "image" if media_url else None

            # Detect YouTube link in content or description
            content_fields = [article.get("content", ""), article.get("description", "")]
            for field in content_fields:
                if "youtube.com/watch" in field:
                    youtube_url = extract_youtube_url(field)
                    if youtube_url:
                        media_url = youtube_url
                        media_type = "video"
                        break  # take first video found

            articles.append({
                "title": article.get("title", "No Title"),
                "description": article.get("description") or "",
                "url": article.get("url", "#"),
                "publishedAt": article.get("publishedAt"),
                "source": article.get("source", {}).get("name", "Unknown"),
                "mediaUrl": media_url,
                "mediaType": media_type
            })

        return articles

    except requests.exceptions.RequestException as e:
        print("Request Exception:", e)
        return {"error": str(e)}


def extract_youtube_url(text: str) -> str:
    """
    Extract the first YouTube URL from text content.
    """
    if "youtube.com/watch" in text:
        start = text.find("https://www.youtube.com/watch")
        if start == -1:
            start = text.find("https://youtube.com/watch")
        if start != -1:
            end = text.find(" ", start)
            return text[start:end] if end != -1 else text[start:]
    return ""