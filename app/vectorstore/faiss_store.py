import faiss
import numpy as np

class FAISSStore:
    def __init__(self, dimension):
        self.index = faiss.IndexFlatL2(dimension)
        self.texts = []

    def add(self, embeddings, texts):
        self.index.add(embeddings)
        self.texts.extend(texts)

    def search(self, query_embedding, top_k=3):
        distances, indices = self.index.search(query_embedding, top_k)
        return [self.texts[i] for i in indices[0]]