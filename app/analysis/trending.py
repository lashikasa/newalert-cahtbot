from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

def detect_trending_topics(articles, n_clusters=5):

    titles = [a.get("title","") for a in articles if a.get("title")]

    if len(titles) < n_clusters:
        return titles

    embeddings = model.encode(titles)

    kmeans = KMeans(n_clusters=n_clusters, random_state=0)
    labels = kmeans.fit_predict(embeddings)

    clusters = {}

    for label, title in zip(labels, titles):
        clusters.setdefault(label, []).append(title)

    trending = []

    for cluster_titles in clusters.values():
        trending.append(cluster_titles[0])

    return trending