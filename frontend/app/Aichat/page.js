"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";

export default function AIChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    {
      type: "bot",
      text: "Hello! I'm Bitext News Chatbot. Ask me anything news-related!",
      sources: {},
      media: [],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState([]);
  const [liveNews, setLiveNews] = useState([]);
  const [selectedNewsId, setSelectedNewsId] = useState(null);
  const chatEndRef = useRef(null);
  const audioRefs = useRef({});

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch trending + live news
  useEffect(() => {
    axios
      .get("http://localhost:8000/trending-topics")
      .then((res) => setTrending(res.data.articles || []))
      .catch(() => setTrending([]));

    const fetchLiveNews = () => {
      axios
        .get("http://localhost:8000/live-news")
        .then((res) => setLiveNews(res.data.articles || []))
        .catch(() => setLiveNews([]));
    };

    fetchLiveNews();
    const interval = setInterval(fetchLiveNews, 30000);
    return () => clearInterval(interval);
  }, []);

  // Watch searchParams for query
  useEffect(() => {
    const newQuery = searchParams.get("query");
    if (newQuery) sendQuery(newQuery);
    setQuery("");
  }, [searchParams.toString()]);

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.8) return { text: "High", color: "bg-red-600" };
    if (confidence >= 0.5) return { text: "Medium", color: "bg-green-600" };
    return { text: "Low", color: "bg-yellow-400" };
  };

  const toggleSpeak = (idx, text) => {
    const synth = window.speechSynthesis;
    if (!synth) return alert("Speech Synthesis not supported.");
    if (audioRefs.current[idx]) {
      synth.cancel();
      audioRefs.current[idx] = null;
    } else {
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      utter.pitch = 1;
      synth.speak(utter);
      audioRefs.current[idx] = utter;
      utter.onend = () => (audioRefs.current[idx] = null);
    }
  };

  const sendQuery = async (q) => {
    if (!q.trim()) return;
    setMessages((prev) => [...prev, { type: "user", text: q }]);
    setLoading(true);

    try {
      const res = await axios.get("http://localhost:8000/query", { params: { q } });
      const data = res.data;

      const isRestricted = data.answer?.includes("⚠️ This topic cannot be answered.");
      let confidenceValue = null;
      if (data.confidence !== undefined && !isRestricted) {
        confidenceValue = Number(data.confidence).toFixed(3);
      }

      const formattedText = !isRestricted
        ? data.answer.split(/(?<=[.?!])\s+/).map((s) => s.trim()).join("\n\n")
        : data.answer;

      const mediaArray = Array.isArray(data.media) ? data.media : [];

      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          text: formattedText || "No answer returned",
          sources: data.sources || {},
          media: mediaArray,
          confidence: confidenceValue,
          isRestricted,
          isFake: data.is_fake,
          sentiment: data.sentiment,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          text: "Error fetching answer.",
          sources: {},
          media: [],
          confidence: null,
          isRestricted: true,
        },
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

  const handleNewsClick = (news) => {
    setSelectedNewsId(news.url);
    sendQuery(news.title);
  };

  const renderNewsGrid = (articles) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {articles.map((news) => (
        <div
          key={news.url}
          onClick={() => handleNewsClick(news)}
          className={`cursor-pointer p-4 rounded-lg shadow transition transform hover:scale-105 hover:shadow-xl
            ${selectedNewsId === news.url ? "bg-red-600 text-white" : "bg-white text-gray-800"}`}
        >
          <h3 className="font-semibold mb-2">{news.title}</h3>
          {news.description && <p className="text-sm line-clamp-3">{news.description}</p>}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Nav: Home / Profile */}
      <header className="w-full bg-white shadow flex justify-end px-6 py-4 sticky top-0 z-30">
        {["Home", "Profile"].map((item) => (
          <span
            key={item}
            onClick={() => item === "Home" ? router.push("/") : alert("Profile page not implemented")}
            className="ml-6 relative cursor-pointer text-gray-700 font-semibold transition-colors duration-200 hover:text-gray-900 hover:underline"
          >
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-700 transition-all duration-300 group-hover:w-full"></span>
            {item}
          </span>
        ))}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Trending + Live News */}
        <div className="w-2/5 p-6 overflow-y-auto bg-gray-100">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Trending Topics</h2>
            {renderNewsGrid(trending)}
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Live News</h2>
            {renderNewsGrid(liveNews)}
          </div>
        </div>

        {/* Right Panel: Chat */}
        <div className="w-3/5 bg-gray-50 p-6 flex flex-col h-screen overflow-hidden">
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`p-3 rounded-xl max-w-[80%] whitespace-pre-line break-words ${
                    msg.type === "user"
                      ? "bg-red-600 text-white rounded-br-none"
                      : msg.isRestricted
                      ? "bg-yellow-100 text-red-700 font-bold rounded-bl-none shadow"
                      : "bg-white text-gray-800 rounded-bl-none shadow"
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* TTS Button */}
                  {msg.type === "bot" && !msg.isRestricted && (
                    <button
                      onClick={() => toggleSpeak(idx, msg.text)}
                      className="ml-2 bg-gray-200 hover:bg-gray-300 p-1 rounded-full text-xs mt-1"
                    >
                      {audioRefs.current[idx] ? "⏸ Pause" : "🔊 Listen"}
                    </button>
                  )}

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

                  {/* Sentiment */}
                  {msg.type === "bot" && !msg.isRestricted && msg.sentiment && (
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 text-white text-xs rounded-full ml-2 ${
                        msg.sentiment === "Positive"
                          ? "bg-green-600"
                          : msg.sentiment === "Negative"
                          ? "bg-red-600"
                          : "bg-yellow-500"
                      }`}
                    >
                      {msg.sentiment}
                    </span>
                  )}

                  {/* Fake news warning */}
                  {msg.type === "bot" && msg.isFake && (
                    <p className="text-red-600 font-bold mt-1">⚠️ This news may be unreliable</p>
                  )}

                  {/* Media */}
                  {msg.media && msg.media.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.media.map((m, i) => (
                        <div key={i}>
                          {m.mediaType === "video" ? (
                            <video src={m.mediaUrl} controls className="w-full max-h-64 rounded" />
                          ) : (
                            <img src={m.mediaUrl} alt={m.title || "media"} className="w-full max-h-64 object-cover rounded" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sources */}
                  {msg.type === "bot" && msg.sources && Object.keys(msg.sources).length > 0 && (
                    <ul className="text-blue-600 text-sm mt-2 list-disc list-inside break-words">
                      {Object.values(msg.sources).map((url, i) => (
                        <li key={i}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold break-all">
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
              className="flex-1 p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-700 placeholder-gray-700 text-gray-900 transition"
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
    </div>
  );
}