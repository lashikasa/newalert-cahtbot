Bitext News Alert Chatbot

The Bitext News Alert Chatbot is an intelligent, AI-powered chatbot designed to provide real-time news updates and insights in natural language. Unlike traditional news aggregators, this system understands user queries with double intent and negation, allowing you to ask complex questions such as:

“Show me news on Apple but not about the iPhone”

“Latest news on self-driving cars but not about Waymo”

The chatbot fetches relevant articles from trusted sources, summarizes content concisely, and provides confidence levels for each response. Users can also see the original sources as clickable links for verification.

Key Features

Natural Language Understanding (NLU): Handles multi-intent queries, negation, and complex phrasing.

Real-time Trending News: Displays the latest trending news dynamically for quick access.

Contextual Summarization: Summarizes articles into 2–4 sentence answers, avoiding verbatim copying.

Confidence Scoring: Provides confidence levels (High, Medium, Low) based on the relevance of the retrieved news.

Source Attribution: Links to original news articles as bullet points for easy reference.

Content Safety: Filters out queries related to social violations, illegal activities, and sensitive content.

Technology Stack & Tools

Backend: FastAPI
 – high-performance API framework for Python.

Frontend: Next.js
 with React and Tailwind CSS for a responsive UI.

Embeddings: Sentence Transformers – all-MiniLM-L6-v2
 for semantic search.

Vector Store: FAISS
 for fast similarity search.

Generative AI: Optional Gemini Pro API
 for enhanced summarization.

Data Sources: Integrated with NewsAPI
 to fetch global news.

Usage

Type a query in natural language or click on a trending news topic.

The bot will return a concise summary with confidence scoring and clickable sources.

Confidence levels are color-coded:

High (Red)

Medium (Green)

Low (Yellow)

This description frames your project professionally, highlights the unique features, and also mentions the tech stack clearly for other developers.
