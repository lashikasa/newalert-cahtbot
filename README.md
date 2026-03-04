📰 Bitext News Alert Chatbot

Bitext News Alert Chatbot is an intelligent news assistant that allows users to query the latest news worldwide using natural language. It can understand conversational nuances, handle double intents and negation, and provide summarized, well-cited news with source links.

Features

Natural Language Queries: Ask questions in plain English and get relevant news.

Double Intent & Negation Handling: Example: "Show news about Apple but not about iPhone."

Trending News: Fetches the most recent trending news automatically.

Summarized Answers: Summarizes multiple articles in clear, concise sentences.

Source Citations: Provides direct URLs for each news snippet.

Confidence Scoring: Estimates reliability of the answer (High, Medium, Low) based on content relevance.

Violation Detection: Automatically blocks content related to sensitive, illegal, or social violation topics.

Interactive Frontend: Click trending news to automatically query the chatbot.

Frontend Tools

Next.js 16+ – React-based framework for building the frontend.

React Hooks (useState, useEffect, useRef) – For state management and dynamic updates.

Axios – Handles API requests to the backend.

Tailwind CSS – Provides modern, responsive styling.

Dynamic Trending News Panel – Shows the latest top 3 trending news on the side.

Backend Tools

FastAPI – Serves the backend API.

FAISS – Vector search for semantic retrieval of relevant news chunks.

SentenceTransformers (MiniLM) – Generates embeddings for query and article comparison.

Google Gemini Pro (optional) – LLM for generating human-like summaries.

NewsAPI – Fetches real-time news articles globally.

Python Libraries: numpy, dotenv, logging.

Key Functionalities

Query News

Endpoint: /query?q=YOUR_QUERY

Returns a summarized answer, sources, confidence, and retrieved chunks.

Trending News

Endpoint: /trending?top_k=3

Returns top trending news headlines for quick queries.

Content Moderation

Automatically detects sensitive or violation topics (violence, illegal, drugs, hate speech) and returns a friendly warning.

Confidence Levels

Categorizes answers as High, Medium, or Low confidence.

Shows confidence as color-coded badges in the frontend.

How to Run

Clone the repository:

git clone https://github.com/lashikasa/frontend.git

Install frontend dependencies:

cd frontend
npm install
npm run dev

Install backend dependencies:

cd backend
pip install -r requirements.txt
uvicorn main:app --reload

Set your environment variables in .env:

NEWSAPI_KEY=your_newsapi_key
GEMINI_API_KEY=your_gemini_key

Open the frontend at http://localhost:3000
.

Future Improvements

Add personalized news alerts via email or notifications.

Enhance LLM summarization with multi-language support.

Integrate real-time social media news.

Add voice input/output for conversational AI experience.
