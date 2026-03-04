import os
import numpy as np
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

# Load environment variables (optional)
load_dotenv()

# Load the free MiniLM model for embeddings
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

def embed_texts(texts: list) -> np.ndarray:
    """
    Generate embeddings for a list of texts using the free MiniLM model.
    
    Args:
        texts (list[str]): List of text strings to embed.
    
    Returns:
        np.ndarray: 2D array of embeddings (float32)
    """
    embeddings = model.encode(texts, convert_to_numpy=True)
    return embeddings.astype("float32")

# ----------------------
# Example usage
# ----------------------
if __name__ == "__main__":
    sample_texts = [
        "Hello world!",
        "This is a free embedding model using MiniLM.",
        "You can use these embeddings for semantic search or RAG."
    ]
    
    embeddings = embed_texts(sample_texts)
    
    print("Embeddings shape:", embeddings.shape)  # (num_texts, 384)
    print("First embedding vector:", embeddings[0])