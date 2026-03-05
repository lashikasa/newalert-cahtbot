from apscheduler.schedulers.background import BackgroundScheduler
import app
from app.retrieval.newsapi import fetch_news

latest_news = []

def update_news():

    global latest_news

    articles = fetch_news("breaking news")

    latest_news = articles[:10]


def start_news_stream():

    scheduler = BackgroundScheduler()

    scheduler.add_job(update_news, "interval", minutes=10)

    scheduler.start()

from app.services.news_stream import start_news_stream

start_news_stream()

@app.get("/live-news")
def live_news():
    from app.services.news_stream import latest_news
    return {"articles": latest_news}