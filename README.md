# Bitext News Alert Chatbot

The **Bitext News Alert Chatbot** is an AI-powered system that provides real-time news updates in natural language. Unlike traditional news aggregators, it understands **complex queries** with double intent and negation. 

For example:
- “Show me news on Apple but not about the iPhone”
- “Latest news on self-driving cars but not about Waymo”

The chatbot fetches relevant articles, summarizes them concisely, and provides **confidence levels** for each response. Users can also click on the original sources for verification.

## Key Features
- **Natural Language Understanding:** Handles multi-intent queries, negation, and complex phrasing.
- **Real-time Trending News:** Displays the latest trending news dynamically.
- **Contextual Summarization:** Summarizes articles in 2–4 sentences, avoiding verbatim text.
- **Confidence Scoring:** Shows High, Medium, or Low confidence based on relevance.
- **Source Attribution:** Clickable bullet points linking to original articles.
- **Content Safety:** Filters queries related to social violations, illegal content, or sensitive topics.

## Technology Stack
- **Backend:** FastAPI
- **Frontend:** Next.js with React and Tailwind CSS
- **Embeddings:** Sentence Transformers (all-MiniLM-L6-v2)
- **Vector Store:** FAISS for fast similarity search
- **Generative AI:** Optional Gemini Pro for enhanced summarization
- **Data Sources:** NewsAPI for global news

## Usage
1. Type a natural language query or click a trending news topic.
2. The bot returns a concise summary with confidence scoring and clickable sources.
3. Confidence levels:
   - **High (Red)**
   - **Medium (Green)**
   - **Low (Yellow)**
