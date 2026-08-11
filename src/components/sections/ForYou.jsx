import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import NewsCard from "../common/NewsCard";
import { useAuth } from "../../context/AuthContext";
import { fetchFollows } from "../../services/followService";
import { getSearchAssist } from "../../services/aiService";
import {
  fetchRSSNews,
  fetchOpinions,
  fetchVideos,
  fetchTrendingContent,
} from "../../newsService";
import { getRandomTrendingPosts } from "../../socialMediaService";
import { filterContentByCategory } from "../../utils/categoryFiltering";
import { matchesTopicQuery } from "../../utils/topicFiltering";
import "./ForYou.css";

const DEFAULT_FOLLOWS = {
  categories: [],
  topics: [],
  sources: [],
};

const MAX_RECOMMENDATIONS = 6;
const SUPPORTED_FORMATS = ["news", "opinion", "video", "podcast", "social"];

const normalizeText = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const getItemKey = (item = {}) =>
  String(
    item?.url ||
      item?.link ||
      `${item?.source || ""}|${item?.title || item?.content || ""}`,
  )
    .trim()
    .toLowerCase();

const inferPrimaryCategory = (categories = []) => {
  const first = String(categories?.[0] || "")
    .trim()
    .toLowerCase();
  return first || null;
};

const inferPrimaryTopic = (topics = []) => normalizeText(topics?.[0] || "");

const normalizeContentCandidate = (item = {}, format) => ({
  ...item,
  key: getItemKey(item),
  format,
  title: normalizeText(item?.title),
  source: normalizeText(
    item?.source ||
      item?.author ||
      item?.hosts ||
      (format === "social" ? "Social" : "Editorial"),
  ),
  url: normalizeText(item?.url || item?.link),
  image: normalizeText(item?.image || item?.thumbnail),
  category: normalizeText(
    item?.category ||
      (format === "opinion"
        ? "Opinion"
        : format === "video"
          ? "Video"
          : format === "podcast"
            ? "Podcast"
            : format === "social"
              ? `Social · ${item?.platform || "Feed"}`
              : "News"),
  ),
  timeAgo:
    item?.timeAgo ||
    item?.publishedAt ||
    item?.date ||
    item?.time ||
    "Recently",
  searchableSource: normalizeText(
    item?.source || item?.author || item?.hosts || item?.platform,
  ).toLowerCase(),
});

const normalizeSocialCandidate = (item = {}) => {
  const title = normalizeText(item?.title || item?.content).slice(0, 140);
  return normalizeContentCandidate(
    {
      ...item,
      title,
      source: item?.author || item?.source || item?.platform || "Social",
      category: `Social · ${item?.platform || "Feed"}`,
      image: item?.image || item?.thumbnail,
      url: item?.url,
    },
    "social",
  );
};

const matchesFollowedCategory = (item, followedCategory) => {
  if (!followedCategory) return false;
  return (
    filterContentByCategory([item], followedCategory, 1, { strict: false })
      .length > 0
  );
};

const scoreRecommendation = (item, follows) => {
  let score = 0;

  (follows.topics || []).forEach((topic) => {
    if (matchesTopicQuery(item, topic)) {
      score += 14;
    }
  });

  (follows.sources || []).forEach((source) => {
    const normalizedSource = normalizeText(source).toLowerCase();
    if (normalizedSource && item.searchableSource.includes(normalizedSource)) {
      score += 11;
    }
  });

  (follows.categories || []).forEach((category) => {
    if (matchesFollowedCategory(item, category)) {
      score += 9;
    }
  });

  if (
    item.format === "podcast" ||
    item.format === "social" ||
    item.format === "opinion"
  ) {
    score += 1;
  }

  const publishedAt = Date.parse(item?.publishedAt || item?.date || "");
  if (Number.isFinite(publishedAt)) {
    const ageHours = Math.max(0, (Date.now() - publishedAt) / (1000 * 60 * 60));
    score += Math.max(0, 4 - Math.min(ageHours / 12, 4));
  }

  return score;
};

const selectDiverseRecommendations = (
  items = [],
  maxItems = MAX_RECOMMENDATIONS,
) => {
  const selected = [];
  const selectedKeys = new Set();
  const perFormatCount = new Map();

  SUPPORTED_FORMATS.forEach((format) => {
    const candidate = items.find(
      (item) => item.format === format && !selectedKeys.has(item.key),
    );
    if (!candidate || selected.length >= maxItems) return;

    selected.push(candidate);
    selectedKeys.add(candidate.key);
    perFormatCount.set(format, 1);
  });

  for (const item of items) {
    if (selected.length >= maxItems) break;
    if (!item.key || selectedKeys.has(item.key)) continue;

    const currentFormatCount = perFormatCount.get(item.format) || 0;
    if (currentFormatCount >= 2) continue;

    selected.push(item);
    selectedKeys.add(item.key);
    perFormatCount.set(item.format, currentFormatCount + 1);
  }

  return selected.slice(0, maxItems);
};

const ForYou = () => {
  const { isAuthenticated, token, user } = useAuth();
  const [follows, setFollows] = useState(DEFAULT_FOLLOWS);
  const [recommendations, setRecommendations] = useState([]);
  const [aiTopics, setAiTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setFollows(DEFAULT_FOLLOWS);
      setRecommendations([]);
      setAiTopics([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const followPayload = await fetchFollows(token);
      const nextFollows = followPayload?.follows || DEFAULT_FOLLOWS;
      setFollows(nextFollows);

      const primaryCategory = inferPrimaryCategory(nextFollows.categories);
      const primaryTopic = inferPrimaryTopic(nextFollows.topics);

      const [
        newsItems,
        opinionItems,
        videoItems,
        podcastItems,
        socialItems,
        assist,
      ] = await Promise.all([
        fetchRSSNews(primaryCategory, primaryTopic),
        fetchOpinions(primaryCategory, primaryTopic),
        fetchVideos(primaryCategory, primaryTopic),
        fetchTrendingContent(primaryCategory, primaryTopic),
        getRandomTrendingPosts(12, primaryTopic),
        primaryTopic ? getSearchAssist(primaryTopic) : Promise.resolve(null),
      ]);

      const candidates = [
        ...(newsItems || []).map((item) =>
          normalizeContentCandidate(item, "news"),
        ),
        ...(opinionItems || []).map((item) =>
          normalizeContentCandidate(item, "opinion"),
        ),
        ...(videoItems || []).map((item) =>
          normalizeContentCandidate(item, "video"),
        ),
        ...(podcastItems || []).map((item) =>
          normalizeContentCandidate(item, "podcast"),
        ),
        ...(socialItems || []).map(normalizeSocialCandidate),
      ]
        .filter((item) => item.key && item.title && item.url)
        .map((item) => ({
          ...item,
          recommendationScore: scoreRecommendation(item, nextFollows),
        }))
        .filter((item) => item.recommendationScore > 0)
        .sort(
          (left, right) => right.recommendationScore - left.recommendationScore,
        );

      setRecommendations(
        selectDiverseRecommendations(candidates, MAX_RECOMMENDATIONS),
      );
      setAiTopics(
        Array.isArray(assist?.suggestedTopics)
          ? assist.suggestedTopics.slice(0, 3)
          : [],
      );
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      setRecommendations([]);
      setAiTopics([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <section className="for-you-section">
        <div className="for-you-header">
          <h2 className="for-you-title">For You</h2>
          <p className="for-you-subtitle">
            Personalized recommendations based on your follows and account
            preferences.
          </p>
        </div>
        <div className="for-you-loading">
          <div className="spinner"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="for-you-section">
      <div className="for-you-header">
        <h2 className="for-you-title">For You</h2>
        <p className="for-you-subtitle">
          {follows.categories.length ||
          follows.topics.length ||
          follows.sources.length
            ? `Tailored for ${user?.name || user?.email || "you"} using your followed topics, sources, and desks.`
            : "Your account is live. Add a few follows to unlock tailored articles, opinions, podcasts, and social picks."}
        </p>
        {aiTopics.length > 0 ? (
          <div className="for-you-ai-topics" aria-label="AI follow-up topics">
            <span className="for-you-ai-label">AI follow-ups</span>
            {aiTopics.map((topic) => (
              <Link
                key={topic}
                to={`/search?q=${encodeURIComponent(topic)}`}
                className="for-you-ai-chip"
              >
                {topic}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {recommendations.length > 0 ? (
        <div className="for-you-grid">
          {recommendations.map((item, index) => (
            <NewsCard
              key={item.key || index}
              title={item.title}
              image={item.image}
              source={item.source}
              timeAgo={item.timeAgo || item.publishedAt}
              url={item.url || item.link}
              category={item.category}
              featured={index === 0}
            />
          ))}
        </div>
      ) : (
        <div className="for-you-empty-state">
          <p className="for-you-empty-copy">
            No strong personalized matches yet. Follow a few topics, categories,
            or sources and this rail will start shaping itself around them.
          </p>
        </div>
      )}

      <div className="for-you-actions">
        <Link to="/following" className="for-you-manage-link">
          Manage follows
        </Link>
      </div>
    </section>
  );
};

export default ForYou;
