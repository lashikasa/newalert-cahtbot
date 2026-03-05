"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";

export default function AIChatPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    { type: "bot", text: "Hello! I'm Bitext News Chatbot. Ask me anything news-related!", sources: {} },
  ]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState([]);
  const [liveNews, setLiveNews] = useState([]);
  const chatEndRef = useRef(null);

  // Auto scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch trending and live news
  useEffect(() => {
    axios
      .get("http://localhost:8000/trending-topics")
      .then((res) => setTrending(res.data.topics || []))
      .catch((err) => console.error("Failed to fetch trending topics:", err));

    const fetchLiveNews = () => {
      axios
        .get("http://localhost:8000/live-news")
        .then((res) => setLiveNews(res.data.articles || []))
        .catch((err) => console.error("Failed to fetch live news:", err));
    };

    fetchLiveNews();
    const interval = setInterval(fetchLiveNews, 30000);
    return () => clearInterval(interval);
  }, []);

  // Watch searchParams for new query
  useEffect(() => {
    const newQuery = searchParams.get("query");
    if (newQuery) {
      sendQuery(newQuery);
    }
    setQuery(""); // clear input after sending
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]); // trigger whenever searchParams change

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.8) return { text: "High", color: "bg-red-600" };
    if (confidence >= 0.5) return { text: "Medium", color: "bg-green-600" };
    return { text: "Low", color: "bg-yellow-400" };
  };

  const sendQuery = async (q) => {
    if (!q.trim()) return;
    setMessages((prev) => [...prev, { type: "user", text: q }]);
    setLoading(true);

    try {
      const res = await axios.get("http://localhost:8000/query", { params: { q } });
      const data = res.data;

      const isRestricted = data.answer?.includes("⚠️ Sorry");

      let confidenceValue = null;
      if (data.confidence !== undefined && !isRestricted) {
        confidenceValue = Number(data.confidence).toFixed(3);
      }

      const formattedText = !isRestricted
        ? data.answer.split(/(?<=[.?!])\s+/).map((s) => s.trim()).join("\n\n")
        : data.answer;

      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          text: formattedText || "No answer returned",
          sources: data.sources || {},
          confidence: confidenceValue,
          isRestricted,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: "Error fetching answer.", sources: {}, confidence: null, isRestricted: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendQuery(query);
    setQuery("");
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Panel: Trending + Live News */}
      <div className="w-2/3 bg-red-700 text-white p-8 overflow-y-auto">
        <h1 className="text-4xl font-bold mb-4">Trending & Live News</h1>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Trending Topics</h2>
          <ul className="space-y-2">
            {trending.map((topic, idx) => (
              <li
                key={idx}
                className="bg-red-600 p-2 rounded hover:bg-red-500 cursor-pointer transition"
                onClick={() => sendQuery(topic)}
              >
                {topic}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-2">Live News</h2>
          <ul className="space-y-2">
            {liveNews.map((item, idx) => (
              <li
                key={idx}
                className="bg-red-600 p-2 rounded hover:bg-red-500 cursor-pointer transition"
                onClick={() => sendQuery(item.title)}
              >
                {item.title}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Panel: Chat */}
      <div className="w-1/3 bg-gray-100 p-4 flex flex-col h-screen">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`p-3 rounded-xl max-w-[80%] whitespace-pre-line ${
                  msg.type === "user"
                    ? "bg-red-600 text-white rounded-br-none"
                    : msg.isRestricted
                    ? "bg-yellow-100 text-red-700 font-bold rounded-bl-none shadow"
                    : "bg-white text-gray-800 rounded-bl-none shadow"
                }`}
              >
                <p>{msg.text}</p>

                {/* Confidence */}
                {msg.type === "bot" && !msg.isRestricted && msg.confidence && (
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 text-white text-xs rounded-full ${
                      getConfidenceLevel(Number(msg.confidence)).color
                    }`}
                  >
                    {getConfidenceLevel(Number(msg.confidence)).text} ({msg.confidence})
                  </span>
                )}

                {/* Sources */}
                {msg.type === "bot" &&
                  msg.sources &&
                  Object.keys(msg.sources).length > 0 &&
                  !msg.isRestricted && (
                    <ul className="text-blue-600 text-sm mt-2 list-disc list-inside">
                      {Object.values(msg.sources).map((url, i) => (
                        <li key={i}>
                          <a href={url} target="_blank" className="hover:underline font-semibold">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-700 placeholder-gray-500 text-gray-900 transition"
          />
          <button
            type="submit"
            className="bg-red-700 hover:bg-red-800 text-white px-4 py-3 rounded-xl transition"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}