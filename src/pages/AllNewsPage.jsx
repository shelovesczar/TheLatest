import { useState, useEffect, useCallback, useRef } from "react";
import { useSearch } from "../context/SearchContext";
import { useParams, useNavigate } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { recordHistory } from "../utils/savedArticles";
import AdBreak from "../components/common/AdBreak";
import { fetchRSSNews } from "../newsService";
import { searchRSSContent } from "../rssService";
import OptimizedImage from "../components/common/OptimizedImage";
import { getCategoryConfig } from "../utils/categoryConfig";
import { getTopicPageConfig } from "../utils/navigationConfig";
import { filterContentByCategory } from "../utils/categoryFiltering";
import { dedupeContentItems } from "../utils/contentDeduplication";
import { formatDateOnly } from "../utils/dateUtils";
import { buildStoryHref } from "../utils/storyRouting";
import { getGeneratedContentLabel } from "../utils/contentLabels";
import {
  getSourceProfile,
  getTrustDescriptorForProfile,
  TRUTH_SCORE_ENABLED,
} from "../utils/sourceProfiles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import PageBackBar from "../components/common/PageBackBar";
import "./AllNewsPage.css";

function toTextValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value))
    return value.map(toTextValue).filter(Boolean).join(", ");
  if (typeof value === "object" && typeof value._ === "string") return value._;
  return "";
}

function normalizeNewsArticle(item) {
  return {
    ...item,
    title: toTextValue(item?.title),
    description: toTextValue(item?.description),
    content: toTextValue(item?.content),
    source: toTextValue(item?.source),
    category: toTextValue(item?.category),
    publishedAt: toTextValue(item?.publishedAt || item?.time),
    link: toTextValue(item?.link || item?.url),
    image: toTextValue(item?.image),
  };
}

const PERSPECTIVE_METHOD_LABELS = {
  "ai-headline": "AI estimate from headline and summary framing",
  "source-map": "Source map estimate from outlet profile",
  unclassified: "Compass reading not classified with enough confidence",
};

function resolveStoryPerspective(article = {}, fallbackProfile = null) {
  const explicitKey = String(article?.perspectiveKey || "")
    .trim()
    .toLowerCase();
  if (explicitKey && explicitKey !== "unknown") {
    return {
      key: explicitKey,
      label: String(article?.perspectiveLabel || "Unclassified").trim(),
      method: String(article?.perspectiveMethod || "source-map")
        .trim()
        .toLowerCase(),
    };
  }

  const profile = fallbackProfile || getSourceProfile(article);
  if (profile?.perspectiveKey && profile.perspectiveKey !== "unknown") {
    return {
      key: profile.perspectiveKey,
      label: profile.perspectiveLabel,
      method: "source-map",
    };
  }

  return null;
}

function enrichNewsArticle(item) {
  const sourceProfile = getSourceProfile(item);
  return {
    ...item,
    sourceProfile,
    sourceDisplayName:
      sourceProfile?.displayName || item?.source || "Unknown Source",
    sourceFilterLabel:
      sourceProfile?.displayName || item?.source || "Unknown Source",
    trust: getTrustDescriptorForProfile(sourceProfile),
    perspective: resolveStoryPerspective(item, sourceProfile),
  };
}

function AllNewsPage({ category = null }) {
  const { categoryName, topicSlug } = useParams();
  const navigate = useNavigate();
  const { topic, hasActiveTopic } = useSearch();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(8);
  const LOAD_MORE_SIZE = 8;
  const sourceTickerRef = useRef(null);
  const latestListRef = useRef(null);

  // Navigate to the on-site article reader
  const goToArticle = useCallback(
    (article) => {
      recordHistory(article);
      navigate(buildStoryHref(article), { state: { article } });
    },
    [navigate],
  );

  const getStoryHref = useCallback((article) => buildStoryHref(article), []);

  const truncateText = (text, maxLength) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength).trim()}...`;
  };

  const getDynamicTruncation = (imageUrl, text) => {
    if (!text) return "";

    const img = new Image();
    img.src = imageUrl;

    let maxLength = 120;
    const aspectRatio = img.naturalWidth / img.naturalHeight;

    if (aspectRatio > 1.5) maxLength = 180;
    else if (aspectRatio > 1.2) maxLength = 150;
    else if (aspectRatio < 0.8) maxLength = 80;

    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength).trim()}...`;
  };

  const topicConfig = getTopicPageConfig(topicSlug);
  const activeTopicQuery =
    topicConfig?.query || (hasActiveTopic ? topic : null);
  const filterContext =
    categoryName || category || topicConfig?.slug || activeTopicQuery;
  const categoryConfig = topicConfig
    ? {
        title: topicConfig.title,
        newsTitle: `${topicConfig.title} Coverage`,
        subtitle: topicConfig.subtitle,
        image: topicConfig.image,
      }
    : getCategoryConfig(filterContext);

  const loadNews = useCallback(async () => {
    setLoading(true);
    try {
      let newsData;
      if (activeTopicQuery && activeTopicQuery.trim().length > 0) {
        // Use the search endpoint so the server fetches topic-specific RSS content
        console.log("[AllNewsPage] Searching by topic:", activeTopicQuery);
        newsData = await searchRSSContent(activeTopicQuery);
        if (!Array.isArray(newsData) || newsData.length === 0) {
          newsData = await fetchRSSNews(null, activeTopicQuery);
        }
        console.log(
          "[AllNewsPage] Search returned:",
          newsData?.length || 0,
          "articles",
        );
      } else if (filterContext) {
        console.log("[AllNewsPage] Loading by category:", filterContext);
        const rawData = await fetchRSSNews(filterContext);
        const normalizedRaw = (Array.isArray(rawData) ? rawData : []).map(
          normalizeNewsArticle,
        );
        setNews(
          dedupeContentItems(
            filterContentByCategory(normalizedRaw, filterContext, 1, {
              strict: true,
            }),
          ).map(enrichNewsArticle),
        );
        setLoading(false);
        return;
      } else {
        console.log("[AllNewsPage] Loading all news");
        newsData = await fetchRSSNews();
      }
      const normalizedNews = (Array.isArray(newsData) ? newsData : []).map(
        normalizeNewsArticle,
      );
      console.log(
        "[AllNewsPage] Final news to display:",
        normalizedNews.length,
      );
      setNews(dedupeContentItems(normalizedNews).map(enrichNewsArticle));
    } catch (error) {
      console.error("Error loading news:", error);
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, [activeTopicQuery, filterContext]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  useEffect(() => {
    if (
      selectedSource !== "ALL" &&
      !news.some((item) => item.sourceFilterLabel === selectedSource)
    ) {
      setSelectedSource("ALL");
    }
  }, [news, selectedSource]);

  const sourceCounts = news.reduce((accumulator, item) => {
    const key = item.sourceFilterLabel;
    if (!key) return accumulator;
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
  const sourceEntries = Object.entries(sourceCounts).sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    return left[0].localeCompare(right[0]);
  });
  const filteredNews =
    selectedSource === "ALL"
      ? news
      : news.filter((item) => item.sourceFilterLabel === selectedSource);

  const handleSourceClick = (source) => {
    setSelectedSource(source);
    setVisibleCount(8);
  };

  const scrollTickerLeft = () => {
    sourceTickerRef.current?.scrollBy({ left: -240, behavior: "smooth" });
  };
  const scrollTickerRight = () => {
    sourceTickerRef.current?.scrollBy({ left: 240, behavior: "smooth" });
  };

  const leadStory = filteredNews[0];
  const featuredStories = filteredNews.slice(1, 4);
  const latestStoriesAll = filteredNews.slice(4);
  const latestStories = latestStoriesAll.slice(0, visibleCount);
  const hasMore = visibleCount < latestStoriesAll.length;
  const remaining = latestStoriesAll.length - visibleCount;
  const shouldVirtualizeLatest = false;
  const topicRoute = topicSlug ? `/topic/${topicSlug}` : "";
  const categoryRoute =
    categoryName || category ? `/category/${categoryName || category}` : "";
  const fallbackTo = topicRoute || categoryRoute || "/news";
  const breadcrumbs = [
    { label: "Home", to: "/" },
    topicRoute
      ? { label: categoryConfig.title, to: topicRoute }
      : categoryRoute
        ? { label: categoryConfig.title, to: categoryRoute }
        : { label: "News", to: "/news" },
    { label: "All News" },
  ];

  const latestVirtualizer = useVirtualizer({
    count: latestStoriesAll.length,
    getScrollElement: () => latestListRef.current,
    estimateSize: () => 290,
    overscan: 6,
  });
  const quickUpdates = filteredNews.slice(0, 8);

  return (
    <div className="all-news-page">
      <PageBackBar
        shellClassName="all-news-hero-inner"
        fallbackTo={fallbackTo}
        breadcrumbs={breadcrumbs}
        meta={`${filteredNews.length} stories in this feed`}
      />

      <div className="all-news-hero">
        <div className="all-news-hero-inner">
          <h1 className="all-news-title">{categoryConfig.newsTitle}</h1>
          <p className="all-news-subtitle">Select Source(s)</p>
          <div className="all-news-hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">{filteredNews.length}</span>
              <span className="hero-stat-label">Stories</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">{sourceEntries.length}</span>
              <span className="hero-stat-label">Sources</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">
                {selectedSource === "ALL" ? "All" : selectedSource}
              </span>
              <span className="hero-stat-label">Feed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="source-filter-container">
        <div className="source-filter-header">
          <h2 className="source-filter-title">Source Ticker</h2>
          <span className="source-filter-count">
            {selectedSource === "ALL"
              ? `${sourceEntries.length} source families active across ${news.length} stories`
              : `${filteredNews.length} stories from ${selectedSource}`}
          </span>
        </div>
        <div className="source-ticker-row">
          <button
            className="slider-btn ticker-btn"
            onClick={scrollTickerLeft}
            aria-label="Scroll sources left"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <div className="source-pills" ref={sourceTickerRef}>
            <button
              className={`source-pill ${selectedSource === "ALL" ? "active" : ""}`}
              onClick={() => handleSourceClick("ALL")}
            >
              All sources
              <span className="source-pill-count">{news.length}</span>
            </button>
            {sourceEntries.map(([source, count]) => (
              <button
                key={source}
                className={`source-pill ${selectedSource === source ? "active" : ""}`}
                onClick={() => handleSourceClick(source)}
                title={`${count} stor${count === 1 ? "y" : "ies"} from ${source}`}
              >
                {source}
                <span className="source-pill-count">{count}</span>
              </button>
            ))}
          </div>
          <button
            className="slider-btn ticker-btn"
            onClick={scrollTickerRight}
            aria-label="Scroll sources right"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>

      <div className="all-news-content">
        {loading ? (
          <div className="loading-state">Loading news...</div>
        ) : filteredNews.length === 0 ? (
          <div className="no-results">
            <p>
              No news articles found
              {filterContext ? ` for "${filterContext}"` : ""}.
            </p>
          </div>
        ) : (
          <>
            <section className="all-news-top-grid">
              {leadStory && (
                <article className="lead-story-card">
                  {leadStory.image && (
                    <a
                      href={getStoryHref(leadStory)}
                      onClick={(e) => {
                        e.preventDefault();
                        goToArticle(leadStory);
                      }}
                      className="lead-story-image"
                    >
                      <OptimizedImage
                        src={leadStory.image}
                        alt={leadStory.title}
                        category="news"
                        sizes="(max-width: 768px) 100vw, 60vw"
                      />
                    </a>
                  )}
                  <div className="lead-story-content">
                    <div className="news-card-meta lead-story-meta">
                      <span className="news-card-source">
                        {leadStory.category || leadStory.sourceDisplayName}
                      </span>
                      {getGeneratedContentLabel(leadStory) && (
                        <span className="news-card-time">
                          {getGeneratedContentLabel(leadStory)}
                        </span>
                      )}
                      {leadStory.publishedAt && (
                        <span className="news-card-time">
                          {formatDateOnly(leadStory.publishedAt)}
                        </span>
                      )}
                    </div>
                    <div className="story-context-row">
                      <span className="story-context-source">
                        {leadStory.sourceDisplayName}
                      </span>
                      {leadStory.perspective ? (
                        <span
                          className={`story-perspective-pill story-perspective-pill--${leadStory.perspective.key}`}
                          title={
                            PERSPECTIVE_METHOD_LABELS[
                              leadStory.perspective.method
                            ] || PERSPECTIVE_METHOD_LABELS["source-map"]
                          }
                        >
                          {leadStory.perspective.label}
                        </span>
                      ) : null}
                      {TRUTH_SCORE_ENABLED && (
                        <span
                          className={`story-trust-pill story-trust-pill--${leadStory.trust.band}`}
                          title={leadStory.trust.rationale}
                        >
                          {leadStory.trust.shortLabel}
                        </span>
                      )}
                    </div>
                    <a
                      href={getStoryHref(leadStory)}
                      onClick={(e) => {
                        e.preventDefault();
                        goToArticle(leadStory);
                      }}
                      className="lead-story-headline-link"
                    >
                      <h2 className="lead-story-headline">{leadStory.title}</h2>
                    </a>
                    <p className="lead-story-description">
                      {truncateText(
                        leadStory.description || leadStory.content || "",
                        260,
                      )}
                    </p>
                    <div className="lead-story-footer">
                      <span className="lead-story-source">
                        {leadStory.source}
                      </span>
                      <a
                        href={getStoryHref(leadStory)}
                        onClick={(e) => {
                          e.preventDefault();
                          goToArticle(leadStory);
                        }}
                        className="read-more-link"
                      >
                        Read full story →
                      </a>
                    </div>
                  </div>
                </article>
              )}

              <aside className="all-news-ad-panel" aria-label="Advertisement">
                <AdBreak
                  slot="article-sidebar"
                  campaignIndex={0}
                  variationKey="all-news-top"
                />
              </aside>
            </section>

            {featuredStories.length > 0 && (
              <section className="secondary-stories-grid">
                {featuredStories.map((item, index) => (
                  <article
                    key={`${item.link || item.title}-${index}`}
                    className="secondary-story-card"
                  >
                    {item.image && (
                      <a
                        href={getStoryHref(item)}
                        onClick={(e) => {
                          e.preventDefault();
                          goToArticle(item);
                        }}
                        className="secondary-story-image"
                      >
                        <OptimizedImage
                          src={item.image}
                          alt={item.title}
                          category="news"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      </a>
                    )}
                    <div className="secondary-story-content">
                      <div className="news-card-meta">
                        <span className="news-card-source">
                          {item.category || item.sourceDisplayName}
                        </span>
                        {getGeneratedContentLabel(item) && (
                          <span className="news-card-time">
                            {getGeneratedContentLabel(item)}
                          </span>
                        )}
                        {item.publishedAt && (
                          <span className="news-card-time">
                            {formatDateOnly(item.publishedAt)}
                          </span>
                        )}
                      </div>
                      <div className="story-context-row">
                        <span className="story-context-source">
                          {item.sourceDisplayName}
                        </span>
                        {item.perspective ? (
                          <span
                            className={`story-perspective-pill story-perspective-pill--${item.perspective.key}`}
                            title={
                              PERSPECTIVE_METHOD_LABELS[
                                item.perspective.method
                              ] || PERSPECTIVE_METHOD_LABELS["source-map"]
                            }
                          >
                            {item.perspective.label}
                          </span>
                        ) : null}
                        {TRUTH_SCORE_ENABLED && (
                          <span
                            className={`story-trust-pill story-trust-pill--${item.trust.band}`}
                            title={item.trust.rationale}
                          >
                            {item.trust.shortLabel}
                          </span>
                        )}
                      </div>
                      <a
                        href={getStoryHref(item)}
                        onClick={(e) => {
                          e.preventDefault();
                          goToArticle(item);
                        }}
                        className="secondary-story-link"
                      >
                        <h3 className="secondary-story-headline">
                          {item.title}
                        </h3>
                      </a>
                    </div>
                  </article>
                ))}
              </section>
            )}

            <section className="latest-news-layout">
              <div className="latest-news-column">
                <div className="panel-header latest-news-header">
                  <span className="panel-kicker">Latest Coverage</span>
                  <h2 className="panel-title">Latest News</h2>
                </div>

                {shouldVirtualizeLatest ? (
                  <div
                    className="latest-news-list latest-news-list--virtual"
                    ref={latestListRef}
                  >
                    <div
                      className="latest-news-list-virtual-inner"
                      style={{
                        height: `${latestVirtualizer.getTotalSize()}px`,
                      }}
                    >
                      {latestVirtualizer.getVirtualItems().map((virtualRow) => {
                        const item = latestStoriesAll[virtualRow.index];
                        if (!item) return null;

                        return (
                          <div
                            key={virtualRow.key}
                            ref={latestVirtualizer.measureElement}
                            data-index={virtualRow.index}
                            className="latest-news-virtual-item"
                            style={{
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            <article className="latest-story-card">
                              {item.image && (
                                <a
                                  href={getStoryHref(item)}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    goToArticle(item);
                                  }}
                                  className="latest-story-image"
                                >
                                  <OptimizedImage
                                    src={item.image}
                                    alt={item.title}
                                    category="news"
                                    sizes="(max-width: 768px) 100vw, 45vw"
                                  />
                                </a>
                              )}
                              <div className="latest-story-content">
                                <div className="news-card-meta">
                                  <span className="news-card-source">
                                    {item.category || item.sourceDisplayName}
                                  </span>
                                  {getGeneratedContentLabel(item) && (
                                    <span className="news-card-time">
                                      {getGeneratedContentLabel(item)}
                                    </span>
                                  )}
                                  {item.publishedAt && (
                                    <span className="news-card-time">
                                      {formatDateOnly(item.publishedAt)}
                                    </span>
                                  )}
                                </div>
                                <div className="story-context-row">
                                  <span className="story-context-source">
                                    {item.sourceDisplayName}
                                  </span>
                                  {item.perspective ? (
                                    <span
                                      className={`story-perspective-pill story-perspective-pill--${item.perspective.key}`}
                                      title={
                                        PERSPECTIVE_METHOD_LABELS[
                                          item.perspective.method
                                        ] ||
                                        PERSPECTIVE_METHOD_LABELS["source-map"]
                                      }
                                    >
                                      {item.perspective.label}
                                    </span>
                                  ) : null}
                                  {TRUTH_SCORE_ENABLED && (
                                    <span
                                      className={`story-trust-pill story-trust-pill--${item.trust.band}`}
                                      title={item.trust.rationale}
                                    >
                                      {item.trust.shortLabel}
                                    </span>
                                  )}
                                </div>
                                <a
                                  href={getStoryHref(item)}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    goToArticle(item);
                                  }}
                                  className="latest-story-link"
                                >
                                  <h3 className="latest-story-headline">
                                    {item.title}
                                  </h3>
                                </a>
                                {item.description && (
                                  <p className="latest-story-description">
                                    {item.image
                                      ? getDynamicTruncation(
                                          item.image,
                                          item.description,
                                        )
                                      : truncateText(item.description, 180)}
                                  </p>
                                )}
                                <a
                                  href={getStoryHref(item)}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    goToArticle(item);
                                  }}
                                  className="read-more-link"
                                >
                                  Continue reading →
                                </a>
                              </div>
                            </article>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="latest-news-list">
                    {(latestStories.length > 0
                      ? latestStories
                      : filteredNews.slice(1)
                    ).map((item, index) => {
                      const isLast =
                        index === latestStories.length - 1 && hasMore;
                      return (
                        <article
                          key={`${item.link || item.title}-${index}`}
                          className={`latest-story-card${isLast ? " latest-story-card--fade" : ""}`}
                        >
                          {item.image && (
                            <a
                              href={getStoryHref(item)}
                              onClick={(e) => {
                                e.preventDefault();
                                goToArticle(item);
                              }}
                              className="latest-story-image"
                            >
                              <OptimizedImage
                                src={item.image}
                                alt={item.title}
                                category="news"
                                sizes="(max-width: 768px) 100vw, 45vw"
                              />
                            </a>
                          )}
                          <div className="latest-story-content">
                            <div className="news-card-meta">
                              <span className="news-card-source">
                                {item.category || item.sourceDisplayName}
                              </span>
                              {getGeneratedContentLabel(item) && (
                                <span className="news-card-time">
                                  {getGeneratedContentLabel(item)}
                                </span>
                              )}
                              {item.publishedAt && (
                                <span className="news-card-time">
                                  {formatDateOnly(item.publishedAt)}
                                </span>
                              )}
                            </div>
                            <div className="story-context-row">
                              <span className="story-context-source">
                                {item.sourceDisplayName}
                              </span>
                              {item.perspective ? (
                                <span
                                  className={`story-perspective-pill story-perspective-pill--${item.perspective.key}`}
                                  title={
                                    PERSPECTIVE_METHOD_LABELS[
                                      item.perspective.method
                                    ] || PERSPECTIVE_METHOD_LABELS["source-map"]
                                  }
                                >
                                  {item.perspective.label}
                                </span>
                              ) : null}
                              {TRUTH_SCORE_ENABLED && (
                                <span
                                  className={`story-trust-pill story-trust-pill--${item.trust.band}`}
                                  title={item.trust.rationale}
                                >
                                  {item.trust.shortLabel}
                                </span>
                              )}
                            </div>
                            <a
                              href={getStoryHref(item)}
                              onClick={(e) => {
                                e.preventDefault();
                                goToArticle(item);
                              }}
                              className="latest-story-link"
                            >
                              <h3 className="latest-story-headline">
                                {item.title}
                              </h3>
                            </a>
                            {item.description && (
                              <p className="latest-story-description">
                                {item.image
                                  ? getDynamicTruncation(
                                      item.image,
                                      item.description,
                                    )
                                  : truncateText(item.description, 180)}
                              </p>
                            )}
                            <a
                              href={getStoryHref(item)}
                              onClick={(e) => {
                                e.preventDefault();
                                goToArticle(item);
                              }}
                              className="read-more-link"
                            >
                              Continue reading →
                            </a>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {hasMore && !shouldVirtualizeLatest && (
                  <div className="load-more-container">
                    <button
                      className="load-more-btn"
                      onClick={() => setVisibleCount((c) => c + LOAD_MORE_SIZE)}
                    >
                      Show {Math.min(remaining, LOAD_MORE_SIZE)} more
                      <span className="load-more-total">
                        ({remaining} remaining)
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <aside className="sidebar-column">
                <div className="quick-updates-panel">
                  <div className="panel-header">
                    <span className="panel-kicker">Desk Wire</span>
                    <h2 className="panel-title">Quick Updates</h2>
                  </div>

                  <div className="quick-updates-list">
                    {quickUpdates.map((item, index) => (
                      <a
                        key={`${item.link || item.title}-quick-${index}`}
                        href={getStoryHref(item)}
                        onClick={(e) => {
                          e.preventDefault();
                          goToArticle(item);
                        }}
                        className="quick-update-item"
                      >
                        <span className="quick-update-source">
                          {item.sourceDisplayName}
                        </span>
                        <div className="quick-update-context">
                          {item.perspective ? (
                            <span
                              className={`story-perspective-pill story-perspective-pill--${item.perspective.key}`}
                              title={
                                PERSPECTIVE_METHOD_LABELS[
                                  item.perspective.method
                                ] || PERSPECTIVE_METHOD_LABELS["source-map"]
                              }
                            >
                              {item.perspective.label}
                            </span>
                          ) : null}
                          {TRUTH_SCORE_ENABLED && (
                            <span
                              className={`story-trust-pill story-trust-pill--${item.trust.band}`}
                              title={item.trust.rationale}
                            >
                              {item.trust.shortLabel}
                            </span>
                          )}
                        </div>
                        <h3 className="quick-update-headline">
                          {truncateText(item.title, 88)}
                        </h3>
                        {item.publishedAt && (
                          <span className="quick-update-time">
                            {formatDateOnly(item.publishedAt)}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default AllNewsPage;
