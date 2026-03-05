"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function HomePage() {
  const [trending, setTrending] = useState([]);
  const [liveNews, setLiveNews] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Fetch trending news
    axios
      .get("http://localhost:8000/trending-topics")
      .then((res) => setTrending(res.data.articles || []))
      .catch((err) => console.error("Failed to fetch trending:", err));

    // Fetch live news
    axios
      .get("http://localhost:8000/live-news")
      .then((res) => setLiveNews(res.data.articles || []))
      .catch((err) => console.error("Failed to fetch live news:", err));
  }, []);

  const renderNewsCard = (article, index) => {
    const imageUrl =
      article.urlToImage || "https://via.placeholder.com/400x200?text=No+Image";
    const title = article.title || "No Title";
    const url = article.url || "#";

    return (
      <a
        key={url + index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      >
        <img src={imageUrl} alt={title} className="w-full h-52 object-cover" />
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
      </a>
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/Aichat?query=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex justify-center mb-10">
        <input
          type="text"
          placeholder="Search news or ask the AI chatbot..."
          className="w-2/3 p-3 rounded-l-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-700 placeholder-gray-500 text-gray-900"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          type="submit"
          className="bg-red-700 hover:bg-red-800 text-white px-6 rounded-r-xl transition-colors"
        >
          Search
        </button>
      </form>

      <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">News Dashboard</h1>

      {/* Trending News */}
      <h2 className="text-3xl font-bold mb-6 text-gray-700">Trending News</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
        {trending.length > 0
          ? trending.map((article, idx) => renderNewsCard(article, idx))
          : <p className="col-span-full text-center text-gray-500">No trending news available.</p>}
      </div>

      {/* Live News */}
      <h2 className="text-3xl font-bold mb-6 text-gray-700">Live News</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {liveNews.length > 0
          ? liveNews.map((article, idx) => renderNewsCard(article, idx))
          : <p className="col-span-full text-center text-gray-500">No live news available.</p>}
      </div>
    </div>
  );
}