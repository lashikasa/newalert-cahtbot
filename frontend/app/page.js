"use client";

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

// News card component with reactions
function NewsCard({ article }) {
  const videoRef = useRef(null);
  const isVideo = article.mediaType === "video";
  const router = useRouter();

  // Reactions
  const [reactions, setReactions] = useState({ like: 0 });
  const [userReaction, setUserReaction] = useState(null); // null or 'like', 'haha', etc.
  const [showReactionPopup, setShowReactionPopup] = useState(false);

  const reactionMap = {
    like: "👍",
    haha: "😄",
    wow: "😮",
    sad: "😢",
    angry: "😡",
  };

  // Hover video play
  const handleMouseEnter = () => {
    if (isVideo && videoRef.current) videoRef.current.play();
  };
  const handleMouseLeave = () => {
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleAIButton = () => {
    router.push(`/Aichat?query=${encodeURIComponent(article.title)}`);
  };

  const handleLikeClick = () => {
    if (!userReaction) {
      setUserReaction("like");
      setReactions((prev) => ({ ...prev, like: prev.like + 1 }));
      setShowReactionPopup(true);
    }
  };

  const handleReaction = (type) => {
    if (userReaction) {
      if (userReaction === "like") setReactions((prev) => ({ ...prev, like: prev.like - 1 }));
    }
    setUserReaction(type);
    if (type === "like") setReactions((prev) => ({ ...prev, like: prev.like + 1 }));
    setShowReactionPopup(false);
  };

  const handleDoubleClick = () => {
    if (userReaction === "like") setReactions((prev) => ({ ...prev, like: prev.like - 1 }));
    setUserReaction(null);
    setShowReactionPopup(false);
  };

  return (
    <div
      className="w-64 min-w-[16rem] bg-white shadow-md rounded overflow-hidden mr-4 cursor-pointer
                 transform transition duration-300 hover:scale-105 hover:shadow-2xl hover:-translate-y-2 hover:rotate-1"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={article.mediaUrl}
          className="w-full h-40 object-cover rounded-t"
          muted
          loop
          playsInline
        />
      ) : (
        <img
          src={article.mediaUrl || "https://via.placeholder.com/400x200?text=No+Image"}
          alt={article.title}
          className="w-full h-40 object-cover rounded-t"
        />
      )}
      <div className="p-3">
        <h3 className="text-md font-semibold">{article.title}</h3>
        {article.description && (
          <p className="text-gray-600 text-sm mt-1 line-clamp-3">{article.description}</p>
        )}
        <div className="flex justify-between mt-2 items-center">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-700 hover:underline text-sm"
          >
            Read more
          </a>
          <button
            onClick={handleAIButton}
            className="bg-red-700 hover:bg-red-800 text-white text-xs px-2 py-1 rounded transition transform hover:scale-105"
          >
            AI
          </button>
        </div>

        {/* Reactions */}
        <div className="flex items-center mt-3 relative">
          {/* Default uncolored thumbs-up if not reacted */}
          <button
            onClick={handleLikeClick}
            className="p-2 rounded-full transition transform hover:scale-110 text-gray-400"
          >
            <span className="text-lg">{userReaction ? reactionMap[userReaction] : "👍"}</span>
            {userReaction === "like" && reactions.like > 0 && (
              <span className="ml-1 text-xs font-bold">{reactions.like}</span>
            )}
          </button>

          {/* Reaction popup after clicking like */}
          {showReactionPopup && (
            <div className="absolute bottom-10 left-0 flex space-x-2 bg-white p-2 rounded-full shadow-lg border border-gray-200">
              {Object.keys(reactionMap).map((type) => (
                <button
                  key={type}
                  onClick={() => handleReaction(type)}
                  className={`text-xl transition transform hover:scale-125 ${
                    userReaction === type ? "scale-125" : ""
                  }`}
                >
                  {reactionMap[type]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MSNStyleDashboard() {
  const [trending, setTrending] = useState([]);
  const [liveNews, setLiveNews] = useState([]);
  const [sportsNews, setSportsNews] = useState([]);
  const [weatherNews, setWeatherNews] = useState([]);
  const [moneyNews, setMoneyNews] = useState([]);
  const [watchNews, setWatchNews] = useState([]);
  const [activeCategory, setActiveCategory] = useState("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const sectionsRef = useRef({});

  useEffect(() => {
    const fetchAllNews = async () => {
      try {
        const [
          trendingRes,
          liveRes,
          sportsRes,
          weatherRes,
          moneyRes,
          watchRes,
        ] = await Promise.all([
          axios.get("http://localhost:8000/trending-topics").catch(() => ({ data: { articles: [] } })),
          axios.get("http://localhost:8000/live-news").catch(() => ({ data: { articles: [] } })),
          axios.get("http://localhost:8000/sports-news").catch(() => ({ data: { articles: [] } })),
          axios.get("http://localhost:8000/weather-news").catch(() => ({ data: { articles: [] } })),
          axios.get("http://localhost:8000/money-news").catch(() => ({ data: { articles: [] } })),
          axios.get("http://localhost:8000/watch-news").catch(() => ({ data: { articles: [] } })),
        ]);

        setTrending(trendingRes.data.articles || []);
        setLiveNews(liveRes.data.articles || []);
        setSportsNews(sportsRes.data.articles || []);
        setWeatherNews(weatherRes.data.articles || []);
        setMoneyNews(moneyRes.data.articles || []);
        setWatchNews(watchRes.data.articles || []);
      } catch (err) {
        console.error("Error fetching news:", err);
      }
    };
    fetchAllNews();
  }, []);

  const scrollToSection = (key) => {
    setActiveCategory(key);
    sectionsRef.current[key]?.scrollIntoView({ behavior: "smooth" });
  };

  const getArticlesByCategory = () => {
    switch (activeCategory) {
      case "sports": return sportsNews;
      case "money": return moneyNews;
      case "weather": return weatherNews;
      case "watch": return watchNews;
      default: return [...trending, ...liveNews, ...sportsNews, ...weatherNews, ...moneyNews, ...watchNews];
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/Aichat?query=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  const handleAskAIButton = () => {
    router.push(`/Aichat`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top search + Ask AI */}
      <div className="sticky top-0 z-20 bg-white shadow p-4 flex justify-center gap-2">
        <form onSubmit={handleSearchSubmit} className="flex w-full max-w-2xl gap-2">
          <input
            type="text"
            placeholder="Search news or ask AI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 p-3 rounded-l-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-700"
          />
          <button
            type="submit"
            className="bg-red-700 hover:bg-red-800 text-white px-6 rounded-r-xl transition transform hover:scale-105"
          >
            Search
          </button>
          <button
            type="button"
            onClick={handleAskAIButton}
            className="bg-green-600 hover:bg-green-700 text-white px-4 rounded-xl transition transform hover:scale-105"
          >
            Ask AI
          </button>
        </form>
      </div>

      {/* Top nav */}
      <nav className="bg-white shadow sticky top-20 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex space-x-6 overflow-x-auto">
          {["Discover", "Sports", "Money", "Weather", "Watch"].map((tab) => (
            <button
              key={tab}
              onClick={() => scrollToSection(tab.toLowerCase())}
              className={`font-semibold whitespace-nowrap ${
                activeCategory === tab.toLowerCase()
                  ? "text-red-700"
                  : "text-gray-700 hover:text-red-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* News grid */}
      <div className="max-w-7xl mx-auto p-6">
        <section ref={(el) => (sectionsRef.current["discover"] = el)} className="mb-8">
          <h2 className="text-2xl font-bold mb-4">
            {activeCategory === "discover" ? "All News" : activeCategory.toUpperCase()}
          </h2>
          {getArticlesByCategory().length > 0 ? (
            <div className="flex flex-wrap gap-6 perspective-1000">
              {getArticlesByCategory().map((article, idx) => (
                <NewsCard key={idx} article={article} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No news available.</p>
          )}
        </section>
      </div>
    </div>
  );
}